/**
 * Onboarding V2 - Welcome Screen
 * Screen 1 of 3: Brand introduction with CTA.
 * No data collected — name comes from signup.
 */

import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Button } from '../../components';
import { Colors, Spacing, Typography, Layout } from '../../constants';

interface OnboardingV2WelcomeScreenProps {
  navigation: any;
}

const OnboardingV2WelcomeScreen: React.FC<OnboardingV2WelcomeScreenProps> = ({
  navigation,
}) => {
  const handleBegin = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('OnboardingV2CheckIn');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.topSpacer} />

        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Icon name="brain" size={48} color={Colors.white} />
          </View>
        </View>

        <Text style={styles.headline}>
          Vara works with your brain, not against it.
        </Text>

        <Text style={styles.subtext}>
          Build habits that last by first supporting how your brain actually works.
        </Text>

        <View style={styles.bottomSpacer} />
      </View>

      <View style={styles.ctaContainer}>
        <Button
          variant="primary"
          onPress={handleBegin}
          fullWidth
          accessibilityLabel="Let's begin"
          accessibilityRole="button"
        >
          Let's begin
        </Button>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.default,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  topSpacer: {
    flex: 1,
    minHeight: Spacing['3xl'],
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.evergreenTeal,
    justifyContent: 'center',
    alignItems: 'center',
    ...Layout.shadow.md,
  },
  headline: {
    color: Colors.evergreenTeal,
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.semibold,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    letterSpacing: -0.25,
  },
  subtext: {
    color: Colors.softCharcoal,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.regular,
    textAlign: 'center',
    paddingHorizontal: Spacing.sm,
  },
  bottomSpacer: {
    flex: 1,
    minHeight: Spacing['3xl'],
  },
  ctaContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.base,
    paddingTop: Spacing.sm,
  },
});

export default OnboardingV2WelcomeScreen;
