import React, { useState, useEffect } from "react";
import { Users, TrendingUp, CreditCard, Shield } from "lucide-react";
import { getAnalyticsDoc } from "../../services/db/admin.service";
import { getModerationStats } from "../../services/db/adminModeration.service";

export default function OverviewTab() {
  const [rolling, setRolling] = useState(null);
  const [subscriptionMetrics, setSubscriptionMetrics] = useState(null);
  const [moderationStats, setModerationStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        const [rollingDoc, subDoc, modStats] = await Promise.all([
          getAnalyticsDoc("rolling"),
          getAnalyticsDoc("subscriptionMetrics"),
          getModerationStats(),
        ]);

        if (!cancelled) {
          setRolling(rollingDoc);
          setSubscriptionMetrics(subDoc);
          setModerationStats(modStats);
        }
      } catch (err) {
        if (process.env.NODE_ENV === "development")
          console.error("OverviewTab fetch error:", err);
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
        Loading overview...
      </div>
    );
  }

  const hasData = rolling || subscriptionMetrics || moderationStats;

  if (!hasData) {
    return (
      <div className="border-2 border-dashed border-divider rounded-vara-lg p-vara-lg text-center text-muted-sage-gray text-vara-sm">
        No analytics data yet. Data will appear after the nightly aggregation
        runs.
      </div>
    );
  }

  const cards = [
    {
      icon: Users,
      title: "Total Users",
      value: rolling?.totalUsers?.toLocaleString() ?? "--",
      subtitle: rolling?.dau != null ? `${rolling.dau} active today` : null,
      urgent: false,
    },
    {
      icon: TrendingUp,
      title: "Weekly Active",
      value: rolling?.wau?.toLocaleString() ?? "--",
      subtitle:
        rolling?.retention7d != null
          ? `${(rolling.retention7d * 100).toFixed(1)}% 7-day retention`
          : null,
      urgent: false,
    },
    {
      icon: CreditCard,
      title: "Trial Conversion",
      value:
        subscriptionMetrics?.conversionRate != null
          ? `${(subscriptionMetrics.conversionRate * 100).toFixed(1)}%`
          : "--",
      subtitle:
        subscriptionMetrics?.activeTrials != null
          ? `${subscriptionMetrics.activeTrials} active trials`
          : null,
      urgent: false,
    },
    {
      icon: Shield,
      title: "Moderation Queue",
      value: moderationStats?.pendingCount?.toString() ?? "--",
      subtitle:
        moderationStats?.urgentCount != null
          ? `${moderationStats.urgentCount} urgent`
          : null,
      urgent: moderationStats?.urgentCount > 0,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-vara-base">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.title}
            className="border border-divider rounded-vara-lg p-vara-base bg-white"
          >
            <div className="flex items-center gap-vara-sm mb-vara-sm">
              <Icon
                size={20}
                className={
                  card.urgent ? "text-red-500" : "text-evergreen-teal"
                }
              />
              <span className="text-vara-xs text-muted-sage-gray font-medium">
                {card.title}
              </span>
            </div>
            <div
              className={`text-vara-2xl font-bold ${
                card.urgent ? "text-red-500" : "text-soft-charcoal"
              }`}
            >
              {card.value}
            </div>
            {card.subtitle && (
              <div className="text-vara-xs text-muted-sage-gray mt-vara-xs">
                {card.subtitle}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
