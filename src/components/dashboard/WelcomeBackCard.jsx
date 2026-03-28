/**
 * WelcomeBackCard
 * Shown on the Dashboard when a user returns after 48+ hours away.
 * Auto-dismisses after 6 seconds unless the user expands the education section.
 *
 * Brand: No guilt, no "we missed you", no days-away counting.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Info, X } from 'lucide-react';
import { getLapseMessage } from '../../constants/lapseEducation';

const LAPSE_COUNT_KEY = 'vara_lapse_count';

const HEADINGS = [
  'Good to see you.',
  'Welcome back.',
  "You're here.",
];

const BODIES = [
  'Nothing to catch up on. Just today.',
  'Pick up wherever feels right.',
  "Whenever you're ready.",
];

export default function WelcomeBackCard({ onDismiss }) {
  const headingRef = useRef(HEADINGS[Math.floor(Math.random() * HEADINGS.length)]);
  const bodyRef = useRef(BODIES[Math.floor(Math.random() * BODIES.length)]);
  const timerRef = useRef(null);

  const [expanded, setExpanded] = useState(false);
  const [lapseMessage, setLapseMessage] = useState('');

  useEffect(() => {
    // Read and increment lapse counter in localStorage
    const lapseCountStr = localStorage.getItem(LAPSE_COUNT_KEY);
    const lapseCount = lapseCountStr ? parseInt(lapseCountStr, 10) : 0;
    localStorage.setItem(LAPSE_COUNT_KEY, (lapseCount + 1).toString());
    setLapseMessage(getLapseMessage(lapseCount));

    // Auto-dismiss after 6 seconds
    timerRef.current = setTimeout(() => {
      onDismiss?.();
    }, 6000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleDismiss = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    onDismiss?.();
  };

  const handleExpandToggle = () => {
    if (!expanded && timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setExpanded(prev => !prev);
  };

  const handleCollapseOnly = () => {
    setExpanded(false);
    handleDismiss();
  };

  return (
    <div className="bg-white rounded-vara-lg p-6 shadow-vara-md border border-divider">
      <p className="text-lg font-semibold text-evergreen-teal mb-1">
        {headingRef.current}
      </p>
      <p className="text-sm text-muted-sage-gray">
        {bodyRef.current}
      </p>

      {/* Why habits can be hard toggle */}
      <button
        type="button"
        className="flex items-center gap-1.5 mt-3 text-soft-charcoal hover:opacity-70 transition-opacity"
        onClick={handleExpandToggle}
        aria-expanded={expanded}
        aria-label="Why habits can be hard"
      >
        <Info size={15} className="shrink-0" />
        <span className="text-[13px] font-semibold">Why habits can be hard</span>
      </button>

      {/* Expanded education section */}
      {expanded && (
        <div className="border-t border-border-light mt-3 pt-3 relative">
          <p className="text-sm text-soft-charcoal leading-relaxed pr-7">
            {lapseMessage}
          </p>
          <button
            type="button"
            className="absolute bottom-0 right-0 p-1 text-muted-sage-gray hover:opacity-70 transition-opacity"
            onClick={handleCollapseOnly}
            aria-label="Close explanation"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
