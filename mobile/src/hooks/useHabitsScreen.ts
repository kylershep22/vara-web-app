/**
 * useHabitsScreen
 * State management and event handlers for the HabitsScreen.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
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
import { logger } from '../utils/logger';
import { scheduleHabitReminder, cancelHabitReminder } from '../services/reminderScheduler.service';

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
  const [reflectionEnabled, setReflectionEnabled] = useState(true);
  const today = new Date().toISOString().split('T')[0];

  // Load user's reflectionEnabled preference
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        if (!db) return;
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setReflectionEnabled(data.reflectionEnabled !== false);
        }
      } catch (error) {
        logger.error('Error loading reflectionEnabled setting:', error);
      }
    })();
  }, [user]);

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

      if (editingHabit) {
        await updateHabit(editingHabit.id, habitData);
        // Re-schedule reminder (cancel old, schedule new if time-based cue)
        await cancelHabitReminder(editingHabit.id);
        if (habitData.cue?.type === 'time') {
          await scheduleHabitReminder({ id: editingHabit.id, ...habitData } as Habit);
        }
      } else {
        const habitId = await createHabit(user.uid, habitData);
        if (habitData.cue?.type === 'time') {
          await scheduleHabitReminder({ id: habitId, ...habitData } as Habit);
        }
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

      await createHabit(user.uid, habitData);
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
      } else if (DASHBOARD_V2 || !reflectionEnabled) {
        // Optimistic: immediately show as checked
        completeHabitLocally(habitId);
        await markHabitComplete(habitId, user!.uid, today, { source: 'track' });
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
  }, [completedToday, today, user, habits, reflectionEnabled, togglingHabits, setAllHabitsCompletedToday]);

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
    handleDeleteHabit,
    handleToggleCompletion,
    // Completion sheet
    completionSheetHabit,
    handleCompletionSheetDone,
    handleCompletionSheetDismiss,
  };
}
