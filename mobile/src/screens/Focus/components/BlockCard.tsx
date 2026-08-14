/**
 * One block on the day view (TB-1b mockup A2 card, extended in TB-1c).
 *
 * TAPPABLE AS OF TB-1c, and this is a deliberate departure from the mockup.
 * Its annotation says cards are "informational, not tappable-plus-buttoned" —
 * what that ruled out was a card carrying its own buttons, which this still
 * does not. The whole card is one target that opens the edit sheet, so the
 * screen keeps exactly one primary action.
 *
 * SWIPE IS GONE. TB-1b revealed a Remove pane behind the card, inherited from
 * SwipeableGoalCard. It was undiscoverable, the mockup drew no affordance for
 * it, and it was flagged on two walks. The edit sheet owns removal now, so the
 * gesture, its pane, and this file's reanimated / gesture-handler dependency
 * are deleted rather than left as a second way to do the same thing.
 *
 * NO DONE STATE AND NO FADE. A past block is marked by one caption and nothing
 * else: full opacity, no checkmark, no completed styling. The opacity fade was
 * misread as a rendering glitch in two consecutive device walks, including by
 * the person who specced it, so it is gone rather than tuned. DayBlock has no
 * `completed` field to render even if we wanted one.
 */
import React, { useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Colors, Layout, Spacing, Typography } from '../../../constants';
import { Tag } from '../../../components/shared/Tag';
import type { DayBlock } from '../../../types/models';
import {
  DEMAND_LABELS,
  EARLIER_TODAY,
  PROTECTED_CHIP,
  formatTimeRange,
} from '../blocksCopy';

export interface BlockCardProps {
  block: DayBlock;
  /** Injected so "is this in the past" is deterministic under test. */
  now: Date;
  onEdit: (block: DayBlock) => void;
}

export const BlockCard: React.FC<BlockCardProps> = ({ block, now, onEdit }) => {
  const startAt = block.startAt.toDate();
  const endsAt = new Date(startAt.getTime() + block.durationMinutes * 60_000);
  const isPast = endsAt < now;

  const handlePress = useCallback(() => onEdit(block), [onEdit, block]);

  const timeRange = formatTimeRange(startAt, block.durationMinutes);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      activeOpacity={0.8}
      accessibilityRole="button"
      // One announcement carrying everything the card shows, so a screen reader
      // does not have to walk four separate nodes to learn what it opens.
      accessibilityLabel={[
        block.title,
        timeRange,
        DEMAND_LABELS[block.demand],
        block.isProtected ? PROTECTED_CHIP : null,
        isPast ? EARLIER_TODAY : null,
      ]
        .filter(Boolean)
        .join('. ')}
      testID={`block-card-${block.id}`}
    >
      <Text style={styles.title}>{block.title}</Text>
      <Text style={styles.meta}>{timeRange}</Text>
      {/* The whole past treatment. No fade, no strikethrough, no tick. */}
      {isPast && (
        <Text style={styles.pastCaption} testID={`block-past-${block.id}`}>
          {EARLIER_TODAY}
        </Text>
      )}
      <View style={styles.chipRow}>
        <Tag
          label={DEMAND_LABELS[block.demand]}
          variant="sage"
          testID={`block-demand-${block.id}`}
        />
        {block.isProtected && (
          <Tag
            label={PROTECTED_CHIP}
            variant="sage"
            style={styles.protectedChip}
            testID={`block-protected-${block.id}`}
          />
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    borderColor: Colors.divider,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    lineHeight: 22,
    color: Colors.softCharcoal,
  },
  meta: {
    fontSize: Typography.fontSize.sm,
    color: Colors.mutedSageGray,
    marginTop: 4,
  },
  // Caption type, Muted Sage Gray. The card is at full opacity, so this line is
  // the only thing marking the block as past.
  pastCaption: {
    fontSize: Typography.fontSize.xs,
    color: Colors.mutedSageGray,
    marginTop: 2,
  },
  chipRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  // The mockup's .chip.protected: outlined rather than filled, so it reads as
  // a qualifier on the demand chip beside it rather than a second tag.
  protectedChip: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.silverSage,
  },
});

export default BlockCard;
