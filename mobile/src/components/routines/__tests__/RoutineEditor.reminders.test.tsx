/**
 * RoutineEditor: the reminder save flow (ROUTINE-REMINDERS, 2026-10-01).
 *
 * Every branch of Kyle's rulings R-D, R-E and R-G, driven through the rendered
 * editor: the field is edited with fireEvent, Save and Delete are pressed with
 * fireEvent, and each alert button is pressed by calling the onPress captured
 * from jest.spyOn(Alert, 'alert'). That is the same function the native alert
 * calls, but the native alert itself is not rendered here, so a test proves the
 * flow's logic, not that iOS shows the dialog. The walk owns that.
 *
 * expo-notifications is mocked at its boundary and reminderScheduler.service
 * runs for real, so a schedule is observed as the identifier the OS receives.
 *
 * ROUTINE-REMINDER-TIME-PICKER (2026-10-01): the reminder is picked, not typed.
 * `setTime` opens the reminder row, drives the shared TimePickerSheet's
 * DateTimePicker (stubbed as the TimePickerSheet suite stubs it) and presses
 * Done. The picker-era rulings R-1 to R-8 are pinned at the end of the file.
 */
import React from 'react';
import { Alert, AlertButton, Linking, Modal, Platform } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

const mockGetPerms = jest.fn();
const mockRequestPerms = jest.fn();
const mockSchedule = jest.fn().mockResolvedValue('id');
const mockCancelOne = jest.fn().mockResolvedValue(undefined);
const mockUpdateRoutine = jest.fn().mockResolvedValue(undefined);
const mockCreateRoutine = jest.fn();
const mockDeleteRoutine = jest.fn().mockResolvedValue(undefined);

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: () => mockGetPerms(),
  requestPermissionsAsync: () => mockRequestPerms(),
  scheduleNotificationAsync: (...a: unknown[]) => mockSchedule(...a),
  cancelScheduledNotificationAsync: (id: string) => mockCancelOne(id),
  getAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve([])),
  setNotificationHandler: jest.fn(),
  IosAuthorizationStatus: {
    NOT_DETERMINED: 0,
    DENIED: 1,
    AUTHORIZED: 2,
    PROVISIONAL: 3,
    EPHEMERAL: 4,
  },
  AndroidNotificationPriority: { DEFAULT: 'default', HIGH: 'high' },
  SchedulableTriggerInputTypes: { DAILY: 'daily', CALENDAR: 'calendar', DATE: 'date' },
}));
jest.mock('../../../services/firebase/routines.service', () => ({
  createRoutine: (...a: unknown[]) => mockCreateRoutine(...a),
  updateRoutine: (...a: unknown[]) => mockUpdateRoutine(...a),
  deleteRoutine: (...a: unknown[]) => mockDeleteRoutine(...a),
  fetchUserRoutines: jest.fn().mockResolvedValue([]),
  calculateTotalDuration: (acts: { duration: number }[]) =>
    acts.reduce((t, a) => t + a.duration, 0),
}));
// getPermissionsStatus is the editor's status read (ruling E3). It forwards to
// the same mocked OS call, so the test controls one source of truth.
jest.mock('../../../services/notifications.service', () => ({
  getPermissionsStatus: () => mockGetPerms(),
  // NPM-3a-ii: the editor asks through the app's one request path, which
  // forwards to the same mocked OS request.
  requestOsNotificationPermission: () => mockRequestPerms(),
}));
jest.mock('../../../config/firebase', () => ({ db: null }));
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');
// The components barrel pulls in analytics and its native modules. Button and
// Card stand in as plain pressables and views; Button still forwards onPress
// and disabled, so Save and Delete are pressed through the real handlers.
type StubProps = { children?: React.ReactNode; onPress?: () => void; disabled?: boolean };
jest.mock('../../index', () => {
  const RN = jest.requireActual('react-native');
  const R = jest.requireActual('react');
  return {
    Button: ({ children, onPress, disabled }: StubProps) =>
      R.createElement(
        RN.TouchableOpacity,
        { onPress, disabled, accessibilityRole: 'button' },
        typeof children === 'string' ? R.createElement(RN.Text, null, children) : children
      ),
    Card: ({ children }: StubProps) => R.createElement(RN.View, null, children),
  };
});

import { RoutineEditor } from '../RoutineEditor';
import { Routine } from '../../../services/firebase/routines.service';
import * as scheduler from '../../../services/reminderScheduler.service';

const activities = [{ id: 1, name: 'Stretch', duration: 5, order: 0, icon: 'run', color: 'teal' }];

function existing(reminderTime: string | null): Routine {
  return {
    id: 'r1',
    userId: 'u1',
    name: 'The Essentials',
    type: 'morning',
    activities,
    active: true,
    reminderTime,
    mode: 'checklist',
    createdAt: {} as Routine['createdAt'],
    updatedAt: {} as Routine['updatedAt'],
  };
}

