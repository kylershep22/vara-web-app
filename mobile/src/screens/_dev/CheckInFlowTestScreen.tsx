// Dev-only harness for the Phase 2 sub-step 2.2 check-in flow.
//
// Two-phase screen:
//   - "setup" — entry-source picker (standard / overwhelm) +
//     overwhelm protocol picker + Mount Flow button.
//   - "playing" — CheckInFlow rendered full-bleed.
//
// Real mount/unmount semantics: phase flips actually mount or
// unmount the flow, so initialization and terminal-state effects
// run on the production code path. Terminal events are appended to
// an on-screen log so device verification can confirm the right
// payload reaches the parent.

import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BrainState, ProtocolTimeWindow } from '../../types/models';
import type { Slot } from '../../engine';

type DevCheckInFlowNav = NativeStackNavigationProp<{
  Practices: { slot: Slot; state: BrainState; timeWindow: ProtocolTimeWindow };
  PracticeRun: { protocolId: string; stateBefore: BrainState };
}>;
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Spacing, Typography } from '../../constants';
import {
  CheckInFlow,
  type TerminalFlowState,
} from '../../components/checkin/flow/CheckInFlow';
import type { FlowInit } from '../../components/checkin/flow/types';
import { getProtocolById } from '../../constants/brainStateProtocols';

type Phase = 'setup' | 'playing';
type EntryChoice = 'standard' | 'overwhelm';

// Captures which navigation branch fired on the parent-side swap, so
// device verification can confirm the right path triggered without
// reading source. Sub-step 2.4 wires this in the dev harness only —
// production callers pick up the same swap-then-route logic in 2.5.
type NavBranchTag =
  | 'pointer_handoff'
  | 'no_navigation_practice'
  | 'no_navigation_acknowledged'
  | 'no_navigation_abandoned';

const OVERWHELM_PROTOCOL_IDS = ['cyclic-sighing-2', 'sensory-reset-2'] as const;

interface LogEntry {
  ts: number;
  terminal: TerminalFlowState;
  navBranch: NavBranchTag;
  navDetail: string;
}

