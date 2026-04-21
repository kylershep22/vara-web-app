/**
 * Utility functions barrel export
 *
 * NOTE: Explicit re-exports to avoid Metro "export *" issues.
 */

// validation
export {
  validateEmail,
  validatePassword,
  validatePasswordMatch,
  validateDisplayName,
  getAuthErrorMessage,
} from './validation';

// keyboard
export {
  dismissKeyboard,
  getTextInputKeyboardProps,
  getScrollViewKeyboardProps,
  getKeyboardAvoidingViewProps,
} from './keyboard';

// accessibility
export {
  MIN_TOUCH_TARGET_SIZE,
  isScreenReaderEnabled,
  announceForAccessibility,
  getProgressLabel,
  getTimeLabel,
  getDurationLabel,
  getConsistencyLabel,
  getButtonHint,
  buttonA11yProps,
  checkboxA11yProps,
  progressA11yProps,
  switchA11yProps,
  headerA11yProps,
  CONTRAST_REQUIREMENTS,
  getContrastRatio,
  meetsContrastRequirement,
} from './accessibility';
export type { AccessibilityProps } from './accessibility';

// onboardingInsights
export {
  generateInsight,
  getFocusAreaData,
  getAllFocusAreas,
} from './onboardingInsights';