let alertSpy: jest.SpyInstance;
const onSave = jest.fn();
const onCancel = jest.fn();

function mount(routine: Routine | null) {
  return render(
    <RoutineEditor
      userId="u1"
      routineType="morning"
      existingRoutine={routine}
      onSave={onSave}
      onCancel={onCancel}
    />
  );
}

function openRow(view: ReturnType<typeof mount>) {
  fireEvent.press(view.getByTestId('routine-reminder-row'));
}

/** Scroll the open sheet's wheel, as an iOS spinner tick would. */
function scrollTo(view: ReturnType<typeof mount>, hour: number, minute: number) {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  fireEvent(view.UNSAFE_getByType('DateTimePicker' as never), 'change', { type: 'set' }, d);
}

/** The time the open sheet's wheel is showing. */
function wheel(view: ReturnType<typeof mount>): [number, number] {
  const value = view.UNSAFE_getByType('DateTimePicker' as never).props.value as Date;
  return [value.getHours(), value.getMinutes()];
}

/** Picks a time through the row, the sheet and Done. `value` is any time parseTimeString reads. */
function setTime(view: ReturnType<typeof mount>, value: string) {
  const t = scheduler.parseTimeString(value);
  if (!t) throw new Error(`setTime needs a valid time, got "${value}"`);
  openRow(view);
  scrollTo(view, t.hour, t.minute);
  fireEvent.press(view.getByTestId('time-picker-done'));
}

/** Every reminderTime the editor persisted, from updates and creates. */
const persistedTimes = (): unknown[] => [
  ...mockUpdateRoutine.mock.calls.map((c) => (c[1] as { reminderTime: unknown }).reminderTime),
  ...mockCreateRoutine.mock.calls.map((c) => (c[1] as { reminderTime: unknown }).reminderTime),
];

/** Adds one activity through the activity library modal (a create starts empty). */
function addActivity(view: ReturnType<typeof mount>) {
  fireEvent.press(view.getByText('Add Activity'));
  fireEvent.press(view.getByText('Meditation'));
}

async function save(view: ReturnType<typeof mount>, label: string) {
  await act(async () => {
    fireEvent.press(view.getByText(label));
  });
}

/** The nth alert: [title, body, buttons]. */
function alertAt(n: number): [string, string, AlertButton[]] {
  return alertSpy.mock.calls[n] as [string, string, AlertButton[]];
}

async function press(n: number, buttonText: string) {
  const button = alertAt(n)[2].find((b) => b.text === buttonText);
  if (!button?.onPress) throw new Error(`no "${buttonText}" button on alert ${n}`);
  await act(async () => {
    await button.onPress!();
  });
}

const scheduledIds = () =>
  mockSchedule.mock.calls.map((c) => (c[0] as { identifier: string }).identifier);

beforeEach(() => {
  jest.clearAllMocks();
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  mockGetPerms.mockResolvedValue({ status: 'granted' });
  mockRequestPerms.mockResolvedValue({ status: 'granted' });
  mockCreateRoutine.mockResolvedValue({ id: 'new1', deactivatedIds: [] });
});

afterEach(() => {
  alertSpy.mockRestore();
});

describe('the reminder row (R-2, R-3)', () => {
  test('no reminder: the section label, Add a reminder, its full label, and no Remove', () => {
    // Mutations caught: the old label or helper restored; a row label that
    // leans on the heading; Remove shown with no reminder.
    const view = mount(existing(null));
    expect(view.getByText('Reminder (optional)')).toBeTruthy();
    expect(view.getByText('Add a reminder')).toBeTruthy();
    const row = view.getByTestId('routine-reminder-row');
    expect(row.props.accessibilityRole).toBe('button');
    expect(row.props.accessibilityLabel).toBe('Reminder, add a reminder');
    expect(view.queryByTestId('routine-reminder-remove')).toBeNull();
    // The helper line, the old label and the free-text field are gone.
    expect(view.queryByText('Optional. For example, 7:30 AM or 7:30 PM.')).toBeNull();
    expect(view.queryByText('Reminder Time (Optional)')).toBeNull();
    expect(view.queryByPlaceholderText('08:00')).toBeNull();
  });

  test('a set reminder: the formatted time, its full label, and Remove reminder', () => {
    // Mutation caught: a set-row label missing "Reminder, " or the time.
    const view = mount(existing('7:30 PM'));
    expect(view.getByText('7:30 PM')).toBeTruthy();
    const row = view.getByTestId('routine-reminder-row');
    expect(row.props.accessibilityRole).toBe('button');
    expect(row.props.accessibilityLabel).toBe('Reminder, 7:30 PM');
    const remove = view.getByTestId('routine-reminder-remove');
    expect(remove.props.accessibilityRole).toBe('button');
    expect(remove.props.accessibilityLabel).toBe('Remove reminder');
    expect(view.getByText('Remove reminder')).toBeTruthy();
  });
});

