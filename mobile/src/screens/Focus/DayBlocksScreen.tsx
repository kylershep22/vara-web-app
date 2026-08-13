/**
 * Today's blocks (TB-1b, mockup A2 — the day-shape variant).
 *
 * The mockup offers A (plain list) and A2 (list plus strip) as a fork and asks
 * for one, not a toggle. A2 is what the brief chose, so there is no flag and no
 * A-shaped fallback here.
 *
 * ONE PRIMARY ACTION: Add a block. Cards are informational, the strip is inert,
 * and removal is a swipe rather than a second button.
 *
 * OWNS THE WRITES. AddBlockSheet is presentational and hands a draft up once;
 * createDayBlock and deleteDayBlock are called here. That split is the same one
 * DailyPickerSheet documents, and it is what keeps an abandoned sheet from
 * leaving anything behind.
 *
 * TODAY ONLY. The range is local midnight to local midnight. There is no week
 * view and no date navigation at MVP.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Colors, Layout, Spacing, TextStyles, Typography } from '../../constants';
import { ROUTES } from '../../navigation/routes';
import { useAuth } from '../../context/AuthContext';
import { logger } from '../../utils/logger';
import {
  createDayBlock,
  deleteDayBlock,
  listDayBlocksBetween,
} from '../../services/firebase/dayBlocks.service';
import { getFocusRhythms } from '../../services/firebase/focusRhythms.service';
import type { DayBlock } from '../../types/models';
import { suggestPlacement } from './suggestPlacement';
import { DayShapeStrip } from './components/DayShapeStrip';
import { BlockCard } from './components/BlockCard';
import { AddBlockSheet, type NewBlockDraft } from './AddBlockSheet';
import {
  ADD_BLOCK_CTA,
  DAY_INTRO,
  DAY_TITLE,
  EMPTY_LINE,
  SUFFICIENCY_LINE,
} from './blocksCopy';

const MIN_TOUCH_TARGET = 48;

/**
 * The daily cap, from the mockup's decisions block: "Up to 3 blocks a day. The
 * cap is framed as sufficiency, never scarcity."
 *
 * Enforced softly and only in the UI: at the cap the Add CTA is REPLACED by the
 * sufficiency line rather than disabled, so nothing reads as a locked door and
 * nothing throws. The service has no cap and deliberately keeps none — this is a
 * product framing, not a data invariant, and a hard rule there would make the
 * number expensive to change.
 *
 * See the report: whether to enforce this at all in A2 is the largest judgement
 * call in the slice, because A2 drops the sufficiency line the cap lives on in A.
 */
export const MAX_BLOCKS_PER_DAY = 3;

type NavigationProp = NativeStackNavigationProp<{
  FocusRhythms: undefined;
}>;

