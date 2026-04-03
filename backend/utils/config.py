import os
from dotenv import load_dotenv
from supabase import create_client, Client
import google.generativeai as genai

load_dotenv()

class Config:
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY")
    SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    DATABASE_URL = os.getenv("DATABASE_URL")
    WHISPER_MODEL = os.getenv("WHISPER_MODEL", "base")
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    LLM_MODEL = os.getenv("GEMINI_MODEL", os.getenv("LLM_MODEL", "gemini-3-flash-preview"))
    STORAGE_BUCKET = os.getenv("STORAGE_BUCKET", "Videos")
    UPLOAD_DIR = os.getenv(
        "UPLOAD_DIR",
        os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
    )

    _gemini_initialized = False

    @classmethod
    def ensure_upload_dir(cls):
        os.makedirs(cls.UPLOAD_DIR, exist_ok=True)

    @classmethod
    def get_supabase(cls) -> Client:
        """Returns a Supabase client using the anon key."""
        cls.validate()
        return create_client(cls.SUPABASE_URL, cls.SUPABASE_KEY)

    @classmethod
    def get_supabase_admin(cls) -> Client:
        """Returns a Supabase client using the service role key to bypass RLS."""
        cls.validate_admin()
        return create_client(cls.SUPABASE_URL, cls.SUPABASE_SERVICE_ROLE_KEY)

    @classmethod
    def upload_to_storage(cls, file_data: bytes, filename: str, content_type: str) -> str:
        """Upload file to Supabase Storage using admin client and return its public URL."""
        supabase = cls.get_supabase_admin()
        path = f"uploads/{filename}"
        supabase.storage.from_(cls.STORAGE_BUCKET).upload(
            path,
            file_data,
            {"content-type": content_type, "upsert": "true"}
        )
        public_url = supabase.storage.from_(cls.STORAGE_BUCKET).get_public_url(path)
        return public_url

    @classmethod
    def download_from_storage(cls, path: str) -> bytes:
        """Download a file from Supabase Storage using admin client."""
        supabase = cls.get_supabase_admin()
        data = supabase.storage.from_(cls.STORAGE_BUCKET).download(path)
        return data

    @classmethod
    def delete_from_storage(cls, path: str) -> None:
        """Delete from Supabase storage using admin client."""
        supabase = cls.get_supabase_admin()
        supabase.storage.from_(cls.STORAGE_BUCKET).remove([path])

    @classmethod
    def init_gemini(cls):
        if not cls._gemini_initialized:
            if not cls.GEMINI_API_KEY:
                raise ValueError("GEMINI_API_KEY is not set")
            genai.configure(api_key=cls.GEMINI_API_KEY)
            cls._gemini_initialized = True

    @staticmethod
    def validate():
        if not Config.SUPABASE_URL:
            raise ValueError("SUPABASE_URL is not set")
        if not Config.SUPABASE_KEY:
            raise ValueError("SUPABASE_KEY is not set")

    @staticmethod
    def validate_admin():
        if not Config.SUPABASE_URL:
            raise ValueError("SUPABASE_URL is not set")
        if not Config.SUPABASE_SERVICE_ROLE_KEY:
            raise ValueError("SUPABASE_SERVICE_ROLE_KEY is not set")
