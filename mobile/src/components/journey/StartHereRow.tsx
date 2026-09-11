/**
 * Start here: the explainer row, and the only production container over
 * `VideoPlayerModal` (Journey Architecture Roadmap v3, sections 1, 6 item 9 and
 * 8; slice 5c).
 *
 * A ROW, NOT A CARD (decision 7). Section 8 gives Today a three-card ceiling of
 * hero, Start here and the advancement card, which leaves no room for a fourth
 * card and settles the shape for both surfaces. The expanded state is this row's
 * own expansion, taller and heavier, rather than a card that later has to be
 * demoted into a row when slice 7 mounts Today. Slice 7a mounted Today on this
 * component unchanged, which is what building it surface-keyed bought.
 *
 * NO VIDEO MEANS NO ROW (decision 1, and it is the decisive call in this slice).
 * The path resolves on mount, and until it has resolved to something real this
 * component renders NOTHING: no row, no placeholder, no disabled affordance, no
 * message. A path that is null and a path that fails to resolve are the same
 * outcome deliberately. The alternative was shipping a placeholder path that
 * resolves to nothing, which surfaces `VideoPlayerModal`'s error overlay
 * (VideoPlayerModal.tsx:241-259) in Soft Coral, telling every user on the calmest
 * surface in the app to check their connection because of a file nobody has
 * uploaded yet. Section 8 reserves coral for genuine errors. Absence renders
 * nothing, the same principle the remove page's replacement intention shipped on
 * in 5b-i.
 *
 * NOTHING RENDERS UNTIL BOTH ANSWERS ARE IN, which is what keeps it from
 * flashing. Two independent async gates decide this row: whether the video
 * resolves, and whether this user has opened it before. Rendering on the first
 * and waiting for the second would show an expanded row that silently collapses
 * a frame later, which looks like a bug and reads like one. `useVideoSource`
 * returns `{ url: null, loading: false }` on its very first render, before its
 * own effect has run, so "not resolved yet" and "resolved to nothing" are not
 * distinguishable from `loading` alone. Keying the render on `url` rather than
 * on `loading` makes both of them render nothing, which is the correct answer to
 * each.
 *
 * COLLAPSE MEANS "AFTER THE USER OPENS IT" (decision 2), and this comment is the
 * record so it is not read later as an oversight. Section 1 says "collapsing
 * after first play". `VideoPlayerModal` takes `visible`, `storagePath`, `title`
 * and `onClose` and exposes no completion, ended or progress callback
 * (VideoPlayerModal.tsx:63-73); it is section 3.5-unchanged, and this slice
 * wraps it and never edits it. So the only playback event available to a
 * container is the open it performs itself. Completion tracking, if it is ever
 * wanted, is a deliberate fence change with its own slice.
 *
 * ONE TAP, ONE ACTION. Pressing the row opens the video. Collapse is a
 * de-emphasis rather than a state the user has to drive: there is no expand
 * control, no chevron to turn, and no second tap between a user and the thing
 * the row offers. Section 18 wants one primary action visible, and a row whose
 * first tap only revealed a second tap would fail that on a surface that already
 * has four destination cards competing for the same intent.
 *
 * The two states differed ONLY in the gloss line until slice 7a; see the weight
 * note below for why that was not enough and what changed.
 *
 * SURFACE-KEYED, NOT PRACTICES-ONLY (decision 6). The path and the collapse
 * marker are both keyed by `surface`, so slice 7 mounts Today by passing a
 * different key and its own gloss. Building this for one surface is how slice 7
 * ends up writing a second one, and the second build is always the one that
 * never happens. Same reasoning that made `PhasePath` serve A2 and the map in
 * one slice.
 *
 * THE GLOSS IS A PROP, THE LABEL IS NOT. Both surfaces call the row the same
 * thing, so the label is shared in `constants/startHere.ts`; each surface's
 * video explains a different thing (section 6 item 9), so the one line under it
 * belongs to the mount.
 *
 * COLLAPSE IS A CHANGE OF WEIGHT, NOT ONLY A DROPPED LINE (slice 7a, from the
 * 5c walk). Kyle's report was that the row "did not read as a state change to
 * me", and the instrumented run showed why: the mechanism was working perfectly
 * and the two states differed ONLY in whether the gloss rendered, which on a
 * device reads as nothing at all. De-emphasis by subtraction was too quiet to
 * register as de-emphasis. The collapsed row now also loses vertical room, drops
 * its label to the smaller size, and dims its play affordance, so the change is
 * legible in the row itself rather than only in what is missing beneath it.
 *
 * IT IS STILL A ROW, ON BOTH SURFACES. Section 8 has no space for a fourth card,
 * so everything that distinguishes the two states fits inside a row's height.
 *
 * THERE IS NO "WATCHED" MARK, AND THAT IS A DECISION RATHER THAN AN OMISSION
 * (Kyle, slice 7a). A checkmark, a "watched" pill or a completion tint would all
 * claim the user WATCHED the video. The marker records that the row was OPENED
 * (decision 2 above, and `VideoPlayerModal` exposes no completion callback for
 * anything better), and a mark claiming more than the data supports is the same
 * error as a control claiming an outcome it did not produce. Weight says "you
 * have been here" without asserting what happened next.
 *
 * NO MOTION, SO NOTHING TO REDUCE. The row does not animate between its two
 * states: it renders one weight or the other. `useReducedMotion` is not wired
 * here because there is no animation for it to gate, and a hook whose value
 * nothing reads only looks like coverage. `VideoPlayerModal` gates its own
 * transition. If a future revision animates the change, it gates it.
 *
 * NO COUNTERS AND NO DURATION. Section 8 bans the count, and a runtime on the
 * row would be a number on a behavioral surface arguing for a moment of the
 * user's time. The video says how long it is by being short.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

import { VideoPlayerModal } from '../video/VideoPlayerModal';
import { Colors, Spacing, TextStyles, Typography } from '../../constants';
import {
  START_HERE_LABEL,
  START_HERE_PATHS,
  type StartHereSurface,
} from '../../constants/startHere';
import { useVideoSource } from '../../hooks/useVideoSource';
import {
  readStartHereMarker,
  writeStartHereMarker,
} from '../../utils/startHereCollapseMarker';

const MIN_TOUCH_TARGET = 48;
const MAX_FONT_SCALE = 1.3;

export interface StartHereRowProps {
  /** Which surface is mounting this. Keys both the video and the collapse. */
  surface: StartHereSurface;
  /**
   * Required for marker scoping. Null or undefined means unauthenticated, and
   * the row never renders: there is no key to scope the collapse to, and
   * writing an unscoped one is the defect this file's marker module exists to
   * avoid repeating.
   */
  userId: string | null | undefined;
  /** The one line under the label. Rendered only while expanded. */
  gloss: string;
  testID?: string;
}

