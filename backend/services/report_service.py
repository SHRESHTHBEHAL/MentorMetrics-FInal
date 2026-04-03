from typing import Optional, List
import json
import logging
import os
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError
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
        milestones: List[dict] = None,
    ):
        self.session_id = session_id
        self.summary = summary
        self.strengths = strengths
        self.improvements = improvements
        self.actionable_tips = actionable_tips
        self.milestones = milestones or []

    def to_dict(self):
        return {
            "session_id": self.session_id,
            "summary": self.summary,
            "strengths": self.strengths,
            "improvements": self.improvements,
            "actionable_tips": self.actionable_tips,
            "milestones": self.milestones,
        }


class ReportService:
    def _generate_content_with_timeout(self, model, prompt: str):
        timeout_seconds = int(os.getenv("REPORT_LLM_TIMEOUT_SECONDS", "45"))
        executor = ThreadPoolExecutor(max_workers=1)
        future = executor.submit(model.generate_content, prompt)
        try:
            return future.result(timeout=timeout_seconds)
        except FuturesTimeoutError as e:
            raise TimeoutError(f"Report LLM timed out after {timeout_seconds}s") from e
        finally:
            executor.shutdown(wait=False, cancel_futures=True)

    def _compress_segments_for_prompt(self, segments: List[dict], max_segments: int = 80) -> List[dict]:
        if len(segments) <= max_segments:
            return segments

        if max_segments <= 2:
            return [segments[0], segments[-1]]

        picks = [segments[0]]
        middle_slots = max_segments - 2
        step = (len(segments) - 1) / (middle_slots + 1)
        for i in range(1, middle_slots + 1):
            idx = min(len(segments) - 2, max(1, round(i * step)))
            picks.append(segments[idx])
        picks.append(segments[-1])
        return picks

    def _extract_json(self, raw_text: str) -> dict:
        cleaned = raw_text.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.replace("```json", "").replace("```", "").strip()

        try:
            return json.loads(cleaned)
        except Exception:
            start = cleaned.find("{")
            end = cleaned.rfind("}")
            if start == -1 or end == -1 or end <= start:
                raise
            return json.loads(cleaned[start : end + 1])

    def _build_fallback_report(self, session_id: str, scores: dict, segments: List[dict]) -> Report:
        mentor_score = float(scores.get("mentor_score", 0) or 0)
        metric_pairs = [
            ("engagement", float(scores.get("engagement", 0) or 0)),
            ("communication clarity", float(scores.get("communication_clarity", 0) or 0)),
            ("technical correctness", float(scores.get("technical_correctness", 0) or 0)),
            ("pacing", float(scores.get("pacing_structure", 0) or 0)),
            ("interaction", float(scores.get("interactive_quality", 0) or 0)),
        ]
        strongest = max(metric_pairs, key=lambda item: item[1])
        weakest = min(metric_pairs, key=lambda item: item[1])

        milestones = []
        if segments:
            target_count = min(5, len(segments))
            step = (len(segments) - 1) / max(target_count - 1, 1)
            for i in range(target_count):
                idx = min(len(segments) - 1, round(i * step))
                seg = segments[idx]
                text = (seg.get("text") or "").strip()
                milestones.append(
                    {
                        "timestamp": float(seg.get("start", 0) or 0),
                        "label": f"Moment {i + 1}",
                        "commentary": text[:180] if text else "Revisit this moment for clarity and learner engagement.",
                    }
                )

        summary = (
            f"Your session scored {mentor_score:.1f}/10. "
            f"Your strongest area is {strongest[0]} ({strongest[1]:.0f}%), "
            f"and the main opportunity is {weakest[0]} ({weakest[1]:.0f}%)."
        )

        return Report(
            session_id=session_id,
            summary=summary,
            strengths=[
                f"Strongest dimension this session: {strongest[0]}.",
                "You maintained enough structure for learners to follow most of the flow.",
                "You sustained core topic continuity without excessive topic drift.",
            ],
            improvements=[
                f"Prioritize improving {weakest[0]} in the next session.",
                "Add one deliberate learner check-in after each key concept.",
                "Tighten concept explanations before moving into examples.",
            ],
            actionable_tips=[
                "Use a short concept -> example -> check-in loop for each teaching chunk.",
                "Keep a brief pause before and after key definitions.",
                "End each section with a one-sentence recap.",
                "Ask one diagnostic learner question every 2-3 minutes.",
            ],
            milestones=milestones,
        )

    def generate(
        self,
        session_id: str,
        transcript_text: str,
        scores: dict,
        audio_features: dict,
        visual_features: Optional[dict] = None,
    ) -> Report:
        logger.info(f"Generating AI report for {session_id}")
        segments = scores.get("transcript_segments", []) or []
        visual_features = visual_features or {}

        try:
            Config.init_gemini()

            prompt_segments = self._compress_segments_for_prompt(segments)
            segments_json = json.dumps(prompt_segments, indent=2)
            transcript_excerpt = (transcript_text or "").strip()
            if len(transcript_excerpt) > 7000:
                transcript_excerpt = transcript_excerpt[:7000] + "\n\n[Transcript excerpt truncated]"

            model = genai.GenerativeModel(
                model_name=Config.LLM_MODEL,
                generation_config=genai.GenerationConfig(response_mime_type="application/json")
            )
            prompt = f"""
You are an expert, hyper-observant teaching coach analyzing a mentor's teaching session.
Your task is to create a deeply personalized, highly specific report based ONLY on the provided session evidence (transcript, timing, metrics).
You MUST explicitly identify the specific topic/subject being taught. Do NOT give generic advice. Anchor EVERY strength, weakness, and actionable tip to specific moments, quotes, or behaviors observed in the transcript.

Human-first evaluation rules:
- Be respectful and specific.
- Judge teaching behaviors and pedagogical choices, not personality.
- Do NOT penalize accent, dialect, or cultural speaking style.
- Separate delivery issues from conceptual correctness.
- Rely heavily on concrete transcript evidence (what they actually said).
- **FORMATTING REQUIREMENT:** Use Markdown bolding (`**text**`) to emphasize key concepts, specific actions, or important phrases within the strengths, improvements, and actionable tips.

Transcript Segments (with timestamps):
{segments_json}

Transcript Excerpt (for context):
{transcript_excerpt}

Metrics:
- Overall Score: {scores.get('mentor_score')}/10
- Engagement: {scores.get('engagement')}%
- Communication Clarity: {scores.get('communication_clarity')}%
- Technical Correctness: {scores.get('technical_correctness')}%
- Pacing: {scores.get('pacing_structure')}%
- Interaction: {scores.get('interactive_quality')}%

Raw Signals:
- Words Per Minute (WPM): {audio_features.get('wpm')}
- Silence Ratio: {audio_features.get('silence_ratio')}
- Vocal Clarity Proxy: {audio_features.get('clarity_score')}
- Face Visibility: {visual_features.get('face_visibility_score')}
- Gaze Forward: {visual_features.get('gaze_forward_score')}
- Gesture Score: {visual_features.get('gesture_score')}

Return ONLY a valid JSON object with the following structure:
{{
  "summary": "A comprehensive, highly detailed 6-8 sentence summary. YOU MUST explicitly name the specific topic/subject taught in the first sentence. Describe their specific teaching style, how they explained the specific concepts, and evaluate their overall delivery based on the transcript.",
  "strengths": [
    "**Strong Real-World Analogy:** You effectively used a real-world analogy when explaining **[Concept]** at [Time], which made it much easier to grasp.",
    "**Specific Strength 2:**...",
    "**Specific Strength 3:**..."
  ],
  "improvements": [
    "**Lengthy Explanations:** When introducing **[Concept]**, you spoke for 3 uninterrupted minutes. Breaking this down...",
    "**Specific Weakness 2:**...",
    "**Specific Weakness 3:**..."
  ],
  "actionable_tips": [
    "**Use Application Questions:** Instead of asking \"Does that make sense?\" after explaining **[Concept]**, ask \"How would you apply this to **[Scenario]**?\"",
    "**Highly specific tip 2:**...",
    "**Highly specific tip 3:**...",
    "**Highly specific tip 4:**..."
  ],
  "milestones": [
    {{
      "timestamp": 30.5,
      "label": "Strong Opening",
      "commentary": "You established high engagement here by using a personal hook about **[Specific Topic]**."
    }}
  ]
}}

Guidelines for Milestones:
- Choose 4-6 most important teaching moments (e.g., introducing a new concept, a confusing explanation, an engaging question).
- Use exact timestamps (start time) from the provided segments.
- Labels should be catchy and 2-4 words.
- Commentary MUST reference exactly what was said or taught at that moment.
- Ensure a mix of positive reinforcement and constructive feedback.

CRITICAL Personalization Requirements:
- NO GENERIC ADVICE. If the text says "Good job engaging," it is wrong. It must say "Good job engaging the learner by asking them about **[Specific Topic]**."
- You MUST explicitly reference the actual subject matter.
- Include quotes from the transcript where relevant in your strengths and improvements.
"""

            response = self._generate_content_with_timeout(model, prompt)
            raw_text = (response.text or "").strip()
            data = self._extract_json(raw_text)

            raw_milestones = data.get("milestones", []) if isinstance(data.get("milestones", []), list) else []
            normalized_milestones = []
            for m in raw_milestones:
                if not isinstance(m, dict):
                    continue
                try:
                    ts = float(m.get("timestamp", 0) or 0)
                except Exception:
                    continue
                normalized_milestones.append(
                    {
                        "timestamp": ts,
                        "label": str(m.get("label", "Key Moment") or "Key Moment"),
                        "commentary": str(m.get("commentary", "") or ""),
                    }
                )

            report = Report(
                session_id=session_id,
                summary=str(data.get("summary", "") or "").strip(),
                strengths=[str(x) for x in (data.get("strengths", []) or [])],
                improvements=[str(x) for x in (data.get("improvements", []) or [])],
                actionable_tips=[str(x) for x in (data.get("actionable_tips", []) or [])],
                milestones=normalized_milestones,
            )

            # Lowered the strict length check so perfectly good short reports don't get tossed out
            if not report.summary or len(report.strengths) == 0 or len(report.improvements) == 0:
                logger.warning(f"AI report output incomplete: {raw_text}")
                report = self._build_fallback_report(session_id, scores, segments)

        except Exception as e:
            logger.exception(f"AI report generation failed for {session_id}, using fallback report: {e}")
            report = self._build_fallback_report(session_id, scores, segments)

        supabase = Config.get_supabase()
        try:
            supabase.table("reports").delete().eq("session_id", session_id).execute()
        except Exception:
            pass
        try:
            supabase.table("reports").insert(report.to_dict()).execute()
        except Exception as e:
            logger.warning(f"Report insert with milestones failed for {session_id}, retrying without milestones: {e}")
            legacy_payload = {
                "session_id": report.session_id,
                "summary": report.summary,
                "strengths": report.strengths,
                "improvements": report.improvements,
                "actionable_tips": report.actionable_tips,
            }
            supabase.table("reports").insert(legacy_payload).execute()

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
                    milestones=data.get("milestones", []),
                )
        except Exception as e:
            logger.error(f"Failed to fetch report from DB: {e}")
        return None


report_service = ReportService()
