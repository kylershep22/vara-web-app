/**
 * The day's single action, on Home. The primary element of the consolidated
 * Today surface.
 *
 * Presentation only: every value is a prop, and the read path plus the
 * completion write live in useTodayCard. Reuses TODAY_COPY from the weekly
 * screens rather than restating strings, so the two Today surfaces cannot drift
 * apart in wording while both exist.
 *
 * Spec 9 constrains what may appear here: no streak, badge, point, leaderboard,
 * percentage, grade, second CTA, or anything red. The completion control is the
 * ONE action; the week summary and floor are context, not competing CTAs.
 *
 * THE END DATE IS GATED ON A REAL STORED BOUNDARY, deliberately. A cycle written
 * before boundaries were stored has no `weekEnd`, and `resolveWeekEnd` falls
 * back to `weekStart + 6` — which lands on whatever weekday that user happened
 * to open on, a day they never chose and would not recognise. Telling them their
 * week "runs through Tuesday" because of an implementation fallback is worse
 * than telling them nothing, so those cycles get no clause at all. The gate is
 * on `cycle.weekEnd`; the VALUE still goes through resolveWeekEnd, so display
 * and the entry guard can never read the boundary differently.
 */
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Check } from 'lucide-react-native';

import { Colors, Layout, Spacing, Typography } from '../../constants';
import type { ResolvedProtocolVariant } from '../../protocolEngine';
import { OUTCOME_LABELS } from '../../screens/weekly/copy';
import { CAPACITY_LABELS } from '../../constants/capacityCopy';
import { TODAY_COPY } from './dailyPicker.copy';
import type { WeeklyCycle } from '../../types/models';
import { resolveWeekEnd } from '../../utils/weekStart';
import { weekdayNameForIso } from '../../utils/weekdayLabels';
import { CardHeading } from './CardHeading';

const MIN_TOUCH_TARGET = 48;
const CHECK_SIZE = 22;

// TODAY_COPY has no completion strings because the weekly Today screen has no
// completion control yet (it is listed there as deliberately absent).
//
// `markDone` is APPROVED COPY from guidelines §1.5 and carries no marker. The
// two below are still placeholders. `done` is deliberately NOT written yet:
// §1.5 supplies acknowledgments at two effort tiers plus five extensions, and
// this card holds a single static string, so honouring it needs a component
// change rather than a string swap. Tracked, not silently collapsed to one line.
const COMPLETION_COPY = {
  markDone: 'Mark it done',
  // COPY: draft, not from guidelines doc - pending Jen
  done: 'Done today',
  // COPY: draft, not from guidelines doc - pending Jen
  saveFailed: 'That did not save. Try again.',
} as const;

export interface TodayHeroCardProps {
  /**
   * The week this day sits inside, read ONLY for the summary line below the
   * action.
   *
   * OPTIONAL SINCE JOURNEY SLICE 2. Under JOURNEY_IA the day is sourced from a
   * PhaseContext and there may be no live week at all, so the summary line has
   * nothing to name and is omitted rather than filled with a stale week. The
   * action, the completion control and the floor do not depend on it and are
   * unchanged in both states.
   */
  cycle?: WeeklyCycle | null;
  protocol: ResolvedProtocolVariant;
  /** Rendered only when present; the hook reads it only on slammed weeks. */
  floorCommitment: string | null;
  completed: boolean;
  saving: boolean;
  saveFailed: boolean;
  onMarkDone: () => void;
}

