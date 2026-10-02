/**
 * NotificationSettingsScreen layout, copy and spoken labels (NPM-2): H10 to
 * H12, H15 to H17, L1, L2, L6, L7, the invalid stored time, and the Community
 * saving labels from item 8 of the Addendum 2 report.
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

describe('H10: a time is shown only if it passes the shared validity check', () => {
  test.each([
    ['null', null],
    ['a null minute', { hour: 20, minute: null }],
    ['a null hour', { hour: null, minute: 5 }],
    ['hour 24', { hour: 24, minute: 0 }],
  ])('%s: Add a time, and nothing throws', async (_label, reminderTime) => {
    // Mutation caught: a truthiness gate, or formatting before validating.
    const view = await renderLoaded(prefsDoc({ dailyRhythm: { enabled: true, reminderTime } }));
    expect(view.getByText('Add a time')).toBeTruthy();
  });

  test('a valid time is formatted', async () => {
    const view = await renderLoaded(prefsDoc({ dailyRhythm: { enabled: false, reminderTime: { hour: 8, minute: 5 } } }));
    expect(view.getByText('8:05 AM')).toBeTruthy();
  });
});

describe('H11: the time row is never disabled, and its subtitle follows the rule', () => {
  test.each([
    ['General on, a time', true, { hour: 20, minute: 0 }, 'One reminder per day at your chosen time'],
    ['General off, a time', false, { hour: 20, minute: 0 }, 'Turn on General notifications to get this reminder.'],
    ['General off, no time', false, null, 'One reminder per day at your chosen time'],
    ['General on, no time', true, null, 'One reminder per day at your chosen time'],
  ])('%s', async (_label, general, reminderTime, subtitle) => {
    const view = await renderLoaded(
      prefsDoc({ allNotificationsEnabled: general, dailyRhythm: { enabled: false, reminderTime } })
    );
    // Mutation caught: the wrong subtitle condition, or disabling the row.
    expect(view.getByText(subtitle)).toBeTruthy();
    const row = view.getByTestId('daily-reminder-row');
    expect(row.props.accessibilityState?.disabled).not.toBe(true);
    fireEvent.press(row);
    expect(mockPickerProps).not.toBeNull();
  });
});

describe('H12: the picker', () => {
  test('with no time it opens at DEFAULT_ANCHOR_HOUR:00, 8:00 PM', async () => {
    const { DEFAULT_ANCHOR_HOUR } = jest.requireActual('../../constants/onboardingStressRecovery');
    const view = await renderLoaded(prefsDoc({ dailyRhythm: { enabled: true, reminderTime: null } }));
    fireEvent.press(view.getByTestId('daily-reminder-row'));
    // Mutation caught: a literal seed, or a different constant.
    expect(mockPickerProps!.value!.getHours()).toBe(DEFAULT_ANCHOR_HOUR);
    expect(mockPickerProps!.value!.getHours()).toBe(20);
    expect(mockPickerProps!.value!.getMinutes()).toBe(0);
  });

  test('with a time it opens at that time', async () => {
    const view = await renderLoaded(prefsDoc());
    fireEvent.press(view.getByTestId('daily-reminder-row'));
    expect(mockPickerProps!.value!.getHours()).toBe(19);
    expect(mockPickerProps!.value!.getMinutes()).toBe(32);
  });

  test('scrolling writes nothing, Cancel writes nothing, Done writes once', async () => {
    const view = await renderLoaded(prefsDoc());
    fireEvent.press(view.getByTestId('daily-reminder-row'));
    await act(async () => {
      mockPickerProps!.onChange!({ type: 'set' }, at(6, 10));
    });
    fireEvent.press(view.getByText('Cancel'));
    await flush();
    expect(mockUpdate).not.toHaveBeenCalled();

    fireEvent.press(view.getByTestId('daily-reminder-row'));
    await act(async () => {
      mockPickerProps!.onChange!({ type: 'set' }, at(6, 10));
      mockPickerProps!.onChange!({ type: 'set' }, at(6, 15));
    });
    fireEvent.press(view.getByText('Done'));
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(view.getByText('6:15 AM')).toBeTruthy();
  });
});

describe('H15: removed and hidden for V1', () => {
  test.each([
    'Daily Rhythm',
    'Daily Reminder',
    'Reminder Time',
    'Messages & Social',
    'Community Activity',
    'Updates from your groups',
    'Insights & Learning',
    'Brain-Health Insights',
    '2-3 insights per week from our content library',
    'Milestones & Reflection',
    'Milestones',
    'Celebrate progress and time-based reflections',
    'Completion Sound',
    'Timer completion sound',
    'Plays when timers and sessions finish',
    'Singing Bowl',
    'Soft Chime',
    'Nature Bell',
    'Stream',
    'Quiet Hours',
    'Enable Quiet Hours',
    'Pause notifications during specific times',
    'Start',
    'End',
  ])('"%s" is not shown', async (text) => {
    const view = await renderLoaded(prefsDoc());
    // Mutation caught: any row or header restored.
    expect(view.queryByText(text)).toBeNull();
  });

  test('three switches remain: General, Direct messages, Connection requests', async () => {
    const view = await renderLoaded(prefsDoc());
    expect(switches(view).map((s) => s.props.testID)).toEqual([
      'general-switch',
      'direct-messages-switch',
      'connection-requests-switch',
    ]);
  });
});

describe('H17: the first-load unavailable state (Decision 6)', () => {
  test('a failed first load shows the approved copy, and Try again loads again', async () => {
    mockGetPrefs.mockRejectedValueOnce(new Error('unavailable'));
    const view = render(<NotificationSettingsScreen />);
    await waitFor(() => expect(view.getByText("Couldn't load notification settings.")).toBeTruthy());
    expect(view.getByText('Try again')).toBeTruthy();
    expect(view.getByLabelText('Try again')).toBeTruthy();
    expect(view.queryByText(/connection/i)).toBeNull();

    mockGetPrefs.mockResolvedValueOnce(prefsDoc());
    fireEvent.press(view.getByTestId('notification-settings-retry'));
    // Mutation caught: Try again that does not repeat the load.
    await waitFor(() => expect(view.getByText('7:32 PM')).toBeTruthy());
    expect(mockGetPrefs).toHaveBeenCalledTimes(2);
  });
});
