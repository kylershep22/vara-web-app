/**
 * Habit Detail Screen
 *
 * One habit, on the surface the user chose to open. Accountability, not a
 * scoreboard (Voice & Tone v2.2 §3.4, Accountability Amendment):
 *
 *   - No streak, percentage, fraction against a target, completion rate, or
 *     assigned state ("great job!") appears anywhere on this screen.
 *   - Descriptive counts ARE permitted here, because the user navigated here to
 *     look. The test is whether a number can be FAILED: a cumulative total only
 *     grows, so it cannot. Those counts render inside sentences, never as large
 *     numerals in a stat row.
 *   - No clinical claims. The screen previously asserted that focus habits
 *     "strengthen prefrontal cortex pathways" and that five minutes "builds
 *     your brain's attention networks". Both are gone, and nothing here
 *     replaces them with a softer mechanism.
 *   - Coral is reserved for genuine errors. Removing your own habit is an
 *     intentional action, so it is Muted Sage Gray.
 */

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Text, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

// Direct paths, not the components barrel: the barrel pulls in the community
// and media trees (expo-video among them) for five small pieces.
import Button from '../components/Button';
import Input from '../components/Input';
import { EnhancedModal, ModalFooterActions } from '../components/shared/EnhancedModal';
import { BaseCard } from '../components/shared/BaseCard';
import { CardHeading } from '../components/dashboard/CardHeading';
import { IntentionEditSheet } from '../components/habits/IntentionEditSheet';
import { HabitNoteSheet } from '../components/habits/HabitNoteSheet';
import { HabitCategorySelect } from '../components/habits/HabitCategorySelect';
import { HabitWeekStrip } from '../components/habits/HabitWeekStrip';
import { HabitFourWeekView } from '../components/habits/HabitFourWeekView';
import {
  qualitativeNoticing,
  reportingLines,
  scheduleLabel,
  sinceLabel,
  timeOfDayLabel,
  toDateSafe,
} from '../components/habits/habitHistory';
import { localDateKey } from '../components/dashboard/habitWeekState';
import { habitCategoryLabel } from '../constants/habitTaxonomy';
import { Colors, Spacing, Typography, Layout } from '../constants';
import { useAuth } from '../context/AuthContext';
import {
  updateHabit,
  deleteHabit,
  getHabitCompletions,
  markHabitComplete,
  unmarkHabitComplete,
} from '../services/firebase';
import { useHabitNotePrompt, confirmCompletionNoteLoss } from '../hooks/useHabitNotePrompt';
import { logger } from '../utils/logger';
import { Habit, HabitCompletion, HabitIntention, ReminderTime } from '../types';
import { TimePickerSheet, formatReminderTime } from '../components/shared/TimePickerSheet';
import { canHabitHaveReminder } from '../utils/habitReminderPlan';
import { scheduleHabitReminder, cancelHabitReminder } from '../services/reminderScheduler.service';
import { ensureRemindersAllowed } from '../services/firebase/notificationPreferences.service';

/** Dew Sage (#D5E3D1) @62% — the metadata chip fill. */
const DEW_CHIP = 'rgba(213, 227, 209, 0.62)';

/** Most recent notes shown in "What you noted", when any exist. */
const MAX_NOTES = 3;

/** Seed for a habit that has never had a reminder. Matches the create sheet. */
const DEFAULT_REMINDER_TIME: ReminderTime = { hour: 8, minute: 0 };

type HabitDetailRouteParams = {
  HabitDetail: {
    habitId: string;
    habit: Habit;
  };
};

const HabitDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<HabitDetailRouteParams, 'HabitDetail'>>();
  const { habit: initialHabit } = route.params;
  const { user } = useAuth();

  const [habit, setHabit] = useState<Habit>(initialHabit);
  const [completions, setCompletions] = useState<HabitCompletion[]>([]);
  const [processing, setProcessing] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [intentionSheetVisible, setIntentionSheetVisible] = useState(false);
  // The legacy free-text `category` is deliberately NOT in this form. It used
  // to be an open text input here, which is how uncontrolled values got into
  // the field that the completion sheet routes on. Leaving it out means an edit
  // sends no `category` key at all, so updateHabit's partial write preserves
  // whatever the habit already had.
  const [formData, setFormData] = useState({
    name: habit.name,
    type: habit.type,
    frequency: habit.frequency,
    habitCategory: habit.habitCategory ?? null,
    identity: habit.identity || '',
    identityStatement: habit.identityStatement || '',
    notePromptEnabled: !!habit.notePromptEnabled,
    // Both halves must live here AND be re-seeded in handleEdit below, or an
    // unrelated edit would write the form's defaults over a real reminder.
    reminderEnabled: !!habit.reminderEnabled,
    reminderTime: habit.reminderTime ?? DEFAULT_REMINDER_TIME,
  });
  const [submitting, setSubmitting] = useState(false);
  const [reminderPickerVisible, setReminderPickerVisible] = useState(false);
  const { noteTarget, promptForNote, saveNote, dismissNote } = useHabitNotePrompt();

  // One clock for the whole render tree, so the week strip, the four-week view
  // and "today" cannot disagree across a midnight boundary mid-session.
  const now = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => localDateKey(now), [now]);

  // The habit's own name is the header title. Set here rather than as a static
  // navigator option so renaming it in the edit sheet retitles the header.
  useLayoutEffect(() => {
    navigation.setOptions({ title: habit.name });
  }, [navigation, habit.name]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const loaded = await getHabitCompletions(habit.id);
        if (!cancelled) setCompletions(loaded);
      } catch (error) {
        // A brand-new habit can transiently fail the subcollection read; the
        // service already swallows permission-denied and returns []. Anything
        // else leaves the cards in their sparse state rather than erroring the
        // whole screen.
        logger.error('Error loading habit completions:', error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [habit.id]);

  const completionDateKeys = useMemo(
    () => completions.filter((c) => c.completed !== false).map((c) => c.date),
    [completions]
  );

  const completedToday = completionDateKeys.includes(todayKey);

  const startDate = useMemo(() => toDateSafe(habit.createdAt), [habit.createdAt]);

  const lines = useMemo(
    () => reportingLines({ habit, completionDateKeys, startDate, today: now }),
    [habit, completionDateKeys, startDate, now]
  );

  const noticing = useMemo(() => qualitativeNoticing(habit), [habit]);

  // "What you noted" renders only when free-text notes exist. Nothing writes
  // `quickNote` yet — note capture is a separate slice — so today this is
  // always empty and the card does not render at all. It lights up on its own
  // when capture ships; it has no empty state by design.
  const notes = useMemo(
    () =>
      completions
        .filter((c) => typeof c.quickNote === 'string' && c.quickNote.trim().length > 0)
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, MAX_NOTES),
    [completions]
  );

  // Category joins the existing attribute row rather than getting a line of its
  // own: what kind of habit this is sits at the same level as its schedule,
  // time of day and start date. A null category contributes nothing and is
  // filtered out, so habits created before the capture show no gap.
  const chips = useMemo(
    () =>
      [
        scheduleLabel(habit),
        timeOfDayLabel(habit),
        sinceLabel(startDate),
        habitCategoryLabel(habit.habitCategory),
      ].filter((chip): chip is string => !!chip),
    [habit, startDate]
  );

  const handleToggleToday = useCallback(async () => {
    if (!user?.uid || processing) return;

    const wasCompleted = completedToday;

    // Only when undoing, and only when there is something to lose: a note
    // lives on the completion document that un-completing deletes.
    if (wasCompleted) {
      const proceed = await confirmCompletionNoteLoss(habit.id, todayKey);
      if (!proceed) return;
    }

    setProcessing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    // Optimistic: the mark and the button flip immediately, and roll back
    // together if the write fails.
    setCompletions((prev) =>
      wasCompleted
        ? prev.filter((c) => c.date !== todayKey)
        : [...prev, { date: todayKey, completed: true } as HabitCompletion]
    );

    try {
      if (wasCompleted) {
        await unmarkHabitComplete(habit.id, todayKey);
      } else {
        await markHabitComplete(habit.id, user.uid, todayKey, { source: 'track' });
        // Completion is saved. The note sheet is an addendum on top of it.
        promptForNote(habit, todayKey);
      }
    } catch (error) {
      logger.error('Error toggling habit completion:', error);
      setCompletions((prev) =>
        wasCompleted
          ? [...prev, { date: todayKey, completed: true } as HabitCompletion]
          : prev.filter((c) => c.date !== todayKey)
      );
      Alert.alert('Unable to save', 'That did not save. Please try again.');
    } finally {
      setProcessing(false);
    }
  }, [user, processing, completedToday, habit, todayKey, promptForNote]);

  // Re-read completions after a note lands so "What you noted" appears without
  // needing to leave and re-enter the screen.
  const handleSaveNote = useCallback(
    async (note: string) => {
      await saveNote(note);
      try {
        setCompletions(await getHabitCompletions(habit.id));
      } catch (error) {
        logger.error('Error reloading completions after note:', error);
      }
    },
    [saveNote, habit.id]
  );

  const handleEdit = () => {
    setFormData({
      name: habit.name,
      type: habit.type,
      frequency: habit.frequency,
      habitCategory: habit.habitCategory ?? null,
      identity: habit.identity || '',
      identityStatement: habit.identityStatement || '',
      notePromptEnabled: !!habit.notePromptEnabled,
      // Re-seeded from the habit, not left at the form's defaults: opening the
      // edit sheet to change a name must not quietly clear a reminder.
      reminderEnabled: !!habit.reminderEnabled,
      reminderTime: habit.reminderTime ?? DEFAULT_REMINDER_TIME,
    });
    setEditModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Add a name', 'Please enter a habit name.');
      return;
    }

    setSubmitting(true);
    try {
      // A habit whose schedule carries no cadence gets no reminder, and its
      // control is hidden — so never persist one from here either.
      const canRemind = canHabitHaveReminder(habit);
      const reminderEnabled = canRemind && formData.reminderEnabled;
      const patch = {
        ...formData,
        reminderEnabled,
        reminderTime: reminderEnabled ? formData.reminderTime : null,
      };

      await updateHabit(habit.id, patch);
      const updated = { ...habit, ...patch };
      setHabit(updated);

      // Reschedule from the saved state. cancelHabitReminder clears the habit's
      // WHOLE identifier set, so shrinking Mon/Wed/Fri to Mon/Tue cannot leave
      // Wed and Fri firing; scheduling then writes only what the habit now says.
      await cancelHabitReminder(habit.id);
      if (reminderEnabled) {
        await ensureRemindersAllowed(updated.userId);
        await scheduleHabitReminder(updated);
      }

      setEditModalVisible(false);
    } catch (error) {
      logger.error('Error updating habit:', error);
      Alert.alert('Unable to save', 'Failed to update habit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = () => {
    Alert.alert(
      'Remove habit',
      'This removes the habit and its history. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          // Deliberately not `style: 'destructive'`. Removing a habit you chose
          // is an intentional action, not an error state.
          text: 'Remove',
          onPress: async () => {
            try {
              // Before the delete: a removed habit must not keep firing. This
              // screen previously deleted without cancelling, which was
              // harmless only because nothing scheduled habit reminders yet.
              await cancelHabitReminder(habit.id);
              await deleteHabit(habit.id);
              navigation.goBack();
            } catch (error) {
              logger.error('Error removing habit:', error);
              Alert.alert('Unable to remove', 'Failed to remove habit.');
            }
          },
        },
      ]
    );
  };

  const handleSaveIntention = async (intention?: HabitIntention) => {
    try {
      await updateHabit(habit.id, { intention: intention ?? (null as any) });
      setHabit({ ...habit, intention: intention || undefined });
    } catch (error) {
      logger.error('Error updating intention:', error);
      Alert.alert('Unable to save', 'Failed to update. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Metadata. Chips, not a labelled row: schedule, time of day and start
            date are attributes of the habit, not measurements of the user. */}
        {chips.length > 0 && (
          <View style={styles.chipRow} testID="habit-detail-chips">
            {chips.map((chip) => (
              <View key={chip} style={styles.chip}>
                <Text style={styles.chipText}>{chip}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Primary action. A calm state change: the button swaps to an outline
            "Completed today" and tapping it undoes the completion. No
            celebration, no animation beyond the mark's own 150ms crossfade. */}
        <Button
          variant={completedToday ? 'outline' : 'primary'}
          icon={completedToday ? 'check-circle-outline' : 'check'}
          onPress={handleToggleToday}
          disabled={processing}
          fullWidth
          style={styles.primaryAction}
          accessibilityLabel={completedToday ? 'Completed today, tap to undo' : 'Complete today'}
          testID="habit-detail-complete-today"
        >
          {completedToday ? 'Completed today' : 'Complete today'}
        </Button>

        {/* ── This week ────────────────────────────────────────────── */}
        <BaseCard style={styles.card}>
          <CardHeading
            icon="calendar-blank-outline"
            title="This week"
            style={styles.cardHeading}
          />
          <HabitWeekStrip
            habit={habit}
            completions={completionDateKeys}
            onToggleToday={handleToggleToday}
            processing={processing}
            now={now}
          />
          {noticing && (
            <Text style={styles.noticing} testID="habit-detail-noticing">
              {noticing}
            </Text>
          )}
        </BaseCard>

        {/* ── Since you started ────────────────────────────────────── */}
        <BaseCard style={styles.card}>
          <CardHeading
            icon="chart-timeline-variant"
            title="Since you started"
            style={styles.cardHeading}
          />
          <HabitFourWeekView completions={completionDateKeys} now={now} />

          {/* Descriptive sentences with the value emphasised, never numerals
              standing alone. A line the habit is too new to support is omitted
              rather than rendered as a zero. */}
          {lines.length > 0 && (
            <View style={styles.lines} testID="habit-detail-reporting-lines">
              {lines.map((line) => (
                <Text key={line.id} style={styles.line} testID={`reporting-line-${line.id}`}>
                  <Text style={styles.lineEmphasis}>{line.emphasis}</Text>
                  {line.rest}
                </Text>
              ))}
            </View>
          )}
        </BaseCard>

        {/* ── What you noted (only when notes exist) ───────────────── */}
        {notes.length > 0 && (
          <BaseCard style={styles.card} testID="habit-detail-notes">
            <CardHeading
              icon="note-text-outline"
              title="What you noted"
              style={styles.cardHeading}
            />
            {notes.map((note) => (
              <View key={note.date} style={styles.note}>
                <Text style={styles.noteDate}>{relativeDate(note.date, todayKey)}</Text>
                <Text style={styles.noteText}>{note.quickNote}</Text>
              </View>
            ))}
          </BaseCard>
        )}

        {/* ── Why this one ─────────────────────────────────────────── */}
        <BaseCard style={styles.card} testID="habit-detail-why">
          <View style={styles.whyHeader}>
            <CardHeading
              icon="heart-outline"
              title="Why this one"
              style={styles.whyHeading}
            />
            {habit.intention && (
              <TouchableOpacity
                onPress={() => setIntentionSheetVisible(true)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel="Edit your reason"
                testID="habit-detail-why-edit"
              >
                <Icon name="pencil" size={16} color={Colors.mutedSageGray} />
              </TouchableOpacity>
            )}
          </View>

          {/* The user's own words. NEVER generated: no inference from the habit
              title, no canned suggestion. A machine-written reason for a habit
              the user chose is worse than no reason. */}
          {habit.intention ? (
            <Text style={styles.whyText}>{habit.intention.label}</Text>
          ) : (
            <>
              <Text style={styles.whyEmpty}>
                Remind yourself why this one matters to you.
              </Text>
              <TouchableOpacity
                onPress={() => setIntentionSheetVisible(true)}
                style={styles.whyCta}
                accessibilityRole="button"
                accessibilityLabel="Add your reason"
                testID="habit-detail-why-add"
              >
                <Text style={styles.whyCtaLabel}>Add your reason ›</Text>
              </TouchableOpacity>
            </>
          )}
        </BaseCard>

        {/* ── Look back ────────────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.lookBack}
          onPress={() => navigation.navigate('Insights')}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Look back. Longer patterns across all your habits."
          testID="habit-detail-look-back"
        >
          <Icon name="history" size={20} color={Colors.mutedSageGray} />
          <View style={styles.lookBackText}>
            <Text style={styles.lookBackTitle}>Look back</Text>
            <Text style={styles.lookBackSubtitle}>
              Longer patterns across all your habits.
            </Text>
          </View>
          <Icon name="chevron-right" size={20} color={Colors.silverSage} />
        </TouchableOpacity>

        {/* ── Footer actions ───────────────────────────────────────── */}
        <View style={styles.actionsContainer}>
          <Button variant="outline" onPress={handleEdit} fullWidth testID="habit-detail-edit">
            Edit habit
          </Button>

          {/* Muted Sage Gray, never coral: this is an intentional action, not
              an error. */}
          <Button
            variant="text"
            onPress={handleRemove}
            fullWidth
            textColor={Colors.mutedSageGray}
            testID="habit-detail-remove"
          >
            Remove habit
          </Button>
        </View>
      </ScrollView>

      {/* Edit Modal */}
      <EnhancedModal
        visible={editModalVisible}
        onDismiss={() => setEditModalVisible(false)}
        title="Edit habit"
        subtitle="Update your habit details"
        headerIcon="pencil"
        inputAccessoryViewID="habit-edit-modal"
        footer={
          <ModalFooterActions
            onCancel={() => setEditModalVisible(false)}
            onSubmit={handleSubmit}
            submitLabel="Save"
            submitLoading={submitting}
            submitDisabled={submitting}
          />
        }
      >
        <Input
          label="Habit Name *"
          value={formData.name}
          onChangeText={(text) => setFormData({ ...formData, name: text })}
          placeholder="e.g., Morning meditation"
          style={styles.input}
          inputAccessoryViewID="habit-edit-modal"
        />

        {/* Was a free-text input. Now the same controlled chip group the create
            sheet uses, bound to the new field. Unlike create, a pick is NOT
            required here: habits created before this capture open with nothing
            selected, and forcing a choice to save an unrelated edit would be a
            retroactive classification the user never asked for. */}
        <HabitCategorySelect
          value={formData.habitCategory}
          onChange={(key) => setFormData({ ...formData, habitCategory: key })}
          testIDPrefix="habit-edit-category"
        />

        <Input
          label="Identity (Who are you becoming?)"
          value={formData.identity}
          onChangeText={(text) => setFormData({ ...formData, identity: text })}
          placeholder="e.g., A mindful person"
          style={styles.input}
          inputAccessoryViewID="habit-edit-modal"
        />

        <Input
          label="Identity Statement"
          value={formData.identityStatement}
          onChangeText={(text) => setFormData({ ...formData, identityStatement: text })}
          placeholder="e.g., I'm becoming someone who starts each day with clarity"
          multiline
          numberOfLines={2}
          style={styles.input}
          inputAccessoryViewID="habit-edit-modal"
        />

        {/* Reminder. Days are inherited from the habit's own schedule and shown
            read-only — no second day-picker, which would be able to contradict
            the schedule chip at the top of this screen. Hidden entirely for a
            habit that declares no cadence to inherit. */}
        {canHabitHaveReminder(habit) && (
          <View testID="habit-edit-reminder">
            <View style={styles.noteToggleRow}>
              <View style={styles.noteToggleText}>
                <Text style={styles.noteToggleLabel}>Remind me</Text>
                <Text style={styles.noteToggleHelper}>
                  {scheduleLabel(habit)
                    ? `On your ${scheduleLabel(habit)!.toLowerCase()} schedule.`
                    : 'On this habit’s schedule.'}
                </Text>
              </View>
              <Switch
                value={formData.reminderEnabled}
                onValueChange={(value) => setFormData({ ...formData, reminderEnabled: value })}
                trackColor={{ false: '#D5E3D1', true: Colors.evergreenTeal }}
                thumbColor="#fff"
                accessibilityLabel="Remind me"
                testID="habit-edit-reminder-toggle"
              />
            </View>

            {formData.reminderEnabled && (
              <TouchableOpacity
                style={styles.reminderTimeRow}
                onPress={() => setReminderPickerVisible(true)}
                accessibilityRole="button"
                accessibilityLabel={`Reminder time, ${formatReminderTime(formData.reminderTime)}. Tap to change.`}
                testID="habit-edit-reminder-time"
              >
                <Text style={styles.reminderTimeLabel}>Time</Text>
                <Text style={styles.reminderTimeValue}>
                  {formatReminderTime(formData.reminderTime)}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* The note prompt follows the habit, so turning it on here changes
            every surface this habit can be completed from. */}
        <View style={styles.noteToggleRow}>
          <View style={styles.noteToggleText}>
            <Text style={styles.noteToggleLabel}>Add a note when I complete this</Text>
            <Text style={styles.noteToggleHelper}>A quick line you can look back on.</Text>
          </View>
          <Switch
            value={formData.notePromptEnabled}
            onValueChange={(value) => setFormData({ ...formData, notePromptEnabled: value })}
            trackColor={{ false: '#D5E3D1', true: Colors.evergreenTeal }}
            thumbColor="#fff"
            accessibilityLabel="Add a note when I complete this"
            testID="habit-edit-note-prompt-toggle"
          />
        </View>
        <TimePickerSheet
          visible={reminderPickerVisible}
          value={formData.reminderTime}
          onChange={(next) => setFormData({ ...formData, reminderTime: next })}
          onClose={() => setReminderPickerVisible(false)}
        />
      </EnhancedModal>

      <IntentionEditSheet
        visible={intentionSheetVisible}
        onDismiss={() => setIntentionSheetVisible(false)}
        currentIntention={habit.intention}
        onSave={handleSaveIntention}
      />

      {noteTarget && (
        <HabitNoteSheet
          visible
          habitName={noteTarget.habitName}
          onSave={handleSaveNote}
          onDismiss={dismissNote}
        />
      )}
    </SafeAreaView>
  );
};

/**
 * "Yesterday" / "3 days ago" / "12 July" for a note's date. Relative near the
 * present, absolute once relative stops being useful.
 */
function relativeDate(dateKey: string, todayKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  const [ty, tm, td] = todayKey.split('-').map(Number);
  const today = new Date(ty, (tm ?? 1) - 1, td ?? 1);

  const days = Math.round((today.getTime() - date.getTime()) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'long' });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.mistWhite,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl * 2,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.base,
  },
  chip: {
    backgroundColor: DEW_CHIP,
    borderRadius: Layout.borderRadius.sm,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  chipText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.softCharcoal,
  },
  primaryAction: {
    marginBottom: Spacing.base,
  },
  card: {
    marginBottom: Spacing.base,
  },
  cardHeading: {
    marginBottom: Spacing.sm,
  },
  noticing: {
    marginTop: Spacing.sm,
    fontSize: Typography.fontSize.sm,
    color: Colors.mutedSageGray,
    lineHeight: 20,
  },
  lines: {
    marginTop: Spacing.base,
    gap: Spacing.xs,
  },
  line: {
    fontSize: Typography.fontSize.sm,
    color: Colors.mutedSageGray,
    lineHeight: 20,
  },
  lineEmphasis: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.medium,
  },
  note: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.dewSage,
    paddingLeft: Spacing.sm,
    marginTop: Spacing.sm,
  },
  noteDate: {
    fontSize: Typography.fontSize.xs,
    color: Colors.mutedSageGray,
    marginBottom: 2,
  },
  noteText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.softCharcoal,
    lineHeight: 20,
  },
  whyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  whyHeading: {
    flex: 1,
  },
  whyText: {
    fontSize: Typography.fontSize.base,
    color: Colors.softCharcoal,
    lineHeight: 22,
  },
  whyEmpty: {
    fontSize: Typography.fontSize.sm,
    color: Colors.mutedSageGray,
    lineHeight: 20,
  },
  whyCta: {
    marginTop: Spacing.xs,
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
  },
  whyCtaLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.evergreenTeal,
  },
  lookBack: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    minHeight: 48,
  },
  lookBackText: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  lookBackTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.softCharcoal,
    marginBottom: 2,
  },
  lookBackSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.mutedSageGray,
  },
  actionsContainer: {
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  input: {
    marginBottom: Spacing.base,
  },
  noteToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.base,
  },
  reminderTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingVertical: Spacing.sm,
    paddingLeft: Spacing.base,
    marginBottom: Spacing.base,
    borderLeftWidth: 2,
    borderLeftColor: Colors.dewSage,
  },
  reminderTimeLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.mutedSageGray,
  },
  reminderTimeValue: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.evergreenTeal,
  },
  noteToggleText: {
    flex: 1,
    marginRight: Spacing.base,
  },
  noteToggleLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.softCharcoal,
  },
  noteToggleHelper: {
    fontSize: Typography.fontSize.xs,
    color: Colors.mutedSageGray,
    marginTop: 2,
  },
});

export default HabitDetailScreen;
