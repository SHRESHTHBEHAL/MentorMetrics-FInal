"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { getResults, SessionResults } from "@/lib/api";
import { FileText, CheckCircle, TrendingUp, Loader2 } from "lucide-react";

function ResultsContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [data, setData] = useState<SessionResults | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) return;

    const fetchResults = async () => {
      try {
        const result = await getResults(sessionId);
        setData(result);
      } catch (error) {
        console.error("Failed to fetch results:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [sessionId]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );
  
  if (!data) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <p className="text-lg font-bold">No results found</p>
    </div>
  );

  const scores = data.scores || {
    engagement: 0,
    communication_clarity: 0,
    technical_correctness: 0,
    pacing_structure: 0,
    interactive_quality: 0,
    mentor_score: 0,
  };

  const parameters = [
    { key: "engagement", label: "Engagement", value: scores.engagement },
    { key: "communication_clarity", label: "Communication", value: scores.communication_clarity },
    { key: "technical_correctness", label: "Correctness", value: scores.technical_correctness },
    { key: "pacing_structure", label: "Pacing", value: scores.pacing_structure },
    { key: "interactive_quality", label: "Interaction", value: scores.interactive_quality },
  ];

  const formatTimestamp = (secondsRaw: number) => {
    const minutes = Math.floor(secondsRaw / 60);
    const seconds = secondsRaw % 60;
    const secondsFormatted = seconds.toFixed(2).padStart(5, "0");
    return `${minutes}:${secondsFormatted}`;
  };

  return (
    <div className="p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
      {/* Hero Metric Section */}
      <section className="lg:col-span-4 flex flex-col gap-6 md:gap-8">
        <div className="bg-primary text-white p-6 md:p-8 border-4 border-black relative overflow-hidden">
          <span className="text-[0.65rem] font-black uppercase tracking-[0.2em] mb-2 md:mb-4 block text-white/90">Overall Performance</span>
          <div className="flex items-baseline gap-2">
            <h2 className="text-6xl md:text-9xl font-black tracking-tighter">{scores.mentor_score.toFixed(1)}</h2>
            <span className="text-xl md:text-2xl font-bold opacity-50">/ 10</span>
          </div>
          <div className="mt-6 md:mt-8 pt-6 md:pt-8 border-t border-white/30 flex justify-between items-center">
            <span className="text-xs font-bold uppercase tracking-widest">Mastery Level</span>
            <span className="text-lg md:text-xl font-black italic">
              {scores.mentor_score >= 8 ? "EXPERT" : scores.mentor_score >= 6 ? "SKILLED" : "DEVELOPING"}
            </span>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-10 pointer-events-none">
            <FileText className="w-24 h-24 md:w-40 md:h-40" />
          </div>
        </div>

        {/* Parameter Breakdown */}
        <div className="bg-white border-2 border-black p-4 md:p-8">
          <h3 className="text-sm font-black uppercase tracking-widest mb-6 md:mb-10 border-b-2 border-black pb-2 md:pb-4">Parameter Breakdown</h3>
          <div className="flex flex-col gap-6 md:gap-8">
            {parameters.map((param) => (
              <div key={param.key}>
                <div className="flex justify-between items-end mb-1 md:mb-2">
                  <span className="text-xs font-bold uppercase">{param.label}</span>
                  <span className="text-sm md:text-base font-black">{param.value}%</span>
                </div>
                <div className="w-full h-6 md:h-8 bg-surface-container border-2 border-black">
                  <div className="h-full bg-primary border-r-2 border-black" style={{ width: `${param.value}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Coaching Report & Transcript */}
      <section className="lg:col-span-8 flex flex-col gap-6 md:gap-8">
        {/* Coaching Report */}
        <article className="bg-white border-2 border-black p-6 md:p-10 relative">
          <div className="absolute top-0 right-0 bg-black text-white px-3 md:px-4 py-1 md:py-2 text-[10px] font-black uppercase tracking-widest">
            Confidential Report
          </div>
          <header className="mb-8 md:mb-10 max-w-2xl">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-none mb-4 md:mb-6 font-headline">SESSION PERFORMANCE SUMMARY</h2>
            <p className="text-base md:text-lg leading-relaxed text-secondary italic">
              {data.report?.summary || "No summary available. Processing may still be in progress."}
            </p>
          </header>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12 border-t-2 border-black pt-6 md:pt-10">
            <div>
              <h4 className="text-sm font-black text-primary uppercase tracking-widest mb-4 md:mb-6 flex items-center">
                <CheckCircle className="w-4 h-4 md:w-5 md:h-5 mr-2" /> Strengths
              </h4>
              {data.report?.strengths && data.report.strengths.length > 0 ? (
                <ul className="text-sm flex flex-col gap-3 md:gap-4">
                  {data.report.strengths.map((item, i) => (
                    <li key={i} className="pl-4 md:pl-6 border-l-4 border-primary">{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-neutral-500">No strengths identified yet</p>
              )}
            </div>
            <div>
              <h4 className="text-sm font-black uppercase tracking-widest mb-4 md:mb-6 flex items-center">
                <TrendingUp className="w-4 h-4 md:w-5 md:h-5 mr-2" /> Improvements
              </h4>
              {data.report?.improvements && data.report.improvements.length > 0 ? (
                <ul className="text-sm flex flex-col gap-3 md:gap-4">
                  {data.report.improvements.map((item, i) => (
                    <li key={i} className="pl-4 md:pl-6 border-l-4 border-black">{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-neutral-500">No improvements identified yet</p>
              )}
            </div>
          </div>
          <div className="mt-8 md:mt-12 p-6 md:p-8 bg-surface-container border-2 border-black">
            <h4 className="text-sm font-black uppercase tracking-widest mb-4">Actionable Tips</h4>
            {data.report?.actionable_tips && data.report.actionable_tips.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                {data.report.actionable_tips.map((tip, i) => (
                  <div key={i} className="flex flex-col gap-1 md:gap-2">
                    <span className="text-xl md:text-2xl font-black text-primary">0{i + 1}.</span>
                    <p className="text-xs md:text-sm font-semibold uppercase leading-tight">{tip}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-500">No actionable tips available yet</p>
            )}
          </div>
        </article>

        {/* Transcript Viewer */}
        <div className="bg-white border-2 border-black flex flex-col max-h-[400px] md:max-h-[500px]">
          <div className="p-4 md:p-6 border-b-2 border-black flex justify-between items-center">
            <h3 className="text-sm font-black uppercase tracking-widest">Transcript Analysis</h3>
          </div>
          <div className="flex-grow overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-8 bg-surface">
            {(data.transcript?.segments || []).length === 0 ? (
              <div className="p-4 md:p-8 text-center">
                <FileText className="w-8 h-8 mx-auto mb-4 text-neutral-400" />
                <p className="text-sm text-neutral-500">No transcript available yet</p>
              </div>
            ) : (
              data.transcript?.segments.map((seg, i) => (
                <div key={i} className="flex gap-3 md:gap-4">
                  <span className="text-[10px] font-bold text-primary w-10 md:w-12 pt-1">
                    {formatTimestamp(seg.start)}
                  </span>
                  <div className="flex-grow">
                    <p className="text-sm leading-relaxed border-l-2 border-black pl-2 md:pl-4">{seg.text}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    }>
      <ResultsContent />
    </Suspense>
  );
}
