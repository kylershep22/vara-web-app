/**
 * Onboarding Personalized Entry Screen
 * Screen 6 of 6 - Confirmation before entering the app
 *
 * Shows the user's selected values and starting focus,
 * then navigates to the home screen on CTA tap.
 */

import React from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRoute, RouteProp } from '@react-navigation/native';
import { OnboardingProgressDots } from '../../components/onboarding';
import { Colors, Spacing, Typography } from '../../constants';
import { VARA_VALUES, ValueId, getValueById } from '../../constants/values';
import { getPillarById } from '../../constants/featureUnlock';
import { completeOnboarding, saveSelectedValues } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { OnboardingStackParamList } from '../../types/onboarding';
import { BrainPillar } from '../../types';

type PersonalizedEntryRouteProp = RouteProp<
  OnboardingStackParamList,
  'OnboardingPersonalizedEntry'
>;

interface OnboardingPersonalizedEntryScreenProps {
  navigation: any;
}

// Map BrainPillar to MaterialCommunityIcons name
const PILLAR_ICONS: Record<BrainPillar, string> = {
  focus: 'circle-double',
  energy: 'lightning-bolt-outline',
  growth: 'sprout',
  resilience: 'shield-outline',
  connection: 'account-group-outline',
};

// Capitalize first letter for display
const getPillarLabel = (pillar: BrainPillar): string => {
  const config = getPillarById(pillar);
  return config?.title || pillar.charAt(0).toUpperCase() + pillar.slice(1);
};

const OnboardingPersonalizedEntryScreen: React.FC<
  OnboardingPersonalizedEntryScreenProps
> = ({ navigation }) => {
  const route = useRoute<PersonalizedEntryRouteProp>();
  const { user } = useAuth();
  const { selectedFocus, selectedValues } = route.params;

  // Check if any selected value aligns with starting focus
  const alignmentMatch = VARA_VALUES.some(
    (v) => selectedValues.includes(v.id) && v.pillarAlignment === selectedFocus
  );

  const focusLabel = getPillarLabel(selectedFocus);

  const handleBegin = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Persist to Firestore — don't block navigation on this
    if (user?.uid) {
      // Save values + complete onboarding in one call
      Promise.all([
        saveSelectedValues(user.uid, selectedValues),
        completeOnboarding(user.uid),
      ]).catch((error) => {
        console.error('Error completing onboarding:', error);
      });
    }

    // AppNavigator will automatically detect hasCompletedOnboarding = true
    // via the Firestore listener and switch to MainNavigator.
    // No manual navigation needed — the listener handles the stack swap.
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <OnboardingProgressDots currentStep={6} totalSteps={6} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top spacer to center content */}
        <View style={styles.topSpacer} />

        {/* Completion mark */}
        <View style={styles.checkmarkContainer}>
          <View style={styles.checkmarkCircle}>
            <Icon name="check" size={30} color={Colors.evergreenTeal} strokeWidth={3} />
          </View>
        </View>

        {/* Heading */}
        <Text style={styles.headline}>Vara is set up around you.</Text>
        <Text style={styles.subheadline}>
          Your values and starting focus are saved. Vara will build around these
          from day one.
        </Text>

        {/* Values Chips */}
        <Text style={styles.sectionLabel}>YOUR VALUES</Text>
        <View style={styles.chipsRow}>
          {selectedValues.map((valueId) => {
            const value = getValueById(valueId);
            if (!value) return null;
            return (
              <View key={valueId} style={styles.chip}>
                <Icon
                  name={value.icon as any}
                  size={26}
                  color={Colors.evergreenTeal}
                />
                <Text style={styles.chipLabel}>{value.label}</Text>
              </View>
            );
          })}
        </View>

        {/* Starting Focus Card */}
        <Text style={styles.sectionLabel}>STARTING WITH</Text>
        <View style={styles.focusCard}>
          <View style={styles.focusRow}>
            <View style={styles.focusIconContainer}>
              <Icon
                name={(PILLAR_ICONS[selectedFocus] || 'circle-double') as any}
                size={24}
                color={Colors.evergreenTeal}
              />
            </View>
            <View style={styles.focusTextCol}>
              <Text style={styles.focusTitle}>{focusLabel}</Text>
              <Text style={styles.focusSubtitle}>
                Based on your brain check-in today
              </Text>
            </View>
          </View>
        </View>

        {/* Alignment Callout (conditional) */}
        {alignmentMatch && (
          <View style={styles.alignmentCallout}>
            <Text style={styles.alignmentText}>
              {focusLabel} came up for your brain today too — a meaningful place
              to build from.
            </Text>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* CTA */}
      <View style={styles.ctaContainer}>
        <TouchableOpacity
          onPress={handleBegin}
          style={styles.ctaButton}
          accessibilityLabel="Begin at your own pace"
          accessibilityRole="button"
        >
          <Text style={styles.ctaText}>Begin at your own pace</Text>
        </TouchableOpacity>
      </View>
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
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  topSpacer: {
    height: 54,
  },
  checkmarkContainer: {
    marginBottom: 28,
  },
  checkmarkCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E8F0E6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headline: {
    color: Colors.evergreenTeal,
    fontSize: 24,
    fontWeight: Typography.fontWeight.semibold,
    textAlign: 'center',
    lineHeight: 24 * 1.3,
    marginBottom: 10,
  },
  subheadline: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: Typography.fontWeight.regular,
    textAlign: 'center',
    lineHeight: 15 * 1.65,
    marginBottom: 32,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: Typography.fontWeight.bold,
    color: '#9AA89E',
    letterSpacing: 0.9,
    textAlign: 'center',
    marginBottom: 12,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 24,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.evergreenTeal,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 10,
  },
  chipLabel: {
    fontSize: 15,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.evergreenTeal,
  },
  focusCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: '#E2EBE2',
    borderRadius: 14,
    padding: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  focusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  focusIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(27,94,87,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  focusTextCol: {
    flex: 1,
  },
  focusTitle: {
    fontSize: 16,
    fontWeight: Typography.fontWeight.semibold,
    color: '#3E3E3E',
    marginBottom: 2,
  },
  focusSubtitle: {
    fontSize: 13,
    fontWeight: Typography.fontWeight.regular,
    color: Colors.textSecondary,
  },
  alignmentCallout: {
    width: '100%',
    backgroundColor: '#E8F0E6',
    borderLeftWidth: 3,
    borderLeftColor: Colors.evergreenTeal,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  alignmentText: {
    fontSize: 13,
    fontWeight: Typography.fontWeight.regular,
    color: Colors.evergreenTeal,
    lineHeight: 13 * 1.55,
  },
  bottomSpacer: {
    flex: 1,
    minHeight: 24,
  },
  ctaContainer: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: Spacing.sm,
  },
  ctaButton: {
    height: 54,
    borderRadius: 14,
    backgroundColor: Colors.evergreenTeal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: Typography.fontWeight.semibold,
  },
});

export default OnboardingPersonalizedEntryScreen;
