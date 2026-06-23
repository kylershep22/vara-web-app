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
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Colors, Spacing, Typography } from '../../constants';
import { getAllProtocols } from '../../constants/brainStateProtocols';
import { formatProtocolDuration } from '../../utils/protocolDisplay';
import { ROUTES } from '../../navigation/routes';
import type { Protocol, ProtocolBrowseCategory } from '../../types/models';

const MIN_TOUCH_TARGET = 48;

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

interface ProtocolListItemProps {
  protocol: Protocol;
  onPress: () => void;
}

function ProtocolListItem({ protocol, onPress }: ProtocolListItemProps) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Start ${protocol.name}, ${formatProtocolDuration(protocol)}`}
      testID={`energy-browse-card-${protocol.id}`}
    >
      <View style={styles.cardHeaderRow}>
        <Text style={styles.cardName}>{protocol.name}</Text>
        <Text style={styles.cardDuration}>{formatProtocolDuration(protocol)}</Text>
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
  listContent: {
    paddingBottom: Spacing.xl,
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
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  cardName: {
    flex: 1,
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
    marginRight: Spacing.sm,
  },
  cardDuration: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.evergreenTeal,
  },
  cardDescription: {
    fontSize: Typography.fontSize.base,
    color: Colors.mutedSageGray,
    lineHeight: 22,
  },
});
