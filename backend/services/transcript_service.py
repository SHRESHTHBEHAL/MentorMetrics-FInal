from typing import List, Optional
import uuid
import whisper
import logging
from utils.config import Config

logger = logging.getLogger(__name__)

class TranscriptSegment:
    def __init__(self, start: float, end: float, speaker: str, text: str):
        self.start = start
        self.end = end
        self.speaker = speaker
        self.text = text

    def to_dict(self):
        return {
            "start": self.start,
            "end": self.end,
            "speaker": self.speaker,
            "text": self.text
        }

class Transcript:
    def __init__(self, session_id: str, text: str, segments: Optional[List[TranscriptSegment]] = None):
        self.session_id = session_id
        self.text = text
        self.segments = segments or []

    def to_dict(self):
        return {
            "session_id": self.session_id,
            "text": self.text,
            "segments": [s.to_dict() for s in self.segments]
        }

class TranscriptService:
    def __init__(self):
        self._model = None

    def _get_model(self):
        if self._model is None:
            # We use base.en for speed and English focus.
            model_name = "base.en" if Config.WHISPER_MODEL == "base" else Config.WHISPER_MODEL
            logger.info(f"Loading Whisper model: {model_name}")
            self._model = whisper.load_model(model_name)
        return self._model

    def create_transcript(self, session_id: str, file_path: str) -> Transcript:
        try:
            logger.info(f"Starting transcription for {session_id}")
            model = self._get_model()
            result = model.transcribe(file_path)
            
            segments = []
            for seg in result.get("segments", []):
                segments.append(
                    TranscriptSegment(
                        start=seg.get("start", 0.0),
                        end=seg.get("end", 0.0),
                        speaker="Speaker",
                        text=seg.get("text", "").strip()
                    )
                )
            
            full_text = result.get("text", "").strip()
            transcript = Transcript(session_id, full_text, segments)
            
            # Save to DB
            supabase = Config.get_supabase()
            try:
                # Delete existing if any (fallback/cleanup)
                supabase.table("transcripts").delete().eq("session_id", session_id).execute()
            except:
                pass
            supabase.table("transcripts").insert(transcript.to_dict()).execute()
            
            logger.info("Transcription complete and saved.")
            return transcript
            
        except Exception as e:
            logger.error(f"Failed to create transcript: {e}")
            raise e

    def get_transcript(self, session_id: str) -> Optional[Transcript]:
        try:
            supabase = Config.get_supabase()
            result = supabase.table("transcripts").select("*").eq("session_id", session_id).execute()
            if result.data and len(result.data) > 0:
                data = result.data[0]
                segs = [TranscriptSegment(**s) for s in data.get("segments", [])]
                return Transcript(session_id=data["session_id"], text=data["text"], segments=segs)
        except Exception as e:
            logger.error(f"Failed to fetch transcript from DB: {e}")
        return None

transcript_service = TranscriptService()
