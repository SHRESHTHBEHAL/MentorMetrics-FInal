"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { getSessions, deleteSession, Session } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { FileVideo, ChevronRight, Loader2, Search, Trash2, AlertTriangle } from "lucide-react";

export default function HistoryPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

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
          setSessions(data);
        }
      } catch (error) {
        console.error("Failed to fetch sessions:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, [user?.id]);

  const filtered = useMemo(() => {
    return sessions.filter((s) => {
      const matchesSearch =
        !search ||
        s.filename.toLowerCase().includes(search.toLowerCase()) ||
        s.mentor_name?.toLowerCase().includes(search.toLowerCase()) ||
        s.id.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || s.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [sessions, search, statusFilter]);

  const scoredSessions = sessions.filter(
    (s) => s.status === "complete" && typeof s.mentor_score === "number"
  );
  const averageMentorScore =
    scoredSessions.length > 0
      ? (
          scoredSessions.reduce((sum, s) => sum + (s.mentor_score || 0), 0) /
          scoredSessions.length
        ).toFixed(1)
      : "—";

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch (error) {
      console.error("Failed to delete session:", error);
    } finally {
      setDeletingId(null);
      setConfirmDelete(null);
    }
  };

  return (
    <section className="p-4 md:p-12 max-w-7xl w-full mx-auto">
      <div className="mb-8 md:mb-12">
        <h2 className="text-4xl md:text-7xl font-black tracking-tighter uppercase mb-2 font-headline">Archive</h2>
        <div className="h-1.5 w-16 md:w-24 bg-primary mb-4"></div>
        <p className="text-on-surface-variant font-medium max-w-xl text-sm md:text-base">
          Historical record of all analyzed mentor sessions. Data is indexed by performance metrics and date of delivery.
        </p>
      </div>

      {confirmDelete && (
        <div className="bg-red-50 border-2 border-red-600 p-4 mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-600 font-bold text-sm">Delete this session? This action cannot be undone.</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => handleDelete(confirmDelete)}
              disabled={deletingId === confirmDelete}
              className="bg-red-600 text-white font-bold px-4 py-2 border-2 border-black text-xs uppercase hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {deletingId === confirmDelete ? "Deleting..." : "Delete"}
            </button>
            <button
              onClick={() => setConfirmDelete(null)}
              className="bg-white text-black font-bold px-4 py-2 border-2 border-black text-xs uppercase hover:bg-neutral-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-0 mb-8 md:mb-12 border-2 border-black">
        <div className="p-4 md:p-6 bg-surface-container-highest border-b-2 md:border-b-0 md:border-r-2 border-black flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">Total Sessions</span>
          <span className="text-3xl md:text-4xl font-black">{loading ? "..." : sessions.length}</span>
        </div>
        <div className="p-4 md:p-6 bg-surface-container-highest border-b-2 md:border-b-0 md:border-r-2 border-black flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">Avg Mentor Score</span>
          <span className="text-3xl md:text-4xl font-black">
            {loading ? "..." : averageMentorScore}
          </span>
        </div>
        <div className="p-4 md:p-6 bg-surface-container-highest flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">Last Update</span>
          <span className="text-3xl md:text-4xl font-black">
            {loading ? "..." : sessions[0] ? new Date(sessions[0].created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
          </span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by filename, mentor, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border-2 border-black focus:border-primary focus:outline-none text-sm font-medium"
          />
        </div>
        <div className="flex gap-2">
          {["all", "complete", "processing", "failed"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-3 border-2 border-black text-xs font-black uppercase tracking-widest transition-colors ${
                statusFilter === status
                  ? "bg-black text-white"
                  : "bg-white text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="border-2 border-black bg-white overflow-hidden">
        <div className="hidden md:grid grid-cols-12 bg-black text-white p-4 text-[10px] uppercase tracking-widest">
          <div className="col-span-5">Session Identity</div>
          <div className="col-span-2 text-center">Date</div>
          <div className="col-span-2 text-center">Score</div>
          <div className="col-span-3 text-right">Action</div>
        </div>

        {loading ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 md:p-12 text-center">
            <FileVideo className="w-12 h-12 mx-auto mb-4 text-neutral-400" />
            {sessions.length === 0 ? (
              <>
                <p className="text-lg font-bold text-neutral-600 mb-2">No sessions yet</p>
                <p className="text-sm text-neutral-500">Upload your first session to get started</p>
              </>
            ) : (
              <>
                <p className="text-lg font-bold text-neutral-600 mb-2">No matching sessions</p>
                <p className="text-sm text-neutral-500">Try adjusting your search or filter</p>
              </>
            )}
          </div>
        ) : (
          <div className="divide-y-2 divide-black">
            {filtered.map((session) => (
              <div key={session.id} className="grid grid-cols-1 md:grid-cols-12 p-4 md:p-6 items-center hover:bg-surface-container transition-colors">
                <div className="col-span-1 md:col-span-5 mb-2 md:mb-0 min-w-0">
                  <p className="font-black text-lg md:text-xl uppercase leading-none mb-1 truncate pr-2 md:pr-4" title={session.filename}>{session.filename}</p>
                  <p className="text-[10px] font-mono text-neutral-500 uppercase">Mentorship ID: {session.id.slice(0, 8)}</p>
                </div>
                <div className="col-span-1 md:col-span-2 text-center mb-2 md:mb-0">
                  <span className="font-bold text-sm">
                    {new Date(session.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>
                <div className="col-span-1 md:col-span-2 text-center mb-2 md:mb-0">
                  {session.status === "failed" ? (
                    <span className="text-sm font-bold text-red-500 uppercase tracking-widest border border-red-300 px-2 py-0.5 bg-red-50">Failed</span>
                  ) : session.status === "complete" && session.mentor_score != null ? (
                    <span className="text-2xl font-black text-primary">{session.mentor_score.toFixed(1)}</span>
                  ) : (
                    <span className="text-2xl font-black text-neutral-300">—</span>
                  )}
                </div>
                <div className="col-span-1 md:col-span-3 text-right flex items-center justify-end gap-3">
                  {session.status === "complete" ? (
                    <Link href={`/results?session_id=${session.id}`} className="text-[10px] font-black uppercase underline decoration-2 underline-offset-4 hover:text-primary transition-colors inline-flex items-center">
                      View Report <ChevronRight className="w-3 h-3 ml-1" />
                    </Link>
                  ) : session.status === "failed" ? (
                    <span className="text-[10px] text-neutral-300 uppercase">—</span>
                  ) : (
                    <span className="text-[10px] text-neutral-400 uppercase">{session.status}</span>
                  )}
                  <button
                    onClick={() => setConfirmDelete(session.id)}
                    disabled={deletingId === session.id}
                    className="text-neutral-400 hover:text-red-600 transition-colors disabled:opacity-50"
                    title="Delete session"
                  >
                    {deletingId === session.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {filtered.length > 0 && (
        <div className="mt-6 md:mt-8 flex justify-between items-center">
          <span className="text-[10px] font-black uppercase text-neutral-400 hidden md:block">
            Showing {filtered.length} of {sessions.length} Sessions
          </span>
        </div>
      )}
    </section>
  );
}
