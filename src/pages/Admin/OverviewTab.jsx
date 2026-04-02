import React, { useState, useEffect } from "react";
import { Users, Activity, CheckCircle2, Brain, UserCheck, BarChart3, CreditCard, Shield } from "lucide-react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../firebase";
import { getAnalyticsDoc, getDailySnapshots, runClientAggregation } from "../../services/db/admin.service";
import { getModerationStats } from "../../services/db/adminModeration.service";
import OverviewCard from "../../components/admin/OverviewCard";

function computeTrend(currentValue, snapshots, field) {
  if (!snapshots || snapshots.length < 2) return null;
  const values = snapshots.map(s => s[field]).filter(v => v != null);
  if (values.length === 0) return null;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  if (avg === 0) return currentValue > 0 ? 1 : null;
  return (currentValue - avg) / avg;
}

export default function OverviewTab() {
  const [rolling, setRolling] = useState(null);
  const [subscriptionMetrics, setSubscriptionMetrics] = useState(null);
  const [wellnessSignal, setWellnessSignal] = useState(null);
  const [habitHealth, setHabitHealth] = useState(null);
  const [lifecycleFunnel, setLifecycleFunnel] = useState(null);
  const [moderationStats, setModerationStats] = useState(null);
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchAll() {
    const [rollingDoc, subDoc, wellDoc, habitDoc, funnelDoc, modStats, snaps] = await Promise.all([
      getAnalyticsDoc("rolling"),
      getAnalyticsDoc("subscriptionMetrics"),
      getAnalyticsDoc("wellnessSignal"),
      getAnalyticsDoc("habitHealth"),
      getAnalyticsDoc("lifecycleFunnel"),
      getModerationStats(),
      getDailySnapshots(7),
    ]);
    return { rollingDoc, subDoc, wellDoc, habitDoc, funnelDoc, modStats, snaps };
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let data = await fetchAll();
        if (!data.rollingDoc) {
          try { await runClientAggregation(); data = await fetchAll(); } catch {}
        }
        if (!cancelled) {
          setRolling(data.rollingDoc);
          setSubscriptionMetrics(data.subDoc);
          setWellnessSignal(data.wellDoc);
          setHabitHealth(data.habitDoc);
          setLifecycleFunnel(data.funnelDoc);
          setModerationStats(data.modStats);
          setSnapshots(data.snaps);
        }
      } catch (err) {
        if (process.env.NODE_ENV === "development") console.error("OverviewTab fetch error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      try {
        const triggerFn = httpsCallable(functions, "triggerAggregation");
        await triggerFn();
      } catch {
        await runClientAggregation();
      }
      const data = await fetchAll();
      setRolling(data.rollingDoc);
      setSubscriptionMetrics(data.subDoc);
      setWellnessSignal(data.wellDoc);
      setHabitHealth(data.habitDoc);
      setLifecycleFunnel(data.funnelDoc);
      setModerationStats(data.modStats);
      setSnapshots(data.snaps);
    } catch (err) {
      console.error("Failed to refresh analytics:", err);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return <div className="text-muted-sage-gray text-vara-sm py-vara-lg">Loading overview...</div>;
  }

  const hasData = rolling || subscriptionMetrics || moderationStats;

  const refreshButton = (
    <div className="flex justify-end">
      <button onClick={handleRefresh} disabled={refreshing}
        className="inline-flex items-center gap-vara-sm px-vara-base py-2 text-vara-sm font-medium text-evergreen-teal border border-evergreen-teal rounded-vara-lg hover:bg-dew-sage-light transition-colors disabled:opacity-50">
        {refreshing ? "Refreshing..." : "Refresh Analytics"}
      </button>
    </div>
  );

  if (!hasData) {
    return (
      <div className="space-y-vara-base">
        {refreshButton}
        <div className="border-2 border-dashed border-divider rounded-vara-lg p-vara-lg text-center text-muted-sage-gray text-vara-sm">
          No analytics data yet. Click Refresh Analytics to generate.
        </div>
      </div>
    );
  }

  const totalUsers = rolling?.totalUsers ?? 0;
  const dau = rolling?.dau ?? 0;
  const habitRate = habitHealth?.avgCompletionRate;
  const checkinRate = wellnessSignal?.brainStateCheckinRate;
  const onboardingRate = totalUsers > 0 && lifecycleFunnel
    ? lifecycleFunnel.onboardingComplete / totalUsers : null;
  const retention = rolling?.retention7d;
  const conversion = subscriptionMetrics?.conversionRate;

  const oldestSnap = snapshots[0];
  const newThisWeek = oldestSnap?.totalUsers != null ? totalUsers - oldestSnap.totalUsers : null;

  const cards = [
    {
      icon: Users, title: "Total Users",
      value: totalUsers.toLocaleString(),
      subtitle: newThisWeek != null ? `+${newThisWeek} this week` : null,
      trendPct: computeTrend(totalUsers, snapshots, "totalUsers"),
    },
    {
      icon: Activity, title: "Daily Active Users",
      value: dau.toLocaleString(),
      subtitle: `${dau} of ${totalUsers} total`,
      trendPct: computeTrend(dau, snapshots, "dau"),
    },
    {
      icon: CheckCircle2, title: "Habit Completion Rate",
      value: habitRate != null ? `${(habitRate * 100).toFixed(1)}%` : "--",
      subtitle: null,
      trendPct: computeTrend(habitRate, snapshots, "habitCompletionRate"),
    },
    {
      icon: Brain, title: "Brain State Check-in",
      value: checkinRate != null ? `${(checkinRate * 100).toFixed(1)}%` : "--",
      subtitle: null,
      trendPct: computeTrend(checkinRate, snapshots, "brainStateCheckinRate"),
    },
    {
      icon: UserCheck, title: "Onboarding Completion",
      value: onboardingRate != null ? `${(onboardingRate * 100).toFixed(1)}%` : "--",
      subtitle: lifecycleFunnel ? `${lifecycleFunnel.onboardingComplete} completed, ${totalUsers - lifecycleFunnel.onboardingComplete} pending` : null,
      trendPct: computeTrend(onboardingRate, snapshots, "onboardingCompletionRate"),
    },
    {
      icon: BarChart3, title: "7-Day Retention",
      value: retention != null ? `${(retention * 100).toFixed(1)}%` : "--",
      subtitle: null,
      trendPct: computeTrend(retention, snapshots, "retention7d"),
    },
    {
      icon: CreditCard, title: "Trial Conversion",
      value: conversion != null ? `${(conversion * 100).toFixed(1)}%` : "--",
      subtitle: subscriptionMetrics?.activeTrials != null ? `${subscriptionMetrics.activeTrials} active trials` : null,
      trendPct: computeTrend(conversion, snapshots, "conversionRate"),
    },
    {
      icon: Shield, title: "Moderation Queue",
      value: moderationStats?.pendingCount?.toString() ?? "--",
      subtitle: moderationStats?.urgentCount > 0 ? `${moderationStats.urgentCount} urgent` : null,
      urgent: moderationStats?.urgentCount > 0,
    },
  ];

  return (
    <div className="space-y-vara-base">
      {refreshButton}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-vara-base">
        {cards.map((card) => (
          <OverviewCard key={card.title} {...card} />
        ))}
      </div>
    </div>
  );
}
