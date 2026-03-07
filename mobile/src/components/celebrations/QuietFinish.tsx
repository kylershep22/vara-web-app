/**
 * Quiet Finish
 * Inline overlay shown when a user completes all habits for the day.
 * Replaces ConfettiOverlay with a calm, brand-aligned acknowledgment.
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing, Typography } from '../../constants';
import { useReducedMotion } from '../../hooks/useReducedMotion';

const MESSAGES = [
  'Done for today. Well done.',
  'You showed up. That matters.',
  'A good day. Rest easy.',
  'Taken care of. Nicely.',
  "That's all for today.",
];

interface QuietFinishProps {
  visible: boolean;
  onDismiss?: () => void;
}

const QuietFinish: React.FC<QuietFinishProps> = ({ visible, onDismiss }) => {
  const reduceMotion = useReducedMotion();
  const translateY = useSharedValue(12);
  const opacity = useSharedValue(0);
  const [show, setShow] = useState(false);
  const messageRef = useRef(MESSAGES[Math.floor(Math.random() * MESSAGES.length)]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      messageRef.current = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
      setShow(true);

      if (!reduceMotion) {
        // Slide up + fade in
        translateY.value = 12;
        opacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) });
        translateY.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.ease) });

        // Fade out after 2.5 seconds
        opacity.value = withDelay(
          2500,
          withTiming(0, { duration: 200, easing: Easing.in(Easing.ease) }, (finished) => {
            if (finished) runOnJS(handleDismiss)();
          })
        );
      } else {
        // Static: show immediately, remove after 2.5s
        opacity.value = 1;
        translateY.value = 0;
        timerRef.current = setTimeout(() => {
          handleDismiss();
        }, 2500);
      }
    } else {
      opacity.value = 0;
      translateY.value = 12;
      setShow(false);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible]);

  const handleDismiss = () => {
    setShow(false);
    onDismiss?.();
  };

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!show) return null;

  return (
    <Animated.View style={[styles.container, animStyle]}>
      <Icon name="check-circle" size={24} color={Colors.evergreenTeal} />
      <Text style={styles.message}>{messageRef.current}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(213,227,209,0.8)', // Dew Sage at 80%
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 12,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  message: {
    fontSize: 16,
    color: Colors.softCharcoal,
    flex: 1,
  },
});

export default QuietFinish;
