// src/pages/Reflections.jsx
import React, { useEffect, useMemo, useState } from "react";
import SidebarLayout from "../components/layout/SidebarLayout";
import { db } from "../firebase";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { NotebookPen, CalendarDays, Filter, Search } from "lucide-react";

export default function Reflections() {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState("all"); // "all" | "am" | "pm"

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, "journal_entries"),
      where("userId", "==", user.uid),
      where("entryType", "==", "reflection"),
      orderBy("yyyymmdd", "desc"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setEntries(rows);
    });
    return () => unsub();
  }, [user?.uid]);

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      const matchesPeriod = period === "all" ? true : e.period === period;
      const matchesSearch = search
        ? (e.text || "").toLowerCase().includes(search.toLowerCase())
        : true;
      return matchesPeriod && matchesSearch;
    });
  }, [entries, period, search]);

  // group by yyyymmdd
  const grouped = useMemo(() => {
    const m = new Map();
    for (const e of filtered) {
      const key = e.yyyymmdd || "Unknown Date";
      if (!m.has(key)) m.set(key, []);
      m.get(key).push(e);
    }
    return Array.from(m.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1)); // desc
  }, [filtered]);

  return (
    <SidebarLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <NotebookPen size={28} className="text-evergreen-teal" />
          <h1 className="text-vara-xl font-semibold text-soft-charcoal">Reflections</h1>
        </div>
        <p className="text-muted-sage-gray mb-6">
          Your daily AM/PM notes—scan for patterns, progress, and moments that mattered.
        </p>

        {/* Controls */}
        <div className="flex flex-col md:flex-row md:items-center gap-3 mb-6">
          <div className="flex items-center gap-2 bg-white border border-divider rounded-xl px-3 py-2 w-full md:w-80">
            <Search size={16} className="text-muted-sage-gray" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search text…"
              className="w-full text-sm outline-none"
            />
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Filter size={16} className="text-muted-sage-gray" />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="text-sm border border-divider rounded-lg px-2 py-1 bg-white"
            >
              <option value="all">All (AM + PM)</option>
              <option value="am">Morning only</option>
              <option value="pm">Evening only</option>
            </select>
          </div>
        </div>

        {/* List */}
        {grouped.length === 0 ? (
          <div className="bg-white/80 border border-divider rounded-2xl p-6 text-sm text-muted-sage-gray">
            No reflections yet.
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map(([dateKey, items]) => (
              <div key={dateKey}>
                <div className="flex items-center gap-2 mb-2 text-evergreen-teal">
                  <CalendarDays size={18} />
                  <h2 className="font-semibold">{prettyDate(dateKey)}</h2>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {items.map((e) => (
                    <article
                      key={e.id}
                      className="bg-white/80 border border-divider rounded-xl p-4 shadow-sm"
                    >
                      <div className="text-xs text-muted-sage-gray mb-1 uppercase tracking-wide">
                        {e.period === "am" ? "Morning" : e.period === "pm" ? "Evening" : "Anytime"}
                      </div>
                      <p className="text-sm text-soft-charcoal whitespace-pre-wrap">{e.text}</p>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}

function prettyDate(yyyymmdd) {
  // "2025-09-26" -> "Sep 26, 2025"
  const [y, m, d] = yyyymmdd.split("-").map((n) => parseInt(n, 10));
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
