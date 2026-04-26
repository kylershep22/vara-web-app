// Dev-only harness for GuidedSessionPlayer end-to-end verification.
//
// The screen has two phases:
//   - "setup" — protocol picker, recovery-fixture picker, exit log,
//     and a Mount Player button.
//   - "playing" — the GuidedSessionPlayer rendered full-bleed.
//
// Mounting actually mounts a fresh component (we conditionally render
// the player based on phase, so phase flips trigger React mount/unmount
// rather than props rerender). This matters because the recovery
// effect is mount-only — exercising it via remount, not by firing it
// imperatively, mirrors the production code path.
//
// Recovery fixtures write a SessionMarker (or deliberately corrupt
// AsyncStorage) before flipping phase, so the player's mount-only
// recovery effect picks up the fixture on first run.

import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Spacing, Typography } from '../../constants';
import {
  BRAIN_STATE_PROTOCOLS,
  type ProtocolId,
} from '../../constants/brainStateProtocols';
import { GuidedSessionPlayer } from '../../components/protocol/GuidedSessionPlayer';
import type { ProtocolSessionSummary } from '../../types/models';
import {
  _SESSION_MARKER_MAX_AGE_MS,
  _SESSION_MARKER_STORAGE_KEY,
  clearMarker,
  writeMarker,
  type SessionMarker,
} from '../../utils/sessionMarker';

type Phase = 'setup' | 'playing';

type RecoveryFixture =
  | 'none' // clear any existing marker
  | 'happy' // 10 min old, mid-session
  | 'expired' // > 24h old (player should discard silently)
  | 'corrupt'; // malformed JSON in storage

interface LogEntry {
  ts: number;
  kind: 'exit' | 'recovered';
  summary: ProtocolSessionSummary;
}

const PROTOCOL_IDS = Object.keys(BRAIN_STATE_PROTOCOLS) as ProtocolId[];

const FIXTURES: { value: RecoveryFixture; label: string; description: string }[] = [
  { value: 'none', label: 'None', description: 'Clears any existing marker before mount.' },
  {
    value: 'happy',
    label: 'Happy recovery',
    description: '10 minutes old, mid-session — should fire onRecoveredSession.',
  },
  {
    value: 'expired',
    label: 'Expired (>24h)',
    description: 'Older than the 24h staleness window — should be silently discarded.',
  },
  {
    value: 'corrupt',
    label: 'Corrupt',
    description: 'Malformed JSON — readMarker returns null, no recovery call.',
  },
];

async function applyRecoveryFixture(
  fixture: RecoveryFixture,
  protocolId: ProtocolId
): Promise<void> {
  const protocol = BRAIN_STATE_PROTOCOLS[protocolId];
  const totalSteps = protocol.steps.length;

  if (fixture === 'none') {
    await clearMarker();
    return;
  }

  if (fixture === 'happy') {
    const startedAt = Date.now() - 10 * 60_000; // 10 minutes ago
    const lastUpdatedAt = startedAt + 5 * 60_000; // 5 minutes into the session
    const targetStep = Math.min(
      Math.floor(totalSteps / 2),
      Math.max(0, totalSteps - 1)
    );
    const marker: SessionMarker = {
      protocolId,
      stateBefore: 'wired',
      startedAt,
      lastUpdatedAt,
      currentStepIndex: targetStep,
      stepsCompleted: targetStep,
      totalSteps,
    };
    await writeMarker(marker);
    return;
  }

  if (fixture === 'expired') {
    // 1ms past MAX_AGE — guaranteed expired regardless of clock skew.
    const startedAt = Date.now() - _SESSION_MARKER_MAX_AGE_MS - 1;
    const marker: SessionMarker = {
      protocolId,
      stateBefore: 'wired',
      startedAt,
      lastUpdatedAt: startedAt + 60_000,
      currentStepIndex: 0,
      stepsCompleted: 0,
      totalSteps,
    };
    await writeMarker(marker);
    return;
  }

  if (fixture === 'corrupt') {
    // Write directly to bypass writeMarker's typed payload — we want
    // the validator to reject this on read.
    await AsyncStorage.setItem(
      _SESSION_MARKER_STORAGE_KEY,
      JSON.stringify({ protocolId, garbage: true })
    );
    return;
  }
}

