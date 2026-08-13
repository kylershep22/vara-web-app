// Today's blocks — the day view and its sheet (TB-1b).
//
// The three rhythm states are the point of this file: TB-1b shows materially
// different copy per suggestPlacement kind, and getting the wrong one in front
// of a user who answered "It varies" (telling them to go answer) is the failure
// worth guarding.

// Gesture handler and reanimated are mocked LOCALLY rather than in
// jest.setup.js. Nothing in the suite had ever imported a gesture-handler
// component before this slice (SwipeableGoalCard, the pattern BlockCard follows,
// has no tests), so adding a global mock would put 182 passing suites at risk to
// serve one. The cost is that the real pan recogniser is never exercised here —
// the swipe belongs on the device walk, and the Remove action is asserted
// through its button, which is also the accessible path.
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const { View } = require('react-native');
  // Chainable no-op builder: Gesture.Pan().activeOffsetX().onUpdate().onEnd()
  const makeGesture = () => {
    const g: Record<string, () => unknown> = {};
    for (const method of ['activeOffsetX', 'onUpdate', 'onEnd', 'onStart', 'enabled']) {
      g[method] = () => g;
    }
    return g;
  };
  return {
    GestureDetector: ({ children }: any) => React.createElement(View, null, children),
    Gesture: { Pan: makeGesture },
  };
});

// Same stub the existing TimePickerSheet suite uses.
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaView: ({ children, style }: any) => React.createElement(View, { style }, children),
    useSafeAreaInsets: () => ({ top: 0, left: 0, right: 0, bottom: 0 }),
  };
});

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  // Run the effect body once on mount, which is what the screen needs.
  useFocusEffect: (cb: any) => {
    const React = require('react');
    React.useEffect(cb, [cb]);
  },
}));

const mockUseAuth = jest.fn();
jest.mock('../../../context/AuthContext', () => ({ useAuth: () => mockUseAuth() }));

const mockListBlocks = jest.fn();
const mockCreateBlock = jest.fn();
const mockDeleteBlock = jest.fn();
jest.mock('../../../services/firebase/dayBlocks.service', () => ({
  listDayBlocksBetween: (...a: any[]) => mockListBlocks(...a),
  createDayBlock: (...a: any[]) => mockCreateBlock(...a),
  deleteDayBlock: (...a: any[]) => mockDeleteBlock(...a),
}));

const mockGetRhythms = jest.fn();
jest.mock('../../../services/firebase/focusRhythms.service', () => ({
  getFocusRhythms: (...a: any[]) => mockGetRhythms(...a),
}));

import React from 'react';
import { Platform } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { DayBlocksScreen, MAX_BLOCKS_PER_DAY } from '../DayBlocksScreen';
import type { DayBlock } from '../../../types/models';
import {
  EMPTY_LINE,
  NO_RHYTHMS_INVITATION,
  PLACE_IT_THERE,
  SAVE_BLOCK,
  SUFFICIENCY_LINE,
  VARIES_LINE,
  missingFieldsHint,
  CHOOSE_START_TIME_ROW,
  startsAtRow,
  TIME_PICKER_TITLE,
} from '../blocksCopy';

/** Drive the underlying picker as an iOS spinner scroll would. */
function scrollPickerTo(hour: number, minute: number) {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  fireEvent(screen.UNSAFE_getByType('DateTimePicker' as any), 'change', { type: 'set' }, d);
}

/** A DayBlock whose startAt behaves like a Firestore Timestamp. */
function makeBlock(overrides: Partial<DayBlock> & { id: string; start: Date }): DayBlock {
  const { start, ...rest } = overrides;
  return {
    userId: 'u1',
    title: 'Q3 board deck',
    demand: 'heavy',
    durationMinutes: 90,
    isProtected: false,
    startAt: { toDate: () => start } as any,
    createdAt: {} as any,
    updatedAt: {} as any,
    ...rest,
  } as DayBlock;
}

const TODAY_9AM = new Date(2026, 7, 13, 9, 0, 0);

beforeEach(() => {
  jest.clearAllMocks();
  // The picker's Cancel/Done header is the iOS path; Android defers to the
  // system dialog and has no second commit button to disambiguate.
  Platform.OS = 'ios';
  mockUseAuth.mockReturnValue({ user: { uid: 'u1' } });
  mockListBlocks.mockResolvedValue([]);
  mockGetRhythms.mockResolvedValue([]);
  mockCreateBlock.mockResolvedValue('new-id');
  mockDeleteBlock.mockResolvedValue(undefined);
});

