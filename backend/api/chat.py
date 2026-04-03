from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
import logging
import re
import asyncio
import google.generativeai as genai

from services.session_service import session_service
from services.transcript_service import transcript_service
from services.final_score_service import final_score_service
from services.audio_feature_service import audio_feature_service
from utils.config import Config

router = APIRouter(prefix="/api/chat", tags=["chat"])
logger = logging.getLogger(__name__)


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    session_id: str
    message: str
    history: List[ChatMessage] = Field(default_factory=list)


class ChatResponse(BaseModel):
    reply: str


def _shorten_transcript(text: str, max_chars: int = 12000) -> str:
    if not text:
        return "No transcript available."
    clean = text.strip()
    if len(clean) <= max_chars:
        return clean
    return clean[:max_chars] + "\n\n[Transcript truncated for length]"


def _infer_focus_area(scores, audio) -> tuple[str, str]:
    metrics = [
        ("engagement", getattr(scores, "engagement", 0)),
        ("clarity", getattr(scores, "communication_clarity", 0)),
        ("technical accuracy", getattr(scores, "technical_correctness", 0)),
        ("pacing", getattr(scores, "pacing_structure", 0)),
        ("interaction", getattr(scores, "interactive_quality", 0)),
    ]
    weakest_name, weakest_value = min(metrics, key=lambda item: item[1])

    if weakest_name == "pacing" and audio and getattr(audio, "wpm", 0) > 170:
        return weakest_name, "You are speaking a bit fast, so key ideas do not get enough breathing room."
    if weakest_name == "engagement":
        return weakest_name, "You explain content well, but there are not enough check-ins to keep learners active."
    if weakest_name == "clarity":
        return weakest_name, "Some explanations likely need cleaner structure and simpler phrasing."
    if weakest_name == "interaction":
        return weakest_name, "The session feels more one-way than conversational."
    if weakest_name == "technical accuracy":
        return weakest_name, "A few concepts likely need tighter definitions or clearer examples."
    return weakest_name, f"This area scored lowest at {weakest_value:.0f}%."


def _sample_quote(transcript_text: str) -> str:
    if not transcript_text:
        return ""
    candidates = [s.strip() for s in re.split(r"(?<=[.!?])\s+", transcript_text) if s.strip()]
    for sentence in candidates:
        if len(sentence) >= 35:
            return sentence[:160]
    return ""


def _build_fallback_reply(question: str, scores, audio, transcript_text: str) -> str:
    q = (question or "").lower()
    weakest_area, weakest_reason = _infer_focus_area(scores, audio)
    quote = _sample_quote(transcript_text)

    if "weak" in q or "biggest mistake" in q or "biggest weakness" in q:
        opening = f"Your biggest improvement area right now is {weakest_area}. {weakest_reason}"
        if quote:
            return (
                f"{opening} One moment to revisit is: \"{quote}\". "
                "Try pausing for a learner check-in right after a key point, then continue."
            )
        return opening + " Try pausing for a learner check-in right after a key point, then continue."

    if "drill" in q or "practice" in q or "2-minute" in q:
        return (
            f"Here is a quick 2-minute drill for {weakest_area}: 30s explain one concept in plain words, "
            "45s give one concrete example, 30s ask one check-in question, 15s recap in one sentence. "
            "Record it once, then repeat and tighten the wording."
        )

    if "well" in q or "good" in q or "strength" in q:
        top = max(
            [
                ("engagement", getattr(scores, "engagement", 0)),
                ("clarity", getattr(scores, "communication_clarity", 0)),
                ("technical accuracy", getattr(scores, "technical_correctness", 0)),
                ("pacing", getattr(scores, "pacing_structure", 0)),
                ("interaction", getattr(scores, "interactive_quality", 0)),
            ],
            key=lambda item: item[1],
        )
        return (
            f"You did well in {top[0]}. Keep that momentum, and pair it with a focused fix on {weakest_area}. "
            "That combination will noticeably improve your next session."
        )

    return (
        f"If I had you focus on one thing first, I would pick {weakest_area}. {weakest_reason} "
        "If you want, I can give you a precise 2-minute drill tailored to that area."
    )


@router.post("", response_model=ChatResponse)
async def chat_with_coach(request: ChatRequest):
    session = session_service.get_session(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.status != "complete":
        raise HTTPException(status_code=400, detail="Session has not completed processing yet")

    # Gather context
    transcript = transcript_service.get_transcript(request.session_id)
    scores = final_score_service.get_scores(request.session_id)
    audio = audio_feature_service.get_features(request.session_id)

    transcript_text = transcript.text if transcript else "No transcript available."
    prompt_transcript = _shorten_transcript(transcript_text)

    system_prompt = f"""You are a real, experienced mentor coach talking to a friend. You're NOT an AI. You genuinely want to help them improve.

=== SESSION DATA ===
Transcript: {prompt_transcript}

Scores:
- Overall: {scores.mentor_score if scores else 'N/A'}/10
- Engagement: {scores.engagement if scores else 0}%
- Clarity: {scores.communication_clarity if scores else 0}%
- Technical: {scores.technical_correctness if scores else 0}%
- Pacing: {scores.pacing_structure if scores else 0}%
- Interaction: {scores.interactive_quality if scores else 0}%

Audio: {audio.wpm if audio else '?'} WPM, {audio.silence_ratio*100 if audio else 0:.0f}% silence, clarity {audio.clarity_score if audio else 0:.1f}

=== HOW YOU TALK ===
- Use short, punchy sentences. Mix long and short.
- Say "like" naturally, not robotically
- Use "yeah", "nah", "okay", "so", "I mean" - sparingly
- Reference specific moments: "When you said X at minute Y..."
- Give advice like you'd tell a colleague, not lecture
- Be honest about weaknesses, but always leave them feeling like they can improve
- Sometimes acknowledge something they did WELL first
- Don't use bullet points or numbered lists unless they ask
- Avoid words like "leverage", "synergy", "paradigm", "utilize"
- Keep most answers to 2-4 sentences. Longer only if they ask a complex question.
- NEVER sound like a help center bot.
- NEVER say "Based on the data..." or "According to your metrics..."
- NEVER use emojis.
"""

    try:
        Config.init_gemini()
        model = genai.GenerativeModel(
            model_name=Config.LLM_MODEL,
            system_instruction=system_prompt
        )

        # Convert chat history to Gemini format
        history_contents = []
        for msg in request.history[-12:]:
            role = "user" if msg.role == "user" else "model"
            history_contents.append({"role": role, "parts": [msg.content]})

        chat = model.start_chat(history=history_contents)
        response = await asyncio.wait_for(
            asyncio.to_thread(chat.send_message, request.message),
            timeout=18,
        )
        reply = (response.text or "").strip()
        if not reply:
            raise ValueError("Empty model reply")

        return ChatResponse(reply=reply)

    except Exception as e:
        logger.exception(f"Chat failed for session {request.session_id}: {e}")
        fallback = _build_fallback_reply(request.message, scores, audio, transcript_text)
        return ChatResponse(reply=fallback)
