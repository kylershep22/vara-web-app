// src/components/dashboard/SectionCard.jsx
import React from 'react';

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
 */
const SectionCard = ({
  title,
  icon,
  action,
  children,
  footer,
  className = '',
  headerClassName = '',
  gradient
}) => {
  const bgClass = gradient
    ? `bg-gradient-to-br ${gradient}`
    : 'bg-white';

  const borderClass = gradient ? '' : 'border border-gray-200';

  return (
    <div className={`${bgClass} ${borderClass} rounded-2xl shadow-sm ${className}`}>
      {/* Header */}
      {(title || action || icon) && (
        <div className={`flex items-center justify-between p-6 pb-4 ${headerClassName}`}>
          {/* Title with optional icon */}
          <div className="flex items-center gap-3">
            {icon && (
              <div className={`flex items-center justify-center ${gradient ? 'text-white' : 'text-gray-700'}`}>
                {icon}
              </div>
            )}
            {title && (
              <h3 className={`text-lg font-semibold ${gradient ? 'text-white' : 'text-gray-900'}`}>
                {title}
              </h3>
            )}
          </div>

          {/* Action (button or link) */}
          {action && <div>{action}</div>}
        </div>
      )}

      {/* Content */}
      <div className={title || action || icon ? 'px-6 pb-6' : 'p-6'}>
        {children}
      </div>

      {/* Optional Footer */}
      {footer && (
        <div className="px-6 pb-6 pt-0">
          {footer}
        </div>
      )}
    </div>
  );
};

export default SectionCard;
