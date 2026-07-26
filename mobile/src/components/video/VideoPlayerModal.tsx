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
 * Control set is deliberately fixed at four: play/pause, scrubber with seek,
 * elapsed/total time, close. No speed, captions, or volume.
 *
 * PORTRAIT ONLY — no fullscreen. The landscape-fullscreen affordance was
 * removed after the first device walk: entering native fullscreen from a
 * portrait-locked app froze the player outright on one clip and stranded it
 * with no controls and no exit on the other, forcing a force-quit. A video
 * that plays reliably inline beats one with a fullscreen button that traps
 * people. Landscape fullscreen is a post-launch follow-up, not a launch fix.
 *
 * Fit: `contentFit="contain"`, so both landscape and portrait sources
 * letterbox/pillarbox rather than stretch or crop.
 */

import React, { useCallback, useMemo, useState } from 'react';
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
import {
  SafeAreaProvider,
  SafeAreaView,
  initialWindowMetrics,
} from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useEvent } from 'expo';
import { VideoView, useVideoPlayer } from 'expo-video';

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

  // Only resolve while the modal is open, so a mounted-but-hidden modal does
  // not hit Storage.
  const activePath = visible ? storagePath : null;
  const { url, loading, error, retry } = useVideoSource(activePath);

  // useVideoPlayer is keyed on the source, so this setup runs again when the
  // resolved URL replaces the initial null — which is where autoplay actually
  // takes effect. Opening the player is an explicit "watch this" action, so it
  // starts without a second tap.
  const player = useVideoPlayer(url ?? null, (p) => {
    p.timeUpdateEventInterval = TIME_UPDATE_INTERVAL_SECONDS;
    p.play();
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

  const playLabel = isPlaying ? 'Pause video' : 'Play video';

  // Distinguish "resolving the Storage URL" from "player buffering". Both show
  // the same calm spinner; only a genuine failure escalates.
  const isBuffering = !!url && (status === 'loading' || status === 'idle');
  const showSpinner = loading || isBuffering;
  const playerErrored = status === 'error';
  const showError = !!error || playerErrored;

  const errorMessage = error ?? "Couldn't play this video. Check your connection and try again.";

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
      {/* A React Native Modal renders into its own native view hierarchy, which
          the app-root SafeAreaProvider (App.tsx) does not measure. Without a
          provider nested here, SafeAreaView inside the modal reads zero or
          stale insets — which is why the title collided with the camera cutout
          on one clip and cleared it on another. The difference was render
          timing, not the video. */}
      {/* initialMetrics seeds the provider with the window insets captured at
          app start, so the header is correctly inset on the FIRST frame. A bare
          provider has to measure natively before it reports anything, which
          renders the title at inset zero — under the camera — until the measure
          lands. The modal is full-screen in the same window, so the app's
          window metrics are the right ones. */}
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
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
                player={player}
                style={styles.video}
                // contain: both landscape and portrait sources fit the frame
                // without stretch or crop.
                contentFit="contain"
                nativeControls={false}
                // Both presentations are disabled explicitly, not just left at
                // their defaults: each is a way for the video to leave this modal
                // into a surface with its own controls, which is exactly how the
                // first walk got stuck with no way back.
                fullscreenOptions={{ enable: false }}
                allowsPictureInPicture={false}
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

          {/* Controls — four: play/pause, scrubber, elapsed/total time, close
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
                // Enabled as soon as there is something to play. It used to also
                // require duration > 0, which left the slider DISABLED for as
                // long as the duration was unknown — and a disabled slider does
                // not consume touches, so drags fell straight through to
                // whatever was behind it. That is the likeliest source of the
                // "it grabbed the whole modal" feel, and it explains why the two
                // clips behaved differently: they report duration at different
                // times.
                disabled={!url || showError}
                // iOS UISlider only begins tracking when the touch lands ON the
                // thumb unless this is set. Without it, a drag that starts on
                // the track does nothing and the touch propagates.
                tapToSeek
                accessibilityLabel="Video position"
                accessibilityHint="Swipe up or down to move through the video"
                accessibilityValue={sliderAccessibility}
                testID="video-player-scrubber"
              />

              <Text style={styles.time} testID="video-player-duration">
                {formatTime(duration)}
              </Text>
            </View>
          </SafeAreaView>
        </View>
      </SafeAreaProvider>
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
    // Lifted clear of the bottom edge. Sitting flush against it put the
    // scrubber inside the iOS home-indicator region, where the system can claim
    // a drag that starts there before the app ever sees it.
    paddingBottom: Spacing.base,
  },
  iconButton: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slider: {
    flex: 1,
    // A taller track than the default gives the drag a real target, so a
    // slightly-off touch still lands on the scrubber instead of missing it and
    // propagating.
    height: MIN_TOUCH_TARGET,
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
