// Tasks — the capture list and its sheet (TB-2b, mockup C and D).
//
// No gesture-handler or reanimated mock: nothing on this screen swipes. Adding
// a clearing gesture is TB-2c, and it will need a LOCAL mock — jest.setup.js
// still has none, and nothing else in the suite provides one.

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaView: ({ children, style }: any) => React.createElement(View, { style }, children),
    useSafeAreaInsets: () => ({ top: 0, left: 0, right: 0, bottom: 0 }),
  };
});

// STABLE IDENTITY, deliberately. The screen keys its load callback on the UID
// precisely so a provider returning a fresh object per render cannot spin the
// focus effect; a mock returning a literal per call would hide whether that
// actually works, so this returns the same object every time and a dedicated
// test below drives the fresh-object case on purpose.
const AUTH_VALUE = { user: { uid: 'u1' } };
jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => AUTH_VALUE,
}));

const mockListTasks = jest.fn();
const mockCreateTask = jest.fn();
const mockUpdateTask = jest.fn();
const mockDeleteTask = jest.fn();
jest.mock('../../../services/firebase/capturedTasks.service', () => ({
  listCapturedTasks: (...a: any[]) => mockListTasks(...a),
  createCapturedTask: (...a: any[]) => mockCreateTask(...a),
  updateCapturedTask: (...a: any[]) => mockUpdateTask(...a),
  deleteCapturedTask: (...a: any[]) => mockDeleteTask(...a),
}));

// TB-3. The screen reads blocks to derive the "Blocked" chip. It still writes
// none — only the list function is reachable from here, and the rest of the
// module is stubbed so an accidental write would be visible as a missing mock
// rather than as a silent no-op.
const mockListBlocks = jest.fn();
jest.mock('../../../services/firebase/dayBlocks.service', () => ({
  listDayBlocksBetween: (...a: any[]) => mockListBlocks(...a),
  createDayBlock: jest.fn(),
  updateDayBlock: jest.fn(),
  deleteDayBlock: jest.fn(),
}));

// Clearing goes through the codebase's destructive-confirm Alert. Spied rather
// than module-mocked, the same way DayBlocksScreen's removal tests do it:
// replacing the Alert module leaves the `Alert` the screen imported undefined.

// The real useFocusEffect needs a navigation container; the screen only uses it
// to re-read on focus, so running the callback once on mount is the honest stub.
// useNavigation arrived with TB-3's "Block it" handoff — a spy here proves the
// call and its params; the round trip is proved against a real navigator in
// DayBlocksLaunch.integration.test.tsx.
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useFocusEffect: (cb: any) => {
    const React = require('react');
    React.useEffect(cb, [cb]);
  },
}));

import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import { CapturedTasksScreen } from '../CapturedTasksScreen';
import { ROUTES } from '../../../navigation/routes';
import { blockedAt } from '../blocksCopy';
import {
  BLOCK_IT,
  CAPTURE_TARGET,
  CLEAR_CONFIRM_ACCEPT,
  CLEAR_CONFIRM_BODY,
  CLEAR_CONFIRM_CANCEL,
  CLEAR_CONFIRM_TITLE,
  EDIT_TITLE,
  EMPTY_LINE,
  GROUP_HEADERS,
  ROW_A11Y_HINT,
  SAVE_CHANGES,
  SAVE_CTA,
  TASKS_TITLE,
} from '../tasksCopy';

const ts = (ms: number) => ({ toMillis: () => ms });

const task = (id: string, title: string, demand: string, createdMs = 1000) => ({
  id,
  userId: 'u1',
  title,
  demand,
  createdAt: ts(createdMs),
  updatedAt: ts(createdMs),
});

/** A DayBlock whose startAt behaves like a Firestore Timestamp (TB-3). */
const block = (id: string, start: Date, sourceTaskId?: string) =>
  ({
    id,
    userId: 'u1',
    title: 'Deep work',
    demand: 'heavy',
    durationMinutes: 60,
    startAt: { toDate: () => start },
    isProtected: false,
    ...(sourceTaskId ? { sourceTaskId } : {}),
    createdAt: {},
    updatedAt: {},
  }) as any;

let mockAlert: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  mockListTasks.mockResolvedValue([]);
  mockListBlocks.mockResolvedValue([]);
  mockCreateTask.mockResolvedValue('new-id');
  mockUpdateTask.mockResolvedValue(undefined);
  mockDeleteTask.mockResolvedValue(undefined);
  mockAlert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

afterEach(() => {
  mockAlert.mockRestore();
});

