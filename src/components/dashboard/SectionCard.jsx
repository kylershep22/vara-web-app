// src/components/dashboard/SectionCard.jsx
import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

/**
 * SectionCard - Reusable card wrapper with consistent styling
 *
 * @param {string} title - Section title
 * @param {React.ReactNode} icon - Optional icon to display next to title
 * @param {React.ReactNode} action - Optional action button/link (top right)
 * @param {React.ReactNode} children - Card content
 * @param {React.ReactNode} footer - Optional footer content
 * @param {string} className - Additional CSS classes
 * @param {string} headerClassName - Additional classes for header
 * @param {string} gradient - Optional gradient background class
 * @param {boolean} collapsible - Whether the section can be collapsed
 * @param {boolean} isCollapsed - Current collapsed state
 * @param {function} onToggleCollapse - Callback when toggling collapse
 * @param {string|number} count - Item count to show when collapsed
 */
const SectionCard = ({
  title,
  icon,
  action,
  children,
  footer,
  className = '',
  headerClassName = '',
  gradient,
  collapsible = false,
  isCollapsed = false,
  onToggleCollapse,
  count
}) => {
  const bgClass = gradient
    ? `bg-gradient-to-br ${gradient}`
    : 'bg-white';

  const borderClass = gradient ? '' : 'border border-gray-200';

  return (
    <div className={`${bgClass} ${borderClass} rounded-2xl shadow-sm ${className}`}>
      {/* Header */}
      {(title || action || icon) && (
        <div className={`flex items-center justify-between p-6 ${isCollapsed ? 'pb-6' : 'pb-4'} ${headerClassName}`}>
          {/* Title with optional icon */}
          <div className="flex items-center gap-3">
            {icon && (
              <div className={`flex items-center justify-center ${gradient ? 'text-white' : 'text-gray-700'}`}>
                {icon}
              </div>
            )}
            {title && (
              <div className="flex items-center gap-2">
                <h3 className={`text-lg font-semibold ${gradient ? 'text-white' : 'text-gray-900'}`}>
                  {title}
                </h3>
                {isCollapsed && count !== undefined && (
                  <span className={`text-sm px-2 py-0.5 rounded-full ${gradient ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    {count}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Actions container */}
          <div className="flex items-center gap-2">
            {/* Action buttons (only show when not collapsed) */}
            {!isCollapsed && action && <div>{action}</div>}

            {/* Collapse toggle button */}
            {collapsible && (
              <button
                onClick={onToggleCollapse}
                className={`p-2 rounded-lg transition-colors ${
                  gradient
                    ? 'hover:bg-white/10 text-white'
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
                title={isCollapsed ? 'Expand section' : 'Collapse section'}
              >
                {isCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Content - only show when not collapsed */}
      {!isCollapsed && (
        <>
          <div className={title || action || icon ? 'px-6 pb-6' : 'p-6'}>
            {children}
          </div>

          {/* Optional Footer */}
          {footer && (
            <div className="px-6 pb-6 pt-0">
              {footer}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SectionCard;
