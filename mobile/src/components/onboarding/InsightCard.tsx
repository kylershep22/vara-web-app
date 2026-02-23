/**
 * InsightCard Component (Highlight Card)
 * Displays the brain-health insight with left accent border
 *
 * Specs:
 * - Background: Dew Sage at 50% opacity
 * - Left accent: 4px Evergreen Teal
 * - Padding: 24px, radius: 12px
 * - Label: font-caption, uppercase, Teal
 * - Text: font-body, Charcoal
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { Colors, Spacing, Typography, Layout } from '../../constants';

interface InsightCardProps {
  label?: string;
  text: string;
}

const InsightCard: React.FC<InsightCardProps> = ({
  label = 'Your Brain-Health Snapshot',
  text,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.accentBorder} />
      <View style={styles.content}>
        {label && (
          <Text style={styles.label}>{label.toUpperCase()}</Text>
        )}
        <Text style={styles.text}>{text}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: `${Colors.dewSage}80`, // 50% opacity
    borderRadius: Layout.borderRadius.lg,
    overflow: 'hidden',
  },
  accentBorder: {
    width: 4,
    backgroundColor: Colors.evergreenTeal,
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
  },
  label: {
    color: Colors.evergreenTeal,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  text: {
    color: Colors.softCharcoal,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.regular,
    lineHeight: Typography.fontSize.base * Typography.lineHeight.normal,
  },
});

export default InsightCard;