/** Presses the confirm button of the most recent Alert. */
async function confirmAlert() {
  const buttons = mockAlert.mock.calls[mockAlert.mock.calls.length - 1][2] as any[];
  const accept = buttons.find((b: any) => b.style !== 'cancel');
  await act(async () => {
    await accept.onPress();
  });
}

describe('CapturedTasksScreen — the list', () => {
  it('renders the title block and the capture target', async () => {
    const { findByText, getByTestId } = render(<CapturedTasksScreen />);

    expect(await findByText(TASKS_TITLE)).toBeTruthy();
    expect(getByTestId('captured-tasks-capture')).toBeTruthy();
  });

  it('shows the warm empty line when nothing is captured', async () => {
    const { findByTestId, getByText } = render(<CapturedTasksScreen />);

    expect(await findByTestId('captured-tasks-empty')).toBeTruthy();
    expect(getByText(EMPTY_LINE)).toBeTruthy();
  });

  it('keeps the capture target available while empty', async () => {
    // The one moment you most want to put something down is the moment the list
    // is empty. A capture affordance that only appears once there is something
    // to show would be exactly backwards.
    const { findByTestId, getByTestId } = render(<CapturedTasksScreen />);

    await findByTestId('captured-tasks-empty');
    expect(getByTestId('captured-tasks-capture')).toBeTruthy();
  });

  it('groups tasks by demand, heaviest first', async () => {
    mockListTasks.mockResolvedValue([
      task('t1', 'Expense report', 'light'),
      task('t2', 'Q3 board deck', 'heavy'),
      task('t3', 'Reply to Sam', 'medium'),
    ]);

    const { findByTestId, getByText } = render(<CapturedTasksScreen />);

    await findByTestId('captured-tasks-group-heavy');
    expect(getByText(GROUP_HEADERS.heavy)).toBeTruthy();
    expect(getByText(GROUP_HEADERS.medium)).toBeTruthy();
    expect(getByText(GROUP_HEADERS.light)).toBeTruthy();
    expect(getByText('Q3 board deck')).toBeTruthy();
    expect(getByText('Expense report')).toBeTruthy();
  });

  it('HIDES a group with no tasks in it', async () => {
    // THE EMPTY-GROUP PIN. The mockup shows HEAVY and LIGHT and no MEDIUM
    // header at all, and that is behaviour rather than an artefact of its
    // example data: a header with nothing under it reads as a slot waiting to
    // be filled, which is the deficit framing this screen exists to avoid.
    mockListTasks.mockResolvedValue([
      task('t1', 'Q3 board deck', 'heavy'),
      task('t2', 'Book dentist', 'light'),
    ]);

    const { findByTestId, queryByTestId, queryByText } = render(<CapturedTasksScreen />);

    await findByTestId('captured-tasks-group-heavy');
    expect(queryByTestId('captured-tasks-group-light')).toBeTruthy();
    expect(queryByTestId('captured-tasks-group-medium')).toBeNull();
    expect(queryByText(GROUP_HEADERS.medium)).toBeNull();
  });

  it('orders newest first inside a group', async () => {
    mockListTasks.mockResolvedValue([
      task('older', 'Captured first', 'heavy', 1000),
      task('newer', 'Captured second', 'heavy', 2000),
    ]);

    const { findByTestId, getByTestId } = render(<CapturedTasksScreen />);

    await findByTestId('captured-tasks-group-heavy');
    const group = getByTestId('captured-tasks-group-heavy');
    // The header is child 0; the rows follow in render order.
    const rendered = group.children
      .map((child: any) => child?.props?.testID)
      .filter((id: any) => typeof id === 'string' && id.startsWith('captured-tasks-row-'));

    expect(rendered).toEqual([
      'captured-tasks-row-newer',
      'captured-tasks-row-older',
    ]);
  });

  it('shows the empty line rather than an error when the read fails', async () => {
    // An empty list is a legitimate state, so a failed read degrades to it.
    mockListTasks.mockRejectedValue(new Error('offline'));

    const { findByTestId } = render(<CapturedTasksScreen />);

    expect(await findByTestId('captured-tasks-empty')).toBeTruthy();
  });

  it('reads the list exactly once per focus, not on a loop', async () => {
    // The TB-1b render-loop hazard: keying the load callback on the user OBJECT
    // rather than the uid turns any provider returning a fresh value per render
    // into an unbounded load/setState/re-render cycle.
    const { findByTestId } = render(<CapturedTasksScreen />);

    await findByTestId('captured-tasks-empty');
    await waitFor(() => expect(mockListTasks).toHaveBeenCalledTimes(1));
    expect(mockListTasks).toHaveBeenCalledWith('u1');
  });
});

