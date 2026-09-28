/**
 * The day's completion state, shared by the two surfaces that can show it: the
 * hero card on Home and the protocol sheet it opens (slice 9.1b).
 *
 * EXTRACTED FROM TodayHeroCard, NOT RESTATED. The strings, the quieting rule
 * and the done row used to be module-private there. A sheet that needed them
 * could only have copied them, and a second set of completion strings is a
 * divergence the copy sentinel cannot see: each copy would carry its own
 * sentinel, and a sign-off on one would leave the other standing unnoticed.
 * One definition here means one sign-off covers both surfaces.
 *
 * THE CHECK IS MaterialCommunityIcons, NOT THE LUCIDE `Check` IT WAS. A new
 * file may not import a legacy icon set (legacyIcons.test.ts: the allowlist
 * never grows), so moving the done row out of TodayHeroCard moved it onto the
 * house set. The glyph is the same size, weight class and colour; its exact
 * outline differs slightly, and that is the one visible change the extraction
 * makes to the card.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Text from '../shared/Text';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

import { Colors, SizeTokens, Spacing, Typography } from '../../constants';
import type { ResolvedProtocolVariant } from '../../protocolEngine';

/**
 * Consistent days after which the done-state stops using the variant's own
 * acknowledgment and falls back to the plain line.
 *
 * FIVE, and it is a volume control rather than a milestone. Nothing marks the
 * crossing and nothing is shown for reaching it.
 *
 * RECORDED, NOT FIXED (slice 7m): this rule is a NO-OP for twelve of the
 * twenty-one authored protocols. Recover's nine and Refocus's three carry no
 * `acknowledgment`, so both branches of the conditional below resolve to
 * COMPLETION_COPY.done and there is nothing to quiet. Jen declined twelve
 * per-protocol acknowledgments on 2026-09-12, so that is now the INTENDED
 * state rather than a gap - but it stays written down rather than quietly
 * absorbed, because "the rule never engages here" is still true and a later
 * reader should not rediscover it. 7m changed the fallback string and moved
 * this neither way.
 */
export const ACKNOWLEDGMENT_QUIET_AFTER_DAYS = 5;
const CHECK_SIZE = 22;

// TODAY_COPY has no completion strings because the weekly Today screen has no
// completion control yet (it is listed there as deliberately absent).
//
// `markDone` is APPROVED COPY from guidelines §1.5 and carries no marker.
//
// `done` CARRIES NO MARKER EITHER AS OF SLICE 7m, and its warrant is a
// different kind from markDone's. The string is NOT printed in §1.5. Jen signed
// off on this exact wording on 2026-09-12 (roadmap row 7m) and she owns the
// guidelines doc, so the authority here is the owner's sign-off rather than a
// citation to a line in the document. Those are not the same warrant and a
// later reader should not be able to mistake one for the other.
//
// WHY §1.5's TWO EFFORT TIERS DO NOT MAKE THIS WRONG. §1.5 supplies "Nice. You
// made the time." and "Solid work. You stayed with it." plus five extensions.
// Those are PER-EFFORT acknowledgments and they belong to the OTHER branch of
// the done-state below: the per-variant `protocol.acknowledgment`, which is
// Remove's nine and which 7m leaves untouched. This slot is the branch where no
// tier is determinable. It serves the twelve Recover and Refocus variants that
// carry no acknowledgment at either effort size, and it serves the post-quieting
// state for all twenty-one, where the entire intent is to STOP acknowledging at
// the tier's volume. A tiered line here would be the scoreboard the quieting
// rule exists to prevent. One flat line is the right shape for this slot, not a
// collapse of §1.5 into one string.
//
// JEN DECLINED THE ALTERNATIVE, which was twelve per-protocol acknowledgments
// matching Remove's shape: too much surface for too little value, and
// protocol-specific praise risks over-celebrating routine completion.
//
// `saveFailed` is still a placeholder.
export const COMPLETION_COPY = {
  markDone: 'Mark it done',
  done: 'Done for today.',
  // COPY: draft, not from guidelines doc - pending Jen
  saveFailed: 'That did not save. Try again.',
} as const;

/**
 * THE ACKNOWLEDGMENT QUIETS AS CONSISTENCY BUILDS, and never says so.
 *
 * Early on the line matches what the user actually did, which is the whole
 * point of it being per variant. Past the threshold it drops to the plain line:
 * praise that keeps arriving at the same volume stops reading as
 * acknowledgment and starts reading as a scoreboard.
 *
 * No number is rendered in either state, and the transition is deliberately
 * unannounced. A user must never be able to tell they crossed a threshold,
 * because that is a counter by another name.
 */
export function acknowledgmentFor(
  protocol: Pick<ResolvedProtocolVariant, 'acknowledgment'>,
  consistentDays: number
): string {
  return consistentDays >= ACKNOWLEDGMENT_QUIET_AFTER_DAYS
    ? COMPLETION_COPY.done
    : (protocol.acknowledgment ?? COMPLETION_COPY.done);
}

/** The done state: a quiet check and the acknowledgment line. Never a button. */
export const CompletionDoneRow: React.FC<{
  protocol: Pick<ResolvedProtocolVariant, 'acknowledgment'>;
  consistentDays: number;
  testID: string;
}> = ({ protocol, consistentDays, testID }) => (
  <View style={styles.doneRow} testID={testID}>
    <View style={styles.doneCheck}>
      <Icon name="check-bold" size={14} color={Colors.white} />
    </View>
    <Text style={styles.doneLabel}>{acknowledgmentFor(protocol, consistentDays)}</Text>
  </View>
);

const styles = StyleSheet.create({
  doneRow: {
    minHeight: SizeTokens.touchTargetMin,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  doneCheck: {
    width: CHECK_SIZE,
    height: CHECK_SIZE,
    borderRadius: CHECK_SIZE / 2,
    backgroundColor: Colors.evergreenTeal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.evergreenTeal,
  },
});