describe('the day view', () => {
  it('reads only today, from local midnight to local midnight', async () => {
    render(<DayBlocksScreen />);

    await waitFor(() => expect(mockListBlocks).toHaveBeenCalled());
    const [uid, start, end] = mockListBlocks.mock.calls[0];
    expect(uid).toBe('u1');
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    // Exactly one day apart, and the end is the NEXT midnight.
    expect(end.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it('shows a warm empty line and the Add CTA on an empty day', async () => {
    const { findByTestId, getByTestId } = render(<DayBlocksScreen />);

    expect(await findByTestId('day-blocks-empty')).toBeTruthy();
    expect(getByTestId('day-blocks-empty').props.children).toBe(EMPTY_LINE);
    expect(getByTestId('day-blocks-add')).toBeTruthy();
  });

  it('hides the strip on an empty day, so no empty zones are drawn', async () => {
    // Three labelled empty zones is the empty-hour framing A2 exists to avoid.
    const { findByTestId, queryByTestId } = render(<DayBlocksScreen />);

    await findByTestId('day-blocks-empty');
    expect(queryByTestId('day-shape-strip')).toBeNull();
  });

  it('renders the strip and a card once a block exists', async () => {
    mockListBlocks.mockResolvedValue([makeBlock({ id: 'b1', start: TODAY_9AM })]);

    const { findByTestId } = render(<DayBlocksScreen />);

    expect(await findByTestId('day-shape-strip')).toBeTruthy();
    expect(await findByTestId('block-card-b1')).toBeTruthy();
    expect(await findByTestId('day-shape-pill-b1')).toBeTruthy();
  });

  it('shows the Protected chip only when the block is protected', async () => {
    mockListBlocks.mockResolvedValue([
      makeBlock({ id: 'b1', start: TODAY_9AM, isProtected: true }),
      makeBlock({ id: 'b2', start: TODAY_9AM, isProtected: false }),
    ]);

    const { findByTestId, queryByTestId } = render(<DayBlocksScreen />);

    expect(await findByTestId('block-protected-b1')).toBeTruthy();
    expect(queryByTestId('block-protected-b2')).toBeNull();
  });

  it('removes a block through the service and re-reads the day', async () => {
    mockListBlocks.mockResolvedValue([makeBlock({ id: 'b1', start: TODAY_9AM })]);

    const { findByTestId } = render(<DayBlocksScreen />);
    fireEvent.press(await findByTestId('block-remove-b1'));

    await waitFor(() => expect(mockDeleteBlock).toHaveBeenCalledWith('b1'));
    // Re-read: the initial load plus one after the removal.
    await waitFor(() => expect(mockListBlocks).toHaveBeenCalledTimes(2));
  });
});

describe('past blocks fade, and never gain a done state', () => {
  it('fades a block whose end is behind us', async () => {
    // 00:30 for 30 minutes, read against a clock that is well past it.
    const longAgo = new Date();
    longAgo.setHours(0, 30, 0, 0);
    mockListBlocks.mockResolvedValue([
      makeBlock({ id: 'past', start: longAgo, durationMinutes: 30 }),
    ]);

    const { findByTestId } = render(<DayBlocksScreen />);
    const card = await findByTestId('block-card-past');

    const flat = Array.isArray(card.props.style)
      ? Object.assign({}, ...card.props.style.flat().filter(Boolean))
      : card.props.style;
    expect(flat.opacity).toBeLessThan(1);
  });

  it('renders no checkmark or completed affordance on any card', async () => {
    mockListBlocks.mockResolvedValue([makeBlock({ id: 'b1', start: TODAY_9AM })]);

    const { findByTestId, queryByTestId } = render(<DayBlocksScreen />);
    await findByTestId('block-card-b1');

    expect(queryByTestId('block-complete-b1')).toBeNull();
    expect(queryByTestId('block-checkbox-b1')).toBeNull();
  });
});

describe('the daily cap, framed as sufficiency', () => {
  it('replaces the Add CTA with the sufficiency line at the cap', async () => {
    mockListBlocks.mockResolvedValue(
      Array.from({ length: MAX_BLOCKS_PER_DAY }, (_, i) =>
        makeBlock({ id: `b${i}`, start: TODAY_9AM })
      )
    );

    const { findByTestId, queryByTestId, getByTestId } = render(<DayBlocksScreen />);

    expect(await findByTestId('day-blocks-sufficiency')).toBeTruthy();
    expect(getByTestId('day-blocks-sufficiency').props.children).toBe(SUFFICIENCY_LINE);
    // Replaced, not disabled: no locked door.
    expect(queryByTestId('day-blocks-add')).toBeNull();
  });

  it('still offers the CTA one block below the cap', async () => {
    mockListBlocks.mockResolvedValue(
      Array.from({ length: MAX_BLOCKS_PER_DAY - 1 }, (_, i) =>
        makeBlock({ id: `b${i}`, start: TODAY_9AM })
      )
    );

    const { findByTestId, queryByTestId } = render(<DayBlocksScreen />);

    expect(await findByTestId('day-blocks-add')).toBeTruthy();
    expect(queryByTestId('day-blocks-sufficiency')).toBeNull();
  });
});

describe('the sheet, in each of the three rhythm states', () => {
  async function openSheet(windows: string[]) {
    mockGetRhythms.mockResolvedValue(windows);
    const utils = render(<DayBlocksScreen />);
    fireEvent.press(await utils.findByTestId('day-blocks-add'));
    await utils.findByTestId('add-block-sheet');
    return utils;
  }

  it("ok: shows the suggestion and 'Place it there'", async () => {
    // afternoon is 12-16, so at any hour it is either active or still ahead
    // today, or it rolls to tomorrow. Either way the kind is 'ok'.
    const { getByTestId, queryByTestId, getByText } = await openSheet(['afternoon']);

    expect(getByTestId('add-block-suggestion')).toBeTruthy();
    // Queried by text, which also pins that the [COPY GAP] marker renders.
    expect(getByText(PLACE_IT_THERE)).toBeTruthy();
    expect(getByTestId('add-block-choose-time')).toBeTruthy();
    // Neither of the other two states leaks in.
    expect(queryByTestId('add-block-rhythms-invitation')).toBeNull();
    expect(queryByTestId('add-block-varies')).toBeNull();
  });

  it('no-rhythms: shows the invitation link and no suggestion card', async () => {
    const { getByTestId, queryByTestId, getByText } = await openSheet([]);

    const link = getByTestId('add-block-rhythms-invitation');
    expect(link).toBeTruthy();
    // A LINK, not a second button: the sheet keeps one primary action.
    expect(link.props.accessibilityRole).toBe('link');
    expect(queryByTestId('add-block-suggestion')).toBeNull();
    expect(queryByTestId('add-block-varies')).toBeNull();
    // The plain time picker is already available, and the primary is Save.
    expect(getByTestId('add-block-time-row')).toBeTruthy();
    expect(getByText(SAVE_BLOCK)).toBeTruthy();
    // And "I'll choose a time" is absent: there is no suggestion to decline.
    expect(queryByTestId('add-block-choose-time')).toBeNull();
  });

  it('no-rhythms: the invitation routes to FocusRhythms', async () => {
    const { getByTestId } = await openSheet([]);

    fireEvent.press(getByTestId('add-block-rhythms-invitation'));

    expect(mockNavigate).toHaveBeenCalledWith('FocusRhythms');
  });

  it('varies: neutral copy, a time picker, and NO invitation to go answer', async () => {
    const { getByTestId, queryByTestId } = await openSheet(['varies']);

    expect(getByTestId('add-block-varies').props.children).toBe(VARIES_LINE);
    // The load-bearing absence: they already answered, so nothing recruits
    // them to answer again.
    expect(queryByTestId('add-block-rhythms-invitation')).toBeNull();
    expect(queryByTestId('add-block-suggestion')).toBeNull();
    expect(getByTestId('add-block-time-row')).toBeTruthy();
  });

  it('exposes the invitation string exactly as drafted', async () => {
    const { getByText } = await openSheet([]);
    expect(getByText(NO_RHYTHMS_INVITATION)).toBeTruthy();
  });
});

describe('creating a block', () => {
  async function openSheetWith(windows: string[]) {
    mockGetRhythms.mockResolvedValue(windows);
    const utils = render(<DayBlocksScreen />);
    fireEvent.press(await utils.findByTestId('day-blocks-add'));
    await utils.findByTestId('add-block-sheet');
    return utils;
  }

  it('starts with NO demand selected', async () => {
    // "How much does this take out of you?" is a felt question, so nothing may
    // pre-answer it. A default would assign the user a state rather than
    // acknowledge one.
    const { getByTestId } = await openSheetWith(['afternoon']);

    for (const option of ['light', 'medium', 'heavy']) {
      expect(
        getByTestId(`add-block-demand-${option}`).props.accessibilityState.selected
      ).toBe(false);
    }
  });

  it('will not save until BOTH a title and a demand are given', async () => {
    // Asserted BEHAVIOURALLY rather than on style. The 40% dim is real but the
    // flattened style RNTL exposes for a TouchableOpacity is not a trustworthy
    // read of it, and "does the button actually save yet" is the stronger
    // claim regardless. The dim itself is on the device walk.
    const { getByTestId } = await openSheetWith(['afternoon']);

    fireEvent.press(getByTestId('add-block-confirm'));
    expect(mockCreateBlock).not.toHaveBeenCalled();

    fireEvent.changeText(getByTestId('add-block-title'), 'Q3 board deck');
    fireEvent.press(getByTestId('add-block-confirm'));
    // Title alone is not enough any more.
    expect(mockCreateBlock).not.toHaveBeenCalled();

    fireEvent.press(getByTestId('add-block-demand-heavy'));
    fireEvent.press(getByTestId('add-block-confirm'));
    await waitFor(() => expect(mockCreateBlock).toHaveBeenCalledTimes(1));
  });

  it('never announces the dimmed primary as disabled', async () => {
    // The load-bearing absence. If this becomes `{ disabled: true }`, screen
    // readers stop being able to activate it and the hint becomes unreachable
    // for exactly the users who most need it.
    const { getByTestId } = await openSheetWith(['afternoon']);

    const state = getByTestId('add-block-confirm').props.accessibilityState;
    expect(state?.disabled).toBeFalsy();
  });

  it('keeps the 60 minute duration default, which is logistics not a feeling', async () => {
    const { getByTestId } = await openSheetWith(['afternoon']);

    expect(getByTestId('add-block-duration-60').props.accessibilityState.selected).toBe(
      true
    );
  });

  it('persists suggestedFrom when the suggestion is accepted', async () => {
    const { getByTestId } = await openSheetWith(['afternoon']);

    fireEvent.changeText(getByTestId('add-block-title'), 'Q3 board deck');
    fireEvent.press(getByTestId('add-block-demand-heavy'));
    fireEvent.press(getByTestId('add-block-confirm'));

    await waitFor(() => expect(mockCreateBlock).toHaveBeenCalled());
    const [, draft] = mockCreateBlock.mock.calls[0];
    expect(draft.suggestedFrom).toBe('afternoon');
    expect(draft.title).toBe('Q3 board deck');
    expect(draft.demand).toBe('heavy');
    expect(draft.startAt).toBeInstanceOf(Date);
  });

  it('does NOT persist suggestedFrom when the user picks a time instead', async () => {
    const { getByTestId } = await openSheetWith(['afternoon']);

    fireEvent.changeText(getByTestId('add-block-title'), 'Q3 board deck');
    fireEvent.press(getByTestId('add-block-demand-heavy'));
    fireEvent.press(getByTestId('add-block-choose-time'));
    scrollPickerTo(15, 45);
    fireEvent.press(getByTestId('time-picker-done'));
    fireEvent.press(getByTestId('add-block-confirm'));

    await waitFor(() => expect(mockCreateBlock).toHaveBeenCalled());
    const [, draft] = mockCreateBlock.mock.calls[0];
    // A hand-picked time is not a rhythm placement.
    expect('suggestedFrom' in draft).toBe(false);
  });

  it('never persists suggestedFrom when there were no rhythms at all', async () => {
    const { getByTestId } = await openSheetWith([]);

    fireEvent.changeText(getByTestId('add-block-title'), 'Inbox');
    fireEvent.press(getByTestId('add-block-demand-light'));
    fireEvent.press(getByTestId('add-block-time-row'));
    scrollPickerTo(10, 0);
    fireEvent.press(getByTestId('time-picker-done'));
    fireEvent.press(getByTestId('add-block-confirm'));

    await waitFor(() => expect(mockCreateBlock).toHaveBeenCalled());
    const [, draft] = mockCreateBlock.mock.calls[0];
    expect('suggestedFrom' in draft).toBe(false);
  });

  it('surfaces a failed save and keeps the sheet open', async () => {
    mockCreateBlock.mockRejectedValueOnce(new Error('offline'));
    const { getByTestId, findByTestId } = await openSheetWith(['afternoon']);

    fireEvent.changeText(getByTestId('add-block-title'), 'Q3 board deck');
    fireEvent.press(getByTestId('add-block-demand-heavy'));
    fireEvent.press(getByTestId('add-block-confirm'));

    expect(await findByTestId('add-block-error')).toBeTruthy();
    // Still open, with the draft intact: retry costs one tap.
    expect(getByTestId('add-block-sheet')).toBeTruthy();
    expect(getByTestId('add-block-title').props.value).toBe('Q3 board deck');
  });

  it('says what is missing when the dimmed primary is tapped, and writes nothing', async () => {
    const { getByTestId, queryByTestId, getByText } = await openSheetWith(['afternoon']);

    // No hint until asked for: it answers a question the tap just posed.
    expect(queryByTestId('add-block-hint')).toBeNull();

    fireEvent.press(getByTestId('add-block-confirm'));

    expect(getByText(missingFieldsHint(true, true))).toBeTruthy();
    expect(mockCreateBlock).not.toHaveBeenCalled();
  });

  it('names only the part still missing', async () => {
    const { getByTestId, getByText } = await openSheetWith(['afternoon']);

    fireEvent.changeText(getByTestId('add-block-title'), 'Q3 board deck');
    fireEvent.press(getByTestId('add-block-confirm'));

    // Title is done, so the hint asks only for the demand.
    expect(getByText(missingFieldsHint(false, true))).toBeTruthy();
  });

  it('clears the hint once the block is complete', async () => {
    const { getByTestId, queryByTestId } = await openSheetWith(['afternoon']);

    fireEvent.press(getByTestId('add-block-confirm'));
    expect(getByTestId('add-block-hint')).toBeTruthy();

    fireEvent.changeText(getByTestId('add-block-title'), 'Q3 board deck');
    fireEvent.press(getByTestId('add-block-demand-heavy'));

    expect(queryByTestId('add-block-hint')).toBeNull();
  });

  it('carries the missing-fields hint to assistive tech without a tap', async () => {
    // A control announced as dimmed may not be activatable by a screen reader,
    // so the hint cannot be tap-only.
    const { getByTestId } = await openSheetWith(['afternoon']);

    expect(getByTestId('add-block-confirm').props.accessibilityHint).toBe(
      missingFieldsHint(true, true)
    );

    fireEvent.changeText(getByTestId('add-block-title'), 'Q3 board deck');
    fireEvent.press(getByTestId('add-block-demand-heavy'));

    expect(getByTestId('add-block-confirm').props.accessibilityHint).toBeUndefined();
  });

  it('writes the time PICKED in the picker, never the suggestion behind it', async () => {
    // THE DEVICE-WALK BUG, pinned. Manual mode used to carry a pre-seeded time
    // taken from the suggestion, so Save had something plausible to write from
    // the moment the picker opened and the user could not tell whether Done or
    // Save owned their choice. The suggestion here is 'afternoon' (12:00); the
    // picked time is 15:45, and only one of them may reach the service.
    const { getByTestId } = await openSheetWith(['afternoon']);

    fireEvent.changeText(getByTestId('add-block-title'), 'Q3 board deck');
    fireEvent.press(getByTestId('add-block-demand-heavy'));
    fireEvent.press(getByTestId('add-block-choose-time'));
    scrollPickerTo(15, 45);
    fireEvent.press(getByTestId('time-picker-done'));
    fireEvent.press(getByTestId('add-block-confirm'));

    await waitFor(() => expect(mockCreateBlock).toHaveBeenCalled());
    const [, draft] = mockCreateBlock.mock.calls[0];
    expect(draft.startAt.getHours()).toBe(15);
    expect(draft.startAt.getMinutes()).toBe(45);
    // The suggestion's own hour must not survive anywhere.
    expect(draft.startAt.getHours()).not.toBe(12);
  });

  it('will not save in manual mode until a time has been committed', async () => {
    const { getByTestId } = await openSheetWith(['afternoon']);

    fireEvent.changeText(getByTestId('add-block-title'), 'Q3 board deck');
    fireEvent.press(getByTestId('add-block-demand-heavy'));
    fireEvent.press(getByTestId('add-block-choose-time'));
    // Back out of the picker without committing.
    fireEvent.press(getByTestId('time-picker-cancel'));

    fireEvent.press(getByTestId('add-block-confirm'));

    expect(mockCreateBlock).not.toHaveBeenCalled();
    expect(getByTestId('add-block-hint')).toBeTruthy();
  });

  it('hides the footer while the picker is open, so Done and Save are never both live', async () => {
    const { getByTestId, queryByTestId } = await openSheetWith(['afternoon']);

    fireEvent.press(getByTestId('add-block-choose-time'));

    expect(getByTestId('time-picker-done')).toBeTruthy();
    expect(queryByTestId('add-block-confirm')).toBeNull();
  });

  it('renders the committed time as a row that reopens the picker', async () => {
    const { getByTestId, getByText, queryByTestId } = await openSheetWith(['afternoon']);

    // Before committing, the row invites rather than asserting a value.
    fireEvent.press(getByTestId('add-block-choose-time'));
    fireEvent.press(getByTestId('time-picker-cancel'));
    expect(getByText(CHOOSE_START_TIME_ROW)).toBeTruthy();

    fireEvent.press(getByTestId('add-block-time-row'));
    scrollPickerTo(15, 45);
    fireEvent.press(getByTestId('time-picker-done'));

    expect(getByText(startsAtRow('3:45 PM'))).toBeTruthy();
    expect(queryByTestId('time-picker-sheet')).toBeNull();

    // And the row is the way back in.
    fireEvent.press(getByTestId('add-block-time-row'));
    expect(getByTestId('time-picker-sheet')).toBeTruthy();
  });

  it('Cancel leaves an already-committed time exactly as it was', async () => {
    const { getByTestId, getByText } = await openSheetWith(['afternoon']);

    fireEvent.changeText(getByTestId('add-block-title'), 'Q3 board deck');
    fireEvent.press(getByTestId('add-block-demand-heavy'));
    fireEvent.press(getByTestId('add-block-choose-time'));
    scrollPickerTo(15, 45);
    fireEvent.press(getByTestId('time-picker-done'));

    // Reopen, scroll somewhere else, then back out.
    fireEvent.press(getByTestId('add-block-time-row'));
    scrollPickerTo(18, 30);
    fireEvent.press(getByTestId('time-picker-cancel'));

    expect(getByText(startsAtRow('3:45 PM'))).toBeTruthy();

    fireEvent.press(getByTestId('add-block-confirm'));
    await waitFor(() => expect(mockCreateBlock).toHaveBeenCalled());
    const [, draft] = mockCreateBlock.mock.calls[0];
    expect(draft.startAt.getHours()).toBe(15);
    expect(draft.startAt.getMinutes()).toBe(45);
  });

  it('titles the picker for blocks, never "Reminder time"', async () => {
    // The shared component defaults to the per-habit reminder wording. Blocks
    // have no reminders, so that default would misdescribe what happens next.
    const { getByTestId, getByText, queryByText } = await openSheetWith(['afternoon']);

    fireEvent.press(getByTestId('add-block-choose-time'));

    expect(getByText(TIME_PICKER_TITLE)).toBeTruthy();
    expect(queryByText('Reminder time')).toBeNull();
  });

  it('lets the user fall back to the suggestion after going manual', async () => {
    const { getByTestId } = await openSheetWith(['afternoon']);

    fireEvent.changeText(getByTestId('add-block-title'), 'Q3 board deck');
    fireEvent.press(getByTestId('add-block-demand-heavy'));
    fireEvent.press(getByTestId('add-block-choose-time'));
    fireEvent.press(getByTestId('time-picker-cancel'));

    // The card is still there, de-emphasized, naming the way back.
    expect(getByTestId('add-block-suggestion-reselect')).toBeTruthy();
    fireEvent.press(getByTestId('add-block-suggestion'));
    fireEvent.press(getByTestId('add-block-confirm'));

    await waitFor(() => expect(mockCreateBlock).toHaveBeenCalled());
    const [, draft] = mockCreateBlock.mock.calls[0];
    // Back on the accept path, provenance and all.
    expect(draft.suggestedFrom).toBe('afternoon');
    expect(draft.startAt.getHours()).toBe(12);
  });

  it('the sheet itself writes nothing before confirm', async () => {
    const { getByTestId } = await openSheetWith(['afternoon']);

    fireEvent.changeText(getByTestId('add-block-title'), 'Q3 board deck');
    fireEvent.press(getByTestId('add-block-demand-heavy'));
    fireEvent.press(getByTestId('add-block-duration-90'));
    fireEvent.press(getByTestId('add-block-protect'));

    // Everything above is local state. The screen owns the write.
    expect(mockCreateBlock).not.toHaveBeenCalled();
  });
});
