// HabitDetailScreen — rendering, the completion path, and the guardrails.
//
// The guardrail tests are the point. This screen shipped two clinical claims
// and a two-numeral "Your Progress" scoreboard; these tests exist so neither
// can come back, and so the four-week view can never grow with habit age.

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSetOptions = jest.fn();

const mockGetHabitCompletions = jest.fn();
const mockMarkHabitComplete = jest.fn();
const mockUnmarkHabitComplete = jest.fn();

let mockHabit: any;

jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({ params: { habitId: mockHabit.id, habit: mockHabit } }),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    setOptions: mockSetOptions,
  }),
}));

jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return {
    SafeAreaView: View,
    // EnhancedModal sizes itself off the insets.
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'u1' } }),
}));

jest.mock('../../services/firebase', () => ({
  getHabitCompletions: (...args: any[]) => mockGetHabitCompletions(...args),
  markHabitComplete: (...args: any[]) => mockMarkHabitComplete(...args),
  unmarkHabitComplete: (...args: any[]) => mockUnmarkHabitComplete(...args),
  updateHabit: jest.fn().mockResolvedValue(undefined),
  deleteHabit: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../hooks/useReducedMotion', () => ({
  useReducedMotion: () => true, // no animation in tests
}));

import React from 'react';
import { render, waitFor, act, fireEvent } from '@testing-library/react-native';

import HabitDetailScreen from '../HabitDetailScreen';
import { localDateKey } from '../../components/dashboard/habitWeekState';

const TODAY_KEY = localDateKey(new Date());

/** Every string rendered anywhere in the tree. */
function allText(node: any, out: string[] = []): string[] {
  if (node == null) return out;
  if (typeof node === 'string') {
    out.push(node);
    return out;
  }
  if (Array.isArray(node)) {
    node.forEach((child) => allText(child, out));
    return out;
  }
  if (node.children) allText(node.children, out);
  return out;
}

function habitFixture(over: Record<string, any> = {}) {
  return {
    id: 'h1',
    userId: 'u1',
    name: 'Evening pages',
    type: 'daily',
    frequency: 7,
    frequencyType: 'daily',
    timeOfDay: 'evening',
    streak: 12,
    longestStreak: 30,
    active: true,
    createdAt: { toDate: () => new Date(2026, 0, 5) },
    updatedAt: { toDate: () => new Date(2026, 0, 5) },
    ...over,
  };
}

/** Completion docs for `count` consecutive days ending yesterday. */
function completionsEndingYesterday(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (i + 1));
    return { id: localDateKey(d), date: localDateKey(d), completed: true };
  });
}

async function renderScreen() {
  const utils = render(<HabitDetailScreen />);
  // Let the completions load settle before asserting.
  await waitFor(() => expect(mockGetHabitCompletions).toHaveBeenCalled());
  await act(async () => {});
  return utils;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockHabit = habitFixture();
  mockGetHabitCompletions.mockResolvedValue([]);
  mockMarkHabitComplete.mockResolvedValue(undefined);
  mockUnmarkHabitComplete.mockResolvedValue(undefined);
});

describe('HabitDetailScreen — the clinical claims are gone', () => {
  it.each([
    ['prefrontal cortex', /prefrontal|cortex/i],
    ['attention networks', /attention network/i],
    ['neural pathways', /neural|pathway|rewir/i],
    ['brain-health-led framing', /brain[-\s]?health|your brain/i],
    ['cognitive claims', /cognitive reserve|neuroplast/i],
  ])('renders no %s claim', async (_label, pattern) => {
    mockGetHabitCompletions.mockResolvedValue(completionsEndingYesterday(40));
    const { toJSON } = await renderScreen();

    expect(allText(toJSON()).join(' ')).not.toMatch(pattern);
  });

  it('replaces the claim with nothing at all when the user wrote no reason', async () => {
    const { getByTestId, queryByTestId } = await renderScreen();

    expect(getByTestId('habit-detail-why-add')).toBeTruthy();
    // No generated reason stands in for the user's own words.
    expect(queryByTestId('habit-detail-why-edit')).toBeNull();
  });
});

