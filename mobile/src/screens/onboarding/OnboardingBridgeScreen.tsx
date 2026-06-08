/**
 * Screen 8 — Bridge / the one idea. A single Highlight Card framing the
 * compounding "why" (not a curriculum), connecting the felt reset to the
 * 14-day arc. Dew Sage background + Evergreen Teal left accent per the styling
 * guide. One primary action.
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Repeat } from 'lucide-react-native';
import { OnboardingScaffold } from '../../components/onboarding/OnboardingScaffold';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import {
  ONBOARDING_SR_TOTAL_STEPS,
  onboardingStepNumber,
  driverValenceForState,
} from '../../constants/onboardingStressRecovery';
import { useAuth } from '../../context/AuthContext';
import { saveOnboardingStep } from '../../services/firebase/onboardingStressRecovery.service';
import type { BrainState } from '../../types/models';

const OnboardingBridgeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();
  const state: BrainState | undefined = route.params?.state;

  // "reset" reads wrong for a positive arrival who did a "practice"; branch the
  // framing on initial-state valence (single source). Unknown → activated.
  const positive = driverValenceForState(state) === 'positive';
  const title = positive
    ? 'One practice is a start. The change is in the repetition.'
    : 'One reset is a start. The change is in the repetition.';
  const cardText = positive
    ? "What you felt was a single moment. The change comes from repetition. Give it two weeks and you'll feel the difference between a one-off and a pattern."
    : "What you felt was a single reset. The change comes from repetition. Give it two weeks and you'll feel the difference between a one-off and a pattern.";

  useEffect(() => {
    if (user?.uid) void saveOnboardingStep(user.uid, 'OnboardingBridge');
  }, [user?.uid]);

  return (
    <OnboardingScaffold
      currentStep={onboardingStepNumber('OnboardingBridge')}
      totalSteps={ONBOARDING_SR_TOTAL_STEPS}
      decorativeIcon={Repeat}
      centerContent
      title={title}
      primaryLabel="Continue"
      onPrimary={() => navigation.navigate('OnboardingAnchor', { state })}
    >
      <View style={styles.card}>
        <Text style={styles.cardText}>{cardText}</Text>
      </View>
    </OnboardingScaffold>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.dewSage,
    borderLeftWidth: Layout.borderWidth.thick,
    borderLeftColor: Colors.evergreenTeal,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.lg,
  },
  cardText: {
    fontSize: Typography.fontSize.base,
    color: Colors.softCharcoal,
    lineHeight: Typography.fontSize.base * Typography.lineHeight.normal,
  },
});

export default OnboardingBridgeScreen;
