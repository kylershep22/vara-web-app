/**
 * NotificationSettingsScreen spoken labels (NPM-2): L1, L2, L6 and L7, and the
 * Community rows under the 500 ms rule (Decision 11), and H16 (every approved
 * string). Split from NotificationSettingsScreen.layout for length.
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

describe('spoken labels (L1, L2, L6, L7)', () => {
  test('L7: switches are named for their rows, with the subtitle as the hint', async () => {
    const view = await renderLoaded(prefsDoc());
    const [general, dms, requests] = switches(view);
    expect(general.props.accessibilityLabel).toBe('General notifications');
    expect(general.props.accessibilityHint).toBe(
      'Controls Vara’s general reminders and updates. Routine reminders are managed within each routine.'
    );
    expect(dms.props.accessibilityLabel).toBe('Direct messages');
    expect(requests.props.accessibilityLabel).toBe('Connection requests');
  });

  test('L6: Back is a button named Back; the title is a header', async () => {
    const view = await renderLoaded(prefsDoc());
    expect(view.getByLabelText('Back').props.accessibilityRole).toBe('button');
    expect(view.getByText('Notifications').props.accessibilityRole).toBe('header');
    expect(view.getByText('Community').props.accessibilityRole).toBe('header');
  });

  test('L2: the time row, with a time and with none (lower case add)', async () => {
    let view = await renderLoaded(prefsDoc({ dailyRhythm: { enabled: true, reminderTime: { hour: 20, minute: 0 } } }));
    expect(view.getByTestId('daily-reminder-row').props.accessibilityLabel).toBe('Daily reminder, 8:00 PM');
    expect(view.getByTestId('daily-reminder-row').props.accessibilityRole).toBe('button');
    view.unmount();
    view = await renderLoaded(prefsDoc({ dailyRhythm: { enabled: true, reminderTime: null } }));
    // Mutation caught: "Add a time" capitalised in the spoken label.
    expect(view.getByTestId('daily-reminder-row').props.accessibilityLabel).toBe('Daily reminder, add a time');
  });

  test('L1 and L2: while pending past 500 ms, each control keeps its context', async () => {
    const view = await renderLoaded(prefsDoc({ dailyRhythm: { enabled: true, reminderTime: { hour: 20, minute: 0 } } }));
    jest.useFakeTimers();
    await act(async () => {
      fireEvent(switches(view)[0], 'valueChange', false);
    });
    fireEvent.press(view.getByTestId('daily-reminder-row'));
    await act(async () => {
      mockPickerProps!.onChange!({ type: 'set' }, at(20, 0));
    });
    fireEvent.press(view.getByText('Done'));
    await act(async () => {
      jest.advanceTimersByTime(500);
    });
    // Mutation caught: "Saving" alone, or the context dropped.
    expect(switches(view)[0].props.accessibilityLabel).toBe('General notifications, saving');
    expect(view.getByTestId('daily-reminder-row').props.accessibilityLabel).toBe('Daily reminder, 8:00 PM, saving');
  });
});

describe('Community saving follows the 500 ms rule (Decision 11)', () => {
  test.each([
    [1, 'Direct messages'],
    [2, 'Connection requests'],
  ])('switch %i: %s, saving only after 500 ms', async (index, label) => {
    const view = await renderLoaded(prefsDoc());
    jest.useFakeTimers();
    await act(async () => {
      fireEvent(switches(view)[index], 'valueChange', false);
    });
    await act(async () => {
      jest.advanceTimersByTime(499);
    });
    expect(switches(view)[index].props.accessibilityLabel).toBe(label);
    expect(view.queryByText('Saving...', { includeHiddenElements: true })).toBeNull();
    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    // Mutation caught: Community rows outside the 500 ms rule, or without context.
    expect(switches(view)[index].props.accessibilityLabel).toBe(`${label}, saving`);
    expect(view.getByText('Saving...', { includeHiddenElements: true })).toBeTruthy();
  });
});

describe('H16: every approved string, character for character', () => {
  test('the Notifications screen', async () => {
    const view = await renderLoaded(prefsDoc({ allNotificationsEnabled: false }));
    // Mutation caught: any character change, including the U+2019 in Vara’s.
    for (const text of [
      'Notifications',
      'Device notifications',
      'Allowed',
      'General notifications',
      'Controls Vara’s general reminders and updates. Routine reminders are managed within each routine.',
      'Daily reminder',
      'Turn on General notifications to get this reminder.',
      '7:32 PM',
      'Community',
      'Direct messages',
      'Notifications when someone messages you',
      'Connection requests',
      'When someone wants to connect',
    ]) {
      expect(await view.findByText(text)).toBeTruthy();
    }
  });

  test('the copy module holds the approved strings', () => {
    const { NOTIFICATION_SETTINGS_COPY: C, NOTIFICATION_PERMISSION_COPY: P } =
      jest.requireActual('../notificationSettings.copy');
    expect(C.general.subtitle).toBe(
      'Controls Vara’s general reminders and updates. Routine reminders are managed within each routine.'
    );
    expect(C.loading).toBe('Loading notification settings...');
    expect(C.loadFailed).toBe("Couldn't load notification settings.");
    expect(C.tryAgain).toBe('Try again');
    expect(C.dailyReminder.addTime).toBe('Add a time');
    expect(C.dailyReminder.subtitle).toBe('One reminder per day at your chosen time');
    expect(C.saving).toBe('Saving...');
    expect(C.failure).toEqual({
      title: "Couldn't save",
      body: "Your change wasn't saved. Please try again.",
      ok: 'OK',
    });
    expect(P).toEqual({
      label: 'Device notifications',
      allowed: { status: 'Allowed' },
      denied: { status: 'Off in your device settings', action: 'Open Settings' },
      notAsked: { status: 'Not allowed yet', action: 'Allow notifications' },
    });
  });

  test('the loading state', () => {
    mockGetPrefs.mockReturnValue(new Promise(() => {}));
    const view = render(<NotificationSettingsScreen />);
    expect(view.getByText('Loading notification settings...')).toBeTruthy();
  });
});

describe('the Daily reminder row speaks its visible subtitle as its hint (ruling 2 on Build B)', () => {
  test.each([
    ['General on, a time', true, { hour: 20, minute: 0 }, 'One reminder per day at your chosen time'],
    ['General off, a time', false, { hour: 20, minute: 0 }, 'Turn on General notifications to get this reminder.'],
    ['General off, no time', false, null, 'One reminder per day at your chosen time'],
  ])('%s', async (_label, general, reminderTime, subtitle) => {
    const view = await renderLoaded(
      prefsDoc({ allNotificationsEnabled: general, dailyRhythm: { enabled: true, reminderTime } })
    );
    const row = view.getByTestId('daily-reminder-row');
    // Mutation caught: the hint removed, or fixed to one string.
    expect(view.getByText(subtitle)).toBeTruthy();
    expect(row.props.accessibilityHint).toBe(subtitle);
  });
});
