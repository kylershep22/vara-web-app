/**
 * KeyboardAccessoryToolbar Component
 * Native toolbar that appears above the iOS keyboard
 * Android will ignore this component
 */

import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform, InputAccessoryView, Keyboard } from 'react-native';
import { Text } from 'react-native-paper';
import { Colors, Spacing } from '../constants';

interface KeyboardAccessoryToolbarProps {
  nativeID: string;
  onDone?: () => void;
  doneLabel?: string;
  showDone?: boolean;
  children?: React.ReactNode;
}

export const KeyboardAccessoryToolbar: React.FC<KeyboardAccessoryToolbarProps> = ({
  nativeID,
  onDone,
  doneLabel = 'Done',
  showDone = true,
  children,
}) => {
  const handleDone = () => {
    if (onDone) {
      onDone();
    }
    Keyboard.dismiss();
  };

  // Android doesn't support InputAccessoryView, so return null
  if (Platform.OS !== 'ios') {
    return null;
  }

  return (
    <InputAccessoryView nativeID={nativeID}>
      <View style={styles.container}>
        {/* Custom content (left side) */}
        {children && <View style={styles.leftContent}>{children}</View>}

        {/* Spacer */}
        <View style={styles.spacer} />

        {/* Done button (right side) */}
        {showDone && (
          <TouchableOpacity
            onPress={handleDone}
            style={styles.doneButton}
            activeOpacity={0.7}
          >
            <Text style={styles.doneButtonText}>{doneLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
    </InputAccessoryView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spacer: {
    flex: 1,
  },
  doneButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.evergreenTeal,
    borderRadius: 8,
  },
  doneButtonText: {
    color: Colors.textOnPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default KeyboardAccessoryToolbar;
