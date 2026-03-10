// src/components/tasks/TaskCard.jsx
import React, { useState } from 'react';
import { Clock, Target, Dumbbell, Edit, Trash2, Calendar } from 'lucide-react';

/**
 * TaskCard - Enhanced task item with quick actions
 *
 * Features:
 * - Checkbox for completion
 * - Hover-reveal actions (Edit, Delete, Defer)
 * - Visual status indicators (overdue, due today, upcoming)
 * - Goal/Habit badges
 * - Smart date formatting
 */
const TaskCard = ({ task, goalBadge, habitBadge, onToggle, onEdit, onDelete, onDefer }) => {
  const [isHovered, setIsHovered] = useState(false);

  // Determine status color based on due date
  const getStatusColor = () => {
    if (!task.dueDate) return 'text-muted-sage-gray';

    const dueDate = task.dueDate?.seconds
      ? new Date(task.dueDate.seconds * 1000)
      : new Date(task.dueDate);

    const now = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0));
    const due = new Date(dueDate.setHours(0, 0, 0, 0));

    if (due < today) return 'text-red-600'; // Overdue
    if (due.getTime() === today.getTime()) return 'text-orange-600'; // Due today
    return 'text-blue-600'; // Upcoming
  };

  const getStatusText = () => {
    if (!task.dueDate) return '';

    const dueDate = task.dueDate?.seconds
      ? new Date(task.dueDate.seconds * 1000)
      : new Date(task.dueDate);

    const now = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0));
    const due = new Date(dueDate.setHours(0, 0, 0, 0));

    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      const overdueDays = Math.abs(diffDays);
      return `Overdue by ${overdueDays} ${overdueDays === 1 ? 'day' : 'days'}`;
    }
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return 'Due tomorrow';
    if (diffDays <= 7) return `Due in ${diffDays} days`;

    return dueDate.toLocaleDateString();
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group relative rounded-xl border-2 p-4 transition-all ${
        task.status === 'completed'
          ? 'border-silver-sage bg-teal-light'
          : 'border-divider bg-white hover:border-evergreen-teal hover:shadow-md'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button
          onClick={() => onToggle(task.id)}
          className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all mt-0.5 ${
            task.status === 'completed'
              ? 'bg-evergreen-teal border-evergreen-teal'
              : 'border-silver-sage hover:border-evergreen-teal'
          }`}
        >
          {task.status === 'completed' && (
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <p className={`font-medium mb-1 ${
            task.status === 'completed' ? 'text-muted-sage-gray line-through' : 'text-soft-charcoal'
          }`}>
            {task.title}
          </p>

          {/* Metadata Row */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Due Date */}
            {task.dueDate && (
              <span className={`text-xs font-medium flex items-center gap-1 ${getStatusColor()}`}>
                <Clock size={12} />
                {getStatusText()}
              </span>
            )}

            {/* Goal Badge */}
            {goalBadge && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium flex items-center gap-1">
                <Target size={10} />
                {goalBadge}
              </span>
            )}

            {/* Habit Badge */}
            {habitBadge && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-dew-sage text-evergreen-teal font-medium flex items-center gap-1">
                <Dumbbell size={10} />
                {habitBadge}
              </span>
            )}
          </div>
        </div>

        {/* Quick Actions (hover reveal) */}
        {isHovered && task.status !== 'completed' && (
          <div className="flex items-center gap-1 animate-in fade-in duration-200">
            {onDefer && (
              <button
                onClick={() => onDefer(task.id)}
                className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                title="Defer to tomorrow"
              >
                <Calendar size={16} />
              </button>
            )}
            {onEdit && (
              <button
                onClick={() => onEdit(task)}
                className="p-1.5 rounded-lg hover:bg-dew-sage-light text-muted-sage-gray transition-colors"
                title="Edit task"
              >
                <Edit size={16} />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(task.id)}
                className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                title="Delete task"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskCard;
