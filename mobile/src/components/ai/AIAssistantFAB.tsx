/**
 * AI Assistant FAB Component
 * Floating action button for AI assistant access
 */

import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing, Layout } from '../../constants';
import { AIChatModal } from './AIChatModal';

interface AIAssistantFABProps {
  context?: {
    screen: string;
    userGoals?: any[];
    userHabits?: any[];
    [key: string]: any;
  };
}

export function AIAssistantFAB({ context }: AIAssistantFABProps) {
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <Icon name="brain" size={28} color={Colors.white} />
      </TouchableOpacity>

      <AIChatModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        initialContext={context}
      />
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: Spacing.xl + 60, // Above tab bar
    right: Spacing.md,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.evergreenTeal,
    justifyContent: 'center',
    alignItems: 'center',
    ...Layout.shadow.lg,
    elevation: 8,
    zIndex: 999,
  },
});
