import React from "react";
import { Trophy, BookOpen, HelpCircle } from "lucide-react";

const BADGE_CONFIG = {
  win: { icon: Trophy, label: "Win", color: "text-amber-600 bg-amber-50 border-amber-200" },
  reflection: { icon: BookOpen, label: "Reflection", color: "text-teal-600 bg-teal-50 border-teal-200" },
  ask: { icon: HelpCircle, label: "Ask", color: "text-blue-600 bg-blue-50 border-blue-200" },
};

export default function PostTypeBadge({ postType }) {
  if (!postType || postType === "update") return null;
  const config = BADGE_CONFIG[postType];
  if (!config) return null;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${config.color}`}>
      <Icon size={12} />
      {config.label}
    </span>
  );
}
