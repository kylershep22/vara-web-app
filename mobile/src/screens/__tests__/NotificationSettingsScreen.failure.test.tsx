/**
 * NotificationSettingsScreen failure handling (NPM-2): a confirmed rejection
 * reverts, alerts only while mounted and corrects the schedule from the values
 * shown (H7 to H9); a failed journal write is a failed save (Decision 12);
 * handlers for a departed account do nothing. Split from
 * NotificationSettingsScreen.state for length.
 *
 * Harness (NPM-2 Build B): the REAL NotificationSettingsScreen, the REAL
 * useNotificationSettingsState hook, the REAL pending-intent journal and store,
 * the REAL permission row and TimePickerSheet. Replaced at the edges only: the
 * preferences read and write (Firestore), the listener, the scheduler, the OS
 * permission calls, and AsyncStorage (an in-memory disk with a write gate).
 */
import React from 'react';
import { Alert, Switch } from 'react-native';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';

const mockGetPrefs = jest.fn();
const mockUpdate = jest.fn();
const mockApply = jest.fn();
const mockReconcile = jest.fn();
const mockPermission = jest.fn();
const mockRequestPermission = jest.fn();
const mockRegisterToken = jest.fn();
const mockSaveToken = jest.fn();
const mockOpenSettings = jest.fn();
const mockDisk = new Map<string, string>();
const mockGate: { next: (() => Promise<void>) | null } = { next: null };
const mockSession: { uid: string | null } = { uid: 'u1' };
const mockAuthValue = { user: { uid: 'u1' } as { uid: string } | null };
const mockListener: { next: ((snap: unknown) => void) | null; unsubscribe: jest.Mock } = {
  next: null,
  unsubscribe: jest.fn(),
};
let mockPickerProps: { onChange?: (e: unknown, d?: Date) => void; value?: Date } | null = null;

jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: 'MockedMaterialCommunityIcons',
  Ionicons: 'MockedIonicons',
}));
jest.mock('@react-native-community/datetimepicker', () => (props: Record<string, unknown>) => {
  mockPickerProps = props as typeof mockPickerProps;
  return null;
});
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn() }),
  useFocusEffect: (cb: () => void) => jest.requireActual('react').useEffect(() => cb(), [cb]),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View };
});
jest.mock('../../components', () => {
  const { Text } = jest.requireActual('react-native');
  const { createElement } = jest.requireActual('react');
  return { LoadingSpinner: ({ message }: { message: string }) => createElement(Text, null, message) };
});
jest.mock('../../context/AuthContext', () => ({ useAuth: () => mockAuthValue }));
jest.mock('../../config/firebase', () => ({
  db: {},
  get auth() {
    return { currentUser: mockSession.uid ? { uid: mockSession.uid } : null };
  },
}));
jest.mock('../../services/firebase/ensureDb', () => ({ requireDb: () => ({}) }));
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(() => 'prefs-doc'),
  onSnapshot: jest.fn((_ref: unknown, _opts: unknown, next: (snap: unknown) => void) => {
    mockListener.next = next;
    return mockListener.unsubscribe;
  }),
}));
jest.mock('../../services/firebase/notificationPreferences.service', () => ({
  getNotificationPreferences: (...a: unknown[]) => mockGetPrefs(...a),
  updateNotificationPreferences: (...a: unknown[]) => mockUpdate(...a),
}));
jest.mock('../../services/notificationScheduler.service', () => ({
  applyDailyRhythmChoice: (...a: unknown[]) => mockApply(...a),
  reconcileDailyRhythm: (...a: unknown[]) => mockReconcile(...a),
}));
jest.mock('../../services/notifications.service', () => ({
  getPermissionsStatus: (...a: unknown[]) => mockPermission(...a),
  requestNotificationPermission: (...a: unknown[]) => mockRequestPermission(...a),
  registerPushToken: (...a: unknown[]) => mockRegisterToken(...a),
  savePushTokenToUser: (...a: unknown[]) => mockSaveToken(...a),
}));
jest.mock('expo-notifications', () => ({ IosAuthorizationStatus: { PROVISIONAL: 3, EPHEMERAL: 4 } }));
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (k: string) => (mockDisk.has(k) ? mockDisk.get(k)! : null)),
    setItem: jest.fn(async (k: string, v: string) => {
      const gate = mockGate.next;
      mockGate.next = null;
      if (gate) await gate();
      mockDisk.set(k, v);
    }),
    removeItem: jest.fn(async (k: string) => {
      mockDisk.delete(k);
    }),
  },
}));

