"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { getSessions, Session } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Clock3,
  FileVideo,
  TrendingUp,
  Target,
  Activity,
} from "lucide-react";

export default function MentorDetailsPage() {
  const { user } = useAuth();
  const params = useParams<{ mentorName: string }>();
  const mentorName = decodeURIComponent(params.mentorName);

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
        const data = await getSessions(user.id, mentorName);
        if (Array.isArray(data)) {
          setSessions(data);
        }
      } catch (error) {
        console.error("Failed to fetch mentor sessions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, [mentorName, user?.id]);

  const completed = useMemo(
    () => sessions.filter((s) => s.status === "complete" && typeof s.mentor_score === "number"),
    [sessions],
  );

  const scores = useMemo(() => completed.map((s) => s.mentor_score as number), [completed]);

  const average = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const best = scores.length > 0 ? Math.max(...scores) : 0;
  const completionRate = sessions.length > 0 ? (completed.length / sessions.length) * 100 : 0;
  const failedCount = sessions.filter((s) => s.status === "failed").length;
  const processingCount = sessions.filter((s) => s.status === "processing").length;

  const trend =
    scores.length >= 2
      ? scores[scores.length - 1] - scores[scores.length - 2]
      : 0;

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8 md:mb-12">
        <Link href="/mentors" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest mb-4 hover:text-primary">
          <ArrowLeft className="w-4 h-4" /> Back to Mentors
        </Link>
        <h1 className="text-3xl md:text-5xl font-black tracking-tighter uppercase mb-2">{mentorName}</h1>
        <p className="text-on-surface-variant font-medium">Mentor-wise analytics and session outcomes.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6 mb-8">
        <div className="bg-primary text-white p-6 border-4 border-black">
          <span className="text-xs font-bold uppercase tracking-widest block mb-4">Average Score</span>
          <div className="text-5xl font-black">{average.toFixed(1)}</div>
        </div>

        <div className="bg-white p-6 border-2 border-black">
          <span className="text-xs font-bold uppercase tracking-widest block mb-4 text-neutral-500">Completion Rate</span>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-primary" />
            <div>
              <span className="text-4xl font-black">{completionRate.toFixed(0)}%</span>
              <span className="block text-xs font-bold uppercase tracking-widest text-neutral-500">completed</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 border-2 border-black">
          <span className="text-xs font-bold uppercase tracking-widest block mb-4 text-neutral-500">Best Score</span>
          <div className="flex items-center gap-3">
            <Target className="w-8 h-8 text-primary" />
            <span className="text-4xl font-black">{best.toFixed(1)}</span>
          </div>
        </div>

        <div className="bg-neutral-100 p-6 border-2 border-black">
          <span className="text-xs font-bold uppercase tracking-widest block mb-4 text-neutral-500">Trend</span>
          <div className="flex items-center gap-3">
            <TrendingUp className={`w-8 h-8 ${trend >= 0 ? "text-green-700" : "text-red-700"}`} />
            <span className={`text-4xl font-black ${trend >= 0 ? "text-green-700" : "text-red-700"}`}>
              {trend >= 0 ? "+" : ""}
              {trend.toFixed(1)}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
        <div className="xl:col-span-1 bg-white border-2 border-black p-6">
          <h3 className="text-sm font-black uppercase tracking-widest mb-5">Pipeline Health</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm font-bold">
              <span className="uppercase text-neutral-600">Processing</span>
              <span className="flex items-center gap-2"><Clock3 className="w-4 h-4" /> {processingCount}</span>
            </div>
            <div className="flex items-center justify-between text-sm font-bold">
              <span className="uppercase text-neutral-600">Failed</span>
              <span className="flex items-center gap-2 text-red-600"><AlertTriangle className="w-4 h-4" /> {failedCount}</span>
            </div>
            <div className="flex items-center justify-between text-sm font-bold">
              <span className="uppercase text-neutral-600">Total Sessions</span>
              <span className="flex items-center gap-2"><FileVideo className="w-4 h-4" /> {sessions.length}</span>
            </div>
          </div>
        </div>

        <div className="xl:col-span-2 bg-white border-2 border-black p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-black">
            <Activity className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-black uppercase tracking-widest">Score Progression</h2>
          </div>

          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : completed.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center">
              <p className="text-neutral-500 font-bold uppercase text-sm mb-2">No completed sessions</p>
              <p className="text-xs text-neutral-400">This mentor has no scored sessions yet.</p>
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

              {[...completed].reverse().slice(0, 10).reverse().map((session) => {
                const score = session.mentor_score || 0;
                const heightPercent = Math.max(score * 10, 5);
                const isExcellent = score >= 7;
                const isPoor = score < 5;

                return (
                  <div key={session.id} className="relative flex flex-col items-center justify-end h-full group w-12 md:w-20 z-10">
                    <div className="opacity-0 group-hover:opacity-100 absolute -top-12 bg-black text-white text-xs font-bold uppercase px-3 py-2 whitespace-nowrap transition-opacity pointer-events-none z-20">
                      {score.toFixed(1)}
                    </div>

                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full border-4 border-black border-b-0 transition-all duration-500 ease-out origin-bottom ${
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
        </div>
      </div>

      <div className="bg-white border-2 border-black">
        <div className="p-4 md:p-6 border-b-2 border-black flex justify-between items-center bg-surface-container">
          <h3 className="text-lg font-black uppercase tracking-widest">Mentor Sessions</h3>
        </div>

        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-neutral-500 font-bold uppercase text-sm">No sessions found for this mentor</p>
          </div>
        ) : (
          <div className="divide-y-2 divide-black">
            {sessions.map((session) => (
              <div key={session.id} className="p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-black uppercase text-base md:text-lg truncate" title={session.filename}>{session.filename}</p>
                  <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">
                    {new Date(session.created_at).toLocaleDateString()} · {session.id.slice(0, 8)}
                  </p>
                </div>

                <div className="flex items-center gap-6">
                  {session.status === "complete" ? (
                    <span className="text-2xl font-black text-primary">{session.mentor_score?.toFixed(1) || "0.0"}</span>
                  ) : session.status === "failed" ? (
                    <span className="text-xl font-black text-red-600">Failed</span>
                  ) : (
                    <span className="text-xs font-black uppercase text-neutral-500">{session.status}</span>
                  )}

                  {session.status === "complete" ? (
                    <Link
                      href={`/results?session_id=${session.id}`}
                      className="text-[10px] font-black uppercase underline decoration-2 underline-offset-4 hover:text-primary transition-colors"
                    >
                      View Report
                    </Link>
                  ) : (
                    <Link
                      href={`/status?session_id=${session.id}`}
                      className="text-[10px] font-black uppercase underline decoration-2 underline-offset-4 hover:text-primary transition-colors"
                    >
                      View Status
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
