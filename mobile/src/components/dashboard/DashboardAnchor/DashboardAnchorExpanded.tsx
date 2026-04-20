import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Typography } from '../../../constants';
import { BrainState } from '../../../types';
import { getBrainStateBrief } from './brainStateBriefs';

interface DashboardAnchorExpandedProps {
  brainState: BrainState;
}

export const DashboardAnchorExpanded: React.FC<DashboardAnchorExpandedProps> = ({
  brainState,
}) => {
  const brief = getBrainStateBrief(brainState);

  return (
    <View style={[styles.container, { borderLeftColor: brief.accentColor }]}>
      <View style={styles.header}>
        <Icon
          testID="dashboard-anchor-expanded-icon"
          name={brief.icon as any}
          size={20}
          color={brief.accentColor}
        />
        <Text style={styles.label}>{brief.label}</Text>
      </View>
      <Text style={styles.message}>{brief.message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 3,
    shadowColor: Colors.evergreenTeal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
  },
  message: {
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 21,
  },
});
