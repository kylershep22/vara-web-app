/**
 * VideoPlayerModal
 *
 * Full-screen video player for explainer content streamed from Firebase
 * Storage. A lean-in "watch this" surface, not a calm dip-in sheet — hence
 * full-screen rather than a partial-height sheet, and a persistent control bar
 * rather than auto-hiding chrome.
 *
 * Content-agnostic by construction: it takes a Storage path and plays whatever
 * is there. It contains no reference to any specific video, so swapping the
 * explainer is a data change (a different path) and never a code change.
 *
 * Control set is deliberately fixed at five: play/pause, scrubber with seek,
 * elapsed/total time, fullscreen toggle, close. No speed, captions, or volume.
 *
 * Fit: `contentFit="contain"` inline, so both landscape and portrait sources
 * letterbox/pillarbox rather than stretch or crop. In native fullscreen the
 * platform presents its own player and handles fit itself — we do not force a
 * fit there.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useEvent } from 'expo';
import { VideoView, useVideoPlayer, type VideoView as VideoViewType } from 'expo-video';

import { Colors, Spacing, Typography } from '../../constants';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useVideoSource } from '../../hooks/useVideoSource';

// A video surface needs true black behind it: any lighter backdrop makes
// letterbox/pillarbox bars read as a rendering fault rather than as frame.
// ImageViewer sets the same precedent for full-screen media.
const VIDEO_BACKDROP = '#000000';

const MIN_TOUCH_TARGET = 48;

// How often the player reports playback position. 4x/second is smooth enough
// for a scrubber without flooding the JS bridge.
const TIME_UPDATE_INTERVAL_SECONDS = 0.25;

export interface VideoPlayerModalProps {
  visible: boolean;
  /**
   * Full Firebase Storage path of the video to play, e.g.
   * `focus-video/focus_explainer_v1.mp4`. Null renders nothing.
   */
  storagePath: string | null;
  /** Optional label shown in the header and used for accessibility. */
  title?: string;
  onClose: () => void;
}

/** Formats seconds as m:ss (or h:mm:ss past an hour). */
export function formatTime(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '0:00';
  const s = Math.floor(totalSeconds % 60);
  const m = Math.floor((totalSeconds / 60) % 60);
  const h = Math.floor(totalSeconds / 3600);
  const ss = s < 10 ? `0${s}` : `${s}`;
  if (h > 0) {
    const mm = m < 10 ? `0${m}` : `${m}`;
    return `${h}:${mm}:${ss}`;
  }
  return `${m}:${ss}`;
}