describe('HabitDetailScreen — no scoreboard', () => {
  it('renders no bare numeral, the stat-row signature', async () => {
    mockGetHabitCompletions.mockResolvedValue(completionsEndingYesterday(40));
    const { toJSON } = await renderScreen();

    const bare = allText(toJSON()).filter((t) => /^\s*\d+\s*$/.test(t));
    expect(bare).toEqual([]);
  });

  it.each([
    ['a streak', /streak/i],
    ['a percentage', /%|percent/i],
    ['a fraction against a target', /\b\d+\s*(of|\/)\s*\d+\b/],
    ['a completion rate', /completion rate|\bon track\b|\bbehind\b/i],
    ['an assigned state', /great job|well done|keep it up|you're crushing|nice work/i],
    ['a progress heading', /your progress/i],
  ])('never shows %s', async (_label, pattern) => {
    mockGetHabitCompletions.mockResolvedValue(completionsEndingYesterday(40));
    const { toJSON } = await renderScreen();

    expect(allText(toJSON()).join(' ')).not.toMatch(pattern);
  });

  it('shows the habit streak nowhere, even though the model carries one', async () => {
    mockHabit = habitFixture({ streak: 99, longestStreak: 120 });
    const { toJSON } = await renderScreen();

    const text = allText(toJSON()).join(' ');
    expect(text).not.toContain('99');
    expect(text).not.toContain('120');
  });
});

describe('HabitDetailScreen — the four-week view is bounded', () => {
  it('renders exactly four weeks for a habit two years old', async () => {
    mockHabit = habitFixture({ createdAt: { toDate: () => new Date(2024, 0, 5) } });
    mockGetHabitCompletions.mockResolvedValue(completionsEndingYesterday(700));

    const { queryAllByTestId, getByTestId } = await renderScreen();

    ['4 wks ago', '3 wks ago', '2 wks ago', 'Last week'].forEach((label) => {
      expect(getByTestId(`habit-history-row-${label}`)).toBeTruthy();
    });

    const completed = queryAllByTestId('history-mark-completed').length;
    const empty = queryAllByTestId('history-mark-empty').length;
    expect(completed + empty).toBe(28);
  });

  it('renders the same four weeks for a habit five weeks old', async () => {
    mockGetHabitCompletions.mockResolvedValue(completionsEndingYesterday(35));
    const { queryAllByTestId } = await renderScreen();

    const completed = queryAllByTestId('history-mark-completed').length;
    const empty = queryAllByTestId('history-mark-empty').length;
    expect(completed + empty).toBe(28);
  });
});

describe('HabitDetailScreen — "What you noted"', () => {
  it('does not render at all when no notes exist', async () => {
    mockGetHabitCompletions.mockResolvedValue(completionsEndingYesterday(10));
    const { queryByTestId, toJSON } = await renderScreen();

    expect(queryByTestId('habit-detail-notes')).toBeNull();
    // No empty state either: the card is absent, not apologising.
    expect(allText(toJSON()).join(' ')).not.toMatch(/what you noted/i);
  });

  it('renders the most recent notes once completions carry them', async () => {
    const withNotes = completionsEndingYesterday(4).map((c, i) => ({
      ...c,
      quickNote: `note ${i}`,
    }));
    mockGetHabitCompletions.mockResolvedValue(withNotes);

    const { getByTestId, getByText, queryByText } = await renderScreen();

    expect(getByTestId('habit-detail-notes')).toBeTruthy();
    expect(getByText('note 0')).toBeTruthy();
    expect(getByText('Yesterday')).toBeTruthy();
    // Capped at three, newest first.
    expect(queryByText('note 3')).toBeNull();
  });
});

describe('HabitDetailScreen — Complete today', () => {
  it('writes a completion and flips the button', async () => {
    const { getByTestId, getByText } = await renderScreen();

    expect(getByText('Complete today')).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByTestId('habit-detail-complete-today'));
    });

    expect(mockMarkHabitComplete).toHaveBeenCalledWith('h1', 'u1', TODAY_KEY, {
      source: 'track',
    });
    expect(getByText('Completed today')).toBeTruthy();
  });

  it('undoes the completion when already complete', async () => {
    mockGetHabitCompletions.mockResolvedValue([
      { id: TODAY_KEY, date: TODAY_KEY, completed: true },
    ]);

    const { getByTestId, getByText } = await renderScreen();
    expect(getByText('Completed today')).toBeTruthy();

    await act(async () => {
      fireEvent.press(getByTestId('habit-detail-complete-today'));
    });

    expect(mockUnmarkHabitComplete).toHaveBeenCalledWith('h1', TODAY_KEY);
    expect(mockMarkHabitComplete).not.toHaveBeenCalled();
    expect(getByText('Complete today')).toBeTruthy();
  });

  it('rolls the mark back when the write fails', async () => {
    mockMarkHabitComplete.mockRejectedValue(new Error('offline'));
    const { getByTestId, getByText } = await renderScreen();

    await act(async () => {
      fireEvent.press(getByTestId('habit-detail-complete-today'));
    });

    expect(getByText('Complete today')).toBeTruthy();
  });

  it("toggles the same state from today's cell in the week strip", async () => {
    const { getByTestId } = await renderScreen();

    await act(async () => {
      fireEvent.press(getByTestId(`habit-week-cell-${TODAY_KEY}`));
    });

    expect(mockMarkHabitComplete).toHaveBeenCalledTimes(1);
  });
});

describe('HabitDetailScreen — chrome', () => {
  it('titles the header with the habit name, not "Habit Details"', async () => {
    await renderScreen();
    expect(mockSetOptions).toHaveBeenCalledWith({ title: 'Evening pages' });
  });

  it('renders the metadata chips in place of the broken glyph row', async () => {
    const { getByText } = await renderScreen();

    expect(getByText('Every day')).toBeTruthy();
    expect(getByText('Evening')).toBeTruthy();
    expect(getByText('Since 5 January')).toBeTruthy();
  });

  it('says Remove, not Delete', async () => {
    const { getByText, queryByText, toJSON } = await renderScreen();

    expect(getByText('Remove habit')).toBeTruthy();
    expect(queryByText('Delete Habit')).toBeNull();
    expect(allText(toJSON()).join(' ')).not.toMatch(/delete/i);
  });

  it('links to Look Back', async () => {
    const { getByTestId } = await renderScreen();

    fireEvent.press(getByTestId('habit-detail-look-back'));
    expect(mockNavigate).toHaveBeenCalledWith('Insights');
  });
});
