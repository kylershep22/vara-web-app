// src/components/dashboard/TimeFilter.jsx

import React from 'react';

const TimeFilter = ({ currentView, onViewChange }) => {
  const views = [
    { id: 'daily', label: 'Daily' },
    { id: 'weekly', label: 'Weekly' },
    { id: 'monthly', label: 'Monthly' },
    { id: 'yearly', label: 'Yearly' }
  ];

  return (
    <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg w-fit">
      {views.map(view => (
        <button
          key={view.id}
          onClick={() => onViewChange(view.id)}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            currentView === view.id
              ? 'bg-white text-[#1B5E57] shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {view.label}
        </button>
      ))}
    </div>
  );
};

export default TimeFilter;
