import os
from dotenv import load_dotenv
from supabase import create_client, Client
import google.generativeai as genai

load_dotenv()

class Config:
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY")
    DATABASE_URL = os.getenv("DATABASE_URL")
    WHISPER_MODEL = os.getenv("WHISPER_MODEL", "base")
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    LLM_MODEL = os.getenv("GEMINI_MODEL", os.getenv("LLM_MODEL", "gemini-2.5-flash"))
    STORAGE_BUCKET = os.getenv("STORAGE_BUCKET", "videos")
    
    _gemini_initialized = False

    @classmethod
    def get_supabase(cls) -> Client:
        cls.validate()
        return create_client(cls.SUPABASE_URL, cls.SUPABASE_KEY)

    @classmethod
    def upload_to_storage(cls, file_data: bytes, filename: str, content_type: str) -> str:
        supabase = cls.get_supabase()
        path = f"uploads/{filename}"
        supabase.storage.from_(cls.STORAGE_BUCKET).upload(path, file_data, {"content_type": content_type})
        public_url = supabase.storage.from_(cls.STORAGE_BUCKET).get_public_url(path)
        return public_url

    @classmethod
    def download_from_storage(cls, path: str) -> bytes:
        supabase = cls.get_supabase()
        bucket = cls.STORAGE_BUCKET
        data = supabase.storage.from_(bucket).download(path)
        return data

    @classmethod
    def delete_from_storage(cls, path: str) -> None:
        supabase = cls.get_supabase()
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
