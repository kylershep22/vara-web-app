/**
 * KeyboardAwareScrollView Component
 * A ScrollView wrapper that provides consistent keyboard dismissal across the app
 *
 * Features:
 * - Floating "Done" button when keyboard is visible (iOS & Android)
 * - Tap outside inputs to dismiss keyboard
 * - Smooth keyboard avoidance
 * - Works in modals and regular screens
 */

import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Keyboard,
  Platform,
  TouchableOpacity,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Animated,
  Dimensions,
  EmitterSubscription,
  ScrollViewProps,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography, Layout } from '../../constants';

const { height: screenHeight } = Dimensions.get('window');

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
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const buttonOpacity = useState(new Animated.Value(0))[0];
  const buttonTranslateY = useState(new Animated.Value(50))[0];

  useEffect(() => {
    const showSubscription: EmitterSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardVisible(true);
        setKeyboardHeight(e.endCoordinates.height);

        // Animate button in
        Animated.parallel([
          Animated.timing(buttonOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(buttonTranslateY, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }
    );

    const hideSubscription: EmitterSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        // Animate button out
        Animated.parallel([
          Animated.timing(buttonOpacity, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(buttonTranslateY, {
            toValue: 50,
            duration: 150,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setKeyboardVisible(false);
          setKeyboardHeight(0);
        });
      }
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [buttonOpacity, buttonTranslateY]);

  const handleDismissKeyboard = useCallback(() => {
    Keyboard.dismiss();
    onDone?.();
  }, [onDone]);

  const handleScroll = useCallback(() => {
    if (dismissOnScroll && keyboardVisible) {
      Keyboard.dismiss();
    }
  }, [dismissOnScroll, keyboardVisible]);

  const contextValue: KeyboardContextValue = {
    inputAccessoryViewID,
  };

  const content = (
    <KeyboardContext.Provider value={contextValue}>
      <ScrollView
        style={[styles.scrollView, style]}
        contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
        bounces={true}
        onScrollBeginDrag={handleScroll}
        {...scrollViewProps}
      >
        {dismissOnTap ? (
          <TouchableWithoutFeedback onPress={handleDismissKeyboard} accessible={false}>
            <View style={styles.touchableContent}>
              {children}
            </View>
          </TouchableWithoutFeedback>
        ) : (
          children
        )}
        {/* Extra padding at bottom when keyboard is visible */}
        {keyboardVisible && <View style={{ height: 80 }} />}
      </ScrollView>

      {/* Floating Done Button */}
      {showDoneButton && keyboardVisible && (
        <Animated.View
          style={[
            styles.doneButtonContainer,
            {
              opacity: buttonOpacity,
              transform: [{ translateY: buttonTranslateY }],
              bottom: Platform.OS === 'ios'
                ? keyboardHeight + Spacing.sm
                : Spacing.lg,
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
  touchableContent: {
    flex: 1,
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
