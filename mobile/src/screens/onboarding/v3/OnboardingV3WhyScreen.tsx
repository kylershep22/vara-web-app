/**
 * Step 3 of 8 — The why. Free text, SKIPPABLE.
 *
 * Skipped is stored as null, never as ''. "They skipped it" and "they answered
 * and said nothing" are different facts, and only the first should read back as
 * absent. Same rule the weekly close applies to closeNote.
 *
 * Uncapped on purpose: the floor commitment has a hard 100-char cap because it
 * is echoed into a one-line reminder, and this is not. It lands on the
 * owner-only private document and is never rendered anywhere a length would
 * break a layout.
 */
import React, { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { OnboardingScaffold } from '../../../components/onboarding/OnboardingScaffold';
import { Colors, Layout, Spacing, Typography } from '../../../constants';
import { WHY_COPY } from './copy';
import { useOnboardingV3 } from './OnboardingV3Context';
import { V3_ROUTES, V3_TOTAL_STEPS, v3StepNumber } from './routes';

const INPUT_MIN_HEIGHT = 120;

export const OnboardingV3WhyScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { whyNote, setWhyNote } = useOnboardingV3();
  // Seeded from context so returning via back shows what was already typed.
  const [text, setText] = useState(whyNote ?? '');

  const advance = useCallback(
    (note: string | null) => {
      setWhyNote(note);
      navigation.navigate(V3_ROUTES.Capacity);
    },
    [setWhyNote, navigation]
  );

  // An all-whitespace answer is a skip, not an answer.
  const trimmed = text.trim();

  return (
    <OnboardingScaffold
      currentStep={v3StepNumber(V3_ROUTES.Why)}
      totalSteps={V3_TOTAL_STEPS}
      title={WHY_COPY.title}
      subtitle={WHY_COPY.subtitle}
      primaryLabel={WHY_COPY.primary}
      onPrimary={() => advance(trimmed ? trimmed : null)}
      onSkip={() => advance(null)}
      onBack={() => navigation.goBack()}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={WHY_COPY.placeholder}
          placeholderTextColor={Colors.mutedSageGray}
          multiline
          textAlignVertical="top"
          accessibilityLabel={WHY_COPY.title}
          testID="v3-why-input"
        />
      </KeyboardAvoidingView>
    </OnboardingScaffold>
  );
};

const styles = StyleSheet.create({
  input: {
    minHeight: INPUT_MIN_HEIGHT,
    borderRadius: Layout.borderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.silverSage,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    fontSize: Typography.fontSize.base,
    color: Colors.softCharcoal,
    lineHeight: Typography.fontSize.base * Typography.lineHeight.normal,
  },
});

export default OnboardingV3WhyScreen;
