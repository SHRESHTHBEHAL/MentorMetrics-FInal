import asyncio
import sys

# Must add backend to path if running directly or just rely on cwd
import os
sys.path.append(os.path.join(os.path.dirname(__file__)))

from utils.config import Config
from services.report_service import ReportService
from services.final_score_service import final_score_service
from services.transcript_service import transcript_service
from services.audio_feature_service import audio_feature_service
from services.visual_evaluation_service import visual_evaluation_service

def main():
    Config.init_supabase()
    Config.init_gemini()
    supabase = Config.get_supabase()
    
    # Get latest session
    res = supabase.table("sessions").select("id").order("created_at", desc=True).limit(1).execute()
    if not res.data:
        print("No sessions found")
        return
        
    session_id = res.data[0]["id"]
    print(f"Regenerating report for session: {session_id}")
    
    transcript = transcript_service.get_transcript(session_id)
    scores = final_score_service.get_scores(session_id)
    audio_features = audio_feature_service.get_features(session_id)
    visual_features = visual_evaluation_service.get_evaluation(session_id)
    
    if not transcript or not scores or not audio_features:
        print("Missing prerequisites for session")
        return
        
    scores_dict = scores.to_dict()
    scores_dict['transcript_segments'] = [s.to_dict() for s in transcript.segments]
    
    rs = ReportService()
    report = rs.generate(
        session_id,
        transcript.text,
        scores_dict,
        audio_features.to_dict(),
        visual_features.to_dict() if visual_features else {}
    )
    
    print("NEW SUMMARY:")
    print(report.summary)
    
if __name__ == "__main__":
    main()
