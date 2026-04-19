import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, Typography } from '../../constants';

export const LockedDivider: React.FC = () => {
  return (
    <View
      style={styles.container}
      accessibilityRole="text"
      accessibilityLabel="Personalized dashboard is locked until you check in"
    >
      <View style={styles.rule} />
      <View style={styles.centerBlock}>
        <MaterialCommunityIcons
          testID="locked-divider-icon"
          name="lock-outline"
          size={16}
          color={Colors.evergreenTeal}
          style={styles.icon}
        />
        <Text style={styles.label} numberOfLines={1}>
          Your dashboard responds after you check in
        </Text>
      </View>
      <View style={styles.rule} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.lg,
  },
  rule: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  centerBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.sm,
  },
  icon: {
    marginRight: Spacing.xs,
  },
  label: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textPrimary,
  },
});
