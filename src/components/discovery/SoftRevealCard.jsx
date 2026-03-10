// src/components/discovery/SoftRevealCard.jsx
// Teases an upcoming feature that will unlock soon
import React from 'react';
import { Lock, Clock } from 'lucide-react';
import { FEATURE_METADATA } from '../../constants/featureUnlock';

export default function SoftRevealCard({ featureId, daysUntilUnlock, className = '' }) {
  const meta = FEATURE_METADATA[featureId];
  if (!meta) return null;

  return (
    <div className={`bg-white/60 backdrop-blur-sm rounded-vara-lg p-vara-base border border-divider relative overflow-hidden ${className}`}>
      {/* Frosted overlay */}
      <div className="absolute inset-0 bg-mist-white/40 backdrop-blur-[2px] z-10" />

      <div className="relative z-20 flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-dew-sage-light flex items-center justify-center flex-shrink-0">
          <Lock className="text-muted-sage-gray" size={18} />
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-vara-sm font-medium text-soft-charcoal">
            {meta.name}
          </h4>
          <p className="text-vara-xs text-muted-sage-gray mt-0.5">
            {meta.description}
          </p>

          {daysUntilUnlock > 0 && (
            <div className="flex items-center gap-1 mt-2 text-[11px] text-muted-sage-gray">
              <Clock size={12} />
              <span>Unlocks in {daysUntilUnlock} day{daysUntilUnlock !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
