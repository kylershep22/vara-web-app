// Energy browse list — Four-Pillar IA Phase B-3b.
//
// One parameterized screen for all three Energy categories. Renders the
// brainStateProtocols catalog filtered to the route's browseCategory (the field
// added in B-2): regulate / rest / fuel. Each protocol is a calm list item
// (name + duration + its own one-line description). Tapping launches the
// existing player via the PracticeRun route as a true browse pick
// (stateBefore = null — no pre-protocol check-in).
//
// No filtering/sorting UI: browseCategory already does the meaningful split.
// Items are ordered shortest-first for a gentle progression.

import React, { useLayoutEffect, useMemo } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Colors, Spacing } from '../../constants';
import { getAllProtocols } from '../../constants/brainStateProtocols';
import { ROUTES } from '../../navigation/routes';
import { ProtocolListItem } from '../../components/protocol/ProtocolListItem';
import type { Protocol, ProtocolBrowseCategory } from '../../types/models';

// The list row moved to components/protocol/ProtocolListItem in step 4b-ii-a so
// the Stress Recovery page could render the same row instead of a second copy.
// A pure move: the prefix below is the testID this screen always emitted, so
// what renders here is unchanged.
const TEST_ID_PREFIX = 'energy-browse-card';

const CATEGORY_LABEL: Record<ProtocolBrowseCategory, string> = {
  regulate: 'Regulate',
  rest: 'Rest',
  fuel: 'Fuel',
};

export interface EnergyBrowseRouteParams {
  category: ProtocolBrowseCategory;
}

type RouteParams = RouteProp<
  { EnergyBrowse: EnergyBrowseRouteParams },
  'EnergyBrowse'
>;

type NavigationProp = NativeStackNavigationProp<{
  PracticeRun: { protocolId: string; stateBefore: null };
}>;

export function EnergyBrowseListScreen() {
  const route = useRoute<RouteParams>();
  const navigation = useNavigation<NavigationProp>();
  const { category } = route.params;

  useLayoutEffect(() => {
    navigation.setOptions({ title: CATEGORY_LABEL[category] });
  }, [navigation, category]);

  // Catalog filtered to this category, shortest-first then stable by id.
  const protocols = useMemo<Protocol[]>(
    () =>
      getAllProtocols()
        .filter((p) => p.browseCategory === category)
        .sort((a, b) => a.timeWindow - b.timeWindow || a.id.localeCompare(b.id)),
    [category]
  );

  return (
    <View style={styles.container} testID={`energy-browse-${category}`}>
      <FlatList
        data={protocols}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => (
          <ProtocolListItem
            protocol={item}
            testIDPrefix={TEST_ID_PREFIX}
            onPress={() =>
              // True browse pick: no pre-protocol state was captured.
              navigation.navigate(ROUTES.PracticeRun, {
                protocolId: item.id,
                stateBefore: null,
              })
            }
          />
        )}
        contentContainerStyle={styles.listContent}
        testID={`energy-browse-list-${category}`}
      />
    </View>
  );
}

// Only the page-level styles remain here. The card styles moved with the row.
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.default,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  listContent: {
    paddingBottom: Spacing.xl,
  },
});
