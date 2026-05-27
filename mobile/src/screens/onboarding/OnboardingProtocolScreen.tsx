/**
 * Screen 6 — The protocol (NOT skippable). Plays one guided protocol matched to
 * the user's state via the existing GuidedSessionPlayer. The player owns audio
 * loading + failure handling (retry / end-early), so a slow/failed load never
 * dumps the user out (spec Edge Case 7) — on exit we always advance to re-check.
 *
 * selectProtocol throws in __DEV__ on a no-match (production falls back), so we
 * select defensively: on throw or missing match, use the general-downshift
 * fallback protocol (spec Edge Case 8).
 */
import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { GuidedSessionPlayer } from '../../components/protocol/GuidedSessionPlayer';
import { selectProtocol } from '../../services/protocolSelector.service';
import { getProtocolById } from '../../constants/brainStateProtocols';
import {
  DEFAULT_ONBOARDING_STATE,
  DEFAULT_ONBOARDING_PROTOCOL_ID,
  ONBOARDING_PROTOCOL_TIME_WINDOW,
} from '../../constants/onboardingStressRecovery';
import { Colors, Spacing, Typography } from '../../constants';
import { useAuth } from '../../context/AuthContext';
import { saveOnboardingStep } from '../../services/firebase/onboardingStressRecovery.service';
import type { BrainState, Protocol, ProtocolSessionSummary } from '../../types/models';

const OnboardingProtocolScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();
  const state: BrainState = route.params?.state ?? DEFAULT_ONBOARDING_STATE;

  useEffect(() => {
    if (user?.uid) void saveOnboardingStep(user.uid, 'OnboardingProtocol');
  }, [user?.uid]);

  const protocol = useMemo<Protocol | null>(() => {
    try {
      return selectProtocol({ state, timeWindow: ONBOARDING_PROTOCOL_TIME_WINDOW });
    } catch {
      return getProtocolById(DEFAULT_ONBOARDING_PROTOCOL_ID);
    }
  }, [state]);

  const goToRecheck = (summary?: ProtocolSessionSummary) => {
    navigation.navigate('OnboardingRecheck', {
      state,
      protocolId: protocol?.id ?? DEFAULT_ONBOARDING_PROTOCOL_ID,
      sessionStartedAt: summary?.startedAt ?? Date.now(),
      durationActualSeconds: summary?.durationActualSeconds ?? 0,
    });
  };

  // Library invariant: the fallback protocol always ships. If it's somehow
  // missing, don't dead-end — advance to the re-check.
  useEffect(() => {
    if (!protocol) goToRecheck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [protocol]);

  if (!protocol) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.note}>Taking a moment…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <GuidedSessionPlayer protocol={protocol} stateBefore={state} onExit={goToRecheck} />
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.mistWhite },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.lg },
  note: { fontSize: Typography.fontSize.base, color: Colors.mutedSageGray },
});

export default OnboardingProtocolScreen;
