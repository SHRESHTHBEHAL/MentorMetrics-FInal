from typing import Optional
import json
import logging
import google.generativeai as genai
from utils.config import Config

logger = logging.getLogger(__name__)

class TextEvaluation:
    def __init__(
        self,
        session_id: str,
        clarity: float,
        structure: float,
        technical_correctness: float
    ):
        self.session_id = session_id
        self.clarity = clarity
        self.structure = structure
        self.technical_correctness = technical_correctness

    def to_dict(self):
        return {
            "session_id": self.session_id,
            "clarity": self.clarity,
            "structure": self.structure,
            "technical_correctness": self.technical_correctness
        }

class TextEvaluationService:
    def evaluate(self, session_id: str, transcript_text: str) -> TextEvaluation:
        try:
            logger.info(f"Starting text evaluation for {session_id}")
            Config.init_gemini()
            
            model = genai.GenerativeModel(Config.LLM_MODEL)
            prompt = f"""
            Analyze the following transcript of a mentor giving a lesson.
            Rate their teaching on 3 dimensions from 0.0 to 1.0:
            1. clarity: How clearly is the mentor speaking and explaining concepts without jargon or confusion?
            2. structure: Is there a logical flow to the explanation?
            3. technical_correctness: Does the mentor seem to grasp the subject matter they are explaining?

            Be fair and human-centered:
            - Do not penalize accent, dialect, or speaking style.
            - Focus on explanation quality, conceptual correctness, and teachability.
            - Use the full range (0.0-1.0) and avoid always returning mid values.
            
            Return ONLY a valid JSON object exactly like this:
            {{
                "clarity": 0.85,
                "structure": 0.78,
                "technical_correctness": 0.92
            }}
            
            Transcript:
            {transcript_text}
            """
            
            response = model.generate_content(prompt)
            raw_text = response.text.strip()
            if raw_text.startswith("```"):
                raw_text = raw_text.replace("```json", "").replace("```", "").strip()

            data = json.loads(raw_text)
            
            eval_data = TextEvaluation(
                session_id=session_id,
                clarity=float(data.get("clarity", 0.5)),
                structure=float(data.get("structure", 0.5)),
                technical_correctness=float(data.get("technical_correctness", 0.5))
            )
            
            # Save to DB
            supabase = Config.get_supabase()
            try:
                supabase.table("text_evaluations").delete().eq("session_id", session_id).execute()
            except:
                pass
            supabase.table("text_evaluations").insert(eval_data.to_dict()).execute()
            
            return eval_data
            
        except Exception as e:
            logger.error(f"Text evaluation failed, using fallback: {e}")
            # Neutral fallback so pipeline can continue without bias
            eval_data = TextEvaluation(session_id, 0.5, 0.5, 0.5)
            try:
                supabase = Config.get_supabase()
                supabase.table("text_evaluations").insert(eval_data.to_dict()).execute()
            except: pass
            return eval_data

    def get_evaluation(self, session_id: str) -> Optional[TextEvaluation]:
        try:
            supabase = Config.get_supabase()
            result = supabase.table("text_evaluations").select("*").eq("session_id", session_id).execute()
            if result.data and len(result.data) > 0:
                data = result.data[0]
                return TextEvaluation(
                    session_id=data["session_id"],
                    clarity=data["clarity"],
                    structure=data["structure"],
                    technical_correctness=data["technical_correctness"]
                )
        except Exception as e:
            logger.error(f"Failed to fetch text evaluation from DB: {e}")
        return None

text_evaluation_service = TextEvaluationService()