export function CheckInFlowTestScreen() {
  const navigation = useNavigation<DevCheckInFlowNav>();
  const [phase, setPhase] = useState<Phase>('setup');
  const [entry, setEntry] = useState<EntryChoice>('standard');
  const [overwhelmProtocolId, setOverwhelmProtocolId] = useState<string>(
    OVERWHELM_PROTOCOL_IDS[0]
  );
  const [log, setLog] = useState<LogEntry[]>([]);

  const buildInit = (): FlowInit | null => {
    if (entry === 'standard') {
      return { entrySource: 'standard' };
    }
    const protocol = getProtocolById(overwhelmProtocolId);
    if (!protocol) return null;
    return {
      entrySource: 'overwhelm_safety_card',
      protocol,
      nowMs: Date.now(),
    };
  };

  if (phase === 'playing') {
    const init = buildInit();
    if (!init) {
      // Fall back to setup if init was malformed.
      setPhase('setup');
      return null;
    }
    return (
      <CheckInFlow
        init={init}
        // Dev harness uses dryRun mode — keeps production schema
        // clean of harness pollution. Real writes are exercised once
        // via device verification post-2.5.
        userId="dev-harness-user"
        writeMode="dev_dry_run"
        onClose={() => setPhase('setup')}
        onSeeOtherOptions={(slot, timeWindow, stateBefore) =>
          navigation.navigate('Practices', { slot, state: stateBefore, timeWindow })
        }
        onComplete={(terminal) => {
          // Visible navBranch tag in the log so device verification can
          // confirm which terminal path fired. The harness logs only —
          // the pointer hand-off targets (FocusTimer / Rhythms) aren't
          // registered in this dev stack.
          let navBranch: NavBranchTag;
          let navDetail: string;
          if (terminal.step === 'abandoned') {
            navBranch = 'no_navigation_abandoned';
            navDetail = 'Flow abandoned mid-practice.';
          } else if (terminal.completion.kind === 'pointer_only') {
            navBranch = 'pointer_handoff';
            navDetail = `Pointer hand-off (no practice ran): ${terminal.completion.pointerLaunched.type}`;
          } else if (terminal.completion.kind === 'practice') {
            const pointer = terminal.completion.pointerLaunched;
            navBranch = pointer ? 'pointer_handoff' : 'no_navigation_practice';
            navDetail = pointer
              ? `Practice → pointer hand-off: ${pointer.type} (reflection="${terminal.completion.reflection}")`
              : `Practice completed, reflection="${terminal.completion.reflection}" — no hand-off.`;
          } else {
            navBranch = 'no_navigation_acknowledged';
            navDetail = 'Acknowledged (zero-slot / declined offer) — nothing ran.';
          }

          setLog((prev) => [
            { ts: Date.now(), terminal, navBranch, navDetail },
            ...prev.slice(0, 9),
          ]);
          setPhase('setup');
        }}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Dev: Check-In Flow</Text>
        <Text style={styles.body}>
          Mount the Phase 2 multi-step flow with a chosen entry source.
          Terminal events from `onComplete` are logged below — verify the
          payload matches expectations for each path.
        </Text>

        <Text style={styles.section}>Entry source</Text>
        {(['standard', 'overwhelm'] as EntryChoice[]).map((choice) => (
          <TouchableOpacity
            key={choice}
            style={[
              styles.chip,
              entry === choice && styles.chipActive,
            ]}
            onPress={() => setEntry(choice)}
          >
            <Text
              style={[
                styles.chipLabel,
                entry === choice && styles.chipLabelActive,
              ]}
            >
              {choice === 'standard'
                ? 'Standard (start at state-pick)'
                : 'Overwhelm (skip to running)'}
            </Text>
          </TouchableOpacity>
        ))}

        {entry === 'overwhelm' && (
          <>
            <Text style={styles.section}>Overwhelm protocol</Text>
            {OVERWHELM_PROTOCOL_IDS.map((id) => (
              <TouchableOpacity
                key={id}
                style={[
                  styles.chip,
                  overwhelmProtocolId === id && styles.chipActive,
                ]}
                onPress={() => setOverwhelmProtocolId(id)}
              >
                <Text
                  style={[
                    styles.chipLabel,
                    overwhelmProtocolId === id && styles.chipLabelActive,
                  ]}
                >
                  {id}
                </Text>
              </TouchableOpacity>
            ))}
          </>
        )}

        <TouchableOpacity
          style={styles.mountButton}
          onPress={() => setPhase('playing')}
        >
          <Text style={styles.mountButtonLabel}>Mount Flow</Text>
        </TouchableOpacity>

        <Text style={styles.section}>Recent terminal events</Text>
        {log.length === 0 ? (
          <Text style={styles.empty}>No events yet.</Text>
        ) : (
          log.map((entry) => (
            <View
              key={`${entry.ts}-${entry.terminal.step}`}
              style={styles.logEntry}
            >
              <Text style={styles.logHeader}>
                {entry.terminal.step} · {new Date(entry.ts).toLocaleTimeString()}
              </Text>
              <Text
                style={[
                  styles.logNavBranch,
                  entry.navBranch === 'pointer_handoff'
                    ? styles.logNavBranchOverride
                    : null,
                ]}
              >
                {entry.navDetail}
              </Text>
              <Text style={styles.logBody}>
                {JSON.stringify(
                  entry.terminal.step === 'abandoned'
                    ? {
                        step: 'abandoned',
                        situation: entry.terminal.situation,
                        quadrant: entry.terminal.quadrant,
                        protocolId: entry.terminal.protocol.id,
                        durationActualSeconds:
                          entry.terminal.durationActualSeconds,
                      }
                    : {
                        step: 'flow_complete',
                        situation: entry.terminal.situation,
                        quadrant: entry.terminal.quadrant,
                        completion: entry.terminal.completion,
                      },
                  null,
                  2
                )}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background.default,
  },
  scroll: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  title: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
    marginBottom: Spacing.sm,
  },
  body: {
    fontSize: Typography.fontSize.sm,
    color: Colors.mutedSageGray,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  section: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chip: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.divider,
    backgroundColor: Colors.surface,
    marginBottom: Spacing.xs,
  },
  chipActive: {
    borderColor: Colors.evergreenTeal,
    backgroundColor: Colors.dewSage,
  },
  chipLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.softCharcoal,
  },
  chipLabelActive: {
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.evergreenTeal,
  },
  mountButton: {
    marginTop: Spacing.md,
    backgroundColor: Colors.evergreenTeal,
    borderRadius: 12,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  mountButtonLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.white,
  },
  empty: {
    fontSize: Typography.fontSize.sm,
    color: Colors.mutedSageGray,
    fontStyle: 'italic',
  },
  logEntry: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  logHeader: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.evergreenTeal,
    marginBottom: Spacing.xs,
  },
  logNavBranch: {
    fontSize: Typography.fontSize.sm,
    color: Colors.softCharcoal,
    marginBottom: Spacing.xs,
  },
  logNavBranchOverride: {
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.evergreenTeal,
  },
  logBody: {
    fontSize: Typography.fontSize.xs,
    color: Colors.softCharcoal,
    fontFamily: 'monospace',
  },
});
