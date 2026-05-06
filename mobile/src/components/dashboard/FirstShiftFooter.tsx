// FirstShiftFooter — one-time quiet acknowledgment on Today.
//
// Sub-step 2.7. Shown exactly once per (device, user), on the first
// DashboardScreen render after the user's `firstShiftAt` is set on
// their UserProfile. Surfaces below the brain-state check-in card
// (locked decision: anchored to the action that produced the first
// shift, not a separate "achievement" surface).
//
// Round 8: marker is now scoped by userId (was device-global).
// Multi-account / account-switch / reinstall scenarios now each get
// their own once-per-account display. See firstShiftFooterMarker.ts
// for the migration note.
//
// Source-of-truth split:
//   - `firstShiftAt` prop (server) — was a qualifying shift recorded
//     on this user? Drives WHETHER to ever render.
//   - `firstShiftFooterMarker:{userId}` (local AsyncStorage) — has
//     the footer been shown on this device for THIS user? Drives
//     WHETHER to render now.
//
// UX (locked decisions):
//   - Auto-dismiss on first render. The render that shows the footer
//     also writes the marker; the next mount sees the marker and
//     renders nothing. No tap affordance, no × button. The footer is
//     a notice, not an interaction; adding a dismiss control would
//     add UI to a deliberately quiet surface.
//   - No animation, no celebration, no exclamation marks (Build Guide
//     §4 calm over stimulation, §2 no gamification, Implementation
//     Plan "quiet acknowledgment").
//   - Muted Sage Gray text on default background; small font.
//
// Copy is verbatim from Core Loop v2 line 238: "Your first shift is
// logged in Patterns".
//
// The marker write fires inside a useEffect, NOT in render — side
// effects in render are wrong, and the assertion "marker written
// exactly once" depends on this being a deterministic post-commit
// effect.

import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { Timestamp } from 'firebase/firestore';

import { Colors, Spacing, Typography } from '../../constants';
import { readMarker, writeMarker } from '../../utils/firstShiftFooterMarker';

const FOOTER_TEXT = 'Your first shift is logged in Patterns';

const ACCESSIBILITY_LABEL =
  'Your first shift is logged in Patterns. View your patterns over time.';

export interface FirstShiftFooterProps {
  // Set on UserProfile by writeStandardFlowSession the first time a
  // CheckInFlow session produces a qualifying outcome. Null/undefined
  // means the user has not yet had a qualifying shift — the footer
  // never renders.
  firstShiftAt: Timestamp | null | undefined;
  // Round 8: required for marker scoping. The marker is keyed per
  // user so multi-account / reinstall / shared-device scenarios each
  // get their own once-per-account display. Null/undefined means
  // unauthenticated — the footer never renders.
  userId: string | null | undefined;
}

export const FirstShiftFooter: React.FC<FirstShiftFooterProps> = ({
  firstShiftAt,
  userId,
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // No qualifying shift yet OR no authenticated user — never show.
    if (firstShiftAt == null || !userId) {
      setVisible(false);
      return;
    }

    const decide = async () => {
      const marker = await readMarker(userId);
      if (cancelled) return;
      if (marker !== null) {
        // Already shown on this device for this user — don't render again.
        setVisible(false);
        return;
      }
      // First-time render on this device for this user. Set visible AND
      // write the marker so subsequent mounts see it.
      setVisible(true);
      await writeMarker(userId, Date.now());
    };
    decide();

    return () => {
      cancelled = true;
    };
  }, [firstShiftAt, userId]);

  if (!visible) return null;

  return (
    <View style={styles.container} testID="first-shift-footer">
      <Text
        style={styles.text}
        accessibilityLabel={ACCESSIBILITY_LABEL}
        testID="first-shift-footer-text"
      >
        {FOOTER_TEXT}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.base,
    alignItems: 'center',
  },
  text: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
