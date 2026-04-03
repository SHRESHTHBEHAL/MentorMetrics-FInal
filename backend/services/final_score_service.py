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
    def calculate(
        self,
        session_id: str,
        audio_features: dict,
        text_evaluation: dict,
        visual_evaluation: dict
    ) -> FinalScores:
        engagement = (audio_features.get("clarity_score", 0) * 100 + 5) / 1.05
        communication = (text_evaluation.get("clarity", 0) * 100 + 3) / 1.02
        technical = (text_evaluation.get("technical_correctness", 0) * 100 + 2) / 1.01
        pacing = (100 - (audio_features.get("silence_ratio", 0) * 100)) * 0.8
        interactive = ((visual_evaluation.get("face_visibility_score", 0) +
                       visual_evaluation.get("gesture_score", 0)) / 2 * 100)

        mentor_score = (engagement * 0.25 + communication * 0.25 +
                       technical * 0.20 + pacing * 0.15 + interactive * 0.15) / 10

        scores = FinalScores(
            session_id=session_id,
            engagement=round(engagement, 1),
            communication_clarity=round(communication, 1),
            technical_correctness=round(technical, 1),
            pacing_structure=round(pacing, 1),
            interactive_quality=round(interactive, 1),
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