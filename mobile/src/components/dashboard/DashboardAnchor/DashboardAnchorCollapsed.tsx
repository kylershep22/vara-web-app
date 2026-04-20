import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Typography } from '../../../constants';
import { BrainState } from '../../../types';
import { getBrainStateBrief } from './brainStateBriefs';

interface DashboardAnchorCollapsedProps {
  brainState: BrainState;
  protocolCompleted: boolean;
  onChangePress: () => void;
  onAnchorPress: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export const DashboardAnchorCollapsed: React.FC<DashboardAnchorCollapsedProps> = ({
  brainState,
  protocolCompleted,
  onChangePress,
  onAnchorPress,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const brief = getBrainStateBrief(brainState);
  const protocolText = protocolCompleted ? 'Protocol done' : 'Protocol ready';

  return (
    <View style={styles.container}>
      <TouchableOpacity
        testID="dashboard-anchor-collapsed-body"
        style={styles.body}
        onPress={onAnchorPress}
        activeOpacity={0.7}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
      >
        <View style={styles.left}>
          <Icon name={brief.icon as any} size={18} color={brief.accentColor} />
          <Text style={styles.label}>{brief.label}</Text>
        </View>
        <Text style={styles.protocolText}>{protocolText}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onChangePress}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={styles.changeWrapper}
      >
        <Text style={styles.changeText}>Change</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    shadowColor: Colors.evergreenTeal,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 12,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
  },
  protocolText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  changeWrapper: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  changeText: {
    fontSize: 13,
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.medium,
  },
});
