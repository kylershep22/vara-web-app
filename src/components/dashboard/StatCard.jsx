// src/components/dashboard/StatCard.jsx
import React from 'react';

/**
 * StatCard - Metric card matching mobile's stat card style
 * Uses Vara design tokens instead of arbitrary gradients.
 */
const StatCard = ({ icon, label, value, unit, subtitle }) => {
  return (
    <div className="bg-white rounded-vara-lg p-vara-lg shadow-vara-md border border-divider hover:shadow-vara-lg transition-shadow duration-200">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-10 h-10 flex items-center justify-center rounded-vara-md bg-teal-light text-evergreen-teal">
          {icon}
        </div>
        <span className="text-vara-sm font-medium text-muted-sage-gray">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <p className="text-vara-2xl font-bold text-soft-charcoal">{value}</p>
        {unit && <span className="text-vara-sm text-muted-sage-gray">{unit}</span>}
      </div>
      {subtitle && (
        <p className="text-vara-xs text-muted-sage-gray mt-1">{subtitle}</p>
      )}
    </div>
  );
};

export default StatCard;
