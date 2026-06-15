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
import type { PracticePointer, ResolvedPlan } from '../../../engine';
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
  onPrimary,
  onSecondary,
  onSeeOtherOptions,
  showSeeOtherOptions = true,
  onBack,
  onClose,
}: PlanRecommendationProps) {
  const shape = classifyPlanShape(plan);

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
        <PlanBody shape={shape} />
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
      return (
        <View>
          {shape.message ? (
            <Text style={styles.message}>{shape.message}</Text>
          ) : null}
          <Text style={styles.leadLine}>
            Your {pointerNoun(shape.pointer)} is ready when you are.
          </Text>
        </View>
      );
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
      return (
        <View>
          <Text style={styles.leadLine}>
            Start your {pointerNoun(shape.pointer)} when you're ready.
          </Text>
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
      return (
        <>
          {onSecondary ? (
            <SecondaryButton
              label="Take a short reset"
              onPress={onSecondary}
            />
          ) : null}
          <PrimaryButton label="I'm good" onPress={onPrimary} />
        </>
      );
    case 'single_practice':
    case 'practice_then_pointer':
    case 'practice_then_offered_pointer':
      return <PrimaryButton label="Begin" onPress={onPrimary} />;
    case 'single_pointer':
      return (
        <PrimaryButton
          label={shape.pointer.type === 'focus-session' ? 'Start focus session' : 'Open your plan'}
          onPress={onPrimary}
        />
      );
    case 'offered_practice_then_pointer':
      return (
        <>
          {onSecondary ? (
            <SecondaryButton
              label={`Add ${shape.practice.practice.name} first`}
              onPress={onSecondary}
            />
          ) : null}
          <PrimaryButton
            label={shape.pointer.type === 'focus-session' ? 'Start focus session' : 'Open your plan'}
            onPress={onPrimary}
          />
        </>
      );
  }
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
  leadLine: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
    marginBottom: Spacing.sm,
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
    borderColor: Colors.divider,
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
