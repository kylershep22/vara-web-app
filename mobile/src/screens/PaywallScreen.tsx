/**
 * Paywall Screen
 * Shown to users when their subscription has expired
 * Displays pricing options and invite code redemption
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, Typography, Layout } from '../constants';
import { useSubscription } from '../hooks/useSubscription';

// Pricing configuration
const PRICING = {
  monthly: {
    price: '$10.99',
    period: '/month',
    productId: 'vara_monthly',
  },
  annual: {
    price: '$111.99',
    period: '/year',
    savings: 'Save 15%',
    productId: 'vara_annual',
  },
};

// Feature list
const FEATURES = [
  { icon: 'chatbubbles-outline', text: 'Unlimited AI coaching' },
  { icon: 'library-outline', text: 'Full wellness library access' },
  { icon: 'trending-up-outline', text: 'Advanced habit tracking & insights' },
  { icon: 'people-outline', text: 'Community features' },
  { icon: 'journal-outline', text: 'AI-powered journaling' },
  { icon: 'analytics-outline', text: 'Brain health dashboard' },
];

interface PricingCardProps {
  title: string;
  price: string;
  period: string;
  savings?: string;
  recommended?: boolean;
  onPress: () => void;
  disabled?: boolean;
}

const PricingCard: React.FC<PricingCardProps> = ({
  title,
  price,
  period,
  savings,
  recommended,
  onPress,
  disabled,
}) => (
  <TouchableOpacity
    style={[
      styles.pricingCard,
      recommended && styles.pricingCardRecommended,
      disabled && styles.pricingCardDisabled,
    ]}
    onPress={onPress}
    disabled={disabled}
    activeOpacity={0.8}
  >
    {recommended && (
      <View style={styles.recommendedBadge}>
        <Text style={styles.recommendedText}>Best Value</Text>
      </View>
    )}
    <Text style={[styles.pricingTitle, recommended && styles.pricingTitleRecommended]}>
      {title}
    </Text>
    <View style={styles.priceRow}>
      <Text style={[styles.price, recommended && styles.priceRecommended]}>{price}</Text>
      <Text style={[styles.period, recommended && styles.periodRecommended]}>{period}</Text>
    </View>
    {savings && <Text style={styles.savings}>{savings}</Text>}
  </TouchableOpacity>
);

interface FeatureItemProps {
  icon: string;
  text: string;
}

const FeatureItem: React.FC<FeatureItemProps> = ({ icon, text }) => (
  <View style={styles.featureItem}>
    <Ionicons name={icon as any} size={24} color={Colors.evergreenTeal} />
    <Text style={styles.featureText}>{text}</Text>
  </View>
);

const PaywallScreen: React.FC = () => {
  const navigation = useNavigation();
  const { status } = useSubscription();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('annual');

  const handleSubscribe = async () => {
    // TODO: Integrate with RevenueCat for actual purchase
    // For now, show a placeholder message
    console.log('Subscribe pressed:', selectedPlan);

    // In production, this would trigger the RevenueCat purchase flow:
    // const offerings = await Purchases.getOfferings();
    // const pkg = offerings.current?.availablePackages.find(p => p.identifier === selectedPlan);
    // if (pkg) await Purchases.purchasePackage(pkg);
  };

  const handleRedeemCode = () => {
    navigation.navigate('RedeemCode' as never);
  };

  const handleRestorePurchases = async () => {
    // TODO: Integrate with RevenueCat
    // await Purchases.restorePurchases();
    console.log('Restore purchases pressed');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="lock-open-outline" size={48} color={Colors.evergreenTeal} />
          </View>
          <Text style={styles.title}>Unlock Your Full Potential</Text>
          <Text style={styles.subtitle}>
            {status?.type === 'expired'
              ? 'Your trial has ended. Subscribe to continue your wellness journey.'
              : 'Subscribe to access all features and continue growing.'}
          </Text>
        </View>

        {/* Features List */}
        <View style={styles.featuresContainer}>
          <Text style={styles.sectionTitle}>What you'll get:</Text>
          {FEATURES.map((feature, index) => (
            <FeatureItem key={index} icon={feature.icon} text={feature.text} />
          ))}
        </View>

        {/* Pricing Cards */}
        <View style={styles.pricingContainer}>
          <PricingCard
            title="Monthly"
            price={PRICING.monthly.price}
            period={PRICING.monthly.period}
            onPress={() => setSelectedPlan('monthly')}
            recommended={false}
          />
          <PricingCard
            title="Annual"
            price={PRICING.annual.price}
            period={PRICING.annual.period}
            savings={PRICING.annual.savings}
            recommended
            onPress={() => setSelectedPlan('annual')}
          />
        </View>

        {/* Subscribe Button */}
        <TouchableOpacity
          style={styles.subscribeButton}
          onPress={handleSubscribe}
          activeOpacity={0.8}
        >
          <Text style={styles.subscribeButtonText}>
            Subscribe {selectedPlan === 'annual' ? 'Annually' : 'Monthly'}
          </Text>
        </TouchableOpacity>

        {/* Invite Code Option */}
        <TouchableOpacity style={styles.codeButton} onPress={handleRedeemCode}>
          <Ionicons name="gift-outline" size={20} color={Colors.evergreenTeal} />
          <Text style={styles.codeButtonText}>Have an invite code?</Text>
        </TouchableOpacity>

        {/* Restore Purchases */}
        <TouchableOpacity style={styles.restoreButton} onPress={handleRestorePurchases}>
          <Text style={styles.restoreButtonText}>Restore Purchases</Text>
        </TouchableOpacity>

        {/* Data Retention Notice */}
        {status?.dataRetentionDaysRemaining && (
          <View style={styles.noticeContainer}>
            <Ionicons name="information-circle-outline" size={20} color={Colors.warning} />
            <Text style={styles.noticeText}>
              Your data will be kept for {status.dataRetentionDaysRemaining} more days.
              Subscribe to keep your progress permanently.
            </Text>
          </View>
        )}

        {/* Terms */}
        <Text style={styles.terms}>
          Subscriptions will be charged to your payment method through your{' '}
          {Platform.OS === 'ios' ? 'App Store' : 'Play Store'} account.
          Subscriptions automatically renew unless canceled at least 24 hours before the end of the current period.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.default,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.dewSage,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.evergreenTeal,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  featuresContainer: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.base,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  featureText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
    marginLeft: Spacing.base,
    flex: 1,
  },
  pricingContainer: {
    flexDirection: 'row',
    gap: Spacing.base,
    marginBottom: Spacing.lg,
  },
  pricingCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
  },
  pricingCardRecommended: {
    borderColor: Colors.sunriseAmber,
    backgroundColor: '#FFFDF5',
  },
  pricingCardDisabled: {
    opacity: 0.6,
  },
  recommendedBadge: {
    position: 'absolute',
    top: -12,
    backgroundColor: Colors.sunriseAmber,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.xs,
    borderRadius: Layout.borderRadius.full,
  },
  recommendedText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.white,
  },
  pricingTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  pricingTitleRecommended: {
    color: Colors.evergreenTeal,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
  },
  priceRecommended: {
    color: Colors.evergreenTeal,
  },
  period: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  periodRecommended: {
    color: Colors.evergreenTeal,
  },
  savings: {
    fontSize: Typography.fontSize.sm,
    color: Colors.success,
    fontWeight: Typography.fontWeight.medium,
    marginTop: Spacing.xs,
  },
  subscribeButton: {
    backgroundColor: Colors.sunriseAmber,
    borderRadius: Layout.borderRadius.lg,
    paddingVertical: Spacing.base,
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  subscribeButtonText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.white,
  },
  codeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.base,
    marginBottom: Spacing.sm,
  },
  codeButtonText: {
    fontSize: Typography.fontSize.base,
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.medium,
    marginLeft: Spacing.sm,
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  restoreButtonText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    textDecorationLine: 'underline',
  },
  noticeContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF8E1',
    borderRadius: Layout.borderRadius.md,
    padding: Spacing.base,
    marginBottom: Spacing.lg,
    alignItems: 'flex-start',
  },
  noticeText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
    marginLeft: Spacing.sm,
    flex: 1,
    lineHeight: 20,
  },
  terms: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default PaywallScreen;
