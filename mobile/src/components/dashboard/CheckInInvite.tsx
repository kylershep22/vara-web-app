// CheckInInvite — the ONE bright priority on the pre-check-in Home.
//
// A single, bright invite into the check-in loop (the day's primary action).
// Brightness is deliberate and singular: it is the only accent-filled surface in
// the pre-check-in field, which keeps accents well under the 15% brand ceiling
// while making the priority unmistakable. Refined from BrainStateCheckin's
// pre-check-in CTA (kept intact); navigates to the standard CheckInFlow.
//
// Tokens only for now; exact layout/copy defer to the dashboard spec/mockup.

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

import { Colors, Spacing, Typography, Layout } from '../../constants';

type Nav = NativeStackNavigationProp<{
  CheckInFlow: { entrySource: 'standard' };
}>;

export interface CheckInInviteProps {
  // Optional override for tests that assert the dispatch without mocking
  // useNavigation. Production callers omit it.
  onPress?: () => void;
}

export const CheckInInvite: React.FC<CheckInInviteProps> = ({ onPress }) => {
  const navigation = useNavigation<Nav>();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onPress) {
      onPress();
      return;
    }
    navigation.navigate('CheckInFlow', { entrySource: 'standard' });
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel="Check in. A quick check-in to find what fits."
      testID="dashboard-checkin-invite"
    >
      <View style={styles.textBlock}>
        <Text style={styles.prompt}>How are you right now?</Text>
        <Text style={styles.subtext}>A quick check-in to find what fits.</Text>
      </View>
      <Icon name="chevron-right" size={26} color={Colors.surface} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.evergreenTeal,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textBlock: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  prompt: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.surface,
    marginBottom: Spacing.xs,
  },
  subtext: {
    fontSize: Typography.fontSize.sm,
    color: Colors.surface,
    opacity: 0.9,
  },
});
