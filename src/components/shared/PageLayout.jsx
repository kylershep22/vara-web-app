import React from 'react';

/**
 * PageLayout - Standard page wrapper with consistent padding and max-width
 * Replaces ad-hoc page containers across the app.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {string} props.title - Optional page title (rendered as h1)
 * @param {string} props.subtitle - Optional subtitle below title
 * @param {React.ReactNode} props.headerAction - Optional action element in header row
 * @param {string} props.className - Additional classes for the content area
 * @param {'default'|'narrow'|'wide'} props.maxWidth
 */
export default function PageLayout({
  children,
  title,
  subtitle,
  headerAction,
  className = '',
  maxWidth = 'default',
}) {
  const widthClasses = {
    narrow: 'max-w-2xl',
    default: 'max-w-5xl',
    wide: 'max-w-7xl',
  };

  return (
    <div className={`${widthClasses[maxWidth]} mx-auto px-vara-base py-vara-lg ${className}`}>
      {(title || headerAction) && (
        <div className="flex items-start justify-between gap-vara-base mb-vara-lg">
          <div>
            {title && (
              <h1 className="text-vara-2xl font-semibold text-evergreen-teal tracking-tight">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-vara-sm text-muted-sage-gray mt-vara-2xs">
                {subtitle}
              </p>
            )}
          </div>
          {headerAction && <div className="flex-shrink-0">{headerAction}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
