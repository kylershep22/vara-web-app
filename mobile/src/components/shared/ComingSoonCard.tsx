// ComingSoonCard — the calm, honest placeholder for a tool that is planned but
// not built yet.
//
// Deliberately INERT: no onPress, no chevron, no navigation. A card that looks
// tappable and does nothing is worse than one that plainly says it is not ready,
// so this carries no affordance at all.
//
// The treatment quiets the card rather than decorating it: a Mist fill (flush
// with the page background) and a hairline divider border, with NO shadow, so it
// sits visually behind the live cards on the same screen instead of competing
// with them. The one accent is a small Dew Sage "Coming soon" tag.
//
// No countdown, no "new", no anticipation copy. Nothing here builds a wait.
//
// Existing coming-soon treatments were considered and not reused:
//   - MasterclassScreen's local comingSoonCard styles are unreferenced dead
//     style entries, and use raw hex plus a dashed centred border.
//   - MasterclassDetailScreen's "Available Soon" is an inline-styled disabled
//     CTA with a lock icon, not a card.
//   - FeatureGate is tappable and runs an unlock countdown / "Explore Features"
//     CTA, which is exactly the anticipation mechanic this card avoids.

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing, TextStyles, Typography } from '../../constants';
import { Tag } from './Tag';

export interface ComingSoonCardProps {
  /** Tool name, e.g. "Time blocking". */
  title: string;
  /** One calm sentence on what the tool will do. */
  body: string;
  testID?: string;
}

export const ComingSoonCard: React.FC<ComingSoonCardProps> = ({
  title,
  body,
  testID,
}) => (
  // Grouped into a single accessible node with role "text": screen readers
  // announce it once, as static content, and it never lands in the actionable
  // order the way a role="button" element would. It stays readable rather than
  // hidden outright, so a screen-reader user still learns the tool is planned.
  <View
    style={styles.card}
    accessible
    accessibilityRole="text"
    accessibilityLabel={`${title}. ${body} Coming soon.`}
    testID={testID}
  >
    <View style={styles.headerRow}>
      <Text style={styles.title}>{title}</Text>
      {/* The shared Tag in its teal variant is already Dew Sage on evergreen
          (5.6:1, clears AA), so the tag is design-system stock, not bespoke.
          No onPress, so Tag renders a plain View and stays inert. */}
      <Tag label="Coming soon" variant="teal" />
    </View>
    <Text style={styles.body}>{body}</Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    padding: Spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.divider,
    // Mist, not surface white: the card sits flush with the page so it reads as
    // quieter than the live cards above it. No shadow, for the same reason.
    backgroundColor: Colors.mistWhite,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  title: {
    // Matches the live rows' label size so the hub keeps one rhythm; the mist
    // fill and missing shadow do the quieting, not a smaller title.
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
    // Let a long title wrap rather than crush the tag.
    flexShrink: 1,
    marginRight: Spacing.sm,
  },
  body: {
    ...TextStyles.bodySmall,
    color: Colors.mutedSageGray,
  },
});

export default ComingSoonCard;
