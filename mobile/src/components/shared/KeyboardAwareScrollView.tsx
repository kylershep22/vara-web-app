/**
 * KeyboardAwareScrollView Component
 * A ScrollView wrapper that provides consistent keyboard dismissal across the app
 *
 * Features:
 * - Floating "Done" button when keyboard is visible (iOS & Android)
 * - Dismiss keyboard on drag (via keyboardDismissMode)
 * - Smooth keyboard avoidance
 * - Works in modals and regular screens
 */

import React, { useRef, useEffect, useCallback, createContext, useContext } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Keyboard,
  Platform,
  TouchableOpacity,
  KeyboardAvoidingView,
  Animated,
  EmitterSubscription,
  ScrollViewProps,
  Text,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography, Layout } from '../../constants';

// Context to share inputAccessoryViewID with child inputs
interface KeyboardContextValue {
  inputAccessoryViewID: string | undefined;
}

const KeyboardContext = createContext<KeyboardContextValue>({ inputAccessoryViewID: undefined });

export const useKeyboardContext = () => useContext(KeyboardContext);

interface KeyboardAwareScrollViewProps extends ScrollViewProps {
  children: React.ReactNode;
  /** Unique ID for iOS InputAccessoryView - inputs should use this same ID */
  inputAccessoryViewID?: string;
  /** Whether to show the floating Done button (default: true) */
  showDoneButton?: boolean;
  /** Custom label for Done button */
  doneButtonLabel?: string;
  /** Callback when Done button is pressed */
  onDone?: () => void;
  /** Whether to enable KeyboardAvoidingView wrapper (default: true) */
  enableKeyboardAvoidance?: boolean;
  /** Keyboard vertical offset for KeyboardAvoidingView */
  keyboardVerticalOffset?: number;
  /** Whether to dismiss keyboard on scroll (default: true) */
  dismissOnScroll?: boolean;
  /** Whether to dismiss keyboard when tapping outside inputs (default: true) */
  dismissOnTap?: boolean;
}

export const KeyboardAwareScrollView: React.FC<KeyboardAwareScrollViewProps> = ({
  children,
  inputAccessoryViewID,
  showDoneButton = true,
  doneButtonLabel = 'Done',
  onDone,
  enableKeyboardAvoidance = true,
  keyboardVerticalOffset = Platform.OS === 'ios' ? 100 : 0,
  dismissOnScroll = true,
  dismissOnTap = true,
  style,
  contentContainerStyle,
  ...scrollViewProps
}) => {
  const insets = useSafeAreaInsets();

  // Use refs instead of state to avoid re-render loops when keyboard shows/hides
  const keyboardVisibleRef = useRef(false);
  const keyboardHeightRef = useRef(0);

  // Animated values for the done button (drive UI without state re-renders)
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const buttonTranslateY = useRef(new Animated.Value(50)).current;
  const buttonBottom = useRef(new Animated.Value(Spacing.lg)).current;

  useEffect(() => {
    const showSubscription: EmitterSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        keyboardVisibleRef.current = true;
        keyboardHeightRef.current = e.endCoordinates.height;

        const targetBottom = Platform.OS === 'ios'
          ? e.endCoordinates.height + Spacing.sm
          : Spacing.lg;

        // Animate button in — no setState, no re-render
        Animated.parallel([
          Animated.timing(buttonOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: false,
          }),
          Animated.timing(buttonTranslateY, {
            toValue: 0,
            duration: 200,
            useNativeDriver: false,
          }),
          Animated.timing(buttonBottom, {
            toValue: targetBottom,
            duration: 200,
            useNativeDriver: false,
          }),
        ]).start();
      }
    );

    const hideSubscription: EmitterSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        // Animate button out — no setState, no re-render
        Animated.parallel([
          Animated.timing(buttonOpacity, {
            toValue: 0,
            duration: 150,
            useNativeDriver: false,
          }),
          Animated.timing(buttonTranslateY, {
            toValue: 50,
            duration: 150,
            useNativeDriver: false,
          }),
        ]).start(() => {
          keyboardVisibleRef.current = false;
          keyboardHeightRef.current = 0;
        });
      }
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [buttonOpacity, buttonTranslateY, buttonBottom]);

  const handleDismissKeyboard = useCallback(() => {
    Keyboard.dismiss();
    onDone?.();
  }, [onDone]);

  const contextValue: KeyboardContextValue = {
    inputAccessoryViewID,
  };

  const content = (
    <KeyboardContext.Provider value={contextValue}>
      <ScrollView
        style={[styles.scrollView, style]}
        contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={dismissOnScroll ? 'on-drag' : 'none'}
        showsVerticalScrollIndicator={true}
        bounces={true}
        {...scrollViewProps}
      >
        {children}
      </ScrollView>

      {/* Floating Done Button — always mounted, visibility controlled by animated opacity */}
      {showDoneButton && (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.doneButtonContainer,
            {
              opacity: buttonOpacity,
              transform: [{ translateY: buttonTranslateY }],
              bottom: buttonBottom,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.doneButton}
            onPress={handleDismissKeyboard}
            activeOpacity={0.8}
          >
            <Icon name="keyboard-close" size={20} color={Colors.white} />
            <Text style={styles.doneButtonText}>{doneButtonLabel}</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </KeyboardContext.Provider>
  );

  if (enableKeyboardAvoidance) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={keyboardVerticalOffset}
      >
        {content}
      </KeyboardAvoidingView>
    );
  }

  return <View style={styles.container}>{content}</View>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  doneButtonContainer: {
    position: 'absolute',
    right: Spacing.lg,
    zIndex: 1000,
  },
  doneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.evergreenTeal,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
    borderRadius: Layout.borderRadius.full,
    gap: Spacing.xs,
    ...Platform.select({
      ios: {
        shadowColor: Colors.evergreenTeal,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  doneButtonText: {
    color: Colors.white,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
});

export default KeyboardAwareScrollView;
