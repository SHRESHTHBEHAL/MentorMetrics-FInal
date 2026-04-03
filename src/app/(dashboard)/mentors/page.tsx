"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { getSessions } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Users, Award, UserCircle2, ArrowRight } from "lucide-react";

interface MentorStats {
  mentorName: string;
  totalSessions: number;
  completedSessions: number;
  averageScore: number;
  bestScore: number;
}

export default function MentorsPage() {
  const { user } = useAuth();
  const [mentors, setMentors] = useState<MentorStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    if (!user?.id) {
      setMentors([]);
      setLoading(false);
      return;
    }

    const fetchMentors = async () => {
      try {
        const data = await getSessions(user.id);
        if (Array.isArray(data)) {
          const mentorMap = new Map<string, { sessions: number; scores: number[] }>();

          data.forEach((session) => {
            const mentorName = session.mentor_name?.trim() || "Unknown Mentor";
            const isScored = session.status === "complete" && typeof session.mentor_score === "number";

            if (!mentorMap.has(mentorName)) {
              mentorMap.set(mentorName, { sessions: 0, scores: [] });
            }

            const current = mentorMap.get(mentorName);
            if (!current) return;

            current.sessions += 1;
            if (isScored) {
              current.scores.push(session.mentor_score as number);
            }
          });

          const stats: MentorStats[] = Array.from(mentorMap.entries()).map(([mentorName, mentor]) => ({
            mentorName,
            totalSessions: mentor.sessions,
            completedSessions: mentor.scores.length,
            averageScore:
              mentor.scores.length > 0
                ? Number((mentor.scores.reduce((sum, score) => sum + score, 0) / mentor.scores.length).toFixed(1))
                : 0,
            bestScore: mentor.scores.length > 0 ? Math.max(...mentor.scores) : 0,
          }));

          stats.sort((a, b) => b.totalSessions - a.totalSessions || b.averageScore - a.averageScore);
          setMentors(stats);
        }
      } catch (error) {
        console.error("Failed to fetch sessions for mentors:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMentors();
  }, [user?.id]);

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="mb-8 md:mb-12">
        <h1 className="text-3xl md:text-5xl font-black tracking-tighter uppercase mb-2">Mentors Roster</h1>
        <p className="text-on-surface-variant font-medium">Manage and track your active teaching staff.</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-8 md:mb-12">
        <div className="bg-primary text-white p-6 md:p-8 border-4 border-black">
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-bold uppercase tracking-widest">Total Active Mentors</span>
            <Users className="w-5 h-5 opacity-50" />
          </div>
          <div className="text-4xl md:text-6xl font-black">{mentors.length}</div>
        </div>
        <div className="bg-white border-2 border-black p-6 md:p-8">
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-bold uppercase tracking-widest">Top Average Score</span>
            <Award className="w-5 h-5 text-primary" />
          </div>
          <div className="text-4xl md:text-6xl font-black">
            {mentors.length > 0 ? mentors.reduce((max, m) => Math.max(max, m.averageScore), 0).toFixed(1) : "0.0"}
          </div>
        </div>
      </div>

      {/* Mentors Table/List */}
      <div className="bg-white border-2 border-black">
        <div className="p-4 md:p-6 border-b-2 border-black flex justify-between items-center bg-surface-container">
          <h3 className="text-lg font-black uppercase tracking-widest">Staff Leaderboard</h3>
        </div>
        
        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : mentors.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-neutral-500 font-bold uppercase text-sm">No mentors found</p>
          </div>
        ) : (
          <div className="divide-y-2 divide-black">
            {mentors.map((mentor, idx) => (
              <Link
                key={`${mentor.mentorName}-${idx}`}
                href={`/mentors/${encodeURIComponent(mentor.mentorName)}`}
                className="p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between hover:bg-neutral-100 transition-colors gap-4"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-12 h-12 bg-black text-white flex items-center justify-center shrink-0">
                    <UserCircle2 className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-black uppercase text-lg truncate" title={mentor.mentorName}>{mentor.mentorName}</p>
                    <p className="text-xs font-bold text-neutral-500 tracking-widest uppercase">
                      {mentor.totalSessions} Session{mentor.totalSessions !== 1 ? "s" : ""} · {mentor.completedSessions} Completed
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <span className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1">Avg Score</span>
                    <span className={`text-2xl font-black ${mentor.averageScore >= 7 ? "text-primary" : mentor.averageScore < 5 ? "text-red-600" : "text-yellow-600"}`}>
                      {mentor.averageScore.toFixed(1)}
                    </span>
                  </div>
                  <div className="text-right border-l-2 border-neutral-300 pl-6">
                    <span className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1">Best</span>
                    <span className="text-lg font-black">{mentor.bestScore.toFixed(1)}</span>
                  </div>
                  <div className="border-l-2 border-neutral-300 pl-6">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
