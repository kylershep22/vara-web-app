/**
 * Step 5 of 8 — The floor. Stemmed free text, SKIPPABLE.
 *
 * The stem ("Even on my worst week, I will") is DISPLAY ONLY and is never
 * stored or concatenated. What persists is the user's own words, exactly as
 * typed, because that string is echoed back on hard weeks and a sentence
 * assembled by the app does not read as theirs.
 *
 * The cap comes from FLOOR_COMMITMENT_MAX_CHARS rather than a local literal:
 * the service enforces the same number as a backstop for every caller, and two
 * numbers that must agree should not be written twice.
 *
 * Skipped is null, never ''. getFloorCommitment() already collapses '' and
 * whitespace to null on read, so storing one would produce a user who completed
 * capture and still reads as having no floor.
 */
import React, { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { OnboardingScaffold } from '../../../components/onboarding/OnboardingScaffold';
import { Colors, Layout, Spacing, Typography } from '../../../constants';
import { FLOOR_COMMITMENT_MAX_CHARS } from '../../../services/firebase/userPrivate.service';
import { FLOOR_COPY } from './copy';
import { useOnboardingV3 } from './OnboardingV3Context';
import { V3_ROUTES, V3_TOTAL_STEPS, v3StepNumber } from './routes';

const MIN_TOUCH_TARGET = 48;

export const OnboardingV3FloorScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { floorCommitment, setFloorCommitment } = useOnboardingV3();
  const [text, setText] = useState(floorCommitment ?? '');

  const advance = useCallback(
    (floor: string | null) => {
      setFloorCommitment(floor);
      navigation.navigate(V3_ROUTES.FirstWin);
    },
    [setFloorCommitment, navigation]
  );

  const trimmed = text.trim();

  return (
    <OnboardingScaffold
      currentStep={v3StepNumber(V3_ROUTES.Floor)}
      totalSteps={V3_TOTAL_STEPS}
      title={FLOOR_COPY.title}
      subtitle={FLOOR_COPY.subtitle}
      primaryLabel={FLOOR_COPY.primary}
      onPrimary={() => advance(trimmed ? trimmed : null)}
      onSkip={() => advance(null)}
      onBack={() => navigation.goBack()}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View>
          <Text style={styles.stem}>{FLOOR_COPY.stem}</Text>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder={FLOOR_COPY.placeholder}
            placeholderTextColor={Colors.mutedSageGray}
            maxLength={FLOOR_COMMITMENT_MAX_CHARS}
            multiline={false}
            returnKeyType="done"
            // The stem is not in the input, so the accessible name has to carry
            // it or the field reads as an unlabelled box.
            accessibilityLabel={`${FLOOR_COPY.stem} ${FLOOR_COPY.title}`}
            testID="v3-floor-input"
          />
        </View>
      </KeyboardAvoidingView>
    </OnboardingScaffold>
  );
};

const styles = StyleSheet.create({
  stem: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.softCharcoal,
    marginBottom: Spacing.sm,
  },
  input: {
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: Layout.borderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.silverSage,
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    fontSize: Typography.fontSize.base,
    color: Colors.softCharcoal,
  },
});

export default OnboardingV3FloorScreen;