/** Spoken form for assistive tech — "1 minute 5 seconds", not "1:05". */
export function spokenTime(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '0 seconds';
  const s = Math.floor(totalSeconds % 60);
  const m = Math.floor(totalSeconds / 60);
  const parts: string[] = [];
  if (m > 0) parts.push(`${m} minute${m === 1 ? '' : 's'}`);
  if (s > 0 || m === 0) parts.push(`${s} second${s === 1 ? '' : 's'}`);
  return parts.join(' ');
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  visible,
  storagePath,
  title,
  onClose,
}) => {
  const reduceMotion = useReducedMotion();
  const viewRef = useRef<VideoViewType>(null);

  // Only resolve while the modal is open, so a mounted-but-hidden modal does
  // not hit Storage.
  const activePath = visible ? storagePath : null;
  const { url, loading, error, retry } = useVideoSource(activePath);

  const player = useVideoPlayer(url ?? null, (p) => {
    p.timeUpdateEventInterval = TIME_UPDATE_INTERVAL_SECONDS;
  });

  const { status } = useEvent(player, 'statusChange', {
    status: player.status,
  }) ?? { status: player.status };

  const { isPlaying } = useEvent(player, 'playingChange', {
    isPlaying: player.playing,
  }) ?? { isPlaying: false };

  const timeUpdate = useEvent(player, 'timeUpdate', {
    currentTime: 0,
    currentLiveTimestamp: null,
    currentOffsetFromLive: null,
    bufferedPosition: 0,
  });

  // While the user drags, the slider follows the finger rather than the
  // player, so playback updates don't yank the thumb backwards mid-gesture.
  const [scrubValue, setScrubValue] = useState<number | null>(null);

  const duration = Number.isFinite(player.duration) ? player.duration : 0;
  const playbackPosition = timeUpdate?.currentTime ?? 0;
  const position = scrubValue ?? playbackPosition;

  const togglePlay = useCallback(() => {
    if (player.playing) {
      player.pause();
    } else {
      player.play();
    }
  }, [player]);

  const handleSlidingComplete = useCallback(
    (value: number) => {
      player.currentTime = value;
      setScrubValue(null);
    },
    [player]
  );

  const handleFullscreen = useCallback(() => {
    viewRef.current?.enterFullscreen();
  }, []);

  const playLabel = isPlaying ? 'Pause video' : 'Play video';

  // Distinguish "resolving the Storage URL" from "player buffering". Both show
  // the same calm spinner; only a genuine failure escalates.
  const isBuffering = !!url && (status === 'loading' || status === 'idle');
  const showSpinner = loading || isBuffering;
  const playerErrored = status === 'error';
  const showError = !!error || playerErrored;

  const errorMessage =
    error ?? "Couldn't play this video. Check your connection and try again.";

  const sliderAccessibility = useMemo(
    () => ({
      min: 0,
      max: Math.max(1, Math.floor(duration)),
      now: Math.floor(position),
      text: `${spokenTime(position)} of ${spokenTime(duration)}`,
    }),
    [duration, position]
  );

  return (
    <Modal
      visible={visible}
      // Reduce Motion: cross-fade instead of the slide-up transition.
      animationType={reduceMotion ? 'fade' : 'slide'}
      onRequestClose={onClose}
      supportedOrientations={['portrait']}
      testID="video-player-modal"
    >
      <View style={styles.container}>
        <StatusBar hidden />

        {/* Header — close control */}
        <SafeAreaView edges={['top']} style={styles.headerSafe}>
          <View style={styles.header}>
            {title ? (
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
            ) : (
              <View style={styles.titleSpacer} />
            )}
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Close video"
              testID="video-player-close"
            >
              <Icon name="close" size={26} color={Colors.white} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        {/* Video surface */}
        <View style={styles.videoArea}>
          {url && !showError ? (
            <VideoView
              ref={viewRef}
              player={player}
              style={styles.video}
              // contain: both landscape and portrait sources fit the frame
              // without stretch or crop. Native fullscreen handles its own fit.
              contentFit="contain"
              nativeControls={false}
              fullscreenOptions={{
                enable: true,
                orientation: 'landscape',
                autoExitOnRotate: false,
              }}
              testID="video-player-view"
            />
          ) : null}

          {showSpinner && !showError ? (
            <View style={styles.overlayCentre} testID="video-player-loading">
              <ActivityIndicator size="large" color={Colors.white} />
              <Text style={styles.overlayText}>Loading video…</Text>
            </View>
          ) : null}

          {showError ? (
            <View style={styles.overlayCentre} testID="video-player-error">
              <Icon name="alert-circle-outline" size={32} color={Colors.error} />
              <Text style={styles.errorText}>{errorMessage}</Text>
              <TouchableOpacity
                onPress={retry}
                style={styles.retryButton}
                accessibilityRole="button"
                accessibilityLabel="Try loading the video again"
                testID="video-player-retry"
              >
                <Text style={styles.retryText}>Try again</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {/* Controls — exactly five: play/pause, scrubber, time, fullscreen, close
            (close lives in the header above). */}
        <SafeAreaView edges={['bottom']} style={styles.controlsSafe}>
          <View style={styles.controls} testID="video-player-controls">
            <TouchableOpacity
              onPress={togglePlay}
              style={styles.iconButton}
              disabled={!url || showError}
              accessibilityRole="button"
              accessibilityLabel={playLabel}
              accessibilityState={{ disabled: !url || showError }}
              testID="video-player-playpause"
            >
              <Icon
                name={isPlaying ? 'pause' : 'play'}
                size={28}
                color={!url || showError ? Colors.mutedSageGray : Colors.white}
              />
            </TouchableOpacity>

            <Text style={styles.time} testID="video-player-elapsed">
              {formatTime(position)}
            </Text>

            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={Math.max(1, duration)}
              value={position}
              onValueChange={setScrubValue}
              onSlidingComplete={handleSlidingComplete}
              minimumTrackTintColor={Colors.white}
              maximumTrackTintColor={Colors.mutedSageGray}
              thumbTintColor={Colors.white}
              disabled={!url || showError || duration <= 0}
              accessibilityLabel="Video position"
              accessibilityHint="Swipe up or down to move through the video"
              accessibilityValue={sliderAccessibility}
              testID="video-player-scrubber"
            />

            <Text style={styles.time} testID="video-player-duration">
              {formatTime(duration)}
            </Text>

            <TouchableOpacity
              onPress={handleFullscreen}
              style={styles.iconButton}
              disabled={!url || showError}
              accessibilityRole="button"
              accessibilityLabel="Play video fullscreen"
              accessibilityState={{ disabled: !url || showError }}
              testID="video-player-fullscreen"
            >
              <Icon
                name="fullscreen"
                size={26}
                color={!url || showError ? Colors.mutedSageGray : Colors.white}
              />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: VIDEO_BACKDROP,
  },
  headerSafe: {
    backgroundColor: VIDEO_BACKDROP,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  title: {
    flex: 1,
    color: Colors.white,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    marginRight: Spacing.sm,
  },
  titleSpacer: {
    flex: 1,
  },
  closeButton: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  videoArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  overlayCentre: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  overlayText: {
    marginTop: Spacing.md,
    color: Colors.white,
    fontSize: Typography.fontSize.sm,
  },
  errorText: {
    marginTop: Spacing.md,
    color: Colors.white,
    fontSize: Typography.fontSize.base,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryButton: {
    marginTop: Spacing.lg,
    minHeight: MIN_TOUCH_TARGET,
    paddingHorizontal: Spacing.xl,
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.white,
  },
  retryText: {
    color: Colors.white,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
  controlsSafe: {
    backgroundColor: VIDEO_BACKDROP,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  iconButton: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slider: {
    flex: 1,
    // Android renders the slider a few px higher than iOS; this keeps the
    // thumb visually centred against the time labels on both.
    marginHorizontal: Platform.OS === 'android' ? 0 : Spacing.xs,
  },
  time: {
    color: Colors.white,
    fontSize: Typography.fontSize.xs,
    fontVariant: ['tabular-nums'],
    minWidth: 40,
    textAlign: 'center',
  },
});

export default VideoPlayerModal;
