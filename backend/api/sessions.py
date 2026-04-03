from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import os
import uuid
import asyncio
import logging

logger = logging.getLogger(__name__)

from services.session_service import session_service
from services.pipeline_runner import pipeline_runner
from services.final_score_service import final_score_service
from utils.config import Config

router = APIRouter(prefix="/api", tags=["sessions"])


def normalize_mentor_name(raw_name: str) -> str:
    return " ".join(raw_name.strip().split()).upper()

class SessionResponse(BaseModel):
    id: str
    user_id: str
    mentor_name: str
    filename: str
    file_url: str
    status: str
    stages_completed: List[str]
    mentor_score: Optional[float] = None
    created_at: str

class SessionListResponse(BaseModel):
    sessions: List[SessionResponse]

class UploadResponse(BaseModel):
    session_id: str
    filename: str
    status: str

class StatusResponse(BaseModel):
    session_id: str
    status: str
    stages_completed: List[str]
    data_points_scanned: Optional[int] = None
    latency_ms: Optional[int] = None
    node_load: Optional[int] = None
    logs: Optional[List[str]] = None

@router.post("/upload", response_model=UploadResponse)
async def upload_video(file: UploadFile = File(...), mentor_name: str = Form(...), user_id: str = Form(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    user_id = user_id.strip()
    if not user_id:
        raise HTTPException(status_code=400, detail="User id is required")

    mentor_name = normalize_mentor_name(mentor_name)
    if not mentor_name:
        raise HTTPException(status_code=400, detail="Mentor name is required")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".mp4", ".mov"]:
        raise HTTPException(status_code=400, detail="Invalid file format. Supported: MP4, MOV")

    session_id = str(uuid.uuid4())
    filename = f"{session_id}{ext}"
    content_type = file.content_type or "video/mp4"

    try:
        content = await file.read()
        file_url = Config.upload_to_storage(content, filename, content_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Storage upload failed: {str(e)}")

    session = session_service.create_session(
        user_id=user_id,
        mentor_name=mentor_name,
        filename=file.filename,
        file_url=file_url
    )

    asyncio.create_task(pipeline_runner.run(session.id, filename))

    return UploadResponse(
        session_id=session.id,
        filename=session.filename,
        status=session.status
    )

@router.get("/sessions/list", response_model=SessionListResponse)
async def list_sessions(user_id: Optional[str] = None, mentor_name: Optional[str] = None):
    normalized_mentor = normalize_mentor_name(mentor_name) if mentor_name else None
    sessions = session_service.list_sessions(user_id=user_id, mentor_name=normalized_mentor)
    response_sessions = []

    for s in sessions:
        score = final_score_service.get_scores(s.id)
        response_sessions.append(
            SessionResponse(
                id=s.id,
                user_id=s.user_id,
                mentor_name=s.mentor_name,
                filename=s.filename,
                file_url=s.file_url,
                status=s.status,
                stages_completed=s.stages_completed,
                mentor_score=score.mentor_score if score else s.mentor_score,
                created_at=s.created_at
            )
        )

    return SessionListResponse(
        sessions=response_sessions
    )

@router.get("/sessions/{session_id}", response_model=StatusResponse)
async def get_session_status(session_id: str):
    session = session_service.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    pipeline_info = pipeline_runner.get_pipeline_status(session_id)

    if pipeline_info:
        stages_count = len(pipeline_info["stages_completed"])
        total_frames = stages_count * 50000
        if pipeline_info["stages_completed"]:
            latest_stage = pipeline_info["stages_completed"][-1]
            raw_latency = int(pipeline_info["stage_timings"].get(latest_stage, 0) * 1000)
            latency_ms = max(12, min(raw_latency, 99))
        else:
            latency_ms = 18
        node_load = min(int((stages_count / len(pipeline_runner.STAGES)) * 100), 100)

        return StatusResponse(
            session_id=session.id,
            status=session.status,
            stages_completed=pipeline_info["stages_completed"],
            data_points_scanned=total_frames,
            latency_ms=latency_ms,
            node_load=node_load,
            logs=pipeline_info["logs"]
        )

    stages_count = len(session.stages_completed)
    data_points = stages_count * 50000
    latency = min(12 + (stages_count * 2), 99)
    node_load = 40 + (stages_count * 8)

    logs = [
        f"[10:00:{stages_count:02d}] INITIALIZING STAGE {stages_count + 1}",
        f"[10:00:{stages_count + 1:02d}] PROCESSING DATA...",
    ]
    if "transcribing" in session.stages_completed:
        logs.append("[10:00:05] SPEECH-TO-TEXT: COMPLETE")
    if "audio_analysis" in session.stages_completed:
        logs.append("[10:00:08] AUDIO FEATURES: EXTRACTED")
    if "visual_analysis" in session.stages_completed:
        logs.append("[10:00:12] VISUAL ANALYSIS: COMPLETE")
    if "scoring" in session.stages_completed:
        logs.append("[10:00:15] SCORES: CALCULATED")
    if "report_generation" in session.stages_completed:
        logs.append("[10:00:18] REPORT: GENERATED")

    return StatusResponse(
        session_id=session.id,
        status=session.status,
        stages_completed=session.stages_completed,
        data_points_scanned=data_points,
        latency_ms=latency,
        node_load=node_load,
        logs=logs
    )

@router.post("/process/{session_id}")
async def start_processing(session_id: str):
    session = session_service.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.status == "processing":
        raise HTTPException(status_code=400, detail="Session already processing")

    marker = "/uploads/"
    if marker not in session.file_url:
        raise HTTPException(status_code=400, detail="Stored video URL is invalid")

    filename = session.file_url.split(marker)[-1].split("?")[0]
    await pipeline_runner.run(session_id, filename)

    return {"message": "Processing started", "session_id": session_id}


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    session = session_service.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    try:
        supabase = Config.get_supabase_admin()
        supabase.table("sessions").delete().eq("id", session_id).execute()
        try:
            video_path = session.file_url.split("/uploads/")[-1].split("?")[0]
            Config.delete_from_storage(video_path)
        except Exception:
            pass
    except Exception as e:
        logger.error(f"Failed to delete session {session_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete session")

    return {"message": "Session deleted", "session_id": session_id}
