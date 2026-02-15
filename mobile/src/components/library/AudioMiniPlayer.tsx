/**
 * Audio Mini Player Component
 * Persistent bottom audio player bar for sleep sounds and breathwork
 */

import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { Colors, Spacing, Layout, Typography } from '../../constants';
import { useAudioPlayer } from '../../context/AudioPlayerContext';

export function AudioMiniPlayer() {
  const { currentTrack, isPlaying, progress, duration, isLooping, pause, resume, stop, setLooping, seek } = useAudioPlayer();
  const [isSeeking, setIsSeeking] = useState(false);
  const [tempProgress, setTempProgress] = useState(0);

  // Don't render if no track is loaded
  if (!currentTrack) {
    return null;
  }

  const handlePlayPause = () => {
    if (isPlaying) {
      pause();
    } else {
      resume();
    }
  };

  const toggleLoop = () => {
    setLooping(!isLooping);
  };

  const handleSeekStart = () => {
    setIsSeeking(true);
  };

  const handleSeekChange = (value: number) => {
    setTempProgress(value);
  };

  const handleSeekComplete = async (value: number) => {
    setIsSeeking(false);
    await seek(value); // seek expects 0-1, don't multiply by duration
  };

  const formatTime = (millis: number): string => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const currentProgress = isSeeking ? tempProgress : progress;
  const currentTime = formatTime(currentProgress * duration);
  const totalTime = formatTime(duration);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Track Info and Time */}
        <View style={styles.trackInfoRow}>
          <View style={styles.iconContainer}>
            <Icon name="music-note" size={18} color={Colors.white} />
          </View>
          <View style={styles.trackDetails}>
            <Text variant="bodyMedium" style={styles.trackTitle} numberOfLines={1}>
              {currentTrack.title}
            </Text>
            <Text variant="bodySmall" style={styles.trackTime}>
              {currentTime} / {totalTime}
            </Text>
          </View>
        </View>

        {/* Seekbar */}
        <View style={styles.seekbarContainer}>
          <Slider
            style={styles.slider}
            value={currentProgress}
            onValueChange={handleSeekChange}
            onSlidingStart={handleSeekStart}
            onSlidingComplete={handleSeekComplete}
            minimumValue={0}
            maximumValue={1}
            minimumTrackTintColor={Colors.evergreenTeal}
            maximumTrackTintColor={Colors.borderLight}
            thumbTintColor={Colors.evergreenTeal}
          />
        </View>

        {/* Centered Controls Row */}
        <View style={styles.controlsRow}>
          {/* Loop Toggle */}
          <TouchableOpacity onPress={toggleLoop} style={styles.controlButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Icon
              name={isLooping ? 'repeat' : 'repeat-off'}
              size={22}
              color={isLooping ? Colors.evergreenTeal : Colors.textSecondary}
            />
          </TouchableOpacity>

          {/* Play/Pause */}
          <TouchableOpacity onPress={handlePlayPause} style={styles.playButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Icon
              name={isPlaying ? 'pause-circle' : 'play-circle'}
              size={40}
              color={Colors.evergreenTeal}
            />
          </TouchableOpacity>

          {/* Stop/Close */}
          <TouchableOpacity onPress={stop} style={styles.controlButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Icon name="close-circle" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 60, // Just above bottom tab bar
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    ...Layout.shadow.lg,
    zIndex: 100,
  },
  content: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  trackInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.evergreenTeal,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  trackDetails: {
    flex: 1,
  },
  trackTitle: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: 2,
  },
  trackTime: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.xs,
  },
  seekbarContainer: {
    paddingHorizontal: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  slider: {
    width: '100%',
    height: 30,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  controlButton: {
    padding: 6,
  },
  playButton: {
    padding: 0,
  },
});
