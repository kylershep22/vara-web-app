/**
 * Accessibility Utilities
 * Helpers for making the app accessible to all users
 *
 * Key principles:
 * - All interactive elements need labels
 * - Color should not be the only indicator
 * - Touch targets should be at least 44x44 points
 * - Text should scale with system settings
 * - Screen readers should announce important changes
 */

import { AccessibilityInfo, Platform } from 'react-native';

/**
 * Minimum touch target size (Apple HIG & Material Design guidelines)
 */
export const MIN_TOUCH_TARGET_SIZE = 44;

/**
 * Check if screen reader is enabled
 */
export const isScreenReaderEnabled = async (): Promise<boolean> => {
  return await AccessibilityInfo.isScreenReaderEnabled();
};

/**
 * Announce a message to screen readers
 * Use for important state changes that aren't visually obvious
 */
export const announceForAccessibility = (message: string): void => {
  AccessibilityInfo.announceForAccessibility(message);
  // TODO: Add ToastAndroid fallback for Android when TalkBack is not active
};

/**
 * Generate accessibility label for progress
 */
export const getProgressLabel = (
  current: number,
  total: number,
  itemName: string = 'item'
): string => {
  const percentage = Math.round((current / total) * 100);
  return `${current} of ${total} ${itemName}s completed, ${percentage}%`;
};

/**
 * Generate accessibility label for time
 */
export const getTimeLabel = (hours: number, minutes: number): string => {
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  const minuteStr = minutes === 0 ? '' : ` ${minutes}`;
  return `${hour12}${minuteStr} ${period}`;
};

/**
 * Generate accessibility label for duration
 */
export const getDurationLabel = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  let label = `${hours} hour${hours !== 1 ? 's' : ''}`;
  if (mins > 0) {
    label += ` and ${mins} minute${mins !== 1 ? 's' : ''}`;
  }
  return label;
};

/**
 * Generate accessibility label for streak/consistency
 */
export const getConsistencyLabel = (days: number): string => {
  if (days === 0) {
    return 'No activity yet';
  }
  if (days === 1) {
    return '1 day of activity';
  }
  return `${days} days of consistent activity`;
};

/**
 * Generate accessibility hint for buttons
 */
export const getButtonHint = (action: string): string => {
  return Platform.select({
    ios: `Double tap to ${action}`,
    android: `Tap to ${action}`,
    default: `Activate to ${action}`,
  });
};

/**
 * Accessibility props for interactive elements
 */
export interface AccessibilityProps {
  accessible?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: 'none' | 'button' | 'link' | 'search' | 'image' | 'text' | 'checkbox' | 'radio' | 'header' | 'progressbar' | 'slider' | 'switch' | 'timer';
  accessibilityState?: {
    disabled?: boolean;
    selected?: boolean;
    checked?: boolean | 'mixed';
    busy?: boolean;
    expanded?: boolean;
  };
  accessibilityValue?: {
    min?: number;
    max?: number;
    now?: number;
    text?: string;
  };
}

/**
 * Create standard accessibility props for a button
 */
export const buttonA11yProps = (
  label: string,
  options?: {
    hint?: string;
    disabled?: boolean;
    selected?: boolean;
  }
): AccessibilityProps => ({
  accessible: true,
  accessibilityLabel: label,
  accessibilityHint: options?.hint,
  accessibilityRole: 'button',
  accessibilityState: {
    disabled: options?.disabled,
    selected: options?.selected,
  },
});

/**
 * Create standard accessibility props for a checkbox
 */
export const checkboxA11yProps = (
  label: string,
  checked: boolean,
  options?: { hint?: string; disabled?: boolean }
): AccessibilityProps => ({
  accessible: true,
  accessibilityLabel: label,
  accessibilityHint: options?.hint || (checked ? 'Double tap to uncheck' : 'Double tap to check'),
  accessibilityRole: 'checkbox',
  accessibilityState: {
    checked,
    disabled: options?.disabled,
  },
});

/**
 * Create standard accessibility props for a progress indicator
 */
export const progressA11yProps = (
  label: string,
  current: number,
  max: number,
  options?: { min?: number }
): AccessibilityProps => ({
  accessible: true,
  accessibilityLabel: label,
  accessibilityRole: 'progressbar',
  accessibilityValue: {
    min: options?.min ?? 0,
    max,
    now: current,
    text: `${Math.round((current / max) * 100)}%`,
  },
});

/**
 * Create standard accessibility props for a switch
 */
export const switchA11yProps = (
  label: string,
  enabled: boolean,
  options?: { hint?: string }
): AccessibilityProps => ({
  accessible: true,
  accessibilityLabel: `${label}, ${enabled ? 'on' : 'off'}`,
  accessibilityHint: options?.hint || `Double tap to turn ${enabled ? 'off' : 'on'}`,
  accessibilityRole: 'switch',
  accessibilityState: {
    checked: enabled,
  },
});

/**
 * Create standard accessibility props for a header
 */
export const headerA11yProps = (level: 1 | 2 | 3 | 4 | 5 | 6 = 1): AccessibilityProps => ({
  accessible: true,
  accessibilityRole: 'header',
});

/**
 * WCAG 2.1 AA contrast requirements
 * Normal text: 4.5:1
 * Large text (18pt+ or 14pt+ bold): 3:1
 */
export const CONTRAST_REQUIREMENTS = {
  normalText: 4.5,
  largeText: 3.0,
};

/**
 * Color contrast checker
 * Returns the contrast ratio between two colors
 */
export const getContrastRatio = (foreground: string, background: string): number => {
  const getLuminance = (hexColor: string): number => {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;

    const toLinear = (c: number) =>
      c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  };

  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
};

/**
 * Check if a color combination meets WCAG AA requirements
 */
export const meetsContrastRequirement = (
  foreground: string,
  background: string,
  isLargeText: boolean = false
): boolean => {
  const ratio = getContrastRatio(foreground, background);
  const requirement = isLargeText
    ? CONTRAST_REQUIREMENTS.largeText
    : CONTRAST_REQUIREMENTS.normalText;
  return ratio >= requirement;
};
