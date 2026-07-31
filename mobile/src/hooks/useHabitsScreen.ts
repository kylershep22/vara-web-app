/**
 * useHabitsScreen
 * State management and event handlers for the HabitsScreen.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useHabits } from './useHabits';
import { useCelebrations } from './useCelebrations';
import { useNotificationOptIn } from './useNotificationOptIn';
import { useToast } from '../context/ToastContext';
import {
  createHabit,
  updateHabit,
  deleteHabit,
  markHabitComplete,
  unmarkHabitComplete,
  isHabitCompletedToday,
} from '../services/firebase';
import { Habit, CompletionData } from '../types';
import { isCognitiveReserveCategory } from '../constants/habitCategories';
import { HabitFormData } from '../components/habits/wizard/types';
import { DASHBOARD_V2 } from '../constants/dashboardConfig';
import { SimpleHabitFormData } from '../components/habits/SimpleHabitCreateScreen';
import { getFocusRhythms } from '../services/firebase/focusRhythms.service';
import { logger } from '../utils/logger';
import { scheduleHabitReminder, cancelHabitReminder } from '../services/reminderScheduler.service';
import { ensureRemindersAllowed } from '../services/firebase/notificationPreferences.service';
import { useHabitNotePrompt, confirmCompletionNoteLoss } from './useHabitNotePrompt';

export function useHabitsScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const { habits, loading, error: habitsError, retry: retryHabits } = useHabits(true);
  const { shouldShowPrompt: shouldShowNotifPrompt, markPromptShown: markNotifPromptShown } = useNotificationOptIn();
  const { showNotificationToast } = useToast();
  const notifOptInChecked = useRef(false);
  const {
    allHabitsCompletedToday,
    setAllHabitsCompletedToday,
  } = useCelebrations();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [completedToday, setCompletedToday] = useState<Set<string>>(new Set());
  const [togglingHabits, setTogglingHabits] = useState<Set<string>>(new Set());
  const [pillarInfoVisible, setPillarInfoVisible] = useState(false);
  const [completionSheetHabit, setCompletionSheetHabit] = useState<Habit | null>(null);
  // The user's stored focus rhythms, read here rather than in the create sheet
  // so that sheet stays presentational (no auth, no Firestore). Fetched when the
  // sheet opens, which is the only moment it matters and keeps the read off the
  // list's render path.
  const [focusRhythmWindows, setFocusRhythmWindows] = useState<string[]>([]);
  const { noteTarget, promptForNote, saveNote, dismissNote } = useHabitNotePrompt();
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!modalVisible || !user) return;
    let active = true;
    getFocusRhythms(user.uid)
      .then((windows) => {
        if (active) setFocusRhythmWindows(windows);
      })
      // Best effort: a failed read just means no suggestion is offered, which is
      // the same as having set no rhythms. Never blocks habit creation.
      .catch((error) => logger.error('[useHabitsScreen] rhythms load failed:', error));
    return () => {
      active = false;
    };
  }, [modalVisible, user]);

  // Check which habits are completed today
  useEffect(() => {
    const checkCompletions = async () => {
      const completed = new Set<string>();
      for (const habit of habits) {
        const isCompleted = await isHabitCompletedToday(habit.id);
        if (isCompleted) completed.add(habit.id);
      }
      setCompletedToday(completed);
    };
    if (habits.length > 0) checkCompletions();
  }, [habits]);

  const handleCreateHabit = useCallback(() => {
    setEditingHabit(null);
    setModalVisible(true);
  }, []);

  const handleEditHabit = useCallback((habit: Habit) => {
    setEditingHabit(habit);
    setModalVisible(true);
  }, []);

  const handleWizardComplete = useCallback(async (formData: HabitFormData) => {
    if (!user || !user.uid) {
      Alert.alert('Authentication Error', 'You must be logged in to create a habit. Please sign out and sign back in.');
      return;
    }

    try {
      const habitData: any = {
        name: formData.name.trim(),
        type: formData.type,
        frequency: formData.frequency,
        active: true,
      };

      if (formData.category && formData.category.trim()) {
        habitData.category = formData.category.trim();
      }

      if (formData.identity) {
        habitData.identity = formData.identity.trim();
        if (!formData.identityStatement && formData.identity) {
          habitData.identityStatement = `I'm becoming ${formData.identity.toLowerCase()}`;
        } else if (formData.identityStatement) {
          habitData.identityStatement = formData.identityStatement.trim();
        }
      }

      if (formData.outcomeGoal) habitData.outcomeGoal = formData.outcomeGoal.trim();
      if (formData.fullVersion) habitData.fullVersion = formData.fullVersion.trim();
      if (formData.quickStartVersion) habitData.quickStartVersion = formData.quickStartVersion.trim();
      if (formData.justShowUpVersion) habitData.justShowUpVersion = formData.justShowUpVersion.trim();
      if (formData.problem) habitData.problem = formData.problem.trim();

      if (formData.cueValue) {
        habitData.cue = {
          type: formData.cueType,
          value: formData.cueValue.trim(),
        };

        if (!formData.implementationIntention) {
          const cuePrefix = formData.cueType === 'time' ? 'At' :
                           formData.cueType === 'after_habit' ? 'After' :
                           formData.cueType === 'location' ? 'At' : 'When';
          habitData.implementationIntention = `${cuePrefix} ${formData.cueValue}, I will ${formData.name.toLowerCase()}`;
        } else {
          habitData.implementationIntention = formData.implementationIntention.trim();
        }
      } else if (formData.implementationIntention) {
        habitData.implementationIntention = formData.implementationIntention.trim();
      }

      if (formData.intention) {
        habitData.intention = formData.intention;
      }

      if (formData.valueAlignment) {
        habitData.valueAlignment = formData.valueAlignment;
      }

      if (!editingHabit) {
        habitData.missedYesterday = false;
        habitData.consecutiveMisses = 0;
        habitData.scalingPhase = 'getting_started';
      }

      // NO reminder wiring here. This wizard path used to schedule a reminder
      // off `cue.type === 'time'`, which was a second, parallel source of truth
      // for reminders and is gone: reminders now live on reminderEnabled +
      // reminderTime, which this form does not edit. updateHabit is a partial
      // write, so an existing reminder survives untouched, and syncAllReminders
      // reconciles from the habit's real fields on the next foreground.
      if (editingHabit) {
        await updateHabit(editingHabit.id, habitData);
      } else {
        await createHabit(user.uid, habitData);
      }

      setModalVisible(false);
    } catch (error: any) {
      logger.error('Error saving habit:', error);
      const errorMessage = error?.message || 'Failed to save habit.';
      Alert.alert(
        'Unable to Save Habit',
        `${errorMessage}\n\nPlease check your internet connection and try again. If the problem persists, try signing out and back in.`
      );
    }
  }, [user, editingHabit]);

  const handleSimpleHabitSave = useCallback(async (formData: SimpleHabitFormData) => {
    if (!user || !user.uid) {
      Alert.alert('Authentication Error', 'You must be logged in to create a habit.');
      return;
    }

    try {
      const frequencyMap = {
        daily: { type: 'daily' as const, frequency: 7 },
        specific_days: { type: 'weekly' as const, frequency: formData.specificDays.length },
        flexible: { type: 'custom' as const, frequency: 0 },
      };
      const { type, frequency } = frequencyMap[formData.frequencyType];

      const habitData: any = {
        name: formData.name,
        // The controlled nine-key taxonomy. Only the KEY is stored: pillar and
        // focus-demand are derived from HABIT_CATEGORY_MAPPING at read time, so
        // a mapping change never needs a habit migration. This is a different
        // field from the legacy free-text `category`, which nothing here writes.
        habitCategory: formData.category,
        type,
        frequency,
        frequencyType: formData.frequencyType,
        active: true,
        missedYesterday: false,
        consecutiveMisses: 0,
        scalingPhase: 'getting_started',
      };

      if (formData.specificDays.length > 0) {
        habitData.specificDays = formData.specificDays;
      }

      if (formData.timeOfDay !== 'anytime') {
        habitData.timeOfDay = formData.timeOfDay;
      }

      if (formData.intention) {
        habitData.intention = {
          label: formData.intention,
          category: 'focus_clarity',
          isCustom: true,
        };
      }

      // Only written when opted in — an unset field is off, so habits created
      // without the toggle carry no flag at all.
      if (formData.notePromptEnabled) {
        habitData.notePromptEnabled = true;
      }

      // Only written when opted in, same as the note prompt: an unset field is
      // off, so habits created without a reminder carry no flag at all.
      if (formData.reminderEnabled && formData.reminderTime) {
        habitData.reminderEnabled = true;
        habitData.reminderTime = formData.reminderTime;
      }

      // The id is captured (it used to be discarded) because the reminder's
      // notification identifiers are derived from it.
      const habitId = await createHabit(user.uid, habitData);

      if (habitData.reminderEnabled) {
        // Before scheduling: syncAllReminders bails when the master flag is
        // off, and it defaults to off — so without this the reminder would be
        // scheduled here and silently wiped on the next app foreground.
        await ensureRemindersAllowed(user.uid);
        await scheduleHabitReminder({ id: habitId, ...habitData } as Habit);
      }

      setModalVisible(false);
    } catch (error: any) {
      logger.error('Error saving habit:', error);
      Alert.alert('Unable to Save Habit', error?.message || 'Failed to save habit.');
    }
  }, [user]);

  const handleDeleteHabit = useCallback((habitId: string) => {
    Alert.alert(
      'Delete Habit',
      'Are you sure you want to delete this habit?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelHabitReminder(habitId);
              await deleteHabit(habitId);
            } catch (error) {
              logger.error('Error deleting habit:', error);
              Alert.alert('Error', 'Failed to delete habit');
            }
          },
        },
      ]
    );
  }, []);

  const handleToggleCompletion = useCallback(async (habitId: string) => {
    // Prevent rapid double-taps on the same habit
    if (togglingHabits.has(habitId)) return;
    setTogglingHabits(prev => new Set(prev).add(habitId));

    const isCompleted = completedToday.has(habitId);

    // Only when undoing, and only when there is something to lose: a note lives
    // on the completion document that un-completing deletes.
    if (isCompleted && !(await confirmCompletionNoteLoss(habitId, today))) {
      setTogglingHabits(prev => {
        const newSet = new Set(prev);
        newSet.delete(habitId);
        return newSet;
      });
      return;
    }

    try {
      if (isCompleted) {
        // Optimistic: immediately show as unchecked
        setCompletedToday(prev => {
          const newSet = new Set(prev);
          newSet.delete(habitId);
          return newSet;
        });
        setAllHabitsCompletedToday(false);
        await unmarkHabitComplete(habitId, today);
      } else if (DASHBOARD_V2) {
        // Optimistic: immediately show as checked
        completeHabitLocally(habitId);
        await markHabitComplete(habitId, user!.uid, today, { source: 'track' });
        // Completion is saved. The note sheet is an addendum on top of it.
        promptForNote(habits.find((h) => h.id === habitId), today);
      } else {
        // V1: Open the completion sheet for reflection
        const habit = habits.find((h) => h.id === habitId);
        if (habit) {
          setCompletionSheetHabit(habit);
        }
      }
    } catch (error) {
      // Rollback on failure
      if (isCompleted) {
        // Was trying to uncheck — restore checked state
        completeHabitLocally(habitId);
      } else {
        // Was trying to check — restore unchecked state
        setCompletedToday(prev => {
          const newSet = new Set(prev);
          newSet.delete(habitId);
          return newSet;
        });
      }
      logger.error('Error toggling habit completion:', error);
      Alert.alert('Error', 'Failed to update habit. Please try again.');
    } finally {
      setTogglingHabits(prev => {
        const newSet = new Set(prev);
        newSet.delete(habitId);
        return newSet;
      });
    }
  }, [completedToday, today, user, habits, togglingHabits, setAllHabitsCompletedToday, promptForNote]);

  /** Shared logic to mark habit complete in local state + trigger celebration / notif opt-in */
  const completeHabitLocally = useCallback((habitId: string) => {
    if (!notifOptInChecked.current && shouldShowNotifPrompt) {
      notifOptInChecked.current = true;
      markNotifPromptShown();
      navigation.navigate('NotificationOptIn');
    }

    const habit = habits.find((h) => h.id === habitId);
    const habitName = habit?.name || 'Habit';
    showNotificationToast('Nice work!', `${habitName} marked complete.`);

    const newCompletedSet = new Set(completedToday).add(habitId);
    setCompletedToday(newCompletedSet);

    if (newCompletedSet.size === habits.length && habits.length > 0) {
      setTimeout(() => setAllHabitsCompletedToday(true), 300);
    }
  }, [completedToday, habits, shouldShowNotifPrompt, markNotifPromptShown, navigation, setAllHabitsCompletedToday, showNotificationToast]);

  /** Called when the HabitCompletionSheet finishes (user tapped a chip or skipped) */
  const handleCompletionSheetDone = useCallback(async (data: CompletionData) => {
    try {
      const habit = habits.find((h) => h.id === data.habitId);
      const crFlagged = habit ? isCognitiveReserveCategory(habit.category) : false;

      await markHabitComplete(data.habitId, user!.uid, today, {
        reflection: data.reflection,
        connectionQuality: data.connectionQuality,
        source: data.source,
        crFlagged,
        valueAlignment: habit?.valueAlignment ?? null,
        skippedReflection: data.skippedReflection,
      });

      completeHabitLocally(data.habitId);
    } catch (error) {
      logger.error('Error saving habit completion with reflection:', error);
      Alert.alert('Error', 'Failed to save habit completion');
    } finally {
      setCompletionSheetHabit(null);
    }
  }, [habits, user, today, completeHabitLocally]);

  /** Called when user dismisses the sheet without completing */
  const handleCompletionSheetDismiss = useCallback(() => {
    setCompletionSheetHabit(null);
  }, []);

  return {
    user,
    navigation,
    habits,
    loading,
    habitsError,
    retryHabits,
    modalVisible,
    setModalVisible,
    editingHabit,
    completedToday,
    pillarInfoVisible,
    setPillarInfoVisible,
    allHabitsCompletedToday,
    setAllHabitsCompletedToday,
    handleCreateHabit,
    handleEditHabit,
    handleWizardComplete,
    handleSimpleHabitSave,
    focusRhythmWindows,
    handleDeleteHabit,
    handleToggleCompletion,
    // Completion sheet
    completionSheetHabit,
    handleCompletionSheetDone,
    handleCompletionSheetDismiss,
    // Note capture
    noteTarget,
    saveNote,
    dismissNote,
  };
}
