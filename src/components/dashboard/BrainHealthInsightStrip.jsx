/**
 * BrainHealthInsightStrip
 * Single-line rotating brain health insight shown on the dashboard.
 * Picks a random message on mount and holds it for the session.
 */

import React, { useMemo } from 'react';
import { Leaf } from 'lucide-react';
import { INSIGHT_STRIP_MESSAGES } from '../../constants/brainInsightsCopy';

export default function BrainHealthInsightStrip() {
  const message = useMemo(() => {
    const index = Math.floor(Math.random() * INSIGHT_STRIP_MESSAGES.length);
    return INSIGHT_STRIP_MESSAGES[index];
  }, []);

  return (
    <div
      className="flex items-center gap-2 rounded-vara-md px-vara-base py-vara-sm"
      style={{ backgroundColor: 'rgba(213, 227, 209, 0.55)' }}
    >
      <Leaf size={14} className="text-evergreen-teal shrink-0" />
      <p className="text-sm text-soft-charcoal leading-relaxed">{message}</p>
    </div>
  );
}
