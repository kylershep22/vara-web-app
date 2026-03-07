/**
 * GentleEncouragementCard Component
 * Ambient presence card when no journal entries this week
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Layout, Typography } from '../../constants';
import { useReducedMotion } from '../../hooks';

interface GentleEncouragementCardProps {
  /** Whether the card should be visible */
  visible: boolean;
}

export const GentleEncouragementCard: React.FC<GentleEncouragementCardProps> = ({
  visible,
}) => {
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, {
        duration: reduceMotion ? 0 : 400,
        easing: Easing.out(Easing.ease),
      });
    } else {
      opacity.value = withTiming(0, {
        duration: reduceMotion ? 0 : 200,
        easing: Easing.in(Easing.ease),
      });
    }
  }, [visible, reduceMotion, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (!visible) {
    return null;
  }

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <View style={styles.iconContainer}>
        <Ionicons name="journal-outline" size={32} color={Colors.evergreenTeal} />
      </View>
      <Text style={styles.message}>
        Every thought matters
      </Text>
      <Text style={styles.subMessage}>
        whenever you're ready
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.mintCream,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.xl,
    marginHorizontal: Spacing.base,
    marginTop: Spacing.base,
    marginBottom: Spacing.lg,
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.dewSage,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  message: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.semibold as any,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  subMessage: {
    color: Colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default GentleEncouragementCard;
