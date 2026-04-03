from typing import Optional
import os
import cv2
import numpy as np

try:
    import mediapipe as mp
    MEDIAPIPE_AVAILABLE = True
except ImportError:
    MEDIAPIPE_AVAILABLE = False

class VisualEvaluation:
    def __init__(
        self,
        session_id: str,
        face_visibility_score: float,
        gaze_forward_score: float,
        gesture_score: float
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
            "gesture_score": self.gesture_score
        }

class VisualEvaluationService:
    def __init__(self):
        self._evaluations = {}

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

            # Process one frame every ~1 second and cap samples for speed.
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

                # Convert to RGB for mediapipe
                image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                results = pose.process(image)

                if results.pose_landmarks:
                    landmarks = results.pose_landmarks.landmark

                    # Face Visibility (require nose and both eyes)
                    nose = landmarks[mp_pose.PoseLandmark.NOSE.value]
                    l_eye = landmarks[mp_pose.PoseLandmark.LEFT_EYE.value]
                    r_eye = landmarks[mp_pose.PoseLandmark.RIGHT_EYE.value]

                    if nose.visibility > 0.5 and l_eye.visibility > 0.5 and r_eye.visibility > 0.5:
                        face_visible_count += 1

                        # Gaze forward heuristic.
                        eye_dist = abs(l_eye.x - r_eye.x)
                        if eye_dist > 0.02:
                            l_to_nose = abs(nose.x - l_eye.x)
                            ratio = l_to_nose / eye_dist
                            if 0.3 <= ratio <= 0.7:
                                gaze_forward_count += 1

                    # Gesture score: wrist movement over sampled frames.
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

            avg_movement = total_wrist_movement / total_frames_sampled if total_frames_sampled > 0 else 0
            gesture_score = min(avg_movement * 5.0, 1.0)

            evaluation = VisualEvaluation(
                session_id=session_id,
                face_visibility_score=round(face_vis, 3),
                gaze_forward_score=round(gaze, 3),
                gesture_score=round(gesture_score, 3)
            )

            self._evaluations[session_id] = evaluation
            return evaluation

        except Exception as e:
            print(f"Visual analysis failed for {session_id}: {e}")
            evaluation = VisualEvaluation(
                session_id=session_id,
                face_visibility_score=0.5,
                gaze_forward_score=0.5,
                gesture_score=0.5,
            )
            self._evaluations[session_id] = evaluation
            return evaluation

    def _basic_evaluation(self, session_id: str, video_path: str) -> VisualEvaluation:
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return VisualEvaluation(session_id, 0.5, 0.5, 0.5)

        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
        total = 0
        face_hits = 0

        while cap.isOpened() and total < 120:
            ret, frame = cap.read()
            if not ret:
                break
            total += 1
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = face_cascade.detectMultiScale(gray, 1.1, 4)
            if len(faces) > 0:
                face_hits += 1

        cap.release()

        ratio = face_hits / total if total > 0 else 0.5
        evaluation = VisualEvaluation(
            session_id=session_id,
            face_visibility_score=round(ratio, 3),
            gaze_forward_score=round(max(0.2, min(1.0, ratio * 0.9)), 3),
            gesture_score=round(max(0.3, min(1.0, ratio * 0.8)), 3),
        )
        self._evaluations[session_id] = evaluation
        return evaluation

    def get_evaluation(self, session_id: str) -> Optional[VisualEvaluation]:
        return self._evaluations.get(session_id)

visual_evaluation_service = VisualEvaluationService()
