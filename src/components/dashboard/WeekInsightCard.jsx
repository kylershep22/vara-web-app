/**
 * WeekInsightCard
 * Template-driven correlation insight shown on the dashboard.
 * Features a 3px left accent bar and dismiss control.
 */

import React from 'react';
import { Lightbulb, ArrowRight, X } from 'lucide-react';

export default function WeekInsightCard({ headline, supporting, onPressFullStory, onDismiss }) {
  return (
    <div className="bg-white rounded-vara-lg border border-divider/30 shadow-vara-md overflow-hidden flex flex-row">
      {/* Left accent bar */}
      <div className="w-[3px] shrink-0 bg-evergreen-teal" />

      {/* Content */}
      <div className="flex-1 p-vara-lg relative">
        {/* Dismiss button */}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="absolute top-3 right-3 p-1 text-muted-sage-gray hover:opacity-70 transition-opacity"
            aria-label="Dismiss insight"
          >
            <X size={14} />
          </button>
        )}

        {/* Headline row */}
        <div className="flex items-start gap-2 pr-6">
          <Lightbulb size={15} className="text-evergreen-teal shrink-0 mt-0.5" />
          <p className="text-[15px] font-semibold text-soft-charcoal leading-snug">{headline}</p>
        </div>

        {/* Supporting text */}
        {supporting && (
          <p className="text-[13px] text-muted-sage-gray mt-2 leading-relaxed">{supporting}</p>
        )}

        {/* Full story link */}
        {onPressFullStory && (
          <button
            type="button"
            onClick={onPressFullStory}
            className="flex items-center gap-1 mt-3 text-[13px] text-evergreen-teal font-semibold hover:opacity-75 transition-opacity"
          >
            See your full week story
            <ArrowRight size={13} className="shrink-0" />
          </button>
        )}
      </div>
    </div>
  );
}
