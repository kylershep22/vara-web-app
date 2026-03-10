// src/components/dashboard/SectionCard.jsx
import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

/**
 * SectionCard - Collapsible card section matching Vara design.
 */
const SectionCard = ({
  title,
  icon,
  action,
  children,
  footer,
  className = '',
  collapsible = false,
  isCollapsed = false,
  onToggleCollapse,
  count,
}) => {
  return (
    <div className={`bg-white border border-divider rounded-vara-lg shadow-vara-sm ${className}`}>
      {/* Header */}
      {(title || action || icon) && (
        <div className={`flex items-center justify-between px-vara-lg pt-vara-lg ${isCollapsed ? 'pb-vara-lg' : 'pb-vara-sm'}`}>
          <div className="flex items-center gap-3">
            {icon && (
              <div className="w-8 h-8 flex items-center justify-center rounded-vara-md bg-teal-light text-evergreen-teal">
                {icon}
              </div>
            )}
            {title && (
              <div className="flex items-center gap-2">
                <h3 className="text-vara-lg font-semibold text-soft-charcoal">{title}</h3>
                {isCollapsed && count !== undefined && (
                  <span className="text-vara-xs px-2 py-0.5 rounded-vara-pill bg-dew-sage-light text-muted-sage-gray font-medium">
                    {count}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isCollapsed && action && <div>{action}</div>}
            {collapsible && (
              <button
                onClick={onToggleCollapse}
                className="p-2 rounded-vara-md hover:bg-dew-sage-light text-muted-sage-gray transition-colors"
                aria-label={isCollapsed ? 'Expand section' : 'Collapse section'}
              >
                {isCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      {!isCollapsed && (
        <>
          <div className={title || action || icon ? 'px-vara-lg pb-vara-lg' : 'p-vara-lg'}>
            {children}
          </div>
          {footer && (
            <div className="px-vara-lg pb-vara-lg border-t border-divider pt-vara-base">
              {footer}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SectionCard;
