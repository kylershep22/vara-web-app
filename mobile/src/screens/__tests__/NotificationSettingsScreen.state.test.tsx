/**
 * NotificationSettingsScreen state (NPM-2): optimistic changes through the
 * pending-intent journal, Saving... after 500 ms, failure revert and
 * correction, Decision 8 and Decision 12. Tests H1 to H9, H13, H14 and the new
 * failure and departed-account cases from item 8 of the Addendum 2 report.
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

const U1_PENDING_GENERAL_OFF = JSON.stringify({ v: 1, uid: 'u1', entries: { general: { value: false, seq: 9 } } });

describe('H1 [K1 through the screen]: the first load lays persisted pending changes over the document', () => {
  test('a pending General off from a previous launch shows off although the server says on', async () => {
    mockDisk.set(NOTIFICATION_INTENT_KEY, U1_PENDING_GENERAL_OFF);
    const view = await renderLoaded(prefsDoc({ allNotificationsEnabled: true }));
    // Mutation caught: the hook skipping the journal on its first load.
    expect(switches(view)[0].props.value).toBe(false);
  });
});

describe('H2 and Decision 8: a listener snapshot never creates anything', () => {
  test('the document disappearing while open keeps the last values and creates no defaults', async () => {
    const view = await renderLoaded(prefsDoc({ allNotificationsEnabled: true }));
    await snapshot(null);

    // Mutation caught: treating a missing document as an empty one, or reloading.
    expect(switches(view)[0].props.value).toBe(true);
    expect(view.getByText('7:32 PM')).toBeTruthy();
    expect(mockGetPrefs).toHaveBeenCalledTimes(1);
  });

  test('a later snapshot of the document is shown', async () => {
    const view = await renderLoaded(prefsDoc({ allNotificationsEnabled: true }));
    await snapshot(prefsDoc({ allNotificationsEnabled: false }));
    expect(switches(view)[0].props.value).toBe(false);
  });
});

describe('H3: the screen changes at once; nothing is sent or applied before the journal record is on disk', () => {
  test('General off: shown at once, then persisted, then sent and applied', async () => {
    const view = await renderLoaded(prefsDoc());
    const gate = deferred();
    mockGate.next = () => gate.promise;

    await act(async () => {
      fireEvent(switches(view)[0], 'valueChange', false);
    });
    expect(switches(view)[0].props.value).toBe(false);
    await flush();
    // Mutation caught: the hook sending the write itself, or applying first.
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockApply).not.toHaveBeenCalled();

    gate.resolve();
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith('u1', { allNotificationsEnabled: false }));
    expect(mockApply).toHaveBeenCalledWith('u1', { general: false, reminderTime: { hour: 19, minute: 32 } });
  });
});

describe('H4: Saving... appears only after 500 ms unresolved', () => {
  test('not at 499 ms, at 500 ms, and gone once acknowledged', async () => {
    const write = deferred();
    mockUpdate.mockReturnValueOnce(write.promise);
    const view = await renderLoaded(prefsDoc());
    jest.useFakeTimers();
    await act(async () => {
      fireEvent(switches(view)[0], 'valueChange', false);
    });
    await act(async () => {
      jest.advanceTimersByTime(499);
    });
    // Mutation caught: no delay, or a different one.
    expect(view.queryByText('Saving...', { includeHiddenElements: true })).toBeNull();
    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(view.getByText('Saving...', { includeHiddenElements: true })).toBeTruthy();
    expect(view.getByLabelText('General notifications, saving')).toBeTruthy();

    await act(async () => {
      write.resolve();
    });
    jest.useRealTimers();
    await waitFor(() => expect(view.queryByText('Saving...', { includeHiddenElements: true })).toBeNull());
    expect(view.getByLabelText('General notifications')).toBeTruthy();
  });
});

describe('H5: while pending, an older server value does not move the control', () => {
  test('a snapshot still saying on leaves General off', async () => {
    const view = await renderLoaded(prefsDoc({ allNotificationsEnabled: true }));
    await act(async () => {
      fireEvent(switches(view)[0], 'valueChange', false);
    });
    await snapshot(prefsDoc({ allNotificationsEnabled: true }));
    // Mutation caught: the snapshot winning over this session's pending change.
    expect(switches(view)[0].props.value).toBe(false);
  });
});

describe('H6: a pending change never reverts on its own', () => {
  test('a minute later, offline, the chosen value is still shown, saving', async () => {
    const view = await renderLoaded(prefsDoc({ allNotificationsEnabled: true }));
    jest.useFakeTimers();
    await act(async () => {
      fireEvent(switches(view)[0], 'valueChange', false);
    });
    await act(async () => {
      jest.advanceTimersByTime(60_000);
    });
    // Mutation caught: a timeout that reverts.
    expect(switches(view)[0].props.value).toBe(false);
    expect(view.getByText('Saving...', { includeHiddenElements: true })).toBeTruthy();
  });
});

describe('H13 and H14 (Ruling 2): a time never turns General on; General alone activates it', () => {
  test('General off, commit 9:15 PM: only the time is written, and the apply keeps it inactive', async () => {
    const view = await renderLoaded(prefsDoc({ allNotificationsEnabled: false }));
    fireEvent.press(view.getByTestId('daily-reminder-row'));
    await act(async () => {
      mockPickerProps!.onChange!({ type: 'set' }, at(21, 15));
    });
    fireEvent.press(view.getByText('Done'));

    await waitFor(() =>
      expect(mockUpdate).toHaveBeenCalledWith('u1', {
        'dailyRhythm.enabled': true,
        'dailyRhythm.reminderTime': { hour: 21, minute: 15 },
      })
    );
    // Mutation caught: a time commit that also writes General.
    expect(mockUpdate.mock.calls.some((c) => 'allNotificationsEnabled' in (c[1] as object))).toBe(false);
    expect(mockApply).toHaveBeenCalledWith('u1', { general: false, reminderTime: { hour: 21, minute: 15 } });
    expect(switches(view)[0].props.value).toBe(false);

    await act(async () => {
      fireEvent(switches(view)[0], 'valueChange', true);
    });
    // Mutation caught: turning General on without applying the stored time.
    await waitFor(() =>
      expect(mockApply).toHaveBeenLastCalledWith('u1', { general: true, reminderTime: { hour: 21, minute: 15 } })
    );
  });
});

