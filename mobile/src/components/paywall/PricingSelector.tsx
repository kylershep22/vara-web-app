/**
 * PricingSelector Component
 * Displays monthly and annual pricing options for the paywall.
 * Annual plan is visually recommended with a Dew Sage background tint.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  AccessibilityInfo,
} from 'react-native';
import { Colors, Spacing, Typography } from '../../constants';
import { config } from '../../config/env';

const MONTHLY_PRICE = config.monthlyPrice;
const ANNUAL_PRICE = config.annualPrice;
const ANNUAL_MONTHLY_EQUIVALENT = config.annualMonthlyEquivalent;
const currencySymbol = config.currency === 'USD' ? '$' : config.currency;

interface PricingSelectorProps {
  selectedPlan: 'monthly' | 'annual';
  onSelectPlan: (plan: 'monthly' | 'annual') => void;
}

const PricingSelector: React.FC<PricingSelectorProps> = ({
  selectedPlan,
  onSelectPlan,
}) => {
  return (
    <View style={styles.container}>
      {/* Monthly Card */}
      <TouchableOpacity
        style={[
          styles.card,
          selectedPlan === 'monthly' && styles.cardSelected,
        ]}
        onPress={() => onSelectPlan('monthly')}
        activeOpacity={0.7}
        accessibilityRole="radio"
        accessibilityState={{ selected: selectedPlan === 'monthly' }}
        accessibilityLabel={`Monthly plan, ${currencySymbol}${MONTHLY_PRICE} per month`}
      >
        <Text
          style={[
            styles.label,
            selectedPlan === 'monthly' && styles.labelSelected,
          ]}
        >
          Monthly
        </Text>
        <Text
          style={[
            styles.price,
            selectedPlan === 'monthly' && styles.priceSelected,
          ]}
        >
          {currencySymbol}{MONTHLY_PRICE}
          <Text style={styles.period}>/month</Text>
        </Text>
      </TouchableOpacity>

      {/* Annual Card */}
      <TouchableOpacity
        style={[
          styles.card,
          styles.cardAnnual,
          selectedPlan === 'annual' && styles.cardSelected,
        ]}
        onPress={() => onSelectPlan('annual')}
        activeOpacity={0.7}
        accessibilityRole="radio"
        accessibilityState={{ selected: selectedPlan === 'annual' }}
        accessibilityLabel={`Annual plan, ${currencySymbol}${ANNUAL_PRICE} per year, equivalent to ${currencySymbol}${ANNUAL_MONTHLY_EQUIVALENT} per month. Best value.`}
      >
        <View style={styles.bestValueTag}>
          <Text style={styles.bestValueText}>Best value</Text>
        </View>
        <Text
          style={[
            styles.label,
            selectedPlan === 'annual' && styles.labelSelected,
          ]}
        >
          Annual
        </Text>
        <Text
          style={[
            styles.price,
            selectedPlan === 'annual' && styles.priceSelected,
          ]}
        >
          {currencySymbol}{ANNUAL_PRICE}
          <Text style={styles.period}>/year</Text>
        </Text>
        <Text style={styles.equivalent}>
          Equivalent to {currencySymbol}{ANNUAL_MONTHLY_EQUIVALENT}/month
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: Spacing.base,
  },
  card: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.silverSage,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  cardAnnual: {
    backgroundColor: Colors.dewSage + '33', // Subtle Dew Sage tint (~20% opacity)
    // Slightly larger to visually recommend
    paddingVertical: Spacing.lg + 4,
  },
  cardSelected: {
    borderColor: Colors.evergreenTeal,
    borderWidth: 1.5,
  },
  bestValueTag: {
    backgroundColor: Colors.dewSage,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: Spacing.xs,
  },
  bestValueText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.evergreenTeal,
  },
  label: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
    marginBottom: Spacing.xs,
  },
  labelSelected: {
    color: Colors.evergreenTeal,
  },
  price: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.softCharcoal,
  },
  priceSelected: {
    color: Colors.evergreenTeal,
  },
  period: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.normal,
  },
  equivalent: {
    fontSize: Typography.fontSize.xs,
    color: Colors.mutedSageGray,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
});

export default PricingSelector;
