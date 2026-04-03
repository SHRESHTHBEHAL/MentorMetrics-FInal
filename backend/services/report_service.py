from typing import Optional, List
import json
import logging
import google.generativeai as genai
from utils.config import Config

logger = logging.getLogger(__name__)


class Report:
    def __init__(
        self,
        session_id: str,
        summary: str,
        strengths: List[str],
        improvements: List[str],
        actionable_tips: List[str],
    ):
        self.session_id = session_id
        self.summary = summary
        self.strengths = strengths
        self.improvements = improvements
        self.actionable_tips = actionable_tips

    def to_dict(self):
        return {
            "session_id": self.session_id,
            "summary": self.summary,
            "strengths": self.strengths,
            "improvements": self.improvements,
            "actionable_tips": self.actionable_tips,
        }


class ReportService:
    def generate(
        self,
        session_id: str,
        transcript_text: str,
        scores: dict,
        audio_features: dict,
    ) -> Report:
        logger.info(f"Generating AI report for {session_id}")
        Config.init_gemini()

        model = genai.GenerativeModel(Config.LLM_MODEL)
        prompt = f"""
You are an expert teaching coach.
Analyze the transcript and metrics and return only valid JSON.

Transcript:
{transcript_text}

Metrics:
- Overall Score: {scores.get('mentor_score')}/10
- Engagement: {scores.get('engagement')}%
- Communication Clarity: {scores.get('communication_clarity')}%
- Technical Correctness: {scores.get('technical_correctness')}%
- Pacing: {scores.get('pacing_structure')}%
- Interaction: {scores.get('interactive_quality')}%
- WPM: {audio_features.get('wpm')}
- Silence Ratio: {audio_features.get('silence_ratio')}
- Audio Clarity: {audio_features.get('clarity_score')}

Return JSON exactly:
{{
  "summary": "2-4 sentence personalized summary that explicitly states what this video/session was about.",
  "strengths": ["strength 1", "strength 2", "strength 3", "strength 4"],
  "improvements": ["improvement 1", "improvement 2", "improvement 3", "improvement 4"],
  "actionable_tips": ["tip 1", "tip 2", "tip 3"]
}}
"""

        response = model.generate_content(prompt)
        raw_text = response.text.strip()
        if raw_text.startswith("```"):
            raw_text = raw_text.replace("```json", "").replace("```", "").strip()

        data = json.loads(raw_text)
        report = Report(
            session_id=session_id,
            summary=data.get("summary", ""),
            strengths=data.get("strengths", []),
            improvements=data.get("improvements", []),
            actionable_tips=data.get("actionable_tips", []),
        )

        if not report.summary:
            raise ValueError("AI report summary missing")

        supabase = Config.get_supabase()
        try:
            supabase.table("reports").delete().eq("session_id", session_id).execute()
        except Exception:
            pass
        supabase.table("reports").insert(report.to_dict()).execute()

        return report

    def get_report(self, session_id: str) -> Optional[Report]:
        try:
            supabase = Config.get_supabase()
            result = supabase.table("reports").select("*").eq("session_id", session_id).execute()
            if result.data and len(result.data) > 0:
                data = result.data[0]
                return Report(
                    session_id=data["session_id"],
                    summary=data["summary"],
                    strengths=data.get("strengths", []),
                    improvements=data.get("improvements", []),
                    actionable_tips=data.get("actionable_tips", []),
                )
        except Exception as e:
            logger.error(f"Failed to fetch report from DB: {e}")
        return None


report_service = ReportService()
