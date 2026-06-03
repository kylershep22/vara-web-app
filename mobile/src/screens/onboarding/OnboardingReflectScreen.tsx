/**
 * Screen 5 — Reflect it back. Mirrors the user's ACTUAL inputs as a snapshot
 * card (Arriving / Drivers / Peaks), adapting to what they told us — skipped
 * questions drop their row. Prefers route params; on resume (params absent) it
 * reads persisted inputs from Firestore so personalization isn't lost.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { OnboardingScaffold } from '../../components/onboarding/OnboardingScaffold';
import { withAlpha } from '../../components/dashboard/brainStateCheckin/colorUtils';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import {
  PEAK_WINDOW_OPTIONS,
  type PeakWindow,
  ONBOARDING_SR_TOTAL_STEPS,
  onboardingStepNumber,
} from '../../constants/onboardingStressRecovery';
import { useAuth } from '../../context/AuthContext';
import { saveOnboardingStep } from '../../services/firebase/onboardingStressRecovery.service';
import { onboardingResetLine } from './resolveOnboardingProtocol';
import { STATE_LABELS, STATE_COLORS } from './onboardingShift';
import type { BrainState } from '../../types/models';

interface Resolved {
  state: BrainState | null;
  stressorLabels: string[];
  peak: PeakWindow | null;
}

/**
 * Snapshot card — Highlight Card convention (Dew Sage 45% wash + Evergreen Teal
 * left accent, matching OnboardingBridge / the recheck callout). Renders the
 * captured inputs as adaptive rows; rows whose value is empty are dropped.
 */
const SnapshotCard: React.FC<{
  state: BrainState | null;
  driverLabels: string[];
  peakLabel: string | null;
}> = ({ state, driverLabels, peakLabel }) => {
  const rows: { key: string; testID: string; label: string; content: React.ReactNode }[] = [];

  if (state) {
    rows.push({
      key: 'arriving',
      testID: 'snapshot-row-arriving',
      label: 'Arriving',
      content: (
        <View style={styles.valueRow}>
          <View
            testID="snapshot-state-dot"
            style={[styles.stateDot, { backgroundColor: STATE_COLORS[state] }]}
          />
          <Text style={styles.value}>{STATE_LABELS[state]}</Text>
        </View>
      ),
    });
  }
  if (driverLabels.length > 0) {
    rows.push({
      key: 'drivers',
      testID: 'snapshot-row-drivers',
      // Singular vs plural label signals how many they picked.
      label: driverLabels.length === 1 ? 'Driver' : 'Drivers',
      content: <Text style={styles.value}>{driverLabels.join(', ')}</Text>,
    });
  }
  if (peakLabel) {
    rows.push({
      key: 'peaks',
      testID: 'snapshot-row-peaks',
      label: 'Peaks',
      content: <Text style={styles.value}>{peakLabel}</Text>,
    });
  }

  return (
    <View style={styles.card} testID="snapshot-card">
      {rows.map((r, i) => (
        <View key={r.key} testID={r.testID} style={[styles.row, i > 0 && styles.rowDivider]}>
          <Text style={styles.rowLabel}>{r.label}</Text>
          <View style={styles.valueArea}>{r.content}</View>
        </View>
      ))}
    </View>
  );
};

const OnboardingReflectScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();

  const routeState: BrainState | undefined = route.params?.state;
  const [resolved, setResolved] = useState<Resolved>({
    state: routeState ?? null,
    stressorLabels: route.params?.stressorLabels ?? [],
    peak: route.params?.peak ?? null,
  });

  useEffect(() => {
    if (user?.uid) void saveOnboardingStep(user.uid, 'OnboardingReflect');
  }, [user?.uid]);

  // Resume fallback: route params lost (user relaunched onto Reflect) → rebuild
  // from persisted inputs so the snapshot still mirrors what they told us.
  useEffect(() => {
    if (routeState !== undefined || !user?.uid || !db) return;
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (cancelled || !snap.exists()) return;
        const sr = (snap.data().onboardingStressRecovery ?? {}) as {
          initialState?: BrainState;
          stressors?: string[];
          peakWindow?: PeakWindow | null;
        };
        // Persisted stressors are ids; map them back to labels for display.
        const { STRESSOR_OPTIONS } = await import('../../constants/onboardingStressRecovery');
        const labels = STRESSOR_OPTIONS.filter((o) => (sr.stressors ?? []).includes(o.id)).map(
          (o) => o.label
        );
        setResolved({
          state: sr.initialState ?? null,
          stressorLabels: labels,
          peak: sr.peakWindow ?? null,
        });
      } catch {
        // Leave whatever we have; the card simply shows fewer rows.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [routeState, user?.uid]);

  const peakLabel = useMemo(
    () => (resolved.peak ? PEAK_WINDOW_OPTIONS.find((o) => o.id === resolved.peak)?.label ?? null : null),
    [resolved.peak]
  );

  // Sized to the protocol this state actually resolves to (Wired = 2 min Cyclic
  // Sighing; others vary), so the copy never promises a duration the user
  // doesn't get. Falls back to a generic phrase when state is unresolved.
  const resetLine = useMemo(() => onboardingResetLine(resolved.state), [resolved.state]);

  return (
    <OnboardingScaffold
      currentStep={onboardingStepNumber('OnboardingReflect')}
      totalSteps={ONBOARDING_SR_TOTAL_STEPS}
      centerContent
      title="Here's where you're starting."
      primaryLabel="Start the reset"
      onPrimary={() => navigation.navigate('OnboardingProtocol', { state: resolved.state })}
      onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
    >
      <SnapshotCard
        state={resolved.state}
        driverLabels={resolved.stressorLabels}
        peakLabel={peakLabel}
      />
      <Text style={styles.leadIn}>{resetLine}</Text>
    </OnboardingScaffold>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: withAlpha(Colors.dewSage, 0.45),
    borderLeftWidth: Layout.borderWidth.thick,
    borderLeftColor: Colors.evergreenTeal,
    borderRadius: Layout.borderRadius.lg,
    padding: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    paddingVertical: 9,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: withAlpha(Colors.mutedSageGray, 0.18),
  },
  rowLabel: {
    width: 74,
    paddingTop: 2, // optical baseline alignment with the 16px value
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.mutedSageGray,
    textTransform: 'uppercase',
    letterSpacing: Typography.letterSpacing.wide,
  },
  valueArea: {
    flex: 1,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  stateDot: {
    width: 11,
    height: 11,
    borderRadius: 5.5,
  },
  value: {
    flexShrink: 1,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
  },
  leadIn: {
    marginTop: Spacing.base,
    fontSize: Typography.fontSize.base,
    color: Colors.softCharcoal,
    lineHeight: Typography.fontSize.base * Typography.lineHeight.normal,
  },
});

export default OnboardingReflectScreen;
