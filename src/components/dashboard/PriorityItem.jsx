// src/components/dashboard/PriorityItem.jsx
import React from 'react';
import { Check, Flame, Edit2 } from 'lucide-react';

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
 * @param {function} onEdit - Callback when edit button clicked (optional)
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
  onEdit,
  frequency
}) => {
  return (
    <div
      className={`group flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 ${
        completed
          ? 'border-silver-sage bg-teal-light'
          : 'border-divider bg-white hover:border-evergreen-teal hover:shadow-md'
      }`}
    >
      {/* Checkbox */}
      <button
        onClick={onComplete}
        className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
          completed
            ? 'bg-evergreen-teal border-evergreen-teal scale-110'
            : 'border-divider hover:border-evergreen-teal hover:scale-110'
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
            completed ? 'text-muted-sage-gray line-through' : 'text-soft-charcoal'
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
                ? 'bg-teal-light text-evergreen-teal'
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
            <span className="text-xs text-muted-sage-gray">
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
            <span className="text-xs text-muted-sage-gray flex items-center gap-1">
              Due: {dueDate}
            </span>
          )}
        </div>
      </div>

      {/* Edit Button (optional) */}
      {onEdit && (
        <button
          onClick={onEdit}
          className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-2 hover:bg-dew-sage-light rounded-lg transition-all"
          title="Edit"
        >
          <Edit2 size={16} className="text-muted-sage-gray" />
        </button>
      )}
    </div>
  );
};

export default PriorityItem;
