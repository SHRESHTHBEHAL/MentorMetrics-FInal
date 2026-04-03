"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getSessions, Session } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Target,
  CheckCircle2,
  AlertTriangle,
  Clock3,
  Activity,
  CheckCircle,
  Cpu,
  Zap,
  MoreHorizontal,
  FileText,
} from "lucide-react";

const pipelineStages = [
  {
    id: "transcribing",
    label: "Transcribing",
    description: "Audio duration: 42:15. Multi-speaker identified.",
    icon: CheckCircle,
  },
  {
    id: "audio_analysis",
    label: "Audio Analysis",
    description: "Tonality, pitch variance, and pause frequency analyzed.",
    icon: Cpu,
  },
  {
    id: "visual_analysis",
    label: "Visual Analysis",
    description: "Micro-expressions and body posture mapping in progress.",
    icon: Zap,
  },
  {
    id: "scoring",
    label: "Scoring",
    description: "Comparing against 450+ mentorship benchmarks.",
    icon: MoreHorizontal,
  },
  {
    id: "report_generation",
    label: "Report Generation",
    description: "Synthesizing actionable feedback blocks.",
    icon: FileText,
  },
];

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    if (!user?.id) {
      setSessions([]);
      setLoading(false);
      return;
    }

    const fetchSessions = async () => {
      try {
        const data = await getSessions(user.id);
        if (Array.isArray(data)) {
          const sorted = [...data].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
          );
          setSessions(sorted);
        }
      } catch (error) {
        console.error("Failed to fetch sessions for analytics:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, [user?.id]);

  const hasData = sessions.length > 0;
  const completedSessions = sessions.filter((s) => s.status === "complete");
  const validScores = completedSessions.map((s) => s.mentor_score || 0).filter((s) => s > 0);
  const recentSessions = hasData ? [...sessions].slice(-8).reverse() : [];

  const avg = validScores.length > 0 ? validScores.reduce((a, b) => a + b, 0) / validScores.length : 0;
  const avgScore = avg.toFixed(1);
  const bestScore = validScores.length > 0 ? Math.max(...validScores).toFixed(1) : "0.0";

  const currentTrend =
    validScores.length >= 2
      ? validScores[validScores.length - 1] - validScores[validScores.length - 2]
      : 0;

  const completionRate =
    sessions.length > 0 ? ((completedSessions.length / sessions.length) * 100).toFixed(0) : "0";

  const processingCount = sessions.filter((s) => s.status === "processing").length;
  const failedCount = sessions.filter((s) => s.status === "failed").length;

  const variance =
    validScores.length > 1
      ? validScores.reduce((sum, score) => sum + Math.pow(score - avg, 2), 0) / validScores.length
      : 0;
  const stdDev = Math.sqrt(variance);
  const consistencyLabel = stdDev <= 0.6 ? "Stable" : stdDev <= 1.2 ? "Moderate" : "Volatile";

  const highCount = validScores.filter((s) => s >= 8).length;
  const midCount = validScores.filter((s) => s >= 6 && s < 8).length;
  const lowCount = validScores.filter((s) => s < 6).length;
  const scoreTotal = validScores.length || 1;

  const latestSession = sessions.length > 0 ? sessions[sessions.length - 1] : null;
  const latestCompletedStages = latestSession?.stages_completed || [];
  const activeStageIndex =
    latestSession && latestSession.status === "processing"
      ? latestCompletedStages.length
      : -1;

  if (!hasData && !loading) {
    return (
      <div className="p-4 md:p-8">
        <div className="mb-8 md:mb-12">
          <h1 className="text-3xl md:text-5xl font-black tracking-tighter uppercase mb-2">Analytics</h1>
          <p className="text-on-surface-variant font-medium">Track organizational progress, reliability, and score quality.</p>
        </div>
        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-neutral-300 bg-neutral-50">
          <BarChart3 className="w-16 h-16 text-neutral-300 mb-4" />
          <p className="text-xl font-black text-neutral-600 uppercase mb-2">No Analytics Data Yet</p>
          <p className="text-sm text-neutral-500 max-w-md">Upload and complete your first mentor session to see score trends, consistency metrics, and pipeline health analytics.</p>
          <Link href="/upload" className="mt-6 bg-primary text-white font-black px-6 py-3 border-2 border-black text-sm uppercase hover:bg-black transition-colors">
            Upload Your First Session
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8 md:mb-12">
        <h1 className="text-3xl md:text-5xl font-black tracking-tighter uppercase mb-2">Analytics</h1>
        <p className="text-on-surface-variant font-medium">Track organizational progress, reliability, and score quality.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6 mb-8 mt-8">
        <div className="bg-primary text-white p-6 border-4 border-black">
          <span className="text-xs font-bold uppercase tracking-widest block mb-4">Historical Average</span>
          <div className="flex items-end gap-3">
            <span className="text-5xl font-black">{avgScore}</span>
            <span className="text-lg font-bold mb-1 opacity-70">/ 10</span>
          </div>
        </div>

        <div className="bg-white p-6 border-2 border-black">
          <span className="text-xs font-bold uppercase tracking-widest block mb-4 text-neutral-500">Completion Rate</span>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-primary" />
            <div>
              <span className="text-4xl font-black">{completionRate}%</span>
              <span className="block text-xs font-bold uppercase tracking-widest text-neutral-500">sessions complete</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 border-2 border-black">
          <span className="text-xs font-bold uppercase tracking-widest block mb-4 text-neutral-500">Best Score</span>
          <div className="flex items-center gap-3">
            <Target className="w-8 h-8 text-primary" />
            <div>
              <span className="text-4xl font-black">{bestScore}</span>
              <span className="block text-xs font-bold uppercase tracking-widest text-neutral-500">top performance</span>
            </div>
          </div>
        </div>

        <div className="bg-neutral-100 p-6 border-2 border-black">
          <span className="text-xs font-bold uppercase tracking-widest block mb-4 text-neutral-500">Consistency</span>
          <div className="flex items-center gap-3">
            <Activity className="w-8 h-8 text-primary" />
            <div>
              <span className="text-3xl font-black">{consistencyLabel}</span>
              <span className="block text-xs font-bold uppercase tracking-widest text-neutral-500">sigma {stdDev.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
        <div className="bg-white border-2 border-black p-6">
          <h3 className="text-sm font-black uppercase tracking-widest mb-5">Pipeline Health</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm font-bold">
              <span className="uppercase text-neutral-600">Processing</span>
              <span className="flex items-center gap-2">
                <Clock3 className="w-4 h-4" /> {processingCount}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm font-bold">
              <span className="uppercase text-neutral-600">Failed</span>
              <span className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-4 h-4" /> {failedCount}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm font-bold">
              <span className="uppercase text-neutral-600">Latest Trend</span>
              <span className={`flex items-center gap-2 ${currentTrend >= 0 ? "text-green-700" : "text-red-700"}`}>
                {currentTrend >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {currentTrend > 0 ? "+" : ""}
                {currentTrend.toFixed(1)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white border-2 border-black p-6">
          <h3 className="text-sm font-black uppercase tracking-widest mb-5">Score Quality Mix</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-bold uppercase mb-1">
                <span>8.0+ Strong</span>
                <span>{highCount}</span>
              </div>
              <div className="h-4 border-2 border-black">
                <div className="h-full bg-primary" style={{ width: `${(highCount / scoreTotal) * 100}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold uppercase mb-1">
                <span>6.0 - 7.9 Mid</span>
                <span>{midCount}</span>
              </div>
              <div className="h-4 border-2 border-black">
                <div className="h-full bg-neutral-800" style={{ width: `${(midCount / scoreTotal) * 100}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold uppercase mb-1">
                <span>Below 6.0 Risk</span>
                <span>{lowCount}</span>
              </div>
              <div className="h-4 border-2 border-black">
                <div className="h-full bg-red-500" style={{ width: `${(lowCount / scoreTotal) * 100}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {latestSession && (
        <div className="bg-white border-2 border-black p-6 md:p-8 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <h2 className="text-xl font-black uppercase tracking-widest">Latest Session Pipeline</h2>
            <span
              className={`text-xs font-black uppercase px-3 py-1 border-2 border-black ${
                latestSession.status === "complete"
                  ? "bg-black text-white"
                  : latestSession.status === "failed"
                  ? "bg-red-600 text-white border-red-700"
                  : "bg-primary text-white"
              }`}
            >
              {latestSession.status}
            </span>
          </div>

          <div className="space-y-3 md:space-y-4">
            {pipelineStages.map((stage, index) => {
              const isCompleteStage = latestCompletedStages.includes(stage.id);
              const isActiveStage = index === activeStageIndex;
              const isPendingStage = !isCompleteStage && !isActiveStage;

              return (
                <div
                  key={stage.id}
                  className={`p-4 md:p-5 flex justify-between items-center border-2 ${
                    isCompleteStage
                      ? "bg-neutral-50 border-black"
                      : isActiveStage
                      ? "bg-blue-50 border-primary"
                      : "bg-neutral-50 border-neutral-300"
                  }`}
                >
                  <div className="flex items-center gap-3 md:gap-4">
                    <stage.icon
                      className={`w-6 h-6 md:w-7 md:h-7 ${
                        isCompleteStage || isActiveStage
                          ? "text-primary"
                          : "text-neutral-400"
                      }`}
                    />
                    <div>
                      <h3
                        className={`font-bold text-sm md:text-lg uppercase tracking-wide ${
                          isActiveStage ? "text-primary" : "text-black"
                        }`}
                      >
                        {stage.label}
                      </h3>
                      <p
                        className={`text-xs md:text-sm mt-0.5 ${
                          isPendingStage ? "text-neutral-400" : "text-neutral-700"
                        }`}
                      >
                        {stage.description}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-xs font-bold px-3 py-1.5 uppercase tracking-wider ${
                      isCompleteStage
                        ? "bg-black text-white"
                        : isActiveStage
                        ? "text-primary border-2 border-primary bg-primary/5"
                        : "text-neutral-400"
                    }`}
                  >
                    {isCompleteStage ? "COMPLETE" : isActiveStage ? "RUNNING" : "PENDING"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
        <div className="xl:col-span-2 bg-white border-2 border-black p-6 md:p-8">
          <div className="flex items-center gap-3 mb-8 pb-4 border-b-2 border-black">
            <BarChart3 className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-black uppercase tracking-widest">Score Progression (Last 10 Sessions)</h2>
          </div>

          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : !hasData ? (
            <div className="h-64 flex flex-col items-center justify-center text-center">
              <p className="text-neutral-500 font-bold uppercase text-sm mb-2">No data to display</p>
              <p className="text-xs text-neutral-400">Upload sessions to generate trend analytics.</p>
            </div>
          ) : (
            <div className="relative h-72 w-full flex items-end justify-around border-b-4 border-black px-2 md:px-8 pb-0 pt-8 mt-8">
              <div className="absolute top-0 left-0 w-full h-full pointer-events-none flex flex-col justify-between pt-8 pb-0">
                {[10, 8, 6, 4, 2].map((tick) => (
                  <div key={tick} className="w-full flex items-center relative">
                    <div className="absolute -left-6 md:-left-8 text-[10px] font-black">{tick}</div>
                    <div className="w-full h-px border-t-2 border-dashed border-neutral-300" />
                  </div>
                ))}
              </div>

              {sessions.slice(-10).map((session) => {
                const score = session.mentor_score || 0;
                const heightPercent = Math.max(score * 10, 5);
                const isExcellent = score >= 7;
                const isPoor = score < 5;

                return (
                  <div key={session.id} className="relative flex flex-col items-center justify-end h-full group w-12 md:w-20 z-10">
                    <div className="opacity-0 group-hover:opacity-100 absolute -top-12 bg-black text-white text-xs font-bold uppercase px-3 py-2 whitespace-nowrap transition-opacity pointer-events-none z-20">
                      {score.toFixed(1)} Pts
                    </div>

                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full border-4 border-black border-b-0 transition-all duration-500 ease-out origin-bottom hover:brightness-110 ${
                        isExcellent ? "bg-primary" : isPoor ? "bg-red-500" : "bg-neutral-800"
                      }`}
                    />

                    <div className="absolute -bottom-10 text-[10px] font-bold text-neutral-500 rotate-[-45deg] whitespace-nowrap">
                      {new Date(session.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-16 text-center text-xs font-bold uppercase text-neutral-400 tracking-widest">
            Chronological score trajectory (higher is better)
          </div>
        </div>

        <div className="bg-white border-2 border-black p-6 md:p-8">
          <h2 className="text-xl font-black uppercase tracking-widest mb-6">Recent Sessions</h2>

          {recentSessions.length === 0 ? (
            <p className="text-sm text-neutral-500">No sessions yet.</p>
          ) : (
            <div className="space-y-3 max-h-[430px] overflow-y-auto pr-1">
              {recentSessions.map((s) => {
                const score = s.mentor_score || 0;
                const delta = score - avg;

                return (
                  <div key={s.id} className="border-2 border-black p-3 bg-surface-container-low">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-black uppercase text-neutral-500">
                        {new Date(s.created_at).toLocaleDateString()}
                      </span>
                      <span
                        className={`text-[10px] font-black uppercase ${
                          s.status === "complete" ? "text-green-700" : s.status === "failed" ? "text-red-600" : "text-primary"
                        }`}
                      >
                        {s.status}
                      </span>
                    </div>

                    <p className="text-xs font-bold truncate mb-2">{s.filename}</p>

                    <div className="flex items-center justify-between">
                      <span className="text-lg font-black">{score.toFixed(1)}</span>
                      <span className={`text-xs font-bold ${delta >= 0 ? "text-green-700" : "text-red-600"}`}>
                        {delta >= 0 ? "+" : ""}
                        {delta.toFixed(1)} vs avg
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