import { Linking } from 'react-native';
import NotificationSettingsScreen from '../NotificationSettingsScreen';
import { _resetNotificationIntentStoreForTests, NOTIFICATION_INTENT_KEY } from '../../services/notificationIntentStore';
import { _resetNotificationIntentJournalForTests } from '../../services/notificationIntentJournal';

function prefsDoc(overrides: Record<string, unknown> = {}) {
  return {
    id: 'u1',
    userId: 'u1',
    schemaVersion: 2,
    allNotificationsEnabled: true,
    quietHours: { enabled: true, startTime: { hour: 21, minute: 0 }, endTime: { hour: 8, minute: 0 } },
    dailyRhythm: { enabled: true, reminderTime: { hour: 19, minute: 32 } },
    insightsLearning: { enabled: false, frequency: 'twice_weekly' },
    socialConnection: { directMessages: true, connectionRequests: true, communityDigest: false },
    milestonesReflection: { enabled: false },
    completionSound: { enabled: true, sound: 'singing-bowl' },
    ...overrides,
  };
}

async function renderLoaded(docData: Record<string, unknown>) {
  mockGetPrefs.mockResolvedValue(docData);
  const view = render(<NotificationSettingsScreen />);
  await waitFor(() => expect(view.queryByText('Loading notification settings...')).toBeNull());
  return view;
}

/** Push a listener snapshot, as Firestore would. `null` = the document is gone. */
async function snapshot(data: Record<string, unknown> | null) {
  await act(async () => {
    mockListener.next?.({ id: 'u1', exists: () => data !== null, data: () => data });
  });
}

function switches(view: ReturnType<typeof render>) {
  return view.UNSAFE_getAllByType(Switch);
}

function at(hour: number, minute: number): Date {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
}

function deferred<T = void>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function flush() {
  for (let i = 0; i < 10; i += 1) await act(async () => {});
}

beforeEach(() => {
  jest.clearAllMocks();
  mockDisk.clear();
  mockGate.next = null;
  mockSession.uid = 'u1';
  mockAuthValue.user = { uid: 'u1' };
  mockListener.next = null;
  mockPickerProps = null;
  mockUpdate.mockReturnValue(new Promise(() => {})); // offline by default: never settles
  mockApply.mockResolvedValue('scheduled');
  mockReconcile.mockResolvedValue('scheduled');
  mockPermission.mockResolvedValue({ status: 'granted', granted: true });
  mockRequestPermission.mockResolvedValue(true);
  mockRegisterToken.mockResolvedValue('ExponentPushToken[x]');
  mockSaveToken.mockResolvedValue(undefined);
  jest.spyOn(Linking, 'openSettings').mockImplementation(mockOpenSettings);
  _resetNotificationIntentStoreForTests();
  _resetNotificationIntentJournalForTests();
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

// Helpers a given file may not use.
void Alert; void mockPickerProps; void fireEvent; void switches; void at; void deferred; void flush; void snapshot;
void NOTIFICATION_INTENT_KEY;

describe('H7: a confirmed rejection reverts, alerts and corrects the schedule', () => {
  test('General back on, the approved alert, and the apply from the values now shown', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const write = deferred();
    mockUpdate.mockReturnValueOnce(write.promise);
    const view = await renderLoaded(prefsDoc({ allNotificationsEnabled: true }));
    await act(async () => {
      fireEvent(switches(view)[0], 'valueChange', false);
    });
    await waitFor(() => expect(mockUpdate).toHaveBeenCalled());
    mockApply.mockClear();

    await act(async () => {
      write.reject(new Error('permission-denied'));
    });
    await flush();

    // Mutation caught: no revert, no alert, or no correction.
    expect(switches(view)[0].props.value).toBe(true);
    expect(alertSpy).toHaveBeenCalledWith("Couldn't save", "Your change wasn't saved. Please try again.", [
      { text: 'OK' },
    ]);
    expect(mockApply).toHaveBeenCalledWith('u1', { general: true, reminderTime: { hour: 19, minute: 32 } });
  });
});

describe('H8: a rejection of a superseded change does nothing', () => {
  test('off then on; the off is rejected: on stays, no alert', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const first = deferred();
    mockUpdate.mockReturnValueOnce(first.promise);
    const view = await renderLoaded(prefsDoc({ allNotificationsEnabled: true }));
    await act(async () => {
      fireEvent(switches(view)[0], 'valueChange', false);
    });
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    await act(async () => {
      fireEvent(switches(view)[0], 'valueChange', true);
    });
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(2));

    await act(async () => {
      first.reject(new Error('permission-denied'));
    });
    await flush();

    // Mutation caught: reverting or alerting without checking supersession.
    expect(alertSpy).not.toHaveBeenCalled();
    expect(switches(view)[0].props.value).toBe(true);
  });
});

