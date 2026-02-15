/**
 * Activity Color Utilities
 * Brand-compliant color mapping for activity icons
 *
 * Per Focus Page Spec Section 4.2:
 * - Replace all blue icons with color-primary (#1B5E57)
 * - Replace all red icons with color-error (#D97A6E / Soft Coral)
 * - Never use blue, bright green, pure red, or any off-palette color
 */

import { ColorTokens, ActivityColors } from '../../../tokens/design-tokens';

/**
 * Maps legacy activity color names to brand-compliant colors
 * Only three colors are allowed per spec:
 * - primary (Evergreen Teal) - most activities
 * - coral (Soft Coral) - heart/gratitude related
 * - apricot (Golden Apricot) - energy/coffee related
 */
export function getActivityColor(colorName: string): string {
  const colorMap: Record<string, string> = {
    // Primary teal mappings (default for most activities)
    teal: ActivityColors.primary,
    green: ActivityColors.primary,      // Map green → primary teal
    blue: ActivityColors.primary,       // Map blue → primary teal (brand fix)
    cyan: ActivityColors.primary,       // Map cyan → primary teal
    indigo: ActivityColors.primary,     // Map indigo → primary teal
    purple: ActivityColors.primary,     // Map purple → primary teal

    // Coral mappings (gratitude, heart, love related)
    red: ActivityColors.coral,          // Map red → soft coral (brand fix)
    pink: ActivityColors.coral,         // Map pink → soft coral

    // Apricot mappings (energy, warmth, coffee related)
    orange: ActivityColors.apricot,
    yellow: ActivityColors.apricot,
    amber: ActivityColors.apricot,
    brown: ActivityColors.apricot,      // Map brown → apricot

    // Neutral fallback
    gray: ColorTokens.textSecondary,
  };

  return colorMap[colorName.toLowerCase()] || ActivityColors.primary;
}

/**
 * Returns the activity color with specified opacity for backgrounds
 * @param colorName - The color identifier from the activity
 * @param opacity - Opacity value (0-1), default 0.15 per spec
 */
export function getActivityColorWithOpacity(colorName: string, opacity: number = 0.15): string {
  const baseColor = getActivityColor(colorName);

  // Convert hex to rgba
  const hex = baseColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Determines which activity color category a semantic name belongs to
 * Used to suggest appropriate colors for new activities
 */
export function suggestActivityColor(activityName: string): string {
  const lowerName = activityName.toLowerCase();

  // Coral-appropriate activities (gratitude, heart, love)
  const coralKeywords = [
    'gratitude', 'love', 'heart', 'appreciation', 'thankful',
    'compassion', 'kindness', 'affection', 'caring'
  ];

  // Apricot-appropriate activities (energy, warmth, morning boost)
  const apricotKeywords = [
    'coffee', 'tea', 'energy', 'breakfast', 'morning',
    'wake', 'sunshine', 'warm', 'boost', 'caffeine'
  ];

  if (coralKeywords.some(keyword => lowerName.includes(keyword))) {
    return 'coral';
  }

  if (apricotKeywords.some(keyword => lowerName.includes(keyword))) {
    return 'apricot';
  }

  return 'primary';
}
