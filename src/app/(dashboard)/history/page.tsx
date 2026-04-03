"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getSessions, Session } from "@/lib/api";
import { FileVideo, ChevronRight, Loader2 } from "lucide-react";

export default function HistoryPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const data = await getSessions();
        setSessions(data);
      } catch (error) {
        console.error("Failed to fetch sessions:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, []);

  return (
    <section className="p-4 md:p-12 max-w-7xl w-full mx-auto">
      <div className="mb-8 md:mb-12">
        <h2 className="text-4xl md:text-7xl font-black tracking-tighter uppercase mb-2 font-headline">Archive</h2>
        <div className="h-1.5 w-16 md:w-24 bg-primary mb-4"></div>
        <p className="text-on-surface-variant font-medium max-w-xl text-sm md:text-base">
          Historical record of all analyzed mentor sessions. Data is indexed by performance metrics and date of delivery.
        </p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-0 mb-8 md:mb-12 border-2 border-black">
        <div className="p-4 md:p-6 bg-surface-container-highest border-b-2 md:border-b-0 md:border-r-2 border-black flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">Total Sessions</span>
          <span className="text-3xl md:text-4xl font-black">{loading ? "..." : sessions.length}</span>
        </div>
        <div className="p-4 md:p-6 bg-surface-container-highest border-b-2 md:border-b-0 md:border-r-2 border-black flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">Avg Mentor Score</span>
          <span className="text-3xl md:text-4xl font-black">
            {loading ? "..." : sessions.length > 0
              ? (sessions.filter(s => s.status !== "failed").reduce((sum, s) => sum + (s.mentor_score || 0), 0) / sessions.filter(s => s.status !== "failed").length).toFixed(1) || "—"
              : "—"}
          </span>
        </div>
        <div className="p-4 md:p-6 bg-surface-container-highest flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">Last Update</span>
          <span className="text-3xl md:text-4xl font-black">
            {loading ? "..." : sessions[0] ? new Date(sessions[0].created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
          </span>
        </div>
      </div>

      {/* List View */}
      <div className="border-2 border-black bg-white overflow-hidden">
        {/* Header */}
        <div className="hidden md:grid grid-cols-12 bg-black text-white p-4 text-[10px] uppercase tracking-widest">
          <div className="col-span-6">Session Identity</div>
          <div className="col-span-2 text-center">Date</div>
          <div className="col-span-2 text-center">Score</div>
          <div className="col-span-2 text-right">Action</div>
        </div>

        {loading ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-8 md:p-12 text-center">
            <FileVideo className="w-12 h-12 mx-auto mb-4 text-neutral-400" />
            <p className="text-lg font-bold text-neutral-600 mb-2">No sessions found</p>
            <p className="text-sm text-neutral-500">Upload a session to get started</p>
          </div>
        ) : (
          /* Real Data */
          <div className="divide-y-2 divide-black">
            {sessions.map((session) => (
              <div key={session.id} className="grid grid-cols-1 md:grid-cols-12 p-4 md:p-6 items-center hover:bg-surface-container transition-colors">
                <div className="col-span-1 md:col-span-6 mb-2 md:mb-0">
                  <p className="font-black text-lg md:text-xl uppercase leading-none mb-1">{session.filename}</p>
                  <p className="text-[10px] font-mono text-neutral-500 uppercase">Mentorship ID: {session.id.slice(0, 8)}</p>
                </div>
                <div className="col-span-1 md:col-span-2 text-center mb-2 md:mb-0">
                  <span className="font-bold text-sm">
                    {new Date(session.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>
                <div className="col-span-1 md:col-span-2 text-center mb-2 md:mb-0">
                  <span className={`text-2xl font-black ${session.status === "failed" ? "text-red-500" : "text-primary"}`}>
                    {session.status === "failed" ? "Failed" : session.mentor_score?.toFixed(1) || "—"}
                  </span>
                </div>
                <div className="col-span-1 md:col-span-2 text-right">
                  {session.status === "complete" ? (
                    <Link href={`/results?session_id=${session.id}`} className="text-[10px] font-black uppercase underline decoration-2 underline-offset-4 hover:text-primary transition-colors inline-flex items-center">
                      View Report <ChevronRight className="w-3 h-3 ml-1" />
                    </Link>
                  ) : (
                    <span className="text-[10px] text-neutral-400 uppercase">{session.status}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {sessions.length > 0 && (
      /* Pagination */
      <div className="mt-6 md:mt-8 flex justify-between items-center">
        <span className="text-[10px] font-black uppercase text-neutral-400 hidden md:block">Showing {sessions.length} Sessions</span>
        <div className="flex gap-1 md:gap-2">
          <button className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center border-2 border-black font-black bg-black text-white text-xs md:text-sm">1</button>
        </div>
      </div>
      )}
    </section>
  );
}
