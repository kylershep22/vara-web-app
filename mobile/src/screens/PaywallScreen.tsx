/**
 * Paywall Screen
 * Shown to users when their subscription has expired or to present pricing.
 * Displays the Vara value proposition, pricing options, and trial CTA.
 *
 * Prices render from RevenueCat offerings (StoreKit-localized) — env values
 * are only a fallback for the static legal copy when offerings haven't loaded.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Purchases, { INTRO_ELIGIBILITY_STATUS } from 'react-native-purchases';
import type { PurchasesPackage } from 'react-native-purchases';
import { Colors, Spacing, Typography, Layout } from '../constants';
import { PRIVACY_POLICY_URL, TERMS_OF_USE_URL } from '../constants/legal';
import { config } from '../config/env';
import { useAccountActions } from '../hooks/useAccountActions';
import PricingSelector from '../components/paywall/PricingSelector';
import TrialTimeline from '../components/paywall/TrialTimeline';
import { EventCodeSheet } from '../components/events/EventCodeSheet';
import {
  initiatePurchase,
  restorePurchase,
  getCurrentOfferingPackages,
} from '../services/subscription.service';

// Fallback strings used only if offerings fail to load. The env's currency
// symbol is approximate; once RC offerings load, localized priceString wins.
const FALLBACK_CURRENCY = config.currency === 'USD' ? '$' : config.currency;
const FALLBACK_MONTHLY = `${FALLBACK_CURRENCY}${config.monthlyPrice}`;
const FALLBACK_ANNUAL = `${FALLBACK_CURRENCY}${config.annualPrice}`;
const FALLBACK_ANNUAL_EQUIVALENT = `${FALLBACK_CURRENCY}${config.annualMonthlyEquivalent}`;

// Feature list. Outcomes-led (the June pivot): value stated as focus / energy /
// time and how the guidance meets the user, not brain-health mechanics. The
// insights line stays a gentle look-back (no surveillance / progress-grading).
const FEATURES = [
  'AI guidance in service of focus, energy, and time',
  'Full audio and content library',
  'Unlimited habits, routines, and reflections',
  'A gentle look back at your patterns',
  'Guidance that meets you where you arrive each day',
];

const PaywallScreen: React.FC = () => {
  const { deleting, confirmLogout, confirmDeleteAccount } = useAccountActions();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('annual');
  const [purchasing, setPurchasing] = useState(false);
  const [monthlyPkg, setMonthlyPkg] = useState<PurchasesPackage | null>(null);
  const [annualPkg, setAnnualPkg] = useState<PurchasesPackage | null>(null);
  // Per-Apple-ID intro-offer eligibility. 'unknown' until resolved AND on any
  // failure — we fail SAFE to the no-trial state so we never promise a free
  // trial Apple won't grant (a reinstall / prior-trial user would be charged on
  // tap — 3.1.2 + refund risk). `introPrice` is a product attribute and is NOT
  // a valid per-user signal, so it is deliberately not used here.
  const [trialEligibility, setTrialEligibility] = useState<'eligible' | 'ineligible' | 'unknown'>(
    'unknown'
  );
  const [codeSheetVisible, setCodeSheetVisible] = useState(false);

  const showTrial = trialEligibility === 'eligible';

  // Load RC offerings on mount. Prices come from StoreKit-localized
  // priceString; fallback env values render only if this fails.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { monthly, annual } = await getCurrentOfferingPackages();
      if (cancelled) return;
      setMonthlyPkg(monthly);
      setAnnualPkg(annual);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Resolve per-Apple-ID trial eligibility for the SELECTED plan's product.
  // Fail safe: any missing product / API rejection leaves the no-trial state.
  useEffect(() => {
    let cancelled = false;
    const pkg = selectedPlan === 'monthly' ? monthlyPkg : annualPkg;
    const productId = pkg?.product?.identifier;
    if (!productId) {
      setTrialEligibility('unknown');
      return;
    }
    (async () => {
      try {
        const map = await Purchases.checkTrialOrIntroductoryPriceEligibility([productId]);
        if (cancelled) return;
        const eligible =
          map[productId]?.status ===
          INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE;
        setTrialEligibility(eligible ? 'eligible' : 'ineligible');
      } catch {
        if (!cancelled) setTrialEligibility('unknown');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedPlan, monthlyPkg, annualPkg]);

  const monthlyPrice = monthlyPkg?.product?.priceString ?? FALLBACK_MONTHLY;
  const annualPrice = annualPkg?.product?.priceString ?? FALLBACK_ANNUAL;

  const handleSubscribe = async () => {
    setPurchasing(true);
    try {
      const result = await initiatePurchase(selectedPlan);
      // userCancelled: user dismissed Apple's purchase sheet — silent, not an error.
      if (result.userCancelled) {
        return;
      }
      if (!result.success && result.error) {
        Alert.alert('Not Available', result.error);
      }
      // On success: initiatePurchase already reconciled the RevenueCat
      // entitlement signal from the returned CustomerInfo, so canAccessApp flips
      // immediately and the route guard swaps the paywall for the app — no wait
      // on the webhook. The webhook still writes Firestore (the durable record)
      // and useSubscription's onSnapshot reflects it. No client-side write here.
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
      } else if (result.success && !result.restored) {
        Alert.alert('Nothing to restore', 'No prior purchases were found for this account.');
      }
    } catch (error) {
      Alert.alert('Error', 'Could not restore purchase. Please try again.');
    }
  };

  const openUrl = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Unavailable', 'Could not open the link. Please try again later.');
    });
  };

  // Mirrors HelpSupportScreen's email-support action (which lives behind the
  // gate), so a gated user can still reach support — e.g. about a billing issue
  // keeping them out — without entering the app.
  const handleContactSupport = () => {
    Linking.openURL('mailto:support@varawellness.co?subject=Vara App Support').catch(() => {
      Alert.alert('Unavailable', 'Could not open your mail app. Please email support@varawellness.co.');
    });
  };

  // Legal copy uses the same localized price string the cards render.
  const priceText =
    selectedPlan === 'monthly'
      ? `${monthlyPrice}/month`
      : `${annualPrice}/year`;

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

        {/* Heading + blurb name the offer, not the trial mechanic — consistent
            regardless of trial eligibility. The 14-day framing lives in the CTA,
            timeline, and legal copy below (shown only when a trial is available). */}
        <Text style={styles.heading}>The full Vara experience</Text>

        {/* Body — outcomes-led subtitle (focus / energy / time), not brain-health
            mechanics. */}
        <Text style={styles.body}>
          Find your focus. Settle your energy. Get your time back.
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
            monthlyPrice={monthlyPrice}
            annualPrice={annualPrice}
            annualMonthlyEquivalent={annualPkg ? undefined : FALLBACK_ANNUAL_EQUIVALENT}
          />
        </View>

        {/* Trial timeline — only when an intro trial is actually available to
            this Apple ID. Calm transparency: today → reminder → billing. */}
        {showTrial && <TrialTimeline />}

        {/* Primary CTA */}
        <TouchableOpacity
          style={[styles.ctaButton, purchasing && styles.ctaButtonDisabled]}
          onPress={handleSubscribe}
          activeOpacity={0.8}
          disabled={purchasing}
          accessibilityRole="button"
          accessibilityLabel={showTrial ? 'Start your 14-day free trial' : 'Subscribe'}
        >
          <Text style={styles.ctaButtonText}>
            {showTrial ? 'Start your 14-day free trial' : 'Subscribe'}
          </Text>
        </TouchableOpacity>

        {/* Legal Text — matches the actual offer. Trial language only when an
            intro trial is available to this Apple ID (Edge Case 2); otherwise
            honest direct-subscription copy. */}
        <Text style={styles.legalText}>
          {showTrial
            ? `Free for 14 days, then ${priceText}. Cancel anytime. Billed automatically unless cancelled before trial ends.`
            : `${priceText}. Cancel anytime.`}
        </Text>

        {/* Terms of Use (EULA) + Privacy Policy — required on the purchase screen
            per App Store Review Guideline 3.1.2. */}
        <View style={styles.legalLinks}>
          <TouchableOpacity
            onPress={() => openUrl(TERMS_OF_USE_URL)}
            accessibilityRole="link"
            accessibilityLabel="Terms of Use"
          >
            <Text style={styles.legalLinkText}>Terms of Use</Text>
          </TouchableOpacity>
          <Text style={styles.legalLinkSeparator}>·</Text>
          <TouchableOpacity
            onPress={() => openUrl(PRIVACY_POLICY_URL)}
            accessibilityRole="link"
            accessibilityLabel="Privacy Policy"
          >
            <Text style={styles.legalLinkText}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>

        {/* Have a code? — quiet entry to the existing event-code redemption
            (beta access + future events; generic "code" label). On success the
            validateEventCode grant satisfies canAccessApp via the Firestore-first
            OR-merge, so the gate falls away automatically — no extra wiring. */}
        <TouchableOpacity
          style={styles.haveCodeButton}
          onPress={() => setCodeSheetVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Have a code?"
        >
          <Text style={styles.haveCodeText}>Have a code?</Text>
        </TouchableOpacity>

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

        {/* Account actions — escape hatch so a gated user can still sign out or
            delete their account (Apple Guideline 5.1.1(v)). These trigger the
            shared confirmation dialogs and end the user at the auth screen;
            neither opens a path into gated app content. */}
        <View style={styles.accountActions}>
          <TouchableOpacity
            onPress={confirmLogout}
            disabled={deleting}
            accessibilityRole="button"
            accessibilityLabel="Log out"
          >
            <Text style={styles.accountActionText}>Log out</Text>
          </TouchableOpacity>
          <Text style={styles.accountActionSeparator}>·</Text>
          <TouchableOpacity
            onPress={confirmDeleteAccount}
            disabled={deleting}
            accessibilityRole="button"
            accessibilityLabel="Delete account"
          >
            <Text style={styles.accountActionText}>
              {deleting ? 'Deleting account…' : 'Delete account'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Contact support — surfaces the existing email-support action so it's
            reachable from behind the gate. */}
        <TouchableOpacity
          style={styles.contactSupportButton}
          onPress={handleContactSupport}
          accessibilityRole="button"
          accessibilityLabel="Contact support"
        >
          <Text style={styles.accountActionText}>Contact support</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Existing event-code redemption modal, mounted as-is. */}
      <EventCodeSheet
        visible={codeSheetVisible}
        onDismiss={() => setCodeSheetVisible(false)}
        onSuccess={() => setCodeSheetVisible(false)}
      />
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
    marginBottom: Spacing.sm,
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  legalLinkText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.mutedSageGray,
    textDecorationLine: 'underline',
    paddingVertical: Spacing.xs,
  },
  legalLinkSeparator: {
    fontSize: Typography.fontSize.xs,
    color: Colors.mutedSageGray,
    marginHorizontal: Spacing.sm,
  },
  haveCodeButton: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    minHeight: 48,
    justifyContent: 'center',
  },
  haveCodeText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.mutedSageGray,
    textDecorationLine: 'underline',
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
  accountActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  accountActionText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.mutedSageGray,
    textDecorationLine: 'underline',
    paddingVertical: Spacing.xs,
  },
  accountActionSeparator: {
    fontSize: Typography.fontSize.xs,
    color: Colors.mutedSageGray,
    marginHorizontal: Spacing.sm,
  },
  contactSupportButton: {
    alignItems: 'center',
    marginTop: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
});

export default PaywallScreen;