describe('H9: a rejection after the screen has been left', () => {
  test('the schedule is still corrected, and no alert is shown', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const write = deferred();
    mockUpdate.mockReturnValueOnce(write.promise);
    const view = await renderLoaded(prefsDoc({ allNotificationsEnabled: true }));
    await act(async () => {
      fireEvent(switches(view)[0], 'valueChange', false);
    });
    await waitFor(() => expect(mockUpdate).toHaveBeenCalled());
    view.unmount();
    mockApply.mockClear();

    write.reject(new Error('permission-denied'));
    await flush();

    // Mutation caught: the correction tied to the screen being mounted.
    expect(mockApply).toHaveBeenCalledWith('u1', { general: true, reminderTime: { hour: 19, minute: 32 } });
    expect(alertSpy).not.toHaveBeenCalled();
  });
});

describe('Decision 12: a failed journal write is a failed save', () => {
  test('mounted: the control reverts and the alert shows; nothing is sent or applied', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const view = await renderLoaded(prefsDoc({ allNotificationsEnabled: true }));
    mockGate.next = () => Promise.reject(new Error('disk full'));

    await act(async () => {
      fireEvent(switches(view)[0], 'valueChange', false);
    });
    await flush();

    // Mutation caught: not reverting, or not alerting, on a persistence failure.
    expect(switches(view)[0].props.value).toBe(true);
    expect(alertSpy).toHaveBeenCalledWith("Couldn't save", "Your change wasn't saved. Please try again.", [
      { text: 'OK' },
    ]);
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockApply).not.toHaveBeenCalled();
  });

  test('unmounted: no alert', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const view = await renderLoaded(prefsDoc({ allNotificationsEnabled: true }));
    const gate = deferred();
    mockGate.next = () => gate.promise;
    await act(async () => {
      fireEvent(switches(view)[0], 'valueChange', false);
    });
    view.unmount();
    gate.reject(new Error('disk full'));
    await flush();

    // Mutation caught: alerting without checking the screen is mounted.
    expect(alertSpy).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

describe('handlers for a departed account do nothing', () => {
  test('a failed save that settles after the account changed: no revert, no alert', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const view = await renderLoaded(prefsDoc({ allNotificationsEnabled: true }));
    const gate = deferred();
    mockGate.next = () => gate.promise;
    await act(async () => {
      fireEvent(switches(view)[0], 'valueChange', false);
    });
    mockSession.uid = 'u2';
    await act(async () => {
      gate.reject(new Error('disk full'));
    });
    await flush();

    // Mutation caught: the hook's own ownership check removed.
    expect(alertSpy).not.toHaveBeenCalled();
    expect(switches(view)[0].props.value).toBe(false);
  });

  test('a rejection after the account changed: no revert, no alert, no correction', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const write = deferred();
    mockUpdate.mockReturnValueOnce(write.promise);
    const view = await renderLoaded(prefsDoc({ allNotificationsEnabled: true }));
    await act(async () => {
      fireEvent(switches(view)[0], 'valueChange', false);
    });
    await waitFor(() => expect(mockUpdate).toHaveBeenCalled());
    mockApply.mockClear();
    mockSession.uid = 'u2';

    await act(async () => {
      write.reject(new Error('permission-denied'));
    });
    await flush();

    expect(alertSpy).not.toHaveBeenCalled();
    expect(mockApply).not.toHaveBeenCalled();
  });
});