describe('CapturedTasksScreen — capture', () => {
  it('opens the sheet from the capture target', async () => {
    const { findByTestId, getByTestId } = render(<CapturedTasksScreen />);

    await findByTestId('captured-tasks-empty');
    fireEvent.press(getByTestId('captured-tasks-capture'));

    expect(await findByTestId('capture-task-sheet')).toBeTruthy();
  });

  it('writes a task with its demand and refreshes the list', async () => {
    const { findByTestId, getByTestId } = render(<CapturedTasksScreen />);

    await findByTestId('captured-tasks-empty');
    fireEvent.press(getByTestId('captured-tasks-capture'));
    await findByTestId('capture-task-sheet');

    fireEvent.changeText(getByTestId('capture-task-title'), 'Draft investor update');
    fireEvent.press(getByTestId('capture-task-demand-heavy'));

    mockListTasks.mockResolvedValue([
      task('t1', 'Draft investor update', 'heavy'),
    ]);
    await act(async () => {
      fireEvent.press(getByTestId('capture-task-confirm'));
    });

    expect(mockCreateTask).toHaveBeenCalledWith('u1', {
      title: 'Draft investor update',
      demand: 'heavy',
    });
    // The refresh is what puts it on screen, in its group.
    expect(await findByTestId('captured-tasks-group-heavy')).toBeTruthy();
  });

  it('trims the title before writing', async () => {
    const { findByTestId, getByTestId } = render(<CapturedTasksScreen />);

    await findByTestId('captured-tasks-empty');
    fireEvent.press(getByTestId('captured-tasks-capture'));
    await findByTestId('capture-task-sheet');

    fireEvent.changeText(getByTestId('capture-task-title'), '  Book dentist  ');
    fireEvent.press(getByTestId('capture-task-demand-light'));
    await act(async () => {
      fireEvent.press(getByTestId('capture-task-confirm'));
    });

    expect(mockCreateTask).toHaveBeenCalledWith('u1', {
      title: 'Book dentist',
      demand: 'light',
    });
  });

  it('writes nothing when the sheet is opened and dismissed', async () => {
    const { findByTestId, getByTestId } = render(<CapturedTasksScreen />);

    await findByTestId('captured-tasks-empty');
    fireEvent.press(getByTestId('captured-tasks-capture'));
    const sheet = await findByTestId('capture-task-sheet');

    fireEvent(sheet, 'requestClose');

    await waitFor(() => expect(mockCreateTask).not.toHaveBeenCalled());
  });

  it('starts from a clean draft on the second open', async () => {
    // The sheet is remounted by key on each open. Without that, a second open
    // inherits the previous title and demand.
    const { findByTestId, getByTestId, queryByTestId } = render(<CapturedTasksScreen />);

    await findByTestId('captured-tasks-empty');
    fireEvent.press(getByTestId('captured-tasks-capture'));
    await findByTestId('capture-task-sheet');
    fireEvent.changeText(getByTestId('capture-task-title'), 'Abandoned draft');
    fireEvent(getByTestId('capture-task-sheet'), 'requestClose');

    await waitFor(() => expect(queryByTestId('capture-task-sheet')).toBeNull());

    fireEvent.press(getByTestId('captured-tasks-capture'));
    await findByTestId('capture-task-sheet');

    expect(getByTestId('capture-task-title').props.value).toBe('');
  });

  it('surfaces a failed save and keeps the sheet open', async () => {
    mockCreateTask.mockRejectedValue(new Error('offline'));

    const { findByTestId, getByTestId } = render(<CapturedTasksScreen />);

    await findByTestId('captured-tasks-empty');
    fireEvent.press(getByTestId('captured-tasks-capture'));
    await findByTestId('capture-task-sheet');
    fireEvent.changeText(getByTestId('capture-task-title'), 'Q3 board deck');
    fireEvent.press(getByTestId('capture-task-demand-heavy'));
    await act(async () => {
      fireEvent.press(getByTestId('capture-task-confirm'));
    });

    expect(await findByTestId('capture-task-error')).toBeTruthy();
    // The draft survives, so retry costs one tap.
    expect(getByTestId('capture-task-title').props.value).toBe('Q3 board deck');
  });
});

