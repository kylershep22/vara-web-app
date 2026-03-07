/**
 * WelcomeBackCard
 * Shown on the Dashboard when a user returns after 48+ hours away.
 * Dismisses on tap or auto-dismisses after 6 seconds.
 *
 * Brand: No guilt, no "we missed you", no days-away counting.
 */

import React, { useState, useEffect, useRef } from 'react';
import { TouchableOpacity, StyleSheet, Platform, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, Typography } from '../../constants';
import { useReducedMotion } from '../../hooks/useReducedMotion';

const LAST_OPEN_KEY = 'vara_last_app_open_date';
const FORTY_EIGHT_HOURS = 48 * 60 * 60 * 1000;

const HEADINGS = [
  'Good to see you.',
  'Welcome back.',
  "You're here.",
];

const BODIES = [
  "Nothing to catch up on \u2014 just today.",
  'Pick up wherever feels right.',
  "Whenever you're ready.",
];

interface WelcomeBackCardProps {
  onDismiss?: () => void;
}

const WelcomeBackCard: React.FC<WelcomeBackCardProps> = ({ onDismiss }) => {
  const reduceMotion = useReducedMotion();
  const [shouldShow, setShouldShow] = useState(false);
  const opacity = useSharedValue(0);
  const headingRef = useRef(HEADINGS[Math.floor(Math.random() * HEADINGS.length)]);
  const bodyRef = useRef(BODIES[Math.floor(Math.random() * BODIES.length)]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const checkLastOpen = async () => {
      try {
        const lastOpenStr = await AsyncStorage.getItem(LAST_OPEN_KEY);
        const now = Date.now();

        // Update last open date
        await AsyncStorage.setItem(LAST_OPEN_KEY, now.toString());

        if (lastOpenStr) {
          const lastOpen = parseInt(lastOpenStr, 10);
          if (now - lastOpen > FORTY_EIGHT_HOURS) {
            headingRef.current = HEADINGS[Math.floor(Math.random() * HEADINGS.length)];
            bodyRef.current = BODIES[Math.floor(Math.random() * BODIES.length)];
            setShouldShow(true);

            if (!reduceMotion) {
              opacity.value = withTiming(1, { duration: 200, easing: Easing.in(Easing.ease) });
            } else {
              opacity.value = 1;
            }

            // Auto-dismiss after 6 seconds
            timerRef.current = setTimeout(handleDismiss, 6000);
          }
        }
      } catch {
        // Silently fail
      }
    };

    checkLastOpen();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleDismiss = () => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (!reduceMotion) {
      opacity.value = withTiming(0, { duration: 150 });
      setTimeout(() => {
        setShouldShow(false);
        onDismiss?.();
      }, 150);
    } else {
      setShouldShow(false);
      onDismiss?.();
    }
  };

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (!shouldShow) return null;

  return (
    <Animated.View style={animStyle}>
      <TouchableOpacity
        style={styles.card}
        onPress={handleDismiss}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel={`${headingRef.current} ${bodyRef.current}`}
        accessibilityHint="Tap to dismiss"
      >
        <Text style={styles.heading}>{headingRef.current}</Text>
        <Text style={styles.body}>{bodyRef.current}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 24,
    marginBottom: Spacing.base,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  heading: {
    fontSize: 18,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.evergreenTeal,
    marginBottom: 4,
  },
  body: {
    fontSize: 14,
    color: Colors.mutedSageGray,
  },
});

export default WelcomeBackCard;