/** Local midnight today, and local midnight tomorrow. */
function todayBounds(now: Date): { start: Date; end: Date } {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export function DayBlocksScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();

  const [blocks, setBlocks] = useState<DayBlock[]>([]);
  const [windows, setWindows] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  /**
   * Bumped every time the sheet opens, and used as its `key` so it REMOUNTS.
   *
   * Two bugs live here if it does not. The sheet is mounted from first render,
   * before the rhythm read resolves, so its initial state would be seeded from
   * an empty windows array — latching it into no-suggestion mode permanently
   * even once an 'ok' suggestion arrives. And a second open would inherit the
   * previous draft's title. Remounting fixes both at the one moment that
   * matters, while keeping the modal mounted afterwards so it can animate out.
   */
  const [sheetSession, setSheetSession] = useState(0);

  // Re-read on focus rather than on an interval: this is a pushed screen, and
  // returning to it from the rhythms page is exactly when a stale read shows.
  // `now` is captured here so the whole render agrees on one clock.
  const [now, setNow] = useState(() => new Date());

  // Keyed on the UID, not the user OBJECT. useFocusEffect re-runs whenever this
  // callback's identity changes, so depending on the object would turn any
  // provider that returns a fresh value per render into an unbounded
  // load/setState/re-render loop. The uid is what actually decides whose day
  // this is.
  const uid = user?.uid;
  const load = useCallback(async () => {
    if (!uid) {
      setBlocks([]);
      setWindows([]);
      setLoading(false);
      return;
    }
    const current = new Date();
    setNow(current);
    const { start, end } = todayBounds(current);
    try {
      const [todaysBlocks, storedWindows] = await Promise.all([
        listDayBlocksBetween(uid, start, end),
        getFocusRhythms(uid),
      ]);
      setBlocks(todaysBlocks);
      setWindows(storedWindows);
    } catch (error) {
      // Best effort: an empty day is a legitimate state, so a read failure
      // shows the empty copy rather than an error screen.
      logger.error('[DayBlocks] load failed:', error);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void load().then(() => {
        if (!active) return;
      });
      return () => {
        active = false;
      };
    }, [load])
  );

  const suggestion = useMemo(() => suggestPlacement(windows, now), [windows, now]);

  const atCap = blocks.length >= MAX_BLOCKS_PER_DAY;

  const handleConfirm = useCallback(
    async (draft: NewBlockDraft) => {
      if (!uid) return;
      setSaving(true);
      setSaveFailed(false);
      try {
        await createDayBlock(uid, draft);
        setSheetOpen(false);
        await load();
      } catch (error) {
        logger.error('[DayBlocks] create failed:', error);
        // The sheet stays open with the draft intact; retry costs one tap.
        setSaveFailed(true);
      } finally {
        setSaving(false);
      }
    },
    [uid, load]
  );

  const handleRemove = useCallback(
    async (blockId: string) => {
      try {
        await deleteDayBlock(blockId);
        await load();
      } catch (error) {
        logger.error('[DayBlocks] remove failed:', error);
      }
    },
    [load]
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} testID="day-blocks">
        <Text style={styles.title}>{DAY_TITLE}</Text>
        <Text style={styles.intro}>{DAY_INTRO}</Text>

        {loading ? (
          <ActivityIndicator
            color={Colors.evergreenTeal}
            style={styles.loading}
            testID="day-blocks-loading"
          />
        ) : (
          <>
            {/* The strip earns its place only once something is on it. On an
                empty day it would be three labelled empty zones, which is the
                empty-hour framing A2 exists to avoid.

                OPEN FOR JEN: the mockup asks whether it should appear from the
                SECOND block on rather than the first. Kept at one for now, so
                the first block still gets placed in the shape of the day. */}
            {blocks.length > 0 && <DayShapeStrip blocks={blocks} windows={windows} />}

            {blocks.length === 0 ? (
              <Text style={styles.empty} testID="day-blocks-empty">
                {EMPTY_LINE}
              </Text>
            ) : (
              blocks.map((block) => (
                <BlockCard
                  key={block.id}
                  block={block}
                  now={now}
                  onRemove={handleRemove}
                />
              ))
            )}

            {atCap ? (
              <Text style={styles.sufficiency} testID="day-blocks-sufficiency">
                {SUFFICIENCY_LINE}
              </Text>
            ) : (
              <TouchableOpacity
                style={styles.cta}
                onPress={() => {
                  setSaveFailed(false);
                  setSheetSession((n) => n + 1);
                  setSheetOpen(true);
                }}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={ADD_BLOCK_CTA}
                testID="day-blocks-add"
              >
                <Text style={styles.ctaLabel}>{ADD_BLOCK_CTA}</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>

      <AddBlockSheet
        key={`add-block-${sheetSession}`}
        visible={sheetOpen}
        suggestion={suggestion}
        now={now}
        saving={saving}
        saveFailed={saveFailed}
        onConfirm={handleConfirm}
        onDismiss={() => setSheetOpen(false)}
        onOpenRhythms={() => {
          setSheetOpen(false);
          navigation.navigate(ROUTES.FocusRhythms);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background.default,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing['2xl'],
  },
  title: {
    ...TextStyles.h1,
    color: Colors.evergreenTeal,
    marginBottom: Spacing.xs,
  },
  intro: {
    ...TextStyles.body,
    color: Colors.mutedSageGray,
    marginBottom: Spacing.lg,
  },
  loading: {
    marginTop: Spacing.xl,
  },
  empty: {
    ...TextStyles.body,
    color: Colors.mutedSageGray,
    marginBottom: Spacing.lg,
  },
  sufficiency: {
    ...TextStyles.bodySmall,
    color: Colors.mutedSageGray,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  cta: {
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: Layout.borderRadius.lg,
    backgroundColor: Colors.evergreenTeal,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    marginTop: Spacing.md,
  },
  ctaLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.white,
  },
});

export default DayBlocksScreen;