describe('CapturedTasksScreen — edit (TB-2c)', () => {
  const withOneTask = (demand = 'medium') => {
    mockListTasks.mockResolvedValue([task('t1', 'Strategy memo', demand)]);
  };

  const openRow = async () => {
    const utils = render(<CapturedTasksScreen />);
    await utils.findByTestId('captured-tasks-row-t1');
    fireEvent.press(utils.getByTestId('captured-tasks-row-t1'));
    await utils.findByTestId('capture-task-sheet');
    return utils;
  };

  it('opens the sheet in edit mode from a row tap', async () => {
    withOneTask();
    const { getByText } = await openRow();

    expect(getByText(EDIT_TITLE)).toBeTruthy();
    expect(getByText(SAVE_CHANGES)).toBeTruthy();
  });

  it('announces the row as a button that says what the tap does', async () => {
    // Tap, NOT swipe — the walk's answer. The row carries no chevron, so the
    // hint is the only way a screen-reader user learns it opens anything.
    withOneTask();
    const { findByTestId } = render(<CapturedTasksScreen />);

    const row = await findByTestId('captured-tasks-row-t1');
    expect(row.props.accessibilityRole).toBe('button');
    expect(row.props.accessibilityHint).toBe(ROW_A11Y_HINT);
    expect(row.props.accessibilityState?.disabled).toBeFalsy();
  });

  it('pre-fills the title and the recorded demand', async () => {
    withOneTask('medium');
    const { getByTestId } = await openRow();

    expect(getByTestId('capture-task-title').props.value).toBe('Strategy memo');
    expect(
      getByTestId('capture-task-demand-medium').props.accessibilityState.selected
    ).toBe(true);
  });

  it('retags medium to heavy, and the task lands in the new group', async () => {
    // THE ROUND TRIP. Retagging is the edit this feature exists to allow, and
    // the proof is the row moving groups after the refresh.
    withOneTask('medium');
    const { getByTestId, findByTestId, queryByTestId } = await openRow();

    fireEvent.press(getByTestId('capture-task-demand-heavy'));

    mockListTasks.mockResolvedValue([task('t1', 'Strategy memo', 'heavy')]);
    await act(async () => {
      fireEvent.press(getByTestId('capture-task-confirm'));
    });

    expect(mockUpdateTask).toHaveBeenCalledWith('t1', {
      title: 'Strategy memo',
      demand: 'heavy',
    });
    expect(await findByTestId('captured-tasks-group-heavy')).toBeTruthy();
    expect(queryByTestId('captured-tasks-group-medium')).toBeNull();
  });

  it('patches, never re-creates, when editing', async () => {
    withOneTask();
    const { getByTestId } = await openRow();

    fireEvent.changeText(getByTestId('capture-task-title'), 'Strategy memo v2');
    await act(async () => {
      fireEvent.press(getByTestId('capture-task-confirm'));
    });

    expect(mockUpdateTask).toHaveBeenCalledTimes(1);
    expect(mockCreateTask).not.toHaveBeenCalled();
  });

  it('sends only title and demand — the allowlist pin at the call site', async () => {
    // The service constructs from an allowlist regardless, but the screen must
    // not be the thing that starts handing it identity or scheduling fields.
    withOneTask();
    const { getByTestId } = await openRow();

    await act(async () => {
      fireEvent.press(getByTestId('capture-task-confirm'));
    });

    const [, patch] = mockUpdateTask.mock.calls[0];
    expect(Object.keys(patch).sort()).toEqual(['demand', 'title']);
  });

  it('keeps the same gate in edit mode: an emptied title cannot be saved', async () => {
    withOneTask();
    const { getByTestId, findByTestId } = await openRow();

    fireEvent.changeText(getByTestId('capture-task-title'), '');
    fireEvent.press(getByTestId('capture-task-confirm'));

    expect(await findByTestId('capture-task-hint')).toBeTruthy();
    expect(mockUpdateTask).not.toHaveBeenCalled();
  });

  it('returns to capture mode after an edit', async () => {
    // The sheet is shared, so a stale `editing` would turn the next capture
    // into a patch of whatever was last tapped.
    withOneTask();
    const { getByTestId, findByTestId, queryByTestId, getByText } = await openRow();

    fireEvent(getByTestId('capture-task-sheet'), 'requestClose');
    await waitFor(() => expect(queryByTestId('capture-task-sheet')).toBeNull());

    fireEvent.press(getByTestId('captured-tasks-capture'));
    await findByTestId('capture-task-sheet');

    expect(getByText(SAVE_CTA)).toBeTruthy();
    expect(getByTestId('capture-task-title').props.value).toBe('');
    expect(queryByTestId('capture-task-clear')).toBeNull();
  });
});