export function GuidedSessionPlayerTestScreen() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [protocolId, setProtocolId] = useState<ProtocolId>('cyclic-sighing-2');
  const [fixture, setFixture] = useState<RecoveryFixture>('none');
  const [log, setLog] = useState<LogEntry[]>([]);
  const [busy, setBusy] = useState(false);

  const protocol = BRAIN_STATE_PROTOCOLS[protocolId];
  const fixtureMeta = FIXTURES.find((f) => f.value === fixture)!;

  const handleMount = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await applyRecoveryFixture(fixture, protocolId);
      setPhase('playing');
    } finally {
      setBusy(false);
    }
  };

  const handleExit = (summary: ProtocolSessionSummary) => {
    setLog((prev) => [...prev, { ts: Date.now(), kind: 'exit', summary }]);
    setPhase('setup');
  };

  const handleRecoveredSession = async (summary: ProtocolSessionSummary) => {
    setLog((prev) => [...prev, { ts: Date.now(), kind: 'recovered', summary }]);
  };

  if (phase === 'playing') {
    return (
      <GuidedSessionPlayer
        protocol={protocol}
        stateBefore="wired"
        onExit={handleExit}
        onRecoveredSession={handleRecoveredSession}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>GuidedSessionPlayer Dev Harness</Text>
        <Text style={styles.subtitle}>
          Mount actually mounts a fresh component — recovery effect runs
          on each mount, matching production behavior.
        </Text>

        <Text style={styles.sectionLabel}>Protocol</Text>
        <View style={styles.row}>
          {PROTOCOL_IDS.map((id) => (
            <TouchableOpacity
              key={id}
              style={[
                styles.chip,
                id === protocolId && styles.chipActive,
              ]}
              onPress={() => setProtocolId(id)}
            >
              <Text
                style={[
                  styles.chipText,
                  id === protocolId && styles.chipTextActive,
                ]}
              >
                {id}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Recovery fixture</Text>
        <View style={styles.column}>
          {FIXTURES.map((f) => (
            <TouchableOpacity
              key={f.value}
              style={[
                styles.fixtureRow,
                f.value === fixture && styles.fixtureRowActive,
              ]}
              onPress={() => setFixture(f.value)}
            >
              <Text
                style={[
                  styles.fixtureLabel,
                  f.value === fixture && styles.fixtureLabelActive,
                ]}
              >
                {f.label}
              </Text>
              <Text style={styles.fixtureDescription}>{f.description}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.meta}>
          Selected: <Text style={styles.bold}>{protocol.name}</Text> ({protocolId}) ·{' '}
          {protocol.steps.length} steps · fixture <Text style={styles.bold}>{fixtureMeta.label}</Text>
        </Text>

        <TouchableOpacity
          style={[styles.mountButton, busy && styles.mountButtonDisabled]}
          onPress={handleMount}
          disabled={busy}
        >
          <Text style={styles.mountButtonText}>
            {busy ? 'Setting up…' : 'Mount Player'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>
          Session log ({log.length})
        </Text>
        {log.length === 0 ? (
          <Text style={styles.muted}>No sessions yet.</Text>
        ) : (
          log
            .slice(-10)
            .reverse()
            .map((entry, i) => (
              <View key={`${entry.ts}-${i}`} style={styles.logEntry}>
                <Text style={styles.logTimestamp}>
                  {new Date(entry.ts).toISOString().slice(11, 19)} ·{' '}
                  <Text style={styles.bold}>
                    {entry.kind === 'recovered' ? 'RECOVERED' : 'EXIT'}
                  </Text>
                </Text>
                <Text style={styles.logLine}>
                  protocol: {entry.summary.protocolId}
                </Text>
                <Text style={styles.logLine}>
                  completed: {String(entry.summary.completed)} · reason:{' '}
                  {entry.summary.abandonReason ?? 'null'}
                </Text>
                <Text style={styles.logLine}>
                  duration: {entry.summary.durationActualSeconds}s · steps:{' '}
                  {entry.summary.stepsCompleted}/{entry.summary.totalSteps}
                </Text>
              </View>
            ))
        )}

        <Text style={styles.checklistTitle}>Verification checklist</Text>
        <Text style={styles.checklistText}>
          1. None / cyclic-sighing-2 → Mount → tap Begin → tap mock-breath-complete via the
          BreathPacer to fast-forward (or wait the full 2 min) → onExit log shows
          completed=true, abandonReason=null.{'\n'}
          2. None / nsdr-10 → Mount → tap Begin → DEV force-error button on AudioStepView
          → transport switches to Try again + End early → tap End early → log shows
          abandonReason=audio_error.{'\n'}
          3. Same as #2 but tap Try again instead → audio remounts (fresh load) → tap
          force-error again to see the loop.{'\n'}
          4. None / any → Mount → tap header X → confirm modal → log shows
          abandonReason=user_exit.{'\n'}
          5. Happy recovery / cyclic-sighing-2 → Mount → log shows a RECOVERED entry
          BEFORE any session entries (recovery fired on mount, then user can run a
          new session normally).{'\n'}
          6. Expired (&gt;24h) / any → Mount → no RECOVERED entry (silently discarded)
          → run a session normally.{'\n'}
          7. Corrupt / any → Mount → no RECOVERED entry, no crash → run a session normally.
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
  sectionLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.mutedSageGray,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  column: {
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: Colors.divider,
    backgroundColor: Colors.surface,
  },
  chipActive: {
    backgroundColor: Colors.evergreenTeal,
    borderColor: Colors.evergreenTeal,
  },
  chipText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: Colors.softCharcoal,
  },
  chipTextActive: {
    color: Colors.white,
  },
  fixtureRow: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.divider,
    backgroundColor: Colors.surface,
  },
  fixtureRowActive: {
    borderColor: Colors.evergreenTeal,
    backgroundColor: Colors.tealLight,
  },
  fixtureLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
    marginBottom: 2,
  },
  fixtureLabelActive: {
    color: Colors.evergreenTeal,
  },
  fixtureDescription: {
    fontSize: Typography.fontSize.xs,
    color: Colors.mutedSageGray,
  },
  meta: {
    marginTop: Spacing.lg,
    fontSize: Typography.fontSize.xs,
    color: Colors.mutedSageGray,
  },
  bold: {
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
  },
  mountButton: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    backgroundColor: Colors.evergreenTeal,
    alignItems: 'center',
  },
  mountButtonDisabled: {
    opacity: 0.5,
  },
  mountButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.white,
  },
  muted: {
    fontSize: Typography.fontSize.sm,
    color: Colors.mutedSageGray,
  },
  logEntry: {
    paddingVertical: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.divider,
  },
  logTimestamp: {
    fontSize: Typography.fontSize.xs,
    color: Colors.mutedSageGray,
    marginBottom: 2,
  },
  logLine: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: Colors.softCharcoal,
    marginBottom: 1,
  },
  checklistTitle: {
    marginTop: Spacing.xl,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.mutedSageGray,
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  checklistText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.mutedSageGray,
    lineHeight: 18,
  },
});
