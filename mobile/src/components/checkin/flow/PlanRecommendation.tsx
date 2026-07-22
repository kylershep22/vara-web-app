// Plan presentation (Vara_Engine_Contract.md §6/§7). Renders the ResolvedPlan
// returned by resolve() — 0-2 slots, mandatory vs offered, leading messages,
// zero-slot acknowledgment cells. Replaces the single-protocol
// ProtocolRecommendation on the check-in path.
//
// The seven concrete presentation shapes come from classifyPlanShape(). Each
// maps to a primary CTA (`onPrimary`) and, when there is an offered
// alternative, a secondary CTA (`onSecondary`). The reducer interprets those
// two intents against the same shape, so view and reducer never disagree.
//
// Brand: calm, no guilt. Offered steps are presented as a quieter option, never
// auto-chained; mandatory continuations are stated plainly ("then your focus
// session").

import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

import { Colors, Spacing, Typography } from '../../../constants';
import type { PracticePointer, Quadrant, ResolvedPlan } from '../../../engine';
import type { Protocol } from '../../../types/models';
import {
  evidenceChipLabel,
  formatProtocolDuration,
} from '../../../utils/protocolDisplay';
import { classifyPlanShape, type PlanShape } from './planShape';

const MIN_TOUCH_TARGET = 48;

function pointerNoun(pointer: PracticePointer): string {
  return pointer.type === 'focus-session' ? 'focus session' : 'plan';
}

export interface PlanRecommendationProps {
  plan: ResolvedPlan;
  // One-line felt "why" shown under the lead on every non-zero shape (null for
  // zero-slot, whose acknowledgment message speaks for itself). Composed by
  // planReason() — INTERIM copy.
  reason?: string | null;
  // Primary CTA — the lead action for the shape (Begin / Start / Done).
  onPrimary: () => void;
  // Secondary CTA — the offered alternative (accept an offered practice or
  // pre-roll). Only rendered for shapes that carry an offered slot.
  onSecondary?: () => void;
  onSeeOtherOptions: () => void;
  showSeeOtherOptions?: boolean;
  onBack?: () => void;
  onClose?: () => void;
}