describe('CapturedTasksScreen — clear (TB-2c)', () => {
  const openRow = async () => {
    mockListTasks.mockResolvedValue([task('t1', 'Book dentist', 'light')]);
    const utils = render(<CapturedTasksScreen />);
    await utils.findByTestId('captured-tasks-row-t1');
    fireEvent.press(utils.getByTestId('captured-tasks-row-t1'));
    await utils.findByTestId('capture-task-sheet');
    return utils;
  };

  it('offers Clear only in edit mode', async () => {
    const { getByTestId } = await openRow();
    expect(getByTestId('capture-task-clear')).toBeTruthy();
  });

  it('asks before clearing, and deletes nothing until confirmed', async () => {
    const { getByTestId } = await openRow();

    fireEvent.press(getByTestId('capture-task-clear'));

    expect(mockAlert).toHaveBeenCalledTimes(1);
    const [title, body] = mockAlert.mock.calls[0];
    expect(title).toBe(CLEAR_CONFIRM_TITLE);
    expect(body).toBe(CLEAR_CONFIRM_BODY);
    expect(mockDeleteTask).not.toHaveBeenCalled();
  });

  it('removes the row once confirmed', async () => {
    const { getByTestId, findByTestId, queryByTestId } = await openRow();

    fireEvent.press(getByTestId('capture-task-clear'));
    mockListTasks.mockResolvedValue([]);
    await confirmAlert();

    expect(mockDeleteTask).toHaveBeenCalledWith('t1');
    expect(await findByTestId('captured-tasks-empty')).toBeTruthy();
    expect(queryByTestId('captured-tasks-row-t1')).toBeNull();
    // The sheet closes with it — there is nothing left to edit.
    await waitFor(() => expect(queryByTestId('capture-task-sheet')).toBeNull());
  });

  it('leaves the list untouched when the confirm is declined', async () => {
    const { getByTestId, queryByTestId } = await openRow();

    fireEvent.press(getByTestId('capture-task-clear'));
    const buttons = mockAlert.mock.calls[0][2];
    const cancel = buttons.find((b: any) => b.style === 'cancel');

    // The cancel button carries no handler at all — declining is the absence of
    // an action, which is what makes it impossible to get wrong.
    expect(cancel.text).toBe(CLEAR_CONFIRM_CANCEL);
    expect(cancel.onPress).toBeUndefined();
    expect(mockDeleteTask).not.toHaveBeenCalled();
    expect(queryByTestId('captured-tasks-row-t1')).toBeTruthy();
  });

  it('does not style the confirm as destructive', async () => {
    // Mirrors the TB-1c block-removal Alert, deliberately: clearing a task you
    // captured yourself is housekeeping, not an error. Same reasoning as the
    // Muted Sage Gray button.
    const { getByTestId } = await openRow();

    fireEvent.press(getByTestId('capture-task-clear'));

    const buttons = mockAlert.mock.calls[0][2];
    const accept = buttons.find((b: any) => b.text === CLEAR_CONFIRM_ACCEPT);
    expect(accept.style).toBeUndefined();
  });

  it('surfaces a failed clear rather than pretending it worked', async () => {
    mockDeleteTask.mockRejectedValue(new Error('offline'));
    const { getByTestId } = await openRow();

    fireEvent.press(getByTestId('capture-task-clear'));
    await confirmAlert();

    // A second Alert, carrying the failure.
    expect(mockAlert).toHaveBeenCalledTimes(2);
    expect(mockAlert.mock.calls[1][0]).toBe(CLEAR_CONFIRM_TITLE);
  });
});

