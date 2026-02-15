/**
 * Quick Action Buttons
 * Two primary action buttons: Journal and Learn (Wellness)
 * Simple outlined buttons, 48px height
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, Typography, Layout } from '../../constants';

export const QuickActionButtons: React.FC = () => {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.container}>
      {/* Journal Button */}
      <TouchableOpacity
        style={styles.journalButton}
        onPress={() => navigation.navigate('Journal')}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Open Journal"
      >
        <Icon name="pencil" size={18} color={Colors.evergreenTeal} />
        <Text style={styles.journalButtonText}>Journal</Text>
      </TouchableOpacity>

      {/* Learn Button - navigates to Wellness tab */}
      <TouchableOpacity
        style={styles.learnButton}
        onPress={() => navigation.navigate('Wellness')}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Explore Wellness Tools"
      >
        <Icon name="book-open-variant" size={18} color={Colors.evergreenTeal} />
        <Text style={styles.learnButtonText}>Learn</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: Spacing.base,
  },
  journalButton: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: Colors.evergreenTeal,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  journalButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.evergreenTeal,
  },
  learnButton: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: Colors.dewSage,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  learnButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textPrimary, // Soft Charcoal
  },
});

export default QuickActionButtons;
