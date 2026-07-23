// useHabitNotePrompt — the guarantee that the prompt follows the HABIT.
//
// Every completion surface shares this hook, so these tests cover the dashboard
// grid and the Habits tab as much as they cover Habit Details.

const mockSetCompletionNote = jest.fn();
const mockGetCompletionNote = jest.fn();

jest.mock('../../services/firebase', () => ({
  setCompletionNote: (...args: any[]) => mockSetCompletionNote(...args),
  getCompletionNote: (...args: any[]) => mockGetCompletionNote(...args),
}));

import { renderHook, act } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { useHabitNotePrompt, confirmCompletionNoteLoss } from '../useHabitNotePrompt';

const FLAGGED = { id: 'h1', name: 'Morning walk', notePromptEnabled: true } as any;
const UNFLAGGED = { id: 'h2', name: 'Read', notePromptEnabled: undefined } as any;

beforeEach(() => {
  jest.clearAllMocks();
  mockSetCompletionNote.mockResolvedValue(undefined);
  mockGetCompletionNote.mockResolvedValue(null);
});

describe('promptForNote', () => {
  it('opens for a flagged habit', () => {
    const { result } = renderHook(() => useHabitNotePrompt());
    act(() => result.current.promptForNote(FLAGGED, '2026-07-23'));

    expect(result.current.noteTarget).toEqual({
      habitId: 'h1',
      date: '2026-07-23',
      habitName: 'Morning walk',
    });
  });

  it('never opens for an unflagged habit', () => {
    const { result } = renderHook(() => useHabitNotePrompt());
    act(() => result.current.promptForNote(UNFLAGGED, '2026-07-23'));
    expect(result.current.noteTarget).toBeNull();
  });

  it('never opens for an explicitly disabled habit', () => {
    const { result } = renderHook(() => useHabitNotePrompt());
    act(() => result.current.promptForNote({ ...FLAGGED, notePromptEnabled: false }, '2026-07-23'));
    expect(result.current.noteTarget).toBeNull();
  });

  it('is a no-op when the habit cannot be found on the surface', () => {
    const { result } = renderHook(() => useHabitNotePrompt());
    act(() => result.current.promptForNote(undefined, '2026-07-23'));
    expect(result.current.noteTarget).toBeNull();
  });
});

describe('saveNote / dismissNote', () => {
  it('writes the note against the date the completion was made', async () => {
    const { result } = renderHook(() => useHabitNotePrompt());
    act(() => result.current.promptForNote(FLAGGED, '2026-07-23'));
    await act(async () => {
      await result.current.saveNote('a quick line');
    });

    expect(mockSetCompletionNote).toHaveBeenCalledWith('h1', '2026-07-23', 'a quick line');
    expect(result.current.noteTarget).toBeNull();
  });

  it('writes nothing on dismissal', () => {
    const { result } = renderHook(() => useHabitNotePrompt());
    act(() => result.current.promptForNote(FLAGGED, '2026-07-23'));
    act(() => result.current.dismissNote());

    expect(mockSetCompletionNote).not.toHaveBeenCalled();
    expect(result.current.noteTarget).toBeNull();
  });

  it('tells the user the completion survived when the note write fails', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockSetCompletionNote.mockRejectedValue(new Error('offline'));

    const { result } = renderHook(() => useHabitNotePrompt());
    act(() => result.current.promptForNote(FLAGGED, '2026-07-23'));
    await act(async () => {
      await result.current.saveNote('a quick line');
    });

    expect(alertSpy.mock.calls[0][1]).toBe('Your completion is saved. The note did not save.');
    alertSpy.mockRestore();
  });
});

describe('confirmCompletionNoteLoss', () => {
  it('proceeds silently when the completion has no note', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    mockGetCompletionNote.mockResolvedValue(null);

    expect(await confirmCompletionNoteLoss('h1', '2026-07-23')).toBe(true);
    expect(alertSpy).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('states the consequence plainly, with no "are you sure"', async () => {
    mockGetCompletionNote.mockResolvedValue('a note');
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(((
      _t: string,
      _m: string,
      buttons: any[]
    ) => buttons.find((b) => b.text === 'Keep').onPress()) as any);

    await confirmCompletionNoteLoss('h1', '2026-07-23');

    const [title, message, buttons] = alertSpy.mock.calls[0] as any[];
    expect(title).toBe('This completion has a note');
    expect(message).toBe('Removing this completion also removes your note.');
    expect(message).not.toMatch(/are you sure/i);
    // Not styled destructive: undoing your own completion is intentional.
    expect(buttons.find((b: any) => b.text === 'Remove').style).toBeUndefined();
    alertSpy.mockRestore();
  });

  it('resolves false on Keep and true on Remove', async () => {
    mockGetCompletionNote.mockResolvedValue('a note');

    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(((
      _t: string,
      _m: string,
      buttons: any[]
    ) => buttons.find((b) => b.text === 'Keep').onPress()) as any);
    expect(await confirmCompletionNoteLoss('h1', '2026-07-23')).toBe(false);

    alertSpy.mockImplementation(((_t: string, _m: string, buttons: any[]) =>
      buttons.find((b) => b.text === 'Remove').onPress()) as any);
    expect(await confirmCompletionNoteLoss('h1', '2026-07-23')).toBe(true);

    alertSpy.mockRestore();
  });

  it('keeps the completion when the alert is dismissed without a choice', async () => {
    mockGetCompletionNote.mockResolvedValue('a note');
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(((
      _t: string,
      _m: string,
      _b: any[],
      options: any
    ) => options.onDismiss()) as any);

    expect(await confirmCompletionNoteLoss('h1', '2026-07-23')).toBe(false);
    alertSpy.mockRestore();
  });
});
