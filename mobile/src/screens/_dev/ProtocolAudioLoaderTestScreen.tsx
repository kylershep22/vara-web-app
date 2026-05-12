// Dev-only test screen for protocolAudioLoader.
//
// Lets the founder verify on-device that:
//   - Pre-fetch + load completes within the 2-second budget
//   - Second play uses the cached URL (no second getDownloadURL call)
//   - Play / pause / unload cycle is clean
//
// To run on device: temporarily import this screen into a navigator
// route gated by `__DEV__`, navigate to it, tap Prefetch, watch the
// timing output, then tap Load + Play.
//
// Stub audio note: until production NSDR audio lands, ensure
// `protocolAudio/nsdr/nsdr_10min_v1.mp3` exists in Firebase Storage as
// a short test clip. Otherwise getDownloadURL throws.

import React, { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Audio } from 'expo-av';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Spacing, Typography } from '../../constants';
import {
  _clearProtocolAudioCacheForTesting,
  _getProtocolAudioCacheSizeForTesting,
  loadProtocolAudio,
  prefetchProtocolAudio,
} from '../../services/audio/protocolAudioLoader';

const PRESET_PATHS = [
  'nsdr/nsdr_10min_v1.mp3',
  'nsdr/nsdr_20min_v1.mp3',
];

interface LogEntry {
  ts: number;
  message: string;
}

export function ProtocolAudioLoaderTestScreen() {
  const [activePath, setActivePath] = useState(PRESET_PATHS[0]);
  const [busy, setBusy] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);

  const append = (message: string) => {
    setLog((prev) => [...prev, { ts: Date.now(), message }]);
  };

  const reset = async () => {
    if (sound) {
      try {
        await sound.unloadAsync();
      } catch {
        /* ignore */
      }
    }
    setSound(null);
    _clearProtocolAudioCacheForTesting();
    setLog([]);
    append('Cache cleared, sound unloaded');
  };

  const doPrefetch = async () => {
    if (busy) return;
    setBusy(true);
    const start = Date.now();
    append(`Prefetch ${activePath} starting...`);
    try {
      await prefetchProtocolAudio(activePath);
      const ms = Date.now() - start;
      append(`Prefetch done in ${ms}ms (cache size: ${_getProtocolAudioCacheSizeForTesting()})`);
    } catch (err) {
      append(`Prefetch error: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const doLoad = async () => {
    if (busy) return;
    setBusy(true);
    const start = Date.now();
    append(`Load ${activePath} starting...`);
    try {
      // Unload any prior sound so we can reload cleanly.
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }
      const loaded = await loadProtocolAudio(activePath);
      const ms = Date.now() - start;
      append(`Load done in ${ms}ms (target: <2000ms after prefetch)`);
      setSound(loaded);
    } catch (err) {
      append(`Load error: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const doPlay = async () => {
    if (!sound) {
      append('No sound loaded');
      return;
    }
    try {
      await sound.playAsync();
      append('Play started');
    } catch (err) {
      append(`Play error: ${(err as Error).message}`);
    }
  };

  const doPause = async () => {
    if (!sound) return;
    try {
      await sound.pauseAsync();
      append('Paused');
    } catch (err) {
      append(`Pause error: ${(err as Error).message}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>protocolAudioLoader Dev Harness</Text>
        <Text style={styles.subtitle}>
          Verifies pre-fetch budget, cache reuse, play/pause cycle.
        </Text>

        <View style={styles.row}>
          {PRESET_PATHS.map((path) => (
            <TouchableOpacity
              key={path}
              style={[
                styles.pathButton,
                path === activePath && styles.pathButtonActive,
              ]}
              onPress={() => setActivePath(path)}
            >
              <Text
                style={[
                  styles.pathButtonText,
                  path === activePath && styles.pathButtonTextActive,
                ]}
              >
                {path}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={doPrefetch}
            disabled={busy}
          >
            <Text style={styles.actionButtonText}>Prefetch</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={doLoad}
            disabled={busy}
          >
            <Text style={styles.actionButtonText}>Load</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={doPlay}
            disabled={busy || !sound}
          >
            <Text style={styles.actionButtonText}>Play</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={doPause}
            disabled={busy || !sound}
          >
            <Text style={styles.actionButtonText}>Pause</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.resetButton]}
            onPress={reset}
            disabled={busy}
          >
            <Text style={styles.actionButtonText}>Reset</Text>
          </TouchableOpacity>
        </View>

        {busy && <ActivityIndicator color={Colors.evergreenTeal} />}

        <View style={styles.logSection}>
          <Text style={styles.logHeading}>
            Log ({log.length}) · cache size:{' '}
            {_getProtocolAudioCacheSizeForTesting()}
          </Text>
          {log.slice(-12).map((entry, i) => (
            <Text key={`${entry.ts}-${i}`} style={styles.logLine}>
              {new Date(entry.ts).toISOString().slice(11, 23)} · {entry.message}
            </Text>
          ))}
        </View>

        <Text style={styles.hint}>
          Files under test (Firebase Storage):{'\n'}
          · protocolAudio/nsdr/nsdr_10min_v1.mp3{'\n'}
          · protocolAudio/nsdr/nsdr_20min_v1.mp3{'\n'}
          Stub clips are short test recordings; production NSDR audio
          replaces them later at the same paths.{'\n'}
          {'\n'}
          Verification checklist:{'\n'}
          1. Tap Prefetch — note the ms value.{'\n'}
          2. Tap Load — should be &lt; 2000ms after a successful prefetch.{'\n'}
          3. Tap Play — audio should start within 100ms.{'\n'}
          4. Tap Pause / Play — should be smooth, no re-download.{'\n'}
          5. Tap Reset, then Load (no prefetch) — second URL resolution.{'\n'}
          6. Without Reset, tap Load again — cache size stays at 1.{'\n'}
          7. Both presets play cleanly (confirms expo-av plays MP3 from
          {' '}Storage on both iOS and Android).
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.default,
  },
  scroll: {
    padding: Spacing.lg,
  },
  title: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.mutedSageGray,
    marginBottom: Spacing.lg,
  },
  row: {
    flexDirection: 'column',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  pathButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.divider,
    backgroundColor: Colors.surface,
  },
  pathButtonActive: {
    backgroundColor: Colors.evergreenTeal,
    borderColor: Colors.evergreenTeal,
  },
  pathButtonText: {
    fontFamily: 'monospace',
    fontSize: Typography.fontSize.xs,
    color: Colors.softCharcoal,
  },
  pathButtonTextActive: {
    color: Colors.white,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  actionButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    backgroundColor: Colors.silverSage,
  },
  resetButton: {
    backgroundColor: Colors.softCoral,
  },
  actionButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.softCharcoal,
  },
  logSection: {
    marginTop: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: 12,
  },
  logHeading: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
    marginBottom: Spacing.sm,
  },
  logLine: {
    fontSize: 11,
    color: Colors.mutedSageGray,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  hint: {
    marginTop: Spacing.lg,
    fontSize: Typography.fontSize.xs,
    color: Colors.mutedSageGray,
    lineHeight: 18,
  },
});
