// ComingSoonCard — the calm, honest placeholder for a tool that is planned but
// not built yet.
//
// Deliberately INERT: no onPress, no chevron, no navigation. A card that looks
// tappable and does nothing is worse than one that plainly says it is not ready,
// so this carries no affordance at all.
//
// Visually a NORMAL card: same surface, radius, padding and border as the live
// cards beside it, with the title and body at full emphasis. An earlier mist
// fill sat flush with the mist page wash and read as faint rather than as calm.
// The only thing marking it as not-yet-built is a "Coming soon" pill in the
// bottom-right corner.
//
// Quiet comes from the pill being the sole marker, not from washing the card
// out. No countdown, no "new", no anticipation copy. Nothing here builds a wait.
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
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.body}>{body}</Text>
    {/* Bottom-right corner marker. The shared Tag in its teal variant is
        already Dew Sage on evergreen (5.6:1, clears AA), so the pill is
        design-system stock, not bespoke. No onPress, so Tag renders a plain
        View and stays inert. */}
    <View style={styles.pillRow}>
      <Tag label="Coming soon" variant="teal" />
    </View>
  </View>
);

const styles = StyleSheet.create({
  // Deliberately identical to the Focus hub's secondary (rhythms) card, which is
  // this card's peer tier: same surface, radius, padding and hairline border,
  // and like it no shadow. Only the hero primary card carries elevation, so a
  // shadow here would make a not-yet-built tool louder than a live one.
  card: {
    padding: Spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.divider,
    backgroundColor: Colors.surface,
  },
  title: {
    // Full emphasis, exactly as a live card's label: same size, weight, colour.
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
    marginBottom: 2,
  },
  body: {
    ...TextStyles.bodySmall,
    color: Colors.mutedSageGray,
  },
  pillRow: {
    flexDirection: 'row',
    // Corner marker: pushed to the trailing edge, below the body.
    justifyContent: 'flex-end',
    marginTop: Spacing.md,
  },
});

export default ComingSoonCard;
