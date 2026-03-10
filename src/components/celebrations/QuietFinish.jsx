// src/components/celebrations/QuietFinish.jsx
// Shown when all habits for the day are completed - a calm, satisfying state
import React from 'react';
import { CheckCircle, Sparkles } from 'lucide-react';

export default function QuietFinish({ onDismiss }) {
  return (
    <div className="bg-gradient-to-br from-dew-sage-light to-teal-light rounded-vara-lg p-vara-lg text-center border border-divider">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-evergreen-teal/10 mb-4">
        <CheckCircle className="text-evergreen-teal" size={28} />
      </div>

      <div className="flex items-center justify-center gap-2 mb-2">
        <Sparkles className="text-sunrise-amber" size={16} />
        <h3 className="text-vara-lg font-semibold text-soft-charcoal">
          All done for today
        </h3>
        <Sparkles className="text-sunrise-amber" size={16} />
      </div>

      <p className="text-vara-sm text-muted-sage-gray mb-4">
        Every habit checked off. Take a moment to appreciate your consistency.
      </p>

      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-vara-sm text-evergreen-teal hover:text-evergreen-teal/80 font-medium"
        >
          Dismiss
        </button>
      )}
    </div>
  );
}
