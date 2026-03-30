import { useState, useEffect } from "react";
import { getHistory } from "../services/db/brainStateCheckIn.service";
import { BRAIN_STATES, STATE_RANK } from "../constants/brainStateProtocols";

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

function getColorForState(state) {
  const found = BRAIN_STATES.find((s) => s.state === state);
  return found ? found.color : null;
}

export function buildWeekSlots(history) {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - 6);
  start.setHours(0, 0, 0, 0);

  const historyMap = new Map(history.map((h) => [h.date, h.brainState]));

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const dayIndex = (d.getDay() + 6) % 7;
    const state = historyMap.get(dateStr) ?? null;
    return {
      date: dateStr,
      dayLabel: DAY_LABELS[dayIndex],
      brainState: state,
      color: state ? getColorForState(state) : null,
    };
  });
}

export function computeSummary(days) {
  const withData = days.filter((d) => d.brainState !== null);
  if (withData.length < 2) return null;

  const counts = new Map();
  for (const d of withData) {
    counts.set(d.brainState, (counts.get(d.brainState) ?? 0) + 1);
  }
  for (const [state, count] of counts) {
    if (count >= 3) {
      const label = state.charAt(0).toUpperCase() + state.slice(1);
      return `${label} ${count} of ${withData.length} days`;
    }
  }

  if (withData.length >= 4) {
    const mid = Math.floor(withData.length / 2);
    const firstHalf = withData.slice(0, mid);
    const secondHalf = withData.slice(mid);
    const avg = (arr) =>
      arr.reduce((sum, d) => sum + STATE_RANK[d.brainState], 0) / arr.length;
    const firstAvg = avg(firstHalf);
    const secondAvg = avg(secondHalf);
    if (secondAvg - firstAvg >= 0.5) return "Trending clearer this week";
    if (firstAvg - secondAvg >= 0.5) return "Trending foggier this week";
  }

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const parts = sorted.slice(0, 2).map(([state, count]) => `${count} ${state}`);
  return `Mixed week — ${parts.join(", ")}`;
}

export function useBrainStateWeekTrend(userId, refreshKey) {
  const [trend, setTrend] = useState({ days: [], summary: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const history = await getHistory(userId, 7);
        if (cancelled) return;

        const mapped = history.map((h) => ({
          date: h.date,
          brainState: h.brainState,
        }));

        const days = buildWeekSlots(mapped);
        const summary = computeSummary(days);
        setTrend({ days, summary });
      } catch {
        // Fail silently — trend is non-critical
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [userId, refreshKey]);

  return { ...trend, loading };
}
