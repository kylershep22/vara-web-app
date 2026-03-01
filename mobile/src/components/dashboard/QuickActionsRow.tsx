/**
 * Quick Actions Row
 * Horizontal row with Journal and Reflect action buttons
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, Typography, Layout } from '../../constants';

interface QuickActionsRowProps {
  onJournalPress: () => void;
  onReflectPress: () => void;
}

export const QuickActionsRow: React.FC<QuickActionsRowProps> = ({
  onJournalPress,
  onReflectPress,
}) => {
  const handleJournalPress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onJournalPress();
  };

  const handleReflectPress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onReflectPress();
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.actionButton}
        onPress={handleJournalPress}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Open journal"
      >
        <View style={styles.iconContainer}>
          <Icon name="book-open-outline" size={24} color={Colors.evergreenTeal} />
        </View>
        <Text style={styles.actionLabel}>Journal</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={handleReflectPress}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Open focus"
      >
        <View style={styles.iconContainer}>
          <Icon name="meditation" size={24} color={Colors.evergreenTeal} />
        </View>
        <Text style={styles.actionLabel}>Focus</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: Layout.borderRadius.md,
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.06)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${Colors.dewSage}60`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  actionLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textPrimary,
  },
});

export default QuickActionsRow;
