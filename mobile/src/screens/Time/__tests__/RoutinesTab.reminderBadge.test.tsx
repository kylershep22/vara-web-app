/**
 * RoutinesTab: the reminder badge render guard (ROUTINE-REMINDERS R-J).
 *
 * The badge shows a stored reminder time only when the single parser accepts
 * it. A legacy unparseable value (the before-state captured "730") is hidden,
 * and rendering never writes: it stays stored until the next editor save
 * resolves it to null (R-D).
 */
import React from 'react';
import { render, waitFor, fireEvent, act } from '@testing-library/react-native';

const mockFetchActive = jest.fn();
const mockUpdateRoutine = jest.fn();
const mockCreateRoutine = jest.fn();

// A stable user object: the tab reloads whenever `user` changes identity.
const mockAuth = { user: { uid: 'u1' } };
jest.mock('../../../context/AuthContext', () => ({ useAuth: () => mockAuth }));
jest.mock('../../../services/firebase/routines.service', () => ({
  fetchActiveRoutineByType: (...a: unknown[]) => mockFetchActive(...a),
  updateRoutine: (...a: unknown[]) => mockUpdateRoutine(...a),
  createRoutine: (...a: unknown[]) => mockCreateRoutine(...a),
  markRoutineComplete: jest.fn(),
  calculateTotalDuration: (acts: { duration: number }[]) =>
    acts.reduce((t, a) => t + a.duration, 0),
}));
jest.mock('../../../services/firebase/routineMigration.service', () => ({
  runMigrationIfNeeded: jest.fn(),
}));
jest.mock('../../../components', () => ({ LoadingSpinner: () => null }));
jest.mock('../../../components/routines/RoutineEditor', () => ({ RoutineEditor: () => null }));
jest.mock('react-native-draggable-flatlist', () => ({
  __esModule: true,
  default: () => null,
  ScaleDecorator: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('../components', () => ({
  TimeOfDaySelector: () => null,
  ActivityListItem: () => null,
  AddActivityButton: () => null,
  ChecklistPlayer: () => null,
  RoutineCompleteState: () => null,
}));
jest.mock('../../../config/firebase', () => ({ db: null }));
const mockCancelOne = jest.fn().mockResolvedValue(undefined);
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: (id: string) => mockCancelOne(id),
  getAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve([])),
  IosAuthorizationStatus: { PROVISIONAL: 3, EPHEMERAL: 4 },
  SchedulableTriggerInputTypes: { DAILY: 'daily' },
}));

import { RoutinesTab } from '../RoutinesTab';

function routine(reminderTime: string | null) {
  return {
    id: 'r1',
    userId: 'u1',
    name: 'The Essentials',
    type: 'morning',
    activities: [{ id: 1, name: 'Stretch', duration: 5, order: 0, icon: 'run', color: 'teal' }],
    active: true,
    reminderTime,
    mode: 'checklist',
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('the RoutinesTab reminder badge', () => {
  test('shows a parseable stored time', async () => {
    mockFetchActive.mockResolvedValue(routine('7:30 PM'));
    const view = render(<RoutinesTab onStartRoutine={jest.fn()} />);

    await waitFor(() => expect(view.getByText('The Essentials')).toBeTruthy());
    expect(view.getByText('7:30 PM')).toBeTruthy();
  });

  test('hides an unparseable stored value, and writes nothing', async () => {
    // Mutation caught: removing the parseTimeString guard from the badge.
    mockFetchActive.mockResolvedValue(routine('730'));
    const view = render(<RoutinesTab onStartRoutine={jest.fn()} />);

    await waitFor(() => expect(view.getByText('The Essentials')).toBeTruthy());
    expect(view.queryByText('730')).toBeNull();
    expect(mockUpdateRoutine).not.toHaveBeenCalled();
    expect(mockCreateRoutine).not.toHaveBeenCalled();
  });

  test('a stored "08:00" displays as 8:00 AM, and writes nothing (ROUTINE-REMINDER-TIME-PICKER R-7)', async () => {
    // Mutation caught: rendering the raw stored text in the badge.
    mockFetchActive.mockResolvedValue(routine('08:00'));
    const view = render(<RoutinesTab onStartRoutine={jest.fn()} />);

    await waitFor(() => expect(view.getByText('The Essentials')).toBeTruthy());
    expect(view.getByText('8:00 AM')).toBeTruthy();
    expect(view.queryByText('08:00')).toBeNull();
    expect(mockUpdateRoutine).not.toHaveBeenCalled();
    expect(mockCreateRoutine).not.toHaveBeenCalled();
  });
});

describe('R-H at the RoutinesTab template call site', () => {
  test("applying a template cancels the reminder of every routine it deactivated", async () => {
    // Mutation caught: ignoring deactivatedIds at the template call site.
    // Reachable only through the failed-load empty state (ledgered as
    // ROUTINE-LOAD-FAILURE-EMPTY-STATE); here the empty state is simply mounted.
    mockFetchActive.mockResolvedValue(null);
    mockCreateRoutine.mockResolvedValue({ id: 'new1', deactivatedIds: ['old1'] });
    const view = render(<RoutinesTab onStartRoutine={jest.fn()} />);

    const card = await waitFor(() => view.getByLabelText('Use The Essentials template'));
    await act(async () => {
      fireEvent.press(card);
    });

    await waitFor(() => expect(mockCancelOne).toHaveBeenCalledWith('routine-reminder-old1'));
  });
});
