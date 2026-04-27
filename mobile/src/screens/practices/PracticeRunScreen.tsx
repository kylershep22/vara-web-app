// PracticeRun — wrapper that mounts BrowseRunFlow for a single
// user-selected protocol from the Practices index.
//
// Sub-step 2.5 update — replaces the bare GuidedSessionPlayer +
// goBack pattern with the Case 4 mini-flow per Core Loop v2 §Case 4.
// The user still picks a protocol from Practices and runs it; the
// difference is that re-check now runs at the end so we capture a
// state-transition data point. ProtocolSession is written with
// outcome='browse_launched' and stateBefore=null.
//
// Routing on terminal: back to Practices index per the override in
// SPEC_CONSISTENCY_BACKLOG "Case 4 routing target after re-check"
// (the spec says Today; we route to Practices to preserve the
// user's exploration context).

import React, { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';

import { Colors, Spacing, Typography } from '../../constants';
import { getProtocolById } from '../../constants/brainStateProtocols';
import { useAuth } from '../../context/AuthContext';
import { BrowseRunFlow } from '../../components/checkin/flow/BrowseRunFlow';
import type { BrainState } from '../../types/models';

export interface PracticeRunRouteParams {
  protocolId: string;
  // The state the user filtered on at Practices index. Forwarded to
  // GuidedSessionPlayer (which requires a stateBefore for its
  // recovery summary). NOT written to the ProtocolSession record —
  // Case 4 sessions persist stateBefore=null.
  stateBefore: BrainState;
}

type RouteParams = RouteProp<
  { PracticeRun: PracticeRunRouteParams },
  'PracticeRun'
>;

export function PracticeRunScreen() {
  const route = useRoute<RouteParams>();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { protocolId, stateBefore } = route.params;
  const protocol = getProtocolById(protocolId);

  const handleComplete = useCallback(() => {
    // Both terminal variants (abandoned, flow_complete) route back
    // to Practices. The session write happens inside BrowseRunFlow's
    // terminal useEffect.
    navigation.goBack();
  }, [navigation]);

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

  if (!user?.uid) {
    // Defensive — AppNavigator shouldn't route here without an
    // authenticated user, but BrowseRunFlow's userId prop is required.
    navigation.goBack();
    return null;
  }

  return (
    <BrowseRunFlow
      protocol={protocol}
      stateBefore={stateBefore}
      userId={user.uid}
      onComplete={handleComplete}
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
