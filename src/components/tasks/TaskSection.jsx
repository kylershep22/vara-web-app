// src/components/tasks/TaskSection.jsx
import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

/**
 * TaskSection - Collapsible task quadrant wrapper
 *
 * Features:
 * - Expandable/collapsible sections
 * - Auto-collapse empty sections
 * - Badge count in header
 * - Icon and color coding per quadrant
 * - Smooth animations
 */
const TaskSection = ({
  title,
  icon: Icon,
  count,
  gradient,
  borderColor,
  children,
  defaultExpanded = true,
  autoCollapseIfEmpty = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Auto-collapse if empty and configured to do so
  const shouldShow = !autoCollapseIfEmpty || count > 0;

  if (!shouldShow) {
    return null;
  }

  // If count is 0 and not auto-collapsing, show collapsed state
  const effectivelyExpanded = count === 0 ? false : isExpanded;

  return (
    <div className="mb-4">
      {/* Section Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full flex items-center justify-between p-4 rounded-xl transition-all ${
          effectivelyExpanded
            ? `bg-gradient-to-r ${gradient} text-white`
            : `bg-white border-2 ${borderColor} hover:shadow-md`
        }`}
      >
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div className={`flex items-center justify-center ${
            effectivelyExpanded ? 'text-white' : 'text-soft-charcoal'
          }`}>
            <Icon size={20} />
          </div>

          {/* Title */}
          <h3 className={`font-semibold ${
            effectivelyExpanded ? 'text-white' : 'text-soft-charcoal'
          }`}>
            {title}
          </h3>

          {/* Count Badge */}
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
            effectivelyExpanded
              ? 'bg-white/20 text-white'
              : 'bg-dew-sage-light text-soft-charcoal'
          }`}>
            {count}
          </span>
        </div>

        {/* Expand/Collapse Icon */}
        <div className={effectivelyExpanded ? 'text-white' : 'text-muted-sage-gray'}>
          {effectivelyExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </button>

      {/* Section Content */}
      {effectivelyExpanded && (
        <div className="mt-3 space-y-2 animate-in slide-in-from-top-2 duration-200">
          {count === 0 ? (
            <div className="text-center py-8 text-muted-sage-gray">
              <p className="text-sm">No tasks in this category</p>
            </div>
          ) : (
            children
          )}
        </div>
      )}
    </div>
  );
};

export default TaskSection;
