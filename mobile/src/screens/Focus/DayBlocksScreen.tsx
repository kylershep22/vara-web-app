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
 *
 * IT IS ALSO THE LANDING SITE FOR "BLOCK IT" (TB-3). Arriving with seed params
 * opens the add sheet pre-filled from a captured task, on the Today tab, with
 * the rhythm suggestion still offered — a seeded create is exactly the moment
 * "your focus runs strongest mid-morning" is worth saying, so the seed fills the
 * WHAT and leaves the WHEN to the user and the engine. See the one-shot effect
 * below: it is a plain useEffect on purpose, and that is load-bearing.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Colors, Layout, Spacing, TextStyles, Typography } from '../../constants';
import { ROUTES } from '../../navigation/routes';
import { useAuth } from '../../context/AuthContext';
import { logger } from '../../utils/logger';
import {
  createDayBlock,
  deleteDayBlock,
  listDayBlocksBetween,
  updateDayBlock,
} from '../../services/firebase/dayBlocks.service';
import { getFocusRhythms } from '../../services/firebase/focusRhythms.service';
import {
  FOCUS_RHYTHM_OPTIONS,
  type FocusRhythmKey,
} from '../../constants/focusRhythms';
import type { DayBlock, Demand } from '../../types/models';
import { suggestPlacement } from './suggestPlacement';
import { DayShapeStrip } from './components/DayShapeStrip';
import { BlockCard } from './components/BlockCard';
import { AddBlockSheet, type BlockSeed, type NewBlockDraft } from './AddBlockSheet';
import {
  ADD_BLOCK_CTA,
  DAY_INTRO,
  DAY_TITLE,
  EMPTY_LINE,
  SUFFICIENCY_LINE,
  placedForTomorrow,
  REMOVE_CONFIRM_ACCEPT,
  REMOVE_CONFIRM_BODY,
  REMOVE_CONFIRM_CANCEL,
  REMOVE_CONFIRM_TITLE,
  REMOVE_FAILED,
  TAB_TODAY,
  TAB_TOMORROW,
  TOMORROW_EMPTY,
  TOMORROW_INTRO,
  TOMORROW_TITLE,
} from './blocksCopy';

/** Today and tomorrow only. Arbitrary dates are out of scope by fence. */
export type DayTab = 'today' | 'tomorrow';

/** The calendar day a tab refers to, relative to the given clock. */
function anchorFor(tab: DayTab, now: Date): Date {
  const d = new Date(now);
  if (tab === 'tomorrow') d.setDate(d.getDate() + 1);
  return d;
}

const MIN_TOUCH_TARGET = 48;

/**
 * The daily cap. The mockup's decisions block said three; the round-3 device
 * walk raised it to six. Its framing is unchanged: "sufficiency, never
 * scarcity."
 *
 * The number lives HERE ONLY. SUFFICIENCY_LINE is deliberately count-agnostic
 * so moving this constant again is a one-line change and cannot leave the copy
 * asserting a number that is no longer true.
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
export const MAX_BLOCKS_PER_DAY = 6;

type NavigationProp = NativeStackNavigationProp<{
  FocusRhythms: undefined;
}>;

/**
 * What Tasks sends when the user taps "Block it" (TB-3).
 *
 * All three arrive together or not at all — they are one seed, not three
 * independent options — but each is optional because route params are untyped
 * at the boundary and this screen is also reached with no params at all from
 * the Focus hub.
 *
 * `seedDemand` is a plain string here rather than `Demand`. It crossed a
 * navigation boundary, so it is whatever was actually put on the route; it is
 * narrowed once, below, before anything trusts it.
 */
type SeedParams = {
  seedTitle?: string;
  seedDemand?: string;
  seedTaskId?: string;
};

type DayBlocksRoute = RouteProp<{ FocusDayBlocks: SeedParams | undefined }, 'FocusDayBlocks'>;

const DEMANDS: Demand[] = ['light', 'medium', 'heavy'];

/** A demand that actually crossed the wire, or null. */
function asDemand(value: string | undefined): Demand | null {
  return DEMANDS.includes(value as Demand) ? (value as Demand) : null;
}

