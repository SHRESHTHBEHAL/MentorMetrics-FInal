from datetime import datetime
from typing import Optional, List
import uuid
import logging
from utils.config import Config

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
        try:
            supabase = Config.get_supabase()
            supabase.table("sessions").insert(session.to_dict()).execute()
        except Exception as e:
            logger.error(f"Failed to create session in DB: {e}")
            raise e
        return session

    def get_session(self, session_id: str) -> Optional[Session]:
        try:
            supabase = Config.get_supabase()
            result = supabase.table("sessions").select("*").eq("id", session_id).execute()
            if result.data and len(result.data) > 0:
                data = result.data[0]
                return Session(**data)
        except Exception as e:
            logger.error(f"Failed to get session from DB: {e}")
        return None

    def update_status(self, session_id: str, status: str, stages_completed: List[str], mentor_score: Optional[float] = None) -> Optional[Session]:
        try:
            supabase = Config.get_supabase()
            update_data = {
                "status": status,
                "stages_completed": stages_completed
            }
            if mentor_score is not None:
                update_data["mentor_score"] = mentor_score
            
            result = supabase.table("sessions").update(update_data).eq("id", session_id).execute()
            if result.data and len(result.data) > 0:
                return Session(**result.data[0])
        except Exception as e:
            logger.error(f"Failed to update session status in DB: {e}")
        return None

    def list_sessions(self, user_id: Optional[str] = None, mentor_name: Optional[str] = None) -> List[Session]:
        try:
            supabase = Config.get_supabase()
            query = supabase.table("sessions").select("*").order("created_at", desc=True)
            if user_id:
                query = query.eq("user_id", user_id)
            if mentor_name:
                query = query.eq("mentor_name", mentor_name)
            result = query.execute()
            if result.data:
                return [Session(**row) for row in result.data]
        except Exception as e:
            logger.error(f"Failed to list sessions from DB: {e}")
        return []

session_service = SessionService()
