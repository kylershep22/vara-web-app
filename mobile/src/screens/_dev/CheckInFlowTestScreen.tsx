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

type DevCheckInFlowNav = NativeStackNavigationProp<{
  Practices: { state: BrainState; timeWindow: ProtocolTimeWindow };
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

const OVERWHELM_PROTOCOL_IDS = ['cyclic-sighing-2', 'sensory-reset-2'] as const;

interface LogEntry {
  ts: number;
  terminal: TerminalFlowState;
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
        onClose={() => setPhase('setup')}
        onSeeOtherOptions={(state, timeWindow) =>
          navigation.navigate('Practices', { state, timeWindow })
        }
        onComplete={(terminal) => {
          setLog((prev) => [
            { ts: Date.now(), terminal },
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
              <Text style={styles.logBody}>
                {JSON.stringify(
                  {
                    protocolId: entry.terminal.protocol.id,
                    stateBefore: entry.terminal.stateBefore,
                    durationActualSeconds: entry.terminal.durationActualSeconds,
                    ...(entry.terminal.step === 'flow_complete' && {
                      stateAfter: entry.terminal.stateAfter,
                      outcome: entry.terminal.outcome,
                      userChosenNextStep: entry.terminal.userChosenNextStep,
                    }),
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
  logBody: {
    fontSize: Typography.fontSize.xs,
    color: Colors.softCharcoal,
    fontFamily: 'monospace',
  },
});
