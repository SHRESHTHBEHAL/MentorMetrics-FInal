from typing import Optional
import logging
from utils.config import Config

logger = logging.getLogger(__name__)

class FinalScores:
    def __init__(
        self,
        session_id: str,
        engagement: float,
        communication_clarity: float,
        technical_correctness: float,
        pacing_structure: float,
        interactive_quality: float,
        mentor_score: float
    ):
        self.session_id = session_id
        self.engagement = engagement
        self.communication_clarity = communication_clarity
        self.technical_correctness = technical_correctness
        self.pacing_structure = pacing_structure
        self.interactive_quality = interactive_quality
        self.mentor_score = mentor_score

    def to_dict(self):
        return {
            "session_id": self.session_id,
            "engagement": self.engagement,
            "communication_clarity": self.communication_clarity,
            "technical_correctness": self.technical_correctness,
            "pacing_structure": self.pacing_structure,
            "interactive_quality": self.interactive_quality,
            "mentor_score": self.mentor_score
        }

class FinalScoreService:
    @staticmethod
    def _clamp(value: float, low: float, high: float) -> float:
        return max(low, min(high, value))

    def _ratio_to_percent(self, value: Optional[float], default: float = 0.6) -> float:
        raw = default if value is None else value
        # Human-like grading: Map raw [0.0, 1.0] to a [50.0, 100.0] scale.
        # This prevents minor mistakes from dragging scores down to 0%.
        mapped_score = (float(raw) * 50.0) + 50.0
        return self._clamp(mapped_score, 0.0, 100.0)

    def _band_score(
        self,
        value: Optional[float],
        ideal_low: float,
        ideal_high: float,
        hard_low: float,
        hard_high: float,
        default: float,
    ) -> float:
        v = default if value is None else float(value)
        floor = 50.0
        if v <= hard_low or v >= hard_high:
            return floor
        if ideal_low <= v <= ideal_high:
            return 100.0
        
        if v < ideal_low:
            pct = (v - hard_low) / (ideal_low - hard_low)
        else:
            pct = (hard_high - v) / (hard_high - ideal_high)
            
        return self._clamp(floor + (pct * (100.0 - floor)), floor, 100.0)

    def calculate(
        self,
        session_id: str,
        audio_features: dict,
        text_evaluation: dict,
        visual_evaluation: dict
    ) -> FinalScores:
        text_clarity = self._ratio_to_percent(text_evaluation.get("clarity"), default=0.6)
        text_structure = self._ratio_to_percent(text_evaluation.get("structure"), default=0.6)
        text_technical = self._ratio_to_percent(text_evaluation.get("technical_correctness"), default=0.7)

        audio_clarity = self._ratio_to_percent(audio_features.get("clarity_score"), default=0.6)
        speech_rate_score = self._band_score(
            value=audio_features.get("wpm"),
            ideal_low=110.0,
            ideal_high=165.0,
            hard_low=80.0,
            hard_high=210.0,
            default=135.0,
        )
        pause_balance_score = self._band_score(
            value=audio_features.get("silence_ratio"),
            ideal_low=0.10,
            ideal_high=0.28,
            hard_low=0.03,
            hard_high=0.45,
            default=0.18,
        )

        face_visibility = self._ratio_to_percent(visual_evaluation.get("face_visibility_score"), default=0.5)
        gaze_forward = self._ratio_to_percent(visual_evaluation.get("gaze_forward_score"), default=0.5)
        gesture = self._ratio_to_percent(visual_evaluation.get("gesture_score"), default=0.5)

        communication = (
            text_clarity * 0.55
            + audio_clarity * 0.25
            + speech_rate_score * 0.20
        )

        pacing = (
            text_structure * 0.45
            + speech_rate_score * 0.35
            + pause_balance_score * 0.20
        )

        interactive = (
            gaze_forward * 0.45
            + gesture * 0.35
            + face_visibility * 0.20
        )

        engagement = (
            interactive * 0.40
            + speech_rate_score * 0.30
            + pause_balance_score * 0.20
            + text_clarity * 0.10
        )

        technical = (
            text_technical * 0.80
            + text_structure * 0.20
        )

        mentor_percent = (
            engagement * 0.20
            + communication * 0.24
            + technical * 0.24
            + pacing * 0.16
            + interactive * 0.16
        )
        mentor_score = self._clamp(mentor_percent / 10.0, 0.0, 10.0)

        scores = FinalScores(
            session_id=session_id,
            engagement=round(self._clamp(engagement, 0.0, 100.0), 1),
            communication_clarity=round(self._clamp(communication, 0.0, 100.0), 1),
            technical_correctness=round(self._clamp(technical, 0.0, 100.0), 1),
            pacing_structure=round(self._clamp(pacing, 0.0, 100.0), 1),
            interactive_quality=round(self._clamp(interactive, 0.0, 100.0), 1),
            mentor_score=round(mentor_score, 1)
        )
        
        # Save to DB
        try:
            supabase = Config.get_supabase()
            try:
                supabase.table("final_scores").delete().eq("session_id", session_id).execute()
            except: pass
            supabase.table("final_scores").insert(scores.to_dict()).execute()
        except Exception as e:
            logger.error(f"Failed to save final scores to DB: {e}")
            
        return scores

    def get_scores(self, session_id: str) -> Optional[FinalScores]:
        try:
            supabase = Config.get_supabase()
            result = supabase.table("final_scores").select("*").eq("session_id", session_id).execute()
            if result.data and len(result.data) > 0:
                data = result.data[0]
                return FinalScores(
                    session_id=data["session_id"],
                    engagement=data["engagement"],
                    communication_clarity=data["communication_clarity"],
                    technical_correctness=data["technical_correctness"],
                    pacing_structure=data["pacing_structure"],
                    interactive_quality=data["interactive_quality"],
                    mentor_score=data["mentor_score"]
                )
        except Exception as e:
             logger.error(f"Failed to fetch final scores from DB: {e}")
        return None

final_score_service = FinalScoreService()