export const StartHereRow: React.FC<StartHereRowProps> = ({
  surface,
  userId,
  gloss,
  testID = 'start-here-row',
}) => {
  const path = START_HERE_PATHS[surface];

  // Resolved here rather than left to the modal, because the row's EXISTENCE
  // depends on the answer. The modal resolves the same path again when it
  // opens; `resolveStorageUrl` memoises by path for the bundle lifetime
  // (resolveStorageUrl.ts:21,41-43), so that second resolve is a cache hit.
  const { url } = useVideoSource(path);

  // null means "not decided yet", which is not the same as "not collapsed" and
  // is why this is not a plain boolean. Rendering an expanded row on a
  // maybe-collapsed marker is the flash this guards.
  const [collapsed, setCollapsed] = useState<boolean | null>(null);
  const [playerOpen, setPlayerOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!userId) {
      setCollapsed(null);
      return;
    }

    void readStartHereMarker(surface, userId).then((marker) => {
      if (cancelled) return;
      setCollapsed(marker !== null);
    });

    return () => {
      cancelled = true;
    };
  }, [surface, userId]);

  const handlePress = useCallback(() => {
    setPlayerOpen(true);

    // The open IS the collapse (decision 2). Written on the way in rather than
    // on close, so a user who opens the video and kills the app has still
    // opened it. Fire and forget: a failed write costs one more expanded
    // render, never the playback the user just asked for.
    if (collapsed === false && userId) {
      setCollapsed(true);
      void writeStartHereMarker(surface, userId, Date.now());
    }
  }, [collapsed, surface, userId]);

  const handleClose = useCallback(() => setPlayerOpen(false), []);

  // THE MODAL IS NOT MOUNTED IN THIS BRANCH, which is the strongest form of
  // "never open the player on a null path". `VideoPlayerModal` with a null
  // `storagePath` and `visible` true opens onto an empty black screen with only
  // the close button live (VideoPlayerModal.tsx:274,309) — the prop comment
  // "Null renders nothing" describes the video surface, not the modal. There is
  // no guard to forget here because there is no component to guard.
  if (!path || !url || !userId || collapsed === null) return null;

  const accessibilityLabel = collapsed
    ? START_HERE_LABEL
    : `${START_HERE_LABEL}. ${gloss}`;

  return (
    <View testID={`${testID}-container`}>
      <TouchableOpacity
        style={[styles.row, collapsed && styles.rowCollapsed]}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint="Opens a short video"
        testID={testID}
      >
        {/* The affordance dims and shrinks once opened. It never becomes a
            check or a "watched" glyph: see the note in this file's header. */}
        <View style={styles.icon}>
          <Icon
            name="play-circle-outline"
            size={collapsed ? 20 : 24}
            color={collapsed ? Colors.mutedSageGray : Colors.evergreenTeal}
          />
        </View>
        <View style={styles.text}>
          <Text
            style={[styles.label, collapsed && styles.labelCollapsed]}
            maxFontSizeMultiplier={MAX_FONT_SCALE}
          >
            {START_HERE_LABEL}
          </Text>
          {collapsed ? null : (
            <Text
              style={styles.gloss}
              maxFontSizeMultiplier={MAX_FONT_SCALE}
              testID={`${testID}-gloss`}
            >
              {gloss}
            </Text>
          )}
        </View>
      </TouchableOpacity>

      <VideoPlayerModal
        visible={playerOpen}
        storagePath={path}
        title={START_HERE_LABEL}
        onClose={handleClose}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  // A ROW, SO NO SURFACE, NO BORDER AND NO RADIUS. The four destination cards
  // below it on the map are cards; this reads as a line of the page, which is
  // what keeps it from competing with them and what lets Today mount it inside
  // the three-card ceiling without becoming the fourth card.
  row: {
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  // TIGHTER, BUT NEVER BELOW THE TOUCH TARGET. `minHeight` stays 48 from the
  // base style, so the collapsed row loses visual room without losing a
  // tappable one (UI Standards 16). Padding is what changes; the hit area is
  // not negotiable and is not part of the de-emphasis.
  rowCollapsed: {
    paddingVertical: Spacing['2xs'],
  },
  icon: {
    marginRight: Spacing.md,
  },
  text: {
    flex: 1,
  },
  label: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
  },
  // Down one step on the type scale and off semibold. Still Charcoal rather
  // than Sage: the row is quieter, not disabled, and a greyed label on a live
  // control reads as unavailable.
  labelCollapsed: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  gloss: {
    ...TextStyles.bodySmall,
    color: Colors.mutedSageGray,
    marginTop: 2,
  },
});

export default StartHereRow;
