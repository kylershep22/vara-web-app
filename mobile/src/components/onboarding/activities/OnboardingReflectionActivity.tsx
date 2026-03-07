/**
 * OnboardingReflectionActivity Component
 * Text input reflection activity for onboarding
 *
 * Features:
 * - Prompt with text input
 * - Character count
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
  ScrollView,
  Text,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, Typography, Layout } from '../../../constants';
import Button from '../../Button';

interface OnboardingReflectionActivityProps {
  prompt: string;
  placeholder?: string;
  onComplete: (response: string) => void;
  minLength?: number;
  maxLength?: number;
}

const OnboardingReflectionActivity: React.FC<OnboardingReflectionActivityProps> = ({
  prompt,
  placeholder = 'Write your thoughts here...',
  onComplete,
  minLength = 3,
  maxLength = 500,
}) => {
  const [text, setText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const isValid = text.trim().length >= minLength;
  const characterCount = text.length;

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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Prompt */}
        <Text style={styles.prompt}>{prompt}</Text>

        {/* Text Input */}
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
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            accessibilityLabel={prompt}
            accessibilityHint="Enter your reflection"
          />
        </View>

        {/* Character Count */}
        <View style={styles.countContainer}>
          <Text style={styles.countText}>
            {characterCount} / {maxLength}
          </Text>
        </View>

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

          {!isValid && text.length > 0 && (
            <Text style={styles.hintText}>
              Write at least {minLength} characters to continue
            </Text>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
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
    padding: Spacing.base,
    minHeight: 160,
  },
  inputContainerFocused: {
    borderColor: Colors.evergreenTeal,
    borderWidth: 2,
  },
  input: {
    color: Colors.softCharcoal,
    fontSize: Typography.fontSize.base,
    lineHeight: Typography.fontSize.base * Typography.lineHeight.normal,
    minHeight: 140,
    padding: 0,
  },
  countContainer: {
    alignItems: 'flex-end',
    marginTop: Spacing.sm,
  },
  countText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.xs,
  },
  buttonContainer: {
    marginTop: Spacing.xl,
  },
  hintText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.sm,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});

export default OnboardingReflectionActivity;
