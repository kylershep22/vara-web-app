/**
 * OnboardingIntentionActivity Component
 * Single word/phrase intention setting for onboarding
 *
 * Features:
 * - Short prompt with single-line input
 * - Focus on brevity (word or short phrase)
 * - Submit button
 * - Haptic feedback on completion
 */

import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Text,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, Typography, Layout } from '../../../constants';
import Button from '../../Button';

interface OnboardingIntentionActivityProps {
  prompt: string;
  placeholder?: string;
  onComplete: (response: string) => void;
  maxLength?: number;
}

const OnboardingIntentionActivity: React.FC<OnboardingIntentionActivityProps> = ({
  prompt,
  placeholder = 'Enter a word or phrase...',
  onComplete,
  maxLength = 50,
}) => {
  const [text, setText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const isValid = text.trim().length >= 1;

  const handleSubmit = () => {
    if (!isValid) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onComplete(text.trim());
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <View style={styles.content}>
        {/* Prompt */}
        <Text style={styles.prompt}>{prompt}</Text>

        {/* Intention Input */}
        <View
          style={[
            styles.inputContainer,
            isFocused && styles.inputContainerFocused,
          ]}
        >
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={text}
            onChangeText={(value) => setText(value.slice(0, maxLength))}
            placeholder={placeholder}
            placeholderTextColor={Colors.textSecondary}
            maxLength={maxLength}
            returnKeyType="done"
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onSubmitEditing={handleSubmit}
            accessibilityLabel={prompt}
            accessibilityHint="Enter your intention"
          />
        </View>

        {/* Hint Text */}
        <Text style={styles.hintText}>
          Keep it simple — a single word or short phrase works best
        </Text>

        {/* Submit Button */}
        <View style={styles.buttonContainer}>
          <Button
            variant="primary"
            onPress={handleSubmit}
            disabled={!isValid}
            fullWidth
          >
            Continue
          </Button>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing['3xl'],
    justifyContent: 'flex-start',
  },
  prompt: {
    color: Colors.evergreenTeal,
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semibold,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: Typography.fontSize.xl * Typography.lineHeight.heading,
  },
  inputContainer: {
    backgroundColor: Colors.white,
    borderRadius: Layout.borderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.silverSage,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  inputContainerFocused: {
    borderColor: Colors.evergreenTeal,
    borderWidth: 2,
  },
  input: {
    color: Colors.softCharcoal,
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.medium,
    textAlign: 'center',
    padding: Spacing.sm,
  },
  hintText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.sm,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  buttonContainer: {
    marginTop: Spacing.xl,
  },
});

export default OnboardingIntentionActivity;
