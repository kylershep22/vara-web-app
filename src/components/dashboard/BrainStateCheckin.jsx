import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BRAIN_STATES } from "../../constants/brainStateProtocols";
import { useAuth } from "../../context/AuthContext";
import { useBrainStateWeekTrend } from "../../hooks/useBrainStateWeekTrend";

export default function BrainStateCheckin({ currentCheckIn, onSelect, loading }) {
  const [isExpanded, setIsExpanded] = useState(!currentCheckIn);
  const [showCaptured, setShowCaptured] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { days, summary } = useBrainStateWeekTrend(
    user?.uid,
    currentCheckIn?.brainState
  );

  useEffect(() => {
    setIsExpanded(!currentCheckIn);
  }, [currentCheckIn]);

  const handleSelect = (state) => {
    if (loading) return;
    onSelect(state);
    setShowCaptured(true);
    setTimeout(() => {
      setShowCaptured(false);
      setIsExpanded(false);
    }, 2000);
  };

  if (showCaptured) {
    return (
      <div className="bg-white rounded-vara-lg shadow-vara-md p-vara-lg border border-divider">
        <div className="flex items-center justify-center py-vara-lg">
          <span className="text-vara-base font-medium text-evergreen-teal">Captured.</span>
        </div>
      </div>
    );
  }

  if (!isExpanded && currentCheckIn) {
    const selectedState = BRAIN_STATES.find((s) => s.state === currentCheckIn.brainState);
    if (!selectedState) return null;

    return (
      <div className="bg-white rounded-vara-lg shadow-vara-md p-vara-lg border border-divider">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block"
              style={{ backgroundColor: selectedState.color }}
            />
            <span className="text-vara-sm font-semibold text-soft-charcoal">
              {selectedState.label}
            </span>
          </div>
          <button
            onClick={() => setIsExpanded(true)}
            className="text-vara-sm text-evergreen-teal font-medium hover:opacity-80"
          >
            Change
          </button>
        </div>

        {summary && (
          <div className="border-t border-divider mt-vara-base pt-vara-base">
            <div className="flex justify-between px-2">
              {days.map((day) => (
                <div key={day.date} className="flex flex-col items-center gap-1">
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block"
                    style={
                      day.color
                        ? { backgroundColor: day.color }
                        : { border: "1px solid #E5E7EB", backgroundColor: "transparent" }
                    }
                  />
                  <span className="text-[10px] text-muted-sage-gray">{day.dayLabel}</span>
                </div>
              ))}
            </div>
            <p className="text-vara-xs text-muted-sage-gray mt-vara-sm">{summary}</p>
            <button
              onClick={() => navigate("/insights")}
              className="text-vara-xs text-evergreen-teal mt-1 block ml-auto hover:opacity-80"
            >
              See your week →
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-vara-lg shadow-vara-md p-vara-lg border border-divider">
      <h2 className="text-vara-lg font-semibold text-soft-charcoal">
        How's your brain feeling?
      </h2>
      <p className="text-vara-xs text-muted-sage-gray mb-vara-lg">
        Just one tap. No wrong answers.
      </p>

      <div className="flex flex-col gap-vara-sm">
        {BRAIN_STATES.map((item) => (
          <button
            key={item.state}
            onClick={() => handleSelect(item.state)}
            disabled={loading}
            className={`flex items-center gap-3 px-vara-base py-vara-sm rounded-vara-md text-left transition-colors ${
              currentCheckIn?.brainState === item.state
                ? "bg-dew-sage-light"
                : "bg-gray-50 hover:bg-gray-100"
            }`}
          >
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <div>
              <span className="text-vara-sm font-semibold text-soft-charcoal block">
                {item.label}
              </span>
              <span className="text-vara-xs text-muted-sage-gray">
                {item.description}
              </span>
            </div>
          </button>
        ))}
      </div>

      {loading && (
        <div className="absolute inset-0 bg-white/90 flex items-center justify-center rounded-vara-lg">
          <span className="text-vara-sm text-muted-sage-gray">Saving...</span>
        </div>
      )}
    </div>
  );
}
