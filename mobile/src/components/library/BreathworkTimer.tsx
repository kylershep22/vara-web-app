/**
 * Breathwork Timer Component
 * Visual breathing guide with animated circle
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Switch } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing, Typography } from '../../constants';

interface BreathworkTimerProps {
  pattern: string; // e.g., "4-4-4-4" for box breathing
  duration: number; // total minutes
  onComplete?: () => void;
  isActive?: boolean;
  onPause?: () => void;
  onResume?: () => void;
}

export function BreathworkTimer({
  pattern,
  duration,
  onComplete,
  isActive = false,
  onPause,
  onResume,
}: BreathworkTimerProps) {
  const [phase, setPhase] = useState<'Inhale' | 'Hold' | 'Exhale' | 'Hold2'>('Inhale');
  const [phaseCounter, setPhaseCounter] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(duration * 60);
  const [currentCycle, setCurrentCycle] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [audioCounterEnabled, setAudioCounterEnabled] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Parse pattern (e.g., "4-4-4-4" -> [4, 4, 4, 4])
  const parsePattern = (pat: string): number[] => {
    return pat.split('-').map(Number);
  };

  const [inhale, hold1, exhale, hold2] = parsePattern(pattern);

  // Cleanup sound on unmount
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  // Play audio count beep
  const playAudioCount = async (count: number) => {
    if (!audioCounterEnabled) return;

    try {
      // Use a reliable Data URI for a simple beep tone (440Hz sine wave, 0.1s)
      // This is a minimal WAV file encoded as base64
      const beepDataUri = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFgYJ/f36CgoGBgoKDg4SEhYWGhoaHh4iIiImJiYqKiouLi4yMjI2NjY2Ojo6Ojo+Pj4+QkJCQkJGRkZGRkpKSkpOTk5OTk5SUlJSUlJWVlZWVlZWWlpaWlpaWl5eXl5eXl5eYmJiYmJiYmJiYmJmZmZmZmZmZmZmZmZmamJiXmJiYl5iYmJeYmJeXmJiYl5eYl5iXmJeXl5iXl5eXl5eXl5eWlpeWlpaWlpaVlpWVlZWVlZSUlJSUlJOUk5OTk5OSkpKSkpKRkZGRkJCQkJCPj4+Pjo6Ojo2NjY2MjIyMi4uLioqKiomJiYiIiIeHh4aGhYWFhISEg4ODgoKCgYGBgH9/fn5+fX19fX19fX5+fn5+f39/f3+AgICAgICBgYGBgYKCgoKCg4ODg4SEhISFhYWFhYaGhoaHh4eHiIiIiImJiYmKioqKi4uLi4uMjIyMjIyNjY2Njo6Ojo6Oj4+Pj4+Pj5CQkJCQkJGRkZGRkZKSkpKSkpKTk5OTk5OTlJSUlJSUlJWVlZWVlZWVlpaWlpaWlpaXl5eXl5eXl5eXmJiYmJiYmJiYmJiYmJiYmJiYmJiYl5iYmJiYl5eXl5eXl5eXlpeXl5eWlpaWlpaWlZaVlZWVlZWUlJSUlJSTk5OTk5OSkpKSkpGRkZGRkJCQkI+Pj4+Ojo6OjY2NjIyMjIuLi4qKiomJiYiIh4eHhoaFhYSEhIODgoKBgYGAfn9+fn19fXx9fXx9fX19fn5+fn5/f3+AgICAgIGBgYGBgoKCgoKDg4ODg4SEhISEhYWFhYWGhoaGhoaHh4eHh4iIiIiIiImJiYmJiYqKioqKiouLi4uLi4uMjIyMjIyMjI2NjY2NjY2Ojo6Ojo6Ojo6Oj4+Pj4+Pj4+Pj5CQkJCQkJCQkJCQkJGRkZGRkZGRkZGRkZGRkZKSkpKSkpKSkpKSkpKSkpKSkpOTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5OTk5KSkpKSkpKSkpKSkpKSkpKRkZGRkZGRkZGRkZGRkZCQkJCQkJCQkJCQkI+Pj4+Pj4+Pj4+Ojo6Ojo6Ojo6NjY2NjY2MjIyMjIuLi4uKioqKiYmJiYiIiIeHh4aGhoWFhYSEhIODg4KCgoGBgYB/f39+fn59fX18fHx8fHx8fHx8fX19fX19fn5+fn5+f39/f4CAgIGBgYKCgoODg4SEhIWFhYaGhoeHh4iIiImJiYqKiouLi4yMjI2NjY6Ojo+Pj5CQkJGRkZKSkpOTk5SUlJWVlZWWlpeXl5iYmJiZmZmampqampmZmZmZmJiYmJeXl5aWlpWVlZSUlJOTk5KSkpGRkZCQkI+Pj46Ojo2NjIyMi4uLioqKiYmJiIiIh4eHhoaGhYWFhISEg4ODgoKBgYGAgICAfn9+fn59fXx9fHx8fHx8fHx8fHx8fHx8fHx8fX19fn5+fn9/f3+AgIGBgYKCgoODhISEhYWGhoaHh4iIiImJiYqKi4uLjIyMjY2Njo6Pj4+QkJCRkZGSkpOTk5SUlJWVlpaWl5eYmJiZmZmZmpqampqampmZmZmYmJiYl5eXlpaWlZWVlJSUk5OTkpKRkZGQkJCPj4+Ojo2NjY2MjIuLi4qKiomJiYiIiIeHh4aGhoWFhISEg4OCgoKBgYGAgH9/fn5+fn19fX19fHx8fHx8fHx8fHx8fHx8fX19fX1+fn5+fn9/f4CAgICAgYGBgoKCg4ODhISEhYWFhoaGh4eHiIiIiYmJioqKi4uLjIyMjY2Njo6Ojo+Pj5CQkJGRkZKSkpOTk5SUlJWVlZaWlpeXl5iYmJiZmZmZmpqamZqamZmZmZiYmJiXl5eWlpaVlZWUlJSTk5OSkpKRkZGQkJCPj4+Ojo6NjY2MjIyLi4qKiomJiYiIiIeHh4aGhYWFhISEg4OCgoKBgYGAgIB/f39+fn59fX19fH18fHx8fHx8fHx8fHx8fX19fX1+fn5+fn9/f3+AgICBgYGBgoKCg4ODhISEhYWFhoaGh4eHiIiIiYmJioqKi4uLjIyMjY2Njo6Oj4+PkJCQkZGRkpKSk5OTlJSUlZWVlpaWl5eXmJiYmZmZmZqampqampqZmZmZmJiYl5eXlpaWlZWVlJSUk5OTkpKSkZGRkJCQj4+Pjo6OjY2NjIyMi4uLioqKiYmJiIiIh4eHhoaGhYWFhISEg4ODgoKCgYGBgIB/f39+fn59fX19fHx8fHx8';

      const { sound: beepSound } = await Audio.Sound.createAsync(
        { uri: beepDataUri },
        { shouldPlay: true, volume: 0.3 }
      );

      // Unload after playing
      setTimeout(async () => {
        try {
          await beepSound.unloadAsync();
        } catch (e) {
          // Ignore cleanup errors
        }
      }, 200);
    } catch (error) {
      console.error('Error playing audio count:', error);
      // Fallback to haptic if audio fails
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (e) {
        // Ignore haptic errors
      }
    }
  };

  useEffect(() => {
    if (!isActive || isPaused) return;

    const interval = setInterval(() => {
      setTotalSeconds((prev) => {
        if (prev <= 0) {
          clearInterval(interval);
          onComplete?.();
          return 0;
        }
        return prev - 1;
      });

      // Cycle through breathing phases
      setPhaseCounter((prev) => {
        const next = prev + 1;

        // Determine current phase based on counter
        if (next <= inhale) {
          setPhase('Inhale');
          animateCircle(next / inhale);
          if (next === 1) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          playAudioCount(next);
        } else if (next <= inhale + hold1) {
          setPhase('Hold');
        } else if (next <= inhale + hold1 + exhale) {
          setPhase('Exhale');
          const progress = (next - inhale - hold1) / exhale;
          animateCircle(1 - progress);
          if (next === inhale + hold1 + 1) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          playAudioCount(next - inhale - hold1);
        } else if (next <= inhale + hold1 + exhale + hold2) {
          setPhase('Hold2');
        } else {
          // Reset cycle
          setCurrentCycle((c) => c + 1);
          return 0;
        }

        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, isPaused, inhale, hold1, exhale, hold2, onComplete, audioCounterEnabled]);

  const animateCircle = (scale: number) => {
    Animated.timing(scaleAnim, {
      toValue: 0.6 + scale * 0.4, // Scale between 0.6 and 1.0
      useNativeDriver: true,
      duration: 400,
    }).start();
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getPhaseColor = () => {
    switch (phase) {
      case 'Inhale':
        return Colors.evergreenTeal;
      case 'Hold':
      case 'Hold2':
        return Colors.sunriseAmber;
      case 'Exhale':
        return Colors.silverSage;
      default:
        return Colors.evergreenTeal;
    }
  };

  const handlePauseToggle = () => {
    if (isPaused) {
      setIsPaused(false);
      onResume?.();
    } else {
      setIsPaused(true);
      onPause?.();
    }
  };

  return (
    <View style={styles.container}>
      {/* Animated Circle */}
      <Animated.View
        style={[
          styles.circle,
          {
            backgroundColor: getPhaseColor(),
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Text style={styles.phaseText}>
          {phase === 'Hold2' ? 'Hold' : phase}
        </Text>
      </Animated.View>

      {/* Timer */}
      <Text style={styles.timer}>
        {formatTime(totalSeconds)}
      </Text>

      {/* Cycle Counter */}
      <Text style={styles.cycleText}>
        Cycle {currentCycle + 1}
      </Text>

      {/* Control Buttons */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlButton, isPaused && styles.controlButtonActive]}
          onPress={handlePauseToggle}
          disabled={!isActive}
        >
          <Icon
            name={isPaused ? 'play' : 'pause'}
            size={24}
            color={Colors.white}
          />
          <Text style={styles.controlButtonText}>
            {isPaused ? 'Resume' : 'Pause'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Audio Counter Toggle */}
      <View style={styles.audioToggle}>
        <Icon name="volume-high" size={20} color={audioCounterEnabled ? Colors.evergreenTeal : Colors.textSecondary} />
        <Text style={styles.audioToggleLabel}>
          Audio Counter
        </Text>
        <Switch
          value={audioCounterEnabled}
          onValueChange={setAudioCounterEnabled}
          trackColor={{ false: Colors.silverSage, true: Colors.evergreenTeal }}
          thumbColor={Colors.white}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['4xl'],
  },
  circle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  phaseText: {
    color: Colors.white,
    fontWeight: Typography.fontWeight.bold,
    textAlign: 'center',
  },
  timer: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.sm,
  },
  cycleText: {
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.base,
    marginBottom: Spacing.lg,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.evergreenTeal,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.base,
    borderRadius: 24,
    gap: Spacing.sm,
  },
  controlButtonActive: {
    backgroundColor: Colors.sunriseAmber,
  },
  controlButtonText: {
    color: Colors.white,
    fontWeight: Typography.fontWeight.bold,
  },
  audioToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: 12,
  },
  audioToggleLabel: {
    color: Colors.textPrimary,
    flex: 1,
  },
});
