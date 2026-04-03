"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { getSessions, Session } from "@/lib/api";
import { FileVideo, ArrowUpRight, TrendingUp, Clock, CheckCircle } from "lucide-react";

export default function DashboardPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const data = await getSessions();
        if (Array.isArray(data)) {
          setSessions(data);
        }
      } catch (error) {
        console.error("Failed to fetch sessions:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, []);

  const recentSessions = Array.isArray(sessions) ? sessions.slice(0, 3) : [];

  return (
    <div className="p-4 md:p-8">
      {/* Welcome Header */}
      <div className="mb-8 md:mb-12">
        <h1 className="text-3xl md:text-5xl font-black tracking-tighter uppercase mb-2 font-headline">Dashboard</h1>
        <p className="text-on-surface-variant font-medium">Welcome back. Here's your coaching overview.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-12">
        <div className="bg-primary text-white p-6 md:p-8 border-4 border-black">
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-bold uppercase tracking-widest">Total Sessions</span>
            <FileVideo className="w-5 h-5 opacity-50" />
          </div>
          <div className="text-4xl md:text-6xl font-black">{Array.isArray(sessions) ? sessions.length : 0}</div>
        </div>
        <div className="bg-white border-2 border-black p-6 md:p-8">
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-bold uppercase tracking-widest">Avg Score</span>
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div className="text-4xl md:text-6xl font-black">
            {Array.isArray(sessions) && sessions.length > 0
              ? (sessions.reduce((sum, s) => sum + (s.mentor_score || 0), 0) / sessions.length).toFixed(1)
              : "0"}
          </div>
        </div>
        <div className="bg-white border-2 border-black p-6 md:p-8">
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-bold uppercase tracking-widest">Recent Activity</span>
            <Clock className="w-5 h-5 text-secondary" />
          </div>
          <div className="text-4xl md:text-6xl font-black">
            {sessions.length > 0
              ? (() => {
                  const lastSession = new Date(sessions[0].created_at);
                  const now = new Date();
                  const diffMs = now.getTime() - lastSession.getTime();
                  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                  if (diffHours < 1) return "Just now";
                  if (diffHours < 24) return `${diffHours}h ago`;
                  return `${Math.floor(diffHours / 24)}d ago`;
                })()
              : "—"}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-8 md:mb-12">
        <Link href="/upload" className="group">
          <div className="bg-primary text-white p-6 md:p-8 border-4 border-black hover:bg-black transition-colors">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl md:text-2xl font-black uppercase mb-2">New Session</h3>
                <p className="text-sm opacity-80">Upload and analyze a new teaching session</p>
              </div>
              <ArrowUpRight className="w-8 h-8 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </div>
          </div>
        </Link>
        <Link href="/history" className="group">
          <div className="bg-white border-2 border-black p-6 md:p-8 hover:bg-surface-container transition-colors">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl md:text-2xl font-black uppercase mb-2">View History</h3>
                <p className="text-sm text-secondary">Browse all your analyzed sessions</p>
              </div>
              <ArrowUpRight className="w-8 h-8 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Sessions */}
      <div className="bg-white border-2 border-black">
        <div className="p-4 md:p-6 border-b-2 border-black flex justify-between items-center">
          <h3 className="text-lg font-black uppercase tracking-widest">Recent Sessions</h3>
          <Link href="/history" className="text-xs font-bold uppercase text-primary hover:underline">
            View All
          </Link>
        </div>
        
        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : !Array.isArray(sessions) || sessions.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-neutral-500 mb-4">No sessions yet</p>
            <Link href="/upload" className="text-primary font-bold uppercase text-sm">
              Upload your first session →
            </Link>
          </div>
        ) : (
          <div className="divide-y-2 divide-black">
            {recentSessions.map((session) => (
              <Link 
                key={session.id} 
                href={session.status === "complete" ? `/results?session_id=${session.id}` : `/status?session_id=${session.id}`}
                className="p-4 md:p-6 flex items-center justify-between hover:bg-surface-container transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-black text-white flex items-center justify-center">
                    <FileVideo className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold uppercase text-sm md:text-base">{session.filename}</p>
                    <p className="text-xs text-neutral-500">
                      {new Date(session.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {session.status === "complete" ? (
                    <>
                      <span className="text-xl font-black text-primary">{session.mentor_score?.toFixed(1)}</span>
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </>
                  ) : (
                    <span className="text-xs font-bold uppercase bg-yellow-100 px-3 py-1">{session.status}</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
