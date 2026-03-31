import React, { useState, useEffect } from "react";
import { BookOpen } from "lucide-react";

const CACHE_KEY = "vara_narrative_recap";
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

export default function NarrativeRecap({ userId, timeframe = "week" }) {
  const [narrative, setNarrative] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }

    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
      if (cached && cached.userId === userId && cached.timeframe === timeframe && Date.now() - cached.timestamp < CACHE_TTL) {
        setNarrative(cached.text);
        setLoading(false);
        return;
      }
    } catch { /* ignore */ }

    async function fetchNarrative() {
      try {
        const res = await fetch("/api/journal-summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, timeframe }),
        });
        if (res.ok) {
          const data = await res.json();
          const text = data?.summary || data?.reply || null;
          setNarrative(text);
          if (text) {
            localStorage.setItem(CACHE_KEY, JSON.stringify({ userId, timeframe, text, timestamp: Date.now() }));
          }
        }
      } catch { /* non-critical */ }
      setLoading(false);
    }
    fetchNarrative();
  }, [userId, timeframe]);

  if (loading) {
    return (
      <div className="bg-white rounded-vara-lg border border-divider p-vara-lg animate-pulse">
        <div className="h-4 bg-gray-100 rounded w-1/3 mb-3" />
        <div className="h-3 bg-gray-100 rounded w-full mb-2" />
        <div className="h-3 bg-gray-100 rounded w-5/6" />
      </div>
    );
  }

  if (!narrative) {
    return (
      <div className="bg-white rounded-vara-lg border border-divider p-vara-lg text-center">
        <BookOpen size={24} className="mx-auto mb-2 text-muted-sage-gray/40" />
        <p className="text-sm text-muted-sage-gray">
          Keep tracking your habits and journaling — your weekly narrative will appear here once there's enough data.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-vara-lg border border-divider p-vara-lg">
      <h4 className="text-sm font-semibold text-soft-charcoal flex items-center gap-2 mb-3">
        <BookOpen size={16} className="text-evergreen-teal" />
        Your {timeframe === "week" ? "Weekly" : "Monthly"} Recap
      </h4>
      <p className="text-sm text-soft-charcoal leading-relaxed">{narrative}</p>
    </div>
  );
}
