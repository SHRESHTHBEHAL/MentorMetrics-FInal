from typing import Optional
import logging
import os

import cv2
import numpy as np

from utils.config import Config

try:
    import mediapipe as mp
    MEDIAPIPE_AVAILABLE = True
except ImportError:
    MEDIAPIPE_AVAILABLE = False

logger = logging.getLogger(__name__)


class VisualEvaluation:
    def __init__(
        self,
        session_id: str,
        face_visibility_score: float,
        gaze_forward_score: float,
        gesture_score: float,
    ):
        self.session_id = session_id
        self.face_visibility_score = face_visibility_score
        self.gaze_forward_score = gaze_forward_score
        self.gesture_score = gesture_score

    def to_dict(self):
        return {
            "session_id": self.session_id,
            "face_visibility_score": self.face_visibility_score,
            "gaze_forward_score": self.gaze_forward_score,
            "gesture_score": self.gesture_score,
        }


class VisualEvaluationService:
    def __init__(self):
        self._evaluations = {}

    def _save(self, evaluation: VisualEvaluation) -> None:
        self._evaluations[evaluation.session_id] = evaluation
        try:
            supabase = Config.get_supabase()
            try:
                supabase.table("visual_evaluations").delete().eq("session_id", evaluation.session_id).execute()
            except Exception:
                pass
            supabase.table("visual_evaluations").insert(evaluation.to_dict()).execute()
        except Exception as e:
            logger.warning(f"Failed to persist visual evaluation: {e}")

    def _default_eval(self, session_id: str) -> VisualEvaluation:
        return VisualEvaluation(
            session_id=session_id,
            face_visibility_score=0.5,
            gaze_forward_score=0.5,
            gesture_score=0.5,
        )

    def _basic_evaluation(self, session_id: str, video_path: str) -> VisualEvaluation:
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            evaluation = self._default_eval(session_id)
            self._save(evaluation)
            return evaluation

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        fps = cap.get(cv2.CAP_PROP_FPS) or 30
        duration_sec = total_frames / fps if fps > 0 else 0
        cap.release()

        # Neutral fallback when mediapipe is unavailable so we do not unfairly
        # penalize or reward visual behavior that was never measured.
        face_visibility = 0.5 if duration_sec > 0 else 0.5
        gaze_forward = 0.5
        gesture = 0.5

        evaluation = VisualEvaluation(
            session_id=session_id,
            face_visibility_score=round(face_visibility, 3),
            gaze_forward_score=round(gaze_forward, 3),
            gesture_score=round(gesture, 3),
        )
        self._save(evaluation)
        return evaluation

    def evaluate(self, session_id: str, video_path: str) -> VisualEvaluation:
        try:
            if not os.path.exists(video_path):
                raise FileNotFoundError(f"Video file not found: {video_path}")

            if not MEDIAPIPE_AVAILABLE:
                return self._basic_evaluation(session_id, video_path)

            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                raise RuntimeError(f"Could not open video: {video_path}")

            fps = cap.get(cv2.CAP_PROP_FPS)
            frame_skip = int(fps) if fps and fps > 0 else 30
            max_samples = 120

            mp_pose = mp.solutions.pose
            pose = mp_pose.Pose(min_detection_confidence=0.5)

            total_frames_sampled = 0
            face_visible_count = 0
            gaze_forward_count = 0

            prev_wrists = None
            total_wrist_movement = 0.0

            frame_idx = 0
            while cap.isOpened():
                if total_frames_sampled >= max_samples:
                    break

                cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
                ret, frame = cap.read()
                if not ret:
                    break

                total_frames_sampled += 1

                image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                results = pose.process(image)

                if results.pose_landmarks:
                    landmarks = results.pose_landmarks.landmark

                    nose = landmarks[mp_pose.PoseLandmark.NOSE.value]
                    l_eye = landmarks[mp_pose.PoseLandmark.LEFT_EYE.value]
                    r_eye = landmarks[mp_pose.PoseLandmark.RIGHT_EYE.value]

                    if nose.visibility > 0.5 and l_eye.visibility > 0.5 and r_eye.visibility > 0.5:
                        face_visible_count += 1
                        eye_dist = abs(l_eye.x - r_eye.x)
                        if eye_dist > 0.02:
                            l_to_nose = abs(nose.x - l_eye.x)
                            ratio = l_to_nose / eye_dist
                            if 0.3 <= ratio <= 0.7:
                                gaze_forward_count += 1

                    l_wrist = landmarks[mp_pose.PoseLandmark.LEFT_WRIST.value]
                    r_wrist = landmarks[mp_pose.PoseLandmark.RIGHT_WRIST.value]
                    if l_wrist.visibility > 0.5 and r_wrist.visibility > 0.5:
                        current_wrists = np.array([l_wrist.x, l_wrist.y, r_wrist.x, r_wrist.y])
                        if prev_wrists is not None:
                            dist = np.linalg.norm(current_wrists - prev_wrists)
                            total_wrist_movement += dist
                        prev_wrists = current_wrists

                frame_idx += frame_skip

            cap.release()
            pose.close()

            if total_frames_sampled == 0:
                face_vis = 0.5
                gaze = 0.5
            else:
                face_vis = face_visible_count / total_frames_sampled
                gaze = gaze_forward_count / face_visible_count if face_visible_count > 0 else 0.0

            avg_movement = total_wrist_movement / total_frames_sampled if total_frames_sampled > 0 else 0.0
            gesture_score = min(avg_movement * 5.0, 1.0)

            evaluation = VisualEvaluation(
                session_id=session_id,
                face_visibility_score=round(face_vis, 3),
                gaze_forward_score=round(gaze, 3),
                gesture_score=round(gesture_score, 3),
            )
            self._save(evaluation)
            return evaluation

        except Exception as e:
            logger.warning(f"Visual analysis failed for {session_id}: {e}")
            evaluation = self._default_eval(session_id)
            self._save(evaluation)
            return evaluation

    def get_evaluation(self, session_id: str) -> Optional[VisualEvaluation]:
        if session_id in self._evaluations:
            return self._evaluations[session_id]

        try:
            supabase = Config.get_supabase()
            result = supabase.table("visual_evaluations").select("*").eq("session_id", session_id).execute()
            if result.data and len(result.data) > 0:
                row = result.data[0]
                return VisualEvaluation(
                    session_id=row["session_id"],
                    face_visibility_score=row["face_visibility_score"],
                    gaze_forward_score=row["gaze_forward_score"],
                    gesture_score=row["gesture_score"],
                )
        except Exception as e:
            logger.warning(f"Failed to fetch visual evaluation from DB: {e}")

        return None


visual_evaluation_service = VisualEvaluationService()
