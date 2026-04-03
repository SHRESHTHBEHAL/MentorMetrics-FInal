"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  startLiveSession,
  uploadAudioChunk,
  subscribeToCoachingTips,
  stopLiveSession,
  CoachingTip,
} from "@/lib/live-api";
import { usePoseDetection } from "@/hooks/usePoseDetection";
import CoachingTipCard from "@/components/live/CoachingTipCard";
import { Video, VideoOff, Mic, MicOff, Square, Play, AlertCircle, Loader2 } from "lucide-react";

interface SessionSummary {
  session_id: string;
  status: string;
  duration_seconds: number;
  total_tips: number;
  category_breakdown: Record<string, number>;
  transcript_preview: string;
}

export default function LiveCoachingPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);
  const uploadIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [hasPermission, setHasPermission] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [coachingTips, setCoachingTips] = useState<CoachingTip[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [micLevel, setMicLevel] = useState(0);

  // Pose detection with callback for real-time updates
  const handlePoseUpdate = useCallback((state: any) => {
    // Pose state is updated in the hook
  }, []);

  const { canvasRef, poseState, isPoseReady, isLoading: isPoseLoading } = usePoseDetection(
    videoRef,
    handlePoseUpdate
  );

  // Audio level monitoring
  useEffect(() => {
    if (!streamRef.current) return;

    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const microphone = audioContext.createMediaStreamSource(streamRef.current);
    microphone.connect(analyser);
    analyser.fftSize = 256;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const updateMicLevel = () => {
      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      setMicLevel(Math.min(average / 128, 1));
      if (isStreaming) {
        requestAnimationFrame(updateMicLevel);
      }
    };

    updateMicLevel();

    return () => {
      microphone.disconnect();
      audioContext.close();
    };
  }, [isStreaming]);

  // Timer for elapsed time
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isStreaming) {
      interval = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isStreaming]);

  const cleanupStream = useCallback(() => {
    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }

    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    // Clear upload interval
    if (uploadIntervalRef.current) {
      clearInterval(uploadIntervalRef.current);
      uploadIntervalRef.current = null;
    }

    // Close SSE connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  const stopStream = useCallback(async () => {
    cleanupStream();

    // Stop backend session
    if (sessionId) {
      try {
        const summary = await stopLiveSession(sessionId);
        setSessionSummary(summary);
      } catch (e) {
        console.error("Failed to stop session:", e);
      }
    }

    setIsStreaming(false);
    setIsConnected(false);
  }, [sessionId, cleanupStream]);

  const startStream = async () => {
    setError(null);
    chunksRef.current = [];

    try {
      // Request camera and microphone permissions
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      setHasPermission(true);
      streamRef.current = stream;

      // Set up video preview
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      // Start backend session
      const { session_id } = await startLiveSession();
      setSessionId(session_id);
      setIsStreaming(true);

      // Set up audio recording
      const audioTrack = stream.getAudioTracks()[0];
      const audioStream = new MediaStream([audioTrack]);

      const mediaRecorder = new MediaRecorder(audioStream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // Collect data every second

      // Set up SSE subscription for coaching tips
      eventSourceRef.current = subscribeToCoachingTips(
        session_id,
        (tip) => {
          setCoachingTips((prev) => [...prev.slice(-14), tip]); // Keep last 15 tips
        },
        () => {
          setIsConnected(true);
        },
        () => {
          // Session ended from server
          stopStream();
        }
      );

      // Upload audio chunks every 10 seconds
      let chunkIndex = 0;
      uploadIntervalRef.current = setInterval(async () => {
        if (chunksRef.current.length > 0 && session_id) {
          const chunk = new Blob(chunksRef.current, { type: "audio/webm" });
          try {
            await uploadAudioChunk(session_id, chunk, chunkIndex);
            chunkIndex++;
            chunksRef.current = []; // Clear after successful upload
          } catch (e) {
            console.error("Failed to upload chunk:", e);
          }
        }
      }, 10000);
    } catch (e: any) {
      console.error("Failed to start stream:", e);
      setError(e.message || "Failed to access camera/microphone");
      cleanupStream();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isStreaming) {
        cleanupStream();
      }
    };
  }, [isStreaming, cleanupStream]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getPostureColor = () => {
    switch (poseState.posture) {
      case "good":
        return "text-green-500";
      case "warning":
        return "text-yellow-500";
      case "poor":
        return "text-red-500";
    }
  };

  const getPostureLabel = () => {
    if (!isStreaming) return "";
    if (!poseState.faceVisible) return "⚠ Face not visible";
    switch (poseState.posture) {
      case "good":
        return "✓ Great Posture";
      case "warning":
        return "⚠ Adjust framing";
      case "poor":
        return "✗ Move into frame";
    }
  };

  // Session Summary View
  if (sessionSummary) {
    return (
      <div className="p-4 md:p-8 max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-5xl font-black tracking-tighter uppercase mb-2 font-headline">
            Session Complete
          </h1>
          <p className="text-on-surface-variant font-medium">
            Here&apos;s your live coaching summary
          </p>
        </div>

        <div className="bg-white border-2 border-black p-6 md:p-8 mb-6">
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                Duration
              </span>
              <p className="text-4xl font-black">{formatTime(sessionSummary.duration_seconds)}</p>
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-neutral-500">
                Coaching Tips
              </span>
              <p className="text-4xl font-black">{sessionSummary.total_tips}</p>
            </div>
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-neutral-500">
              Category Breakdown
            </span>
            <div className="flex flex-wrap gap-2 mt-2">
              {Object.entries(sessionSummary.category_breakdown || {}).map(([category, count]) => (
                <span
                  key={category}
                  className="bg-primary text-white px-3 py-1 text-xs font-bold uppercase"
                >
                  {category}: {count}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-black text-white p-6">
          <span className="text-xs font-bold uppercase tracking-widest text-white/60">
            Transcript Preview
          </span>
          <p className="text-sm mt-2 italic">
            {sessionSummary.transcript_preview || "No speech detected"}
          </p>
        </div>

        <button
          onClick={() => {
            setSessionSummary(null);
            setCoachingTips([]);
            setSessionId(null);
            setElapsedTime(0);
          }}
          className="w-full mt-6 bg-primary text-white font-black uppercase py-4 border-2 border-black hover:bg-black transition-colors"
        >
          Start New Session
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl md:text-5xl font-black tracking-tighter uppercase mb-2 font-headline">
          Live Coaching
        </h1>
        <p className="inline-flex items-center border-2 border-black bg-amber-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-900 mb-3">
          Live is early beta mode
        </p>
        <p className="text-on-surface-variant font-medium">
          Get real-time AI feedback as you teach
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border-2 border-red-600 p-4 mb-6 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-red-600 font-bold text-sm">{error}</p>
        </div>
      )}

      {/* Video Container */}
      <div className="relative bg-black aspect-video max-w-4xl mx-auto border-4 border-black mb-6 overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className={`w-full h-full object-cover ${isStreaming ? "opacity-100" : "opacity-30"}`}
        />
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 w-full h-full pointer-events-none ${isStreaming ? "block" : "hidden"}`}
        />

        {!isStreaming && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white pointer-events-none">
            {isPoseLoading ? (
              <>
                <Loader2 className="w-16 h-16 mb-4 animate-spin opacity-50" />
                <p className="text-lg font-bold">Loading AI Models...</p>
                <p className="text-sm text-white/60">Initializing pose detection</p>
              </>
            ) : (
              <>
                <VideoOff className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-lg font-bold">Camera Preview</p>
                <p className="text-sm text-white/60">Press Start to begin</p>
              </>
            )}
          </div>
        )}

        {isStreaming && (
          <>
            {/* Connection Status */}
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/80 text-white px-3 py-1 text-xs font-bold uppercase">
              <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500 animate-pulse" : "bg-yellow-500"}`} />
              {isConnected ? "LIVE" : "Connecting..."}
            </div>

            {/* Timer */}
            <div className="absolute top-4 right-4 bg-black/80 text-white px-3 py-1 text-xs font-bold uppercase font-mono">
              {formatTime(elapsedTime)}
            </div>

            {/* Mic Level Indicator */}
            <div className="absolute bottom-4 left-4 bg-black/80 text-white px-3 py-1 flex items-center gap-2">
              <Mic className="w-4 h-4" />
              <div className="w-16 h-2 bg-white/30 rounded overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${micLevel * 100}%` }}
                />
              </div>
            </div>

            {/* Posture Indicator */}
            <div className={`absolute bottom-4 right-4 bg-black/80 ${getPostureColor()} px-3 py-1 text-xs font-bold uppercase`}>
              {getPostureLabel()}
            </div>
          </>
        )}
      </div>

      {/* Coaching Tips */}
      {coachingTips.length > 0 && (
        <div className="max-w-4xl mx-auto mb-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-3">
            Coaching Tips ({coachingTips.length})
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
            {coachingTips.map((tip, index) => (
              <CoachingTipCard
                key={`${tip.timestamp}-${index}`}
                tip={tip}
                priority={index === coachingTips.length - 1}
              />
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col items-center gap-4">
        {!isStreaming ? (
          <button
            onClick={startStream}
            disabled={isPoseLoading}
            className="bg-primary text-white px-8 py-4 font-black uppercase text-lg border-4 border-black hover:bg-black transition-colors flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPoseLoading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <Play className="w-6 h-6" />
            )}
            Start Live Coaching
          </button>
        ) : (
          <button
            onClick={stopStream}
            className="bg-red-600 text-white px-8 py-4 font-black uppercase text-lg border-4 border-black hover:bg-red-700 transition-colors flex items-center gap-3"
          >
            <Square className="w-6 h-6" />
            End Session
          </button>
        )}

        <div className="flex items-center gap-6 text-xs text-neutral-500">
          <span className="flex items-center gap-1">
            <Mic className="w-4 h-4" /> Audio every 10s
          </span>
          <span className="flex items-center gap-1">
            <Video className="w-4 h-4" /> Pose tracking active
          </span>
          {isConnected && (
            <span className="flex items-center gap-1 text-green-600">
              ✓ AI tips streaming
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
