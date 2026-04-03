from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from fastapi.responses import HTMLResponse
from services.session_service import session_service
from services.transcript_service import transcript_service
from services.audio_feature_service import audio_feature_service
from services.text_evaluation_service import text_evaluation_service
from services.visual_evaluation_service import visual_evaluation_service
from services.final_score_service import final_score_service
from services.report_service import report_service
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/export", tags=["export"])


@router.get("/{session_id}", response_class=HTMLResponse)
async def export_report(session_id: str):
    session = session_service.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    scores = final_score_service.get_scores(session_id)
    report = report_service.get_report(session_id)
    transcript = transcript_service.get_transcript(session_id)
    audio_features = audio_feature_service.get_features(session_id)
    visual_eval = visual_evaluation_service.get_evaluation(session_id)

    mastery = "DEVELOPING"
    if scores and scores.mentor_score >= 8:
        mastery = "EXPERT"
    elif scores and scores.mentor_score >= 6:
        mastery = "SKILLED"

    transcript_html = ""
    if transcript:
        seg_rows = "".join(
            f'<tr><td style="padding:4px 8px;border:1px solid #e5e5e5">{seg.start:.0f}s</td>'
            f'<td style="padding:4px 8px;border:1px solid #e5e5e5">{seg.get("speaker", "Speaker")}</td>'
            f'<td style="padding:4px 8px;border:1px solid #e5e5e5">{seg.get("text", "")}</td></tr>'
            for seg in transcript.segments
        )
        transcript_html = f"""
        <h2>Transcript</h2>
        <table style="width:100%;border-collapse:collapse;font-size:12px">
            <tr style="background:#000;color:#fff"><th style="padding:6px">Time</th><th style="padding:6px">Speaker</th><th style="padding:6px">Text</th></tr>
            {seg_rows}
        </table>
        """

    audio_html = ""
    if audio_features:
        audio_html = f"""
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:24px">
            <div style="background:#f5f5f5;padding:16px;border:2px solid #000">
                <div style="font-size:10px;text-transform:uppercase;color:#666">Words/min</div>
                <div style="font-size:24px;font-weight:900">{audio_features.wpm:.1f}</div>
            </div>
            <div style="background:#f5f5f5;padding:16px;border:2px solid #000">
                <div style="font-size:10px;text-transform:uppercase;color:#666">Silence Ratio</div>
                <div style="font-size:24px;font-weight:900">{audio_features.silence_ratio:.2f}</div>
            </div>
            <div style="background:#f5f5f5;padding:16px;border:2px solid #000">
                <div style="font-size:10px;text-transform:uppercase;color:#666">Clarity</div>
                <div style="font-size:24px;font-weight:900">{audio_features.clarity_score:.2f}</div>
            </div>
        </div>
        """

    visual_html = ""
    if visual_eval:
        visual_html = f"""
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:24px">
            <div style="background:#f5f5f5;padding:16px;border:2px solid #000">
                <div style="font-size:10px;text-transform:uppercase;color:#666">Face Visibility</div>
                <div style="font-size:24px;font-weight:900">{visual_eval.face_visibility_score:.2f}</div>
            </div>
            <div style="background:#f5f5f5;padding:16px;border:2px solid #000">
                <div style="font-size:10px;text-transform:uppercase;color:#666">Gaze Forward</div>
                <div style="font-size:24px;font-weight:900">{visual_eval.gaze_forward_score:.2f}</div>
            </div>
            <div style="background:#f5f5f5;padding:16px;border:2px solid #000">
                <div style="font-size:10px;text-transform:uppercase;color:#666">Gesture Score</div>
                <div style="font-size:24px;font-weight:900">{visual_eval.gesture_score:.2f}</div>
            </div>
        </div>
        """

    strengths_html = ""
    if report and report.strengths:
        items = "".join(f"<li style='margin-bottom:8px;padding-left:16px;border-left:3px solid #0038FF'>{s}</li>" for s in report.strengths)
        strengths_html = f"<h3>Strengths</h3><ul style='list-style:none;padding:0'>{items}</ul>"

    improvements_html = ""
    if report and report.improvements:
        items = "".join(f"<li style='margin-bottom:8px;padding-left:16px;border-left:3px solid #000'>{s}</li>" for s in report.improvements)
        improvements_html = f"<h3>Areas for Improvement</h3><ul style='list-style:none;padding:0'>{items}</ul>"

    tips_html = ""
    if report and report.actionable_tips:
        items = "".join(f"<div style='padding:12px;background:#f5f5f5;margin-bottom:8px;border:1px solid #000'><strong>{i+1}.</strong> {t}</div>" for i, t in enumerate(report.actionable_tips))
        tips_html = f"<h3>Actionable Tips</h3>{items}"

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>MentorMetrics Report - {session.mentor_name}</title>
        <style>
            @page {{ size: A4; margin: 20mm; }}
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #000; }}
            h1 {{ font-size: 28px; text-transform: uppercase; letter-spacing: 2px; border-bottom: 4px solid #0038FF; padding-bottom: 8px; }}
            h2 {{ font-size: 20px; text-transform: uppercase; letter-spacing: 1px; margin-top: 32px; border-bottom: 2px solid #000; padding-bottom: 4px; }}
            h3 {{ font-size: 16px; text-transform: uppercase; color: #0038FF; margin-top: 24px; }}
            .score-card {{ background: #0038FF; color: white; padding: 24px; border: 4px solid #000; margin: 24px 0; }}
            .score-card .score {{ font-size: 64px; font-weight: 900; }}
            .score-card .label {{ font-size: 12px; text-transform: uppercase; letter-spacing: 2px; opacity: 0.8; }}
            .score-card .mastery {{ font-size: 18px; font-weight: 900; font-style: italic; margin-top: 16px; }}
            .meta {{ font-size: 12px; color: #666; margin-bottom: 24px; }}
            .param {{ display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }}
            .param-bar {{ height: 24px; background: #f5f5f5; border: 2px solid #000; position: relative; }}
            .param-fill {{ height: 100%; background: #0038FF; border-right: 2px solid #000; }}
            .footer {{ margin-top: 48px; padding-top: 16px; border-top: 2px solid #000; font-size: 10px; color: #999; text-align: center; text-transform: uppercase; }}
        </style>
    </head>
    <body>
        <h1>MentorMetrics Report</h1>
        <div class="meta">
            <strong>Mentor:</strong> {session.mentor_name} &nbsp;|&nbsp;
            <strong>File:</strong> {session.filename} &nbsp;|&nbsp;
            <strong>Date:</strong> {session.created_at[:10]} &nbsp;|&nbsp;
            <strong>Session:</strong> {session.id[:8]}
        </div>

        <div class="score-card">
            <div class="label">Overall Performance</div>
            <div class="score">{scores.mentor_score:.1f} / 10</div>
            <div class="mastery">Mastery Level: {mastery}</div>
        </div>

        <h2>Parameter Breakdown</h2>
        """

    if scores:
        params = [
            ("Engagement", scores.engagement),
            ("Communication Clarity", scores.communication_clarity),
            ("Technical Correctness", scores.technical_correctness),
            ("Pacing & Structure", scores.pacing_structure),
            ("Interactive Quality", scores.interactive_quality),
        ]
        for label, value in params:
            html += f"""
            <div class="param">
                <span style="font-size:12px;font-weight:700;text-transform:uppercase">{label}</span>
                <span style="font-weight:900">{value:.1f}%</span>
            </div>
            <div class="param-bar"><div class="param-fill" style="width:{value}%"></div></div>
            """

    html += f"""
        {audio_html}
        {visual_html}

        <h2>Performance Summary</h2>
        <p style="font-style:italic;line-height:1.6">{report.summary if report and report.summary else "No summary available."}</p>

        {strengths_html}
        {improvements_html}
        {tips_html}
        {transcript_html}

        <div class="footer">
            Generated by MentorMetrics AI Coaching Platform &nbsp;|&nbsp; Confidential Report
        </div>
    </body>
    </html>
    """

    return HTMLResponse(content=html, headers={
        "Content-Disposition": f'attachment; filename="mentormetrics-report-{session.id[:8]}.html"'
    })
