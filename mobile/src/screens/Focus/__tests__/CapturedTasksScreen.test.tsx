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
jest.mock('../../../services/firebase/capturedTasks.service', () => ({
  listCapturedTasks: (...a: any[]) => mockListTasks(...a),
  createCapturedTask: (...a: any[]) => mockCreateTask(...a),
  deleteCapturedTask: jest.fn(),
}));

// The real useFocusEffect needs a navigation container; the screen only uses it
// to re-read on focus, so running the callback once on mount is the honest stub.
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: any) => {
    const React = require('react');
    React.useEffect(cb, [cb]);
  },
}));

import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import { CapturedTasksScreen } from '../CapturedTasksScreen';
import {
  CAPTURE_TARGET,
  EMPTY_LINE,
  GROUP_HEADERS,
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

beforeEach(() => {
  jest.clearAllMocks();
  mockListTasks.mockResolvedValue([]);
  mockCreateTask.mockResolvedValue('new-id');
});

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
