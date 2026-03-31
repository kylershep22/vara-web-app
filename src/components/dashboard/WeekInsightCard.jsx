import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lightbulb, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useWeeklyCorrelations } from "../../hooks/useWeeklyCorrelations";
import { selectInsight } from "../../constants/weekInsightTemplates";

const DISMISS_KEY = "vara_week_insight_dismissed";

export default function WeekInsightCard() {
  const { user } = useAuth();
  const { data, loading } = useWeeklyCorrelations(user?.uid);
  const navigate = useNavigate();

  const [dismissed, setDismissed] = useState(() => {
    const stored = localStorage.getItem(DISMISS_KEY);
    if (!stored) return false;
    const parsed = JSON.parse(stored);
    return Date.now() - parsed.timestamp < 7 * 24 * 60 * 60 * 1000;
  });

  if (loading || dismissed) return null;

  const insight = selectInsight(data);
  if (!insight) return null;

  function handleDismiss() {
    localStorage.setItem(DISMISS_KEY, JSON.stringify({ timestamp: Date.now() }));
    setDismissed(true);
  }

  return (
    <div className="bg-white rounded-vara-lg shadow-vara-md border-l-[3px] border-l-evergreen-teal border border-divider p-vara-lg">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <Lightbulb size={20} className="text-evergreen-teal mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-soft-charcoal">{insight.headline}</p>
            <p className="text-sm text-muted-sage-gray mt-1">{insight.detail}</p>
            <button
              onClick={() => navigate("/insights")}
              className="text-xs text-evergreen-teal hover:underline mt-2 inline-block"
            >
              See your full week story
            </button>
          </div>
        </div>
        <button onClick={handleDismiss} className="text-muted-sage-gray hover:text-soft-charcoal flex-shrink-0">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
