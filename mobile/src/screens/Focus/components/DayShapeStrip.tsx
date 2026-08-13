/**
 * The day-shape strip (TB-1b, mockup A2).
 *
 * PRESENTATIONAL ONLY, AND THAT IS A HARD BOUNDARY. No touch handling, no
 * onPress, no gestures, no hour ticks. It shows where the day's blocks sit
 * against the user's rhythm windows and nothing else. If a future slice wants
 * to drag a block or tap a zone, that is a different component and a different
 * conversation: the whole point of the strip over an hour grid is that it makes
 * no claim about the rest of the day and offers nothing to fill in.
 *
 * All geometry comes from dayShape.ts, which is tested on its own. This file
 * only turns percentages into styles.
 *
 * ANIMATES NOTHING. There is no entrance transition and no layout animation, so
 * Reduce Motion has nothing to respect here.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Layout, Spacing, Typography } from '../../../constants';
import { DAY_SHAPE_ZONES, blockPill, rhythmBands } from '../dayShape';
import { STRIP_CAPTION } from '../blocksCopy';
import type { DayBlock } from '../../../types/models';

export interface DayShapeStripProps {
  blocks: DayBlock[];
  /** The user's stored rhythm windows, raw. May be empty. */
  windows: string[];
  testID?: string;
}

export const DayShapeStrip: React.FC<DayShapeStripProps> = ({
  blocks,
  windows,
  testID = 'day-shape-strip',
}) => {
  const bands = rhythmBands(windows);

  return (
    <View
      style={styles.card}
      testID={testID}
      // One node to screen readers. The strip repeats what the cards below
      // already say, so announcing each pill would be noise; the caption is
      // the part that carries meaning.
      accessible
      accessibilityRole="image"
      accessibilityLabel={bands.length > 0 ? STRIP_CAPTION : undefined}
    >
      <View style={styles.zoneLabels}>
        {DAY_SHAPE_ZONES.map((zone) => (
          <Text key={zone.key} style={styles.zoneLabel}>
            {zone.label}
          </Text>
        ))}
      </View>

      <View style={styles.track}>
        {/* Rhythm shading sits underneath everything. */}
        {bands.map((band) => (
          <View
            key={band.key}
            testID={`day-shape-band-${band.key}`}
            style={[
              styles.band,
              { left: `${band.leftPercent}%`, width: `${band.widthPercent}%` },
            ]}
          />
        ))}

        {/* Zone dividers: hairlines at the thirds, not hour ticks. */}
        {DAY_SHAPE_ZONES.slice(1).map((zone, index) => (
          <View
            key={zone.key}
            style={[styles.divider, { left: `${((index + 1) * 100) / 3}%` }]}
          />
        ))}

        {blocks.map((block) => {
          const pill = blockPill(block.startAt.toDate(), block.durationMinutes);
          // Null means the block falls outside 06:00 to 22:00. It stays in the
          // card list below; nothing is clamped onto the edge of the track.
          if (!pill) return null;
          return (
            <View
              key={block.id}
              testID={`day-shape-pill-${block.id}`}
              style={[
                styles.pill,
                { left: `${pill.leftPercent}%`, width: `${pill.widthPercent}%` },
              ]}
            />
          );
        })}
      </View>

      {/* The caption explains the shading, so it only earns its place when
          there is shading to explain. */}
      {bands.length > 0 && <Text style={styles.caption}>{STRIP_CAPTION}</Text>}
    </View>
  );
};

const TRACK_HEIGHT = 36;
const PILL_HEIGHT = 22;

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  zoneLabels: {
    flexDirection: 'row',
    marginBottom: Spacing.xs,
  },
  zoneLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10.5,
    fontWeight: Typography.fontWeight.medium,
    letterSpacing: 0.4,
    color: Colors.mutedSageGray,
  },
  track: {
    position: 'relative',
    height: TRACK_HEIGHT,
    backgroundColor: Colors.background.default,
    borderRadius: Layout.borderRadius.sm,
    overflow: 'hidden',
  },
  band: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: Colors.dewSageLight,
  },
  divider: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: Colors.divider,
  },
  pill: {
    position: 'absolute',
    top: (TRACK_HEIGHT - PILL_HEIGHT) / 2,
    height: PILL_HEIGHT,
    backgroundColor: Colors.evergreenTeal,
    borderRadius: Layout.borderRadius.sm,
  },
  caption: {
    fontSize: 11.5,
    lineHeight: 16,
    color: Colors.mutedSageGray,
    marginTop: Spacing.xs,
  },
});

export default DayShapeStrip;
