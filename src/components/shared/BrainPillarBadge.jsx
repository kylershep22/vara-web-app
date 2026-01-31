import React from 'react';
import { TrendingUp, Zap, Target, Shield, Users } from 'lucide-react';
import { BRAIN_PILLARS } from '../../constants/brainPillars';

/**
 * BrainPillarBadge - Displays a brain health pillar badge
 * @param {Object} props
 * @param {'growth'|'energy'|'focus'|'resilience'|'connection'} props.pillarId - The pillar ID
 * @param {'small'|'medium'|'large'} props.size - Badge size (default: 'small')
 * @param {boolean} props.showIcon - Whether to show the icon (default: true)
 * @param {boolean} props.showFullName - Whether to show full name instead of short name (default: false)
 * @param {string} props.className - Additional CSS classes
 */
export default function BrainPillarBadge({
  pillarId,
  size = 'small',
  showIcon = true,
  showFullName = false,
  className = ''
}) {
  const pillar = BRAIN_PILLARS[pillarId];

  if (!pillar) {
    return null;
  }

  const IconComponent = getIconComponent(pillar.icon);

  // Size configurations
  const sizeClasses = {
    small: {
      container: 'px-2 py-1 text-xs',
      icon: 12,
      gap: 'gap-1'
    },
    medium: {
      container: 'px-3 py-1.5 text-sm',
      icon: 14,
      gap: 'gap-1.5'
    },
    large: {
      container: 'px-4 py-2 text-base',
      icon: 16,
      gap: 'gap-2'
    }
  };

  const config = sizeClasses[size];

  return (
    <div
      className={`inline-flex items-center ${config.gap} ${config.container} rounded-full font-medium ${className}`}
      style={{
        backgroundColor: pillar.lightColor,
        color: pillar.color,
        border: `1px solid ${pillar.color}40`
      }}
    >
      {showIcon && <IconComponent size={config.icon} />}
      <span>{showFullName ? pillar.fullName : pillar.name}</span>
    </div>
  );
}

/**
 * BrainPillarBadgeList - Displays a list of brain pillar badges
 * @param {Object} props
 * @param {Array<string>} props.pillars - Array of pillar IDs
 * @param {'small'|'medium'|'large'} props.size - Badge size
 * @param {boolean} props.showIcon - Whether to show icons
 * @param {string} props.className - Additional CSS classes for container
 */
export function BrainPillarBadgeList({ pillars, size = 'small', showIcon = true, className = '' }) {
  if (!pillars || pillars.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {pillars.map(pillarId => (
        <BrainPillarBadge
          key={pillarId}
          pillarId={pillarId}
          size={size}
          showIcon={showIcon}
        />
      ))}
    </div>
  );
}

/**
 * NeurochemicalTag - Displays a neurochemical impact tag
 * @param {Object} props
 * @param {Object} props.impact - The neurochemical impact object
 * @param {'increase'|'decrease'} props.impact.direction
 * @param {string} props.impact.name
 * @param {'small'|'medium'} props.size - Tag size (default: 'small')
 */
export function NeurochemicalTag({ impact, size = 'small' }) {
  if (!impact) return null;

  const arrow = impact.direction === 'increase' ? '↑' : '↓';
  const isIncrease = impact.direction === 'increase';

  const bgColor = isIncrease ? 'bg-green-50' : 'bg-blue-50';
  const textColor = isIncrease ? 'text-green-700' : 'text-blue-700';
  const borderColor = isIncrease ? 'border-green-200' : 'border-blue-200';

  const sizeClasses = {
    small: 'px-2 py-0.5 text-xs',
    medium: 'px-3 py-1 text-sm'
  };

  return (
    <span
      className={`inline-flex items-center gap-1 ${sizeClasses[size]} ${bgColor} ${textColor} border ${borderColor} rounded-full font-medium`}
    >
      <span className="font-bold">{arrow}</span>
      <span>{impact.name}</span>
    </span>
  );
}

/**
 * NeurochemicalTagList - Displays a list of neurochemical impact tags
 * @param {Object} props
 * @param {Array<Object>} props.impacts - Array of neurochemical impacts
 * @param {'small'|'medium'} props.size - Tag size
 * @param {number} props.maxDisplay - Maximum number of tags to display (default: all)
 * @param {string} props.className - Additional CSS classes
 */
export function NeurochemicalTagList({ impacts, size = 'small', maxDisplay = null, className = '' }) {
  if (!impacts || impacts.length === 0) {
    return null;
  }

  const displayImpacts = maxDisplay ? impacts.slice(0, maxDisplay) : impacts;
  const remaining = maxDisplay && impacts.length > maxDisplay ? impacts.length - maxDisplay : 0;

  return (
    <div className={`flex flex-wrap gap-1.5 items-center ${className}`}>
      {displayImpacts.map((impact, idx) => (
        <NeurochemicalTag key={idx} impact={impact} size={size} />
      ))}
      {remaining > 0 && (
        <span className="text-xs text-gray-500">+{remaining} more</span>
      )}
    </div>
  );
}

// Helper function to map icon names to components
function getIconComponent(iconName) {
  const iconMap = {
    TrendingUp,
    Zap,
    Target,
    Shield,
    Users
  };
  return iconMap[iconName] || Target;
}
