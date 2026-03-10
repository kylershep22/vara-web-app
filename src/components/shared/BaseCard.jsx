import React from 'react';

/**
 * BaseCard - Standard card wrapper matching mobile's BaseCard component
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {string} props.className - Additional Tailwind classes
 * @param {Function} props.onClick - Optional click handler
 * @param {'default'|'outlined'|'flat'} props.variant
 */
export default function BaseCard({
  children,
  className = '',
  onClick,
  variant = 'default',
}) {
  const baseClasses = 'rounded-vara-lg overflow-hidden';

  const variantClasses = {
    default: 'bg-white shadow-vara-md',
    outlined: 'bg-white border border-divider',
    flat: 'bg-white',
  };

  const interactive = onClick ? 'cursor-pointer hover:shadow-vara-lg transition-shadow duration-200' : '';

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${interactive} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(e); } : undefined}
    >
      {children}
    </div>
  );
}

/**
 * CardContent - Standard card content area with Vara padding
 */
export function CardContent({ children, className = '' }) {
  return (
    <div className={`p-vara-lg ${className}`}>
      {children}
    </div>
  );
}

/**
 * CardHeader - Card header with title and optional action
 */
export function CardHeader({ title, subtitle, action, className = '' }) {
  return (
    <div className={`flex items-start justify-between gap-vara-sm ${className}`}>
      <div className="flex-1 min-w-0">
        <h3 className="text-vara-lg font-semibold text-soft-charcoal leading-tight">
          {title}
        </h3>
        {subtitle && (
          <p className="text-vara-sm text-muted-sage-gray mt-vara-2xs">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
