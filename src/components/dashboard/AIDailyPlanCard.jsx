/**
 * AIDailyPlanCard
 * AI-generated daily plan with generate button and expand/collapse toggle.
 */

import React from 'react';
import { Sparkles, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

export default function AIDailyPlanCard({ plan, generating, onGenerate, expanded, onToggleExpand }) {
  const hasplan = Boolean(plan?.trim());
  const firstLine = hasplan ? plan.split('\n')[0] : null;

  return (
    <div className="bg-white rounded-vara-lg shadow-vara-md border border-divider overflow-hidden">
      {/* Header row */}
      <div className="flex items-center justify-between p-vara-lg">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-evergreen-teal shrink-0" />
          <p className="text-[15px] font-semibold text-soft-charcoal">Daily Plan</p>
        </div>

        {hasplan && (
          <button
            type="button"
            onClick={onToggleExpand}
            className="p-1 text-muted-sage-gray hover:opacity-70 transition-opacity"
            aria-label={expanded ? 'Collapse plan' : 'Expand plan'}
            aria-expanded={expanded}
          >
            {expanded
              ? <ChevronUp size={18} />
              : <ChevronDown size={18} />
            }
          </button>
        )}
      </div>

      {/* Body */}
      <div className="px-vara-lg pb-vara-lg">
        {hasplan ? (
          <>
            {/* Collapsed: show first line */}
            {!expanded && (
              <p className="text-[13px] text-muted-sage-gray leading-relaxed line-clamp-2">
                {firstLine}
              </p>
            )}

            {/* Expanded: full plan */}
            {expanded && (
              <div className="bg-teal-light rounded-vara-lg p-vara-base">
                <p className="text-[13px] text-soft-charcoal leading-relaxed whitespace-pre-wrap">
                  {plan}
                </p>
              </div>
            )}
          </>
        ) : (
          <p className="text-[13px] text-muted-sage-gray leading-relaxed">
            Get a personalized plan based on your goals and habits for today.
          </p>
        )}

        {/* Generate button */}
        <button
          type="button"
          onClick={onGenerate}
          disabled={generating}
          className="mt-4 flex items-center justify-center gap-2 w-full py-2 px-4 rounded-vara-lg border border-evergreen-teal text-evergreen-teal text-[14px] font-semibold bg-white hover:bg-teal-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generating ? (
            <>
              <Loader2 size={15} className="animate-spin shrink-0" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles size={15} className="shrink-0" />
              {hasplan ? 'Regenerate Plan' : 'Generate Plan'}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
