// Audio step renderer.
//
// Loads the audio file via protocolAudioLoader, drives playback from
// the player-level isActive signal, and reports completion when the
// audio finishes naturally. Errors during load or playback bubble up
// through onError — the leaf does not decide what to do with them
// (retry, abandon, fall back); that's the player's call in
// sub-step 4.3.
//
// `skipBackSignal` is a counter the player increments when the user
// taps Back-15s. A scrubbing/seek affordance is intentionally absent —
// per Vara_NSDR_Audio_Scripts.md, NSDR is a linear practice and
// jumping around defeats the mechanism.

import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';

import { Colors, Spacing, Typography } from '../../constants';
import { loadProtocolAudio } from '../../services/audio/protocolAudioLoader';
import { logger } from '../../utils/logger';
import type { AudioStepViewProps } from './stepViewProps';

const SKIP_BACK_MS = 15_000;

function formatPosition(positionMs: number, durationMs: number): string {
  const fmt = (ms: number) => {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSec / 60);
    const seconds = totalSec % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  };
  return `${fmt(positionMs)} / ${fmt(durationMs)}`;
}

export function AudioStepView({
  step,
  isActive,
  skipBackSignal,
  onComplete,
  onError,
}: AudioStepViewProps) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);

  // Latest-callback refs so the parent can pass inline arrows without
  // triggering effect re-runs (same pattern as BreathPacer / countdown).
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);
  const completedRef = useRef(false);
  useEffect(() => {
    onCompleteRef.current = onComplete;
    onErrorRef.current = onError;
  });

  // Keep current position accessible from non-state-bound effects
  // (skip-back). Avoids putting positionMs in those effects' deps.
  const positionRef = useRef(0);
  useEffect(() => {
    positionRef.current = positionMs;
  }, [positionMs]);

  // Load audio on mount / step change. Cleanup unloads the Sound.
  useEffect(() => {
    let cancelled = false;
    let loaded: Audio.Sound | null = null;
    setLoadError(null);
    setPositionMs(0);
    setDurationMs(0);
    completedRef.current = false;

    loadProtocolAudio(step.audioPath)
      .then((s) => {
        if (cancelled) {
          s.unloadAsync().catch(() => {});
          return;
        }
        loaded = s;
        s.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
          if (!status.isLoaded) {
            // Playback errors surface here as `error: string`.
            const errorMessage =
              'error' in status && typeof status.error === 'string'
                ? status.error
                : null;
            if (errorMessage && !completedRef.current) {
              const err = new Error(errorMessage);
              logger.error(
                `AudioStepView: playback error for ${step.audioPath}`,
                err
              );
              onErrorRef.current?.(err);
            }
            return;
          }
          setPositionMs(status.positionMillis);
          if (status.durationMillis !== undefined) {
            setDurationMs(status.durationMillis);
          }
          if (status.didJustFinish && !completedRef.current) {
            completedRef.current = true;
            onCompleteRef.current();
          }
        });
        setSound(s);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setLoadError(err);
        onErrorRef.current?.(err);
      });

    return () => {
      cancelled = true;
      if (loaded) {
        loaded.setOnPlaybackStatusUpdate(null);
        loaded.unloadAsync().catch(() => {});
      }
    };
  }, [step.audioPath]);

  // Play / pause based on isActive.
  useEffect(() => {
    if (!sound) return;
    if (completedRef.current) return;
    if (isActive) {
      sound.playAsync().catch((err: Error) => {
        logger.error('AudioStepView: playAsync failed', err);
        onErrorRef.current?.(err);
      });
    } else {
      sound.pauseAsync().catch(() => {
        // Pause failures are non-fatal — the audio simply keeps
        // playing. No error surface for the user.
      });
    }
  }, [sound, isActive]);

  // Skip-back. Only reacts to changes in skipBackSignal, never the
  // initial value.
  const lastSkipRef = useRef(skipBackSignal);
  useEffect(() => {
    if (skipBackSignal === undefined) return;
    if (lastSkipRef.current === skipBackSignal) return;
    lastSkipRef.current = skipBackSignal;
    if (!sound) return;
    const target = Math.max(0, positionRef.current - SKIP_BACK_MS);
    sound.setPositionAsync(target).catch((err: Error) => {
      logger.warn('AudioStepView: setPositionAsync failed', err);
    });
  }, [skipBackSignal, sound]);

  // ----- render -----

  if (loadError) {
    return (
      <View style={styles.container} testID="audio-step-error">
        <Text style={styles.errorTitle}>Couldn't load this audio</Text>
        <Text style={styles.errorBody}>
          Check your connection and try again. If it keeps happening,
          end the session and choose a different protocol.
        </Text>
      </View>
    );
  }

  if (!sound) {
    return (
      <View style={styles.container} testID="audio-step-loading">
        <ActivityIndicator color={Colors.evergreenTeal} />
        <Text style={styles.loadingText}>Preparing audio…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container} testID="audio-step-ready">
      <Text style={styles.position} testID="audio-step-position">
        {formatPosition(positionMs, durationMs)}
      </Text>
      <Text style={styles.hint}>
        Lie down somewhere quiet. Headphones if you have them.
      </Text>
      {__DEV__ ? (
        // Dev-only: lets the GuidedSessionPlayerTestScreen verify the
        // audio-error transport flow without unplugging the network.
        // Metro tree-shakes this in production builds (__DEV__ is
        // false). DO NOT remove the gate.
        <TouchableOpacity
          style={styles.devForceError}
          onPress={() => onErrorRef.current?.(new Error('Forced audio error (DEV)'))}
          testID="audio-step-dev-force-error"
        >
          <Text style={styles.devForceErrorText}>DEV: Force audio error</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.fontSize.sm,
    color: Colors.mutedSageGray,
  },
  errorTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  errorBody: {
    fontSize: Typography.fontSize.sm,
    color: Colors.mutedSageGray,
    textAlign: 'center',
    lineHeight: 20,
  },
  position: {
    fontSize: 56,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.evergreenTeal,
    fontVariant: ['tabular-nums'],
  },
  hint: {
    marginTop: Spacing.lg,
    fontSize: Typography.fontSize.sm,
    color: Colors.mutedSageGray,
    textAlign: 'center',
  },
  devForceError: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.softCoral,
  },
  devForceErrorText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.softCoral,
  },
});
