import asyncio
import os
import uuid
import time
from typing import Optional

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse
import json

from services.live_coaching_service import (
    create_live_session,
    get_live_session,
    add_audio_chunk,
    end_live_session,
    live_sessions
)

router = APIRouter(prefix="/api/live", tags=["live"])


@router.post("/start")
async def start_live_session():
    """Start a new live coaching session."""
    session = create_live_session()
    return {
        "session_id": session.id,
        "status": session.status,
        "message": "Live coaching session started"
    }


@router.post("/segment/{session_id}")
async def send_audio_segment(
    session_id: str,
    file: UploadFile = File(...),
    chunk_index: int = Form(0)
):
    """Receive an audio chunk for processing."""
    session = get_live_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or expired")
    if session.status != "active":
        raise HTTPException(status_code=400, detail="Session is not active")

    # Save audio chunk to temp file
    chunk_path = f"/tmp/{session_id}_chunk_{chunk_index}.webm"
    try:
        content = await file.read()
        with open(chunk_path, "wb") as f:
            f.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save audio chunk: {str(e)}")

    # Process the chunk
    transcript = await add_audio_chunk(session_id, chunk_index, chunk_path)

    # Clean up temp file
    try:
        os.remove(chunk_path)
    except:
        pass

    return {
        "status": "received",
        "chunk_index": chunk_index,
        "transcript_length": len(transcript) if transcript else 0
    }


@router.get("/stream/{session_id}")
async def stream_coaching(session_id: str):
    """SSE endpoint for streaming coaching tips to frontend."""
    session = get_live_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or expired")

    async def event_generator():
        queue = session.coaching_queue
        loop = asyncio.get_event_loop()

        # Send initial connection event
        yield {"event": "connected", "data": json.dumps({"session_id": session_id, "status": "streaming"})}

        while True:
            try:
                # Wait for a coaching tip from the queue (max 30s)
                tip = await asyncio.wait_for(queue.get(), timeout=30.0)

                yield {"event": "coaching_tip", "data": json.dumps(tip)}

                # Check if session has ended
                if session.status == "ended":
                    yield {"event": "session_ended", "data": json.dumps({"session_id": session_id})}
                    break

            except asyncio.TimeoutError:
                # Send heartbeat to keep connection alive
                yield {"event": "heartbeat", "data": json.dumps({"timestamp": time.time()})}
            except Exception as e:
                print(f"SSE error: {e}")
                break

    async def sse_generator():
        async for event in event_generator():
            # Format as SSE
            event_type = event.get("event", "message")
            event_data = event.get("data", "")
            yield f"event: {event_type}\ndata: {event_data}\n\n"

    return StreamingResponse(
        sse_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.post("/stop/{session_id}")
async def stop_live_session(session_id: str):
    """End a live coaching session."""
    summary = await end_live_session(session_id)
    if not summary:
        raise HTTPException(status_code=404, detail="Session not found")

    return summary


@router.get("/status/{session_id}")
async def get_live_status(session_id: str):
    """Get current status of a live coaching session."""
    session = get_live_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return session.to_dict()


@router.get("/tips/{session_id}")
async def get_recent_tips(session_id: str, since_index: Optional[int] = None):
    """Get recent coaching tips (fallback for polling)."""
    session = get_live_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    tips = session.coaching_tips
    if since_index is not None:
        tips = [t for t in tips if t.to_dict().get("index", 0) > since_index]

    return {
        "tips": [t.to_dict() for t in tips],
        "total": len(session.coaching_tips)
    }
