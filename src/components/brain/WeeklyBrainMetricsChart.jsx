// src/components/brain/WeeklyBrainMetricsChart.jsx
// Bar chart of brain readiness scores for the past 7 days using Recharts.

import React, { useState, useEffect } from 'react';
import { TrendingUp } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

function getLast7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({
      key: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString('en-US', { weekday: 'short' }),
    });
  }
  return days;
}

function barColor(score) {
  if (!score) return '#E5E7EB'; // gray-200
  if (score >= 70) return '#1B5E57'; // evergreen-teal
  if (score >= 40) return '#F4C542'; // sunrise-amber
  return '#D97A6E'; // soft-coral
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  return (
    <div className="bg-white border border-divider rounded-vara-md px-vara-sm py-vara-xs shadow-vara-md text-[12px]">
      <p className="font-semibold text-soft-charcoal">{label}</p>
      <p className="text-muted-sage-gray">{val ? `Score: ${val}` : 'No data'}</p>
    </div>
  );
};

export default function WeeklyBrainMetricsChart() {
  const { user } = useAuth();
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const days = getLast7Days();

    Promise.all(
      days.map(({ key }) => getDoc(doc(db, 'brainMetrics', `${user.uid}_${key}`)))
    ).then((snaps) => {
      if (cancelled) return;
      const data = snaps.map((snap, i) => ({
        day: days[i].label,
        score: snap.exists() ? (snap.data().readinessScore || 0) : 0,
      }));
      setChartData(data);
      setHasData(data.some((d) => d.score > 0));
      setLoading(false);
    }).catch(() => setLoading(false));

    return () => { cancelled = true; };
  }, [user]);

  if (loading) {
    return (
      <div className="bg-white rounded-vara-lg shadow-vara-md border border-divider p-vara-lg flex items-center justify-center min-h-[200px]">
        <div className="w-6 h-6 border-2 border-evergreen-teal border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-vara-lg shadow-vara-md border border-divider p-vara-lg">
      {/* Header */}
      <div className="flex items-center gap-2 mb-vara-lg">
        <TrendingUp size={16} className="text-evergreen-teal shrink-0" />
        <p className="text-[15px] font-semibold text-soft-charcoal">7-Day Readiness</p>
      </div>

      {hasData ? (
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={chartData} barCategoryGap="30%" margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="day"
              tick={{ fontSize: 11, fill: '#6F7F77' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: '#6F7F77' }}
              axisLine={false}
              tickLine={false}
              ticks={[0, 50, 100]}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(213,227,209,0.3)' }} />
            <Bar dataKey="score" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={barColor(entry.score)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex flex-col items-center justify-center py-vara-2xl text-center">
          <div className="w-10 h-10 bg-teal-light rounded-vara-lg flex items-center justify-center mb-vara-base">
            <TrendingUp size={20} className="text-evergreen-teal" />
          </div>
          <p className="text-[14px] font-medium text-soft-charcoal mb-vara-xs">No data yet</p>
          <p className="text-[13px] text-muted-sage-gray">
            Complete your daily check-in above to start tracking your readiness score.
          </p>
        </div>
      )}

      {hasData && (
        <div className="flex gap-vara-base mt-vara-sm text-[11px] text-muted-sage-gray">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-evergreen-teal inline-block" /> 70+</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sunrise-amber inline-block" /> 40–69</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-soft-coral inline-block" /> Below 40</span>
        </div>
      )}
    </div>
  );
}
