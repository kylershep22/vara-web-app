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
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Text from '../shared/Text';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

import { Colors, Layout, SizeTokens, Spacing, Typography } from '../../constants';
import type { CapacityTier, ResolvedProtocolVariant } from '../../protocolEngine';
import { OUTCOME_LABELS } from '../../screens/weekly/copy';
import { DESTINATION_SUMMARY_LABELS } from '../../constants/journeyCopy';
import { CAPACITY_LABELS } from '../../constants/capacityCopy';
import { TODAY_COPY } from './dailyPicker.copy';
import type { DestinationKey, WeeklyCycle } from '../../types/models';
import { resolveWeekEnd } from '../../utils/weekStart';
import { weekdayNameForIso } from '../../utils/weekdayLabels';
import { CardHeading } from './CardHeading';
import { COMPLETION_COPY, CompletionDoneRow } from './TodayCompletion';
import { PROTOCOL_SHEET_COPY } from './protocolSheet.copy';

// The completion strings, the quieting rule and the done row live in
// TodayCompletion since slice 9.1b, shared with the protocol sheet. Their full
// provenance notes moved with them.

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
  /**
   * The journey's destination, for the summary line when the cycle has no
   * outcome (slice 4b).
   *
   * THE TWO ARE NOT ALTERNATIVES THAT MEAN THE SAME THING. `cycle.outcome` is
   * what a legacy week was opened on; this is where the journey is going. A
   * pre-4b cycle has an outcome and is labelled from it, unchanged. A cycle
   * created under the journey model has none, and this is what the line names
   * instead. When neither is present the line is omitted rather than guessed.
   */
  destination?: DestinationKey | null;
  protocol: ResolvedProtocolVariant;
  /**
   * The tier the DAY was resolved at, for the summary line (slice 7c).
   *
   * NOT `protocol.capacity`, AND THE DIFFERENCE IS THE WHOLE REASON THIS PROP
   * EXISTS. See the note on the summary line below.
   *
   * Optional so the legacy and empty paths need not supply it; the line falls
   * back to the variant's own tier, which is what it read before this slice and
   * is correct on every path that cannot produce a mismatch.
   */
  dayCapacity?: CapacityTier | null;
  /** Rendered only when present; the hook reads it only on slammed weeks. */
  floorCommitment: string | null;
  completed: boolean;
  /**
   * Consistent days in the phase so far, for the QUIETING rule (slice 3c-i).
   *
   * NEVER RENDERED. It decides whether the done-state shows the variant's own
   * acknowledgment or the plain line, and nothing else. No count reaches the
   * screen, which is why this is a number the card consumes rather than a
   * string the card is handed.
   */
  consistentDays?: number;
  saving: boolean;
  saveFailed: boolean;
  /**
   * The card's data belongs to a day that has ended (rollover safety).
   *
   * SUPPRESSES BOTH BRANCHES OF THE COMPLETION CONTROL, not just the button.
   * A stale load carries the previous day's `completed` as well as its
   * `protocol`, so a card that trusted it would show a check and an
   * acknowledgment for a day nobody has completed.
   *
   * REUSES THE `saving` TREATMENT rather than introducing a second one: there
   * is no presentation in this app bound to the hook's `loading` field, and the
   * dimmed, disabled control is the existing idiom for "not actionable right
   * now". `styles.cta` keeps its `minHeight`, so nothing reflows.
   *
   * WHAT IT DOES NOT COVER, recorded so it is not mistaken for an oversight:
   * `protocol.dailyAction` above still renders the PREVIOUS day's text while
   * this is true. Replacing the card body would mean a skeleton this component
   * does not have, and building one was explicitly out of scope for the slice
   * that added this flag.
   *
   * OPTIONAL so every existing call site and fixture is unaffected.
   */
  staleDate?: boolean;
  /**
   * The card holds a variant the current journey would no longer serve
   * (STALE-SOURCE-COMPLETION): a phase advance, a capture or an adjustment has
   * reached Home and the load resolved for it has not committed.
   *
   * GATES THE COMPLETION CONTROL AND NOTHING ELSE. Same dimmed, disabled
   * treatment as `staleDate`, deliberately NOT the done-branch suppression.
   * `staleDate` hides the done state because a date change makes `completed`
   * untrue. A variant change does not: completion is keyed to the date alone,
   * so a day done before an advance is still done after it, and hiding the
   * check would show a finished day as a dimmed "Mark done".
   *
   * `protocol.dailyAction` still renders the previous variant's text while this
   * is true, for the reason recorded on `staleDate` above.
   *
   * OPTIONAL so every existing call site and fixture is unaffected.
   */
  variantStale?: boolean;
  onMarkDone: () => void;
  /**
   * Opens the protocol sheet (slice 9.1b). When present, the card's CONTENT
   * AREA, the heading and the day's action, becomes the entry point, with a
   * quiet chevron as its disclosure affordance. When absent the card renders
   * exactly as it did before, which is every non-Remove protocol: row 9 is
   * Remove-only by Kyle's ruling of 2026-09-19.
   *
   * NOT A SECOND CTA. The completion control below stays the one action; this
   * is a way into more detail about the same action, styled as content rather
   * than as a button.
   *
   * THE ENTRY IS DISABLED WHILE EITHER FLAG IS TRUE, by the same `disabled`
   * idiom the completion control uses. A sheet pins what it opens on, and only
   * a currently valid protocol may be pinned: opening during the window would
   * snapshot a protocol the hook already knows is transitional. DashboardScreen
   * refuses the open on the same flags, so a tap already dispatched still
   * cannot pin a stale protocol.
   */
  onOpenDetail?: () => void;
}

