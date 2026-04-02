import React, { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { getAnalyticsDoc, runClientAggregation } from "../../services/db/admin.service";
import LifecycleFunnel from "../../components/admin/LifecycleFunnel";
import EngagementHeatmap from "../../components/admin/EngagementHeatmap";
import WellnessSignalCard from "../../components/admin/WellnessSignalCard";
import HabitHealthCard from "../../components/admin/HabitHealthCard";
import JournalMetricsCard from "../../components/admin/JournalMetricsCard";

const CHART_COLORS = ["#2A7C6F", "#A8D5BA", "#6BB8A4", "#D4E8D0", "#4A9E8E", "#C1DABE"];

function StatRow({ label, value }) {
  return (
    <div className="flex justify-between items-center py-vara-sm border-b border-divider last:border-b-0">
      <span className="text-vara-sm text-muted-sage-gray">{label}</span>
      <span className="text-vara-sm font-medium text-soft-charcoal">{value}</span>
    </div>
  );
}

function SectionCard({ title, children }) {
  return (
    <div className="border border-divider rounded-vara-lg p-vara-base bg-white">
      <h3 className="text-vara-lg font-semibold text-soft-charcoal mb-vara-sm">{title}</h3>
      {children}
    </div>
  );
}

function fmtPct(val) {
  if (val == null) return "--";
  return `${(val * 100).toFixed(1)}%`;
}

const ALL_DOC_IDS = [
  "rolling", "subscriptionMetrics", "featureAdoption", "communityVitals",
  "wellnessSignal", "habitHealth", "engagementHeatmap", "lifecycleFunnel", "journalMetrics",
];

export default function AnalyticsTab() {
  const [docs, setDocs] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchAll() {
      const results = await Promise.all(ALL_DOC_IDS.map(id => getAnalyticsDoc(id)));
      const map = {};
      ALL_DOC_IDS.forEach((id, i) => { map[id] = results[i]; });
      return map;
    }

    (async () => {
      try {
        let data = await fetchAll();
        if (!data.rolling) {
          try { await runClientAggregation(); data = await fetchAll(); } catch {}
        }
        if (!cancelled) setDocs(data);
      } catch (err) {
        if (process.env.NODE_ENV === "development") console.error("AnalyticsTab fetch error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return <div className="text-muted-sage-gray text-vara-sm py-vara-lg">Loading analytics...</div>;
  }

  const hasData = Object.values(docs).some(d => d != null);
  if (!hasData) {
    return (
      <div className="border-2 border-dashed border-divider rounded-vara-lg p-vara-lg text-center text-muted-sage-gray text-vara-sm">
        No analytics data yet. Use the Overview tab's Refresh Analytics button to generate.
      </div>
    );
  }

  const { rolling, subscriptionMetrics, featureAdoption, communityVitals } = docs;

  const subPieData = subscriptionMetrics
    ? [
        { name: "Trial", value: subscriptionMetrics.activeTrials || 0 },
        { name: "Premium", value: subscriptionMetrics.paidUsers || 0 },
        { name: "Coaching", value: subscriptionMetrics.coachingUsers || 0 },
        { name: "Expired", value: subscriptionMetrics.expiredUsers || 0 },
      ].filter(d => d.value > 0)
    : [];

  const adoptionBarData = featureAdoption
    ? [
        { name: "Habits", pct: (featureAdoption.pctWithHabits || 0) * 100 },
        { name: "Goals", pct: (featureAdoption.pctWithGoals || 0) * 100 },
        { name: "Journal", pct: (featureAdoption.pctWithJournal || 0) * 100 },
        { name: "Tasks", pct: (featureAdoption.pctWithTasks || 0) * 100 },
        { name: "Community", pct: (featureAdoption.pctWithCommunity || 0) * 100 },
      ].sort((a, b) => b.pct - a.pct)
    : [];

  return (
    <div className="space-y-vara-base">
      <LifecycleFunnel data={docs.lifecycleFunnel} />
      <EngagementHeatmap data={docs.engagementHeatmap} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-vara-base">
        <WellnessSignalCard data={docs.wellnessSignal} />
        <HabitHealthCard data={docs.habitHealth} />

        {featureAdoption && (
          <SectionCard title="Feature Adoption">
            <StatRow label="Avg Habits per User" value={featureAdoption.avgHabitsPerUser?.toFixed(1) ?? "--"} />
            {adoptionBarData.length > 0 && (
              <div className="mt-vara-sm">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={adoptionBarData}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                    <Tooltip formatter={v => `${v.toFixed(1)}%`} />
                    <Bar dataKey="pct" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </SectionCard>
        )}

        {subscriptionMetrics && (
          <SectionCard title="Subscriptions">
            <StatRow label="Conversion Rate" value={fmtPct(subscriptionMetrics.conversionRate)} />
            <StatRow label="Active Trials" value={subscriptionMetrics.activeTrials?.toLocaleString() ?? "--"} />
            <StatRow label="Paid Users" value={subscriptionMetrics.paidUsers?.toLocaleString() ?? "--"} />
            <StatRow label="Churn Rate" value={fmtPct(subscriptionMetrics.churnRate)} />
            {subPieData.length > 0 && (
              <div className="mt-vara-sm">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={subPieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {subPieData.map((_, idx) => (
                        <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </SectionCard>
        )}

        {communityVitals && (
          <SectionCard title="Community Vitals">
            <StatRow label="Active Groups" value={communityVitals.activeGroups?.toLocaleString() ?? "--"} />
            <StatRow label="Avg Posts per Group" value={communityVitals.avgPostsPerGroup?.toFixed(1) ?? "--"} />
            <StatRow label="Connection Accept Rate" value={fmtPct(communityVitals.connectionAcceptRate)} />
            <StatRow label="Challenge Participation" value={communityVitals.challengeParticipation?.toLocaleString() ?? "--"} />
          </SectionCard>
        )}

        <JournalMetricsCard data={docs.journalMetrics} />
      </div>
    </div>
  );
}
