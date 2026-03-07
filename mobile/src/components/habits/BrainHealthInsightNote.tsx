/**
 * BrainHealthInsightNote
 * Always shown on HabitDetailScreen
 * Shows brain health insight matched to intention category or general
 */

import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { INTENTION_INSIGHTS } from '../../constants/intentions';
import { IntentionCategory } from '../../types/models';

const GENERAL_INSIGHTS = [
  'Every habit you build creates new neural pathways that make future habits easier.',
  'Consistency matters more than intensity for lasting brain health benefits.',
  'Small daily habits compound into significant cognitive improvements over time.',
  'Your brain adapts to the patterns you practice most — choose wisely.',
];

interface BrainHealthInsightNoteProps {
  category?: string;
  intentionCategory?: IntentionCategory;
}

export const BrainHealthInsightNote: React.FC<BrainHealthInsightNoteProps> = ({
  category,
  intentionCategory,
}) => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));

  let insight: string;
  if (intentionCategory && INTENTION_INSIGHTS[intentionCategory]) {
    const insights = INTENTION_INSIGHTS[intentionCategory];
    insight = insights[(dayOfYear + 1) % insights.length]; // +1 to differ from highlight card
  } else {
    insight = GENERAL_INSIGHTS[dayOfYear % GENERAL_INSIGHTS.length];
  }

  return (
    <View style={styles.container}>
      <Icon name="information-outline" size={16} color="#1B5E57" style={styles.icon} />
      <Text style={styles.text}>{insight}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#D5E3D14D', // ~30%
    borderRadius: 12,
    padding: 14,
    paddingRight: 16,
    marginBottom: 16,
  },
  icon: {
    marginTop: 1,
    marginRight: 10,
  },
  text: {
    flex: 1,
    fontSize: 14,
    fontWeight: '400',
    color: '#3E3E3E',
    lineHeight: 19,
  },
});
