import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function OverviewCard({ icon: Icon, title, value, subtitle, trendPct, urgent, invertTrend }) {
  let TrendIcon = Minus;
  let trendColor = "text-muted-sage-gray";
  let trendLabel = "";

  if (trendPct != null && Math.abs(trendPct) >= 0.05) {
    const isUp = trendPct > 0;
    const isGood = invertTrend ? !isUp : isUp;
    TrendIcon = isUp ? TrendingUp : TrendingDown;
    trendColor = isGood ? "text-emerald-600" : "text-red-500";
    trendLabel = `${isUp ? "+" : ""}${(trendPct * 100).toFixed(1)}%`;
  } else if (trendPct != null) {
    trendLabel = "flat";
  }

  return (
    <div className="border border-divider rounded-vara-lg p-vara-base bg-white">
      <div className="flex items-center gap-vara-sm mb-vara-sm">
        <Icon size={20} className={urgent ? "text-red-500" : "text-evergreen-teal"} />
        <span className="text-vara-xs text-muted-sage-gray font-medium">{title}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className={`text-vara-2xl font-bold ${urgent ? "text-red-500" : "text-soft-charcoal"}`}>
          {value}
        </span>
        {trendLabel && (
          <span className={`inline-flex items-center gap-0.5 text-vara-xs font-medium ${trendColor}`}>
            <TrendIcon size={14} />
            {trendLabel}
          </span>
        )}
      </div>
      {subtitle && (
        <div className="text-vara-xs text-muted-sage-gray mt-vara-xs">{subtitle}</div>
      )}
    </div>
  );
}
