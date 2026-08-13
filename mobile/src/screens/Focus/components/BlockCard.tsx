/**
 * One block on the day view (TB-1b, mockup A2 card).
 *
 * INFORMATIONAL, NOT TAPPABLE. The mockup's annotation is explicit that block
 * cards are "informational, not tappable-plus-buttoned" — the screen has one
 * primary action and it is Add. The card carries no onPress and no chevron.
 *
 * NO DONE STATE. A past block fades and nothing else: no checkmark, no tick, no
 * completed styling. The mockup's open question leans exactly this way ("A block
 * is an appointment, not a habit") and DayBlock has no `completed` field to
 * render even if we wanted one.
 *
 * REMOVAL IS THE ONLY EDIT. There is no update path at MVP, so a swipe reveals
 * a single Remove action. OPEN FOR JEN: swipe-to-reveal is inherited from
 * SwipeableGoalCard because it is the app's existing destructive-action gesture,
 * but it is undiscoverable on its own and the mockup draws no affordance for it.
 * A long-press menu or an explicit overflow control are both live alternatives.
 *
 * Reduce Motion is respected the same way SwipeableGoalCard does it: the reveal
 * snaps instead of springing, and nothing that matters is conveyed by motion.
 */
import React, { useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Colors, Layout, Spacing, Typography } from '../../../constants';
import { Tag } from '../../../components/shared/Tag';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import type { DayBlock } from '../../../types/models';
import {
  DEMAND_LABELS,
  PROTECTED_CHIP,
  REMOVE_ACTION,
  REMOVE_A11Y_HINT,
  formatTimeRange,
} from '../blocksCopy';

const ACTION_WIDTH = 88;
const REVEAL_THRESHOLD = ACTION_WIDTH / 2;
/** Past blocks fade to this. Legible, clearly secondary, never struck through. */
const PAST_OPACITY = 0.45;

export interface BlockCardProps {
  block: DayBlock;
  /** Injected so "is this in the past" is deterministic under test. */
  now: Date;
  onRemove: (blockId: string) => void;
}

export const BlockCard: React.FC<BlockCardProps> = ({ block, now, onRemove }) => {
  const reduceMotion = useReducedMotion();
  const translateX = useSharedValue(0);

  const startAt = block.startAt.toDate();
  const endsAt = new Date(startAt.getTime() + block.durationMinutes * 60_000);
  const isPast = endsAt < now;

  const settle = useCallback(
    (to: number) => {
      if (reduceMotion) {
        translateX.value = to;
      } else {
        translateX.value = withTiming(to, { duration: 180 });
      }
    },
    [reduceMotion, translateX]
  );

  const handleRemove = useCallback(() => {
    onRemove(block.id);
  }, [onRemove, block.id]);

  const pan = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .onUpdate((event) => {
      // Left swipe only, and never further than the action it reveals.
      translateX.value = Math.min(0, Math.max(-ACTION_WIDTH, event.translationX));
    })
    .onEnd(() => {
      const shouldReveal = translateX.value < -REVEAL_THRESHOLD;
      const to = shouldReveal ? -ACTION_WIDTH : 0;
      if (reduceMotion) {
        translateX.value = to;
      } else {
        translateX.value = withTiming(to, { duration: 180 });
      }
      runOnJS(settle)(to);
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={styles.wrapper}>
      {/* The action sits behind the card and is revealed by sliding it. */}
      <View style={styles.actionLayer} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.action}
          onPress={handleRemove}
          accessibilityRole="button"
          accessibilityLabel={REMOVE_ACTION}
          accessibilityHint={REMOVE_A11Y_HINT}
          testID={`block-remove-${block.id}`}
        >
          <Text style={styles.actionLabel}>{REMOVE_ACTION}</Text>
        </TouchableOpacity>
      </View>

      <GestureDetector gesture={pan}>
        <Animated.View
          style={[styles.card, isPast && styles.cardPast, cardStyle]}
          testID={`block-card-${block.id}`}
        >
          <Text style={styles.title}>{block.title}</Text>
          <Text style={styles.meta}>
            {formatTimeRange(startAt, block.durationMinutes)}
          </Text>
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
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    marginBottom: Spacing.sm,
  },
  actionLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  action: {
    width: ACTION_WIDTH,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Layout.borderRadius.md,
    backgroundColor: Colors.softCoral,
  },
  actionLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.white,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    borderColor: Colors.divider,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  // Fade only. No strikethrough, no checkmark, no "done" treatment.
  cardPast: {
    opacity: PAST_OPACITY,
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
