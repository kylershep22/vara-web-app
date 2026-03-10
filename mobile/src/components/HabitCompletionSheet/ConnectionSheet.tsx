/**
 * ConnectionSheet
 * Completion reflection for Connection-category habits.
 * Shows brain science callout, 3 stacked connection quality options, and confirmation state.
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { HabitCompletionSheetProps, CONNECTION_AFFIRMING_COPY, CONNECTION_OPTIONS } from './types';
import type { ConnectionQuality } from '../../types';

const CONFIRMATION_HOLD_MS = 900;

export const ConnectionSheet: React.FC<HabitCompletionSheetProps> = ({
  habit,
  source,
  onComplete,
}) => {
  const [confirmed, setConfirmed] = useState(false);
  const [selectedKey, setSelectedKey] = useState<ConnectionQuality | 'skip' | null>(null);
  const iconBgAnim = useRef(new Animated.Value(0)).current;

  const selectedOption = CONNECTION_OPTIONS.find((o) => o.key === selectedKey);

  const handleSelect = useCallback((key: ConnectionQuality | 'skip') => {
    if (confirmed) return;
    setSelectedKey(key);
    setConfirmed(true);

    Animated.timing(iconBgAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: false,
    }).start();

    setTimeout(() => {
      const isSkip = key === 'skip';
      onComplete({
        habitId: habit.id,
        reflection: null,
        connectionQuality: isSkip ? null : key as ConnectionQuality,
        skippedReflection: isSkip,
        source,
      });
    }, CONFIRMATION_HOLD_MS);
  }, [confirmed, habit.id, source, onComplete, iconBgAnim]);

  const confirmedColor = selectedOption?.textColor || '#5B21B6';
  const confirmedBg = selectedOption?.bgColor || '#F3F0FF';

  const iconBgColor = iconBgAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#F3F0FF', confirmedBg],
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Animated.View style={[styles.iconCircle, { backgroundColor: iconBgColor }]}>
          {confirmed && selectedOption ? (
            <Text style={{ fontSize: 20 }}>{selectedOption.emoji}</Text>
          ) : (
            <Icon name="heart-outline" size={22} color="#5B21B6" />
          )}
        </Animated.View>
        <View style={styles.headerText}>
          <Text style={[styles.habitName, confirmed && { color: confirmedColor }]}>
            {habit.name}
          </Text>
          <Text style={styles.subtext}>
            {confirmed && selectedKey && selectedKey !== 'skip'
              ? CONNECTION_AFFIRMING_COPY[selectedKey]
              : confirmed
              ? 'Captured.'
              : 'Connection \u00B7 checked in'}
          </Text>
        </View>
      </View>

      {/* Brain science callout */}
      {!confirmed && (
        <View style={styles.scienceCallout}>
          <Text style={styles.scienceText}>
            Meaningful connection reduces cortisol over time — directly protecting long-term brain health. How this one felt is worth knowing.
          </Text>
        </View>
      )}

      {/* Connection quality options */}
      {!confirmed && (
        <>
          <Text style={styles.questionLabel}>How did that connection feel?</Text>
          <View style={styles.optionColumn}>
            {CONNECTION_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={[styles.optionButton, { backgroundColor: opt.bgColor }]}
                onPress={() => handleSelect(opt.key)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={opt.label}
              >
                <Text style={styles.optionEmoji}>{opt.emoji}</Text>
                <Text style={[styles.optionLabel, { color: opt.textColor }]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.privacyNote}>
            Private — only used to surface patterns for you.
          </Text>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => handleSelect('skip')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Skip"
          >
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </>
      )}
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
    color: '#5B21B6',
  },
  subtext: {
    fontSize: 13,
    fontWeight: '400',
    color: '#6F7F77',
    marginTop: 1,
  },
  scienceCallout: {
    backgroundColor: '#F3F0FF',
    borderLeftWidth: 3,
    borderLeftColor: '#C7B8EA',
    borderRadius: 10,
    padding: 14,
    marginBottom: 18,
  },
  scienceText: {
    fontSize: 12,
    fontWeight: '400',
    color: '#5B21B6',
    lineHeight: 12 * 1.55,
  },
  questionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3E3E3E',
    marginBottom: 12,
  },
  optionColumn: {
    gap: 9,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: 50,
    borderRadius: 12,
    paddingLeft: 16,
    gap: 12,
    minHeight: 44, // Accessibility
  },
  optionEmoji: {
    fontSize: 18,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  privacyNote: {
    fontSize: 11,
    fontWeight: '400',
    color: '#9AA89E',
    textAlign: 'center',
    marginTop: 12,
  },
  skipButton: {
    alignSelf: 'stretch',
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
    minHeight: 44, // Accessibility
  },
  skipText: {
    fontSize: 13,
    fontWeight: '400',
    color: '#9AA89E',
  },
});
