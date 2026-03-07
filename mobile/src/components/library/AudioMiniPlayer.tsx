/**
 * Audio Mini Player Component
 * Simplified persistent bottom bar — tappable to expand into full player
 *
 * Layout: [Icon] Track Title   1:30/5:00 [Play/Pause] [Close]
 * With a 2.5px progress bar at the bottom edge
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, Layout } from '../../constants';
import { useAudioPlayer } from '../../context/AudioPlayerContext';

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
// Component
// =====================

export function AudioMiniPlayer() {
  const {
    currentTrack,
    isPlaying,
    progress,
    duration,
    pause,
    resume,
    stop,
    setIsExpanded,
  } = useAudioPlayer();

  if (!currentTrack) {
    return null;
  }

  const handleExpand = () => {
    setIsExpanded(true);
  };

  const handlePlayPause = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isPlaying) {
      pause();
    } else {
      resume();
    }
  };

  const handleClose = () => {
    stop();
  };

  const elapsed = formatTime(progress * duration);
  const total = formatTime(duration);

  return (
    <TouchableOpacity
      onPress={handleExpand}
      activeOpacity={0.95}
      style={styles.outerContainer}
    >
      <View style={styles.container}>
        {/* Track icon */}
        <View style={styles.iconContainer}>
          <Icon name="music-note" size={18} color={Colors.evergreenTeal} />
        </View>

        {/* Track info */}
        <View style={styles.trackInfo}>
          <Text style={styles.title} numberOfLines={1}>
            {currentTrack.title}
          </Text>
          <Text style={styles.time}>
            {elapsed} / {total}
          </Text>
        </View>

        {/* Play/Pause button */}
        <TouchableOpacity
          onPress={handlePlayPause}
          style={styles.playPauseButton}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
        >
          <Icon
            name={isPlaying ? 'pause' : 'play'}
            size={18}
            color={Colors.surface}
          />
        </TouchableOpacity>

        {/* Close button */}
        <TouchableOpacity
          onPress={handleClose}
          style={styles.closeButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Close player"
        >
          <Icon name="close" size={16} color={Colors.textSecondary} style={{ opacity: 0.6 }} />
        </TouchableOpacity>

        {/* Progress bar at bottom */}
        <View
          style={[
            styles.progressBar,
            { width: `${Math.min(progress * 100, 100)}%` },
          ]}
        />
      </View>
    </TouchableOpacity>
  );
}

// =====================
// Styles
// =====================

const styles = StyleSheet.create({
  outerContainer: {
    position: 'absolute',
    bottom: 60, // flush with top of tab bar
    left: Spacing.sm,
    right: Spacing.sm,
    zIndex: 100,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.divider,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    gap: Spacing.md,
    overflow: 'hidden',
    ...Layout.shadow.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: Layout.borderRadius.md,
    backgroundColor: Colors.dewSageLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackInfo: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  time: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.textSecondary,
    fontVariant: ['tabular-nums'],
    marginTop: Spacing['2xs'],
  },
  playPauseButton: {
    width: 48,
    height: 48,
    borderRadius: Layout.borderRadius.full,
    backgroundColor: Colors.evergreenTeal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 2.5,
    backgroundColor: Colors.evergreenTeal,
    borderBottomLeftRadius: Layout.borderRadius.lg,
  },
});