export const TodayHeroCard: React.FC<TodayHeroCardProps> = ({
  cycle,
  protocol,
  floorCommitment,
  completed,
  saving,
  saveFailed,
  onMarkDone,
}) => (
  <View style={styles.card} testID="home-today-hero">
    <CardHeading icon="white-balance-sunny" title={TODAY_COPY.actionHeading} />

    <Text style={styles.dailyAction} testID="home-today-action">
      {protocol.dailyAction}
    </Text>

    {/* Week-1 quick win (spec 6.3): a MANDATORY same-session practice, read
        from quickWinActive and never from supportingPracticeIds, which means
        optional extras. */}
    {protocol.quickWinActive && (
      <View style={styles.quickWin} testID="home-today-quickwin">
        <Text style={styles.quickWinHeading}>{TODAY_COPY.quickWinHeading}</Text>
        <Text style={styles.quickWinBody}>{TODAY_COPY.quickWinPractice}</Text>
      </View>
    )}

    {/* The one action. Forward-only: once done there is nothing to un-tap, so
        the control becomes a state rather than staying a button. */}
    {completed ? (
      <View style={styles.doneRow} testID="home-today-done">
        <View style={styles.doneCheck}>
          <Check size={14} strokeWidth={2.5} color={Colors.white} />
        </View>
        <Text style={styles.doneLabel}>{COMPLETION_COPY.done}</Text>
      </View>
    ) : (
      <TouchableOpacity
        style={[styles.cta, saving && styles.ctaDisabled]}
        onPress={onMarkDone}
        disabled={saving}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityState={{ disabled: saving }}
        accessibilityLabel={COMPLETION_COPY.markDone}
        testID="home-today-complete"
      >
        <Text style={styles.ctaLabel}>{COMPLETION_COPY.markDone}</Text>
      </TouchableOpacity>
    )}

    {saveFailed && (
      <Text style={styles.error} testID="home-today-error">
        {COMPLETION_COPY.saveFailed}
      </Text>
    )}

    {/* Context below the action: what this week is, and when it runs to. Never
        a second CTA.

        The boundary clause is APPENDED to this existing line rather than given
        its own element: the card is a doorway, and a date deserves no more
        weight than the outcome/capacity pair it qualifies.

        THE TIER COMES OFF THE PROTOCOL, not off the cycle (roadmap 3b-i).
        Capacity is a daily read now, so the cycle's own tier is no longer what
        the day was derived at and rendering it would state a tier the action
        below does not match. `selectProtocol` stamps the capacity it resolved
        onto the protocol, so reading it back from there makes the label and the
        action the same fact by construction rather than by agreement. */}
    {!!cycle && (
      <Text style={styles.weekSummary} testID="home-today-summary">
        {OUTCOME_LABELS[cycle.outcome]} / {CAPACITY_LABELS[protocol.capacity]}
        {!!cycle.weekEnd &&
          ` · ${TODAY_COPY.runsThrough.replace('{day}', weekdayNameForIso(resolveWeekEnd(cycle.weekStart, cycle.weekEnd)))}`}
      </Text>
    )}
    <Text style={styles.protocolName}>{protocol.name}</Text>

    {/* Floor, on slammed weeks only. The user's own words, never rendered back
        as a target or a score. */}
    {!!floorCommitment && (
      <View style={styles.floor} testID="home-today-floor">
        <Text style={styles.floorHeading}>{TODAY_COPY.floorHeading}</Text>
        <Text style={styles.floorBody}>{floorCommitment}</Text>
      </View>
    )}
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing.base,
    marginBottom: Spacing.base,
  },
  dailyAction: {
    fontSize: Typography.fontSize.lg,
    color: Colors.softCharcoal,
    lineHeight: Typography.fontSize.lg * Typography.lineHeight.normal,
    marginBottom: Spacing.base,
  },
  quickWin: {
    borderRadius: Layout.borderRadius.md,
    backgroundColor: Colors.dewSageLight,
    padding: Spacing.md,
    marginBottom: Spacing.base,
  },
  quickWinHeading: {
    fontSize: Typography.fontSize.sm,
    color: Colors.mutedSageGray,
    marginBottom: Spacing.xs,
  },
  quickWinBody: {
    fontSize: Typography.fontSize.sm,
    color: Colors.softCharcoal,
    lineHeight: Typography.fontSize.sm * Typography.lineHeight.normal,
  },
  cta: {
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: Layout.borderRadius.lg,
    backgroundColor: Colors.evergreenTeal,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
  },
  ctaDisabled: { opacity: 0.4 },
  ctaLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.white,
  },
  doneRow: {
    minHeight: MIN_TOUCH_TARGET,
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
  error: {
    marginTop: Spacing.sm,
    // Soft coral, the brand's only error colour. Never red.
    color: Colors.softCoral,
    fontSize: Typography.fontSize.sm,
  },
  weekSummary: {
    marginTop: Spacing.base,
    fontSize: Typography.fontSize.sm,
    color: Colors.mutedSageGray,
  },
  protocolName: {
    marginTop: 2,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.softCharcoal,
  },
  floor: {
    marginTop: Spacing.base,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  floorHeading: {
    fontSize: Typography.fontSize.sm,
    color: Colors.mutedSageGray,
    marginBottom: Spacing.xs,
  },
  floorBody: {
    fontSize: Typography.fontSize.base,
    color: Colors.softCharcoal,
    lineHeight: Typography.fontSize.base * Typography.lineHeight.normal,
  },
});
