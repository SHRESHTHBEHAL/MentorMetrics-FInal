import asyncio
import json
import uuid
from datetime import datetime
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict

from services.llm_service import llm_service
from services.transcript_service import transcript_service


@dataclass
class CoachingTip:
    text: str
    category: str
    timestamp: str

    def to_dict(self):
        return asdict(self)


@dataclass
class LiveSession:
    id: str
    status: str
    transcript_chunks: List[dict]
    coaching_tips: List[CoachingTip]
    coaching_queue: asyncio.Queue
    started_at: str

    def to_dict(self):
        return {
            "id": self.id,
            "status": self.status,
            "coaching_tips": [t.to_dict() for t in self.coaching_tips],
            "started_at": self.started_at,
            "chunk_count": len(self.transcript_chunks)
        }


# In-memory session storage
live_sessions: Dict[str, LiveSession] = {}


def create_live_session() -> LiveSession:
    session_id = str(uuid.uuid4())
    session = LiveSession(
        id=session_id,
        status="active",
        transcript_chunks=[],
        coaching_tips=[],
        coaching_queue=asyncio.Queue(),
        started_at=datetime.utcnow().isoformat()
    )
    live_sessions[session_id] = session
    return session


def get_live_session(session_id: str) -> Optional[LiveSession]:
    return live_sessions.get(session_id)


async def add_audio_chunk(session_id: str, chunk_index: int, audio_path: str) -> Optional[str]:
    """Process an audio chunk and return transcript text."""
    session = live_sessions.get(session_id)
    if not session or session.status != "active":
        return None

    try:
        # Transcribe the audio chunk
        transcript = transcript_service.transcribe_audio_chunk(audio_path)
        session.transcript_chunks.append({
            "index": chunk_index,
            "text": transcript,
            "timestamp": datetime.utcnow().isoformat()
        })

        # Trigger async coaching tip generation
        asyncio.create_task(generate_coaching_tip(session_id))

        return transcript
    except Exception as e:
        print(f"Error processing audio chunk: {e}")
        return None


async def generate_coaching_tip(session_id: str) -> None:
    """Generate a coaching tip from recent transcript using LLM."""
    session = live_sessions.get(session_id)
    if not session or session.status != "active":
        return

    # Get recent transcript chunks (last 3)
    recent_chunks = session.transcript_chunks[-3:]
    if not recent_chunks:
        return

    recent_text = " ".join([c["text"] for c in recent_chunks if c["text"]])
    if not recent_text.strip():
        return

    # Construct prompt for coaching tip
    prompt = f"""You are an expert mentorship coach. Analyze this brief teaching excerpt and provide ONE concise, actionable coaching tip.

Teaching excerpt: {recent_text}

Requirements:
- Tip must be under 20 words
- Focus on ONE specific improvement area
- Be direct and actionable

Respond with ONLY a JSON object (no markdown, no explanation):
{{"tip": "Your specific coaching tip here", "category": "one_of: pace|clarity|energy|posture|engagement"}}

Categories to choose from:
- pace: Speaking too fast or too slow
- clarity: Words unclear or jargon-heavy
- energy: Lacking enthusiasm or too monotone
- posture: Body language issues
- engagement: Not connecting with learner"""

    try:
        result = await llm_service.generate_json(prompt, {"tip": str, "category": str})

        if result and result.get("tip"):
            tip = CoachingTip(
                text=result.get("tip", ""),
                category=result.get("category", "clarity"),
                timestamp=datetime.utcnow().isoformat()
            )
            session.coaching_tips.append(tip)
            await session.coaching_queue.put(tip.to_dict())
            print(f"Generated coaching tip for session {session_id}: {tip.text}")
        else:
            # Generate a default tip if LLM fails
            tip = CoachingTip(
                text="Try varying your tone to maintain learner engagement.",
                category="engagement",
                timestamp=datetime.utcnow().isoformat()
            )
            session.coaching_tips.append(tip)
            await session.coaching_queue.put(tip.to_dict())

    except Exception as e:
        print(f"Error generating coaching tip: {e}")
        # Don't crash - just skip tip generation


async def end_live_session(session_id: str) -> Optional[dict]:
    """End a live coaching session and return summary."""
    session = live_sessions.get(session_id)
    if not session:
        return None

    session.status = "ended"

    # Calculate summary
    total_chunks = len(session.transcript_chunks)
    transcript_text = " ".join([c["text"] for c in session.transcript_chunks if c["text"]])

    # Get category counts
    categories = {}
    for tip in session.coaching_tips:
        categories[tip.category] = categories.get(tip.category, 0) + 1

    summary = {
        "session_id": session_id,
        "status": "ended",
        "duration_seconds": total_chunks * 10,  # Approximate
        "total_tips": len(session.coaching_tips),
        "category_breakdown": categories,
        "transcript_preview": transcript_text[:200] + "..." if len(transcript_text) > 200 else transcript_text
    }

    # Clean up session after a delay
    asyncio.create_task(_cleanup_session(session_id))

    return summary


async def _cleanup_session(session_id: str) -> None:
    """Remove session from memory after delay."""
    await asyncio.sleep(60)  # Keep in memory for 60s for SSE reconnects
    if session_id in live_sessions:
        del live_sessions[session_id]


async def get_session_summary(session_id: str) -> Optional[dict]:
    """Get coaching summary for a session."""
    session = live_sessions.get(session_id)
    if not session:
        return None

    categories = {}
    for tip in session.coaching_tips:
        categories[tip.category] = categories.get(tip.category, 0) + 1

    return {
        "session_id": session_id,
        "status": session.status,
        "total_tips": len(session.coaching_tips),
        "category_breakdown": categories
    }
