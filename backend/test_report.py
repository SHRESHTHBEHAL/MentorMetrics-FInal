import asyncio
import json
from services.report_service import ReportService
import google.generativeai as genai
from config import Config

Config.init_gemini()
service = ReportService()
try:
    scores = {"mentor_score": 7.5, "engagement": 80, "communication_clarity": 70, "technical_correctness": 90, "pacing_structure": 60, "interactive_quality": 50, "transcript_segments": [{"start": 0.0, "end": 5.0, "text": "Hello world"}]}
    report = service.generate("test-session", "Hello world", scores, {"wpm": 150, "silence_ratio": 0.1, "clarity_score": 0.8}, {"face_visibility_score": 0.9, "gaze_forward_score": 0.8, "gesture_score": 0.5})
    print(f"REPORT SUMMARY: {report.summary}")
    print(f"REPORT STRENGTHS: {report.strengths}")
except Exception as e:
    print(f"ERROR: {e}")
