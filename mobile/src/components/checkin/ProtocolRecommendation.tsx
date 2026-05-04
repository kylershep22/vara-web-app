// Step 3 of the revised core loop: protocol recommendation screen.
//
// Shows the recommender's selected protocol with a state-aware lead
// copy line, the protocol's name + duration + description, a primary
// "Begin" CTA, and a secondary "See other options" affordance.
//
// "See other options" is a Phase 2 stub — Phase 4 replaces with a
// ranked alternates view that lets users pick from scored
// alternatives within the same time window. For Phase 2 it routes
// the parent to Practices (via the parent's onSeeOtherOptions
// callback) so the affordance is in a known location and Phase 4
// inherits it without introducing one fresh.
//
// Per-state lead copy is the default-path variant. Phase 5 adds
// per-intent-path variants (e.g. softer language for the
// down-regulation path).
//
// Round 3 (Layer 3) — gap-acknowledgment line: when the recommender
// returns a protocol shorter than the user's chosen time window
// (the residual case after the closest-match sort lands in Layer 1
// — e.g. Wired+20 has no exact match because Wired protocols cap at
// 5 min), render a calm one-liner under the duration row. Honest,
// non-apologetic framing per Vara voice rules.

import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

import { Colors, Spacing, Typography } from '../../constants';
import type {
  BrainState,
  Protocol,
  ProtocolTimeWindow,
} from '../../types/models';
import {
  evidenceChipLabel,
  formatProtocolDuration,
} from '../../utils/protocolDisplay';

const MIN_TOUCH_TARGET = 48;
const TIME_LEFT_LINE = "You'll have time left in your window.";

export interface ProtocolRecommendationProps {
  protocol: Protocol;
  brainState: BrainState;
  timeWindow: ProtocolTimeWindow;
  onBegin: () => void;
  onSeeOtherOptions: () => void;
  onBack?: () => void;
  onClose?: () => void;
}

// Default-path lead copy. Per-intent-path variants are Phase 5.
export function recommendationLeadCopy(
  state: BrainState,
  timeWindow: ProtocolTimeWindow
): string {
  const minutes = timeWindow === 45 ? '45+' : `${timeWindow}`;
  switch (state) {
    case 'wired':
      return `Here's what fits your Wired state and ${minutes} minutes:`;
    case 'foggy':
      return `Here's what fits your Foggy state and ${minutes} minutes:`;
    case 'steady':
      return "You're Steady. Here's a way to build from here, if you'd like:";
    case 'clear':
    case 'alive':
      return "You're in a good place. Here's a way to use it:";
  }
}

export function ProtocolRecommendation({
  protocol,
  brainState,
  timeWindow,
  onBegin,
  onSeeOtherOptions,
  onBack,
  onClose,
}: ProtocolRecommendationProps) {
  const lead = recommendationLeadCopy(brainState, timeWindow);
  const durationLabel = formatProtocolDuration(protocol);
  const evidenceLabel = evidenceChipLabel(protocol.evidenceTier);
  const showTimeLeftLine = protocol.timeWindow < timeWindow;

  return (
    <View style={styles.container} testID="protocol-recommendation">
      <View style={styles.header}>
        {onBack ? (
          <TouchableOpacity
            style={styles.headerButton}
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Back"
            testID="protocol-recommendation-back"
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
            testID="protocol-recommendation-close"
          >
            <Icon name="close" size={24} color={Colors.softCharcoal} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.lead} testID="protocol-recommendation-lead">
          {lead}
        </Text>

        <View style={styles.card} testID="protocol-recommendation-card">
          <Text
            style={styles.protocolName}
            testID="protocol-recommendation-name"
          >
            {protocol.name}
          </Text>
          <View style={styles.metaRow}>
            <Text
              style={styles.duration}
              testID="protocol-recommendation-duration"
            >
              {durationLabel}
            </Text>
            <Text style={styles.metaSeparator}>·</Text>
            <Text style={styles.evidence}>{evidenceLabel}</Text>
          </View>
          {showTimeLeftLine ? (
            <Text
              style={styles.timeLeftLine}
              testID="protocol-recommendation-time-left"
            >
              {TIME_LEFT_LINE}
            </Text>
          ) : null}
          <Text
            style={styles.description}
            testID="protocol-recommendation-description"
          >
            {protocol.description}
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.beginButton}
          onPress={onBegin}
          accessibilityRole="button"
          accessibilityLabel="Begin"
          testID="protocol-recommendation-begin"
        >
          <Text style={styles.beginButtonText}>Begin</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.alternatesButton}
          onPress={onSeeOtherOptions}
          accessibilityRole="button"
          accessibilityLabel="See other options"
          testID="protocol-recommendation-alternates"
        >
          <Text style={styles.alternatesButtonText}>See other options</Text>
        </TouchableOpacity>
      </View>
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
  lead: {
    fontSize: Typography.fontSize.base,
    color: Colors.softCharcoal,
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  card: {
    padding: Spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.divider,
    backgroundColor: Colors.surface,
  },
  protocolName: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
    marginBottom: Spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  duration: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.evergreenTeal,
  },
  metaSeparator: {
    marginHorizontal: Spacing.sm,
    fontSize: Typography.fontSize.sm,
    color: Colors.mutedSageGray,
  },
  evidence: {
    fontSize: Typography.fontSize.sm,
    color: Colors.mutedSageGray,
  },
  timeLeftLine: {
    fontSize: Typography.fontSize.xs,
    color: Colors.mutedSageGray,
    marginBottom: Spacing.sm,
  },
  description: {
    fontSize: Typography.fontSize.base,
    color: Colors.softCharcoal,
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.divider,
  },
  beginButton: {
    minHeight: MIN_TOUCH_TARGET,
    backgroundColor: Colors.evergreenTeal,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  beginButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.white,
  },
  alternatesButton: {
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alternatesButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.evergreenTeal,
  },
});
