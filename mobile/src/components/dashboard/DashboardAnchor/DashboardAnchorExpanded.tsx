import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Typography } from '../../../constants';
import { BrainState } from '../../../types';
import { getBrainStateBrief } from './brainStateBriefs';

interface DashboardAnchorExpandedProps {
  brainState: BrainState;
  /** When provided, renders a "Change" affordance that re-opens the
   *  brain-state check-in picker. Optional so the card can also be used
   *  in read-only contexts. */
  onChangePress?: () => void;
}

export const DashboardAnchorExpanded: React.FC<DashboardAnchorExpandedProps> = ({
  brainState,
  onChangePress,
}) => {
  const brief = getBrainStateBrief(brainState);

  return (
    <View
      testID="dashboard-anchor-card"
      style={[styles.container, { borderLeftColor: brief.accentColor }]}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Icon
            testID="dashboard-anchor-expanded-icon"
            name={brief.icon as any}
            size={20}
            color={brief.accentColor}
          />
          <Text style={styles.label}>{brief.label}</Text>
        </View>
        {onChangePress && (
          <TouchableOpacity
            onPress={onChangePress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.changeWrapper}
            accessibilityRole="button"
            accessibilityLabel="Change brain state"
          >
            <Text style={styles.changeText}>Change</Text>
            <Icon name="chevron-right" size={16} color={Colors.evergreenTeal} />
          </TouchableOpacity>
        )}
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
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
  },
  changeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingLeft: 8,
  },
  changeText: {
    fontSize: 13,
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.medium,
  },
  message: {
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 21,
  },
});
