/**
 * Tasks (TB-2b, mockup C).
 *
 * THE CAPTURE FIELD IS THE PRIMARY ACTION, and the screen is arranged around
 * that: it sits directly under the intro, above everything it produces, and
 * there is no competing CTA anywhere on the page. The mockup's annotation is
 * explicit — "capture field is the primary action of this screen. No big CTA
 * competing with it." That is why this screen has no bottom button, unlike the
 * day view, whose primary genuinely is "Add a block".
 *
 * IT IS A FIELD-STYLED TAP TARGET, NOT A LIVE INPUT, and this is a settled
 * decision rather than a shortcut. It looks like somewhere to type; its only
 * behaviour is opening the capture sheet. The reason is the demand gate: a task
 * is a name AND a tag, so a bare inline input could produce a nameless-tagless
 * row on submit and would need its own demand affordance to prevent that —
 * which is the sheet, rebuilt inline. InlineCreateButton is the interaction
 * donor (a calm, full-width, non-FAB create affordance); the field styling
 * comes from the mockup. It carries role="button" so assistive tech is told
 * what it actually does rather than being promised a text field.
 *
 * OWNS THE WRITES. CaptureTaskSheet is presentational and hands a draft up
 * once; createCapturedTask is called here. Same split as DayBlocksScreen, and
 * it is what keeps an abandoned sheet from leaving anything behind.
 *
 * EDITING AND CLEARING ARE A TAP, NOT A SWIPE (TB-2c). The Step-0 question was
 * answered by the device walk: swipe stays dead app-wide, so gesture-handler
 * and reanimated are not reintroduced. Tapping a row opens the same sheet in
 * edit mode, and clearing lives inside it behind a confirm. That keeps exactly
 * one primary action on the screen — capture — with every change to an existing
 * task one level down, and it means blocks and tasks now answer the destructive
 * action question the same way.
 *
 * IT READS BLOCKS AS OF TB-3, AND ONLY TO DECORATE (the bridge). A task that has
 * been placed shows a "Blocked · 9:00 AM" chip, and the action that places one
 * lives in the edit sheet beside Clear. Three things are worth knowing:
 *
 *   - The link is DERIVED, never stored on the task. Blocks carry
 *     `sourceTaskId`; nothing on CapturedTask points at a block, so the entity
 *     stays timeless and neither deletion direction needs a cleanup write.
 *   - The two reads are settled SEPARATELY. A blocks failure costs the chips
 *     and nothing else; it must never be able to empty the task list.
 *   - This screen still writes no blocks. Block it navigates; the day view
 *     owns every dayBlocks write, as it always has.
 */
import React, { useCallback, useMemo, useState } from 'react';
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
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Colors, Layout, Spacing, TextStyles, Typography } from '../../constants';
import { ROUTES } from '../../navigation/routes';
import { useAuth } from '../../context/AuthContext';
import { logger } from '../../utils/logger';
import {
  createCapturedTask,
  deleteCapturedTask,
  listCapturedTasks,
  updateCapturedTask,
} from '../../services/firebase/capturedTasks.service';
import { listDayBlocksBetween } from '../../services/firebase/dayBlocks.service';
import type { CapturedTask, DayBlock } from '../../types/models';
import { groupTasksByDemand } from './groupTasks';
import { blockedFor } from './blockedFor';
import { blockedAt } from './blocksCopy';
import { TaskRow } from './components/TaskRow';
import { CaptureTaskSheet, type NewTaskDraft } from './CaptureTaskSheet';
import {
  CAPTURE_A11Y_HINT,
  CAPTURE_TARGET,
  CLEAR_CONFIRM_ACCEPT,
  CLEAR_CONFIRM_BODY,
  CLEAR_CONFIRM_CANCEL,
  CLEAR_CONFIRM_TITLE,
  CLEAR_FAILED,
  EMPTY_LINE,
  GROUP_HEADERS,
  TASKS_INTRO,
  TASKS_TITLE,
} from './tasksCopy';

