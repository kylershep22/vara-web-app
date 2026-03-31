import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { getAnalyticsDoc } from "../../services/db/admin.service";

const CHART_COLORS = [
  "#2A7C6F",
  "#A8D5BA",
  "#6BB8A4",
  "#D4E8D0",
  "#4A9E8E",
  "#C1DABE",
];

function StatRow({ label, value }) {
  return (
    <div className="flex justify-between items-center py-vara-sm border-b border-divider last:border-b-0">
      <span className="text-vara-sm text-muted-sage-gray">{label}</span>
      <span className="text-vara-sm font-medium text-soft-charcoal">
        {value}
      </span>
    </div>
  );
}

function SectionCard({ title, children }) {
  return (
    <div className="border border-divider rounded-vara-lg p-vara-base bg-white">
      <h3 className="text-vara-lg font-semibold text-soft-charcoal mb-vara-sm">
        {title}
      </h3>
      {children}
    </div>
  );
}

function NoData() {
  return (
    <div className="border-2 border-dashed border-divider rounded-vara-lg p-vara-lg text-center text-muted-sage-gray text-vara-sm">
      No analytics data yet. Data will appear after the nightly aggregation
      runs.
    </div>
  );
}

function fmtPct(val) {
  if (val == null) return "--";
  return `${(val * 100).toFixed(1)}%`;
}

export default function AnalyticsTab() {
  const [rolling, setRolling] = useState(null);
  const [subscriptionMetrics, setSubscriptionMetrics] = useState(null);
  const [featureAdoption, setFeatureAdoption] = useState(null);
  const [communityVitals, setCommunityVitals] = useState(null);
  const [contentPerformance, setContentPerformance] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        const [rollingDoc, subDoc, featDoc, commDoc, contentDoc] =
          await Promise.all([
            getAnalyticsDoc("rolling"),
            getAnalyticsDoc("subscriptionMetrics"),
            getAnalyticsDoc("featureAdoption"),
            getAnalyticsDoc("communityVitals"),
            getAnalyticsDoc("contentPerformance"),
          ]);

        if (!cancelled) {
          setRolling(rollingDoc);
          setSubscriptionMetrics(subDoc);
          setFeatureAdoption(featDoc);
          setCommunityVitals(commDoc);
          setContentPerformance(contentDoc);
        }
      } catch (err) {
        if (process.env.NODE_ENV === "development")
          console.error("AnalyticsTab fetch error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="text-muted-sage-gray text-vara-sm py-vara-lg">
        Loading analytics...
      </div>
    );
  }

  const hasData =
    rolling ||
    subscriptionMetrics ||
    featureAdoption ||
    communityVitals ||
    contentPerformance;

  if (!hasData) {
    return <NoData />;
  }

  // Subscription pie chart data
  const subPieData = subscriptionMetrics
    ? [
        { name: "Trial", value: subscriptionMetrics.activeTrials || 0 },
        { name: "Premium", value: subscriptionMetrics.paidUsers || 0 },
        { name: "Coaching", value: subscriptionMetrics.coachingUsers || 0 },
        { name: "Expired", value: subscriptionMetrics.expiredUsers || 0 },
      ].filter((d) => d.value > 0)
    : [];

  // Feature adoption bar chart data
  const adoptionBarData = featureAdoption
    ? [
        { name: "Goals", pct: (featureAdoption.pctWithGoals || 0) * 100 },
        { name: "Habits", pct: (featureAdoption.pctWithHabits || 0) * 100 },
        { name: "Journal", pct: (featureAdoption.pctWithJournal || 0) * 100 },
        { name: "Tasks", pct: (featureAdoption.pctWithTasks || 0) * 100 },
        {
          name: "Community",
          pct: (featureAdoption.pctWithCommunity || 0) * 100,
        },
      ]
    : [];

  // Top content
  const topContent = contentPerformance?.topItems?.slice(0, 5) || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-vara-base">
      {/* User Health */}
      {rolling && (
        <SectionCard title="User Health">
          <StatRow
            label="Total Users"
            value={rolling.totalUsers?.toLocaleString() ?? "--"}
          />
          <StatRow
            label="DAU"
            value={rolling.dau?.toLocaleString() ?? "--"}
          />
          <StatRow
            label="WAU"
            value={rolling.wau?.toLocaleString() ?? "--"}
          />
          <StatRow
            label="MAU"
            value={rolling.mau?.toLocaleString() ?? "--"}
          />
          <StatRow
            label="7-Day Retention"
            value={fmtPct(rolling.retention7d)}
          />
          <StatRow
            label="30-Day Retention"
            value={fmtPct(rolling.retention30d)}
          />
        </SectionCard>
      )}

      {/* Subscriptions */}
      {subscriptionMetrics && (
        <SectionCard title="Subscriptions">
          <StatRow
            label="Conversion Rate"
            value={fmtPct(subscriptionMetrics.conversionRate)}
          />
          <StatRow
            label="Active Trials"
            value={subscriptionMetrics.activeTrials?.toLocaleString() ?? "--"}
          />
          <StatRow
            label="Paid Users"
            value={subscriptionMetrics.paidUsers?.toLocaleString() ?? "--"}
          />
          <StatRow
            label="Churn Rate"
            value={fmtPct(subscriptionMetrics.churnRate)}
          />
          {subPieData.length > 0 && (
            <div className="mt-vara-sm">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={subPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {subPieData.map((_, idx) => (
                      <Cell
                        key={idx}
                        fill={CHART_COLORS[idx % CHART_COLORS.length]}
                      />
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

      {/* Feature Adoption */}
      {featureAdoption && (
        <SectionCard title="Feature Adoption">
          <StatRow
            label="Avg Habits per User"
            value={featureAdoption.avgHabitsPerUser?.toFixed(1) ?? "--"}
          />
          <StatRow
            label="Avg Completion Rate"
            value={fmtPct(featureAdoption.avgCompletionRate)}
          />
          {adoptionBarData.length > 0 && (
            <div className="mt-vara-sm">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={adoptionBarData}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip formatter={(v) => `${v.toFixed(1)}%`} />
                  <Bar dataKey="pct" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>
      )}

      {/* Community */}
      {communityVitals && (
        <SectionCard title="Community">
          <StatRow
            label="Active Groups"
            value={communityVitals.activeGroups?.toLocaleString() ?? "--"}
          />
          <StatRow
            label="Avg Posts per Group"
            value={communityVitals.avgPostsPerGroup?.toFixed(1) ?? "--"}
          />
          <StatRow
            label="Connection Accept Rate"
            value={fmtPct(communityVitals.connectionAcceptRate)}
          />
          <StatRow
            label="Challenge Participation"
            value={
              communityVitals.challengeParticipation?.toLocaleString() ?? "--"
            }
          />
        </SectionCard>
      )}

      {/* Content Performance */}
      {contentPerformance && topContent.length > 0 && (
        <SectionCard title="Content Performance">
          <p className="text-vara-xs text-muted-sage-gray mb-vara-sm">
            Top 5 content items by play count
          </p>
          {topContent.map((item, idx) => (
            <StatRow
              key={idx}
              label={item.title || `Item ${idx + 1}`}
              value={`${item.playCount?.toLocaleString() ?? 0} plays`}
            />
          ))}
        </SectionCard>
      )}
    </div>
  );
}
