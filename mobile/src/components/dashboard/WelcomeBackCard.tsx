/**
 * WelcomeBackCard
 * Shown on the Dashboard when a user returns after 3+ days away.
 * Replaces the old inactivity notification with a warm, in-app welcome.
 *
 * Brand: No guilt, no "we missed you", no days-away counting.
 * Style: Dew Sage background at 50% opacity, 4px Teal left accent.
 */

import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing, Typography } from '../../constants';

interface WelcomeBackCardProps {
  onResume: () => void;
}

const WelcomeBackCard: React.FC<WelcomeBackCardProps> = ({ onResume }) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <View style={styles.card}>
      <View style={styles.leftAccent} />
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.headline}>Welcome back</Text>
          <TouchableOpacity
            onPress={() => setDismissed(true)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel="Dismiss welcome back card"
            accessibilityRole="button"
          >
            <Icon name="close" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
        <Text style={styles.body}>Pick up wherever feels right.</Text>
        <TouchableOpacity
          style={styles.cta}
          onPress={onResume}
          accessibilityLabel="Resume your routine"
          accessibilityRole="button"
        >
          <Text style={styles.ctaText}>Resume your routine</Text>
          <Icon name="arrow-right" size={16} color={Colors.evergreenTeal} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: 'rgba(213, 227, 209, 0.5)',
    borderRadius: 12,
    overflow: 'hidden',
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.base,
  },
  leftAccent: {
    width: 4,
    backgroundColor: Colors.evergreenTeal,
  },
  content: {
    flex: 1,
    padding: Spacing.base,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  headline: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.medium as any,
    color: Colors.evergreenTeal,
  },
  body: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
  },
  ctaText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium as any,
    color: Colors.evergreenTeal,
    marginRight: Spacing.xs,
  },
});

export default WelcomeBackCard;
