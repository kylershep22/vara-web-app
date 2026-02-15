/**
 * Onboarding Welcome Screen
 * First screen in onboarding flow - value proposition
 */

import React from 'react';
import { View, StyleSheet, ScrollView, Image } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Button } from '../../components';
import { Colors, Spacing, Typography, Layout } from '../../constants';

interface OnboardingWelcomeScreenProps {
  navigation: any;
}

const OnboardingWelcomeScreen: React.FC<OnboardingWelcomeScreenProps> = ({ navigation }) => {
  const handleGetStarted = () => {
    navigation.navigate('OnboardingFocus');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* App Logo/Icon */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Icon name="brain" size={48} color={Colors.white} />
          </View>
        </View>

        {/* Title */}
        <Text variant="displaySmall" style={styles.title}>
          Welcome to Vara
        </Text>

        <Text variant="bodyLarge" style={styles.subtitle}>
          Build a healthier brain & body with 5 core pillars
        </Text>

        {/* Brain Health Pillars */}
        <View style={styles.benefitsContainer}>
          <View style={styles.benefitItem}>
            <View style={[styles.benefitIcon, { backgroundColor: '#1B5E57' + '20' }]}>
              <Icon name="sprout" size={24} color="#1B5E57" />
            </View>
            <View style={styles.benefitText}>
              <Text variant="titleSmall" style={styles.benefitTitle}>
                Growth
              </Text>
              <Text variant="bodySmall" style={styles.benefitDescription}>
                Learn new skills, try challenging things, and build mental flexibility
              </Text>
            </View>
          </View>

          <View style={styles.benefitItem}>
            <View style={[styles.benefitIcon, { backgroundColor: '#F4C542' + '20' }]}>
              <Icon name="lightning-bolt" size={24} color="#F4C542" />
            </View>
            <View style={styles.benefitText}>
              <Text variant="titleSmall" style={styles.benefitTitle}>
                Energy
              </Text>
              <Text variant="bodySmall" style={styles.benefitDescription}>
                Quality sleep, nutrition, and movement to fuel your body and brain
              </Text>
            </View>
          </View>

          <View style={styles.benefitItem}>
            <View style={[styles.benefitIcon, { backgroundColor: '#B8CDBA' + '20' }]}>
              <Icon name="eye-circle" size={24} color="#B8CDBA" />
            </View>
            <View style={styles.benefitText}>
              <Text variant="titleSmall" style={styles.benefitTitle}>
                Focus
              </Text>
              <Text variant="bodySmall" style={styles.benefitDescription}>
                Sharpen attention, improve concentration, and enhance mental clarity
              </Text>
            </View>
          </View>

          <View style={styles.benefitItem}>
            <View style={[styles.benefitIcon, { backgroundColor: '#F5B971' + '20' }]}>
              <Icon name="shield-check" size={24} color="#F5B971" />
            </View>
            <View style={styles.benefitText}>
              <Text variant="titleSmall" style={styles.benefitTitle}>
                Resilience
              </Text>
              <Text variant="bodySmall" style={styles.benefitDescription}>
                Build stress tolerance, recovery capacity, and emotional strength
              </Text>
            </View>
          </View>

          <View style={styles.benefitItem}>
            <View style={[styles.benefitIcon, { backgroundColor: '#C7B8EA' + '20' }]}>
              <Icon name="account-heart" size={24} color="#C7B8EA" />
            </View>
            <View style={styles.benefitText}>
              <Text variant="titleSmall" style={styles.benefitTitle}>
                Connection
              </Text>
              <Text variant="bodySmall" style={styles.benefitDescription}>
                Strengthen relationships, build belonging, and support others
              </Text>
            </View>
          </View>
        </View>

        {/* CTA Button */}
        <View style={styles.ctaContainer}>
          <Button
            variant="primary"
            onPress={handleGetStarted}
            fullWidth
            style={styles.ctaButton}
          >
            Get Started
          </Button>

          <Text variant="bodySmall" style={styles.footerText}>
            Takes less than 2 minutes
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.default,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.lg,
    justifyContent: 'space-between',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.evergreenTeal,
    justifyContent: 'center',
    alignItems: 'center',
    ...Layout.shadow.md,
  },
  title: {
    color: Colors.evergreenTeal,
    textAlign: 'center',
    marginBottom: Spacing.xs,
    fontWeight: Typography.fontWeight.bold,
    fontSize: Typography.fontSize.xl,
  },
  subtitle: {
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    fontSize: Typography.fontSize.sm,
  },
  benefitsContainer: {
    marginBottom: Spacing.base,
  },
  benefitItem: {
    flexDirection: 'row',
    marginBottom: Spacing.base,
    alignItems: 'flex-start',
  },
  benefitIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  benefitText: {
    flex: 1,
  },
  benefitTitle: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: 2,
  },
  benefitDescription: {
    color: Colors.textSecondary,
    lineHeight: Typography.fontSize.sm * 1.4,
    fontSize: Typography.fontSize.xs,
  },
  ctaContainer: {
    marginTop: 'auto',
    paddingTop: Spacing.base,
  },
  ctaButton: {
    marginBottom: Spacing.base,
  },
  footerText: {
    color: Colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default OnboardingWelcomeScreen;
