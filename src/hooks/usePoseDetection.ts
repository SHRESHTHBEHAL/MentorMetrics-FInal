"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import {
  PoseLandmarker,
  FilesetResolver,
  PoseLandmarkerResult,
} from "@mediapipe/tasks-vision";

interface PoseState {
  faceVisible: boolean;
  gazeForward: boolean;
  posture: "good" | "warning" | "poor";
  shoulderWidth: number;
  faceConfidence: number;
}

interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

// PoseLandmarker runs at this FPS
const RUNNING_MODE = "VIDEO" as const;
const TARGET_FPS = 10;
const FRAME_INTERVAL = 1000 / TARGET_FPS;

export function usePoseDetection(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  onPoseUpdate?: (state: PoseState) => void
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);
  const animationRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);

  const [poseState, setPoseState] = useState<PoseState>({
    faceVisible: true,
    gazeForward: true,
    posture: "good",
    shoulderWidth: 0,
    faceConfidence: 1.0,
  });

  const [isPoseReady, setIsPoseReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize PoseLandmarker
  useEffect(() => {
    let mounted = true;

    const initPose = async () => {
      try {
        console.log("Initializing MediaPipe Pose Landmarker...");
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );

        const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task",
            delegate: "GPU",
          },
          runningMode: RUNNING_MODE,
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        if (mounted) {
          poseLandmarkerRef.current = poseLandmarker;
          setIsPoseReady(true);
          setIsLoading(false);
          console.log("MediaPipe Pose Landmarker initialized successfully");
        }
      } catch (e) {
        console.error("Failed to initialize Pose Landmarker:", e);
        if (mounted) {
          setError("Failed to initialize pose detection. Using fallback.");
          setIsLoading(false);
        }
      }
    };

    initPose();

    return () => {
      mounted = false;
      if (poseLandmarkerRef.current) {
        poseLandmarkerRef.current.close();
        poseLandmarkerRef.current = null;
      }
    };
  }, []);

  // Analyze pose and return state
  const analyzePose = useCallback(
    (landmarks: Landmark[]): PoseState => {
      if (!landmarks || landmarks.length === 0) {
        return { faceVisible: false, gazeForward: false, posture: "poor", shoulderWidth: 0, faceConfidence: 0 };
      }

      // Key landmarks indices from MediaPipe Pose
      // Face: 0 (nose), 1 (left_eye_inner), 2 (left_eye), 3 (left_eye_outer), 4 (right_eye_inner), 5 (right_eye), 6 (right_eye_outer)
      // Upper body: 11 (left_shoulder), 12 (right_shoulder), 13 (left_elbow), 14 (right_elbow)

      const nose = landmarks[0];
      const leftShoulder = landmarks[11];
      const rightShoulder = landmarks[12];
      const leftEye = landmarks[2];
      const rightEye = landmarks[5];

      // Check face visibility (nose and eyes visible)
      const faceVisible =
        nose?.visibility !== undefined &&
        nose.visibility > 0.5 &&
        leftEye?.visibility !== undefined &&
        leftEye.visibility > 0.5 &&
        rightEye?.visibility !== undefined &&
        rightEye.visibility > 0.5;

      // Check gaze forward (simplified: eyes should be roughly horizontal)
      let gazeForward = true;
      if (leftEye && rightEye && nose) {
        const eyeLineY = Math.abs(leftEye.y - rightEye.y);
        const noseToEyeY = Math.abs(nose.y - (leftEye.y + rightEye.y) / 2);
        // If eyes are at very different heights or nose is misaligned, gaze might be off
        gazeForward = eyeLineY < 0.05 && noseToEyeY < 0.05;
      }

      // Calculate shoulder width (normalized)
      let shoulderWidth = 0;
      const shouldersVisible =
        leftShoulder?.visibility !== undefined &&
        rightShoulder?.visibility !== undefined &&
        leftShoulder.visibility > 0.5 &&
        rightShoulder.visibility > 0.5;

      if (leftShoulder && rightShoulder) {
        shoulderWidth = Math.abs(rightShoulder.x - leftShoulder.x);
      }

      // Determine overall posture
      let posture: "good" | "warning" | "poor" = "good";

      if (!faceVisible) {
        posture = "poor";
      } else if (!gazeForward || (shouldersVisible && shoulderWidth < 0.1)) {
        posture = "warning";
      }

      const faceConfidence =
        faceVisible && nose && leftEye && rightEye
          ? ((nose.visibility || 0) + (leftEye.visibility || 0) + (rightEye.visibility || 0)) / 3
          : 0;

      return {
        faceVisible,
        gazeForward,
        posture,
        shoulderWidth,
        faceConfidence,
      };
    },
    []
  );

  // Draw pose skeleton on canvas
  const drawPose = useCallback(
    (ctx: CanvasRenderingContext2D, landmarks: Landmark[], width: number, height: number) => {
      if (!landmarks || landmarks.length === 0) return;

      // Define connections for drawing skeleton
      const connections = [
        // Face
        [0, 1], [1, 2], [2, 3], [3, 7], // left eye
        [0, 4], [4, 5], [5, 6], [6, 8], // right eye
        [9, 10], // mouth
        // Upper body
        [11, 12], // shoulders
        [11, 13], [13, 15], // left arm
        [12, 14], [14, 16], // right arm
        // Torso
        [11, 23], [12, 24], // torso to hips
        [23, 24], // hips
      ];

      // Color based on posture
      const getColor = (visibility: number | undefined) => {
        if (!visibility || visibility < 0.5) return "rgba(255, 0, 0, 0.5)"; // red - not visible
        return "rgba(34, 197, 94, 1)"; // green - visible
      };

      const getPostureColor = () => {
        const state = analyzePose(landmarks);
        switch (state.posture) {
          case "good":
            return "rgba(34, 197, 94, 0.8)"; // green
          case "warning":
            return "rgba(234, 179, 8, 0.8)"; // yellow
          case "poor":
            return "rgba(239, 68, 68, 0.8)"; // red
        }
      };

      const postureColor = getPostureColor();

      // Draw connections
      ctx.strokeStyle = postureColor;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";

      for (const [startIdx, endIdx] of connections) {
        const start = landmarks[startIdx];
        const end = landmarks[endIdx];

        if (start && end && start.visibility !== undefined && end.visibility !== undefined) {
          if (start.visibility > 0.5 && end.visibility > 0.5) {
            ctx.beginPath();
            ctx.moveTo(start.x * width, start.y * height);
            ctx.lineTo(end.x * width, end.y * height);
            ctx.stroke();
          }
        }
      }

      // Draw landmarks
      for (let i = 0; i < landmarks.length; i++) {
        const landmark = landmarks[i];
        if (landmark.visibility !== undefined && landmark.visibility > 0.5) {
          ctx.fillStyle = getColor(landmark.visibility);
          ctx.beginPath();
          ctx.arc(landmark.x * width, landmark.y * height, 4, 0, 2 * Math.PI);
          ctx.fill();
        }
      }

      // Draw face guide (ellipse around face area)
      const nose = landmarks[0];
      const leftEyeOuter = landmarks[3];
      const rightEyeOuter = landmarks[6];

      if (nose && leftEyeOuter && rightEyeOuter && nose.visibility && nose.visibility > 0.5) {
        const centerX = (leftEyeOuter.x + rightEyeOuter.x) / 2 * width;
        const centerY = nose.y * height;
        const radiusX = Math.abs(rightEyeOuter.x - leftEyeOuter.x) * width * 1.5;

        ctx.strokeStyle = postureColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, radiusX, radiusX * 0.8, 0, 0, 2 * Math.PI);
        ctx.stroke();
      }
    },
    [analyzePose]
  );

  // Detection loop
  const detectPose = useCallback(function detect() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const poseLandmarker = poseLandmarkerRef.current;

    const now = performance.now();
    const elapsed = now - lastFrameTimeRef.current;

    if (elapsed < FRAME_INTERVAL) {
      animationRef.current = requestAnimationFrame(detect);
      return;
    }

    if (!video || !canvas || !poseLandmarker) {
      animationRef.current = requestAnimationFrame(detect);
      return;
    }

    // Skip if video hasn't loaded
    if (video.readyState < 2) {
      animationRef.current = requestAnimationFrame(detect);
      return;
    }

    // Skip if video hasn't advanced (avoid duplicate processing)
    if (video.currentTime === lastVideoTimeRef.current) {
      animationRef.current = requestAnimationFrame(detect);
      return;
    }
    lastVideoTimeRef.current = video.currentTime;
    lastFrameTimeRef.current = now;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Sync canvas size with video display size
    const displayWidth = video.offsetWidth;
    const displayHeight = video.offsetHeight;

    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
      canvas.width = displayWidth;
      canvas.height = displayHeight;
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    try {
      // Detect pose in video frame
      const result: PoseLandmarkerResult = poseLandmarker.detectForVideo(video, performance.now());

      if (result.landmarks && result.landmarks.length > 0) {
        const landmarks = result.landmarks[0];

        // Analyze pose
        const newState = analyzePose(landmarks);
        setPoseState(newState);
        onPoseUpdate?.(newState);

        // Draw skeleton
        drawPose(ctx, landmarks, canvas.width, canvas.height);
      } else {
        // No pose detected
        const noPoseState: PoseState = {
          faceVisible: false,
          gazeForward: false,
          posture: "poor",
          shoulderWidth: 0,
          faceConfidence: 0,
        };
        setPoseState(noPoseState);
        onPoseUpdate?.(noPoseState);

        // Draw "no pose detected" message
        ctx.fillStyle = "rgba(239, 68, 68, 0.8)";
        ctx.font = "bold 16px Space Grotesk, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("No pose detected", canvas.width / 2, canvas.height / 2);
      }
    } catch (e) {
      console.error("Pose detection error:", e);
    }

    animationRef.current = requestAnimationFrame(detect);
  }, [videoRef, analyzePose, drawPose, onPoseUpdate]);

  // Start detection loop when video is ready
  useEffect(() => {
    if (isPoseReady && videoRef.current) {
      animationRef.current = requestAnimationFrame(detectPose);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPoseReady, detectPose, videoRef]);

  return {
    canvasRef,
    poseState,
    isPoseReady,
    isLoading,
    error,
  };
}
