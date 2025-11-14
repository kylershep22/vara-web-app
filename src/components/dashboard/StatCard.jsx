// src/components/dashboard/StatCard.jsx
import React from 'react';

/**
 * StatCard - Gradient card for displaying metrics
 *
 * @param {React.ReactNode} icon - Icon component to display
 * @param {string} label - Card label/title
 * @param {string|number} value - Main metric value
 * @param {string} unit - Unit of measurement (optional)
 * @param {string} subtitle - Additional info text (optional)
 * @param {string} gradient - Tailwind gradient classes
 */
const StatCard = ({ icon, label, value, unit, subtitle, gradient }) => {
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${gradient} rounded-2xl p-6 text-white shadow-lg transition-transform hover:scale-[1.02] duration-200`}>
      {/* Decorative circles for visual interest */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
      <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-white/5 rounded-full blur-xl" />

      <div className="relative z-10">
        {/* Icon and Label */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 flex items-center justify-center">
            {icon}
          </div>
          <span className="text-sm font-medium opacity-90">{label}</span>
        </div>

        {/* Main Value */}
        <div className="flex items-baseline gap-2">
          <p className="text-3xl font-bold">
            {value}
          </p>
          {unit && (
            <span className="text-lg font-normal opacity-80">{unit}</span>
          )}
        </div>

        {/* Optional Subtitle */}
        {subtitle && (
          <p className="text-sm opacity-80 mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  );
};

export default StatCard;
