/**
 * Keyboard Utility
 * Helper functions and components for keyboard management
 */

import { Keyboard } from 'react-native';

/**
 * Dismiss the keyboard
 */
export const dismissKeyboard = () => {
  Keyboard.dismiss();
};

/**
 * Common TextInput props for consistent keyboard behavior
 */
export const getTextInputKeyboardProps = (multiline: boolean = false) => {
  if (multiline) {
    return {
      blurOnSubmit: false,
      returnKeyType: 'default' as const,
    };
  }

  return {
    blurOnSubmit: true,
    returnKeyType: 'done' as const,
  };
};

/**
 * Common ScrollView props for keyboard handling
 */
export const getScrollViewKeyboardProps = () => ({
  keyboardShouldPersistTaps: 'handled' as const,
  keyboardDismissMode: 'on-drag' as const,
});

/**
 * Common KeyboardAvoidingView props
 */
export const getKeyboardAvoidingViewProps = (platform: 'ios' | 'android' | 'web') => ({
  behavior: platform === 'ios' ? ('padding' as const) : ('height' as const),
  keyboardVerticalOffset: platform === 'ios' ? 64 : 0,
});
