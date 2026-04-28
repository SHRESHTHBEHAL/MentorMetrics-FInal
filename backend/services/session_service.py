from datetime import datetime
from typing import Optional, List
import uuid
import logging
from threading import Lock

logger = logging.getLogger(__name__)

class Session:
    def __init__(
        self,
        id: str,
        user_id: str,
        filename: str,
        file_url: str,
        mentor_name: Optional[str] = None,
        status: str = "uploaded",
        stages_completed: Optional[List[str]] = None,
        mentor_score: Optional[float] = None,
        created_at: Optional[str] = None
    ):
        self.id = id
        self.user_id = user_id
        self.mentor_name = mentor_name or user_id
        self.filename = filename
        self.file_url = file_url
        self.status = status
        self.stages_completed = stages_completed or []
        self.mentor_score = mentor_score
        self.created_at = created_at or datetime.utcnow().isoformat()

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "mentor_name": self.mentor_name,
            "filename": self.filename,
            "file_url": self.file_url,
            "status": self.status,
            "stages_completed": self.stages_completed,
            "mentor_score": self.mentor_score,
            "created_at": self.created_at
        }

class SessionService:
    def __init__(self):
        self._sessions = {}
        self._lock = Lock()

    def create_session(self, user_id: str, mentor_name: str, filename: str, file_url: str) -> Session:
        session_id = str(uuid.uuid4())
        session = Session(
            id=session_id,
            user_id=user_id,
            mentor_name=mentor_name,
            filename=filename,
            file_url=file_url,
            status="uploaded",
            stages_completed=[]
        )
        with self._lock:
            self._sessions[session_id] = session
        return session

    def get_session(self, session_id: str) -> Optional[Session]:
        with self._lock:
            return self._sessions.get(session_id)

    def update_status(self, session_id: str, status: str, stages_completed: List[str], mentor_score: Optional[float] = None) -> Optional[Session]:
        with self._lock:
            session = self._sessions.get(session_id)
            if not session:
                logger.warning(f"Session not found for status update: {session_id}")
                return None

            session.status = status
            session.stages_completed = list(stages_completed)
            if mentor_score is not None:
                session.mentor_score = mentor_score

            return session

    def list_sessions(self, user_id: Optional[str] = None, mentor_name: Optional[str] = None) -> List[Session]:
        with self._lock:
            sessions = list(self._sessions.values())

        if user_id:
            sessions = [s for s in sessions if s.user_id == user_id]
        if mentor_name:
            sessions = [s for s in sessions if s.mentor_name == mentor_name]

        sessions.sort(key=lambda s: s.created_at, reverse=True)
        return sessions

    def delete_session(self, session_id: str) -> bool:
        with self._lock:
            return self._sessions.pop(session_id, None) is not None

session_service = SessionService()