/** Same local calendar day. */
function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** The rhythm zone's display label, when the suggestion was accepted. */
function zoneLabel(key?: FocusRhythmKey): string | undefined {
  return key ? FOCUS_RHYTHM_OPTIONS.find((o) => o.key === key)?.label : undefined;
}

/** Local midnight on `day`, and local midnight the day after. */
function dayBounds(day: Date): { start: Date; end: Date } {
  const start = new Date(day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

/**
 * The first block whose window intersects [start, start + minutes), or null.
 *
 * HALF-OPEN INTERVALS, which is what makes exact adjacency legal: a block
 * ending at 6:00 and one starting at 6:00 do not overlap, and refusing that
 * would make back-to-back blocks impossible. Strict `<` on both sides is the
 * whole rule.
 */
function findOverlap(
  existing: DayBlock[],
  start: Date,
  durationMinutes: number,
  excludeId?: string
): DayBlock | null {
  const startMs = start.getTime();
  const endMs = startMs + durationMinutes * 60_000;

  return (
    existing.find((block) => {
      // The block being edited is not its own conflict.
      if (excludeId && block.id === excludeId) return false;
      const otherStart = block.startAt.toDate().getTime();
      const otherEnd = otherStart + block.durationMinutes * 60_000;
      return startMs < otherEnd && otherStart < endMs;
    }) ?? null
  );
}

export function DayBlocksScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<DayBlocksRoute>();
  const { user } = useAuth();

  const [blocks, setBlocks] = useState<DayBlock[]>([]);
  const [windows, setWindows] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  // Set only when a saved block lands on a day this view cannot show. Cleared
  // when the sheet reopens, so it never lingers as stale reassurance.
  const [tomorrowNotice, setTomorrowNotice] = useState<string | null>(null);
  // Title of the block a refused save collided with. Null when there is none.
  const [overlapWith, setOverlapWith] = useState<string | null>(null);
  /** Which day the view is showing. Today and tomorrow only, by scope fence. */
  const [tab, setTab] = useState<DayTab>('today');
  /** The block being edited, or null when the sheet is in create mode. */
  const [editing, setEditing] = useState<DayBlock | null>(null);
  /**
   * The task this create came from, when the sheet was opened by "Block it".
   * Null for every hand-started block. Cleared when the sheet closes, so a
   * subsequent hand-started block cannot inherit the provenance.
   */
  const [seed, setSeed] = useState<BlockSeed | null>(null);

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
    // The clock stays today's; only the WINDOW moves with the tab.
    const { start, end } = dayBounds(anchorFor(tab, current));
    try {
      const [dayBlocks, storedWindows] = await Promise.all([
        listDayBlocksBetween(uid, start, end),
        getFocusRhythms(uid),
      ]);
      setBlocks(dayBlocks);
      setWindows(storedWindows);
    } catch (error) {
      // Best effort: an empty day is a legitimate state, so a read failure
      // shows the empty copy rather than an error screen.
      logger.error('[DayBlocks] load failed:', error);
    } finally {
      setLoading(false);
    }
  }, [uid, tab]);

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

  /**
   * THE SEEDED ARRIVAL (TB-3). Opens the add sheet pre-filled from the task the
   * user tapped "Block it" on.
   *
   * A PLAIN useEffect, NOT useFocusEffect, AND THAT IS THE WHOLE MECHANISM.
   * Everything else on this screen re-runs on focus, which is right for a read
   * that can go stale. This one must fire EXACTLY ONCE PER NAVIGATION, and the
   * two hooks differ precisely there:
   *
   *   useFocusEffect  runs on every focus. Open the seeded sheet, tap through
   *                   to the rhythms page and come back, and it reopens over
   *                   whatever the user is now doing — with a draft they may
   *                   have already abandoned. Every return to this screen for
   *                   the rest of the session would re-fire it.
   *   useEffect       runs when its deps change. React Navigation keeps the
   *                   params OBJECT IDENTITY stable for the life of a route
   *                   entry, so focus and blur do not touch it. One navigation
   *                   in, one open.
   *
   * There is deliberately no `navigation.setParams` call to "consume" the seed.
   * setParams appears nowhere in this codebase, and the effect keying already
   * gives the one-shot behaviour it would be reached for — clearing the params
   * would be a second mechanism doing the first one's job, and it would fight
   * the identity stability this depends on.
   *
   * Guarded on all three fields together: they are one seed, so a partial set
   * (a hand-built deep link, a param that failed to serialise) opens nothing
   * rather than a half-filled sheet.
   *
   * IT WAITS FOR THE FIRST LOAD, AND THAT IS NOT A POLISH DETAIL. AddBlockSheet
   * decides at MOUNT whether it has a suggestion to offer, and latches manual
   * mode when it does not — the reason `sheetSession` exists at all. Opening
   * the seeded sheet on the first render, before getFocusRhythms has resolved,
   * therefore mounts it against an empty windows array and latches it into
   * no-suggestion mode permanently: the rhythm card appears a moment later, but
   * the primary still says "Save" and nothing will place the block for you. The
   * whole point of seeding from a task is that the WHEN question then gets the
   * engine's answer, so opening a beat later is the correct trade. Found by the
   * suggestion test below, which is why that test asserts the primary's LABEL
   * rather than only the card's presence.
   *
   * The ref is what makes "once" independent of the extra `loading` dependency.
   * Params identity alone would be enough with a single dep, but loading flips
   * once after mount, and a one-shot that relies on two facts staying true is a
   * one-shot waiting to break.
   */
  const params = route.params;
  const consumedSeed = useRef<object | null>(null);
  useEffect(() => {
    // The rhythm read has not landed yet; opening now would latch the sheet.
    if (loading) return;
    if (!params || consumedSeed.current === params) return;

    const title = params.seedTitle;
    const demand = asDemand(params.seedDemand);
    const taskId = params.seedTaskId;
    if (!title || !demand || !taskId) return;

    consumedSeed.current = params;
    setSaveFailed(false);
    setTomorrowNotice(null);
    setOverlapWith(null);
    // Create mode, not edit: a seeded block does not exist yet.
    setEditing(null);
    setSeed({ title, demand, sourceTaskId: taskId });
    setTab('today');
    setSheetSession((n) => n + 1);
    setSheetOpen(true);
  }, [params, loading]);

  const isTomorrow = tab === 'tomorrow';
  const suggestion = useMemo(() => suggestPlacement(windows, now), [windows, now]);

  const atCap = blocks.length >= MAX_BLOCKS_PER_DAY;

  const handleConfirm = useCallback(
    async (draft: NewBlockDraft) => {
      if (!uid) return;
      setSaving(true);
      setSaveFailed(false);
      // Computed BEFORE the write, because load() below re-reads the clock.
      //
      // VERIFIED ON THE ROUND-2 WALK: this is not a data bug. The sheet's
      // dateAtHour advances the DATE before setting the hour, so an accepted
      // tomorrow suggestion stores tomorrow's real instant, exactly as calendar
      // export will need it. What it cannot do is appear in this list, which
      // covers today only. The block is right; the view is narrow.
      //
      // So the invisibility is acknowledged rather than hidden, and is
      // TEMPORARY: TB-1c adds the Tomorrow view, at which point this notice
      // stops being the only evidence the block exists and can go.
      const landsTomorrow = !isSameDay(draft.startAt, new Date());
      const original = editing;
      try {
        // OVERLAP CHECK, against the day actually being written to. For today
        // that is the list already on screen; for a rollover suggestion it is
        // tomorrow's, which this view has never loaded, so it is fetched. Doing
        // it here rather than in the sheet keeps the sheet writeless and keeps
        // the rule next to the only code that can create a block.
        //
        // NOT a data invariant: the service has no such rule and the rules
        // layer cannot express one. Two devices racing can still interleave.
        // This is a UI guard against the mistake a person actually makes.
        const sameDayAsView = isSameDay(draft.startAt, anchorFor(tab, new Date()));
        const targetDay = sameDayAsView
          ? blocks
          : await (async () => {
              const { start, end } = dayBounds(draft.startAt);
              return listDayBlocksBetween(uid, start, end);
            })();

        const conflict = findOverlap(
          targetDay,
          draft.startAt,
          draft.durationMinutes,
          // A block being edited cannot collide with ITSELF: stretching a
          // 60-minute block to 90 overlaps its own old span every time.
          original?.id
        );
        if (conflict) {
          setOverlapWith(conflict.title);
          setSaving(false);
          return;
        }
        setOverlapWith(null);

        if (original) {
          // SUGGESTEDFROM ON EDIT is data honesty, not copy. The field records
          // that THIS time came from an accepted rhythm suggestion. Move the
          // time and that stops being true, so the provenance is cleared rather
          // than left pointing at a zone the block no longer sits in. Leave the
          // time alone and it is still true, so it is preserved by omission.
          const startMoved =
            original.startAt.toDate().getTime() !== draft.startAt.getTime();

          // SOURCETASKID ON A TITLE EDIT (TB-3). The same shape as the rule
          // directly above, reached by a different argument, and the difference
          // is worth stating because the obvious reasoning is wrong.
          //
          // The field is NOT falsified by a rename. This block really did come
          // from that task, and renaming it does not un-happen. What breaks is
          // the only thing the field is for: its sole consumer is the "Blocked"
          // chip on the Tasks screen, and that chip is an IDENTITY CLAIM shown
          // to a person — "this task, that window". Once the block's title and
          // the task's title diverge, the claim is no longer checkable by the
          // person reading it. The task says "Expense report" and the block it
          // points at says something else, so the chip can only mislead.
          //
          // Its usefulness and its truthfulness therefore expire together, and
          // there is no second reader that wants the provenance kept. So it is
          // cleared, and cleared the same way suggestedFrom is: null in, a real
          // field delete out, never a stored null.
          //
          // Trimmed on both sides, because the confirm path trims before it
          // writes — comparing a trimmed draft against an untrimmed original
          // would report a rename for a stray space.
          const titleChanged = draft.title.trim() !== original.title.trim();
          const linkBroken = titleChanged && !!original.sourceTaskId;

          await updateDayBlock(original.id, {
            title: draft.title,
            demand: draft.demand,
            durationMinutes: draft.durationMinutes,
            startAt: draft.startAt,
            isProtected: draft.isProtected,
            ...(startMoved ? { suggestedFrom: null } : {}),
            ...(linkBroken ? { sourceTaskId: null } : {}),
          });
        } else {
          await createDayBlock(uid, draft);
        }
        setSheetOpen(false);
        // The seed has done its job the moment the block is written. Held any
        // longer it is just state waiting to be misread.
        setSeed(null);
        await load();
        setTomorrowNotice(
          // Only meaningful from the Today tab: on the Tomorrow tab the block
          // is right there in the list the user is already looking at.
          landsTomorrow && tab === 'today'
            ? placedForTomorrow(zoneLabel(draft.suggestedFrom))
            : null
        );
      } catch (error) {
        logger.error('[DayBlocks] create failed:', error);
        // The sheet stays open with the draft intact; retry costs one tap.
        setSaveFailed(true);
      } finally {
        setSaving(false);
      }
    },
    [uid, load, blocks, tab, editing]
  );

  /**
   * Remove, behind the codebase's existing destructive confirm.
   *
   * Mirrors HabitDetailScreen's Alert, including its deliberate omission of
   * `style: 'destructive'`: removing a block you placed yourself is an
   * intentional act, not an error, which is the same reasoning that made the
   * button Muted Sage Gray rather than coral.
   */
  const handleRemove = useCallback(
    (block: DayBlock) => {
      Alert.alert(REMOVE_CONFIRM_TITLE, REMOVE_CONFIRM_BODY, [
        { text: REMOVE_CONFIRM_CANCEL, style: 'cancel' },
        {
          text: REMOVE_CONFIRM_ACCEPT,
          onPress: async () => {
            try {
              await deleteDayBlock(block.id);
              setSheetOpen(false);
              setEditing(null);
              await load();
            } catch (error) {
              logger.error('[DayBlocks] remove failed:', error);
              Alert.alert(REMOVE_CONFIRM_TITLE, REMOVE_FAILED);
            }
          },
        },
      ]);
    },
    [load]
  );

  /** Opens the sheet on an existing block. */
  const handleEdit = useCallback((block: DayBlock) => {
    setSaveFailed(false);
    setOverlapWith(null);
    setTomorrowNotice(null);
    setEditing(block);
    // An edit is never seeded. Leaving a stale seed here would let an abandoned
    // Block it draft attach its provenance to an unrelated existing block.
    setSeed(null);
    setSheetSession((n) => n + 1);
    setSheetOpen(true);
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} testID="day-blocks">
        <Text style={styles.title}>{isTomorrow ? TOMORROW_TITLE : DAY_TITLE}</Text>
        <Text style={styles.intro}>{isTomorrow ? TOMORROW_INTRO : DAY_INTRO}</Text>

        {/* TWO TEXT TABS, not a chip row. At two options on a page that already
            carries chips inside its sheet, bordered chips read as a form
            control the user must answer; an underlined text pair reads as
            "where am I", which is what this is. Calmer at this size, and it
            keeps SelectChip meaning "pick a value" everywhere it appears. */}
        <View style={styles.tabs} accessibilityRole="tablist">
          {(['today', 'tomorrow'] as DayTab[]).map((key) => {
            const selected = tab === key;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.tab, selected && styles.tabSelected]}
                onPress={() => setTab(key)}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                accessibilityLabel={key === 'today' ? TAB_TODAY : TAB_TOMORROW}
                testID={`day-blocks-tab-${key}`}
              >
                <Text style={[styles.tabLabel, selected && styles.tabLabelSelected]}>
                  {key === 'today' ? TAB_TODAY : TAB_TOMORROW}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

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
            {/* TODAY ONLY. The strip's whole job is to show today's placements
                against the rhythm windows the user is living through right now.
                Drawn for tomorrow it would shade windows nobody is in yet and
                invite reading a forecast into it, which is speculation the
                strip cannot support. Parked for the separate strip design pass
                rather than decided here. */}
            {!isTomorrow && blocks.length > 0 && (
              <DayShapeStrip blocks={blocks} windows={windows} />
            )}

            {blocks.length === 0 ? (
              <Text style={styles.empty} testID="day-blocks-empty">
                {isTomorrow ? TOMORROW_EMPTY : EMPTY_LINE}
              </Text>
            ) : (
              blocks.map((block) => (
                <BlockCard
                  key={block.id}
                  block={block}
                  now={now}
                  onEdit={handleEdit}
                />
              ))
            )}

            {tomorrowNotice && (
              <Text style={styles.tomorrowNotice} testID="day-blocks-tomorrow-notice">
                {tomorrowNotice}
              </Text>
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
                  setTomorrowNotice(null);
                  setOverlapWith(null);
                  setEditing(null);
                  // A hand-started block, by definition. It must not inherit a
                  // seed from an earlier "Block it" the user backed out of.
                  setSeed(null);
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
        dayAnchor={editing ? editing.startAt.toDate() : anchorFor(tab, now)}
        // Editing adjusts a concrete time; the Tomorrow tab places into a
        // specific day. Neither is a moment for a "what comes next" suggestion.
        manualOnly={!!editing || isTomorrow}
        initialBlock={editing}
        seed={seed}
        onRemove={editing ? () => handleRemove(editing) : undefined}
        saving={saving}
        saveFailed={saveFailed}
        overlapWith={overlapWith}
        onConfirm={handleConfirm}
        onDismiss={() => {
          setSheetOpen(false);
          setEditing(null);
          // Discarding a seeded draft discards the LINK too. Nothing was
          // written, so there is nothing to point at.
          setSeed(null);
        }}
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
  tabs: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  tab: {
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabSelected: {
    borderBottomColor: Colors.evergreenTeal,
  },
  tabLabel: {
    fontSize: Typography.fontSize.base,
    color: Colors.mutedSageGray,
  },
  tabLabelSelected: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.semibold,
  },
  loading: {
    marginTop: Spacing.xl,
  },
  empty: {
    ...TextStyles.body,
    color: Colors.mutedSageGray,
    marginBottom: Spacing.lg,
  },
  // Calm and informational, never an error: the save succeeded. Sits directly
  // above the CTA, where the user's attention already is after confirming.
  tomorrowNotice: {
    ...TextStyles.bodySmall,
    color: Colors.mutedSageGray,
    textAlign: 'center',
    marginTop: Spacing.md,
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
