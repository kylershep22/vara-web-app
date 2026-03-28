// src/components/celebrations/QuietFinish.jsx
// Shown when all habits for the day are completed - a calm, satisfying state
import React, { useEffect, useRef } from 'react';
import { Check } from 'lucide-react';

const MESSAGES = [
  "Done for today. Well done.",
  "You showed up. That matters.",
  "A good day. Rest easy.",
  "Taken care of. Nicely.",
  "That's all for today.",
];

export default function QuietFinish({ onDismiss }) {
  const message = useRef(MESSAGES[Math.floor(Math.random() * MESSAGES.length)]).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss?.();
    }, 2500);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="bg-gradient-to-br from-dew-sage-light to-teal-light rounded-vara-lg p-vara-lg text-center border border-divider">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-evergreen-teal/10 mb-4">
        <Check className="text-evergreen-teal" size={28} strokeWidth={2.5} />
      </div>

      <h3 className="text-vara-lg font-semibold text-soft-charcoal">
        {message}
      </h3>
    </div>
  );
}
