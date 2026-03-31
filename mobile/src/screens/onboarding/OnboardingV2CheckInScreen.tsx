/**
 * Onboarding V2 - Check-In Screen
 * Screen 2 of 3: Single-tap brain state selection.
 * Reuses BrainStateCheckin from Dashboard V2.
 * Auto-advances to protocol screen after selection.
 */

import React, { useState, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BrainStateCheckin } from '../../components/dashboard/BrainStateCheckin';
import { useAuth } from '../../context/AuthContext';
import { saveBrainStateCheckIn } from '../../services/firebase';
import { getProtocolForState } from '../../constants/brainStateProtocols';
import { Colors, Spacing, Typography } from '../../constants';
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
      const protocol = getProtocolForState(state);

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

        {/* Reuse BrainStateCheckin — always expanded (no currentCheckIn) */}
        <BrainStateCheckin
          currentCheckIn={null}
          onSelect={handleSelect}
          loading={loading}
        />
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
});

export default OnboardingV2CheckInScreen;
