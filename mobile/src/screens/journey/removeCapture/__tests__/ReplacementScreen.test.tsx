/**
 * The replacement pick and the seed write (journey slice 3c-ii).
 *
 * WHAT IS ASSERTED, AND WHAT IS NOT. Like the first-move suite beside it, these
 * are call-shape assertions against a mocked navigator: they prove the screen
 * pops the PARENT and never the nested stack, which is the mechanism, not a
 * rendered navigation-state assertion. Stated here rather than implied.
 *
 * THE FREE-TEXT ASSERTION IS THE LOAD-BEARING ONE. The capture context is
 * deliberately seeded WITH a text value in the last block, so that a screen
 * which started echoing it would fail rather than pass by never being handed
 * one. Free text never enters template copy is the rule; this is the test that
 * would notice it breaking.
 */
const mockGoBack = jest.fn();
const mockParentGoBack = jest.fn();
const mockGetParent = jest.fn(() => ({ goBack: mockParentGoBack }));
const mockNavigate = jest.fn();
let mockRouteParams: Record<string, unknown> = {};
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    getParent: mockGetParent,
    navigate: mockNavigate,
  }),
  useRoute: () => ({ params: mockRouteParams }),
}));

const mockRecordRemoveReplacement = jest.fn();
jest.mock('../../../../services/firebase/journeyState.service', () => ({
  recordRemoveReplacement: (...a: any[]) => mockRecordRemoveReplacement(...a),
}));

const mockLogEvent = jest.fn();
jest.mock('../../../../services/firebase/analyticsEvents.service', () => ({
  logEvent: (...a: any[]) => mockLogEvent(...a),
}));

jest.mock('../../../../utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'u1' } }),
}));

// The scaffold pulls the onboarding chrome; the title and the primary are what
// this screen decides.
jest.mock('../RemoveCaptureScaffold', () => {
  const { Text, TouchableOpacity, View } = require('react-native');
  return {
    RemoveCaptureScaffold: ({
      title,
      primaryLabel,
      primaryDisabled,
      onPrimary,
      children,
    }: any) => (
      <View>
        <Text testID="scaffold-title">{title}</Text>
        {children}
        <TouchableOpacity
          testID="scaffold-primary"
          disabled={primaryDisabled}
          accessibilityState={{ disabled: !!primaryDisabled }}
          onPress={onPrimary}
        >
          <Text testID="scaffold-primary-label">{primaryLabel}</Text>
        </TouchableOpacity>
      </View>
    ),
  };
});

const mockCapture = {
  family: 'behavioral' as string | null,
  chipId: 'scroll' as string | null,
  chipLabel: 'Getting stuck scrolling' as string | null,
  text: null as string | null,
  timing: 'morning' as string | null,
};
jest.mock('../RemoveCaptureContext', () => ({
  useRemoveCapture: () => mockCapture,
}));

import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { ReplacementScreen } from '../ReplacementScreen';
import { REPLACEMENT_CONFIRMATIONS, REPLACEMENT_COPY, REPLACEMENT_MENUS } from '../copy';

function setCapture(
  family: string | null,
  timing: string | null,
  text: string | null = null
) {
  Object.assign(mockCapture, { family, timing, text });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRouteParams = {};
  mockRecordRemoveReplacement.mockResolvedValue(undefined);
  mockGetParent.mockReturnValue({ goBack: mockParentGoBack });
  setCapture('behavioral', 'morning');
});

