import React from 'react';

/**
 * ProgressBar - Horizontal progress bar matching mobile's ProgressBar
 * @param {Object} props
 * @param {number} props.progress - 0 to 1
 * @param {'sm'|'md'|'lg'} props.size
 * @param {string} props.color - Tailwind bg class or hex color
 * @param {boolean} props.showLabel - Show percentage label
 * @param {string} props.className
 */
export default function ProgressBar({
  progress = 0,
  size = 'md',
  color,
  showLabel = false,
  className = '',
}) {
  const clamped = Math.max(0, Math.min(1, progress));
  const percent = Math.round(clamped * 100);

  const heightClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  const fillStyle = color?.startsWith('#') || color?.startsWith('rgb')
    ? { width: `${percent}%`, backgroundColor: color }
    : { width: `${percent}%` };

  const fillColorClass = !color || color.startsWith('bg-')
    ? (color || 'bg-evergreen-teal')
    : '';

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between items-center mb-vara-xs">
          <span className="text-vara-xs text-muted-sage-gray font-medium">{percent}%</span>
        </div>
      )}
      <div
        className={`w-full ${heightClasses[size]} bg-dew-sage-light rounded-vara-pill overflow-hidden`}
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`${heightClasses[size]} ${fillColorClass} rounded-vara-pill transition-all duration-300 ease-out`}
          style={fillStyle}
        />
      </div>
    </div>
  );
}
