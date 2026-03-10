// src/components/celebrations/AnimatedCheckbox.jsx
import React, { useState } from 'react';
import { Check } from 'lucide-react';

export default function AnimatedCheckbox({ checked, onChange, size = 24, className = '' }) {
  const [animating, setAnimating] = useState(false);

  const handleClick = () => {
    if (!checked) {
      setAnimating(true);
      setTimeout(() => setAnimating(false), 600);
    }
    onChange?.(!checked);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`relative inline-flex items-center justify-center rounded-vara-md transition-all duration-300 ${
        checked
          ? 'bg-evergreen-teal border-evergreen-teal'
          : 'bg-white border-2 border-divider hover:border-evergreen-teal/50'
      } ${animating ? 'scale-125' : 'scale-100'} ${className}`}
      style={{ width: size, height: size }}
    >
      {checked && (
        <Check
          size={size * 0.6}
          className={`text-white transition-all duration-300 ${
            animating ? 'scale-110 opacity-100' : 'scale-100 opacity-100'
          }`}
          strokeWidth={3}
        />
      )}

      {/* Celebration ring animation */}
      {animating && (
        <span
          className="absolute inset-0 rounded-vara-md border-2 border-evergreen-teal animate-ping opacity-50"
          style={{ animationDuration: '0.6s', animationIterationCount: 1 }}
        />
      )}
    </button>
  );
}
