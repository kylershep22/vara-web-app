// src/components/celebrations/StreakMilestoneModal.jsx
import React, { useEffect, useState } from 'react';
import { X, Flame, Star, Trophy, Crown } from 'lucide-react';

const milestoneConfig = {
  3: { icon: Flame, label: '3-Day Streak!', message: "You're building momentum. Keep it up!", color: 'text-orange-500' },
  7: { icon: Star, label: '1-Week Streak!', message: "A full week of consistency. That's real dedication.", color: 'text-yellow-500' },
  14: { icon: Trophy, label: '2-Week Streak!', message: "Two weeks strong. You're forming lasting habits.", color: 'text-evergreen-teal' },
  30: { icon: Crown, label: '30-Day Streak!', message: "One month! This habit is becoming part of who you are.", color: 'text-purple-500' },
  60: { icon: Crown, label: '60-Day Streak!', message: "Two months of dedication. Incredible commitment.", color: 'text-purple-600' },
  100: { icon: Crown, label: '100-Day Streak!', message: "Triple digits! You've truly transformed this into a lifestyle.", color: 'text-amber-500' },
};

export default function StreakMilestoneModal({ streak, habitName, isOpen, onClose }) {
  const [showConfetti, setShowConfetti] = useState(false);

  const config = milestoneConfig[streak] || {
    icon: Flame,
    label: `${streak}-Day Streak!`,
    message: `${streak} days of consistency. Amazing work!`,
    color: 'text-evergreen-teal',
  };

  const Icon = config.icon;

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fadeIn">
      <div className="bg-white rounded-vara-lg shadow-vara-lg max-w-sm w-full p-vara-lg text-center relative overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-muted-sage-gray hover:text-soft-charcoal"
        >
          <X size={20} />
        </button>

        {/* Confetti dots */}
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {Array.from({ length: 20 }).map((_, i) => (
              <span
                key={i}
                className="absolute w-2 h-2 rounded-full animate-confetti"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: '-8px',
                  backgroundColor: ['#1B5E57', '#E8A838', '#B8CDBA', '#D5E3D1', '#8B5CF6'][i % 5],
                  animationDelay: `${Math.random() * 0.5}s`,
                  animationDuration: `${1 + Math.random()}s`,
                }}
              />
            ))}
          </div>
        )}

        {/* Icon */}
        <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-dew-sage-light mb-4 ${config.color}`}>
          <Icon size={32} />
        </div>

        {/* Content */}
        <h3 className="text-vara-xl font-semibold text-soft-charcoal mb-2">
          {config.label}
        </h3>
        {habitName && (
          <p className="text-vara-sm text-evergreen-teal font-medium mb-2">
            {habitName}
          </p>
        )}
        <p className="text-vara-sm text-muted-sage-gray mb-6">
          {config.message}
        </p>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-vara-md bg-evergreen-teal text-white font-medium hover:opacity-90 transition-opacity"
        >
          Keep Going
        </button>
      </div>
    </div>
  );
}