describe('CaptureTaskSheet — the demand gate', () => {
  const openSheet = async () => {
    const utils = render(<CapturedTasksScreen />);
    await utils.findByTestId('captured-tasks-empty');
    fireEvent.press(utils.getByTestId('captured-tasks-capture'));
    await utils.findByTestId('capture-task-sheet');
    return utils;
  };

  it('preselects no demand', async () => {
    // "How much does this take out of you?" is a felt question; pre-filling it
    // assigns the user a state instead of acknowledging one. A default was
    // tried on the blocks sheet and reverted — do not reintroduce it here.
    const { getByTestId } = await openSheet();

    for (const option of ['light', 'medium', 'heavy']) {
      expect(
        getByTestId(`capture-task-demand-${option}`).props.accessibilityState.selected
      ).toBe(false);
    }
  });

  it('refuses to save with a title but no demand, and says what is missing', async () => {
    const { getByTestId, findByTestId } = await openSheet();

    fireEvent.changeText(getByTestId('capture-task-title'), 'Q3 board deck');
    fireEvent.press(getByTestId('capture-task-confirm'));

    expect(await findByTestId('capture-task-hint')).toBeTruthy();
    expect(mockCreateTask).not.toHaveBeenCalled();
  });

  it('refuses to save with a demand but no title', async () => {
    const { getByTestId, findByTestId } = await openSheet();

    fireEvent.press(getByTestId('capture-task-demand-heavy'));
    fireEvent.press(getByTestId('capture-task-confirm'));

    expect(await findByTestId('capture-task-hint')).toBeTruthy();
    expect(mockCreateTask).not.toHaveBeenCalled();
  });

  it('refuses a whitespace-only title', async () => {
    const { getByTestId, findByTestId } = await openSheet();

    fireEvent.changeText(getByTestId('capture-task-title'), '   ');
    fireEvent.press(getByTestId('capture-task-demand-light'));
    fireEvent.press(getByTestId('capture-task-confirm'));

    expect(await findByTestId('capture-task-hint')).toBeTruthy();
    expect(mockCreateTask).not.toHaveBeenCalled();
  });

  it('NEVER announces the primary as disabled, even while incomplete', async () => {
    // THE ACCESSIBILITY RULE, and it is two decisions that are really one:
    // assistive tech refuses to ACTIVATE a control announced disabled, so
    // "tap it to learn what is missing" would be sighted-only. The button is
    // dimmed but genuinely activatable, and the reason reaches screen readers
    // through the hint, which is read on focus without any tap.
    const { getByTestId } = await openSheet();

    const primary = getByTestId('capture-task-confirm');
    expect(primary.props.accessibilityState?.disabled).toBeFalsy();
    expect(primary.props.accessibilityHint).toBeTruthy();
  });

  it('drops the hint once the capture is complete', async () => {
    const { getByTestId, queryByTestId, findByTestId } = await openSheet();

    fireEvent.press(getByTestId('capture-task-confirm'));
    await findByTestId('capture-task-hint');

    fireEvent.changeText(getByTestId('capture-task-title'), 'Q3 board deck');
    fireEvent.press(getByTestId('capture-task-demand-heavy'));

    await waitFor(() => expect(queryByTestId('capture-task-hint')).toBeNull());
    expect(getByTestId('capture-task-confirm').props.accessibilityHint).toBeUndefined();
  });

  it('renders the mockup D primary label', async () => {
    const { getByText } = await openSheet();
    expect(getByText(SAVE_CTA)).toBeTruthy();
  });

  it('offers no duration, time, or suggestion machinery', async () => {
    // The absence IS the design: "this is the entire capture form. Name plus
    // demand." A field creeping in from AddBlockSheet fails here.
    const { queryByTestId, queryByText } = await openSheet();

    expect(queryByTestId('capture-task-duration-30')).toBeNull();
    expect(queryByTestId('capture-task-time')).toBeNull();
    expect(queryByText('FOCUS RHYTHMS')).toBeNull();
    expect(queryByText(CAPTURE_TARGET)).toBeTruthy(); // the screen behind it
  });
});

// ---- the task-to-block bridge (TB-3) ----

const NINE_AM = new Date(2026, 7, 14, 9, 0, 0);
const ELEVEN_AM = new Date(2026, 7, 14, 11, 0, 0);

