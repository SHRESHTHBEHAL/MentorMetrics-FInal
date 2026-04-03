"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { getSessionStatus } from "@/lib/api";
import { CheckCircle, RefreshCw, Hourglass, FileText, Terminal, Loader2, AlertTriangle } from "lucide-react";

const stages = [
  { id: "transcribing", label: "Transcribing", icon: CheckCircle },
  { id: "audio_analysis", label: "Audio analysis", icon: CheckCircle },
  { id: "visual_analysis", label: "Visual analysis", icon: RefreshCw },
  { id: "scoring", label: "Scoring", icon: Hourglass },
  { id: "report_generation", label: "Report generation", icon: FileText },
];

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

  useEffect(() => {
    if (!sessionId) return;

    const fetchStatus = async () => {
      try {
        const data = await getSessionStatus(sessionId);
        setStatus(data.status);
        setStagesCompleted(data.stages_completed || []);

        if (data.status === "failed") {
          setLogs((data.logs && data.logs.length > 0 ? data.logs : []).concat([
            "[ERROR] Pipeline failed during AI report generation.",
            "[ACTION] Retry upload or check backend Gemini model/quota.",
          ]));
        }
        
        // Update metrics from real data
        if (data.data_points_scanned) {
          setDataPoints(data.data_points_scanned);
        }
        if (data.latency_ms) {
          setLatency(data.latency_ms);
        }
        if (data.node_load) {
          setNodeLoad(data.node_load);
        }
        
        // Update logs from real data if available
        if (data.logs && data.logs.length > 0) {
          setLogs(data.logs);
        }

        // Auto-redirect to results when complete
        if (data.status === "complete") {
          setTimeout(() => router.push(`/results?session_id=${sessionId}`), 1000);
        }
      } catch (error) {
        console.error("Failed to fetch status:", error);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [sessionId, router]);

  const progress = (stagesCompleted.length / stages.length) * 100;
  const failedStageIndex = status === "failed" ? Math.min(stagesCompleted.length, stages.length - 1) : -1;

  return (
    <div className="p-4 md:p-12 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="mb-8 md:mb-12">
        <h2 className="text-4xl md:text-8xl font-black text-primary tracking-tighter leading-none mb-4 italic">
          {status === "failed" ? "PROCESSING FAILED" : "ANALYZING SESSION..."}
        </h2>
        <div className="flex items-center gap-4">
          <div className="h-1 flex-1 bg-surface-container-highest overflow-hidden">
            <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }}></div>
          </div>
          <span className="font-mono text-lg md:text-xl font-bold">{progress.toFixed(1)}%</span>
        </div>
        {status === "failed" && (
          <div className="mt-4 p-4 border-2 border-black bg-red-100 text-red-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-xs md:text-sm font-bold uppercase">Report generation failed. Please retry with a new upload after backend restart.</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        {/* Pipeline Display */}
        <div className="lg:col-span-7">
          <div className="space-y-3 md:space-y-4">
            {stages.map((stage, index) => {
              const isComplete = stagesCompleted.includes(stage.id);
              const isFailed = status === "failed" && index === failedStageIndex && !isComplete;
              const isActive = status === "processing" && !isComplete && (index === 0 || stagesCompleted.includes(stages[index - 1].id));
              
              return (
                <div
                  key={stage.id}
                  className={`p-4 md:p-6 flex justify-between items-center border-2 transition-all ${
                    isComplete
                      ? "bg-surface-container-highest border-black"
                      : isFailed
                      ? "bg-red-100 border-4 border-red-600"
                      : isActive
                      ? "bg-surface border-4 border-primary"
                      : "bg-surface-container-low opacity-50"
                  }`}
                >
                  <div className="flex items-center gap-3 md:gap-4">
                    <stage.icon
                      className={`w-5 h-5 md:w-6 md:h-6 ${isActive ? "animate-spin text-primary" : ""}`}
                      style={{ color: isComplete || isActive ? "#0038FF" : isFailed ? "#DC2626" : "#5e5e5e" }}
                    />
                    <div>
                      <h3 className="font-bold text-sm md:text-lg uppercase">{stage.label}</h3>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 ${
                    isComplete ? "bg-black text-white" : isActive ? "text-primary border-2 border-primary" : "text-secondary"
                  }`}>
                    {isComplete ? "COMPLETE" : isFailed ? "FAILED" : isActive ? "RUNNING" : "PENDING"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Logs */}
        <div className="lg:col-span-5 flex flex-col gap-4 md:gap-8">
          <div className="bg-black text-white p-4 md:p-8 border-r-8 border-b-8 border-primary">
            <div className="flex justify-between items-start mb-4 md:mb-6">
              <div>
                <p className="text-[10px] text-gray-400 mb-1">SYSTEM_HEARTBEAT</p>
                <h4 className="text-xl md:text-2xl font-black uppercase">LIVE LOGS</h4>
              </div>
              <Terminal className="w-5 h-5 md:w-6 md:h-6 text-primary" />
            </div>
            <div className="font-mono text-[10px] md:text-[11px] space-y-1 md:space-y-2 h-40 md:h-64 overflow-y-auto">
              {logs.length > 0 ? (
                logs.map((log, i) => (
                  <p key={i} className={log.includes("COMPLETE") || log.includes("SUCCESS") ? "text-primary" : "text-gray-400"}>
                    {log}
                  </p>
                ))
              ) : (
                <p className="text-gray-400">Waiting for processing to start...</p>
              )}
              {status === "processing" && <p className="animate-pulse text-primary">Processing in progress...</p>}
              {status === "failed" && <p className="text-red-400">Pipeline failed during report generation.</p>}
            </div>
          </div>

          {/* Metric Block */}
          <div className="bg-surface-container-high border-2 border-black p-4 md:p-6">
            <div className="flex justify-between items-start mb-2 md:mb-4">
              <span className="text-xs font-bold text-on-surface">Data Points Scanned</span>
            </div>
            <div className="text-4xl md:text-5xl font-black tracking-tighter">{dataPoints.toLocaleString()}</div>
            {status === "processing" && <p className="text-xs text-secondary mt-2">REDUNDANCY CHECK: ACTIVE</p>}
          </div>

          {/* Latency & Node Load */}
          <div className="grid grid-cols-2 gap-4">
            <div className="border-2 border-black p-4 flex flex-col justify-between aspect-square">
              <span className="text-[10px] font-bold uppercase">Latency</span>
              <div className="text-2xl md:text-3xl font-black">{latency > 0 ? `${latency}ms` : "—"}</div>
            </div>
            <div className="border-2 border-black p-4 flex flex-col justify-between aspect-square bg-primary text-white">
              <span className="text-[10px] font-bold uppercase">Node Load</span>
              <div className="text-2xl md:text-3xl font-black">{nodeLoad > 0 ? `${nodeLoad}%` : "—"}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StatusPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    }>
      <StatusContent />
    </Suspense>
  );
}
