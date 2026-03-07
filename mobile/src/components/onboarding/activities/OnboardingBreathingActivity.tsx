/**
 * OnboardingBreathingActivity Component
 * Simple breathing exercise for onboarding
 *
 * Features:
 * - Animated breathing circle (scale up on inhale, down on exhale)
 * - 4-4-4-4 box breathing pattern
 * - 1 minute duration (3 cycles)
 * - Haptic feedback on phase transitions
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Animated, Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, Typography } from '../../../constants';

interface OnboardingBreathingActivityProps {
  onComplete: () => void;
  durationSeconds?: number;
}

type BreathPhase = 'Inhale' | 'Hold' | 'Exhale' | 'Rest';

const PHASE_DURATION = 4; // 4 seconds per phase
const CYCLE_DURATION = PHASE_DURATION * 4; // 16 seconds per cycle
const TOTAL_CYCLES = 3; // 3 cycles = ~48 seconds

const OnboardingBreathingActivity: React.FC<OnboardingBreathingActivityProps> = ({
  onComplete,
  durationSeconds = 60,
}) => {
  const [phase, setPhase] = useState<BreathPhase>('Inhale');
  const [phaseCounter, setPhaseCounter] = useState(PHASE_DURATION);
  const [cycle, setCycle] = useState(1);
  const [totalTime, setTotalTime] = useState(durationSeconds);
  const [isActive, setIsActive] = useState(true);

  const scaleAnim = useRef(new Animated.Value(0.6)).current;

  // Animate circle based on phase
  const animateToScale = useCallback((targetScale: number, duration: number = 400) => {
    Animated.timing(scaleAnim, {
      toValue: targetScale,
      duration,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  // Handle phase transitions
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      setTotalTime((prev) => {
        if (prev <= 1) {
          setIsActive(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onComplete();
          return 0;
        }
        return prev - 1;
      });

      setPhaseCounter((prev) => {
        if (prev <= 1) {
          // Transition to next phase
          setPhase((currentPhase) => {
            let nextPhase: BreathPhase;
            switch (currentPhase) {
              case 'Inhale':
                nextPhase = 'Hold';
                break;
              case 'Hold':
                nextPhase = 'Exhale';
                animateToScale(0.6, PHASE_DURATION * 1000);
                break;
              case 'Exhale':
                nextPhase = 'Rest';
                break;
              case 'Rest':
                nextPhase = 'Inhale';
                setCycle((c) => c + 1);
                animateToScale(1.0, PHASE_DURATION * 1000);
                break;
              default:
                nextPhase = 'Inhale';
            }
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            return nextPhase;
          });
          return PHASE_DURATION;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, onComplete, animateToScale]);

  // Start inhale animation on mount
  useEffect(() => {
    animateToScale(1.0, PHASE_DURATION * 1000);
  }, [animateToScale]);

  const getPhaseColor = () => {
    switch (phase) {
      case 'Inhale':
        return Colors.evergreenTeal;
      case 'Hold':
      case 'Rest':
        return Colors.sunriseAmber;
      case 'Exhale':
        return Colors.silverSage;
      default:
        return Colors.evergreenTeal;
    }
  };

  const getPhaseInstruction = () => {
    switch (phase) {
      case 'Inhale':
        return 'Breathe in...';
      case 'Hold':
        return 'Hold...';
      case 'Exhale':
        return 'Breathe out...';
      case 'Rest':
        return 'Rest...';
      default:
        return '';
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      {/* Timer */}
      <Text style={styles.timer}>{formatTime(totalTime)}</Text>

      {/* Breathing Circle */}
      <View style={styles.circleContainer}>
        <Animated.View
          style={[
            styles.breathCircle,
            {
              backgroundColor: getPhaseColor(),
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Text style={styles.phaseCounter}>{phaseCounter}</Text>
        </Animated.View>
      </View>

      {/* Phase Instruction */}
      <Text style={styles.instruction}>{getPhaseInstruction()}</Text>

      {/* Cycle Counter */}
      <Text style={styles.cycleText}>Cycle {cycle} of {TOTAL_CYCLES}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  timer: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.medium,
    marginBottom: Spacing.xl,
  },
  circleContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: Spacing.xl,
  },
  breathCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  phaseCounter: {
    color: Colors.white,
    fontSize: 48,
    fontWeight: Typography.fontWeight.bold,
  },
  instruction: {
    color: Colors.softCharcoal,
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.medium,
    marginTop: Spacing.lg,
    textAlign: 'center',
  },
  cycleText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.sm,
    marginTop: Spacing.md,
  },
});

export default OnboardingBreathingActivity;