describe('the Blocked chip', () => {
  it('reads today and tomorrow in ONE range query, on the existing index', async () => {
    // A single call over a two-day window, not one call per day: the composite
    // is (userId, startAt), so one range covers both and no new index ships.
    render(<CapturedTasksScreen />);

    await waitFor(() => expect(mockListBlocks).toHaveBeenCalled());
    expect(mockListBlocks).toHaveBeenCalledTimes(1);

    const [uid, start, end] = mockListBlocks.mock.calls[0];
    expect(uid).toBe('u1');
    // Local midnight today...
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    // ...to local midnight two days on, so today and tomorrow are both inside.
    expect(end.getHours()).toBe(0);
    expect(Math.round((end.getTime() - start.getTime()) / 86_400_000)).toBe(2);
  });

  it('renders the chip on a task that has a block', async () => {
    mockListTasks.mockResolvedValue([task('t1', 'Q3 board deck', 'heavy')]);
    mockListBlocks.mockResolvedValue([block('b1', NINE_AM, 't1')]);

    const { findByTestId } = render(<CapturedTasksScreen />);

    const chip = await findByTestId('task-blocked-t1');
    expect(chip).toBeTruthy();
    expect(chip.props.children).toBe(blockedAt(NINE_AM));
  });

  it('ships the meridiem, diverging from the mockup deliberately', async () => {
    // The drawing says "Blocked · 9:00". A bare 12-hour time makes a 9 AM and a
    // 9 PM block render identically, which is the exact ambiguity that cost a
    // walk round on the block cards. Pinned so it cannot drift back.
    mockListTasks.mockResolvedValue([task('t1', 'Q3 board deck', 'heavy')]);
    mockListBlocks.mockResolvedValue([block('b1', NINE_AM, 't1')]);

    const { findByTestId } = render(<CapturedTasksScreen />);

    expect((await findByTestId('task-blocked-t1')).props.children).toContain('AM');
  });

  it('leaves an unblocked task with no chip', async () => {
    mockListTasks.mockResolvedValue([
      task('t1', 'Q3 board deck', 'heavy'),
      task('t2', 'Expense report', 'light'),
    ]);
    mockListBlocks.mockResolvedValue([block('b1', NINE_AM, 't1')]);

    const { findByTestId, queryByTestId } = render(<CapturedTasksScreen />);

    await findByTestId('task-blocked-t1');
    expect(queryByTestId('task-blocked-t2')).toBeNull();
  });

  it('folds the chip into the row label rather than making a second node', async () => {
    // BlockCard's one-announcement pattern. A screen-reader user hears the task
    // and its status as one string; the chip itself is not separately focusable.
    mockListTasks.mockResolvedValue([task('t1', 'Q3 board deck', 'heavy')]);
    mockListBlocks.mockResolvedValue([block('b1', NINE_AM, 't1')]);

    const { findByTestId } = render(<CapturedTasksScreen />);

    const row = await findByTestId('captured-tasks-row-t1');
    expect(row.props.accessibilityLabel).toBe(
      `Q3 board deck. ${blockedAt(NINE_AM)}`
    );
  });

  it('shows the EARLIEST block when a task somehow has two', async () => {
    // Not reachable through the UI — Block it is hidden the moment a task has a
    // block — but reachable across two devices, so the chip is deterministic
    // rather than dependent on array order.
    mockListTasks.mockResolvedValue([task('t1', 'Q3 board deck', 'heavy')]);
    mockListBlocks.mockResolvedValue([
      block('b1', NINE_AM, 't1'),
      block('b2', ELEVEN_AM, 't1'),
    ]);

    const { findByTestId } = render(<CapturedTasksScreen />);

    expect((await findByTestId('task-blocked-t1')).props.children).toBe(
      blockedAt(NINE_AM)
    );
  });

  it('drops the chip once the block is gone, on the next load', async () => {
    // No cleanup write anywhere: the chip is derived, so deleting the block is
    // the whole of "unblock this task".
    mockListTasks.mockResolvedValue([task('t1', 'Q3 board deck', 'heavy')]);
    mockListBlocks.mockResolvedValue([block('b1', NINE_AM, 't1')]);

    const first = render(<CapturedTasksScreen />);
    await first.findByTestId('task-blocked-t1');
    first.unmount();

    // The block is removed from the day view. Nothing else happens anywhere.
    mockListBlocks.mockResolvedValue([]);

    const second = render(<CapturedTasksScreen />);
    await second.findByTestId('captured-tasks-row-t1');
    expect(second.queryByTestId('task-blocked-t1')).toBeNull();

    // The task itself is untouched — nothing was written to unblock it.
    expect(mockUpdateTask).not.toHaveBeenCalled();
    expect(mockDeleteTask).not.toHaveBeenCalled();
  });

  it('ignores a block pointing at a task that was cleared', async () => {
    mockListTasks.mockResolvedValue([task('t1', 'Q3 board deck', 'heavy')]);
    mockListBlocks.mockResolvedValue([block('b1', NINE_AM, 'cleared-task')]);

    const { findByTestId, queryByTestId } = render(<CapturedTasksScreen />);

    await findByTestId('captured-tasks-row-t1');
    expect(queryByTestId('task-blocked-t1')).toBeNull();
  });
});

