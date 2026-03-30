/**
 * EventCodeCard
 * Contextual card shown on home screen for users < 48 hours old
 * who haven't entered an event code or dismissed the prompt.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing } from '../../constants';

interface EventCodeCardProps {
  onEnterCode: () => void;
  onDismiss: () => void;
}

export const EventCodeCard: React.FC<EventCodeCardProps> = ({
  onEnterCode,
  onDismiss,
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.dismissButton}
        onPress={onDismiss}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Icon name="close" size={20} color={Colors.textSecondary} />
      </TouchableOpacity>

      <Text style={styles.headline}>Joining from an event?</Text>
      <Text style={styles.subtext}>
        Enter your event code to connect with your group.
      </Text>
      <TouchableOpacity onPress={onEnterCode} activeOpacity={0.7}>
        <Text style={styles.cta}>Enter code</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(213, 227, 209, 0.5)',
    borderRadius: 12,
    padding: 24,
    marginBottom: Spacing.base,
  },
  dismissButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1,
  },
  headline: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.evergreenTeal,
    marginBottom: 4,
  },
  subtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  cta: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.evergreenTeal,
  },
});

export default EventCodeCard;
