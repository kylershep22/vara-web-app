/**
 * StandardSheet
 * Completion reflection for all non-Connection habits.
 * Shows optional CR callout, 3 reflection chips, skip, and confirmation state.
 */

import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { isCognitiveReserveCategory } from '../../constants/habitCategories';
import { HabitCompletionSheetProps, STANDARD_AFFIRMING_COPY } from './types';
import { getCompletionInsight } from '../../constants/brainInsightsCopy';
import type { HabitReflection } from '../../types';

const CONFIRMATION_HOLD_MS = 900;
const EXIT_ANIMATION_MS = 320;

const REFLECTION_CHIPS: { key: HabitReflection | 'skip'; label: string }[] = [
  { key: 'smooth', label: 'Smooth' },
  { key: 'okay', label: 'Okay' },
  { key: 'hard', label: 'Hard today' },
];

export const StandardSheet: React.FC<HabitCompletionSheetProps> = ({
  habit,
  source,
  onComplete,
}) => {
  const [confirmed, setConfirmed] = useState(false);
  const [selectedKey, setSelectedKey] = useState<HabitReflection | 'skip' | null>(null);
  const iconBgAnim = useRef(new Animated.Value(0)).current;

  const isCR = isCognitiveReserveCategory(habit.category);
  const insight = useMemo(() => getCompletionInsight(habit.category), [habit.category]);

  const handleSelect = useCallback((key: HabitReflection | 'skip') => {
    if (confirmed) return;
    setSelectedKey(key);
    setConfirmed(true);

    // Animate icon circle to confirmed state
    Animated.timing(iconBgAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: false,
    }).start();

    // After hold, fire onComplete
    setTimeout(() => {
      const isSkip = key === 'skip';
      onComplete({
        habitId: habit.id,
        reflection: isSkip ? null : key as HabitReflection,
        connectionQuality: null,
        skippedReflection: isSkip,
        source,
      });
    }, CONFIRMATION_HOLD_MS);
  }, [confirmed, habit.id, source, onComplete, iconBgAnim]);

  const affirm = selectedKey ? STANDARD_AFFIRMING_COPY[selectedKey] : null;

  const iconBgColor = iconBgAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#EAF2E8', '#1B5E57'],
  });
  const iconColor = iconBgAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#1B5E57', '#FFFFFF'],
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Animated.View style={[styles.iconCircle, { backgroundColor: iconBgColor }]}>
          <Animated.Text>
            <Icon name="check" size={22} color={confirmed ? '#FFFFFF' : '#1B5E57'} />
          </Animated.Text>
        </Animated.View>
        <View style={styles.headerText}>
          <Text style={styles.habitName}>
            {confirmed && affirm ? affirm.header : habit.name}
          </Text>
          {!confirmed && habit.valueAlignment && (
            <View style={styles.valueEchoRow}>
              <Text style={styles.valueEchoLabel}>Today, toward </Text>
              <View style={styles.valueChip}>
                <Text style={styles.valueChipText}>{habit.valueAlignment}</Text>
              </View>
            </View>
          )}
          {confirmed && affirm?.body && (
            <Text style={styles.affirmingBody}>{affirm.body}</Text>
          )}
        </View>
      </View>

      {/* CR Callout */}
      {!confirmed && isCR && (
        <View style={styles.crCallout}>
          <Text style={styles.crCalloutText}>
            {'\u{1F33F}'} This builds your cognitive reserve, one of the highest-value habits for long-term brain health.
          </Text>
        </View>
      )}

      {/* Reflection chips + skip */}
      {!confirmed && (
        <>
          <Text style={styles.questionLabel}>How did it go?</Text>
          <View style={styles.chipRow}>
            {REFLECTION_CHIPS.map((chip) => (
              <TouchableOpacity
                key={chip.key}
                style={styles.chip}
                onPress={() => handleSelect(chip.key as HabitReflection)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={chip.label}
              >
                <Text style={styles.chipText}>{chip.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => handleSelect('skip')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Skip reflection"
          >
            <Text style={styles.skipText}>Skip reflection</Text>
          </TouchableOpacity>
        </>
      )}

      <Text style={styles.didYouKnow}>{insight}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 22,
    paddingTop: 0,
    paddingBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
    marginLeft: 12,
  },
  habitName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1B5E57',
  },
  valueEchoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  valueEchoLabel: {
    fontSize: 12,
    fontWeight: '400',
    color: '#6F7F77',
  },
  valueChip: {
    backgroundColor: 'rgba(27,94,87,0.08)',
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  valueChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1B5E57',
  },
  affirmingBody: {
    fontSize: 13,
    fontWeight: '400',
    color: '#6F7F77',
    marginTop: 2,
  },
  crCallout: {
    backgroundColor: '#E6F2EC',
    borderRadius: 10,
    padding: 14,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  crCalloutText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#2A6E4A',
    lineHeight: 12 * 1.55,
  },
  questionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3E3E3E',
    marginBottom: 12,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E0E8E0',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 44, // Accessibility minimum touch target
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#3E3E3E',
  },
  skipButton: {
    alignSelf: 'stretch',
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    minHeight: 44, // Accessibility
  },
  skipText: {
    fontSize: 13,
    fontWeight: '400',
    color: '#9AA89E',
  },
  didYouKnow: {
    fontSize: 12,
    color: '#6F7F77',
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 16,
  },
});
