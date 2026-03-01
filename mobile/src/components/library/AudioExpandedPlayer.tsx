/**
 * Audio Expanded Player Component
 * Full-control bottom sheet player with seekbar, sleep timer, and ambient visual
 *
 * Presented as a bottom sheet overlay when the user taps the mini player.
 * Dismisses on: overlay tap, chevron tap, or swipe down.
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Text,
  Animated,
  Easing,
  Dimensions,
  PanResponder,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Layout } from '../../constants';
import { useAudioPlayer } from '../../context/AudioPlayerContext';
import { useReducedMotion } from '../../hooks';

// =====================
// Constants
// =====================

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const ANIMATION_DURATION = 300;
const DISMISS_DRAG_THRESHOLD = 100;
const DISMISS_VELOCITY_THRESHOLD = 0.5;

const SLEEP_TIMER_OPTIONS: { label: string; value: number | null }[] = [
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '45 min', value: 45 },
  { label: '1 hour', value: 60 },
  { label: 'Off', value: null },
];

// =====================
// Helpers
// =====================

const formatTime = (millis: number): string => {
  const totalSeconds = Math.floor(millis / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

// =====================
// Sleep Visual Sub-Component
// =====================

function SleepVisual({ isPlaying }: { isPlaying: boolean }) {
  const reduceMotion = useReducedMotion();

  // Three ring animations with different durations
  const ring1Anim = useRef(new Animated.Value(0)).current;
  const ring2Anim = useRef(new Animated.Value(0)).current;
  const ring3Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion || !isPlaying) {
      // Stop animations, reset to 0
      ring1Anim.stopAnimation();
      ring2Anim.stopAnimation();
      ring3Anim.stopAnimation();
      ring1Anim.setValue(0);
      ring2Anim.setValue(0);
      ring3Anim.setValue(0);
      return;
    }

    const createPulse = (anim: Animated.Value, duration: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: duration / 2,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: duration / 2,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );

    const a1 = createPulse(ring1Anim, 3000);
    const a2 = createPulse(ring2Anim, 3800);
    const a3 = createPulse(ring3Anim, 4600);

    a1.start();
    a2.start();
    a3.start();

    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [isPlaying, reduceMotion]);

  const staticOpacities = isPlaying ? [0.3, 0.2, 0.1] : [0.15, 0.15, 0.15];

  const ringConfigs = [
    { anim: ring1Anim, baseScale: 1.0, maxScale: 1.06, baseOpacity: staticOpacities[0] },
    { anim: ring2Anim, baseScale: 1.18, maxScale: 1.24, baseOpacity: staticOpacities[1] },
    { anim: ring3Anim, baseScale: 1.36, maxScale: 1.42, baseOpacity: staticOpacities[2] },
  ];

  return (
    <View style={sleepVisualStyles.container}>
      {ringConfigs.map((ring, index) => {
        const scale = reduceMotion || !isPlaying
          ? ring.baseScale
          : ring.anim.interpolate({
              inputRange: [0, 1],
              outputRange: [ring.baseScale, ring.maxScale],
            });

        const opacity = reduceMotion || !isPlaying
          ? ring.baseOpacity
          : ring.anim.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [ring.baseOpacity, ring.baseOpacity + 0.05, ring.baseOpacity],
            });

        return (
          <Animated.View
            key={index}
            style={[
              sleepVisualStyles.ring,
              {
                transform: [{ scale: scale as any }],
                opacity: opacity as any,
              },
            ]}
          />
        );
      })}

      {/* Center circle */}
      <LinearGradient
        colors={['#E8F0E4', '#D5E3D1']}
        style={sleepVisualStyles.centerCircle}
      >
        <Icon name="weather-night" size={48} color="#1B5E57" />
      </LinearGradient>
    </View>
  );
}

