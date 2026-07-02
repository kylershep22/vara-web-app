/**
 * Activity Color Utilities
 * Brand-compliant color mapping for activity icons
 *
 * Brand rule:
 * - Replace all blue icons with color-primary (#1B5E57)
 * - Coral (#D97A6E) is color-ERROR and is reserved for genuine errors ONLY — it
 *   is NEVER an activity-icon color (previously red/pink mapped to it, which put
 *   coral on positive elements like the Gratitude heart).
 * - Never use blue, bright green, pure red, or any off-palette color
 */

import { ColorTokens, ActivityColors } from '../../../constants/designTokens';

/**
 * Maps legacy activity color names to brand-compliant colors.
 * Allowed activity-icon colors:
 * - primary (Evergreen Teal) - most activities
 * - apricot (Golden Apricot) - energy/coffee related
 * Coral is intentionally absent: it is the error color and must not appear on
 * activity icons.
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

    // Warm/affinity legacy names → primary teal. (Previously mapped to coral,
    // but coral is the ERROR color — never valid on an activity icon, e.g. the
    // Gratitude heart or "No Screens" now render teal, not coral.)
    red: ActivityColors.primary,
    pink: ActivityColors.primary,

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

  // Apricot-appropriate activities (energy, warmth, morning boost). Warm/affinity
  // activities (gratitude, heart, love) intentionally have NO special color and
  // fall through to primary teal — coral is the error color and is never
  // suggested for an activity.
  const apricotKeywords = [
    'coffee', 'tea', 'energy', 'breakfast', 'morning',
    'wake', 'sunshine', 'warm', 'boost', 'caffeine'
  ];

  if (apricotKeywords.some(keyword => lowerName.includes(keyword))) {
    return 'apricot';
  }

  return 'primary';
}