describe('E1: no reminder', () => {
  test('edit: Remove reminder then save cancels the reminder and closes with no alert', async () => {
    // The field was cleared by typing; it is now cleared by Remove reminder
    // (R-1, R-6), and lands on the same empty path. Mutations caught: dropping
    // the E1 cancel on the edit path; Remove not clearing the model.
    const view = mount(existing('7:30 PM'));
    fireEvent.press(view.getByTestId('routine-reminder-remove'));
    expect(view.getByText('Add a reminder')).toBeTruthy();
    expect(view.queryByTestId('routine-reminder-remove')).toBeNull();
    await save(view, 'Update Routine');

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(mockUpdateRoutine).toHaveBeenCalledWith('r1', expect.objectContaining({ reminderTime: null }));
    expect(mockCancelOne).toHaveBeenCalledWith('routine-reminder-r1');
    expect(alertSpy).not.toHaveBeenCalled();
    expect(mockRequestPerms).not.toHaveBeenCalled();
  });

  test('create with no time: closes with no alert, no permission request, nothing scheduled', async () => {
    // Mutation caught: restoring the generic create success alert.
    const view = mount(null);
    addActivity(view);
    await save(view, 'Save Routine');

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(mockCreateRoutine).toHaveBeenCalledWith('u1', expect.objectContaining({ reminderTime: null }));
    expect(alertSpy).not.toHaveBeenCalled();
    expect(mockRequestPerms).not.toHaveBeenCalled();
    expect(mockSchedule).not.toHaveBeenCalled();
  });
});

