import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing, Typography } from '../../constants';
import type { NudgeSuggestion } from '../../utils/getNudgeSuggestion';

interface NudgeCardProps {
  suggestion: NudgeSuggestion;
  onAction: () => void;
  onDismiss: () => void;
}

const NudgeCard: React.FC<NudgeCardProps> = ({ suggestion, onAction, onDismiss }) => {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.iconCircle}>
          <Icon name={suggestion.icon as any} size={22} color={Colors.evergreenTeal} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.headline}>{suggestion.headline}</Text>
          <Text style={styles.description}>{suggestion.description}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.ctaButton} onPress={onAction} activeOpacity={0.8}>
        <Text style={styles.ctaText}>{suggestion.ctaLabel}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={onDismiss} style={styles.dismissRow} activeOpacity={0.7}>
        <Text style={styles.dismissText}>Not now</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(184,205,186,0.3)',
    padding: 16,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dewSage,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  headline: {
    fontSize: 15,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
    lineHeight: 21,
  },
  description: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginTop: 2,
  },
  ctaButton: {
    backgroundColor: Colors.evergreenTeal,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 14,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: Typography.fontWeight.semibold,
  },
  dismissRow: {
    alignItems: 'center',
    marginTop: 8,
  },
  dismissText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
});

export default NudgeCard;
