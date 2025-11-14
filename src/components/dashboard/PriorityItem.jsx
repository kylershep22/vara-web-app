// src/components/dashboard/PriorityItem.jsx
import React from 'react';
import { Check, Flame } from 'lucide-react';

/**
 * PriorityItem - Unified component for displaying habits and tasks
 *
 * @param {string} type - 'habit' or 'task'
 * @param {string} title - Item title/name
 * @param {number} streak - Habit streak count (optional)
 * @param {string} dueDate - Task due date string (optional)
 * @param {string} goalBadge - Linked goal name (optional)
 * @param {boolean} completed - Completion status
 * @param {function} onComplete - Callback when checkbox clicked
 * @param {string} frequency - Habit frequency display (optional)
 */
const PriorityItem = ({
  type,
  title,
  streak,
  dueDate,
  goalBadge,
  completed,
  onComplete,
  frequency
}) => {
  return (
    <div
      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 ${
        completed
          ? 'border-green-200 bg-green-50'
          : 'border-gray-200 bg-white hover:border-[#1B5E57] hover:shadow-md'
      }`}
    >
      {/* Checkbox */}
      <button
        onClick={onComplete}
        className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
          completed
            ? 'bg-green-500 border-green-500 scale-110'
            : 'border-gray-300 hover:border-[#1B5E57] hover:scale-110'
        }`}
        aria-label={completed ? 'Mark as incomplete' : 'Mark as complete'}
      >
        {completed && <Check size={16} className="text-white" />}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Title */}
        <p
          className={`font-medium transition-all duration-200 ${
            completed ? 'text-gray-500 line-through' : 'text-gray-900'
          }`}
        >
          {title}
        </p>

        {/* Metadata Row */}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {/* Type Badge */}
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              type === 'habit'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-blue-100 text-blue-700'
            }`}
          >
            {type === 'habit' ? 'Habit' : 'Task'}
          </span>

          {/* Streak (for habits) */}
          {streak > 0 && (
            <span className="text-xs text-orange-600 font-semibold flex items-center gap-1">
              <Flame size={12} className="text-orange-500" />
              {streak} {streak === 1 ? 'day' : 'days'}
            </span>
          )}

          {/* Frequency (for habits) */}
          {frequency && (
            <span className="text-xs text-gray-500">
              {frequency}
            </span>
          )}

          {/* Goal Badge (for tasks) */}
          {goalBadge && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium">
              {goalBadge}
            </span>
          )}

          {/* Due Date (for tasks) */}
          {dueDate && (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              Due: {dueDate}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default PriorityItem;
