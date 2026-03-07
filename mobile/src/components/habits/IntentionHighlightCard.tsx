/**
 * IntentionHighlightCard
 * Shown on HabitDetailScreen when habit has an intention
 * Left accent border, rotating micro-insight, edit button
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { INTENTION_INSIGHTS } from '../../constants/intentions';
import { HabitIntention } from '../../types/models';

interface IntentionHighlightCardProps {
  intention: HabitIntention;
  onEdit: () => void;
}

export const IntentionHighlightCard: React.FC<IntentionHighlightCardProps> = ({
  intention,
  onEdit,
}) => {
  // Rotate insight based on day of year
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));

  const insights = INTENTION_INSIGHTS[intention.category] || [];
  const insight = insights.length > 0 ? insights[dayOfYear % insights.length] : '';

  return (
    <View style={styles.container}>
      {/* Edit button */}
      <TouchableOpacity style={styles.editButton} onPress={onEdit} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Icon name="pencil" size={14} color="#6F7F77" />
      </TouchableOpacity>

      <Text style={styles.supportingLabel}>SUPPORTING</Text>
      <Text style={styles.intentionLabel}>{intention.label}</Text>
      {insight ? (
        <Text style={styles.insightText}>{insight}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#D5E3D180', // ~50%
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#1B5E57',
    padding: 16,
    paddingLeft: 20,
    marginBottom: 16,
    position: 'relative',
  },
  editButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  supportingLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6F7F77',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  intentionLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1B5E57',
    marginBottom: 8,
  },
  insightText: {
    fontSize: 14,
    fontWeight: '400',
    fontStyle: 'italic',
    color: '#3E3E3E',
    lineHeight: 19,
  },
});