describe('which capture sees a menu', () => {
  test.each(['morning', 'day', 'evening'] as const)(
    'a behavioral capture timed %s sees that slot menu and nothing else',
    (slot) => {
      setCapture('behavioral', slot);
      const { getByTestId, queryByTestId } = render(<ReplacementScreen />);

      expect(getByTestId(`remove-capture-replacement-menu-${slot}`)).toBeTruthy();
      expect(getByTestId('scaffold-title').props.children).toBe(REPLACEMENT_COPY.title);

      // Every option of this slot is on screen, and no option of another slot
      // is. A menu that rendered the union would still pass a "shows the
      // morning options" assertion.
      for (const option of REPLACEMENT_MENUS[slot]) {
        expect(getByTestId(`remove-capture-replacement-${option.id}`)).toBeTruthy();
      }
      for (const other of ['morning', 'day', 'evening'] as const) {
        if (other === slot) continue;
        for (const option of REPLACEMENT_MENUS[other]) {
          expect(queryByTestId(`remove-capture-replacement-${option.id}`)).toBeNull();
        }
      }
    }
  );

  test("'It varies' NEVER sees a menu", () => {
    setCapture('behavioral', 'varies');
    const { queryByTestId, getByTestId } = render(<ReplacementScreen />);

    expect(getByTestId('remove-capture-replacement-no-slot')).toBeTruthy();
    for (const slot of ['morning', 'day', 'evening'] as const) {
      expect(queryByTestId(`remove-capture-replacement-menu-${slot}`)).toBeNull();
    }
  });

  test.each(['mental', 'interpersonal'] as const)(
    'a %s capture NEVER sees a menu, even with a named slot',
    (family) => {
      setCapture(family, 'evening');
      const { queryByTestId, getByTestId } = render(<ReplacementScreen />);

      expect(getByTestId('remove-capture-replacement-no-slot')).toBeTruthy();
      for (const slot of ['morning', 'day', 'evening'] as const) {
        expect(queryByTestId(`remove-capture-replacement-menu-${slot}`)).toBeNull();
      }
    }
  );

  test('a capture with no timing at all NEVER sees a menu', () => {
    // The free-text and relationship paths both land here.
    setCapture('behavioral', null);
    const { getByTestId } = render(<ReplacementScreen />);
    expect(getByTestId('remove-capture-replacement-no-slot')).toBeTruthy();
  });
});

describe('single selection', () => {
  test('the primary is disabled until something is picked', () => {
    const { getByTestId } = render(<ReplacementScreen />);
    expect(getByTestId('scaffold-primary').props.accessibilityState.disabled).toBe(true);

    fireEvent.press(getByTestId('remove-capture-replacement-morning_outside'));
    expect(getByTestId('scaffold-primary').props.accessibilityState.disabled).toBe(false);
  });

  test('PICKING A SECOND OPTION REPLACES THE FIRST', async () => {
    // Single selection only, per the pack. Asserted through the write rather
    // than through a rendered selected state, because the write is what would
    // carry a second id if the state ever became a set.
    const { getByTestId } = render(<ReplacementScreen />);

    fireEvent.press(getByTestId('remove-capture-replacement-morning_outside'));
    fireEvent.press(getByTestId('remove-capture-replacement-morning_read'));
    fireEvent.press(getByTestId('scaffold-primary'));

    await waitFor(() => expect(mockRecordRemoveReplacement).toHaveBeenCalledTimes(1));
    expect(mockRecordRemoveReplacement).toHaveBeenCalledWith('u1', {
      optionId: 'morning_read',
      slot: 'morning',
    });
  });

  test('exactly one row reports itself selected at a time', () => {
    const { getByTestId } = render(<ReplacementScreen />);
    fireEvent.press(getByTestId('remove-capture-replacement-morning_outside'));
    fireEvent.press(getByTestId('remove-capture-replacement-morning_move'));

    const selected = REPLACEMENT_MENUS.morning.filter(
      (o) =>
        getByTestId(`remove-capture-replacement-${o.id}`).props.accessibilityState.selected
    );
    expect(selected.map((o) => o.id)).toEqual(['morning_move']);
  });
});

