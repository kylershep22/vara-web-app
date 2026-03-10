import React from 'react';

/**
 * Badge - Small label/badge matching mobile's Badge component
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {'default'|'primary'|'success'|'warning'|'error'|'info'} props.variant
 * @param {'sm'|'md'} props.size
 * @param {string} props.className
 */
export default function Badge({
  children,
  variant = 'default',
  size = 'sm',
  className = '',
}) {
  const variantClasses = {
    default: 'bg-dew-sage-light text-muted-sage-gray',
    primary: 'bg-teal-light text-evergreen-teal',
    success: 'bg-teal-light text-evergreen-teal',
    warning: 'bg-[rgba(245,185,113,0.15)] text-[#B8860B]',
    error: 'bg-[rgba(217,122,110,0.15)] text-soft-coral',
    info: 'bg-teal-light text-evergreen-teal',
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-vara-xs',
    md: 'px-3 py-1 text-vara-sm',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-vara-pill ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {children}
    </span>
  );
}
