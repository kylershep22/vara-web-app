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

// onboardingInsights
export {
  generateInsight,
  getFocusAreaData,
  getAllFocusAreas,
} from './onboardingInsights';
