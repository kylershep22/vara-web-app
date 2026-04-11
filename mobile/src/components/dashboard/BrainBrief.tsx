/**
 * BrainBrief
 * Personalized message shown after completing the brain check-in.
 * Appears in the post-checkin dashboard phase.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn, SlideInUp } from 'react-native-reanimated';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing, Typography } from '../../constants';
import { BrainState } from '../../types';

interface BrainBriefProps {
  brainState: BrainState;
}

const BRAIN_STATE_CONFIG: Record<BrainState, { emoji: string; label: string; message: string; accentColor: string }> = {
  wired: {
    emoji: 'lightning-bolt',
    label: 'Wired',
    message: 'Your mind is running hot today. Let\'s channel that energy. Start with a calming protocol, then ease into your habits.',
    accentColor: Colors.softCoral,
  },
  foggy: {
    emoji: 'weather-fog',
    label: 'Foggy',
    message: 'Low energy day. That\'s okay, your brain needs activation. A short breathwork session can shift things before you dive in.',
    accentColor: Colors.sunriseAmber,
  },
  okay: {
    emoji: 'minus-circle-outline',
    label: 'Okay',
    message: 'Steady baseline today. A good day to reflect and connect. Your journal and community are where you\'ll find momentum.',
    accentColor: Colors.mutedSageGray,
  },
  clear: {
    emoji: 'check-circle-outline',
    label: 'Clear',
    message: 'You\'re in a great headspace. This is the day to lock in focus work and build on your habits.',
    accentColor: Colors.evergreenTeal,
  },
  energized: {
    emoji: 'flash-outline',
    label: 'Energized',
    message: 'Sharp and ready. Use this energy. Explore a masterclass, connect with your community, then ride the momentum through your habits.',
    accentColor: Colors.success,
  },
};

export const BrainBrief: React.FC<BrainBriefProps> = ({ brainState }) => {
  const config = BRAIN_STATE_CONFIG[brainState];

  return (
    <Animated.View
      entering={SlideInUp.duration(300).springify()}
      style={[styles.container, { borderLeftColor: config.accentColor }]}
    >
      <View style={styles.header}>
        <Icon name={config.emoji as any} size={20} color={config.accentColor} />
        <Text style={styles.label}>{config.label}</Text>
      </View>
      <Text style={styles.message}>{config.message}</Text>
    </Animated.View>
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
