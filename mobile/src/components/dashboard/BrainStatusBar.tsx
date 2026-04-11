/**
 * BrainStatusBar
 * Compact status bar shown on return visits after today's brain check-in.
 * Displays current brain state and protocol status. Tappable to change state.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing, Typography } from '../../constants';
import { BrainState } from '../../types';

interface BrainStatusBarProps {
  brainState: BrainState;
  protocolCompleted: boolean;
  onChangeState: (state: BrainState) => void;
}

const STATE_DISPLAY: Record<BrainState, { icon: string; label: string; color: string }> = {
  wired: { icon: 'lightning-bolt', label: 'Wired', color: Colors.softCoral },
  foggy: { icon: 'weather-fog', label: 'Foggy', color: Colors.sunriseAmber },
  okay: { icon: 'minus-circle-outline', label: 'Okay', color: Colors.mutedSageGray },
  clear: { icon: 'check-circle-outline', label: 'Clear', color: Colors.evergreenTeal },
  energized: { icon: 'flash-outline', label: 'Energized', color: Colors.success },
};

const ALL_STATES: BrainState[] = ['wired', 'foggy', 'okay', 'clear', 'energized'];

export const BrainStatusBar: React.FC<BrainStatusBarProps> = ({
  brainState,
  protocolCompleted,
  onChangeState,
}) => {
  const [expanded, setExpanded] = useState(false);
  const display = STATE_DISPLAY[brainState];
  const protocolText = protocolCompleted ? 'Protocol done' : 'Protocol ready';

  const handleTap = () => {
    setExpanded(!expanded);
  };

  const handleSelectState = (state: BrainState) => {
    onChangeState(state);
    setExpanded(false);
  };

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        style={styles.container}
        onPress={handleTap}
        activeOpacity={0.7}
      >
        <View style={styles.leftSection}>
          <Icon name={display.icon as any} size={18} color={display.color} />
          <Text style={styles.stateLabel}>{display.label}</Text>
        </View>
        <View style={styles.rightSection}>
          <Text style={styles.protocolText}>{protocolText}</Text>
          <Icon
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={Colors.textSecondary}
          />
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.statePickerContainer}>
          {ALL_STATES.map((state) => {
            const stateDisplay = STATE_DISPLAY[state];
            const isSelected = state === brainState;
            return (
              <TouchableOpacity
                key={state}
                style={[
                  styles.statePill,
                  isSelected && { backgroundColor: stateDisplay.color + '20' },
                ]}
                onPress={() => handleSelectState(state)}
              >
                <Icon name={stateDisplay.icon as any} size={16} color={stateDisplay.color} />
                <Text
                  style={[
                    styles.statePillLabel,
                    isSelected && { color: stateDisplay.color, fontWeight: Typography.fontWeight.semibold },
                  ]}
                >
                  {stateDisplay.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 12,
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: Colors.evergreenTeal,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stateLabel: {
    fontSize: 14,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  protocolText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  statePickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  statePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
  },
  statePillLabel: {
    fontSize: 13,
    color: Colors.textPrimary,
  },
});
