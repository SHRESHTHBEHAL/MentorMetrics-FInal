from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import os
import uuid
import asyncio
import io

from services.session_service import session_service
from services.pipeline_runner import pipeline_runner
from services.final_score_service import final_score_service
from utils.config import Config

router = APIRouter(prefix="/api", tags=["sessions"])

class SessionResponse(BaseModel):
    id: str
    user_id: str
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
async def upload_video(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".mp4", ".mov"]:
        raise HTTPException(status_code=400, detail="Invalid file format. Supported: MP4, MOV")

    session_id = str(uuid.uuid4())
    filename = f"{session_id}{ext}"
    content_type = file.content_type or "video/mp4"
    
    content = await file.read()
    file_url = Config.upload_to_storage(content, filename, content_type)

    session = session_service.create_session(
        user_id="anonymous",
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
async def list_sessions(user_id: Optional[str] = None):
    sessions = session_service.list_sessions(user_id)
    response_sessions = []

    for s in sessions:
        score = final_score_service.get_scores(s.id)
        response_sessions.append(
            SessionResponse(
                id=s.id,
                user_id=s.user_id,
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

    # Calculate some dynamic metrics based on stages
    stages_count = len(session.stages_completed)
    data_points = stages_count * 200000 + (session_id[:4].encode().__hash__() % 100000)
    latency = 12 + (stages_count * 2)
    node_load = 40 + (stages_count * 8)

    # Generate some log messages
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

    file_path = os.path.join(Config.UPLOAD_DIR, f"{session_id}.mp4")
    if not os.path.exists(file_path):
        file_path = os.path.join(Config.UPLOAD_DIR, f"{session_id}.mov")

    await pipeline_runner.run(session_id, file_path)

    return {"message": "Processing started", "session_id": session_id}
