// src/components/celebrations/StreakMilestoneModal.jsx
import React, { useMemo } from 'react';
import { X, Leaf } from 'lucide-react';

const ENGAGEMENT_MILESTONES = [7, 30, 60, 100];

const HEADINGS = [
  "You've been taking care of yourself.",
  "Showing up, even briefly, is worth something.",
  "Whatever brought you back, it counts.",
  "You're building something that matters.",
];

export function isEngagementMilestone(totalDays) {
  return ENGAGEMENT_MILESTONES.includes(totalDays);
}

export default function StreakMilestoneModal({ streak, isOpen, onClose }) {
  const heading = useMemo(() => {
    return HEADINGS[Math.floor(Math.random() * HEADINGS.length)];
  }, [isOpen]); // re-pick each time modal opens

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fadeIn">
      <div className="bg-white rounded-vara-lg shadow-vara-lg max-w-sm w-full p-vara-lg text-center relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-muted-sage-gray hover:text-soft-charcoal"
        >
          <X size={20} />
        </button>

        {/* Icon */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-dew-sage-light mb-4 text-evergreen-teal">
          <Leaf size={32} />
        </div>

        {/* Content */}
        <h3 className="text-vara-xl font-semibold text-soft-charcoal mb-2">
          {heading}
        </h3>
        <p className="text-vara-sm text-muted-sage-gray mb-6">
          Keep going at whatever pace works for you.
        </p>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-vara-md bg-evergreen-teal text-white font-medium hover:opacity-90 transition-opacity"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
