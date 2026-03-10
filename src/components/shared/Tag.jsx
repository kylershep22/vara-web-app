import React from 'react';
import { X } from 'lucide-react';

/**
 * Tag - Pill-shaped tag/chip matching mobile's Tag component
 * @param {Object} props
 * @param {string} props.label
 * @param {boolean} props.selected
 * @param {Function} props.onPress - Click handler
 * @param {Function} props.onRemove - If provided, shows X button
 * @param {React.ReactNode} props.icon - Optional leading icon
 * @param {string} props.className
 */
export default function Tag({
  label,
  selected = false,
  onPress,
  onRemove,
  icon,
  className = '',
}) {
  const baseClasses = 'inline-flex items-center gap-vara-xs px-3 py-1.5 rounded-vara-pill text-vara-sm font-medium transition-colors duration-150';

  const stateClasses = selected
    ? 'bg-teal-light text-evergreen-teal border border-teal-medium'
    : 'bg-dew-sage-light text-muted-sage-gray border border-transparent';

  const interactiveClasses = onPress
    ? 'cursor-pointer hover:bg-teal-light hover:text-evergreen-teal'
    : '';

  return (
    <button
      type="button"
      className={`${baseClasses} ${stateClasses} ${interactiveClasses} ${className}`}
      onClick={onPress}
      disabled={!onPress && !onRemove}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{label}</span>
      {onRemove && (
        <button
          type="button"
          className="flex-shrink-0 ml-0.5 p-0.5 rounded-full hover:bg-teal-medium transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`Remove ${label}`}
        >
          <X size={12} />
        </button>
      )}
    </button>
  );
}
