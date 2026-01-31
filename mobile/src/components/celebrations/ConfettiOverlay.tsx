/**
 * Confetti Overlay Component
 * Full-screen confetti celebration animation using Reanimated
 */

import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Dimensions, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PARTICLE_COUNT = 40;

// Confetti colors from app palette
const CONFETTI_COLORS = [
  Colors.evergreenTeal,
  Colors.sunriseAmber,
  Colors.silverSage,
  Colors.goldenApricot,
  Colors.lavenderMist,
  Colors.dewSage,
];

interface ConfettiParticleProps {
  index: number;
  onComplete?: () => void;
  isLast: boolean;
}

const ConfettiParticle: React.FC<ConfettiParticleProps> = ({ index, onComplete, isLast }) => {
  const translateY = useSharedValue(-50);
  const translateX = useSharedValue(0);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(1);

  // Randomize particle properties
  const particleConfig = useMemo(() => {
    const startX = Math.random() * SCREEN_WIDTH;
    const endX = startX + (Math.random() - 0.5) * 200;
    const duration = 2000 + Math.random() * 1500; // 2000-3500ms
    const delay = Math.random() * 500;
    const size = 8 + Math.random() * 8;
    const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    const rotationSpeed = (Math.random() - 0.5) * 720;
    const shape = Math.random() > 0.5 ? 'square' : 'rect';

    return { startX, endX, duration, delay, size, color, rotationSpeed, shape };
  }, []);

  useEffect(() => {
    const { endX, duration, delay, rotationSpeed, startX } = particleConfig;

    // Animate horizontal drift
    translateX.value = withDelay(
      delay,
      withTiming(endX - startX, {
        duration,
        easing: Easing.out(Easing.ease),
      })
    );

    // Animate vertical fall
    translateY.value = withDelay(
      delay,
      withTiming(SCREEN_HEIGHT + 50, {
        duration,
        easing: Easing.in(Easing.quad),
      })
    );

    // Animate rotation
    rotate.value = withDelay(
      delay,
      withTiming(rotationSpeed, {
        duration,
        easing: Easing.linear,
      })
    );

    // Fade out near the end
    opacity.value = withDelay(
      delay + duration * 0.7,
      withTiming(0, {
        duration: duration * 0.3,
      }, (finished) => {
        if (finished && isLast && onComplete) {
          runOnJS(onComplete)();
        }
      })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  const { startX, size, color, shape } = particleConfig;

  return (
    <Animated.View
      style={[
        styles.particle,
        animatedStyle,
        {
          left: startX,
          width: shape === 'rect' ? size * 0.6 : size,
          height: size,
          backgroundColor: color,
          borderRadius: shape === 'square' ? 2 : 1,
        },
      ]}
    />
  );
};

interface ConfettiOverlayProps {
  visible: boolean;
  onComplete?: () => void;
  duration?: number; // Auto-dismiss after this duration (ms)
}

const ConfettiOverlay: React.FC<ConfettiOverlayProps> = ({
  visible,
  onComplete,
  duration = 3000,
}) => {
  useEffect(() => {
    if (visible) {
      // Trigger success haptic
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Auto-dismiss after duration
      const timer = setTimeout(() => {
        onComplete?.();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible, duration, onComplete]);

  if (!visible) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {Array.from({ length: PARTICLE_COUNT }).map((_, index) => (
        <ConfettiParticle
          key={index}
          index={index}
          onComplete={onComplete}
          isLast={index === PARTICLE_COUNT - 1}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    pointerEvents: 'none',
  },
  particle: {
    position: 'absolute',
    top: 0,
  },
});

export default ConfettiOverlay;
