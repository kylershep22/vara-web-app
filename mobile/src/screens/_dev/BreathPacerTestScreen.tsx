// Dev-only test screen for BreathPacer.
//
// Mounts the component against a few preset BreathStep configurations
// (matching the launch library's breath protocols) so the founder can
// verify on-device that the visual pacing matches the timing. Toggle
// iOS Settings > Accessibility > Motion > Reduce Motion to verify the
// static fallback.
//
// Wiring (temporary): import this screen anywhere in the navigator
// while testing, e.g. add a route in `AppNavigator.tsx` gated by
// `__DEV__`. Remove before TestFlight.

import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BreathPacer } from '../../components/protocol/BreathPacer';
import { Colors, Spacing, Typography } from '../../constants';
import { BRAIN_STATE_PROTOCOLS } from '../../constants/brainStateProtocols';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import type { BreathStep, ProtocolStep } from '../../types/models';
import {
  computeBreathPhaseSchedule,
  type PhaseScheduleEntry,
} from '../../utils/breathPacerSchedule';

interface Preset {
  id: string;
  label: string;
  step: BreathStep;
}

// Pull the breath step out of each breath protocol.
function firstBreathStep(stepsArr: ProtocolStep[]): BreathStep | null {
  const s = stepsArr.find((step) => step.kind === 'breath');
  return s && s.kind === 'breath' ? s : null;
}

const PRESETS: Preset[] = (() => {
  const out: Preset[] = [];
  for (const id of [
    'cyclic-sighing-2',
    'box-breathing-2',
    'extended-exhale-2',
    'coherence-breathing-5',
  ] as const) {
    const protocol = BRAIN_STATE_PROTOCOLS[id];
    const step = firstBreathStep(protocol.steps);
    if (step) {
      out.push({ id, label: protocol.name, step });
    }
  }
  // Add a short test step to verify edge cases without waiting 2 minutes.
  out.push({
    id: 'short-test',
    label: 'Short test (2 cycles, 6s)',
    step: {
      kind: 'breath',
      id: 'short-test',
      durationSeconds: 6,
      phases: [
        { kind: 'inhale', seconds: 1, label: 'In' },
        { kind: 'hold', seconds: 1, label: 'Hold' },
        { kind: 'exhale', seconds: 1, label: 'Out' },
      ],
    },
  });
  return out;
})();

export function BreathPacerTestScreen() {
  const reduceMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [pacerKey, setPacerKey] = useState(0);
  const [phaseLog, setPhaseLog] = useState<PhaseScheduleEntry[]>([]);
  const [completedAt, setCompletedAt] = useState<number | null>(null);

  const active = PRESETS[activeIndex];

  const restart = (idx: number) => {
    setActiveIndex(idx);
    setPacerKey((k) => k + 1);
    setPhaseLog([]);
    setCompletedAt(null);
  };

  const totalScheduledPhases = computeBreathPhaseSchedule(active.step).length;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>BreathPacer Dev Harness</Text>
        <Text style={styles.subtitle}>
          Reduce Motion is{' '}
          <Text style={styles.bold}>{reduceMotion ? 'ON' : 'OFF'}</Text>
        </Text>

        <View style={styles.presetRow}>
          {PRESETS.map((preset, idx) => (
            <TouchableOpacity
              key={preset.id}
              style={[
                styles.presetButton,
                idx === activeIndex && styles.presetButtonActive,
              ]}
              onPress={() => restart(idx)}
            >
              <Text
                style={[
                  styles.presetButtonText,
                  idx === activeIndex && styles.presetButtonTextActive,
                ]}
              >
                {preset.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.meta}>
          {active.step.durationSeconds}s total · {totalScheduledPhases} phase
          entries · cycle ={' '}
          {active.step.phases.reduce((acc, p) => acc + p.seconds, 0)}s
        </Text>

        <BreathPacer
          key={`${active.id}-${pacerKey}`}
          step={active.step}
          onPhaseChange={(entry) => setPhaseLog((log) => [...log, entry])}
          onComplete={() => setCompletedAt(Date.now())}
        />

        <TouchableOpacity
          style={styles.restartButton}
          onPress={() => restart(activeIndex)}
        >
          <Text style={styles.restartButtonText}>Restart</Text>
        </TouchableOpacity>

        <View style={styles.logSection}>
          <Text style={styles.logHeading}>
            Phase log ({phaseLog.length}/{totalScheduledPhases})
            {completedAt !== null && ' · COMPLETED'}
          </Text>
          {phaseLog.slice(-8).map((entry, i) => (
            <Text key={`${entry.cycleIndex}-${entry.phaseIndex}-${i}`} style={styles.logLine}>
              cycle {entry.cycleIndex} · phase {entry.phaseIndex} · t={entry.startSeconds}s ·{' '}
              {entry.durationSeconds}s
            </Text>
          ))}
        </View>
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
  bold: {
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  presetButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: Colors.divider,
    backgroundColor: Colors.surface,
  },
  presetButtonActive: {
    backgroundColor: Colors.evergreenTeal,
    borderColor: Colors.evergreenTeal,
  },
  presetButtonText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.softCharcoal,
  },
  presetButtonTextActive: {
    color: Colors.white,
  },
  meta: {
    fontSize: Typography.fontSize.xs,
    color: Colors.mutedSageGray,
    marginBottom: Spacing.md,
  },
  restartButton: {
    alignSelf: 'center',
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: 9999,
    backgroundColor: Colors.silverSage,
  },
  restartButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.softCharcoal,
  },
  logSection: {
    marginTop: Spacing.xl,
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
    fontSize: Typography.fontSize.xs,
    color: Colors.mutedSageGray,
    fontFamily: 'monospace',
  },
});