export function PlanRecommendation({
  plan,
  reason,
  onPrimary,
  onSecondary,
  onSeeOtherOptions,
  showSeeOtherOptions = true,
  onBack,
  onClose,
}: PlanRecommendationProps) {
  const shape = classifyPlanShape(plan);
  // The hero lead: practice shapes render the ring/hero with their real duration;
  // the focus-session pointer renders the same hero WITHOUT a ring (non-timed —
  // the timer owns duration). Everything else (zero, message-offered, the
  // routine/plan pointer) keeps the prior presentation.
  const lead = timedLead(shape);

  return (
    <View style={styles.container} testID="checkin-flow-plan">
      <View style={styles.header}>
        {onBack ? (
          <TouchableOpacity
            style={styles.headerButton}
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Back"
            testID="checkin-flow-plan-back"
          >
            <Icon name="arrow-left" size={24} color={Colors.softCharcoal} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
        {onClose ? (
          <TouchableOpacity
            style={styles.headerButton}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
            testID="checkin-flow-plan-close"
          >
            <Icon name="close" size={24} color={Colors.softCharcoal} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {lead ? (
          <TimedLead lead={lead} reason={reason} />
        ) : isAffirmationShape(shape) ? (
          <Affirmation shape={shape} quadrant={plan.quadrant} />
        ) : (
          <>
            {reason ? (
              <Text style={styles.reason} testID="checkin-flow-plan-reason">
                {reason}
              </Text>
            ) : null}
            <PlanBody shape={shape} />
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <PlanActions
          shape={shape}
          onPrimary={onPrimary}
          onSecondary={onSecondary}
        />
        {showSeeOtherOptions && shapeHasPractice(shape) ? (
          <TouchableOpacity
            style={styles.secondaryLink}
            onPress={onSeeOtherOptions}
            accessibilityRole="button"
            accessibilityLabel="See other options"
            testID="checkin-flow-plan-see-other-options"
          >
            <Text style={styles.secondaryLinkLabel}>See other options</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

function shapeHasPractice(shape: PlanShape): boolean {
  return shape.kind !== 'zero' && shape.kind !== 'single_pointer';
}

// ── hero lead (ring/hero) ───────────────────────────────────
// The renderable lead for the hero branches: a catalog practice's name +
// duration + description (ring shows the real run-length), or the focus-session
// pointer as a name + description with NO duration (a non-timed hero — the ring
// is skipped). Returns null for shapes that keep the prior presentation (zero /
// message-offered / the offered pre-roll / the routine-plan pointer — a duration
// ring doesn't fit a non-timed routine destination, left for a later polish).
interface TimedLeadData {
  name: string;
  // Present for catalog-practice heroes (their real run-length). ABSENT for the
  // focus-session pointer, which is a non-timed hero: the timer screen owns
  // duration, so the plan surface makes no minute promise.
  duration?: string;
  description: string;
  // Mandatory pointer continuation after the lead practice (a quiet chain line).
  chainTo?: string;
}

function timedLead(shape: PlanShape): TimedLeadData | null {
  switch (shape.kind) {
    case 'single_practice':
    case 'practice_then_offered_pointer':
      return {
        name: shape.practice.practice.name,
        duration: formatProtocolDuration(shape.practice.practice),
        description: shape.practice.practice.description,
      };
    case 'practice_then_pointer':
      return {
        name: shape.practice.practice.name,
        duration: formatProtocolDuration(shape.practice.practice),
        description: shape.practice.practice.description,
        chainTo: pointerNoun(shape.pointer),
      };
    case 'single_pointer':
      return shape.pointer.type === 'focus-session'
        ? focusPointerLead()
        : null; // routine/plan pointer — left as-is (non-timed destination)
    case 'offered_practice_then_pointer':
      // Focus session is the hero; the offered practice is a pre-roll affordance
      // above the CTA (PlanActions), not in the ring.
      return shape.pointer.type === 'focus-session'
        ? focusPointerLead()
        : null;
    default:
      return null; // zero / message_offered
  }
}

// The focus-session pointer as a NON-TIMED hero: name + description, no duration.
// The pointer's length (snapBudgetToTimerOption) is a false promise on this
// surface — the timer screen owns duration and keeps its own default regardless
// of budget — so the plan surface shows no minute value at any budget. (Catalog
// practice heroes still carry their real run-length; that path is untouched.)
function focusPointerLead(): TimedLeadData {
  return {
    name: 'Focus session',
    description: 'A quiet window to do the work',
  };
}

function TimedLead({
  lead,
  reason,
}: {
  lead: TimedLeadData;
  reason?: string | null;
}) {
  return (
    <View style={styles.timed} testID="checkin-flow-plan-timed">
      <Text style={styles.overline}>From your check-in</Text>
      {reason ? (
        <Text style={styles.reasonHero} testID="checkin-flow-plan-reason">
          {reason}
        </Text>
      ) : null}
      {lead.duration != null ? (
        <View style={styles.ringWrap}>
          <View style={styles.ring}>
            <View style={styles.ringInner} pointerEvents="none" />
            <Text style={styles.ringDuration} testID="checkin-flow-plan-duration">
              {lead.duration}
            </Text>
          </View>
        </View>
      ) : null}
      <Text style={styles.leadName}>{lead.name}</Text>
      <Text style={styles.leadDescription}>{lead.description}</Text>
      {lead.chainTo ? (
        <Text style={styles.chainCentered}>then your {lead.chainTo}</Text>
      ) : null}
    </View>
  );
}

// ── affirmation (zero + message_offered) ────────────────────
// The "you're already steady" shapes: one calm affirmation hero, the offer (if
// any) lives in the buttons, not a second body line. Prefer the engine's
// per-cell message; fall back to a per-quadrant line.
const QUADRANT_AFFIRMATION: Record<Quadrant, string> = {
  Calm: "You're steady right now.",
  Activated: "You've got energy right now.",
  Tense: "You're holding a lot right now.",
  Depleted: "You're running low right now.",
};

function isAffirmationShape(shape: PlanShape): boolean {
  return shape.kind === 'zero' || shape.kind === 'message_offered';
}

function Affirmation({
  shape,
  quadrant,
}: {
  shape: PlanShape;
  quadrant: Quadrant;
}) {
  const hero = shape.message ?? QUADRANT_AFFIRMATION[quadrant];
  const offered = shape.kind === 'message_offered';
  return (
    <View
      style={styles.affirm}
      testID={shape.kind === 'zero' ? 'checkin-flow-plan-zero' : 'checkin-flow-plan-affirmation'}
    >
      <Text style={styles.overline}>From your check-in</Text>
      <Text style={styles.affirmHero}>{hero}</Text>
      {offered ? (
        <Text style={styles.affirmSub}>Nothing needed unless you want it.</Text>
      ) : null}
    </View>
  );
}

// ── body ───────────────────────────────────────────────────

function PlanBody({ shape }: { shape: PlanShape }) {
  switch (shape.kind) {
    case 'zero':
      return (
        <View testID="checkin-flow-plan-zero">
          <Text style={styles.message}>{shape.message ?? "You're set."}</Text>
        </View>
      );
    case 'message_offered':
      return (
        <View>
          {shape.message ? (
            <Text style={styles.message}>{shape.message}</Text>
          ) : null}
          <Text style={styles.offeredHint}>
            If you want, a short reset is here.
          </Text>
        </View>
      );
    case 'single_practice':
      return (
        <>
          {shape.message ? (
            <Text style={styles.message}>{shape.message}</Text>
          ) : null}
          <PracticeCard protocol={shape.practice.practice} />
        </>
      );
    case 'single_pointer':
      // No placeholder line — the reason subhead + the single Begin carry it.
      return shape.message ? (
        <View>
          <Text style={styles.message}>{shape.message}</Text>
        </View>
      ) : null;
    case 'practice_then_pointer':
      return (
        <>
          {shape.message ? (
            <Text style={styles.message}>{shape.message}</Text>
          ) : null}
          <PracticeCard protocol={shape.practice.practice} />
          <Text style={styles.chainLine}>
            then your {pointerNoun(shape.pointer)}
          </Text>
        </>
      );
    case 'practice_then_offered_pointer':
      return (
        <>
          {shape.message ? (
            <Text style={styles.message}>{shape.message}</Text>
          ) : null}
          <PracticeCard protocol={shape.practice.practice} />
        </>
      );
    case 'offered_practice_then_pointer':
      // The reason subhead leads; the offered pre-roll is a quiet option.
      return (
        <View>
          <Text style={styles.offeredHint}>
            Or ease in with {shape.practice.practice.name} first.
          </Text>
        </View>
      );
  }
}

// ── actions ─────────────────────────────────────────────────

function PlanActions({
  shape,
  onPrimary,
  onSecondary,
}: {
  shape: PlanShape;
  onPrimary: () => void;
  onSecondary?: () => void;
}) {
  switch (shape.kind) {
    case 'zero':
      return <PrimaryButton label="Done" onPress={onPrimary} />;
    case 'message_offered':
      // Weighted choices: "I'm good" is the primary (teal), the reset is a quiet
      // outline secondary, and "See other options" renders as a tertiary text
      // link in the footer below.
      return (
        <>
          <PrimaryButton label="I'm good" onPress={onPrimary} />
          {onSecondary ? (
            <SecondaryButton label="Take a short reset" onPress={onSecondary} />
          ) : null}
        </>
      );
    case 'single_practice':
    case 'practice_then_pointer':
    case 'practice_then_offered_pointer':
      return <PrimaryButton label="Begin" onPress={onPrimary} />;
    case 'single_pointer':
      return (
        <PrimaryButton
          label={shape.pointer.type === 'focus-session' ? 'Start focus session' : 'Open your routines'}
          onPress={onPrimary}
        />
      );
    case 'offered_practice_then_pointer':
      return (
        <>
          {onSecondary ? (
            <PreRollButton
              label={`Ease in with ${shape.practice.practice.name} · ${formatProtocolDuration(shape.practice.practice)}`}
              onPress={onSecondary}
            />
          ) : null}
          <PrimaryButton
            label={shape.pointer.type === 'focus-session' ? 'Start focus session' : 'Open your routines'}
            onPress={onPrimary}
          />
        </>
      );
  }
}

// Optional pre-roll affordance: a quiet silver-sage outline row (not a second
// primary) with a leading "+", sitting directly above the teal CTA. Tapping it
// runs the offered practice and then hands off to the focus session.
function PreRollButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.preRollButton}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID="checkin-flow-plan-secondary"
    >
      <Text style={styles.preRollPlus}>+</Text>
      <Text style={styles.preRollLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function PrimaryButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.primaryButton}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID="checkin-flow-plan-primary"
    >
      <Text style={styles.primaryButtonLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function SecondaryButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.offeredButton}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID="checkin-flow-plan-secondary"
    >
      <Text style={styles.offeredButtonLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── practice card (mirrors ProtocolRecommendation's card) ────

function PracticeCard({ protocol }: { protocol: Protocol }) {
  return (
    <View style={styles.card} testID={`checkin-flow-plan-practice-${protocol.id}`}>
      <Text style={styles.cardName}>{protocol.name}</Text>
      <View style={styles.cardMetaRow}>
        <Text style={styles.cardDuration}>{formatProtocolDuration(protocol)}</Text>
        <Text style={styles.cardMetaSeparator}>·</Text>
        <Text style={styles.cardEvidence}>
          {evidenceChipLabel(protocol.evidenceTier)}
        </Text>
      </View>
      <Text style={styles.cardDescription}>{protocol.description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.default,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.sm,
    height: 56,
  },
  headerButton: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
  },
  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  message: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.evergreenTeal,
    marginBottom: Spacing.lg,
  },
  // The felt "why" subhead under the lead (INTERIM copy via planReason).
  reason: {
    fontSize: Typography.fontSize.base,
    color: Colors.mutedSageGray,
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  // ── affirmation branch (zero + message_offered) ──
  affirm: {
    paddingTop: Spacing.sm,
  },
  affirmHero: {
    fontSize: 24,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
    lineHeight: 31,
  },
  affirmSub: {
    fontSize: Typography.fontSize.base,
    color: Colors.mutedSageGray,
    lineHeight: 22,
    marginTop: Spacing.sm,
  },
  // ── timed branch: ring/hero ──
  timed: {
    alignItems: 'center',
    paddingTop: Spacing.sm,
  },
  overline: {
    fontSize: 12,
    fontWeight: Typography.fontWeight.semibold,
    letterSpacing: 0.72, // .06em at 12px
    textTransform: 'uppercase',
    color: Colors.mutedSageGray,
    marginBottom: Spacing.md,
  },
  reasonHero: {
    fontSize: 23,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
    textAlign: 'center',
    lineHeight: 30,
    marginBottom: Spacing.lg,
  },
  ringWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.lg,
  },
  ring: {
    width: 188,
    height: 188,
    borderRadius: 94,
    borderWidth: 1.5,
    borderColor: Colors.silverSage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Inner hairline ring, inset 16px, at ~45% so it reads as a soft echo of the
  // outer ring (opacity applies to the border-only view, no children).
  ringInner: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    bottom: 16,
    borderRadius: 78,
    borderWidth: 1,
    borderColor: Colors.silverSage,
    opacity: 0.45,
  },
  ringDuration: {
    fontSize: 34,
    fontWeight: '700',
    color: Colors.evergreenTeal,
  },
  leadName: {
    fontSize: 18,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  leadDescription: {
    fontSize: 14,
    color: Colors.mutedSageGray,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: Spacing.xs,
  },
  chainCentered: {
    fontSize: 14,
    color: Colors.mutedSageGray,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  offeredHint: {
    fontSize: Typography.fontSize.base,
    color: Colors.mutedSageGray,
  },
  chainLine: {
    fontSize: Typography.fontSize.base,
    color: Colors.mutedSageGray,
    marginTop: Spacing.md,
    marginLeft: Spacing.xs,
  },
  card: {
    padding: Spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.divider,
    backgroundColor: Colors.surface,
  },
  cardName: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
    marginBottom: Spacing.xs,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  cardDuration: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.evergreenTeal,
  },
  cardMetaSeparator: {
    marginHorizontal: Spacing.sm,
    fontSize: Typography.fontSize.sm,
    color: Colors.mutedSageGray,
  },
  cardEvidence: {
    fontSize: Typography.fontSize.sm,
    color: Colors.mutedSageGray,
  },
  cardDescription: {
    fontSize: Typography.fontSize.base,
    color: Colors.softCharcoal,
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
  },
  primaryButton: {
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: 12,
    backgroundColor: Colors.evergreenTeal,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
  },
  primaryButtonLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.surface,
  },
  offeredButton: {
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.silverSage,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
  },
  offeredButtonLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.softCharcoal,
  },
  preRollButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.silverSage,
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  preRollPlus: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.evergreenTeal,
  },
  preRollLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.softCharcoal,
  },
  secondaryLink: {
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLinkLabel: {
    fontSize: Typography.fontSize.base,
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.medium,
  },
});
