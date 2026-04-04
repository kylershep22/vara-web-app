/**
 * Paywall Screen
 * Shown to users when their subscription has expired or to present pricing.
 * Displays the Vara value proposition, pricing options, and trial CTA.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Layout } from '../constants';
import { useSubscription } from '../hooks/useSubscription';
import PricingSelector from '../components/paywall/PricingSelector';
import {
  initiatePurchase,
  restorePurchase,
} from '../services/subscription.service';

// Pricing defaults (read from env at build time)
const MONTHLY_PRICE = process.env.EXPO_PUBLIC_MONTHLY_PRICE || '9.99';
const ANNUAL_PRICE = process.env.EXPO_PUBLIC_ANNUAL_PRICE || '79.99';

// Feature list (max 4 items)
const FEATURES = [
  'AI-powered brain health guidance',
  'Full audio and content library',
  'Unlimited habits, routines, and reflections',
  'Detailed insights and progress patterns',
];

const PaywallScreen: React.FC = () => {
  const { status } = useSubscription();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('annual');
  const [purchasing, setPurchasing] = useState(false);

  const isExpired = status?.type === 'expired';

  const handleSubscribe = async () => {
    setPurchasing(true);
    try {
      const result = await initiatePurchase(selectedPlan);
      if (!result.success && result.error) {
        Alert.alert('Not Available', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    try {
      const result = await restorePurchase();
      if (!result.success && result.error) {
        Alert.alert('Restore', result.error);
      } else if (result.restored) {
        Alert.alert('Restored', 'Your subscription has been restored.');
      }
    } catch (error) {
      Alert.alert('Error', 'Could not restore purchase. Please try again.');
    }
  };

  // Determine price text for legal copy
  const priceText =
    selectedPlan === 'monthly'
      ? `$${MONTHLY_PRICE}/month`
      : `$${ANNUAL_PRICE}/year`;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo Area */}
        <View style={styles.logoArea}>
          <View style={styles.logoCircle}>
            <Ionicons name="leaf" size={40} color={Colors.evergreenTeal} />
          </View>
        </View>

        {/* Heading */}
        <Text style={styles.heading}>
          {isExpired ? 'Your free trial has ended' : 'The full Vara experience'}
        </Text>

        {/* Body */}
        <Text style={styles.body}>
          {isExpired
            ? 'We hope Vara has been useful. To continue, choose a subscription below.'
            : 'Everything Vara offers, designed around how your brain actually works.'}
        </Text>

        {/* Feature List */}
        <View style={styles.featureList}>
          {FEATURES.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <View style={styles.bullet} />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        {/* Pricing Selector */}
        <View style={styles.pricingContainer}>
          <PricingSelector
            selectedPlan={selectedPlan}
            onSelectPlan={setSelectedPlan}
          />
        </View>

        {/* Primary CTA */}
        <TouchableOpacity
          style={[styles.ctaButton, purchasing && styles.ctaButtonDisabled]}
          onPress={handleSubscribe}
          activeOpacity={0.8}
          disabled={purchasing}
          accessibilityRole="button"
          accessibilityLabel={
            isExpired ? 'Continue with Vara' : 'Start your 7-day free trial'
          }
        >
          <Text style={styles.ctaButtonText}>
            {isExpired ? 'Continue with Vara' : 'Start your 7-day free trial'}
          </Text>
        </TouchableOpacity>

        {/* Legal Text */}
        <Text style={styles.legalText}>
          Free for 7 days, then {priceText}. Cancel anytime. Billed automatically
          unless cancelled before trial ends.
        </Text>

        {/* Restore Purchase */}
        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestore}
          activeOpacity={0.6}
          accessibilityRole="button"
          accessibilityLabel="Restore previous purchase"
        >
          <Text style={styles.restoreButtonText}>Restore previous purchase</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.mistWhite,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  logoArea: {
    alignItems: 'center',
    paddingTop: 32,
    marginBottom: Spacing.lg,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.dewSage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.evergreenTeal,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  body: {
    fontSize: 16,
    color: Colors.softCharcoal,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.xl,
  },
  featureList: {
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.sm,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  bullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.evergreenTeal,
    marginRight: Spacing.base,
  },
  featureText: {
    fontSize: Typography.fontSize.base,
    color: Colors.softCharcoal,
    flex: 1,
  },
  pricingContainer: {
    marginBottom: Spacing.lg,
  },
  ctaButton: {
    backgroundColor: Colors.evergreenTeal,
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.base,
  },
  ctaButtonDisabled: {
    opacity: 0.6,
  },
  ctaButtonText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: '#FFFFFF',
  },
  legalText: {
    fontSize: 12,
    color: Colors.mutedSageGray,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Spacing.lg,
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    minHeight: 48,
    justifyContent: 'center',
  },
  restoreButtonText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.mutedSageGray,
    textDecorationLine: 'underline',
  },
});

export default PaywallScreen;
