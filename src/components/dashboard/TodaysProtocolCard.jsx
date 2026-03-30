import React, { useState } from "react";
import { CheckCircle2, Circle, Clock, Wind, RotateCcw, Lightbulb } from "lucide-react";
import { getProtocolForState } from "../../constants/brainStateProtocols";

const CATEGORY_ICONS = {
  breathwork: Wind,
  reset: RotateCcw,
  reflection: Lightbulb,
};

export default function TodaysProtocolCard({ brainState, protocolCompleted, onComplete }) {
  const [showInstructions, setShowInstructions] = useState(false);
  const protocol = getProtocolForState(brainState);
  if (!protocol) return null;

  const Icon = CATEGORY_ICONS[protocol.category] || Lightbulb;

  return (
    <div className="bg-white rounded-vara-lg shadow-vara-md p-vara-lg border border-divider">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-vara-md bg-teal-light flex items-center justify-center flex-shrink-0">
            <Icon size={20} className="text-evergreen-teal" />
          </div>
          <div>
            <h3 className="text-vara-sm font-semibold text-soft-charcoal">
              {protocol.name}
            </h3>
            <p className="text-vara-xs text-muted-sage-gray mt-0.5">
              {protocol.description}
            </p>
            <div className="flex items-center gap-1 mt-1">
              <Clock size={12} className="text-muted-sage-gray" />
              <span className="text-vara-xs text-muted-sage-gray">{protocol.duration}</span>
            </div>
          </div>
        </div>

        <button
          onClick={onComplete}
          disabled={protocolCompleted}
          className="flex-shrink-0 ml-3"
        >
          {protocolCompleted ? (
            <CheckCircle2 size={24} className="text-evergreen-teal" />
          ) : (
            <Circle size={24} className="text-muted-sage-gray hover:text-evergreen-teal transition-colors" />
          )}
        </button>
      </div>

      <button
        onClick={() => setShowInstructions(!showInstructions)}
        className="text-vara-xs text-evergreen-teal mt-vara-sm hover:opacity-80"
      >
        {showInstructions ? "Hide steps" : "Show steps"}
      </button>

      {showInstructions && (
        <ol className="mt-vara-sm space-y-2 pl-5 list-decimal">
          {protocol.instructions.map((step, i) => (
            <li key={i} className="text-vara-xs text-soft-charcoal">{step}</li>
          ))}
        </ol>
      )}
    </div>
  );
}
