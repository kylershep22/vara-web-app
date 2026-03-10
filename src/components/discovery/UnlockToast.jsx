// src/components/discovery/UnlockToast.jsx
// Toast notification when a new feature is unlocked
import React, { useEffect, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { FEATURE_METADATA } from '../../constants/featureUnlock';

export default function UnlockToast({ featureId, isVisible, onDismiss, autoDismissMs = 5000 }) {
  const [show, setShow] = useState(false);

  const meta = FEATURE_METADATA[featureId];

  useEffect(() => {
    if (isVisible) {
      // Small delay for entrance animation
      const enterTimer = setTimeout(() => setShow(true), 50);
      const dismissTimer = setTimeout(() => {
        setShow(false);
        setTimeout(() => onDismiss?.(), 300);
      }, autoDismissMs);

      return () => {
        clearTimeout(enterTimer);
        clearTimeout(dismissTimer);
      };
    } else {
      setShow(false);
    }
  }, [isVisible, autoDismissMs, onDismiss]);

  if (!isVisible || !meta) return null;

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
        show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <div className="bg-white rounded-vara-lg shadow-vara-lg border border-divider px-5 py-4 flex items-center gap-3 max-w-sm">
        <div className="w-10 h-10 rounded-full bg-sunrise-amber/10 flex items-center justify-center flex-shrink-0">
          <Sparkles className="text-sunrise-amber" size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-vara-sm font-medium text-soft-charcoal">
            New Feature Unlocked!
          </p>
          <p className="text-vara-xs text-muted-sage-gray">
            {meta.name} is now available
          </p>
        </div>
        <button
          onClick={() => { setShow(false); setTimeout(() => onDismiss?.(), 300); }}
          className="text-muted-sage-gray hover:text-soft-charcoal flex-shrink-0"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
