/**
 * Brain Health Insight Strip
 * Displays a simple rotating insight strip with brain health messaging
 * Shows one random message per app session
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { INSIGHT_STRIP_MESSAGES } from '../../constants/brainInsightsCopy';

interface BrainHealthInsightStripProps {
  onPress?: () => void;
  /** When true, renders in compact mode with reduced padding and single-line text */
  compact?: boolean;
}

export const BrainHealthInsightStrip: React.FC<BrainHealthInsightStripProps> = ({ compact = false }) => {
  // Select a random message on mount (per session)
  const message = useMemo(() => {
    const randomIndex = Math.floor(Math.random() * INSIGHT_STRIP_MESSAGES.length);
    return INSIGHT_STRIP_MESSAGES[randomIndex];
  }, []);

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <Icon
        name="leaf"
        size={compact ? 14 : 18}
        color={Colors.evergreenTeal}
        style={styles.icon}
      />
      <Text
        style={[styles.message, compact && styles.messageCompact]}
        numberOfLines={compact ? 1 : undefined}
      >
        {message}
      </Text>
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
  containerCompact: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 0,
    marginBottom: Spacing.lg,
    alignItems: 'center',
    gap: 8,
  },
  icon: {
    flexShrink: 0,
    marginTop: 2,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: '400',
    color: Colors.textPrimary, // Soft Charcoal
    lineHeight: 14 * 1.45,
  },
  messageCompact: {
    fontSize: 12,
    lineHeight: 12 * 1.3,
  },
});

export default BrainHealthInsightStrip;
