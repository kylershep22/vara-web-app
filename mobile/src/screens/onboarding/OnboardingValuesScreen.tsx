/**
 * Onboarding Values Screen
 * Screen 5 of 6 - Values Selection
 *
 * User selects 2-3 core values that shape how Vara personalizes their experience.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRoute, RouteProp } from '@react-navigation/native';
import { OnboardingProgressDots } from '../../components/onboarding';
import { Colors, Spacing, Typography } from '../../constants';
import {
  VARA_VALUES,
  ValueId,
  MIN_VALUES,
  MAX_VALUES,
  toggleValue,
} from '../../constants/values';
import { saveSelectedValues } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { OnboardingStackParamList } from '../../types/onboarding';

type ValuesScreenRouteProp = RouteProp<OnboardingStackParamList, 'OnboardingValues'>;

interface OnboardingValuesScreenProps {
  navigation: any;
}

const OnboardingValuesScreen: React.FC<OnboardingValuesScreenProps> = ({
  navigation,
}) => {
  const route = useRoute<ValuesScreenRouteProp>();
  const { user } = useAuth();
  const { checkIn, insight, selectedFocus, completedActivity } = route.params;

  const [selectedValues, setSelectedValues] = useState<ValueId[]>([]);

  const handleToggle = useCallback(
    (id: ValueId) => {
      const isDisabled =
        !selectedValues.includes(id) && selectedValues.length >= MAX_VALUES;
      if (isDisabled) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelectedValues((prev) => toggleValue(id, prev));
    },
    [selectedValues]
  );

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.goBack();
  };

  const handleContinue = () => {
    if (selectedValues.length < MIN_VALUES) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Save values to Firestore in the background
    if (user?.uid) {
      saveSelectedValues(user.uid, selectedValues).catch((error) => {
        console.error('Error saving selected values:', error);
      });
    }

    navigation.navigate('OnboardingPersonalizedEntry', {
      checkIn,
      insight,
      selectedFocus,
      completedActivity,
      selectedValues,
    });
  };

  const isEnabled = selectedValues.length >= MIN_VALUES;

  const getCounterText = () => {
    switch (selectedValues.length) {
      case 0:
        return 'Choose 2 or 3 to continue';
      case 1:
        return 'Choose 1 more to continue';
      case 2:
        return "You're set — or add one more";
      case 3:
        return 'Perfect';
      default:
        return '';
    }
  };

  const getCounterStyle = () => {
    return selectedValues.length >= 2 ? styles.counterActive : styles.counterMuted;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <OnboardingProgressDots currentStep={5} totalSteps={6} />

      <TouchableOpacity
        onPress={handleBack}
        style={styles.backButton}
        accessibilityLabel="Go back"
        accessibilityRole="button"
      >
        <Icon name="chevron-left" size={28} color={Colors.evergreenTeal} />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headline}>What matters most to you?</Text>
          <Text style={styles.subheadline}>
            Choose 2 or 3. These shape how Vara personalizes your experience. You
            can adjust them anytime.
          </Text>
        </View>

        {/* Values Grid */}
        <View style={styles.grid}>
          {VARA_VALUES.map((value) => {
            const isSelected = selectedValues.includes(value.id);
            const isDisabledCard =
              !isSelected && selectedValues.length >= MAX_VALUES;
            const showTodayTag =
              value.pillarAlignment === selectedFocus && !isSelected;

            return (
              <TouchableOpacity
                key={value.id}
                onPress={() => handleToggle(value.id)}
                disabled={isDisabledCard}
                activeOpacity={0.85}
                style={[
                  styles.card,
                  isSelected && styles.cardSelected,
                  isDisabledCard && styles.cardDisabled,
                ]}
                accessibilityLabel={`${value.label}: ${value.description}${isSelected ? ', selected' : ''}`}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected, disabled: isDisabledCard }}
              >
                {/* Today tag */}
                {showTodayTag && (
                  <View style={styles.todayTag}>
                    <Text style={styles.todayTagText}>{'Today \u2191'}</Text>
                  </View>
                )}

                {/* Icon circle */}
                <View
                  style={[
                    styles.iconCircle,
                    isSelected && styles.iconCircleSelected,
                  ]}
                >
                  {isSelected ? (
                    <Icon name="check" size={16} color="#FFFFFF" />
                  ) : (
                    <Icon
                      name={value.icon as any}
                      size={18}
                      color={Colors.evergreenTeal}
                    />
                  )}
                </View>

                {/* Label */}
                <Text
                  style={[
                    styles.cardLabel,
                    isSelected && styles.cardLabelSelected,
                  ]}
                >
                  {value.label}
                </Text>

                {/* Description */}
                <Text
                  style={[
                    styles.cardDescription,
                    isSelected && styles.cardDescriptionSelected,
                  ]}
                >
                  {value.description}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Counter */}
        <Text style={[styles.counter, getCounterStyle()]}>{getCounterText()}</Text>
      </ScrollView>

      {/* CTA */}
      <View style={styles.ctaContainer}>
        <TouchableOpacity
          onPress={handleContinue}
          disabled={!isEnabled}
          style={[styles.ctaButton, !isEnabled && styles.ctaButtonDisabled]}
          accessibilityLabel={
            isEnabled
              ? 'These are my focus areas'
              : 'Choose at least 2 to continue'
          }
          accessibilityRole="button"
          accessibilityState={{ disabled: !isEnabled }}
        >
          <Text style={[styles.ctaText, !isEnabled && styles.ctaTextDisabled]}>
            {isEnabled ? 'These are my focus areas' : 'Choose at least 2 to continue'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const CARD_GAP = 10;
const SCREEN_PADDING = 20;
const CARD_WIDTH = (Dimensions.get('window').width - SCREEN_PADDING * 2 - CARD_GAP) / 2;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.default,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: Spacing.base,
    padding: Spacing.xs,
    zIndex: 10,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: Spacing.lg,
  },
  header: {
    marginTop: Spacing.lg,
    marginBottom: 22,
  },
  headline: {
    color: Colors.evergreenTeal,
    fontSize: 24,
    fontWeight: Typography.fontWeight.semibold,
    lineHeight: 24 * 1.3,
    marginBottom: Spacing.md,
  },
  subheadline: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: Typography.fontWeight.regular,
    lineHeight: 15 * 1.55,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: '#E2EBE2',
    borderRadius: 14,
    paddingTop: 16,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  cardSelected: {
    backgroundColor: Colors.evergreenTeal,
    borderColor: Colors.evergreenTeal,
  },
  cardDisabled: {
    opacity: 0.35,
  },
  todayTag: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(27,94,87,0.07)',
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 5,
  },
  todayTagText: {
    fontSize: 9,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.evergreenTeal,
    letterSpacing: 0.2,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(27,94,87,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconCircleSelected: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  cardLabel: {
    fontSize: 15,
    fontWeight: Typography.fontWeight.semibold,
    color: '#3E3E3E',
    marginBottom: 3,
  },
  cardLabelSelected: {
    color: '#FFFFFF',
  },
  cardDescription: {
    fontSize: 12,
    fontWeight: Typography.fontWeight.regular,
    color: Colors.textSecondary,
    lineHeight: 12 * 1.5,
  },
  cardDescriptionSelected: {
    color: 'rgba(255,255,255,0.7)',
  },
  counter: {
    textAlign: 'center',
    fontSize: 13,
    marginTop: Spacing.base,
    marginBottom: Spacing.base,
  },
  counterMuted: {
    color: '#9AA89E',
    fontWeight: Typography.fontWeight.regular,
  },
  counterActive: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.medium,
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
  ctaButtonDisabled: {
    backgroundColor: '#E8F0E6',
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: Typography.fontWeight.semibold,
  },
  ctaTextDisabled: {
    color: '#9AA89E',
  },
});

export default OnboardingValuesScreen;
