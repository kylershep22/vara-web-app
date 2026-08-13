// ProtocolListItem — one catalog practice as a calm, tappable list row.
//
// EXTRACTED from EnergyBrowseListScreen (IA step 4b-ii-a) as a PURE MOVE: same
// markup, same styles, same accessibility label, same behaviour. The only thing
// added is `testIDPrefix`, because the row now appears on two surfaces and each
// needs its own testIDs. Energy passes the prefix it always used, so its
// rendered output is byte-identical to before the move.
//
// The extraction was deferred by 4a with a note that it belonged to "a later
// pass with all four cards in place" (PracticesHubScreen.tsx). Stress Recovery
// is the second surface that needs this row, so the choice was extract once or
// copy it a second time. Extracting.
//
// Deliberately presentational: it takes a Protocol and an onPress and owns no
// navigation, no filtering and no data access. Both callers decide what "tap"
// means (today both launch PracticeRun as a true browse pick) and both do their
// own filtering, which is the difference between the two surfaces.

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Colors, Spacing, Typography } from '../../constants';
import { formatProtocolDuration } from '../../utils/protocolDisplay';
import type { Protocol } from '../../types/models';

const MIN_TOUCH_TARGET = 48;

export interface ProtocolListItemProps {
  protocol: Protocol;
  onPress: () => void;
  /**
   * Surface-scoped testID prefix; the row renders `${testIDPrefix}-${id}`.
   * Required rather than defaulted: a shared row on two surfaces should never
   * silently inherit the other surface's name in a failure message.
   */
  testIDPrefix: string;
}

export function ProtocolListItem({
  protocol,
  onPress,
  testIDPrefix,
}: ProtocolListItemProps) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Start ${protocol.name}, ${formatProtocolDuration(protocol)}`}
      testID={`${testIDPrefix}-${protocol.id}`}
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

// Lifted verbatim from EnergyBrowseListScreen's stylesheet. Unchanged values:
// this is a move, not a redesign, and Energy must render identically.
const styles = StyleSheet.create({
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

export default ProtocolListItem;
