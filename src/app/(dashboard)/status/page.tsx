"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getSessionStatus } from "@/lib/api";
import { CheckCircle, FileText, Terminal, Loader2, AlertTriangle, Zap, Cpu, MoreHorizontal } from "lucide-react";

const stages = [
  { id: "transcribing", label: "Transcribing", description: "Audio duration: 42:15. Multi-speaker identified.", icon: CheckCircle },
  { id: "audio_analysis", label: "Audio Analysis", description: "Tonality, pitch variance, and pause frequency analyzed.", icon: Cpu },
  { id: "visual_analysis", label: "Visual Analysis", description: "Micro-expressions and body posture mapping in progress.", icon: Zap },
  { id: "scoring", label: "Scoring", description: "Comparing against 450+ mentorship benchmarks.", icon: MoreHorizontal },
  { id: "report_generation", label: "Report Generation", description: "Synthesizing actionable feedback blocks.", icon: FileText },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const containerVariants: any = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const itemVariants: any = {
  hidden: { opacity: 0, x: -20, scale: 0.95 },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 120,
      damping: 14,
    },
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const shimmerVariants: any = {
  initial: { x: "-100%" },
  animate: {
    x: "200%",
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "linear" as const,
    },
  },
};

function StatusContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [status, setStatus] = useState<string>("");
  const [stagesCompleted, setStagesCompleted] = useState<string[]>([]);
  const [dataPoints, setDataPoints] = useState<number>(0);
  const [latency, setLatency] = useState<number>(0);
  const [nodeLoad, setNodeLoad] = useState<number>(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [isInitialized] = useState(true);
  const logsContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    const fetchStatus = async () => {
      try {
        const data = await getSessionStatus(sessionId);
        setStatus(data.status);
        setStagesCompleted(data.stages_completed || []);

        if (data.data_points_scanned) {
          setDataPoints(data.data_points_scanned);
        }
        if (data.latency_ms) {
          setLatency(data.latency_ms);
        }
        if (data.node_load) {
          setNodeLoad(data.node_load);
        }
        
        if (data.logs && data.logs.length > 0) {
          setLogs((prev) => {
            const merged = [...prev];
            for (const line of data.logs || []) {
              if (!merged.includes(line)) {
                merged.push(line);
              }
            }
            return merged;
          });
        }

        if (data.status === "failed") {
          setLogs((prev) => {
            const merged = [...prev];
            const failedNotes = [
              "[ERROR] Pipeline failed during AI report generation.",
              "[ACTION] Retry upload or check backend Gemini model/quota.",
            ];
            for (const line of failedNotes) {
              if (!merged.includes(line)) {
                merged.push(line);
              }
            }
            return merged;
          });
        }

        if (data.status === "complete") {
          setTimeout(() => router.push(`/results?session_id=${sessionId}`), 1500);
        }
      } catch (error) {
        console.error("Failed to fetch status:", error);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 2500);
    return () => {
      clearInterval(interval);
    };
  }, [sessionId, router]);

  useEffect(() => {
    const logsEl = logsContainerRef.current;
    if (logsEl) {
      logsEl.scrollTop = logsEl.scrollHeight;
    }
  }, [logs]);

  const completedCount = Math.min(stagesCompleted.length, stages.length);
  const progress = (completedCount / stages.length) * 100;
  const failedStageIndex = status === "failed" ? Math.min(completedCount, stages.length - 1) : -1;
  const activeStageIndex = status === "processing" ? Math.min(completedCount, stages.length - 1) : -1;
  const isComplete = status === "complete";
  const isFailed = status === "failed";
  const isProcessing = status === "processing";

  return (
    <motion.div 
      className="p-4 md:p-12 max-w-7xl mx-auto w-full"
      initial="hidden"
      animate={isInitialized ? "visible" : "hidden"}
      variants={containerVariants}
    >
      {/* Header */}
      <motion.div className="mb-8 md:mb-12" variants={itemVariants}>
        <motion.h2 
          className="text-4xl md:text-8xl font-black text-primary tracking-tighter leading-none mb-4 italic"
          animate={isProcessing ? { scale: [1, 1.01, 1] } : {}}
          transition={{ duration: 2, repeat: isProcessing ? Infinity : 0 }}
        >
          <AnimatePresence mode="wait">
            {isFailed ? (
              <motion.span
                key="failed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-red-600"
              >
                PROCESSING FAILED
              </motion.span>
            ) : isComplete ? (
              <motion.span
                key="complete"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-green-600"
              >
                ANALYSIS COMPLETE
              </motion.span>
            ) : (
              <motion.span
                key="processing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                ANALYZING SESSION
              </motion.span>
            )}
          </AnimatePresence>
        </motion.h2>
        
        <div className="flex items-center gap-4">
          <div className="h-2 flex-1 bg-surface-container-highest rounded-full overflow-hidden relative">
            <motion.div 
              className="absolute inset-0 bg-gradient-to-r from-primary via-blue-400 to-primary"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ 
                duration: 0.8, 
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
            />
            <motion.div 
              className="absolute top-0 left-0 h-full w-12 bg-white/30"
              variants={shimmerVariants}
              animate={isProcessing ? "animate" : "initial"}
            />
          </div>
          <motion.span 
            className="font-mono text-lg md:text-xl font-bold tabular-nums"
            key={progress.toFixed(0)}
            initial={{ scale: 1.2, color: "#0038FF" }}
            animate={{ scale: 1, color: "#000" }}
            transition={{ duration: 0.3 }}
          >
            {progress.toFixed(0)}%
          </motion.span>
        </div>

        <div className="mt-4 grid grid-cols-5 gap-2 md:gap-3">
          {stages.map((stage, index) => {
            const isCompleteStage = stagesCompleted.includes(stage.id);
            const isActiveStage = isProcessing && index === activeStageIndex;

            return (
              <div key={`progress-${stage.id}`} className="min-w-0">
                <div
                  className={`h-2 border-2 ${
                    isCompleteStage
                      ? "bg-black border-black"
                      : isActiveStage
                      ? "bg-primary border-primary"
                      : "bg-neutral-200 border-neutral-300"
                  }`}
                />
                <p
                  className={`mt-1 text-[10px] md:text-xs font-bold uppercase truncate ${
                    isCompleteStage || isActiveStage ? "text-black" : "text-neutral-400"
                  }`}
                >
                  {stage.label}
                </p>
              </div>
            );
          })}
        </div>
        
        <AnimatePresence>
          {isFailed && (
            <motion.div 
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              className="mt-4 p-4 border-2 border-red-600 bg-red-50 text-red-900 flex items-center gap-3"
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              >
                <AlertTriangle className="w-5 h-5" />
              </motion.div>
              <span className="text-sm font-bold uppercase">Report generation failed. Please retry upload.</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        {/* Pipeline Display */}
        <div className="lg:col-span-7">
          <motion.div className="space-y-3 md:space-y-4">
            {stages.map((stage, index) => {
              const isCompleteStage = stagesCompleted.includes(stage.id);
              const isFailedStage = isFailed && index === failedStageIndex && !isCompleteStage;
              const isActiveStage = isProcessing && index === activeStageIndex && !isCompleteStage;

              return (
                <motion.div
                  key={stage.id}
                  layout
                  variants={itemVariants}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    backgroundColor: isCompleteStage
                      ? "rgb(250, 250, 250)"
                      : isFailedStage
                      ? "rgb(254, 242, 242)"
                      : isActiveStage
                      ? "rgb(248, 250, 252)"
                      : "rgb(245, 245, 245)",
                    borderColor: isCompleteStage
                      ? "#000000"
                      : isFailedStage
                      ? "#DC2626"
                      : isActiveStage
                      ? "#0038FF"
                      : "#e5e5e5",
                    borderWidth: isActiveStage ? "3px" : "2px",
                  }}
                  transition={{ type: "spring", stiffness: 120, damping: 16 }}
                  className="p-4 md:p-5 flex justify-between items-center relative overflow-hidden"
                >
                  {isActiveStage && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent"
                      initial={{ x: "-100%" }}
                      animate={{ x: "200%" }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    />
                  )}

                  <div className="flex items-center gap-3 md:gap-4 z-10">
                    <motion.div
                      animate={isActiveStage ? { rotate: 360 } : isCompleteStage ? { scale: [1, 1.2, 1] } : {}}
                      transition={isActiveStage ? { duration: 2, repeat: Infinity, ease: "linear" } : { duration: 0.4 }}
                      className="relative"
                    >
                      <stage.icon
                        className="w-6 h-6 md:w-7 md:h-7"
                        style={{
                          color: isCompleteStage || isActiveStage
                            ? "#0038FF"
                            : isFailedStage
                            ? "#DC2626"
                            : "#9ca3af"
                        }}
                      />
                      {isActiveStage && (
                        <motion.span
                          className="absolute -inset-1 border-2 border-primary rounded-full"
                          animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                          transition={{ duration: 1, repeat: Infinity }}
                        />
                      )}
                    </motion.div>
                    <div>
                      <h3 className={`font-bold text-sm md:text-lg uppercase tracking-wide ${
                        isActiveStage ? "text-primary" : isFailedStage ? "text-red-600" : ""
                      }`}>
                        {stage.label}
                      </h3>
                      <p className={`text-xs md:text-sm mt-0.5 ${
                        isCompleteStage ? "text-neutral-600" : isActiveStage ? "text-neutral-800" : "text-neutral-400"
                      }`}>
                        {stage.description}
                      </p>
                    </div>
                  </div>

                  <motion.span
                    className={`text-xs font-bold px-3 py-1.5 rounded-md uppercase tracking-wider z-10 ${
                      isCompleteStage
                        ? "bg-black text-white"
                        : isFailedStage
                        ? "bg-red-600 text-white"
                        : isActiveStage
                        ? "bg-primary/10 text-primary border border-primary"
                        : "bg-gray-100 text-gray-400"
                    }`}
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    key={`${stage.id}-${isCompleteStage}-${isActiveStage}`}
                  >
                    {isCompleteStage ? (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-1"
                      >
                        <CheckCircle className="w-3 h-3" />
                        DONE
                      </motion.span>
                    ) : isFailedStage ? "FAILED" : isActiveStage ? "RUNNING" : "PENDING"}
                  </motion.span>
                </motion.div>
              );
            })}
          </motion.div>
        </div>

        {/* Live Logs & Metrics */}
        <div className="lg:col-span-5 flex flex-col gap-4 md:gap-6">
          {/* Live Logs */}
          <motion.div 
            variants={itemVariants}
            className="bg-black text-white p-5 md:p-8 border-r-8 border-b-8 border-primary relative overflow-hidden"
          >
            <motion.div 
              className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent"
              animate={{ opacity: isProcessing ? 1 : 0.3 }}
              transition={{ duration: 1 }}
            />
            
            <div className="flex justify-between items-start mb-4 md:mb-6 relative z-10">
              <div>
                <motion.p 
                  className="text-[10px] text-primary mb-1 font-mono"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  ● SYSTEM_HEARTBEAT
                </motion.p>
                <h4 className="text-xl md:text-2xl font-black uppercase tracking-wider">Live Logs</h4>
              </div>
              <motion.div
                animate={isProcessing ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 1, repeat: isProcessing ? Infinity : 0 }}
              >
                <Terminal className="w-6 h-6 text-primary" />
              </motion.div>
            </div>
            
            <div ref={logsContainerRef} className="font-mono text-[10px] md:text-[11px] space-y-2 h-44 md:h-64 overflow-y-auto relative z-10">
              <AnimatePresence mode="popLayout">
                {logs.length > 0 ? (
                  logs.map((log, i) => (
                    <motion.p
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={log.includes("COMPLETE") || log.includes("SUCCESS") || log.includes("DONE") 
                        ? "text-primary font-semibold" 
                        : log.includes("ERROR") || log.includes("FAILED")
                        ? "text-red-400"
                        : "text-gray-400"}
                    >
                      <span className="text-primary/50">{String(i + 1).padStart(3, "0")}</span> {log}
                    </motion.p>
                  ))
                ) : (
                  <motion.p 
                    className="text-gray-500"
                    animate={{ opacity: [0.3, 0.7, 0.3] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    Waiting for processing to start...
                  </motion.p>
                )}
                {isProcessing && (
                  <motion.p 
                    className="text-primary flex items-center gap-2"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    <span className="inline-block w-2 h-2 bg-primary rounded-full animate-pulse" />
                    Processing in progress...
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Data Points Counter */}
          <motion.div 
            variants={itemVariants}
            className="bg-surface-container-high border-2 border-black p-5 md:p-6 relative overflow-hidden"
          >
            <motion.div 
              className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0"
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold text-on-surface uppercase tracking-widest">Data Points</span>
                <motion.div
                  animate={isProcessing ? { rotate: [0, 360] } : {}}
                  transition={isProcessing ? { duration: 3, repeat: Infinity, ease: "linear" } : {}}
                >
                  <Cpu className="w-4 h-4 text-primary" />
                </motion.div>
              </div>
              <motion.div 
                className="text-4xl md:text-5xl font-black tracking-tighter tabular-nums"
                key={dataPoints}
                initial={{ scale: 1.1, color: "#0038FF" }}
                animate={{ scale: 1, color: "#000" }}
                transition={{ duration: 0.3 }}
              >
                {dataPoints.toLocaleString()}
              </motion.div>
              {isProcessing && (
                <motion.p 
                  className="text-xs text-primary mt-2 font-medium"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  ● Analyzing frames & audio features
                </motion.p>
              )}
            </div>
          </motion.div>

          {/* Latency & Node Load */}
          <div className="grid grid-cols-2 gap-4">
            <motion.div 
              variants={itemVariants}
              className="border-2 border-black p-4 flex flex-col justify-between aspect-square relative overflow-hidden"
            >
              <motion.div 
                className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent"
                animate={{ opacity: latency > 0 ? 1 : 0.3 }}
              />
              <span className="text-[10px] font-bold uppercase relative z-10">Latency</span>
              <motion.div 
                className="text-2xl md:text-3xl font-black relative z-10"
                key={latency}
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
              >
                {latency > 0 ? `${latency}ms` : "—"}
              </motion.div>
            </motion.div>
            
            <motion.div 
              variants={itemVariants}
              className="border-2 border-black p-4 flex flex-col justify-between aspect-square bg-primary text-white relative overflow-hidden"
            >
              <motion.div 
                className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"
                animate={{ opacity: nodeLoad > 0 ? 1 : 0.3 }}
              />
              <div className="flex justify-between items-start relative z-10">
                <span className="text-[10px] font-bold uppercase">Node Load</span>
                {isProcessing && (
                  <motion.div
                    className="w-2 h-2 bg-white/50 rounded-full"
                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                )}
              </div>
              <motion.div 
                className="text-2xl md:text-3xl font-black relative z-10"
                key={nodeLoad}
                initial={{ scale: 1.1 }}
                animate={{ scale: 1 }}
              >
                {nodeLoad > 0 ? `${nodeLoad}%` : "—"}
              </motion.div>
              {nodeLoad > 0 && (
                <motion.div 
                  className="absolute bottom-0 left-0 h-1 bg-white/30"
                  initial={{ width: 0 }}
                  animate={{ width: `${nodeLoad}%` }}
                  transition={{ duration: 0.5 }}
                />
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function StatusPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[50vh]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="w-12 h-12 text-primary" />
        </motion.div>
      </div>
    }>
      <StatusContent />
    </Suspense>
  );
}
