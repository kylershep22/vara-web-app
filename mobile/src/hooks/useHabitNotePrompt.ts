/**
 * useHabitNotePrompt
 *
 * The note prompt follows the HABIT, not the surface. Every completion surface
 * shares this hook so a flagged habit behaves identically whether it was
 * completed from the dashboard grid, Habit Details, or the Habits tab.
 *
 * The ordering is the whole point: callers write the completion FIRST and call
 * promptForNote() only after that write resolves. The sheet is an addendum to
 * an already-saved record, never a gate — which is what preserves the
 * dashboard grid's one-tap guarantee for flagged habits.
 */

import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { setCompletionNote, getCompletionNote } from '../services/firebase';
import { logger } from '../utils/logger';
import type { Habit } from '../types';

export interface HabitNoteTarget {
  habitId: string;
  /** YYYY-MM-DD — the completion document this note belongs to. */
  date: string;
  habitName: string;
}

/** The habit fields the prompt needs; anything Habit-shaped satisfies it. */
type PromptableHabit = Pick<Habit, 'id' | 'name' | 'notePromptEnabled'>;

export function useHabitNotePrompt() {
  const [noteTarget, setNoteTarget] = useState<HabitNoteTarget | null>(null);

  /**
   * Open the note sheet, but only for a flagged habit. Call AFTER the
   * completion write has resolved. An unflagged habit is a no-op.
   */
  const promptForNote = useCallback(
    (habit: PromptableHabit | undefined | null, date: string) => {
      if (!habit?.notePromptEnabled) return;
      setNoteTarget({ habitId: habit.id, date, habitName: habit.name });
    },
    []
  );

  /**
   * Merge the note onto the existing completion. A failure here cannot cost
   * the user their completion — that is already saved — so it says so.
   */
  const saveNote = useCallback(
    async (note: string) => {
      const target = noteTarget;
      setNoteTarget(null);
      if (!target) return;

      try {
        await setCompletionNote(target.habitId, target.date, note);
      } catch (error) {
        logger.error('Error saving habit completion note:', error);
        Alert.alert('Note not saved', 'Your completion is saved. The note did not save.');
      }
    },
    [noteTarget]
  );

  /** Every dismissal path lands here. Writes nothing. */
  const dismissNote = useCallback(() => setNoteTarget(null), []);

  return { noteTarget, promptForNote, saveNote, dismissNote };
}

/**
 * Resolves true when un-completing should proceed.
 *
 * Un-completing deletes the completion document, and the note lives on that
 * document — so a note is discarded with it. When one exists we say so plainly
 * and let the user choose. This is information, not resistance: a completion
 * with no note is un-completed silently, exactly as before.
 */
export async function confirmCompletionNoteLoss(
  habitId: string,
  date: string
): Promise<boolean> {
  const note = await getCompletionNote(habitId, date);
  if (!note) return true;

  return new Promise<boolean>((resolve) => {
    Alert.alert(
      'This completion has a note',
      'Removing this completion also removes your note.',
      [
        // Deliberately not `style: 'destructive'`. Undoing your own completion
        // is an intentional action, not an error.
        { text: 'Remove', onPress: () => resolve(true) },
        { text: 'Keep', style: 'cancel', onPress: () => resolve(false) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}
