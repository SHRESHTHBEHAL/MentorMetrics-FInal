"use client";

import { useState, useEffect } from "react";
import { getSessions, Session } from "@/lib/api";
import { Users, TrendingUp, Award, UserCircle2 } from "lucide-react";

interface MentorStats {
  userId: string;
  totalSessions: number;
  averageScore: number;
}

export default function MentorsPage() {
  const [mentors, setMentors] = useState<MentorStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMentors = async () => {
      try {
        const data = await getSessions();
        if (Array.isArray(data)) {
          // Group by user_id
          const mentorMap = new Map<string, { totalScore: number; count: number }>();
          
          data.forEach(session => {
            const uid = session.user_id || "Unknown Mentor";
            const score = session.mentor_score || 0;
            
            if (mentorMap.has(uid)) {
              const current = mentorMap.get(uid)!;
              mentorMap.set(uid, { totalScore: current.totalScore + score, count: current.count + 1 });
            } else {
              mentorMap.set(uid, { totalScore: score, count: 1 });
            }
          });

          const stats: MentorStats[] = Array.from(mentorMap.entries()).map(([userId, data]) => ({
            userId,
            totalSessions: data.count,
            averageScore: data.count > 0 ? Number((data.totalScore / data.count).toFixed(1)) : 0
          }));
          
          // Sort by highest average score
          stats.sort((a, b) => b.averageScore - a.averageScore);
          setMentors(stats);
        }
      } catch (error) {
        console.error("Failed to fetch sessions for mentors:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMentors();
  }, []);

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
            {mentors.length > 0 ? mentors[0].averageScore : "0"}
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
              <div key={idx} className="p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between hover:bg-neutral-100 transition-colors gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-black text-white flex items-center justify-center">
                    <UserCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-black uppercase text-lg">{mentor.userId === "anonymous" ? "Anonymous Mentor" : mentor.userId}</p>
                    <p className="text-xs font-bold text-neutral-500 tracking-widest uppercase">
                      {mentor.totalSessions} Session{mentor.totalSessions !== 1 ? 's' : ''} Analyzed
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <span className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1">Avg Score</span>
                    <span className={`text-2xl font-black ${mentor.averageScore >= 7 ? 'text-primary' : mentor.averageScore < 5 ? 'text-red-600' : 'text-yellow-600'}`}>
                      {mentor.averageScore.toFixed(1)}
                    </span>
                  </div>
                  <div className="text-right border-l-2 border-neutral-300 pl-6">
                    <span className="block text-xs font-bold text-neutral-500 uppercase tracking-widest mb-1">Status</span>
                    {mentor.averageScore >= 7 ? (
                      <span className="text-xs font-bold bg-green-100 text-green-800 px-3 py-1 uppercase border border-green-800">Expert</span>
                    ) : mentor.averageScore >= 5 ? (
                      <span className="text-xs font-bold bg-blue-100 text-blue-800 px-3 py-1 uppercase border border-blue-800">Proficient</span>
                    ) : (
                      <span className="text-xs font-bold bg-red-100 text-red-800 px-3 py-1 uppercase border border-red-800">Developing</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
