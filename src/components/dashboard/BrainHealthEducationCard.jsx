/**
 * BrainHealthEducationCard
 * Daily rotating brain health fact and tip.
 * Rotates by day-of-year so all users see the same card each day.
 */

import React from 'react';
import { EDUCATION_CARD_ITEMS } from '../../constants/brainInsightsCopy';

const dayOfYear = Math.floor(
  (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
);

export default function BrainHealthEducationCard() {
  const item = EDUCATION_CARD_ITEMS[dayOfYear % EDUCATION_CARD_ITEMS.length];

  if (!item) return null;

  return (
    <div
      className="rounded-vara-lg p-vara-lg"
      style={{
        backgroundColor: 'rgba(213, 227, 209, 0.40)',
        borderLeft: '3.5px solid #1a7a6e',
      }}
    >
      {/* Pillar label */}
      <p className="text-[11px] font-semibold uppercase tracking-wide text-evergreen-teal mb-1">
        {item.label}
      </p>

      {/* Title */}
      <p className="text-[15px] font-semibold text-soft-charcoal leading-snug">{item.title}</p>

      {/* Fact */}
      <p className="text-[13px] text-soft-charcoal mt-2 leading-relaxed">{item.fact}</p>

      {/* Tip */}
      <div className="mt-3">
        <span className="text-[13px] font-semibold text-evergreen-teal">Try this: </span>
        <span className="text-[13px] text-soft-charcoal">{item.tip}</span>
      </div>

      {/* Learn more link */}
      <button
        type="button"
        className="mt-3 text-[13px] text-evergreen-teal font-semibold hover:opacity-75 transition-opacity"
        onClick={() => {/* navigation handled by parent if needed */}}
      >
        Learn more
      </button>
    </div>
  );
}