export const TodayHeroCard: React.FC<TodayHeroCardProps> = ({
  cycle,
  destination,
  protocol,
  dayCapacity,
  floorCommitment,
  completed,
  consistentDays = 0,
  saving,
  saveFailed,
  staleDate = false,
  variantStale = false,
  onMarkDone,
  onOpenDetail,
}) => {
  const content = (
    <>
      <CardHeading icon="white-balance-sunny" title={TODAY_COPY.actionHeading} />

      <Text style={styles.dailyAction} testID="home-today-action">
        {protocol.dailyAction}
      </Text>
    </>
  );
  const entryDisabled = staleDate || variantStale;

  return (
    <View style={styles.card} testID="home-today-hero">
      {onOpenDetail ? (
        <TouchableOpacity
          style={styles.entry}
          onPress={onOpenDetail}
          disabled={entryDisabled}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityState={{ disabled: entryDisabled }}
          // What a sighted user reads in this area, in the order they read it.
          accessibilityLabel={`${TODAY_COPY.actionHeading} ${protocol.dailyAction}`}
          // The label names what is here; the hint names what a tap does.
          accessibilityHint={PROTOCOL_SHEET_COPY.entryHint}
          testID="home-today-open-detail"
        >
          <View style={styles.entryContent}>{content}</View>
          <View style={[styles.entryChevron, entryDisabled && styles.entryDisabled]}>
            <Icon name="chevron-right" size={20} color={Colors.mutedSageGray} />
          </View>
        </TouchableOpacity>
      ) : (
        content
      )}

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
        the control becomes a state rather than staying a button.

        `staleDate` SUPPRESSES THE DONE BRANCH TOO. Until the new day's load
        commits, `completed` is the PREVIOUS day's answer, so this branch would
        render a check and an acknowledgment for a day nobody has completed.
        Falling through to the disabled control shows a state that is merely
        not-yet-known, which is true, instead of one that is wrong.

        `variantStale` IS DELIBERATELY ABSENT FROM THIS CONDITION. It joins the
        control's disabled state below and nothing else; see its prop note. */}
      {completed && !staleDate ? (
        <CompletionDoneRow
          protocol={protocol}
          consistentDays={consistentDays}
          testID="home-today-done"
        />
      ) : (
        <TouchableOpacity
          style={[styles.cta, (saving || staleDate || variantStale) && styles.ctaDisabled]}
          onPress={onMarkDone}
          disabled={saving || staleDate || variantStale}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityState={{ disabled: saving || staleDate || variantStale }}
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

        THE TIER COMES OFF THE DAY'S OWN ANSWER, not off the cycle and, since
        slice 7c, not off the protocol either.

        WHAT THIS COMMENT USED TO SAY, AND WHY IT STOPPED BEING TRUE. It read:
        "`selectProtocol` stamps the capacity it resolved onto the protocol, so
        reading it back from there makes the label and the action the same fact
        by construction rather than by agreement." That held while the served
        variant always came out of the cell the user's own answer selected.
        Slice 7c's downward capacity search does not: when a user's recorded
        adjustment names a mechanism with no variant fitting their time at their
        stated tier, the engine serves a LOWER-tier variant of the same mechanism
        rather than crossing to a different one. Seven of the twenty-seven
        adjustment triples do exactly that, and on every one of them this line
        would have told a user who answered Normal that they had said Slammed.

        SO THE TWO FACTS ARE SEPARATED RATHER THAN RECONCILED. This line is a
        summary of the user's day and names what the USER said. The variant keeps
        naming the cell it was authored in, which is what routing needs. Neither
        gives way to the other, and `protocol.capacity` now has no reader in the
        app at all - it is a routing field, and this was its last render.

        The cycle's own tier stays wrong for the original 3b-i reason and is
        still not read: capacity is a daily answer, and the week's copy of it is
        not what the day was derived at. */}
      {/* THE FRAME LABEL, from whichever axis this account actually has.
        Slice 4b, and the branch order is the rule:

          1. `cycle.outcome`, for every pre-4b week. Reads OUTCOME_LABELS,
             keyed `focus | stress | routines | energy`. Byte-identical to
             what it rendered before, which is the point.
          2. `destination`, for a week created under the journey model. Reads
             DESTINATION_SUMMARY_LABELS, keyed `focus | calm | routines |
             energy`. A DIFFERENT UNION and a different map; neither is ever
             indexed with the other's key.
          3. Neither: the label and its separator are omitted and the line
             opens on the capacity. Not "Unknown", not a default outcome.
             Substituting a value here is the bug this slice removed from the
             rollover, and it would be no better on a render path. */}
      {!!cycle && (
        <Text style={styles.weekSummary} testID="home-today-summary">
          {cycle.outcome
            ? `${OUTCOME_LABELS[cycle.outcome]} / `
            : destination
              ? `${DESTINATION_SUMMARY_LABELS[destination]} / `
              : ''}
          {CAPACITY_LABELS[dayCapacity ?? protocol.capacity]}
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
};

const styles = StyleSheet.create({
  // The entry row: the content takes the width, the chevron sits at the right,
  // top-aligned with the heading so it reads as belonging to the whole area.
  entry: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  // The same dim as the disabled control, on the chevron ONLY: dimming the
  // day's action itself would make the text harder to read in the one frame a
  // user might be reading it, for a window that lasts a round trip.
  entryDisabled: { opacity: 0.4 },
  entryContent: { flex: 1 },
  entryChevron: { marginLeft: Spacing.sm, marginTop: 2 },
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
    minHeight: SizeTokens.touchTargetMin,
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
