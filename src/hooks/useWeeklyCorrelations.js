import { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

function getDayRange(days) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days + 1);
  start.setHours(0, 0, 0, 0);
  const dates = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  }
  return dates;
}

export function useWeeklyCorrelations(userId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }

    async function load() {
      try {
        const dates = getDayRange(7);
        const startDate = dates[0];

        const hcSnap = await getDocs(
          query(collection(db, "habitCompletions"), where("userId", "==", userId), where("dateISO", ">=", startDate))
        );
        const completionsByDay = new Map();
        hcSnap.docs.forEach((d) => {
          const date = d.data().dateISO;
          completionsByDay.set(date, (completionsByDay.get(date) || 0) + 1);
        });

        const jeSnap = await getDocs(
          query(collection(db, "journalEntries"), where("userId", "==", userId))
        );
        const journalDays = new Set();
        jeSnap.docs.forEach((d) => {
          const ts = d.data().createdAt?.toDate?.();
          if (ts) {
            const iso = `${ts.getFullYear()}-${String(ts.getMonth() + 1).padStart(2, "0")}-${String(ts.getDate()).padStart(2, "0")}`;
            if (dates.includes(iso)) journalDays.add(iso);
          }
        });

        const fsSnap = await getDocs(
          query(collection(db, "focusSessions"), where("userId", "==", userId))
        );
        let focusMinutes = 0;
        fsSnap.docs.forEach((d) => {
          const ts = d.data().startedAt?.toDate?.();
          if (ts) {
            const iso = `${ts.getFullYear()}-${String(ts.getMonth() + 1).padStart(2, "0")}-${String(ts.getDate()).padStart(2, "0")}`;
            if (dates.includes(iso) && d.data().completed) focusMinutes += (d.data().durationMinutes || 25);
          }
        });

        const completionCounts = dates.map((d) => completionsByDay.get(d) || 0);
        const totalCompletions = completionCounts.reduce((a, b) => a + b, 0);
        const bestDayIdx = completionCounts.indexOf(Math.max(...completionCounts));
        const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const bestDay = new Date(dates[bestDayIdx] + "T00:00:00");

        setData({
          totalCompletions,
          completionCounts,
          journalDays: journalDays.size,
          focusMinutes,
          bestDay: dayLabels[bestDay.getDay()],
          dates,
        });
      } catch (err) {
        console.error("Weekly correlations error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [userId]);

  return { data, loading };
}