describe('the seed write', () => {
  test('writes the option id, the slot, and nothing else', async () => {
    setCapture('behavioral', 'evening');
    const { getByTestId } = render(<ReplacementScreen />);

    fireEvent.press(getByTestId('remove-capture-replacement-evening_phone_away'));
    fireEvent.press(getByTestId('scaffold-primary'));

    await waitFor(() => expect(mockRecordRemoveReplacement).toHaveBeenCalledTimes(1));
    const [uid, payload] = mockRecordRemoveReplacement.mock.calls[0];
    expect(uid).toBe('u1');
    // Pinned as an exact shape: an extra key here would be a field nobody
    // added to the model, to the rules note, or to the deletion reasoning.
    expect(Object.keys(payload).sort()).toEqual(['optionId', 'slot']);
    expect(payload).toEqual({ optionId: 'evening_phone_away', slot: 'evening' });
  });

  test('THE OPTION ID IS STORED, NEVER THE LABEL', async () => {
    const { getByTestId } = render(<ReplacementScreen />);
    fireEvent.press(getByTestId('remove-capture-replacement-morning_coffee'));
    fireEvent.press(getByTestId('scaffold-primary'));

    await waitFor(() => expect(mockRecordRemoveReplacement).toHaveBeenCalled());
    const payload = mockRecordRemoveReplacement.mock.calls[0][1];
    const label = REPLACEMENT_MENUS.morning.find((o) => o.id === 'morning_coffee')!.label;
    expect(payload.optionId).toBe('morning_coffee');
    expect(JSON.stringify(payload)).not.toContain(label);
  });

  test('logs the pick with a curated id and a closed slot', async () => {
    const { getByTestId } = render(<ReplacementScreen />);
    fireEvent.press(getByTestId('remove-capture-replacement-morning_write'));
    fireEvent.press(getByTestId('scaffold-primary'));

    await waitFor(() => expect(mockLogEvent).toHaveBeenCalled());
    expect(mockLogEvent).toHaveBeenCalledWith('u1', 'journey_remove_replacement_chosen', {
      optionId: 'morning_write',
      slot: 'morning',
    });
  });

  test('a second tap cannot produce a second write', async () => {
    const { getByTestId } = render(<ReplacementScreen />);
    fireEvent.press(getByTestId('remove-capture-replacement-morning_move'));
    fireEvent.press(getByTestId('scaffold-primary'));
    await waitFor(() => expect(mockRecordRemoveReplacement).toHaveBeenCalledTimes(1));

    fireEvent.press(getByTestId('scaffold-primary'));
    fireEvent.press(getByTestId('scaffold-primary'));

    expect(mockRecordRemoveReplacement).toHaveBeenCalledTimes(1);
  });

  test('STAYS ON THE PICK when the write fails, and a retry still works', async () => {
    mockRecordRemoveReplacement.mockRejectedValueOnce(new Error('offline'));
    const { getByTestId, queryByTestId } = render(<ReplacementScreen />);

    fireEvent.press(getByTestId('remove-capture-replacement-morning_move'));
    fireEvent.press(getByTestId('scaffold-primary'));

    await waitFor(() =>
      expect(getByTestId('remove-capture-replacement-error')).toBeTruthy()
    );
    expect(mockParentGoBack).not.toHaveBeenCalled();
    expect(mockGoBack).not.toHaveBeenCalled();
    expect(queryByTestId('remove-capture-replacement-confirmed')).toBeNull();

    fireEvent.press(getByTestId('scaffold-primary'));
    await waitFor(() =>
      expect(queryByTestId('remove-capture-replacement-confirmed')).toBeTruthy()
    );
    expect(mockRecordRemoveReplacement).toHaveBeenCalledTimes(2);
  });
});

describe('the neutral confirmation', () => {
  test.each([
    ['morning', 'morning_outside'],
    ['day', 'day_walk'],
    ['evening', 'evening_read'],
  ] as const)('the %s pick confirms with the slot-matched line', async (slot, optionId) => {
    setCapture('behavioral', slot);
    const { getByTestId } = render(<ReplacementScreen />);

    fireEvent.press(getByTestId(`remove-capture-replacement-${optionId}`));
    fireEvent.press(getByTestId('scaffold-primary'));

    await waitFor(() =>
      expect(getByTestId('remove-capture-replacement-confirmed')).toBeTruthy()
    );
    expect(getByTestId('scaffold-title').props.children).toBe(
      REPLACEMENT_CONFIRMATIONS[slot]
    );
  });

  test('THE CONFIRMATION PROMISES NO REMINDER', () => {
    // Pack decisions section 3: 3c-ii ships the neutral confirmations, not the
    // three that presume a nudge was scheduled. A screen that used the deferred
    // set would promise something this build cannot send.
    for (const line of Object.values(REPLACEMENT_CONFIRMATIONS)) {
      expect(line).not.toMatch(/bring this up|remind|nudge|notif/i);
    }
  });

  test('no nudge question and no reminder options are rendered', async () => {
    const { getByTestId, queryByText } = render(<ReplacementScreen />);
    fireEvent.press(getByTestId('remove-capture-replacement-morning_move'));
    fireEvent.press(getByTestId('scaffold-primary'));
    await waitFor(() =>
      expect(getByTestId('remove-capture-replacement-confirmed')).toBeTruthy()
    );

    expect(queryByText('Want a nudge when that time comes?')).toBeNull();
    expect(queryByText('Remind me')).toBeNull();
    expect(queryByText('No reminder')).toBeNull();
  });

  test('the menu is gone once confirmed, so there is no second pick', async () => {
    const { getByTestId, queryByTestId } = render(<ReplacementScreen />);
    fireEvent.press(getByTestId('remove-capture-replacement-morning_move'));
    fireEvent.press(getByTestId('scaffold-primary'));

    await waitFor(() =>
      expect(getByTestId('remove-capture-replacement-confirmed')).toBeTruthy()
    );
    expect(queryByTestId('remove-capture-replacement-menu-morning')).toBeNull();
    for (const option of REPLACEMENT_MENUS.morning) {
      expect(queryByTestId(`remove-capture-replacement-${option.id}`)).toBeNull();
    }
  });
});

