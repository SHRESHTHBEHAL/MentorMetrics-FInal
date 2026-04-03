"use client";

import { useEffect, useState } from "react";
import { CoachingTip } from "@/lib/live-api";
import { Zap, MessageSquare, Volume2, User, Eye } from "lucide-react";

interface CoachingTipCardProps {
  tip: CoachingTip;
  priority?: boolean;
}

const categoryConfig = {
  pace: {
    color: "border-l-blue-500 bg-blue-500/20",
    icon: Zap,
    label: "PACE",
  },
  clarity: {
    color: "border-l-green-500 bg-green-500/20",
    icon: MessageSquare,
    label: "CLARITY",
  },
  energy: {
    color: "border-l-yellow-500 bg-yellow-500/20",
    icon: Volume2,
    label: "ENERGY",
  },
  posture: {
    color: "border-l-red-500 bg-red-500/20",
    icon: User,
    label: "POSTURE",
  },
  engagement: {
    color: "border-l-purple-500 bg-purple-500/20",
    icon: Eye,
    label: "ENGAGEMENT",
  },
};

export default function CoachingTipCard({ tip, priority = false }: CoachingTipCardProps) {
  const [visible, setVisible] = useState(true);
  const config = categoryConfig[tip.category] || categoryConfig.clarity;
  const Icon = config.icon;

  // Auto-dismiss after 30 seconds for non-priority tips
  useEffect(() => {
    if (!priority) {
      const timer = setTimeout(() => {
        setVisible(false);
      }, 30000);
      return () => clearTimeout(timer);
    }
  }, [priority]);

  if (!visible) return null;

  return (
    <div
      className={`
        ${config.color}
        border-l-4 bg-black/90 backdrop-blur-sm p-4 max-w-md
        transition-all duration-300 ease-out
        ${priority ? "animate-pulse ring-2 ring-white/50" : ""}
      `}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded ${config.color} bg-black/50`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[10px] font-black uppercase tracking-widest text-white/60">
            {config.label}
          </span>
          <p className="text-white font-bold text-sm md:text-base leading-tight mt-1">
            {tip.text}
          </p>
        </div>
      </div>
    </div>
  );
}