describe('E2: invalid at the save boundary (defensive, R-6)', () => {
  // NOT REACHABLE FROM THE UI. The picker-era model only ever holds a valid
  // time or null. Malformed input is forced to the save boundary here by
  // making the single parser reject the model's value after it loaded.
  test('persists null, cancels, shows Check the reminder time with the new body, never asks permission', async () => {
    // Mutations caught: persisting the rejected text, requesting permission,
    // or keeping the old "Enter a time" body.
    mockGetPerms.mockResolvedValue({ status: 'undetermined' });
    const view = mount(existing('7:30 PM'));
    const parseSpy = jest.spyOn(scheduler, 'parseTimeString').mockReturnValue(null);
    await save(view, 'Update Routine');
    parseSpy.mockRestore();

    await waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(1));
    expect(mockUpdateRoutine).toHaveBeenCalledWith('r1', expect.objectContaining({ reminderTime: null }));
    expect(mockCancelOne).toHaveBeenCalledWith('routine-reminder-r1');
    expect(mockRequestPerms).not.toHaveBeenCalled();
    expect(mockSchedule).not.toHaveBeenCalled();
    const [title, body, buttons] = alertAt(0);
    expect(title).toBe('Check the reminder time');
    expect(body).toBe('Your routine is saved without a reminder. Choose a time to add one.');
    expect(buttons.map((b) => b.text)).toEqual(['OK']);

    expect(onSave).not.toHaveBeenCalled();
    await press(0, 'OK');
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  test('a legacy unparseable stored value resolves to null on the next save, with no alert', async () => {
    // MEANING CHANGED (R-6): this used to expect Check the reminder time. A
    // legacy value the user cannot see is null in the model, so the save
    // takes the empty-field path. Mutations caught: keeping the legacy text;
    // restoring the old validation alert on this path.
    const view = mount(existing('730'));
    await save(view, 'Update Routine');

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(mockUpdateRoutine).toHaveBeenCalledWith('r1', expect.objectContaining({ reminderTime: null }));
    expect(mockCancelOne).toHaveBeenCalledWith('routine-reminder-r1');
    expect(alertSpy).not.toHaveBeenCalled();
  });
});

describe('E3: granted', () => {
  test('a changed time: cancels, schedules under routine-reminder-{id}, shows Reminder set with the formatted time', async () => {
    // Mutation caught: skipping the cancel, or announcing an unformatted time.
    const view = mount(existing('8:00'));
    setTime(view, '19:05');
    await save(view, 'Update Routine');

    await waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(1));
    expect(mockUpdateRoutine).toHaveBeenCalledWith('r1', expect.objectContaining({ reminderTime: '7:05 PM' }));
    expect(mockCancelOne).toHaveBeenCalledWith('routine-reminder-r1');
    expect(scheduledIds()).toEqual(['routine-reminder-r1']);
    // The cancel precedes the schedule.
    expect(mockCancelOne.mock.invocationCallOrder[0]).toBeLessThan(mockSchedule.mock.invocationCallOrder[0]);
    const [title, body, buttons] = alertAt(0);
    expect(title).toBe('Reminder set');
    expect(body).toBe('Your routine is saved. Vara will remind you at 7:05 PM.');
    expect(buttons.map((b) => b.text)).toEqual(['OK']);
    await press(0, 'OK');
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  test('a picked time persists as the formatted time', async () => {
    // MEANING CHANGED (R-6): this used to pin the trimmed typed text. The
    // picker writes the formatted time. Mutation caught: storing 24-hour text.
    const view = mount(existing(null));
    setTime(view, '19:30');
    await save(view, 'Update Routine');

    await waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(1));
    expect(mockUpdateRoutine).toHaveBeenCalledWith('r1', expect.objectContaining({ reminderTime: '7:30 PM' }));
    expect(alertAt(0)[1]).toBe('Your routine is saved. Vara will remind you at 7:30 PM.');
  });

  test('an unchanged time reschedules and closes silently', async () => {
    // Mutation caught: announcing an unchanged reminder.
    const view = mount(existing('7:30 PM'));
    fireEvent.changeText(view.getByDisplayValue('The Essentials'), 'Renamed');
    await save(view, 'Update Routine');

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(scheduledIds()).toEqual(['routine-reminder-r1']);
    expect(alertSpy).not.toHaveBeenCalled();
    expect(mockRequestPerms).not.toHaveBeenCalled();
  });

  test('a picked 7:30 PM is unchanged from a stored "19:30" (compared as parsed hours and minutes)', async () => {
    // R-8. The stored text differs ("19:30" against the picker's "7:30 PM");
    // the time does not. Mutation caught: comparing the raw text.
    const view = mount(existing('19:30'));
    setTime(view, '7:30 PM');
    await save(view, 'Update Routine');

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(alertSpy).not.toHaveBeenCalled();
  });

  test('a scheduling throw shows Reminder not set, even when the time is unchanged', async () => {
    // Mutation caught: closing silently on an unchanged time that failed.
    mockSchedule.mockRejectedValueOnce(new Error('boom'));
    const view = mount(existing('7:30 PM'));
    await save(view, 'Update Routine');

    await waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(1));
    const [title, body, buttons] = alertAt(0);
    expect(title).toBe('Reminder not set');
    expect(body).toBe(
      "Your routine is saved, but the reminder couldn't be scheduled. Open the routine and try again."
    );
    expect(buttons.map((b) => b.text)).toEqual(['OK']);
    await press(0, 'OK');
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  test('create with a valid time schedules under the new id and announces it', async () => {
    // Mutation caught: scheduling a changed time without announcing it.
    const view = mount(null);
    addActivity(view);
    setTime(view, '7:30 AM');
    await save(view, 'Save Routine');

    await waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(1));
    expect(scheduledIds()).toEqual(['routine-reminder-new1']);
    expect(alertAt(0)[0]).toBe('Reminder set');
    expect(alertAt(0)[1]).toBe('Your routine is saved. Vara will remind you at 7:30 AM.');
  });
});

describe("R-H: deactivation cancels the replaced routine's reminder", () => {
  test('create cancels the reminder of every routine it deactivated', async () => {
    // Mutation caught: ignoring deactivatedIds at the editor call site.
    mockCreateRoutine.mockResolvedValue({ id: 'new1', deactivatedIds: ['old1', 'old2'] });
    const view = mount(null);
    addActivity(view);
    await save(view, 'Save Routine');

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(mockCancelOne).toHaveBeenCalledWith('routine-reminder-old1');
    expect(mockCancelOne).toHaveBeenCalledWith('routine-reminder-old2');
  });
});

describe('E3: undetermined', () => {
  test('shows Allow reminders? with the approved strings and asks nothing until tapped', async () => {
    // Mutation caught: requesting permission straight from Save.
    mockGetPerms.mockResolvedValue({ status: 'undetermined' });
    const view = mount(existing(null));
    setTime(view, '7:30 PM');
    await save(view, 'Update Routine');

    await waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(1));
    const [title, body, buttons] = alertAt(0);
    expect(title).toBe('Allow reminders?');
    expect(body).toBe('Your routine is saved. Allow notifications to get this reminder.');
    expect(buttons.map((b) => b.text)).toEqual(['Allow notifications', 'Not now']);
    expect(mockRequestPerms).not.toHaveBeenCalled();
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  test('Not now closes the editor with nothing scheduled', async () => {
    mockGetPerms.mockResolvedValue({ status: 'undetermined' });
    const view = mount(existing(null));
    setTime(view, '7:30 PM');
    await save(view, 'Update Routine');
    await waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(1));

    await press(0, 'Not now');

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(mockSchedule).not.toHaveBeenCalled();
    expect(mockRequestPerms).not.toHaveBeenCalled();
    // Nothing scheduled includes an earlier reminder under the same id.
    // Mutation caught: dropping the editor's own cancel before the permission
    // read. On the granted path the scheduler cancels by id anyway, so only
    // the undetermined and denied paths can observe it.
    expect(mockCancelOne).toHaveBeenCalledWith('routine-reminder-r1');
  });

  test('an unchanged time still shows Allow reminders? on every save', async () => {
    // Mutation caught: gating Permission needed on a changed time.
    mockGetPerms.mockResolvedValue({ status: 'undetermined' });
    const view = mount(existing('7:30 PM'));
    await save(view, 'Update Routine');

    await waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(1));
    expect(alertAt(0)[0]).toBe('Allow reminders?');
  });

  test('iOS provisional is treated as undetermined', async () => {
    // Mutation caught: treating provisional as granted.
    mockGetPerms.mockResolvedValue({ status: 'granted', ios: { status: 3 } });
    const view = mount(existing(null));
    setTime(view, '7:30 PM');
    await save(view, 'Update Routine');

    await waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(1));
    expect(alertAt(0)[0]).toBe('Allow reminders?');
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  test('Allow then granted schedules immediately under routine-reminder-{id} and shows Reminder set', async () => {
    // Mutation caught: not scheduling after the grant.
    mockGetPerms.mockResolvedValue({ status: 'undetermined' });
    const view = mount(existing('7:30 PM'));
    await save(view, 'Update Routine');
    await waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(1));

    mockGetPerms.mockResolvedValue({ status: 'granted' });
    await press(0, 'Allow notifications');

    expect(mockRequestPerms).toHaveBeenCalledTimes(1);
    expect(scheduledIds()).toEqual(['routine-reminder-r1']);
    expect(alertAt(1)[0]).toBe('Reminder set');
    expect(alertAt(1)[1]).toBe('Your routine is saved. Vara will remind you at 7:30 PM.');
    expect(onSave).not.toHaveBeenCalled();
    await press(1, 'OK');
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  test('Allow then granted but scheduling throws shows Reminder not set', async () => {
    mockGetPerms.mockResolvedValue({ status: 'undetermined' });
    const view = mount(existing(null));
    setTime(view, '7:30 PM');
    await save(view, 'Update Routine');
    await waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(1));

    mockGetPerms.mockResolvedValue({ status: 'granted' });
    mockSchedule.mockRejectedValueOnce(new Error('boom'));
    await press(0, 'Allow notifications');

    expect(alertAt(1)[0]).toBe('Reminder not set');
  });

  test('Allow then denied shows Notifications are off', async () => {
    // Mutation caught: mapping a denial to Reminder not set.
    mockGetPerms.mockResolvedValue({ status: 'undetermined' });
    const view = mount(existing(null));
    setTime(view, '7:30 PM');
    await save(view, 'Update Routine');
    await waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(1));

    mockGetPerms.mockResolvedValue({ status: 'denied' });
    await press(0, 'Allow notifications');

    expect(alertAt(1)[0]).toBe('Notifications are off');
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  test('Allow then still undetermined shows Reminder not set, never Notifications are off', async () => {
    mockGetPerms.mockResolvedValue({ status: 'undetermined' });
    const view = mount(existing(null));
    setTime(view, '7:30 PM');
    await save(view, 'Update Routine');
    await waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(1));

    await press(0, 'Allow notifications');

    expect(alertAt(1)[0]).toBe('Reminder not set');
  });

  test('an exception from the permission request shows Reminder not set, never Notifications are off', async () => {
    // Mutation caught: routing a request exception to the denied alert.
    mockGetPerms.mockResolvedValue({ status: 'undetermined' });
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const view = mount(existing(null));
    setTime(view, '7:30 PM');
    await save(view, 'Update Routine');
    await waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(1));

    mockRequestPerms.mockRejectedValueOnce(new Error('request failed'));
    await press(0, 'Allow notifications');

    expect(alertAt(1)[0]).toBe('Reminder not set');
    expect(mockSchedule).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

describe('E3: denied', () => {
  test('a changed time shows Notifications are off with the approved strings', async () => {
    mockGetPerms.mockResolvedValue({ status: 'denied' });
    const view = mount(existing(null));
    setTime(view, '7:30 PM');
    await save(view, 'Update Routine');

    await waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(1));
    const [title, body, buttons] = alertAt(0);
    expect(title).toBe('Notifications are off');
    expect(body).toBe(
      "Your routine is saved, but Vara can't send this reminder while notifications are turned off in your device settings."
    );
    expect(buttons.map((b) => b.text)).toEqual(['Open Settings', 'Not now']);
    expect(mockRequestPerms).not.toHaveBeenCalled();
    expect(mockSchedule).not.toHaveBeenCalled();
  });

  test('an unchanged time closes with no alert', async () => {
    // Mutation caught: showing the denied alert on every save.
    mockGetPerms.mockResolvedValue({ status: 'denied' });
    const view = mount(existing('7:30 PM'));
    await save(view, 'Update Routine');

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(alertSpy).not.toHaveBeenCalled();
  });

  test('Open Settings calls Linking.openSettings and then closes the editor', async () => {
    // Mutation caught: removing the openSettings call.
    const openSpy = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
    mockGetPerms.mockResolvedValue({ status: 'denied' });
    const view = mount(existing(null));
    setTime(view, '7:30 PM');
    await save(view, 'Update Routine');
    await waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(1));

    await press(0, 'Open Settings');

    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledTimes(1);
    openSpy.mockRestore();
  });

  test('Not now closes the editor', async () => {
    mockGetPerms.mockResolvedValue({ status: 'denied' });
    const view = mount(existing(null));
    setTime(view, '7:30 PM');
    await save(view, 'Update Routine');
    await waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(1));

    await press(0, 'Not now');
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});

describe('E5: no generic success alert', () => {
  test('no save path alert is titled Success or carries an emoji', async () => {
    // Mutation caught: restoring either generic Success alert.
    for (const status of ['granted', 'undetermined', 'denied']) {
      mockGetPerms.mockResolvedValue({ status });
      const view = mount(existing(null));
      setTime(view, '7:30 PM');
      await save(view, 'Update Routine');
      view.unmount();
    }
    await waitFor(() => expect(alertSpy).toHaveBeenCalled());
    for (const [title, body] of alertSpy.mock.calls as [string, string][]) {
      expect(title).not.toBe('Success');
      expect(`${title} ${body}`).not.toMatch(/\p{Extended_Pictographic}/u);
    }
  });
});

describe('R-G: delete cancels the reminder', () => {
  async function confirmDelete(view: ReturnType<typeof mount>) {
    await act(async () => {
      fireEvent.press(view.getByText('Delete Routine'));
    });
    const confirm = alertAt(0)[2].find((b) => b.text === 'Delete');
    await act(async () => {
      await confirm!.onPress!();
    });
  }

  test('cancels routine-reminder-{id} after the delete succeeds', async () => {
    // Mutation caught: removing the cancel from handleDelete.
    const view = mount(existing('7:30 PM'));
    await confirmDelete(view);

    expect(mockDeleteRoutine).toHaveBeenCalledWith('r1');
    expect(mockCancelOne).toHaveBeenCalledWith('routine-reminder-r1');
    expect(mockDeleteRoutine.mock.invocationCallOrder[0]).toBeLessThan(
      mockCancelOne.mock.invocationCallOrder[0]
    );
  });

  test('a failed delete leaves the reminder in place', async () => {
    // Mutation caught: cancelling before the delete.
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockDeleteRoutine.mockRejectedValueOnce(new Error('offline'));
    const view = mount(existing('7:30 PM'));
    await confirmDelete(view);

    expect(mockCancelOne).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

// ─── ROUTINE-REMINDER-TIME-PICKER (Kyle's rulings R-1 to R-8, 2026-10-01) ───

describe('R-1: the picker', () => {
  test('on iOS the sheet opens inside a visible transparent Modal', () => {
    // Mutation caught: rendering the sheet outside the Modal on iOS, where
    // PlanScreen would clip it and the floating tab bar would cover it.
    const view = mount(existing(null));
    expect(view.queryByTestId('time-picker-sheet')).toBeNull();
    openRow(view);
    const hosts = view
      .UNSAFE_getAllByType(Modal)
      .filter(
        (m) =>
          m.findAll((n: { props: { testID?: string } }) => n.props.testID === 'time-picker-sheet')
            .length > 0
      );
    expect(hosts).toHaveLength(1);
    expect(hosts[0].props.visible).toBe(true);
    expect(hosts[0].props.transparent).toBe(true);
  });

  test('Done sets the row to the formatted time and offers Remove, writing nothing yet', () => {
    // Mutation caught: Done not committing to the local model.
    const view = mount(existing(null));
    setTime(view, '14:14');
    expect(view.getByText('2:14 PM')).toBeTruthy();
    expect(view.getByTestId('routine-reminder-row').props.accessibilityLabel).toBe('Reminder, 2:14 PM');
    expect(view.getByTestId('routine-reminder-remove')).toBeTruthy();
    expect(view.queryByTestId('time-picker-sheet')).toBeNull();
    expect(mockUpdateRoutine).not.toHaveBeenCalled();
  });

  test('open, scroll, Cancel: the model and the persisted value are unchanged', async () => {
    // Mutation caught: committing on Cancel, or on a scroll tick.
    const view = mount(existing('7:30 PM'));
    openRow(view);
    scrollTo(view, 6, 0);
    fireEvent.press(view.getByTestId('time-picker-cancel'));

    expect(view.queryByTestId('time-picker-sheet')).toBeNull();
    expect(view.getByText('7:30 PM')).toBeTruthy();
    expect(mockUpdateRoutine).not.toHaveBeenCalled();

    await save(view, 'Update Routine');
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(mockUpdateRoutine).toHaveBeenCalledWith('r1', expect.objectContaining({ reminderTime: '7:30 PM' }));
    expect(alertSpy).not.toHaveBeenCalled();
  });

  test('on Android the system dialog commits on set and discards on dismiss', () => {
    // The Android branch renders the shared sheet without the iOS Modal.
    // Mutation caught: wrapping Android's dialog in a second modal layer.
    Platform.OS = 'android';
    try {
      const view = mount(existing(null));
      openRow(view);
      expect(view.UNSAFE_getAllByType(Modal).some((m) => m.props.visible)).toBe(false);
      const d = new Date();
      d.setHours(7, 15, 0, 0);
      fireEvent(view.UNSAFE_getByType('DateTimePicker' as never), 'change', { type: 'dismissed' }, d);
      expect(view.getByText('Add a reminder')).toBeTruthy();

      openRow(view);
      fireEvent(view.UNSAFE_getByType('DateTimePicker' as never), 'change', { type: 'set' }, d);
      expect(view.getByText('7:15 AM')).toBeTruthy();
    } finally {
      Platform.OS = 'ios';
    }
  });
});

describe('R-4: the initial picker value', () => {
  const at = (h: number, m: number) => {
    const d = new Date(2026, 9, 1);
    d.setHours(h, m, 0, 0);
    return d;
  };

  afterEach(() => {
    jest.useRealTimers();
  });

  test('a valid reminder opens the wheel at that time', () => {
    // Mutation caught: always seeding from the clock.
    const view = mount(existing('7:30 PM'));
    openRow(view);
    expect(wheel(view)).toEqual([19, 30]);
  });

  test('no reminder opens at the next quarter hour, captured at open and held while open', () => {
    // Mutation caught: computing the seed on every render, which re-seeds the
    // sheet and moves the wheel as the clock crosses a quarter hour.
    jest.useFakeTimers();
    jest.setSystemTime(at(14, 14));
    const routine = existing(null);
    const view = mount(routine);
    openRow(view);
    expect(wheel(view)).toEqual([14, 15]);

    jest.setSystemTime(at(14, 16));
    view.rerender(
      <RoutineEditor
        userId="u1"
        routineType="morning"
        existingRoutine={routine}
        onSave={onSave}
        onCancel={onCancel}
      />
    );
    expect(wheel(view)).toEqual([14, 15]);
  });

  test('a fresh open after Cancel reads the clock again', () => {
    // The hold is per open, not per editor. Mutation caught: caching the
    // first seed for the editor's lifetime.
    jest.useFakeTimers();
    jest.setSystemTime(at(14, 14));
    const view = mount(existing(null));
    openRow(view);
    fireEvent.press(view.getByTestId('time-picker-cancel'));
    jest.setSystemTime(at(14, 16));
    openRow(view);
    expect(wheel(view)).toEqual([14, 30]);
  });
});

describe('R-6: removal and legacy malformed values', () => {
  test('Remove reminder is hidden when there is no valid reminder', () => {
    // Mutation caught: rendering Remove whenever anything is stored.
    for (const stored of [null, '730']) {
      const view = mount(existing(stored));
      expect(view.queryByTestId('routine-reminder-remove')).toBeNull();
      view.unmount();
    }
  });

  test('the editor Cancel after Remove leaves the persisted value unchanged', () => {
    // Mutation caught: Remove writing straight to Firestore.
    const view = mount(existing('7:30 PM'));
    fireEvent.press(view.getByTestId('routine-reminder-remove'));
    fireEvent.press(view.getByText('Cancel'));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(mockUpdateRoutine).not.toHaveBeenCalled();
    expect(mockCancelOne).not.toHaveBeenCalled();
  });

  test('a legacy malformed value displays Add a reminder, and opening and cancelling writes nothing', () => {
    // Mutation caught: carrying the malformed text into the model, where it
    // would display, seed the wheel, or offer Remove.
    const view = mount(existing('730'));
    expect(view.getByText('Add a reminder')).toBeTruthy();
    expect(view.queryByText('730')).toBeNull();
    expect(view.getByTestId('routine-reminder-row').props.accessibilityLabel).toBe(
      'Reminder, add a reminder'
    );

    openRow(view);
    scrollTo(view, 9, 0);
    fireEvent.press(view.getByTestId('time-picker-cancel'));
    expect(view.getByText('Add a reminder')).toBeTruthy();

    fireEvent.press(view.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(mockUpdateRoutine).not.toHaveBeenCalled();
    expect(mockCreateRoutine).not.toHaveBeenCalled();
    expect(mockCancelOne).not.toHaveBeenCalled();
  });

  test('a legacy malformed value replaced through the picker stores the new time', async () => {
    const view = mount(existing('730'));
    setTime(view, '7:30 PM');
    await save(view, 'Update Routine');

    await waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(1));
    expect(mockUpdateRoutine).toHaveBeenCalledWith('r1', expect.objectContaining({ reminderTime: '7:30 PM' }));
    expect(alertAt(0)[0]).toBe('Reminder set');
  });

  test('THE INVARIANT: after any save, the persisted value is null or parses', async () => {
    // "After any successful save through the picker-era routine editor, the
    // persisted reminder value is either null or parseable by parseTimeString."
    // The invariant is held twice: the model only takes a parseable value, and
    // the save persists null for anything that does not parse. Removing one
    // layer is caught elsewhere (the legacy tests; the E2 boundary test).
    // Mutation caught here: removing both layers at once.
    type Scenario = { stored: string | null; create?: boolean; act?: (v: ReturnType<typeof mount>) => void };
    const scenarios: Scenario[] = [
      { stored: null },
      { stored: '7:30 PM' },
      { stored: '08:00' },
      { stored: '730' },
      { stored: '7.30 pm' },
      { stored: '730', act: (v) => setTime(v, '6:45 AM') },
      { stored: '7:30 PM', act: (v) => fireEvent.press(v.getByTestId('routine-reminder-remove')) },
      { stored: null, create: true },
      { stored: null, create: true, act: (v) => setTime(v, '21:05') },
    ];
    for (const s of scenarios) {
      const view = mount(s.create ? null : existing(s.stored));
      if (s.create) addActivity(view);
      s.act?.(view);
      await save(view, s.create ? 'Save Routine' : 'Update Routine');
      view.unmount();
    }

    const times = persistedTimes();
    expect(times).toHaveLength(scenarios.length);
    for (const t of times) {
      expect(t === null || (typeof t === 'string' && scheduler.parseTimeString(t) !== null)).toBe(true);
    }
  });
});

describe('R-7: display normalisation in the row', () => {
  test('a stored "08:00" displays as 8:00 AM, and nothing is rewritten for formatting', async () => {
    // Mutations caught: displaying the raw stored text; rewriting storage
    // into the picker-era format on an ordinary save.
    const view = mount(existing('08:00'));
    expect(view.getByText('8:00 AM')).toBeTruthy();
    expect(view.queryByText('08:00')).toBeNull();
    expect(view.getByTestId('routine-reminder-row').props.accessibilityLabel).toBe('Reminder, 8:00 AM');
    expect(mockUpdateRoutine).not.toHaveBeenCalled();

    await save(view, 'Update Routine');
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(mockUpdateRoutine).toHaveBeenCalledWith('r1', expect.objectContaining({ reminderTime: '08:00' }));
    // Unchanged under R-8, so it reschedules silently.
    expect(alertSpy).not.toHaveBeenCalled();
  });
});

describe('while a save is in progress (fixes before the walk)', () => {
  // The routine write is held open so the editor stays mid-save.
  //
  // TouchableOpacity disables itself from `disabled` OR
  // `accessibilityState.disabled` (react-native TouchableOpacity.js,
  // _createPressabilityConfig), so a control is only re-enabled when BOTH are
  // dropped. The mutations below drop both.
  function holdTheWrite() {
    let finish!: () => void;
    mockUpdateRoutine.mockImplementationOnce(
      () => new Promise<void>((resolve) => {
        finish = resolve;
      })
    );
    return () => finish();
  }

  test('pressing the reminder row does not open the picker', async () => {
    // Mutation caught: the row not disabled while saving (both props dropped).
    const release = holdTheWrite();
    const view = mount(existing('7:30 PM'));
    await save(view, 'Update Routine');
    expect(view.getByText('Saving...')).toBeTruthy();

    openRow(view);
    expect(view.queryByTestId('time-picker-sheet')).toBeNull();

    await act(async () => {
      release();
    });
  });

  test('pressing Remove reminder does not change the model', async () => {
    // Mutation caught: Remove reminder not disabled while saving (both props dropped).
    const release = holdTheWrite();
    const view = mount(existing('7:30 PM'));
    await save(view, 'Update Routine');
    expect(view.getByText('Saving...')).toBeTruthy();

    fireEvent.press(view.getByTestId('routine-reminder-remove'));
    expect(view.getByText('7:30 PM')).toBeTruthy();
    expect(view.queryByText('Add a reminder')).toBeNull();

    await act(async () => {
      release();
    });
  });

  test('after the save finishes, the row is enabled again', async () => {
    // Mutation caught: a row that stays disabled once saving ends.
    const release = holdTheWrite();
    const view = mount(existing('7:30 PM'));
    await save(view, 'Update Routine');
    expect(view.getByTestId('routine-reminder-row').props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true })
    );

    await act(async () => {
      release();
    });
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));

    expect(view.getByTestId('routine-reminder-row').props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: false })
    );
    openRow(view);
    expect(view.getByTestId('time-picker-sheet')).toBeTruthy();
  });
});
