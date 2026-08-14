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
 * NO CLEARING AFFORDANCE AT TB-2b. Swipe-to-clear is TB-2c and is still an open
 * design decision — blocks removed swipe as undiscoverable, and whether a task
 * is different enough to re-introduce it is a human call. Nothing here should
 * be shaped around the assumption that it lands.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { Colors, Layout, Spacing, TextStyles, Typography } from '../../constants';
import { useAuth } from '../../context/AuthContext';
import { logger } from '../../utils/logger';
import {
  createCapturedTask,
  listCapturedTasks,
} from '../../services/firebase/capturedTasks.service';
import type { CapturedTask } from '../../types/models';
import { groupTasksByDemand } from './groupTasks';
import { TaskRow } from './components/TaskRow';
import { CaptureTaskSheet, type NewTaskDraft } from './CaptureTaskSheet';
import {
  CAPTURE_A11Y_HINT,
  CAPTURE_TARGET,
  EMPTY_LINE,
  GROUP_HEADERS,
  TASKS_INTRO,
  TASKS_TITLE,
} from './tasksCopy';

const MIN_TOUCH_TARGET = 48;

export function CapturedTasksScreen() {
  const { user } = useAuth();

  const [tasks, setTasks] = useState<CapturedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

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
      setLoading(false);
      return;
    }
    try {
      setTasks(await listCapturedTasks(uid));
    } catch (error) {
      // Best effort: an empty list is a legitimate state, so a read failure
      // shows the empty copy rather than an error screen.
      logger.error('[CapturedTasks] load failed:', error);
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

  // Grouping and ordering are client-side by design — see groupTasks.ts. The
  // service query stays a bare equality with no orderBy, and a spine test pins
  // that, so this memo is the only thing deciding what order anything appears in.
  const groups = useMemo(() => groupTasksByDemand(tasks), [tasks]);

  const openSheet = useCallback(() => {
    setSaveFailed(false);
    setSheetSession((n) => n + 1);
    setSheetOpen(true);
  }, []);

  const handleConfirm = useCallback(
    async (draft: NewTaskDraft) => {
      if (!uid) return;
      setSaving(true);
      setSaveFailed(false);
      try {
        await createCapturedTask(uid, draft);
        setSheetOpen(false);
        await load();
      } catch (error) {
        logger.error('[CapturedTasks] create failed:', error);
        // The sheet stays open with the draft intact; retry costs one tap.
        setSaveFailed(true);
      } finally {
        setSaving(false);
      }
    },
    [uid, load]
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
              {group.tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  testID={`captured-tasks-row-${task.id}`}
                />
              ))}
            </View>
          ))
        )}
      </ScrollView>

      <CaptureTaskSheet
        key={`capture-task-${sheetSession}`}
        visible={sheetOpen}
        saving={saving}
        saveFailed={saveFailed}
        onConfirm={handleConfirm}
        onDismiss={() => setSheetOpen(false)}
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
