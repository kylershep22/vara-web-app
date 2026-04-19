import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, Layout } from '../../../constants';
import { BrainState } from '../../../types';
import { BRAIN_STATES } from './brainStateOptions';
import { BrainStateOptionRow } from './BrainStateOptionRow';

interface BrainStateCapturedViewProps {
  selectedState: BrainState;
  onComplete: () => void;
}

const FADE_DURATION = 200;
const SCALE_DURATION = 180;
const SUCCESS_HAPTIC_DELAY = 800;
const TOTAL_DURATION = 1200;

export const BrainStateCapturedView: React.FC<BrainStateCapturedViewProps> = ({
  selectedState,
  onComplete,
}) => {
  const nonWinnerOpacity = useSharedValue(1);
  const winnerScale = useSharedValue(1);
  const completeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hapticTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    nonWinnerOpacity.value = withTiming(0, { duration: FADE_DURATION });
    winnerScale.value = withTiming(1.05, { duration: SCALE_DURATION });

    hapticTimerRef.current = setTimeout(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, SUCCESS_HAPTIC_DELAY);

    completeTimerRef.current = setTimeout(() => {
      onComplete();
    }, TOTAL_DURATION);

    return () => {
      if (hapticTimerRef.current) clearTimeout(hapticTimerRef.current);
      if (completeTimerRef.current) clearTimeout(completeTimerRef.current);
    };
  }, [onComplete, nonWinnerOpacity, winnerScale]);

  const nonWinnerStyle = useAnimatedStyle(() => ({
    opacity: nonWinnerOpacity.value,
  }));

  const winnerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: winnerScale.value }],
  }));

  return (
    <View style={styles.container}>
      {BRAIN_STATES.map((option, index) => {
        const isWinner = option.state === selectedState;
        const isLast = index === BRAIN_STATES.length - 1;
        return (
          <Animated.View
            key={option.state}
            style={isWinner ? winnerStyle : nonWinnerStyle}
          >
            <BrainStateOptionRow
              option={option}
              onPress={() => {}}
              selected={isWinner}
              disabled={!isWinner}
              isLast={isLast}
            />
          </Animated.View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.base,
  },
});