const MIN_TOUCH_TARGET = 48;

/**
 * The window the "Blocked" chip cares about: from local midnight today to local
 * midnight the day after tomorrow, so today and tomorrow are both covered by ONE
 * range query on the existing (userId, startAt) composite index.
 *
 * TODAY AND TOMORROW ONLY, and that matches the scope everywhere else: the day
 * view has exactly these two tabs, and a block whose day has already passed is
 * not meaningfully a plan any more — the day view marks such blocks "Earlier
 * today" and gives them no done state precisely because they are history rather
 * than intent. A chip claiming a task is Blocked against yesterday would be
 * pointing at something the rest of the feature has already stopped counting.
 */
function chipWindow(now: Date): { start: Date; end: Date } {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 2);
  return { start, end };
}

type NavigationProp = NativeStackNavigationProp<{
  FocusDayBlocks:
    | { seedTitle?: string; seedDemand?: string; seedTaskId?: string }
    | undefined;
}>;

export function CapturedTasksScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp>();

  const [tasks, setTasks] = useState<CapturedTask[]>([]);
  /**
   * Today's and tomorrow's blocks, loaded only to derive the "Blocked" chip.
   *
   * This screen still owns no block writes and offers no block UI. It reads
   * them, matches them against its own tasks, and renders a label.
   */
  const [blocks, setBlocks] = useState<DayBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  /** The task the sheet is open on, or null when capturing a new one. */
  const [editing, setEditing] = useState<CapturedTask | null>(null);

  /**
   * Bumped every time the sheet opens, and used as its `key` so it REMOUNTS.
   *
   * Without this a second open inherits the previous draft's title and demand.
   * Remounting resets both at the one moment that matters, while keeping the
   * modal mounted afterwards so it can animate out.
   */
  const [sheetSession, setSheetSession] = useState(0);

  // Keyed on the UID, not the user OBJECT. useFocusEffect re-runs whenever this
  // callback's identity changes, so depending on the object would turn any
  // provider that returns a fresh value per render into an unbounded
  // load/setState/re-render loop. That bug cost a device-walk round in TB-1b;
  // the uid is what actually decides whose list this is.
  const uid = user?.uid;
  const load = useCallback(async () => {
    if (!uid) {
      setTasks([]);
      setBlocks([]);
      setLoading(false);
      return;
    }

    /**
     * THE TWO READS ARE SETTLED SEPARATELY, NEVER AWAITED TOGETHER, and this is
     * a correctness decision rather than a style one.
     *
     * The tasks read is what the screen IS. The blocks read only decorates it.
     * Put both in one `Promise.all` inside one try, as the day view does with
     * its own two reads, and a dayBlocks failure rejects the pair and takes the
     * tasks list down with it — the user loses their entire capture list
     * because a chip could not be drawn. The failure modes are ranked, so the
     * error handling has to be too:
     *
     *   tasks read fails    the screen shows its empty copy, as it always has.
     *   blocks read fails   NO CHIPS, and nothing else changes. Every task is
     *                       still listed, editable, clearable and blockable.
     *
     * They still run CONCURRENTLY — allSettled starts both at once — so this
     * costs nothing in latency. A test pins the degradation.
     */
    const { start, end } = chipWindow(new Date());
    const [taskResult, blockResult] = await Promise.allSettled([
      listCapturedTasks(uid),
      listDayBlocksBetween(uid, start, end),
    ]);

    if (taskResult.status === 'fulfilled') {
      setTasks(taskResult.value);
    } else {
      // Best effort: an empty list is a legitimate state, so a read failure
      // shows the empty copy rather than an error screen.
      logger.error('[CapturedTasks] load failed:', taskResult.reason);
    }

    if (blockResult.status === 'fulfilled') {
      setBlocks(blockResult.value);
    } else {
      // Chips only. The list above is unaffected, which is the whole point of
      // settling these separately.
      logger.error('[CapturedTasks] block read failed:', blockResult.reason);
      setBlocks([]);
    }

    setLoading(false);
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

  // Grouping and ordering are client-side by design — see groupTasks.ts. The
  // service query stays a bare equality with no orderBy, and a spine test pins
  // that, so this memo is the only thing deciding what order anything appears in.
  const groups = useMemo(() => groupTasksByDemand(tasks), [tasks]);

  // The block on each task that has one, derived rather than stored. See
  // blockedFor.ts for why the link is read block -> task and never the reverse.
  const blockByTask = useMemo(() => blockedFor(tasks, blocks), [tasks, blocks]);

  const openSheet = useCallback(() => {
    setSaveFailed(false);
    setEditing(null);
    setSheetSession((n) => n + 1);
    setSheetOpen(true);
  }, []);

  /** Opens the sheet on an existing task. */
  const handleEdit = useCallback((task: CapturedTask) => {
    setSaveFailed(false);
    setEditing(task);
    setSheetSession((n) => n + 1);
    setSheetOpen(true);
  }, []);

  const handleConfirm = useCallback(
    async (draft: NewTaskDraft) => {
      if (!uid) return;
      const original = editing;
      setSaving(true);
      setSaveFailed(false);
      try {
        if (original) {
          // Both fields every time. The sheet cannot express "leave this one
          // alone" — it has two inputs and both are always populated in edit
          // mode — so sending both is honest about what the user just saw and
          // approved. The service still constructs its payload from an
          // allowlist, so nothing beyond these two can reach Firestore.
          await updateCapturedTask(original.id, {
            title: draft.title,
            demand: draft.demand,
          });
        } else {
          await createCapturedTask(uid, draft);
        }
        setSheetOpen(false);
        setEditing(null);
        await load();
      } catch (error) {
        logger.error('[CapturedTasks] save failed:', error);
        // The sheet stays open with the draft intact; retry costs one tap.
        setSaveFailed(true);
      } finally {
        setSaving(false);
      }
    },
    [uid, load, editing]
  );

  /**
   * Clear, behind the codebase's existing destructive confirm.
   *
   * Mirrors the block-removal Alert from TB-1c, including its deliberate
   * omission of `style: 'destructive'`: clearing a task you captured yourself
   * is an intentional act, not an error, which is the same reasoning that makes
   * the button Muted Sage Gray rather than coral.
   *
   * A task is cheaper to lose than a block — the recovery cost is retyping a
   * line — but it still confirms, because the delete is real and keeps no
   * history. Cheap-to-redo is a reason for gentle wording, not for skipping the
   * question.
   */
  const handleClear = useCallback(
    (task: CapturedTask) => {
      Alert.alert(CLEAR_CONFIRM_TITLE, CLEAR_CONFIRM_BODY, [
        { text: CLEAR_CONFIRM_CANCEL, style: 'cancel' },
        {
          text: CLEAR_CONFIRM_ACCEPT,
          onPress: async () => {
            try {
              await deleteCapturedTask(task.id);
              setSheetOpen(false);
              setEditing(null);
              await load();
            } catch (error) {
              logger.error('[CapturedTasks] clear failed:', error);
              Alert.alert(CLEAR_CONFIRM_TITLE, CLEAR_FAILED);
            }
          },
        },
      ]);
    },
    [load]
  );

  /**
   * Hand the task off to the day view to be placed (TB-3).
   *
   * THE SEED IS ROUTE PARAMS, NOT A SECOND SHEET HOSTED HERE. AddBlockSheet
   * needs the user's rhythm windows, a placement suggestion, a day anchor and
   * the target day's existing blocks for its overlap check — all of which
   * DayBlocksScreen already holds. Rebuilding that here would put a second
   * writer of dayBlocks on a screen whose entire design is "capture is the only
   * primary action", and would leave the overlap guard applying from one entry
   * point and not the other.
   *
   * The sheet closes FIRST. Navigating out from under an open modal leaves it
   * mounted behind the pushed screen and visible again on the way back.
   */
  const handleBlockIt = useCallback(
    (task: CapturedTask) => {
      setSheetOpen(false);
      setEditing(null);
      navigation.navigate(ROUTES.FocusDayBlocks, {
        seedTitle: task.title,
        seedDemand: task.demand,
        seedTaskId: task.id,
      });
    },
    [navigation]
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} testID="captured-tasks">
        <Text style={styles.title}>{TASKS_TITLE}</Text>
        <Text style={styles.intro}>{TASKS_INTRO}</Text>

        {/* The primary action. Rendered ABOVE the list and in every state,
            including empty and loading: capture is the point of the screen, and
            making it wait on a read would mean the one moment you most want to
            put something down is the one moment you cannot. */}
        <TouchableOpacity
          style={styles.captureTarget}
          onPress={openSheet}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={CAPTURE_TARGET}
          // Says what the tap does, since the control LOOKS like a text field
          // and is not one. Read on focus, so nobody has to tap to find out.
          accessibilityHint={CAPTURE_A11Y_HINT}
          testID="captured-tasks-capture"
        >
          <Text style={styles.capturePlaceholder}>{CAPTURE_TARGET}</Text>
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator
            color={Colors.evergreenTeal}
            style={styles.loading}
            testID="captured-tasks-loading"
          />
        ) : groups.length === 0 ? (
          <Text style={styles.empty} testID="captured-tasks-empty">
            {EMPTY_LINE}
          </Text>
        ) : (
          groups.map((group) => (
            <View key={group.demand} testID={`captured-tasks-group-${group.demand}`}>
              {/* The header teaches the demand model in one line. Grouped as a
                  heading so screen-reader users can navigate by group rather
                  than walking every row. */}
              <Text
                style={styles.groupHeader}
                accessibilityRole="header"
                testID={`captured-tasks-header-${group.demand}`}
              >
                {GROUP_HEADERS[group.demand]}
              </Text>
              {group.tasks.map((task) => {
                const block = blockByTask.get(task.id);
                return (
                  <TaskRow
                    key={task.id}
                    task={task}
                    // Formatted here, not in the row: blockedAt keeps the
                    // meridiem rule inside blocksCopy, where formatClock is
                    // private and the note explaining it lives.
                    blockedLabel={block ? blockedAt(block.startAt.toDate()) : null}
                    onEdit={handleEdit}
                    testID={`captured-tasks-row-${task.id}`}
                  />
                );
              })}
            </View>
          ))
        )}
      </ScrollView>

      <CaptureTaskSheet
        key={`capture-task-${sheetSession}`}
        visible={sheetOpen}
        saving={saving}
        saveFailed={saveFailed}
        initialTask={editing}
        onClear={editing ? () => handleClear(editing) : undefined}
        // NOT SUPPLIED for a task that already has a block, which is how the
        // chip and the action are kept mutually exclusive: the sheet has no
        // branch for it, because there is no prop combination that renders
        // Block it on a blocked task.
        onBlockIt={
          editing && !blockByTask.has(editing.id)
            ? () => handleBlockIt(editing)
            : undefined
        }
        onConfirm={handleConfirm}
        onDismiss={() => {
          setSheetOpen(false);
          setEditing(null);
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
  // The mockup's .field.ph: a real field's border, radius and fill, with the
  // placeholder's muted text. It reads as somewhere to type; the role tells
  // assistive tech the truth.
  captureTarget: {
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.silverSage,
    borderRadius: Layout.borderRadius.md,
    backgroundColor: Colors.surface,
    marginBottom: Spacing.lg,
  },
  capturePlaceholder: {
    fontSize: Typography.fontSize.base,
    color: Colors.mutedSageGray,
  },
  loading: {
    marginTop: Spacing.xl,
  },
  empty: {
    ...TextStyles.body,
    color: Colors.mutedSageGray,
  },
  // The mockup's .ghead: small, spaced, muted. Quiet enough that the task names
  // stay the thing you read.
  groupHeader: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    letterSpacing: 0.4,
    color: Colors.mutedSageGray,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
  },
});

export default CapturedTasksScreen;