const sleepVisualStyles = StyleSheet.create({
  container: {
    width: 200,
    height: 200,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  ring: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1.5,
    borderColor: '#B8CDBA', // Silver Sage
  },
  centerCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

// =====================
// Main Component
// =====================

export function AudioExpandedPlayer() {
  const {
    currentTrack,
    isPlaying,
    progress,
    duration,
    isLooping,
    sleepTimer,
    sleepTimerEndTime,
    pause,
    resume,
    seek,
    setLooping,
    setSleepTimer,
    setIsExpanded,
  } = useAudioPlayer();

  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();

  // Animation state
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const playScaleAnim = useRef(new Animated.Value(1)).current;

  // Seek state
  const [isSeeking, setIsSeeking] = useState(false);
  const [tempProgress, setTempProgress] = useState(0);

  // Remaining time for sleep timer display
  const [timerRemaining, setTimerRemaining] = useState<number | null>(null);

  // Slide in on mount
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: ANIMATION_DURATION,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, []);

  // Update timer remaining display
  useEffect(() => {
    if (sleepTimerEndTime === null) {
      setTimerRemaining(null);
      return;
    }

    const update = () => {
      const remaining = Math.max(0, sleepTimerEndTime - Date.now());
      setTimerRemaining(Math.ceil(remaining / 60000)); // minutes
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [sleepTimerEndTime]);

  // Pan responder for swipe-to-dismiss
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gestureState) => {
      // Only capture vertical downward gestures
      return gestureState.dy > 10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
    },
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy > 0) {
        slideAnim.setValue(gestureState.dy);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (
        gestureState.dy > DISMISS_DRAG_THRESHOLD ||
        gestureState.vy > DISMISS_VELOCITY_THRESHOLD
      ) {
        dismiss();
      } else {
        // Snap back
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }).start();
      }
    },
  }), []);

  const dismiss = () => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: ANIMATION_DURATION,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      setIsExpanded(false);
    });
  };

  // Play/Pause with press animation
  const handlePlayPause = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isPlaying) {
      pause();
    } else {
      resume();
    }
  };

  const handlePlayPressIn = () => {
    Animated.timing(playScaleAnim, {
      toValue: 0.96,
      duration: 150,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  const handlePlayPressOut = () => {
    Animated.timing(playScaleAnim, {
      toValue: 1,
      duration: 150,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  // Loop toggle
  const handleLoopToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLooping(!isLooping);
  };

  // Seek handling
  const handleSeekChange = (value: number) => {
    setIsSeeking(true);
    setTempProgress(value);
  };

  const handleSeekComplete = async (value: number) => {
    setIsSeeking(false);
    await seek(value);
  };

  // Sleep timer chip selection
  const handleTimerSelect = (value: number | null) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSleepTimer(value);
  };

  if (!currentTrack) return null;

  const currentProgress = isSeeking ? tempProgress : progress;
  const elapsed = formatTime(currentProgress * duration);
  const total = formatTime(duration);
  const isTimerActive = sleepTimer !== null;

  // Overlay opacity tied to sheet position
  const overlayOpacity = slideAnim.interpolate({
    inputRange: [0, SCREEN_HEIGHT],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.overlay}>
      {/* Tappable overlay background */}
      <Animated.View style={[styles.overlayBackground, { opacity: overlayOpacity }]}>
        <TouchableWithoutFeedback onPress={dismiss}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>
      </Animated.View>

      {/* Bottom sheet */}
      <Animated.View
        style={[
          styles.sheet,
          { transform: [{ translateY: slideAnim }] },
        ]}
        {...panResponder.panHandlers}
      >
        {/* Handle bar */}
        <View style={styles.handle} />

        {/* Collapse chevron */}
        <TouchableOpacity
          onPress={dismiss}
          style={styles.collapseButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon name="chevron-down" size={20} color="#6F7F77" />
        </TouchableOpacity>

        {/* Sleep Visual */}
        <SleepVisual isPlaying={isPlaying} />

        {/* Track Info */}
        <View style={styles.trackInfo}>
          <Text style={styles.trackTitle}>{currentTrack.title}</Text>
          <Text style={styles.trackCategory}>Sleep Sound</Text>
        </View>

        {/* Seekbar */}
        <View style={styles.seekbarContainer}>
          <Slider
            style={styles.slider}
            value={currentProgress}
            onValueChange={handleSeekChange}
            onSlidingComplete={handleSeekComplete}
            minimumValue={0}
            maximumValue={1}
            minimumTrackTintColor="#1B5E57"
            maximumTrackTintColor="rgba(184, 205, 186, 0.3)"
            thumbTintColor="#1B5E57"
          />
          <View style={styles.timeRow}>
            <Text style={styles.timeLabel}>{elapsed}</Text>
            <Text style={styles.timeLabel}>{total}</Text>
          </View>
        </View>

        {/* Primary Controls */}
        <View style={styles.controlsRow}>
          {/* Loop toggle */}
          <TouchableOpacity
            onPress={handleLoopToggle}
            style={[
              styles.secondaryControl,
              isLooping && styles.secondaryControlActive,
            ]}
          >
            <Icon
              name="repeat"
              size={22}
              color={isLooping ? '#1B5E57' : '#6F7F77'}
            />
            {isLooping && <View style={styles.activeIndicatorDot} />}
          </TouchableOpacity>

          {/* Play/Pause */}
          <Animated.View style={{ transform: [{ scale: playScaleAnim }] }}>
            <TouchableOpacity
              onPress={handlePlayPause}
              onPressIn={handlePlayPressIn}
              onPressOut={handlePlayPressOut}
              style={styles.playButton}
              activeOpacity={1}
            >
              <Icon
                name={isPlaying ? 'pause' : 'play'}
                size={28}
                color="#FFFFFF"
                style={!isPlaying ? { marginLeft: 3 } : undefined}
              />
            </TouchableOpacity>
          </Animated.View>

          {/* Sleep timer shortcut */}
          <TouchableOpacity
            style={[
              styles.secondaryControl,
              isTimerActive && styles.secondaryControlActive,
            ]}
            onPress={() => {
              // Scroll focus handled by chip section visibility
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <Icon
              name="timer-outline"
              size={22}
              color={isTimerActive ? '#1B5E57' : '#6F7F77'}
            />
            {isTimerActive && timerRemaining !== null && (
              <Text style={styles.timerRemainingText}>{timerRemaining}m</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Sleep Timer Chips */}
        <View style={styles.timerSection}>
          <Text style={styles.timerLabel}>SLEEP TIMER</Text>
          <View style={styles.chipRow}>
            {SLEEP_TIMER_OPTIONS.map((option) => {
              const isSelected = sleepTimer === option.value;
              return (
                <TouchableOpacity
                  key={option.label}
                  onPress={() => handleTimerSelect(option.value)}
                  style={[
                    styles.chip,
                    isSelected ? styles.chipSelected : styles.chipUnselected,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      isSelected ? styles.chipTextSelected : styles.chipTextUnselected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Bottom safe area */}
        <View style={{ height: Math.max(insets.bottom, 48) }} />
      </Animated.View>
    </View>
  );
}

// =====================
// Styles
// =====================

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 300,
  },
  overlayBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.30)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    ...Layout.shadow.lg,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 9999,
    backgroundColor: '#B8CDBA', // Silver Sage
    alignSelf: 'center',
    marginTop: 12,
  },
  collapseButton: {
    position: 'absolute',
    top: 8,
    right: 20,
    padding: 8,
    zIndex: 10,
  },

  // Track info
  trackInfo: {
    alignItems: 'center',
    marginTop: 24,
    paddingHorizontal: 24,
  },
  trackTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1B5E57', // Evergreen Teal
    textAlign: 'center',
  },
  trackCategory: {
    fontSize: 14,
    fontWeight: '400',
    color: '#6F7F77', // Muted Sage Gray
    marginTop: 4,
  },

  // Seekbar
  seekbarContainer: {
    paddingHorizontal: 24,
    marginTop: 24,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -4,
  },
  timeLabel: {
    fontSize: 12,
    fontWeight: '400',
    color: '#6F7F77', // Muted Sage Gray
    fontVariant: ['tabular-nums'],
  },

  // Primary controls
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    gap: 40,
  },
  secondaryControl: {
    width: 48,
    height: 48,
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  secondaryControlActive: {
    backgroundColor: 'rgba(27, 94, 87, 0.08)', // Evergreen Teal 8%
  },
  activeIndicatorDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#1B5E57',
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 9999,
    backgroundColor: '#1B5E57', // Evergreen Teal
    justifyContent: 'center',
    alignItems: 'center',
    ...Layout.shadow.md,
  },
  timerRemainingText: {
    position: 'absolute',
    bottom: 2,
    fontSize: 9,
    fontWeight: '600',
    color: '#1B5E57',
  },

  // Sleep timer chips
  timerSection: {
    paddingHorizontal: 24,
    marginTop: 24,
  },
  timerLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6F7F77', // Muted Sage Gray
    letterSpacing: 0.24, // 0.02em at 12px
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4, // radius-sm
  },
  chipSelected: {
    backgroundColor: '#1B5E57', // Evergreen Teal
  },
  chipUnselected: {
    backgroundColor: 'rgba(213, 227, 209, 0.6)', // Dew Sage 60%
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  chipTextUnselected: {
    color: '#3E3E3E', // Soft Charcoal
  },
});
