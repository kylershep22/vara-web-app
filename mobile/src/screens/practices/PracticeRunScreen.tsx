// PracticeRun — thin wrapper that mounts GuidedSessionPlayer for a
// single user-selected protocol from the Practices index.
//
// TODO(2.5) — INTENTIONALLY INCOMPLETE.
//
// This screen is sub-step 2.2 scope only: play the protocol, on exit
// return to Practices. Three things are deliberately missing because
// sub-step 2.5 owns them:
//
//   1. NO RE-CHECK after player exit. The screen calls
//      `navigation.goBack()` directly. Per Core Loop v2 §Case 4,
//      browse-launched sessions still need a re-check — re-check IS
//      the measurement (Build Guide §1, atomic unit of value).
//      Skipping it produces zero state transitions for ~30% of
//      launch-window session sources, defeating the data model.
//
//   2. NO SESSION WRITE. No `ProtocolSession` Firestore record is
//      written. CheckInFlow's terminal useEffect logs the would-be
//      payload; this screen doesn't even do that yet because there's
//      no flow state to capture.
//
//   3. NO ADAPTIVE RESPONSE. No shifted/not-shifted branching. The
//      user just exits back to Practices.
//
// Sub-step 2.5 replaces all of this with a Case 4 mini flow (likely
// reusing a shared running → re_check → response sub-machine
// extracted from CheckInFlow). See PHASE_NOTES.md "Sub-step 2.5
// deliverables" for the full scope.

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';

import { Colors, Spacing, Typography } from '../../constants';
import { getProtocolById } from '../../constants/brainStateProtocols';
import { GuidedSessionPlayer } from '../../components/protocol/GuidedSessionPlayer';
import type { BrainState } from '../../types/models';

export interface PracticeRunRouteParams {
  protocolId: string;
  stateBefore: BrainState;
}

type RouteParams = RouteProp<
  { PracticeRun: PracticeRunRouteParams },
  'PracticeRun'
>;

export function PracticeRunScreen() {
  const route = useRoute<RouteParams>();
  const navigation = useNavigation();
  const { protocolId, stateBefore } = route.params;
  const protocol = getProtocolById(protocolId);

  if (!protocol) {
    return (
      <View style={styles.errorContainer} testID="practice-run-error">
        <Text style={styles.errorTitle}>Protocol not found</Text>
        <Text style={styles.errorBody}>
          This protocol is no longer available. Try going back and picking
          another option.
        </Text>
      </View>
    );
  }

  return (
    <GuidedSessionPlayer
      protocol={protocol}
      stateBefore={stateBefore}
      onExit={() => {
        navigation.goBack();
      }}
    />
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    backgroundColor: Colors.background.default,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
    marginBottom: Spacing.sm,
  },
  errorBody: {
    fontSize: Typography.fontSize.base,
    color: Colors.mutedSageGray,
    textAlign: 'center',
    lineHeight: 22,
  },
});
