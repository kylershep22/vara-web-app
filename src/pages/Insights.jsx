// src/pages/Insights.jsx
// Single scrollable Insights page replacing the 8-tab layout.

import React, { useState, useEffect, useMemo } from 'react';
import SidebarLayout from '../components/layout/SidebarLayout';
import { BarChart3 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import {
  collection, query, where, getDocs, Timestamp
} from 'firebase/firestore';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line
} from 'recharts';
import WeeklyNarrativeCard from '../components/insights/WeeklyNarrativeCard';

// ── Timeframe config ───────────────────────────────────────────────────────────

const TIMEFRAMES = [
  { id: '7d',   label: '7 Days',   days: 7   },
  { id: '30d',  label: '30 Days',  days: 30  },
  { id: '90d',  label: '90 Days',  days: 90  },
  { id: '365d', label: 'Year',     days: 365 },
  { id: 'all',  label: 'All Time', days: null },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function safeToDate(ts) {
  try {
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return isNaN(d.getTime()) ? new Date() : d;
  } catch {
    return new Date();
  }
}

function getWindowStart(days) {
  if (days == null) return new Date(0);
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── Timeframe Selector ────────────────────────────────────────────────────────

function TimeframeSelector({ value, onChange }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {TIMEFRAMES.map(tf => (
        <button
          key={tf.id}
          onClick={() => onChange(tf.id)}
          className={`px-vara-base py-vara-xs rounded-vara-pill text-vara-sm font-medium transition ${
            value === tf.id
              ? 'bg-evergreen-teal text-white'
              : 'bg-white border border-divider text-muted-sage-gray hover:text-soft-charcoal hover:border-silver-sage'
          }`}
        >
          {tf.label}
        </button>
      ))}
    </div>
  );
}

// ── Hero Summary Card ─────────────────────────────────────────────────────────

function HeroSummaryCard({ stats }) {
  const items = [
    { label: 'Days Active',    value: stats.daysActive    ?? '—' },
    { label: 'Total Check-ins', value: stats.totalCheckIns ?? '—' },
    { label: 'Habits Completed', value: stats.habitsCompleted ?? '—' },
  ];

  return (
    <div className="bg-white rounded-vara-lg border border-divider p-vara-lg shadow-vara-sm">
      <h2 className="text-vara-lg font-semibold text-soft-charcoal mb-vara-base">Summary</h2>
      <div className="grid grid-cols-3 gap-vara-base">
        {items.map(item => (
          <div key={item.label} className="text-center">
            <div className="text-vara-3xl font-bold text-evergreen-teal">{item.value}</div>
            <div className="text-vara-xs text-muted-sage-gray mt-1">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Sparkline Card ────────────────────────────────────────────────────────────

function SparklineCard({ label, value, data, color = '#1B5E57' }) {
  const chartData = (data || []).map((v, i) => ({ i, v: v ?? 0 }));
  return (
    <div className="bg-white rounded-vara-lg border border-divider p-vara-base shadow-vara-sm flex items-center justify-between gap-vara-base">
      <div>
        <div className="text-vara-xs text-muted-sage-gray mb-1">{label}</div>
        <div className="text-vara-xl font-bold text-soft-charcoal">{value ?? '—'}</div>
      </div>
      {chartData.length > 1 && (
        <LineChart width={80} height={30} data={chartData}>
          <Line
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      )}
    </div>
  );
}

// ── Ring Progress Card ────────────────────────────────────────────────────────

function RingProgressCard({ rings }) {
  const SIZE = 80;
  const STROKE = 8;
  const R = (SIZE - STROKE) / 2;
  const CIRC = 2 * Math.PI * R;

  return (
    <div className="bg-white rounded-vara-lg border border-divider p-vara-lg shadow-vara-sm">
      <h2 className="text-vara-lg font-semibold text-soft-charcoal mb-vara-base">Completion Rings</h2>
      <div className="flex items-center justify-around flex-wrap gap-vara-base">
        {rings.map(({ label, pct, color }) => {
          const offset = CIRC - (pct / 100) * CIRC;
          return (
            <div key={label} className="flex flex-col items-center gap-2">
              <svg width={SIZE} height={SIZE} className="-rotate-90">
                <circle
                  cx={SIZE / 2} cy={SIZE / 2} r={R}
                  fill="none"
                  stroke="#E5E7EB"
                  strokeWidth={STROKE}
                />
                <circle
                  cx={SIZE / 2} cy={SIZE / 2} r={R}
                  fill="none"
                  stroke={color}
                  strokeWidth={STROKE}
                  strokeDasharray={CIRC}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                />
              </svg>
              <div className="text-center">
                <div className="text-vara-base font-bold text-soft-charcoal">{pct}%</div>
                <div className="text-vara-xs text-muted-sage-gray">{label}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Habit Heatmap ─────────────────────────────────────────────────────────────

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function cellColor(count) {
  if (!count || count === 0) return 'bg-gray-100';
  if (count <= 2) return 'bg-teal-light border border-silver-sage/40';
  if (count <= 4) return 'bg-dew-sage';
  return 'bg-evergreen-teal';
}

function HabitHeatmap({ heatmapData }) {
  // heatmapData: Map<dateKey, completionCount>
  // Build last 35 days grid (5 weeks × 7 days)
  const DAYS = 35;
  const today = new Date();
  const cells = [];
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = dateKey(d);
    cells.push({ key, count: heatmapData?.get(key) ?? 0, dayOfWeek: d.getDay() });
  }

  // Pad start so first cell aligns to correct day column
  const startPad = cells[0]?.dayOfWeek ?? 0;
  const padded = Array(startPad).fill(null).concat(cells);

  return (
    <div className="bg-white rounded-vara-lg border border-divider p-vara-lg shadow-vara-sm">
      <h2 className="text-vara-lg font-semibold text-soft-charcoal mb-vara-base">Habit Activity</h2>
      <div className="grid grid-cols-7 gap-0.5 w-fit">
        {DAY_LABELS.map((d, i) => (
          <div key={i} className="w-4 h-4 flex items-center justify-center text-vara-xs text-muted-sage-gray font-medium">
            {d}
          </div>
        ))}
        {padded.map((cell, i) =>
          cell == null ? (
            <div key={`pad-${i}`} className="w-4 h-4" />
          ) : (
            <div
              key={cell.key}
              title={`${cell.key}: ${cell.count} habit${cell.count !== 1 ? 's' : ''}`}
              className={`w-4 h-4 rounded-vara-sm ${cellColor(cell.count)}`}
            />
          )
        )}
      </div>
      <div className="flex items-center gap-2 mt-vara-base text-vara-xs text-muted-sage-gray">
        <span>Less</span>
        {[0, 2, 4, 6].map(n => (
          <div key={n} className={`w-3 h-3 rounded-vara-sm ${cellColor(n)}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

// ── Weekly Bar Chart ──────────────────────────────────────────────────────────

function WeeklyBarChart({ barData }) {
  return (
    <div className="bg-white rounded-vara-lg border border-divider p-vara-lg shadow-vara-sm">
      <h2 className="text-vara-lg font-semibold text-soft-charcoal mb-vara-base">Weekly Habit Completions</h2>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={barData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#6F7F77' }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#6F7F77' }} />
          <Tooltip
            contentStyle={{ borderRadius: 8, border: '1px solid #B8CDBA', fontSize: 12 }}
            cursor={{ fill: 'rgba(27,94,87,0.06)' }}
          />
          <Bar dataKey="count" fill="#1B5E57" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function Insights() {
  const { user } = useAuth();
  const [timeframe, setTimeframe] = useState('7d');
  const [rawData, setRawData] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Data Fetching ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user?.uid) return;
    let cancelled = false;

    async function fetchAll() {
      setLoading(true);
      try {
        const tf = TIMEFRAMES.find(t => t.id === timeframe);
        const windowStart = getWindowStart(tf.days);
        const windowStartTs = Timestamp.fromDate(windowStart);
        const uid = user.uid;

        // ── Habits + completions ─────────────────────────────────────────
        const habitsSnap = await getDocs(
          query(collection(db, 'habits'), where('userId', '==', uid), where('active', '==', true))
        );
        const habitIds = habitsSnap.docs.map(d => d.id);

        // Build date range array for completions query
        const today = new Date();
        const days = tf.days ?? 365; // For "all time" cap at 365 for heatmap
        const dateRange = [];
        for (let i = 0; i < Math.min(days, 35); i++) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          dateRange.push(dateKey(d));
        }

        // Per-day completion counts (for heatmap + bar chart)
        const heatmapMap = new Map();
        // Per-week completion counts (Mon-Sun of current week)
        const weekDayCounts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
        let totalHabitsCompleted = 0;

        for (const habitId of habitIds) {
          try {
            const compSnap = await getDocs(
              query(
                collection(db, 'habits', habitId, 'completions'),
                where('date', 'in', dateRange.slice(0, 10)) // Firestore 'in' limit 10
              )
            );
            compSnap.docs.forEach(d => {
              const data = d.data();
              if (!data.completed) return;
              const dateStr = data.date;
              heatmapMap.set(dateStr, (heatmapMap.get(dateStr) ?? 0) + 1);
              totalHabitsCompleted++;

              // Also populate weekDayCounts for the last 7 days
              if (dateRange.slice(0, 7).includes(dateStr)) {
                const dow = new Date(dateStr + 'T00:00:00').getDay();
                weekDayCounts[dow] = (weekDayCounts[dow] || 0) + 1;
              }
            });
          } catch {
            // Skip habit if completions fail
          }
        }

        // ── Goals ────────────────────────────────────────────────────────
        const goalsSnap = await getDocs(
          query(collection(db, 'goals'), where('userId', '==', uid))
        );
        const allGoals = goalsSnap.docs.map(d => d.data());
        const completedGoals = allGoals.filter(g => g.status === 'completed').length;
        const totalGoals = allGoals.length;

        // ── Tasks ────────────────────────────────────────────────────────
        const tasksSnap = await getDocs(
          query(collection(db, 'tasks'), where('userId', '==', uid))
        );
        const allTasks = tasksSnap.docs.map(d => d.data());
        const completedTasks = allTasks.filter(t => t.completed).length;
        const totalTasks = allTasks.length;

        // ── Journal entries ───────────────────────────────────────────────
        const journalSnap = await getDocs(
          query(
            collection(db, 'journalEntries'),
            where('userId', '==', uid),
            where('createdAt', '>=', windowStartTs)
          )
        );
        const journalDays = new Set(
          journalSnap.docs.map(d => {
            const ts = d.data().createdAt;
            return dateKey(safeToDate(ts));
          })
        );

        // ── Morning check-ins (days active) ──────────────────────────────
        // Use journalEntries + habits completions as a proxy for "days active"
        const activeDays = new Set([...journalDays]);
        heatmapMap.forEach((count, key) => {
          if (count > 0 && dateRange.includes(key)) activeDays.add(key);
        });

        // ── Focus sessions ───────────────────────────────────────────────
        const focusSnap = await getDocs(
          query(collection(db, 'focusSessions'), where('userId', '==', uid))
        );
        const focusMinsPerDay = new Map();
        focusSnap.docs.forEach(d => {
          const data = d.data();
          if (!data.completed) return;
          const seconds = data.startedAt?.seconds || 0;
          const date = new Date(seconds * 1000);
          if (date < windowStart) return;
          const key = dateKey(date);
          focusMinsPerDay.set(key, (focusMinsPerDay.get(key) ?? 0) + (data.duration || 0));
        });
        const totalFocusMins = [...focusMinsPerDay.values()].reduce((a, b) => a + b, 0);

        if (!cancelled) {
          setRawData({
            habitIds,
            heatmapMap,
            weekDayCounts,
            totalHabitsCompleted,
            completedGoals,
            totalGoals,
            completedTasks,
            totalTasks,
            journalDays: journalDays.size,
            activeDays: activeDays.size,
            totalFocusMins,
            focusMinsPerDay,
            totalCheckIns: journalSnap.size,
            dateRange,
          });
        }
      } catch (err) {
        console.error('Insights fetch error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchAll();
    return () => { cancelled = true; };
  }, [user?.uid, timeframe]);

  // ── Derived metrics ────────────────────────────────────────────────────────

  const derived = useMemo(() => {
    if (!rawData) return null;

    const {
      heatmapMap, weekDayCounts, totalHabitsCompleted,
      completedGoals, totalGoals, completedTasks, totalTasks,
      journalDays, activeDays, totalCheckIns,
      totalFocusMins, focusMinsPerDay, dateRange
    } = rawData;

    // Hero stats
    const heroStats = {
      daysActive: activeDays,
      totalCheckIns,
      habitsCompleted: totalHabitsCompleted,
    };

    // Sparkline data: last 7 days value per day (index 0 = oldest)
    const last7 = dateRange.slice(0, 7).reverse(); // oldest first

    const habitsSparkline = last7.map(key => heatmapMap.get(key) ?? 0);
    const focusSparkline   = last7.map(key => focusMinsPerDay.get(key) ?? 0);
    // Journal: 1 if journaled, 0 if not (using journalDays as a set proxy)
    // We don't have per-day journal data here, use heatmap as proxy for habit activity
    const sparklineCards = [
      { label: 'Habits Completed', value: totalHabitsCompleted, data: habitsSparkline },
      { label: 'Journal Days',     value: journalDays,          data: last7.map((_, i) => i < journalDays ? 1 : 0) },
      { label: 'Focus Minutes',    value: totalFocusMins,       data: focusSparkline },
    ];

    // Ring progress
    const rings = [
      {
        label: 'Goals',
        pct: totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0,
        color: '#1B5E57',
      },
      {
        label: 'Habits',
        pct: dateRange.length > 0 && rawData.habitIds.length > 0
          ? Math.min(100, Math.round((totalHabitsCompleted / (rawData.habitIds.length * Math.min(dateRange.length, 7))) * 100))
          : 0,
        color: '#F4C542',
      },
      {
        label: 'Tasks',
        pct: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        color: '#F5B971',
      },
    ];

    // Bar chart: Mon–Sun labels
    const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const barData = [1, 2, 3, 4, 5, 6, 0].map(dow => ({
      label: DAY_NAMES[dow],
      count: weekDayCounts[dow] || 0,
    }));

    return { heroStats, sparklineCards, rings, barData, heatmapMap };
  }, [rawData]);

  // ── Loading skeleton ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <SidebarLayout>
        <div className="max-w-5xl mx-auto px-vara-base py-vara-lg">
          <div className="mb-vara-lg">
            <h1 className="text-vara-2xl font-semibold text-soft-charcoal">Insights</h1>
            <p className="text-vara-sm text-muted-sage-gray mt-1">Track your wellness progress</p>
          </div>
          <div className="space-y-vara-base mt-vara-lg animate-pulse">
            {[120, 100, 80, 160, 120].map((h, i) => (
              <div key={i} className={`bg-gray-100 rounded-vara-lg`} style={{ height: h }} />
            ))}
          </div>
        </div>
      </SidebarLayout>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <SidebarLayout>
      <div className="max-w-5xl mx-auto px-vara-base py-vara-lg">
        {/* Page Header */}
        <div className="mb-vara-lg">
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="text-evergreen-teal" size={28} />
            <h1 className="text-vara-2xl font-semibold text-soft-charcoal">Insights</h1>
          </div>
          <p className="text-vara-sm text-muted-sage-gray">Track your wellness progress</p>
        </div>

        {/* Timeframe Selector */}
        <TimeframeSelector value={timeframe} onChange={setTimeframe} />

        {/* Content */}
        <div className="space-y-vara-base mt-vara-lg">

          {/* AI Narrative (7-day only) */}
          {timeframe === '7d' && (
            <WeeklyNarrativeCard userId={user?.uid} />
          )}

          {/* Hero Summary */}
          {derived && <HeroSummaryCard stats={derived.heroStats} />}

          {/* Sparkline Cards */}
          {derived && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-vara-base">
              {derived.sparklineCards.map(card => (
                <SparklineCard
                  key={card.label}
                  label={card.label}
                  value={card.value}
                  data={card.data}
                />
              ))}
            </div>
          )}

          {/* Ring Progress */}
          {derived && <RingProgressCard rings={derived.rings} />}

          {/* Habit Heatmap */}
          {derived && <HabitHeatmap heatmapData={derived.heatmapMap} />}

          {/* Weekly Bar Chart */}
          {derived && <WeeklyBarChart barData={derived.barData} />}

        </div>
      </div>
    </SidebarLayout>
  );
}
