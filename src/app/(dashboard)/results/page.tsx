"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { chatWithCoach, ChatMessage, getResults, SessionResults } from "@/lib/api";
import {
  FileText,
  CheckCircle,
  TrendingUp,
  Loader2,
  PlayCircle,
  ChevronRight,
  Flag,
  Download,
  MessageSquare,
  Sparkles,
  Send,
  X,
} from "lucide-react";

type Milestone = {
  timestamp: number;
  label: string;
  commentary: string;
};

type Segment = {
  start: number;
  end: number;
  speaker: string;
  text: string;
};

type SegmentQuality = {
  label: "High" | "Medium" | "Low";
  borderClass: string;
  bgClass: string;
  dotClass: string;
  timelineColor: string;
};

function formatBoldText(text: string) {
  if (!text) return text;
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-black text-black">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

function VideoTimeline({
  milestones,
  segments,
  segmentQuality,
  activeTime,
  duration,
  onSeek,
}: {
  milestones: Milestone[];
  segments: Segment[];
  segmentQuality: SegmentQuality[];
  activeTime: number;
  duration: number;
  onSeek: (time: number) => void;
}) {
  const progressPercent = duration > 0 ? (activeTime / duration) * 100 : 0;

  return (
    <div className="relative w-full h-12 md:h-16 mt-4">
      <div className="absolute inset-0 bg-neutral-100 border-2 border-black overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-primary/10 border-r-2 border-primary transition-all duration-200"
          style={{ width: `${progressPercent}%` }}
        />

        <div className="absolute inset-0 pointer-events-none">
          {duration > 0 && segments.length > 0 ? (
            segments.map((segment, i) => {
              const quality = segmentQuality[i];
              const nextStart = i < segments.length - 1 ? segments[i + 1].start : duration;
              const fallbackEnd = segment.end > segment.start ? segment.end : nextStart;
              const end = Math.min(duration, Math.max(fallbackEnd, segment.start + 0.5));
              const left = (segment.start / duration) * 100;
              const width = Math.max(((end - segment.start) / duration) * 100, 0.8);

              return (
                <div
                  key={`heat-${i}-${segment.start}`}
                  className="absolute inset-y-0 opacity-30"
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                    backgroundColor: quality?.timelineColor || "#f59e0b",
                  }}
                />
              );
            })
          ) : (
            <div className="absolute inset-0 opacity-15 bg-neutral-300" />
          )}
        </div>
      </div>

      {duration > 0 &&
        milestones.map((milestone, i) => {
          const left = (milestone.timestamp / duration) * 100;
          return (
            <button
              key={`${milestone.label}-${milestone.timestamp}-${i}`}
              onClick={() => onSeek(milestone.timestamp)}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 hover:scale-125 transition-transform"
              style={{ left: `${left}%` }}
              title={`${milestone.label}: ${milestone.commentary}`}
              type="button"
            >
              <div className="w-4 h-4 bg-black border-2 border-white rotate-45 flex items-center justify-center shadow-lg">
                <div className="w-1.5 h-1.5 bg-primary rounded-full" />
              </div>
            </button>
          );
        })}

      <div
        className="absolute inset-y-0 w-0.5 bg-black z-20 pointer-events-none shadow-[0_0_10px_rgba(0,0,0,0.5)]"
        style={{ left: `${progressPercent}%` }}
      />

      <button
        className="absolute inset-0 z-0 cursor-pointer"
        onClick={(e) => {
          if (duration <= 0) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          onSeek((x / rect.width) * duration);
        }}
        type="button"
        aria-label="Seek video timeline"
      />
    </div>
  );
}

function ResultsContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [data, setData] = useState<SessionResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const transcriptContainerRef = useRef<HTMLDivElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const segmentRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const typingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!sessionId) {
      setLoading(false);
      setData(null);
      return;
    }

    const fetchResults = async () => {
      setLoading(true);
      try {
        const result = await getResults(sessionId);
        if (!cancelled) {
          setData(result);
        }
      } catch (error) {
        console.error("Failed to fetch results:", error);
        if (!cancelled) {
          setData(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchResults();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      setCurrentTime(0);
      setDuration(0);
      return;
    }

    const syncVideoState = () => {
      setCurrentTime(video.currentTime || 0);
      setDuration(Number.isFinite(video.duration) ? Math.max(video.duration, 0) : 0);
    };

    syncVideoState();
    video.addEventListener("loadedmetadata", syncVideoState);
    video.addEventListener("durationchange", syncVideoState);
    video.addEventListener("timeupdate", syncVideoState);

    return () => {
      video.removeEventListener("loadedmetadata", syncVideoState);
      video.removeEventListener("durationchange", syncVideoState);
      video.removeEventListener("timeupdate", syncVideoState);
    };
  }, [data?.file_url]);

  const scores = data?.scores || {
    engagement: 0,
    communication_clarity: 0,
    technical_correctness: 0,
    pacing_structure: 0,
    interactive_quality: 0,
    mentor_score: 0,
  };

  const segments: Segment[] = useMemo(() => data?.transcript?.segments || [], [data?.transcript?.segments]);
  const milestones: Milestone[] = data?.report?.milestones || [];

  const normalizePercentLike = (value: number) => {
    if (!Number.isFinite(value)) return 0;
    if (value <= 10) return Math.max(0, Math.min(100, value * 10));
    return Math.max(0, Math.min(100, value));
  };

  const engagementPct = normalizePercentLike(scores.engagement);
  const clarityPct = normalizePercentLike(scores.communication_clarity);
  const pacingPct = normalizePercentLike(scores.pacing_structure);
  const interactivePct = normalizePercentLike(scores.interactive_quality);
  const technicalPct = normalizePercentLike(scores.technical_correctness);

  const overallDeliveryScore = Math.max(
    0,
    Math.min(
      100,
      engagementPct * 0.35 +
        clarityPct * 0.3 +
        pacingPct * 0.15 +
        interactivePct * 0.15 +
        technicalPct * 0.05
    )
  );

  const segmentQuality: SegmentQuality[] = segments.map((segment, idx, allSegments) => {
    const text = segment.text.toLowerCase();
    const words = segment.text.trim().split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const fillerCount = (text.match(/\b(um+|uh+|like|you know|sort of|kind of)\b/g) || []).length;
    const hasQuestion = segment.text.includes("?");
    const hasExclamation = segment.text.includes("!");

    const previousEnd = idx > 0 ? allSegments[idx - 1].end : 0;
    const pauseFromPrevious = Math.max(0, segment.start - previousEnd);

    let segmentScore = overallDeliveryScore;

    if (wordCount >= 8 && wordCount <= 26) {
      segmentScore += 6;
    } else if (wordCount < 4) {
      segmentScore -= 12;
    } else if (wordCount > 34) {
      segmentScore -= 8;
    }

    if (hasQuestion) segmentScore += 2;
    if (hasExclamation) segmentScore += 1;
    if (pauseFromPrevious >= 3.5) segmentScore -= 6;

    segmentScore -= Math.min(14, fillerCount * 4);
    segmentScore -= Math.max(0, 55 - engagementPct) * 0.2;
    segmentScore += ((idx % 5) - 2) * 1.2;
    segmentScore = Math.max(0, Math.min(100, segmentScore));

    const allowHigh = overallDeliveryScore >= 64;
    const highThreshold = Math.max(74, overallDeliveryScore + 6);
    const lowThreshold = overallDeliveryScore < 50 ? 58 : 52;

    if (allowHigh && segmentScore >= highThreshold) {
      return {
        label: "High",
        borderClass: "border-green-600",
        bgClass: "bg-green-50 hover:bg-green-100",
        dotClass: "bg-green-600",
        timelineColor: "#16a34a",
      };
    }

    if (segmentScore <= lowThreshold) {
      return {
        label: "Low",
        borderClass: "border-red-600",
        bgClass: "bg-red-50 hover:bg-red-100",
        dotClass: "bg-red-600",
        timelineColor: "#dc2626",
      };
    }

    return {
      label: "Medium",
      borderClass: "border-amber-500",
      bgClass: "bg-amber-50 hover:bg-amber-100",
      dotClass: "bg-amber-500",
      timelineColor: "#f59e0b",
    };
  });

  useEffect(() => {
    if (segments.length === 0) {
      setActiveSegmentIndex(null);
      return;
    }

    const index = segments.findIndex((segment, i) => {
      const nextStart = i < segments.length - 1 ? segments[i + 1].start : Number.POSITIVE_INFINITY;
      return currentTime >= segment.start && currentTime < nextStart;
    });

    const next = index >= 0 ? index : null;
    setActiveSegmentIndex((prev) => (prev === next ? prev : next));
  }, [currentTime, segments]);

  useEffect(() => {
    if (activeSegmentIndex === null) return;
    const node = segmentRefs.current[activeSegmentIndex];
    if (!node || !transcriptContainerRef.current) return;
    
    // Scroll container instead of using scrollIntoView which jumps the main window
    transcriptContainerRef.current.scrollTo({
      top: node.offsetTop - transcriptContainerRef.current.offsetTop - 20,
      behavior: "smooth"
    });
  }, [activeSegmentIndex]);

  useEffect(() => {
    const container = document.getElementById("chat-container");
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    }
  }, [chatMessages, chatLoading]);

  useEffect(() => {
    return () => {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
      }
    };
  }, []);

  const formatTimestamp = (secondsRaw: number) => {
    const minutes = Math.floor(secondsRaw / 60);
    const seconds = secondsRaw % 60;
    const secondsFormatted = seconds.toFixed(2).padStart(5, "0");
    return `${minutes}:${secondsFormatted}`;
  };

  const formatClock = (secondsRaw: number) => {
    const total = Math.max(0, Math.floor(secondsRaw));
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const jumpToMoment = (time: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, time);
    video.play().catch(() => {});
  };

  const jumpToSegment = (time: number) => {
    jumpToMoment(time);
  };

  const streamAssistantReply = (reply: string) => {
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }

    setChatMessages((prev) => [...prev, { role: "assistant", content: "" }]);
    let index = 0;

    typingIntervalRef.current = setInterval(() => {
      index += 3;
      const next = reply.slice(0, index);
      setChatMessages((prev) => {
        if (prev.length === 0) return prev;
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: next };
        return updated;
      });

      if (index >= reply.length) {
        if (typingIntervalRef.current) {
          clearInterval(typingIntervalRef.current);
          typingIntervalRef.current = null;
        }
      }
    }, 14);
  };

  const handleSendChat = async (message?: string) => {
    const text = (message ?? chatInput).trim();
    if (!text || !sessionId || chatLoading) return;

    const userMessage: ChatMessage = { role: "user", content: text };
    const historyForRequest = [...chatMessages, userMessage];

    setChatMessages(historyForRequest);
    setChatInput("");
    setChatLoading(true);
    setChatError(null);

    try {
      const reply = await chatWithCoach(sessionId, text, chatMessages);
      streamAssistantReply(reply);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setChatError(msg);
    } finally {
      setChatLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    try {
      const { toJpeg } = await import("html-to-image");
      
      const jsPDFModule = await import("jspdf");
      const jsPDF = jsPDFModule.default || jsPDFModule.jsPDF;

      const element = document.getElementById("report-container");
      if (!element) {
        throw new Error("Report container not found.");
      }

      const imgData = await toJpeg(element, {
        quality: 1.0,
        backgroundColor: "#F9FAFB",
        pixelRatio: 2,
        filter: (node: Element) => {
          if (node?.getAttribute && node.getAttribute("data-html2canvas-ignore") === "true") {
            return false;
          }
          return true;
        }
      });

      const width = element.offsetWidth;
      const height = element.offsetHeight;

      const pdf = new jsPDF({
        orientation: width > height ? "landscape" : "portrait",
        unit: "pt",
        format: [width, height],
      });

      pdf.addImage(imgData, "JPEG", 0, 0, width, height);
      pdf.save(`MentorMetrics_Report_${data?.filename || sessionId || "session"}.pdf`);
    } catch (err: unknown) {
      console.error("Failed to generate PDF", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      alert(`Failed to generate PDF: ${errorMessage}`);
    } finally {
      setIsDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-lg font-bold">No results found</p>
      </div>
    );
  }

  const parameters = [
    { key: "engagement", label: "Engagement", value: scores.engagement },
    { key: "communication_clarity", label: "Communication", value: scores.communication_clarity },
    { key: "technical_correctness", label: "Correctness", value: scores.technical_correctness },
    { key: "pacing_structure", label: "Pacing", value: scores.pacing_structure },
    { key: "interactive_quality", label: "Interaction", value: scores.interactive_quality },
  ];

  return (
    <div id="report-container" className="p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 bg-neutral-50">
      <section className="lg:col-span-4 flex flex-col gap-6 md:gap-8">
        <div className="bg-primary text-white p-6 md:p-8 border-4 border-black relative overflow-hidden">
          <span className="text-[0.65rem] font-black uppercase tracking-[0.2em] mb-2 md:mb-4 block text-white/90">
            Overall Performance
          </span>
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
          <div className="mt-6 border-t border-white/30 pt-6" data-html2canvas-ignore="true">
            <button
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="group flex items-center justify-center gap-2 bg-white text-black font-black uppercase tracking-widest text-xs py-3 px-4 w-full border-2 border-transparent hover:bg-black hover:text-white hover:border-white transition-all disabled:opacity-50"
              type="button"
            >
              <Download className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
              {isDownloading ? "GENERATING PDF..." : "DOWNLOAD PDF REPORT"}
            </button>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-10 pointer-events-none">
            <FileText className="w-24 h-24 md:w-40 md:h-40" />
          </div>
        </div>

        <div className="bg-white border-2 border-black p-4 md:p-8">
          <h3 className="text-sm font-black uppercase tracking-widest mb-6 md:mb-10 border-b-2 border-black pb-2 md:pb-4">
            Parameter Breakdown
          </h3>
          <div className="flex flex-col gap-6 md:gap-8">
            {parameters.map((param) => (
              <div key={param.key}>
                <div className="flex justify-between items-end mb-1 md:mb-2">
                  <span className="text-xs font-bold uppercase">{param.label}</span>
                  <span className="text-sm md:text-base font-black">{param.value}%</span>
                </div>
                <div className="w-full h-6 md:h-8 bg-surface-container border-2 border-black">
                  <div className="h-full bg-primary border-r-2 border-black" style={{ width: `${param.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="lg:col-span-8 flex flex-col gap-6 md:gap-8">
        <article className="bg-white border-2 border-black p-6 md:p-10 relative">
          <div className="absolute top-0 right-0 bg-black text-white px-3 md:px-4 py-1 md:py-2 text-[10px] font-black uppercase tracking-widest">
            Confidential Report
          </div>
          <header className="mb-8 md:mb-10 max-w-2xl">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-none mb-4 md:mb-6 font-headline">
              SESSION PERFORMANCE SUMMARY
            </h2>
            <p className="text-base md:text-lg leading-relaxed text-secondary italic">
              {data.report?.summary || "No summary available. Processing may still be in progress."}
            </p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12 border-t-2 border-black pt-6 md:pt-10">
            <div>
              <h4 className="text-sm font-black text-primary uppercase tracking-widest mb-4 md:mb-6 flex items-center">
                <CheckCircle className="w-4 h-4 md:w-5 md:h-5 mr-2" /> Personalized Strengths
              </h4>
              {data.report?.strengths && data.report.strengths.length > 0 ? (
                <ul className="text-sm flex flex-col gap-3 md:gap-4">
                  {data.report.strengths.map((item, i) => (
                    <li key={i} className="pl-4 md:pl-6 border-l-4 border-primary">
                      {formatBoldText(item)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-neutral-500">No strengths identified yet</p>
              )}
            </div>
            <div>
              <h4 className="text-sm font-black uppercase tracking-widest mb-4 md:mb-6 flex items-center">
                <TrendingUp className="w-4 h-4 md:w-5 md:h-5 mr-2" /> Personalized Weaknesses
              </h4>
              {data.report?.improvements && data.report.improvements.length > 0 ? (
                <ul className="text-sm flex flex-col gap-3 md:gap-4">
                  {data.report.improvements.map((item, i) => (
                    <li key={i} className="pl-4 md:pl-6 border-l-4 border-black">
                      {formatBoldText(item)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-neutral-500">No improvements identified yet</p>
              )}
            </div>
          </div>

          <div className="mt-8 md:mt-12 p-6 md:p-8 bg-surface-container border-2 border-black">
            <h4 className="text-sm font-black uppercase tracking-widest mb-4">Actionable Tips</h4>
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-4">Personalized Coaching Tips</p>
            {data.report?.actionable_tips && data.report.actionable_tips.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                {data.report.actionable_tips.map((tip, i) => (
                  <div key={i} className="flex flex-col gap-1 md:gap-2">
                    <span className="text-xl md:text-2xl font-black text-primary">0{i + 1}.</span>
                    <p className="text-xs md:text-sm font-semibold uppercase leading-tight">{formatBoldText(tip)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-500">No actionable tips available yet</p>
            )}
          </div>
        </article>

        <div className="bg-white border-2 border-black p-4 md:p-6" data-html2canvas-ignore="true">
          <h3 className="text-sm font-black uppercase tracking-widest mb-4 md:mb-6">Session Video</h3>
          {data.file_url ? (
            <video
              ref={videoRef}
              src={data.file_url}
              controls
              preload="metadata"
              className="w-full border-2 border-black bg-black"
            />
          ) : (
            <div className="border-2 border-black p-8 text-center bg-surface">
              <PlayCircle className="w-8 h-8 mx-auto mb-4 text-neutral-400" />
              <p className="text-sm text-neutral-500">Video unavailable for this session.</p>
            </div>
          )}

          {data.file_url && (
            <div className="mt-4">
              <div className="flex justify-between items-end mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                  Video Timeline & Milestone Insights
                </span>
                <span className="text-[10px] font-mono font-bold bg-black text-white px-2 py-0.5">
                  {formatClock(currentTime)} / {formatClock(duration)}
                </span>
              </div>
              <VideoTimeline
                milestones={milestones}
                segments={segments}
                segmentQuality={segmentQuality}
                activeTime={currentTime}
                duration={duration}
                onSeek={jumpToMoment}
              />
              <p className="text-[8px] uppercase font-bold text-neutral-400 mt-2">
                Tip: Click markers for AI commentary or click the bar to seek.
              </p>
            </div>
          )}
        </div>

        <div className="bg-white border-2 border-black p-4 md:p-6">
          <header className="flex items-center justify-between mb-6 pb-4 border-b-2 border-black">
            <h3 className="text-sm font-black uppercase tracking-widest">Session Milestones</h3>
            <span className="text-[10px] font-bold bg-neutral-100 px-2 py-1 uppercase">{milestones.length} Moments</span>
          </header>

          <div className="space-y-4">
            {milestones.length > 0 ? (
              milestones.map((milestone, i) => (
                <button
                  key={`${milestone.label}-${milestone.timestamp}-${i}`}
                  onClick={() => jumpToMoment(milestone.timestamp)}
                  className="w-full group text-left p-4 border-2 border-black hover:bg-neutral-50 transition-all flex items-start gap-4"
                  type="button"
                >
                  <div className="w-14 h-10 bg-black text-white flex items-center justify-center font-black text-xs">
                    {formatClock(milestone.timestamp)}
                  </div>
                  <div className="flex-grow pt-1">
                    <h4 className="text-xs font-black uppercase tracking-wider text-primary flex items-center justify-between mb-1">
                      {milestone.label}
                      <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                    </h4>
                    <p className="text-sm italic text-secondary leading-relaxed font-medium">&quot;{milestone.commentary}&quot;</p>
                  </div>
                </button>
              ))
            ) : (
              <div className="py-6 text-center bg-neutral-50 border-2 border-dashed border-neutral-300">
                <Flag className="w-6 h-6 text-neutral-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-neutral-400 uppercase">Processing AI Milestones...</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border-2 border-black flex flex-col max-h-[500px] md:max-h-[650px]" data-html2canvas-ignore="true">
          <div className="p-4 md:p-6 border-b-2 border-black flex justify-between items-center">
            <h3 className="text-sm font-black uppercase tracking-widest">Interactive Transcript</h3>
            <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-wider">
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 bg-green-600 inline-block" /> High
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 bg-amber-500 inline-block" /> Medium
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 bg-red-600 inline-block" /> Low
              </span>
            </div>
          </div>

          <div ref={transcriptContainerRef} className="flex-grow overflow-y-auto p-4 md:p-6 space-y-3 md:space-y-4 bg-surface">
            {segments.length === 0 ? (
              <div className="p-4 md:p-8 text-center">
                <FileText className="w-8 h-8 mx-auto mb-4 text-neutral-400" />
                <p className="text-sm text-neutral-500">No transcript available yet</p>
              </div>
            ) : (
              segments.map((segment, i) => {
                const quality = segmentQuality[i];
                const isActive = activeSegmentIndex === i;
                return (
                  <button
                    key={`segment-${i}-${segment.start}`}
                    ref={(el) => {
                      segmentRefs.current[i] = el;
                    }}
                    onClick={() => jumpToSegment(segment.start)}
                    className={`w-full text-left p-3 md:p-4 transition-all border-l-4 ${quality.borderClass} ${quality.bgClass} ${
                      isActive ? "ring-2 ring-black" : ""
                    }`}
                    title="Click to jump video to this timestamp"
                    type="button"
                  >
                    <div className="flex items-start gap-3 md:gap-4">
                      <span className="text-[10px] font-bold text-primary w-12 md:w-14 pt-1 shrink-0">
                        {formatTimestamp(segment.start)}
                      </span>
                      <div className="flex-grow">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`w-2 h-2 inline-block ${quality.dotClass}`} />
                          <span className="text-[10px] font-black uppercase text-neutral-600">
                            {quality.label} Clarity/Engagement
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed">{segment.text}</p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

      </section>

      <section className="lg:col-span-12 bg-white border-2 border-black" data-html2canvas-ignore="true">
          <div className="p-4 md:p-6 border-b-2 border-black bg-black text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-primary" />
              <h3 className="text-sm font-black uppercase tracking-widest">Chat with Your AI Coach</h3>
            </div>
          </div>

          {chatMessages.length === 0 && (
            <div className="p-4 md:p-6 border-b-2 border-black bg-neutral-50">
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-3">Try asking</p>
              <div className="flex flex-wrap gap-2">
                {[
                  "What was my biggest weakness in this session?",
                  "Give me a 2-minute practice drill for my weakest area",
                  "How could I have explained the concept better?",
                  "What should I focus on in my next session?",
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSendChat(q)}
                    disabled={chatLoading}
                    className="text-xs font-bold border-2 border-black px-3 py-2 hover:bg-primary hover:text-white hover:border-primary transition-colors disabled:opacity-40"
                    type="button"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div id="chat-container" className="p-4 md:p-6 space-y-4 h-[520px] overflow-y-auto bg-surface">
            {chatMessages.length === 0 && !chatLoading && (
              <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
                <MessageSquare className="w-10 h-10 text-neutral-300" />
                <p className="text-sm font-bold text-neutral-400 uppercase tracking-wide">Ask anything about your session</p>
                <p className="text-xs text-neutral-400 max-w-sm">
                  Your AI coach uses your transcript, score breakdown, and audio metrics to answer in a human, practical way.
                </p>
              </div>
            )}

            {chatMessages.map((msg, i) => (
              <div key={`${msg.role}-${i}`} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] p-4 text-sm leading-relaxed border-2 border-black ${
                    msg.role === "user" ? "bg-primary text-white" : "bg-white text-black"
                  }`}
                >
                  {msg.role === "assistant" && (
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-3 h-3 text-primary" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-primary">AI Coach</span>
                    </div>
                  )}
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
              </div>
            ))}

            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-white border-2 border-black p-4 flex items-center gap-3">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-xs font-bold uppercase text-neutral-500 tracking-widest">Coach is typing...</span>
                </div>
              </div>
            )}

            {chatError && (
              <div className="flex items-center gap-2 bg-red-50 border-2 border-red-500 p-3">
                <X className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-xs font-bold text-red-600">{chatError}</p>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          <div className="p-4 md:p-6 border-t-2 border-black flex gap-3">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendChat();
                }
              }}
              placeholder="Ask your AI coach anything about this session..."
              disabled={chatLoading}
              className="flex-grow px-4 py-3 border-2 border-black focus:outline-none focus:border-primary font-medium disabled:opacity-50 disabled:bg-neutral-100"
            />
            <button
              onClick={() => handleSendChat()}
              disabled={!chatInput.trim() || chatLoading}
              className="bg-primary text-white px-5 py-3 border-2 border-black font-black uppercase text-sm hover:bg-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              type="button"
            >
              <Send className="w-4 h-4" />
              <span className="hidden md:inline">Send</span>
            </button>
          </div>
      </section>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
        </div>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}
