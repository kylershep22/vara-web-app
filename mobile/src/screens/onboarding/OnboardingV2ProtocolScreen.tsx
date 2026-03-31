/**
 * Onboarding V2 - Protocol Screen
 * Screen 3 of 3: Guided protocol experience.
 * After "Done": requests notification permission, then completes onboarding.
 */

import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { TodaysProtocolCard } from '../../components/dashboard/TodaysProtocolCard';
import { useAuth } from '../../context/AuthContext';
import { markProtocolCompleted } from '../../services/firebase';
import { completeOnboarding } from '../../services/firebase/onboarding.service';
import { getProtocolForState } from '../../constants/brainStateProtocols';
import { Colors, Spacing, Typography } from '../../constants';
import { BrainState } from '../../types';
import { logger } from '../../utils/logger';

interface OnboardingV2ProtocolScreenProps {
  navigation: any;
  route: any;
}

const OnboardingV2ProtocolScreen: React.FC<OnboardingV2ProtocolScreenProps> = ({
  navigation,
  route,
}) => {
  const { user } = useAuth();
  const { brainState } = route.params;
  const protocol = getProtocolForState(brainState);
  const [completing, setCompleting] = useState(false);

  const handleMarkCompleted = async () => {
    if (!user?.uid || completing) return;
    setCompleting(true);
    try {
      // 1. Mark protocol completed
      await markProtocolCompleted(user.uid);

      // 2. Request native notification permission
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      if (existingStatus !== 'granted') {
        await Notifications.requestPermissionsAsync();
      }

      // 3. Complete onboarding — Firestore listener in AppNavigator
      //    will automatically transition to MainNavigator
      await completeOnboarding(user.uid);
    } catch (error) {
      logger.error('Error completing onboarding:', error);
      setCompleting(false);
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
        {/* Protocol card with instructions pre-expanded */}
        <TodaysProtocolCard
          protocol={protocol}
          completed={false}
          onMarkCompleted={handleMarkCompleted}
          startExpanded
        />

        {completing && (
          <View style={styles.completingContainer}>
            <Text style={styles.completingText}>Saved.</Text>
          </View>
        )}
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
  completingContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  completingText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.evergreenTeal,
  },
});

export default OnboardingV2ProtocolScreen;