describe('leaving the flow', () => {
  test('POPS THE PARENT, never the nested capture stack', async () => {
    // The same mechanism the first-move screen uses (3c-i walk fix): a nested
    // goBack would land on a capture screen the user has already answered.
    const { getByTestId } = render(<ReplacementScreen />);
    fireEvent.press(getByTestId('remove-capture-replacement-morning_move'));
    fireEvent.press(getByTestId('scaffold-primary'));
    await waitFor(() =>
      expect(getByTestId('remove-capture-replacement-confirmed')).toBeTruthy()
    );

    fireEvent.press(getByTestId('scaffold-primary'));

    expect(mockParentGoBack).toHaveBeenCalledTimes(1);
    expect(mockGoBack).not.toHaveBeenCalled();
    expect(mockGetParent).toHaveBeenCalled();
  });

  test('a capture with no slot can still leave', () => {
    setCapture('mental', 'evening');
    const { getByTestId } = render(<ReplacementScreen />);
    fireEvent.press(getByTestId('scaffold-primary'));

    expect(mockParentGoBack).toHaveBeenCalledTimes(1);
    expect(mockRecordRemoveReplacement).not.toHaveBeenCalled();
  });

  test('falls back to the local goBack when there is no parent', async () => {
    mockGetParent.mockReturnValue(undefined as any);
    const { getByTestId } = render(<ReplacementScreen />);
    fireEvent.press(getByTestId('remove-capture-replacement-morning_move'));
    fireEvent.press(getByTestId('scaffold-primary'));
    await waitFor(() =>
      expect(getByTestId('remove-capture-replacement-confirmed')).toBeTruthy()
    );

    fireEvent.press(getByTestId('scaffold-primary'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});

describe('the free text never reaches this screen', () => {
  test('NO CAPTURED TEXT APPEARS IN ANY STRING ON THE PICK OR THE CONFIRMATION', async () => {
    // The context is seeded WITH text on purpose. A screen that echoed it would
    // fail here rather than pass by never being handed one. In the real flow
    // this state is unreachable (the free-text path never asks timing, so it
    // never qualifies), which routing.test.ts pins separately.
    const secret = 'the thing I keep going back to at night';
    setCapture('behavioral', 'morning', secret);

    const { getByTestId, toJSON } = render(<ReplacementScreen />);
    expect(JSON.stringify(toJSON())).not.toContain(secret);

    fireEvent.press(getByTestId('remove-capture-replacement-morning_move'));
    fireEvent.press(getByTestId('scaffold-primary'));
    await waitFor(() =>
      expect(getByTestId('remove-capture-replacement-confirmed')).toBeTruthy()
    );

    expect(JSON.stringify(toJSON())).not.toContain(secret);
    // Not in the write, and not in the event either.
    expect(JSON.stringify(mockRecordRemoveReplacement.mock.calls)).not.toContain(secret);
    expect(JSON.stringify(mockLogEvent.mock.calls)).not.toContain(secret);
  });

  test('every rendered option label comes from the pack menu, not from the capture', () => {
    setCapture('behavioral', 'day', 'something I typed');
    const { toJSON } = render(<ReplacementScreen />);
    const tree = JSON.stringify(toJSON());

    for (const option of REPLACEMENT_MENUS.day) {
      expect(tree).toContain(option.label);
    }
    expect(tree).not.toContain('something I typed');
  });
});
