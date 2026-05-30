/**
 * Screen 8 — Bridge / the one idea. A single Highlight Card framing the
 * compounding "why" (not a curriculum), connecting the felt reset to the
 * 14-day arc. Dew Sage background + Evergreen Teal left accent per the styling
 * guide. One primary action.
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { OnboardingScaffold } from '../../components/onboarding/OnboardingScaffold';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { useAuth } from '../../context/AuthContext';
import { saveOnboardingStep } from '../../services/firebase/onboardingStressRecovery.service';

const OnboardingBridgeScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  useEffect(() => {
    if (user?.uid) void saveOnboardingStep(user.uid, 'OnboardingBridge');
  }, [user?.uid]);

  return (
    <OnboardingScaffold
      title="One reset is a start. The change is in the repetition."
      primaryLabel="Continue"
      onPrimary={() => navigation.navigate('OnboardingAnchor')}
    >
      <View style={styles.card}>
        <Text style={styles.cardText}>
          What you felt was a single reset. The change comes from repetition. Give it two
          weeks and you'll feel the difference between a one-off and a pattern.
        </Text>
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
