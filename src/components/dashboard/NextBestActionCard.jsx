/**
 * NextBestActionCard
 * Single intelligent recommendation shown on the dashboard.
 * Renders nothing if no recommendation is provided.
 */

import React from 'react';

export default function NextBestActionCard({ recommendation }) {
  if (!recommendation) return null;

  const { icon: Icon, title, subtitle, reason, actionLabel, onAction } = recommendation;

  return (
    <div className="bg-white rounded-vara-lg shadow-vara-md p-vara-lg border border-divider">
      <div className="flex items-start gap-vara-base">
        {Icon && (
          <div className="shrink-0 w-10 h-10 rounded-full bg-teal-light flex items-center justify-center">
            <Icon size={20} className="text-evergreen-teal" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold text-soft-charcoal leading-snug">{title}</p>
          {subtitle && (
            <p className="text-[13px] text-muted-sage-gray mt-0.5">{subtitle}</p>
          )}
          {reason && (
            <p className="text-[12px] text-muted-sage-gray mt-2 leading-relaxed">{reason}</p>
          )}
        </div>
      </div>

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 w-full py-2 px-4 rounded-vara-lg bg-evergreen-teal text-white text-[14px] font-semibold hover:opacity-90 transition-opacity"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
