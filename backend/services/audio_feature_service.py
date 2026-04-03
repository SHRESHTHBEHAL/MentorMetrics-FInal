from typing import Optional
import subprocess
import librosa
import numpy as np
import os
import logging
from utils.config import Config

logger = logging.getLogger(__name__)

class AudioFeatures:
    def __init__(
        self,
        session_id: str,
        wpm: float,
        silence_ratio: float,
        clarity_score: float
    ):
        self.session_id = session_id
        self.wpm = wpm
        self.silence_ratio = silence_ratio
        self.clarity_score = clarity_score

    def to_dict(self):
        return {
            "session_id": self.session_id,
            "wpm": self.wpm,
            "silence_ratio": self.silence_ratio,
            "clarity_score": self.clarity_score
        }

class AudioFeatureService:
    def _extract_wav(self, video_path: str, wav_path: str):
        # Extracts audio as 16kHz mono wav
        cmd = [
            "ffmpeg", "-y", "-i", video_path, 
            "-vn", "-acodec", "pcm_s16le", 
            "-ar", "16000", "-ac", "1", wav_path
        ]
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    def analyze(self, session_id: str, video_path: str, transcript_text: str) -> AudioFeatures:
        wav_path = video_path.rsplit('.', 1)[0] + ".wav"
        
        try:
            logger.info(f"Extracting and analyzing audio for {session_id}")
            self._extract_wav(video_path, wav_path)
            
            y, sr = librosa.load(wav_path, sr=16000)
            duration_minutes = librosa.get_duration(y=y, sr=sr) / 60.0
            
            # 1. WPM
            word_count = len(transcript_text.split())
            wpm = word_count / duration_minutes if duration_minutes > 0 else 0
            
            # 2. Silence Ratio
            # librosa.effects.split returns intervals of non-silent regions
            intervals = librosa.effects.split(y, top_db=20)
            non_silent_samples = sum([end - start for start, end in intervals])
            total_samples = len(y)
            silence_ratio = 1.0 - (non_silent_samples / total_samples) if total_samples > 0 else 0.0
            
            # 3. Clarity Score
            # Using RMS energy as a proxy for vocal clarity/projection
            rms = librosa.feature.rms(y=y)[0]
            # Normalize reasonably
            clarity = np.clip(np.mean(rms) * 10, 0, 1.0)
            # Boost a bit for realism because pure RMS is tiny
            clarity = (clarity * 0.4) + 0.5 
            
            features = AudioFeatures(
                session_id=session_id,
                wpm=round(float(wpm), 2),
                silence_ratio=round(float(silence_ratio), 3),
                clarity_score=round(float(clarity), 3)
            )
            
            # DB Storage
            supabase = Config.get_supabase()
            try:
                supabase.table("audio_features").delete().eq("session_id", session_id).execute()
            except:
                pass
            supabase.table("audio_features").insert(features.to_dict()).execute()
            
            return features
            
        except Exception as e:
            logger.error(f"Failed audio analysis: {e}")
            raise e
        finally:
            if os.path.exists(wav_path):
                os.remove(wav_path)

    def get_features(self, session_id: str) -> Optional[AudioFeatures]:
        try:
            supabase = Config.get_supabase()
            result = supabase.table("audio_features").select("*").eq("session_id", session_id).execute()
            if result.data and len(result.data) > 0:
                data = result.data[0]
                return AudioFeatures(
                    session_id=data["session_id"],
                    wpm=data["wpm"],
                    silence_ratio=data["silence_ratio"],
                    clarity_score=data["clarity_score"]
                )
        except Exception as e:
             logger.error(f"Failed to fetch audio features from DB: {e}")
        return None

audio_feature_service = AudioFeatureService()