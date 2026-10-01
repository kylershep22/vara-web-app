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
 */
import React from 'react';
import { Alert, AlertButton, Linking } from 'react-native';
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
}));
jest.mock('../../../config/firebase', () => ({ db: null }));
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

function mount(routine: Routine | null) {
  return render(
    <RoutineEditor
      userId="u1"
      routineType="morning"
      existingRoutine={routine}
      onSave={onSave}
      onCancel={jest.fn()}
    />
  );
}

function setTime(view: ReturnType<typeof mount>, value: string) {
  fireEvent.changeText(view.getByPlaceholderText('08:00'), value);
}

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

describe('the reminder field', () => {
  test('shows the approved helper line, and the old one is gone', () => {
    // Mutation caught: restoring "Set a daily reminder time (HH:MM format)".
    const view = mount(existing(null));
    expect(view.getByText('Optional. For example, 7:30 AM or 7:30 PM.')).toBeTruthy();
    expect(view.queryByText(/Set a daily reminder time/)).toBeNull();
    expect(view.queryByText(/HH:MM format/)).toBeNull();
    // Label and placeholder unchanged.
    expect(view.getByText('Reminder Time (Optional)')).toBeTruthy();
    expect(view.getByPlaceholderText('08:00')).toBeTruthy();
  });
});

describe('E1: field empty', () => {
  test('edit: cancels the reminder and closes with no alert', async () => {
    // Mutation caught: dropping the E1 cancel on the edit path.
    const view = mount(existing('7:30 PM'));
    setTime(view, '   ');
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

describe('E2: field invalid', () => {
  test('persists null, cancels, shows Check the reminder time, never asks permission', async () => {
    // Mutation caught: persisting the rejected text, or requesting permission.
    mockGetPerms.mockResolvedValue({ status: 'undetermined' });
    const view = mount(existing('7:30 PM'));
    setTime(view, '730');
    await save(view, 'Update Routine');

    await waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(1));
    expect(mockUpdateRoutine).toHaveBeenCalledWith('r1', expect.objectContaining({ reminderTime: null }));
    expect(mockCancelOne).toHaveBeenCalledWith('routine-reminder-r1');
    expect(mockRequestPerms).not.toHaveBeenCalled();
    expect(mockSchedule).not.toHaveBeenCalled();
    const [title, body, buttons] = alertAt(0);
    expect(title).toBe('Check the reminder time');
    expect(body).toBe('Your routine is saved without a reminder. Enter a time like 7:30 AM or 7:30 PM.');
    expect(buttons.map((b) => b.text)).toEqual(['OK']);

    expect(onSave).not.toHaveBeenCalled();
    await press(0, 'OK');
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  test('a legacy unparseable stored value resolves to null on the next save', async () => {
    // Mutation caught: keeping a legacy stored value when it fails to parse.
    const view = mount(existing('730'));
    await save(view, 'Update Routine');

    await waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(1));
    expect(mockUpdateRoutine).toHaveBeenCalledWith('r1', expect.objectContaining({ reminderTime: null }));
    expect(alertAt(0)[0]).toBe('Check the reminder time');
  });
});

describe('E3: granted', () => {
  test('a changed time: cancels, schedules under routine-reminder-{id}, shows Reminder set with the formatted time', async () => {
    // Mutation caught: skipping the cancel, or announcing an unformatted time.
    const view = mount(existing('8:00'));
    setTime(view, '19:05');
    await save(view, 'Update Routine');

    await waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(1));
    expect(mockUpdateRoutine).toHaveBeenCalledWith('r1', expect.objectContaining({ reminderTime: '19:05' }));
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

  test('a valid time persists as the trimmed text the user typed', async () => {
    // Mutation caught: normalising the stored text.
    const view = mount(existing(null));
    setTime(view, '  7:30 pm ');
    await save(view, 'Update Routine');

    await waitFor(() => expect(alertSpy).toHaveBeenCalledTimes(1));
    expect(mockUpdateRoutine).toHaveBeenCalledWith('r1', expect.objectContaining({ reminderTime: '7:30 pm' }));
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

  test('"19:30" is unchanged from a stored "7:30 PM" (compared as parsed hours and minutes)', async () => {
    // Mutation caught: comparing the raw text instead of the parsed time.
    const view = mount(existing('7:30 PM'));
    setTime(view, '19:30');
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
