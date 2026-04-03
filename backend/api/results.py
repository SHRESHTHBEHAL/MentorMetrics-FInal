from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List

from services.session_service import session_service
from services.transcript_service import transcript_service
from services.audio_feature_service import audio_feature_service
from services.text_evaluation_service import text_evaluation_service
from services.visual_evaluation_service import visual_evaluation_service
from services.final_score_service import final_score_service
from services.report_service import report_service

router = APIRouter(prefix="/api", tags=["results"])

class ScoreBreakdown(BaseModel):
    engagement: float
    communication_clarity: float
    technical_correctness: float
    pacing_structure: float
    interactive_quality: float
    mentor_score: float

class ReportContent(BaseModel):
    summary: str
    strengths: List[str]
    improvements: List[str]
    actionable_tips: List[str]
    milestones: List[dict]

class TranscriptData(BaseModel):
    text: str
    segments: List[dict]

class AudioData(BaseModel):
    wpm: float
    silence_ratio: float
    clarity_score: float

class VisualData(BaseModel):
    face_visibility_score: float
    gaze_forward_score: float
    gesture_score: float

class SessionResultsResponse(BaseModel):
    session_id: str
    status: str
    user_id: str
    mentor_name: str
    filename: str
    file_url: str
    scores: Optional[ScoreBreakdown] = None
    report: Optional[ReportContent] = None
    transcript: Optional[TranscriptData] = None
    audio: Optional[AudioData] = None
    visual: Optional[VisualData] = None

@router.get("/results/{session_id}", response_model=SessionResultsResponse)
async def get_results(session_id: str):
    session = session_service.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    transcript = transcript_service.get_transcript(session_id)
    audio_features = audio_feature_service.get_features(session_id)
    text_eval = text_evaluation_service.get_evaluation(session_id)
    visual_eval = visual_evaluation_service.get_evaluation(session_id)
    scores = final_score_service.get_scores(session_id)
    report = report_service.get_report(session_id)

    def report_needs_refresh(existing_report) -> bool:
        if not existing_report:
            return True
        summary = (existing_report.summary or "").strip()
        strengths = existing_report.strengths or []
        improvements = existing_report.improvements or []
        tips = existing_report.actionable_tips or []
        milestones = existing_report.milestones or []

        # Force refresh if the summary looks generic or too short for a deeply personalized report
        is_generic_fallback = summary.startswith("Your session scored")
        
        return (
            len(summary) < 250
            or len(strengths) < 3
            or len(improvements) < 3
            or len(tips) < 4
            or len(milestones) < 4
            or is_generic_fallback
        )

    if (
        session.status == "complete"
        and transcript
        and scores
        and report_needs_refresh(report)
    ):
        scores_dict = scores.to_dict()
        scores_dict["transcript_segments"] = [s.to_dict() for s in transcript.segments]
        report = report_service.generate(
            session_id=session_id,
            transcript_text=transcript.text,
            scores=scores_dict,
            audio_features=audio_features.to_dict() if audio_features else {},
            visual_features=visual_eval.to_dict() if visual_eval else {},
        )

    scores_data = None
    if scores:
        scores_data = ScoreBreakdown(
            engagement=scores.engagement,
            communication_clarity=scores.communication_clarity,
            technical_correctness=scores.technical_correctness,
            pacing_structure=scores.pacing_structure,
            interactive_quality=scores.interactive_quality,
            mentor_score=scores.mentor_score
        )

    report_data = None
    if report:
        report_data = ReportContent(
            summary=report.summary,
            strengths=report.strengths,
            improvements=report.improvements,
            actionable_tips=report.actionable_tips,
            milestones=report.milestones,
        )

    transcript_data = None
    if transcript:
        transcript_data = TranscriptData(
            text=transcript.text,
            segments=[s.to_dict() for s in transcript.segments]
        )

    audio_data = None
    if audio_features:
        audio_data = AudioData(
            wpm=audio_features.wpm,
            silence_ratio=audio_features.silence_ratio,
            clarity_score=audio_features.clarity_score
        )

    visual_data = None
    if visual_eval:
        visual_data = VisualData(
            face_visibility_score=visual_eval.face_visibility_score,
            gaze_forward_score=visual_eval.gaze_forward_score,
            gesture_score=visual_eval.gesture_score
        )

    return SessionResultsResponse(
        session_id=session.id,
        status=session.status,
        user_id=session.user_id,
        mentor_name=session.mentor_name,
        filename=session.filename,
        file_url=session.file_url,
        scores=scores_data,
        report=report_data,
        transcript=transcript_data,
        audio=audio_data,
        visual=visual_data
    )
