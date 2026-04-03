import asyncio
import os
import tempfile
import time
from typing import Callable, Optional, Dict, Any
import traceback
import logging
from services.session_service import session_service
from services.transcript_service import transcript_service
from services.audio_feature_service import audio_feature_service
from services.text_evaluation_service import text_evaluation_service
from services.visual_evaluation_service import visual_evaluation_service
from services.final_score_service import final_score_service
from services.report_service import report_service
from utils.config import Config

logger = logging.getLogger(__name__)

class PipelineRunner:
    STAGES = [
        "transcribing",
        "audio_analysis",
        "visual_analysis",
        "scoring",
        "report_generation"
    ]

    def __init__(self):
        self._running_pipelines: Dict[str, Dict[str, Any]] = {}

    async def run(self, session_id: str, filename: str, progress_callback: Optional[Callable] = None):
        stages_completed = []
        mentor_score = None
        pipeline_start = time.time()
        self._running_pipelines[session_id] = {
            "stages_completed": [],
            "stage_timings": {},
            "logs": [],
            "started_at": pipeline_start,
        }

        def add_log(msg: str):
            elapsed = time.time() - pipeline_start
            self._running_pipelines[session_id]["logs"].append(f"[{elapsed:.1f}s] {msg}")

        try:
            add_log("Pipeline initialized")
            await asyncio.to_thread(session_service.update_status, session_id, "processing", [], mentor_score)

            for i, stage in enumerate(self.STAGES):
                logger.info(f"Session {session_id} entering stage: {stage}")
                add_log(f"Starting stage: {stage}")
                stage_start = time.time()

                try:
                    mentor_score = await asyncio.to_thread(self._run_sync_stage, stage, session_id, filename, mentor_score)
                except Exception as eval_err:
                    logger.error(f"Error in stage {stage}: {eval_err}")
                    raise eval_err

                stage_elapsed = time.time() - stage_start
                self._running_pipelines[session_id]["stage_timings"][stage] = round(stage_elapsed, 2)
                stages_completed.append(stage)
                self._running_pipelines[session_id]["stages_completed"] = stages_completed
                add_log(f"Stage complete: {stage} ({stage_elapsed:.1f}s)")

                await asyncio.to_thread(session_service.update_status, session_id, "processing", stages_completed, mentor_score)

                if progress_callback:
                    progress_callback(len(stages_completed) / len(self.STAGES) * 100)

            total_time = time.time() - pipeline_start
            add_log(f"Pipeline complete in {total_time:.1f}s")
            logger.info(f"Session {session_id} pipeline fully complete.")
            await asyncio.to_thread(session_service.update_status, session_id, "complete", stages_completed, mentor_score)
             
        except Exception as e:
            logger.error(f"Pipeline failed for session {session_id}: {e}")
            logger.error(traceback.format_exc())
            add_log(f"Pipeline FAILED: {str(e)}")
            await asyncio.to_thread(session_service.update_status, session_id, "failed", stages_completed, None)
        finally:
            self._running_pipelines.pop(session_id, None)
             
        return stages_completed

    def get_pipeline_status(self, session_id: str) -> Optional[Dict[str, Any]]:
        return self._running_pipelines.get(session_id)

    def _run_sync_stage(self, stage: str, session_id: str, filename: str, mentor_score: Optional[float]):
        if stage == "transcribing":
            file_path = self._download_for_processing(filename)
            try:
                transcript_service.create_transcript(session_id, file_path)
            finally:
                self._cleanup_temp_file(file_path)

        elif stage == "audio_analysis":
            transcript = transcript_service.get_transcript(session_id)
            text = transcript.text if transcript else ""
            file_path = self._download_for_processing(filename)
            try:
                audio_feature_service.analyze(session_id, file_path, text)
            finally:
                self._cleanup_temp_file(file_path)
            if transcript:
                text_evaluation_service.evaluate(session_id, transcript.text)

        elif stage == "visual_analysis":
            file_path = self._download_for_processing(filename)
            try:
                visual_evaluation_service.evaluate(session_id, file_path)
            finally:
                self._cleanup_temp_file(file_path)

        elif stage == "scoring":
            audio_features = audio_feature_service.get_features(session_id)
            text_eval = text_evaluation_service.get_evaluation(session_id)
            visual_eval = visual_evaluation_service.get_evaluation(session_id)

            af_dict = audio_features.to_dict() if audio_features else {}
            te_dict = text_eval.to_dict() if text_eval else {}
            ve_dict = visual_eval.to_dict() if visual_eval else {}

            scores = final_score_service.calculate(session_id, af_dict, te_dict, ve_dict)
            if scores:
                mentor_score = scores.mentor_score

        elif stage == "report_generation":
            transcript = transcript_service.get_transcript(session_id)
            scores = final_score_service.get_scores(session_id)
            audio_features = audio_feature_service.get_features(session_id)
            visual_features = visual_evaluation_service.get_evaluation(session_id)
            
            if transcript and scores and audio_features:
                scores_dict = scores.to_dict()
                scores_dict['transcript_segments'] = [s.to_dict() for s in transcript.segments]
                
                report = report_service.generate(
                    session_id,
                    transcript.text,
                    scores_dict,
                    audio_features.to_dict(),
                    visual_features.to_dict() if visual_features else {}
                )
                if not report or not report.summary:
                    raise ValueError("AI report generation returned empty summary")
            else:
                raise ValueError("Missing transcript/scores/audio_features for report generation")
        return mentor_score

    def _download_for_processing(self, filename: str) -> str:
        temp_dir = tempfile.gettempdir()
        file_path = os.path.join(temp_dir, filename)
        file_data = Config.download_from_storage(f"uploads/{filename}")
        with open(file_path, "wb") as f:
            f.write(file_data)
        return file_path

    def _cleanup_temp_file(self, file_path: str):
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except Exception as e:
            logger.warning(f"Failed to cleanup temp file {file_path}: {e}")

    def get_running_pipeline(self, session_id: str) -> Optional[asyncio.Task]:
        return self._running_pipelines.get(session_id)

pipeline_runner = PipelineRunner()
