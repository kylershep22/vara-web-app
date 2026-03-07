/**
 * FocusRecommendationCard Component
 * Displays the recommended focus area with option to adjust
 *
 * Specs:
 * - Standard card (white, radius-lg, shadow-sm, 24px padding)
 * - Focus icon in 48px Dew Sage circle
 * - Title: focus name, font-h3, Teal
 * - Description: explanation, font-body-sm, Charcoal
 * - "Adjust this" tertiary button below
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, Text } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { BrainPillar } from '../../types';
import { getFocusAreaData } from '../../utils/onboardingInsights';

interface FocusRecommendationCardProps {
  focus: BrainPillar;
  explanation: string;
  onAdjust?: () => void;
  showAdjustButton?: boolean;
}

const ICON_CIRCLE_SIZE = 48;
const ICON_SIZE = 24;

const FocusRecommendationCard: React.FC<FocusRecommendationCardProps> = ({
  focus,
  explanation,
  onAdjust,
  showAdjustButton = true,
}) => {
  const focusData = getFocusAreaData(focus);

  const handleAdjust = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onAdjust?.();
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* Icon Circle */}
        <View style={styles.iconCircle}>
          <Icon
            name={focusData.icon as any}
            size={ICON_SIZE}
            color={Colors.evergreenTeal}
          />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.title}>{focusData.title}</Text>
          <Text style={styles.description}>{explanation}</Text>
        </View>
      </View>

      {/* Adjust Button */}
      {showAdjustButton && onAdjust && (
        <TouchableOpacity
          onPress={handleAdjust}
          style={styles.adjustButton}
          accessibilityRole="button"
          accessibilityLabel="Adjust focus selection"
        >
          <Text style={styles.adjustButtonText}>Sounds good</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.white,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.lg,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  iconCircle: {
    width: ICON_CIRCLE_SIZE,
    height: ICON_CIRCLE_SIZE,
    borderRadius: ICON_CIRCLE_SIZE / 2,
    backgroundColor: `${Colors.dewSage}80`, // 50% opacity
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.base,
  },
  content: {
    flex: 1,
  },
  title: {
    color: Colors.evergreenTeal,
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.medium,
    marginBottom: Spacing.xs,
  },
  description: {
    color: Colors.softCharcoal,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.regular,
    lineHeight: Typography.fontSize.sm * Typography.lineHeight.normal,
  },
  adjustButton: {
    alignSelf: 'center',
    paddingVertical: Spacing.sm,
    marginTop: Spacing.sm,
  },
  adjustButtonText: {
    color: Colors.evergreenTeal,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
  },
});

export default FocusRecommendationCard;
