// PracticeRun — thin wrapper that mounts GuidedSessionPlayer for a
// single user-selected protocol from the Practices index. Sub-step
// 2.2 scope: play the protocol, on exit return to Practices.
//
// Sub-step 2.5 will replace this with a Case 4 flow per Core Loop
// v2 — re-check + simple response after the player exits, since
// browse-launched sessions are still measurement-bearing data.

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
