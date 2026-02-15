/**
 * Brain Health Insight Strip
 * Displays a simple rotating insight strip with brain health messaging
 * Shows one random message per app session
 */

import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Layout } from '../../constants';

// Simple insight messages focused on brain health
const INSIGHT_MESSAGES = [
  'Focus often improves when there\'s less competing demand on your attention.',
  'Supporting brain health creates the conditions where habits can stick.',
  'Small changes work better when they respect how the brain functions.',
  'Recovery isn\'t a break from progress — it\'s part of how the brain sustains it.',
  'Consistency doesn\'t require perfection.',
  'Habits are easier to maintain when they work with your brain\'s energy and attention.',
];

interface BrainHealthInsightStripProps {
  onPress?: () => void;
}

export const BrainHealthInsightStrip: React.FC<BrainHealthInsightStripProps> = () => {
  // Select a random message on mount (per session)
  const message = useMemo(() => {
    const randomIndex = Math.floor(Math.random() * INSIGHT_MESSAGES.length);
    return INSIGHT_MESSAGES[randomIndex];
  }, []);

  return (
    <View style={styles.container}>
      <Icon
        name="leaf"
        size={18}
        color={Colors.evergreenTeal}
        style={styles.icon}
      />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: `${Colors.dewSage}8C`, // 55% opacity (8C in hex)
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 12,
    marginBottom: 24,
    gap: 10,
  },
  icon: {
    flexShrink: 0,
    marginTop: 2,
  },
  message: {
    flex: 1,
    fontSize: 13,
    fontWeight: '400',
    color: Colors.textPrimary, // Soft Charcoal
    lineHeight: 13 * 1.45,
  },
});

export default BrainHealthInsightStrip;
