/**
 * BrainHealthTip Component
 * Rotating single-insight highlight card
 *
 * Per Focus Page Spec Section 5.7:
 * - Background: color-surface-tinted-light (rgba(213, 227, 209, 0.5))
 * - Left accent border: 3px solid color-primary
 * - Title: "Supporting your focus" - 13px Semi-Bold, primary
 * - Body: Single tip - 13px Regular, text-primary, 1.5 line height
 * - Rotation: Show different tip each session
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ColorTokens,
  SpacingTokens,
  RadiusTokens,
} from '../../../constants/designTokens';
import { FocusCopy, FocusTips } from '../../../constants/focusContent';

const TIP_INDEX_KEY = '@focus_tip_index';

interface BrainHealthTipProps {
  /** Force a specific tip index (useful for testing) */
  forceTipIndex?: number;
}

export const BrainHealthTip: React.FC<BrainHealthTipProps> = ({
  forceTipIndex,
}) => {
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    if (forceTipIndex !== undefined) {
      setTipIndex(forceTipIndex);
      return;
    }

    // Load and increment tip index
    const loadAndIncrementTip = async () => {
      try {
        const storedIndex = await AsyncStorage.getItem(TIP_INDEX_KEY);
        const currentIndex = storedIndex ? parseInt(storedIndex, 10) : 0;
        setTipIndex(currentIndex);

        // Store next index for next session
        const nextIndex = (currentIndex + 1) % FocusTips.length;
        await AsyncStorage.setItem(TIP_INDEX_KEY, nextIndex.toString());
      } catch (error) {
        console.warn('Error loading tip index:', error);
        setTipIndex(0);
      }
    };

    loadAndIncrementTip();
  }, [forceTipIndex]);

  const currentTip = FocusTips[tipIndex] || FocusTips[0];

  return (
    <View
      style={styles.container}
      accessibilityRole="text"
      accessibilityLabel={`${FocusCopy.tipCardTitle}: ${currentTip}`}
    >
      <Text style={styles.title}>{FocusCopy.tipCardTitle}</Text>
      <Text style={styles.body}>{currentTip}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: ColorTokens.surfaceTintedLight,
    borderRadius: RadiusTokens.lg,
    borderLeftWidth: 3,
    borderLeftColor: ColorTokens.primary,
    padding: SpacingTokens.base,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: ColorTokens.primary,
    marginBottom: SpacingTokens.xs,
  },
  body: {
    fontSize: 14,
    fontWeight: '400',
    color: ColorTokens.textPrimary,
    lineHeight: 14 * 1.5, // 1.5x line height per spec
  },
});

export default BrainHealthTip;
