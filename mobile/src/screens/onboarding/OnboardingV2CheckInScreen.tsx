/**
 * Onboarding V2 - Check-In Screen
 * Screen 2 of 3: Single-tap brain state selection.
 * Auto-advances to protocol screen after selection.
 *
 * Sub-step 2.5 — onboarding stays on the v1-style two-screen pattern
 * (CheckIn → Protocol) for educational reasons; the new multi-step
 * CheckInFlow would over-complicate the first-time user experience.
 * Renders BRAIN_STATES + BrainStateOptionRow directly rather than
 * re-using the dashboard's BrainStateCheckin (which now navigates
 * to CheckInFlow on tap).
 */

import React, { useState, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BRAIN_STATES } from '../../components/dashboard/brainStateCheckin/brainStateOptions';
import { BrainStateOptionRow } from '../../components/dashboard/brainStateCheckin/BrainStateOptionRow';
import { useAuth } from '../../context/AuthContext';
import { saveBrainStateCheckIn } from '../../services/firebase';
import { selectProtocol } from '../../services/protocolSelector.service';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { BrainState } from '../../types';
import { logger } from '../../utils/logger';

interface OnboardingV2CheckInScreenProps {
  navigation: any;
}

const OnboardingV2CheckInScreen: React.FC<OnboardingV2CheckInScreenProps> = ({
  navigation,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const hasNavigated = useRef(false);

  const handleSelect = async (state: BrainState) => {
    if (!user?.uid || hasNavigated.current) return;
    setLoading(true);
    try {
      const checkIn = await saveBrainStateCheckIn(user.uid, state);
      // Sub-step 2.5 — getProtocolForState was deleted. Onboarding's
      // single-tap pattern doesn't capture a time-window, so default
      // to the 5-min "meaningful shift" tier per Core Loop v2 step 2.
      // Onboarding stays on the v1-style two-screen pattern (CheckIn →
      // Protocol) for educational reasons; full CheckInFlow mounting
      // would over-complicate the first-time user experience.
      const protocol = selectProtocol({ state, timeWindow: 5 });

      // Wait for the "Captured." animation (2 seconds), then navigate
      setTimeout(() => {
        if (!hasNavigated.current) {
          hasNavigated.current = true;
          navigation.navigate('OnboardingV2Protocol', {
            brainState: state,
            protocolId: protocol.id,
          });
        }
      }, 2200);
    } catch (error) {
      logger.error('Error saving onboarding check-in:', error);
      setLoading(false);
    }
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Back button */}
      <TouchableOpacity onPress={handleBack} style={styles.backButton}>
        <Icon name="chevron-left" size={28} color={Colors.evergreenTeal} />
      </TouchableOpacity>

      <View style={styles.content}>
        {/* Headline */}
        <Text style={styles.headline}>How's your brain feeling right now?</Text>
        <Text style={styles.subtext}>This is what you'll do each day. Just one tap.</Text>

        {/* Direct chip rows — onboarding doesn't use the dashboard's
            BrainStateCheckin because that component now navigates to
            CheckInFlow on tap (sub-step 2.5 migration). Onboarding
            wants a simpler educational two-screen pattern. */}
        <View style={styles.chipsContainer}>
          {BRAIN_STATES.map((option, index) => (
            <BrainStateOptionRow
              key={option.state}
              option={option}
              onPress={handleSelect}
              disabled={loading}
              isLast={index === BRAIN_STATES.length - 1}
            />
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.default,
  },
  backButton: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    alignSelf: 'flex-start',
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  headline: {
    color: Colors.evergreenTeal,
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.sm,
  },
  subtext: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.sm,
    marginBottom: Spacing.xl,
  },
  chipsContainer: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.lg,
  },
});

export default OnboardingV2CheckInScreen;