describe('a failed blocks read degrades to no chips, never to no tasks', () => {
  it('still renders every task when the blocks read rejects', async () => {
    // THE RANKED FAILURE MODES, PINNED. The tasks read is what the screen IS;
    // the blocks read only decorates it. Awaiting both together in one
    // Promise.all would let a dayBlocks outage empty the user's capture list.
    mockListTasks.mockResolvedValue([
      task('t1', 'Q3 board deck', 'heavy'),
      task('t2', 'Expense report', 'light'),
    ]);
    mockListBlocks.mockRejectedValue(new Error('index missing'));

    const { findByTestId, queryByTestId, queryByText } = render(<CapturedTasksScreen />);

    expect(await findByTestId('captured-tasks-row-t1')).toBeTruthy();
    expect(await findByTestId('captured-tasks-row-t2')).toBeTruthy();
    // No chips, and emphatically not the empty copy.
    expect(queryByTestId('task-blocked-t1')).toBeNull();
    expect(queryByText(EMPTY_LINE)).toBeNull();
  });

  it('keeps the sheet reachable when the blocks read rejects', async () => {
    // Degraded chips must not degrade the actions. Editing, clearing and
    // capturing all still work with no block data at all.
    mockListTasks.mockResolvedValue([task('t1', 'Q3 board deck', 'heavy')]);
    mockListBlocks.mockRejectedValue(new Error('offline'));

    const { findByTestId, findByText } = render(<CapturedTasksScreen />);

    fireEvent.press(await findByTestId('captured-tasks-row-t1'));
    expect(await findByText(EDIT_TITLE)).toBeTruthy();
  });

  it('still shows the empty copy when the TASKS read rejects', async () => {
    // The other direction, unchanged from TB-2b: an empty list is a legitimate
    // state, so a tasks failure shows the warm line rather than an error screen.
    mockListTasks.mockRejectedValue(new Error('offline'));
    mockListBlocks.mockResolvedValue([]);

    const { findByTestId } = render(<CapturedTasksScreen />);

    expect(await findByTestId('captured-tasks-empty')).toBeTruthy();
  });
});

describe('Block it', () => {
  const openEdit = async (blocks: any[] = []) => {
    mockListTasks.mockResolvedValue([task('t1', 'Q3 board deck', 'heavy')]);
    mockListBlocks.mockResolvedValue(blocks);
    const utils = render(<CapturedTasksScreen />);
    fireEvent.press(await utils.findByTestId('captured-tasks-row-t1'));
    await utils.findByText(EDIT_TITLE);
    return utils;
  };

  it('offers Block it in the edit sheet, not on the row', async () => {
    // The mockup draws the action per row and asks the question in its own
    // annotation: "three tappables per group... or tap a task, act from a
    // sheet." TB-2c answered it for edit and clear; this follows.
    const { getByTestId, queryByTestId } = await openEdit();

    expect(getByTestId('capture-task-block-it')).toBeTruthy();
    // The row itself gained no second target.
    expect(queryByTestId('captured-tasks-row-t1').props.children).toBeTruthy();
  });

  it('is absent on the capture sheet, which has no task to place', async () => {
    const { findByTestId, queryByTestId } = render(<CapturedTasksScreen />);

    fireEvent.press(await findByTestId('captured-tasks-capture'));
    await findByTestId('capture-task-sheet');

    expect(queryByTestId('capture-task-block-it')).toBeNull();
  });

  it('is HIDDEN on a task that already has a block', async () => {
    // The chip and the action are mutually exclusive, and structurally so: the
    // screen withholds the handler, so the sheet has no branch to get wrong.
    const { queryByTestId } = await openEdit([block('b1', NINE_AM, 't1')]);

    expect(queryByTestId('capture-task-block-it')).toBeNull();
  });

  it('navigates to the day view carrying title, demand and task id', async () => {
    const { getByTestId } = await openEdit();

    fireEvent.press(getByTestId('capture-task-block-it'));

    expect(mockNavigate).toHaveBeenCalledWith(ROUTES.FocusDayBlocks, {
      seedTitle: 'Q3 board deck',
      seedDemand: 'heavy',
      seedTaskId: 't1',
    });
  });

  it('closes the sheet before leaving', async () => {
    // Navigating out from under an open modal leaves it mounted behind the
    // pushed screen and visible again on the way back.
    const { getByTestId, queryByTestId } = await openEdit();

    fireEvent.press(getByTestId('capture-task-block-it'));

    await waitFor(() =>
      expect(queryByTestId('capture-task-sheet')).toBeNull()
    );
  });

  it('writes nothing — placing a task is a navigation, not a mutation', async () => {
    const { getByTestId } = await openEdit();

    fireEvent.press(getByTestId('capture-task-block-it'));

    expect(mockUpdateTask).not.toHaveBeenCalled();
    expect(mockDeleteTask).not.toHaveBeenCalled();
    expect(mockCreateTask).not.toHaveBeenCalled();
  });

  it('renders the mockup label', async () => {
    const { getByText } = await openEdit();
    expect(getByText(BLOCK_IT)).toBeTruthy();
  });
});
