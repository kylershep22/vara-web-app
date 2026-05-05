// Practices index — thin (sub-step 2.2 scope).
//
// Entry surface for the recommendation screen's "See other options"
// affordance and the (sub-step 2.4) not-shifted response's "Try
// something longer" affordance. Lists every protocol matching the
// user's (state, timeWindow) eligibility envelope. No ranking, no
// filtering UI, no search — Phase 4 layers ranking on top of this
// screen without changing its surface.
//
// The Build Guide names "Practices index" as a tab root; the
// navigator's current 4-tab structure does not yet include it
// (separate spec/code mismatch flagged for Phase 6). Building this
// screen now creates the surface that mismatch will eventually
// resolve to.
//
// Tap on a protocol card launches the GuidedSessionPlayer via a
// dedicated `PracticeRun` route (sub-step 2.5 will wire the re-check
// + response per Core Loop v2 §Case 4). For sub-step 2.2 the tap is
// a navigation-only handoff.

import React, { useLayoutEffect, useMemo } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Colors, Spacing, Typography } from '../../constants';
import { getAllProtocols } from '../../constants/brainStateProtocols';
import {
  evidenceChipLabel,
  formatProtocolDuration,
} from '../../utils/protocolDisplay';
import type {
  BrainState,
  IntentPath,
  Protocol,
  ProtocolTimeWindow,
} from '../../types/models';

const MIN_TOUCH_TARGET = 48;

const STATE_LABEL: Record<BrainState, string> = {
  wired: 'Wired',
  foggy: 'Foggy',
  steady: 'Steady',
  clear: 'Clear',
  alive: 'Alive',
};

function timeWindowLabel(tw: ProtocolTimeWindow): string {
  return tw === 45 ? '45+ minutes' : `${tw} minutes`;
}

// Route params shape. Registered in AppNavigator.
export interface PracticesIndexRouteParams {
  state: BrainState;
  timeWindow: ProtocolTimeWindow;
  // Sub-step 2.7 round 5 (Bug B fix) — when this screen is reached
  // from CheckInFlow ("See other options" or "Try something longer"),
  // CheckInFlowScreen passes fromCheckInFlow=true plus the intentPath
  // it was running. PracticesIndexScreen forwards both to
  // PracticeRunScreen so the BrowseRunFlow can branch on context.
  // Absent for true browse entries (no production entry today).
  fromCheckInFlow?: boolean;
  intentPath?: IntentPath;
}

type RouteParams = RouteProp<
  { Practices: PracticesIndexRouteParams },
  'Practices'
>;

type NavigationProp = NativeStackNavigationProp<{
  PracticeRun: {
    protocolId: string;
    stateBefore: BrainState;
    fromCheckInFlow?: boolean;
    intentPath?: IntentPath;
    timeWindow?: ProtocolTimeWindow;
  };
}>;

export function PracticesIndexScreen() {
  const route = useRoute<RouteParams>();
  const navigation = useNavigation<NavigationProp>();
  const { state, timeWindow, fromCheckInFlow, intentPath } = route.params;

  // Custom headerLeft override for Obs 12b: the system-default back
  // button on this screen was reported unresponsive in #1.0.83. An
  // explicit TouchableOpacity with hitSlop guarantees taps reach the
  // handler regardless of stack-header chrome quirks.
  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.backButton}
          testID="practices-back-button"
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Icon name="chevron-left" size={24} color={Colors.evergreenTeal} />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  // Eligibility filter mirrors the Phase 2 stub recommender's filter
  // exactly (protocolSelector.service.ts) so "See other options"
  // never surfaces a protocol the recommender wouldn't have picked
  // from. Phase 4 layers ranking on top of the same eligibility set.
  const eligible = useMemo<Protocol[]>(
    () =>
      getAllProtocols()
        .filter((p) => p.suitableForStates.includes(state))
        .filter((p) => p.timeWindow <= timeWindow)
        .sort((a, b) => a.id.localeCompare(b.id)),
    [state, timeWindow]
  );

  return (
    <View style={styles.container} testID="practices-index">
      <Text style={styles.title} testID="practices-index-title">
        Other options for {STATE_LABEL[state]} · {timeWindowLabel(timeWindow)}
      </Text>

      {eligible.length === 0 ? (
        <View style={styles.emptyState} testID="practices-index-empty">
          <Text style={styles.emptyTitle}>Nothing fits right now</Text>
          <Text style={styles.emptyBody}>
            No protocols match your current state and time window. This is rare —
            try a different time window from the check-in flow.
          </Text>
        </View>
      ) : (
        <FlatList
          data={eligible}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => (
            <PracticeCard
              protocol={item}
              onPress={() =>
                navigation.navigate('PracticeRun', {
                  protocolId: item.id,
                  stateBefore: state,
                  fromCheckInFlow,
                  intentPath,
                  timeWindow,
                })
              }
            />
          )}
          contentContainerStyle={styles.listContent}
          testID="practices-index-list"
        />
      )}
    </View>
  );
}

interface PracticeCardProps {
  protocol: Protocol;
  onPress: () => void;
}

function PracticeCard({ protocol, onPress }: PracticeCardProps) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Start ${protocol.name}`}
      testID={`practices-index-card-${protocol.id}`}
    >
      <Text style={styles.cardName}>{protocol.name}</Text>
      <View style={styles.cardMetaRow}>
        <Text style={styles.cardDuration}>
          {formatProtocolDuration(protocol)}
        </Text>
        <Text style={styles.cardMetaSeparator}>·</Text>
        <Text style={styles.cardEvidence}>
          {evidenceChipLabel(protocol.evidenceTier)}
        </Text>
      </View>
      <Text style={styles.cardDescription} numberOfLines={2}>
        {protocol.description}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.default,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  backButton: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  title: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
    marginBottom: Spacing.lg,
  },
  listContent: {
    paddingBottom: Spacing.xl,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  emptyTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
    marginBottom: Spacing.sm,
  },
  emptyBody: {
    fontSize: Typography.fontSize.base,
    color: Colors.mutedSageGray,
    textAlign: 'center',
    lineHeight: 22,
  },
  card: {
    minHeight: MIN_TOUCH_TARGET,
    padding: Spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.divider,
    backgroundColor: Colors.surface,
    marginBottom: Spacing.md,
  },
  cardName: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
    marginBottom: Spacing.xs,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  cardDuration: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.evergreenTeal,
  },
  cardMetaSeparator: {
    marginHorizontal: Spacing.sm,
    fontSize: Typography.fontSize.sm,
    color: Colors.mutedSageGray,
  },
  cardEvidence: {
    fontSize: Typography.fontSize.sm,
    color: Colors.mutedSageGray,
  },
  cardDescription: {
    fontSize: Typography.fontSize.base,
    color: Colors.softCharcoal,
    lineHeight: 22,
  },
});
