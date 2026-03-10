/**
 * Types for HabitCompletionSheet
 */

import { Habit, CompletionData, CompletionSource } from '../../types';

export interface HabitCompletionSheetProps {
  habit: Habit;
  source: CompletionSource;
  visible: boolean;
  onComplete: (data: CompletionData) => void;
  onDismiss: () => void;
}

/** Affirming copy shown after a reflection chip is tapped */
export interface AffirmingCopy {
  header: string;
  body: string | null;
}

export const STANDARD_AFFIRMING_COPY: Record<string, AffirmingCopy> = {
  smooth: { header: 'Captured.', body: 'Building.' },
  okay: { header: 'Captured.', body: 'Showing up is the work.' },
  hard: { header: 'Captured.', body: 'Hard days count the most.' },
  skip: { header: 'Captured.', body: null },
};

export const CONNECTION_AFFIRMING_COPY: Record<string, string> = {
  nourishing: 'That kind of connection is genuinely restorative.',
  fine: 'Connection is connection. It counts.',
  draining: 'Worth noticing. Your energy matters too.',
};

export const CONNECTION_OPTIONS = [
  {
    key: 'nourishing' as const,
    label: 'Nourishing',
    emoji: '\u{1F331}',
    textColor: '#2A6E4A',
    bgColor: '#E6F2EC',
  },
  {
    key: 'fine' as const,
    label: 'Fine',
    emoji: '\u{3030}',
    textColor: '#6F7F77',
    bgColor: '#EAF2E8',
  },
  {
    key: 'draining' as const,
    label: 'Draining',
    emoji: '\u{25CC}',
    textColor: '#5B21B6',
    bgColor: '#F3F0FF',
  },
] as const;
