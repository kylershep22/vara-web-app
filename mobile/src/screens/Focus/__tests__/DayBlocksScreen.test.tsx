// Today's blocks — the day view and its sheet (TB-1b).
//
// The three rhythm states are the point of this file: TB-1b shows materially
// different copy per suggestPlacement kind, and getting the wrong one in front
// of a user who answered "It varies" (telling them to go answer) is the failure
// worth guarding.

// No gesture-handler or reanimated mock any more: TB-1c deleted the swipe from
// BlockCard, and nothing else in the blocks feature touches either library.

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
const mockUpdateBlock = jest.fn();
jest.mock('../../../services/firebase/dayBlocks.service', () => ({
  listDayBlocksBetween: (...a: any[]) => mockListBlocks(...a),
  createDayBlock: (...a: any[]) => mockCreateBlock(...a),
  deleteDayBlock: (...a: any[]) => mockDeleteBlock(...a),
  updateDayBlock: (...a: any[]) => mockUpdateBlock(...a),
}));

const mockGetRhythms = jest.fn();
jest.mock('../../../services/firebase/focusRhythms.service', () => ({
  getFocusRhythms: (...a: any[]) => mockGetRhythms(...a),
}));

import React from 'react';
import { Alert, Platform } from 'react-native';
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
  EARLIER_TODAY,
  placedForTomorrow,
  overlapMessage,
  USE_THIS_TIME,
  EDIT_TITLE,
  SAVE_CHANGES,
  REMOVE_BLOCK,
  TAB_TOMORROW,
  TOMORROW_TITLE,
  TOMORROW_EMPTY,
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
  mockUpdateBlock.mockResolvedValue(undefined);
});

afterEach(() => {
  // Several tests spy on Date.prototype.getHours to drive the rollover. Restore
  // so a mocked clock cannot leak into the next test in the file.
  jest.restoreAllMocks();
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

  it('opens the edit sheet when a card is tapped', async () => {
    // The card is the edit affordance now. TB-1b's swipe-to-remove pane is
    // gone entirely; the sheet owns removal.
    mockListBlocks.mockResolvedValue([makeBlock({ id: 'b1', start: TODAY_9AM })]);

    const { findByTestId, getByText } = render(<DayBlocksScreen />);
    fireEvent.press(await findByTestId('block-card-b1'));

    await findByTestId('add-block-sheet');
    expect(getByText(EDIT_TITLE)).toBeTruthy();
  });

  it('has no swipe remove affordance left anywhere', async () => {
    mockListBlocks.mockResolvedValue([makeBlock({ id: 'b1', start: TODAY_9AM })]);

    const { findByTestId, queryByTestId } = render(<DayBlocksScreen />);
    await findByTestId('block-card-b1');

    expect(queryByTestId('block-remove-b1')).toBeNull();
  });
});

describe('past blocks are captioned, never faded, and never gain a done state', () => {
  it('leaves a past card at FULL opacity', async () => {
    // Round 3 removed the fade outright: it was misread as a rendering glitch
    // in two consecutive walks. The caption below is the entire treatment now.
    const longAgo = new Date();
    longAgo.setHours(0, 30, 0, 0);
    mockListBlocks.mockResolvedValue([
      makeBlock({ id: 'past', start: longAgo, durationMinutes: 30 }),
    ]);

    const { findByTestId } = render(<DayBlocksScreen />);
    const card = await findByTestId('block-card-past');

    const parts = (Array.isArray(card.props.style)
      ? card.props.style.flat(Infinity)
      : [card.props.style]
    ).filter(Boolean);
    expect(parts.some((part: any) => typeof part?.opacity === 'number' && part.opacity < 1)).toBe(
      false
    );
  });

  it('captions a past card, which is the only mark it carries', async () => {
    const longAgo = new Date();
    longAgo.setHours(0, 30, 0, 0);
    mockListBlocks.mockResolvedValue([
      makeBlock({ id: 'past', start: longAgo, durationMinutes: 30 }),
    ]);

    const { findByTestId, getByText } = render(<DayBlocksScreen />);

    await findByTestId('block-past-past');
    expect(getByText(EARLIER_TODAY)).toBeTruthy();
  });

  it('does NOT caption a block still ahead', async () => {
    const soon = new Date();
    soon.setHours(23, 30, 0, 0);
    mockListBlocks.mockResolvedValue([
      makeBlock({ id: 'later', start: soon, durationMinutes: 30 }),
    ]);

    const { findByTestId, queryByTestId } = render(<DayBlocksScreen />);

    await findByTestId('block-card-later');
    expect(queryByTestId('block-past-later')).toBeNull();
  });

  it('distinguishes a 5 AM block from a 5 PM one', async () => {
    // THE ROUND-3 ROOT CAUSE, pinned. formatTimeRange rendered bare 12-hour
    // times, so an already-past morning block and a live evening block showed
    // the SAME string. One captioned and one not, side by side, read as the
    // past treatment being broken. The predicate was correct all along; the
    // display was ambiguous. Drop the meridiem again and this fails.
    const am = new Date();
    am.setHours(5, 0, 0, 0);
    const pm = new Date();
    pm.setHours(17, 0, 0, 0);
    mockListBlocks.mockResolvedValue([
      makeBlock({ id: 'am', start: am, durationMinutes: 60 }),
      makeBlock({ id: 'pm', start: pm, durationMinutes: 60 }),
    ]);

    const { findByTestId, queryAllByText } = render(<DayBlocksScreen />);

    await findByTestId('block-card-am');
    // The two cards must not be able to render the same label.
    expect(queryAllByText('5:00 to 6:00')).toHaveLength(0);
    expect(queryAllByText('5:00 AM to 6:00 AM')).toHaveLength(1);
    expect(queryAllByText('5:00 PM to 6:00 PM')).toHaveLength(1);
  });

  it('captions strictly by end time, not by start', async () => {
    // The other half of the root cause: confirm the predicate itself is right,
    // so the fix above cannot be mistaken for papering over a bad comparison.
    // A block that STARTED in the past but has not ENDED is not past.
    const now = new Date();
    const startedButRunning = new Date(now.getTime() - 10 * 60_000);
    mockListBlocks.mockResolvedValue([
      makeBlock({ id: 'running', start: startedButRunning, durationMinutes: 60 }),
    ]);

    const { findByTestId, queryByTestId } = render(<DayBlocksScreen />);

    await findByTestId('block-card-running');
    expect(queryByTestId('block-past-running')).toBeNull();
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

  it('caps at six, and says so without naming a number', async () => {
    expect(MAX_BLOCKS_PER_DAY).toBe(6);
    // Count-agnostic on purpose: the cap moved 3 -> 6 in round 3 and the copy
    // must survive the next move too.
    expect(SUFFICIENCY_LINE).not.toMatch(/\b(three|six|3|6)\b/i);
  });

  it('draws all six pills on the strip at the cap without crashing', async () => {
    // No overlap handling on the strip by design; this only confirms six
    // legal, non-overlapping blocks all render.
    mockListBlocks.mockResolvedValue(
      Array.from({ length: MAX_BLOCKS_PER_DAY }, (_, i) => {
        const start = new Date(2026, 7, 13, 9 + i, 0, 0);
        return makeBlock({ id: `b${i}`, start, durationMinutes: 30 });
      })
    );

    const { findByTestId } = render(<DayBlocksScreen />);

    await findByTestId('day-shape-strip');
    for (let i = 0; i < MAX_BLOCKS_PER_DAY; i++) {
      expect(await findByTestId(`day-shape-pill-b${i}`)).toBeTruthy();
    }
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
    // Queried by the exported constant, not a literal, so the pending copy pass
    // on this file cannot break it.
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
    fireEvent.press(getByTestId('time-picker-commit'));
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
    fireEvent.press(getByTestId('time-picker-commit'));
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
    fireEvent.press(getByTestId('time-picker-commit'));
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

  it('hides the footer while the picker is open, so the two commits are never both live', async () => {
    const { getByTestId, queryByTestId } = await openSheetWith(['afternoon']);

    fireEvent.press(getByTestId('add-block-choose-time'));

    // The picker's own commit is present; the sheet's is not.
    expect(getByTestId('time-picker-commit')).toBeTruthy();
    expect(queryByTestId('add-block-confirm')).toBeNull();
  });

  it('takes the sheet over entirely: no form content behind the picker', async () => {
    // Round-2 walk: the picker rendered as a SECOND sheet stacked on the first,
    // with the duration chips visible bleeding through between the two layers.
    // The form must not be rendered at all while the picker is up.
    const { getByTestId, queryByTestId } = await openSheetWith(['afternoon']);

    fireEvent.press(getByTestId('add-block-choose-time'));

    expect(getByTestId('time-picker-sheet')).toBeTruthy();
    for (const id of [
      'add-block-title',
      'add-block-demand-heavy',
      'add-block-duration-60',
      'add-block-duration-90',
      'add-block-suggestion',
      'add-block-protect',
      'add-block-time-row',
    ]) {
      expect(queryByTestId(id)).toBeNull();
    }
  });

  it('restores the form when the picker closes', async () => {
    const { getByTestId } = await openSheetWith(['afternoon']);

    fireEvent.press(getByTestId('add-block-choose-time'));
    fireEvent.press(getByTestId('time-picker-cancel'));

    expect(getByTestId('add-block-duration-60')).toBeTruthy();
    expect(getByTestId('add-block-confirm')).toBeTruthy();
  });

  it('renders the committed time as a row that reopens the picker', async () => {
    const { getByTestId, getByText, queryByTestId } = await openSheetWith(['afternoon']);

    // Before committing, the row invites rather than asserting a value.
    fireEvent.press(getByTestId('add-block-choose-time'));
    fireEvent.press(getByTestId('time-picker-cancel'));
    expect(getByText(CHOOSE_START_TIME_ROW)).toBeTruthy();

    fireEvent.press(getByTestId('add-block-time-row'));
    scrollPickerTo(15, 45);
    fireEvent.press(getByTestId('time-picker-commit'));

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
    fireEvent.press(getByTestId('time-picker-commit'));

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

  it("writes TOMORROW's real date when the rollover suggestion is accepted", async () => {
    // suggestPlacement rolls over once every window has passed. At 23:00 with
    // only a mid-morning window, the suggestion is mid-morning TOMORROW, and
    // the stored instant has to be tomorrow's date carrying tomorrow's hour.
    // Writing today's date with tomorrow's hour would be a silent data bug;
    // this is the pin either way.
    jest.spyOn(Date.prototype, 'getHours').mockReturnValue(23);
    const { getByTestId } = await openSheetWith(['mid_morning']);

    fireEvent.changeText(getByTestId('add-block-title'), 'Q3 board deck');
    fireEvent.press(getByTestId('add-block-demand-heavy'));
    fireEvent.press(getByTestId('add-block-confirm'));

    await waitFor(() => expect(mockCreateBlock).toHaveBeenCalled());
    const [, draft] = mockCreateBlock.mock.calls[0];

    const today = new Date();
    const expected = new Date(today);
    expected.setDate(expected.getDate() + 1);

    expect(draft.startAt.getDate()).toBe(expected.getDate());
    expect(draft.startAt.getMonth()).toBe(expected.getMonth());
    expect(draft.startAt.getFullYear()).toBe(expected.getFullYear());
    // And it is genuinely a different calendar day from today.
    expect(draft.startAt.getDate()).not.toBe(today.getDate());
  });

  it('confirms a tomorrow placement, which this today-only view cannot show', async () => {
    // The block is created correctly and is simply out of range for this list
    // until TB-1c adds the Tomorrow view. Without the notice the save reads as
    // a silent failure.
    jest.spyOn(Date.prototype, 'getHours').mockReturnValue(23);
    const { getByTestId, findByTestId, getByText } = await openSheetWith(['mid_morning']);

    fireEvent.changeText(getByTestId('add-block-title'), 'Q3 board deck');
    fireEvent.press(getByTestId('add-block-demand-heavy'));
    fireEvent.press(getByTestId('add-block-confirm'));

    await findByTestId('day-blocks-tomorrow-notice');
    expect(getByText(placedForTomorrow('Mid-morning'))).toBeTruthy();
  });

  it('shows no tomorrow notice for a block placed today', async () => {
    jest.spyOn(Date.prototype, 'getHours').mockReturnValue(9);
    const { getByTestId, queryByTestId } = await openSheetWith(['afternoon']);

    fireEvent.changeText(getByTestId('add-block-title'), 'Q3 board deck');
    fireEvent.press(getByTestId('add-block-demand-heavy'));
    fireEvent.press(getByTestId('add-block-confirm'));

    await waitFor(() => expect(mockCreateBlock).toHaveBeenCalled());
    expect(queryByTestId('day-blocks-tomorrow-notice')).toBeNull();
  });

  it('refuses a save that overlaps an existing block, and names it', async () => {
    jest.spyOn(Date.prototype, 'getHours').mockReturnValue(9);
    // Existing: 12:00 to 13:00. The afternoon suggestion starts at 12:00.
    mockListBlocks.mockResolvedValue([
      makeBlock({
        id: 'existing',
        start: new Date(new Date().setHours(12, 0, 0, 0)),
        durationMinutes: 60,
        title: 'Q3 board deck',
      }),
    ]);
    const { getByTestId, findByTestId, getByText } = await openSheetWith(['afternoon']);

    fireEvent.changeText(getByTestId('add-block-title'), 'Strategy memo');
    fireEvent.press(getByTestId('add-block-demand-heavy'));
    fireEvent.press(getByTestId('add-block-confirm'));

    await findByTestId('add-block-overlap');
    // Naming the conflict is the requirement: "overlaps something" is a hunt.
    expect(getByText(overlapMessage('Q3 board deck'))).toBeTruthy();
    expect(mockCreateBlock).not.toHaveBeenCalled();
  });

  it('allows EXACT adjacency, which is not an overlap', async () => {
    jest.spyOn(Date.prototype, 'getHours').mockReturnValue(9);
    // Existing ends exactly at 12:00; the suggestion starts exactly at 12:00.
    mockListBlocks.mockResolvedValue([
      makeBlock({
        id: 'existing',
        start: new Date(new Date().setHours(11, 0, 0, 0)),
        durationMinutes: 60,
        title: 'Standup',
      }),
    ]);
    const { getByTestId } = await openSheetWith(['afternoon']);

    fireEvent.changeText(getByTestId('add-block-title'), 'Strategy memo');
    fireEvent.press(getByTestId('add-block-demand-heavy'));
    fireEvent.press(getByTestId('add-block-confirm'));

    // Back-to-back blocks must remain possible.
    await waitFor(() => expect(mockCreateBlock).toHaveBeenCalledTimes(1));
  });

  it('refuses a containing block as well as a partial straddle', async () => {
    jest.spyOn(Date.prototype, 'getHours').mockReturnValue(9);
    // 11:00 to 15:00 fully contains the 12:00 suggestion window.
    mockListBlocks.mockResolvedValue([
      makeBlock({
        id: 'existing',
        start: new Date(new Date().setHours(11, 0, 0, 0)),
        durationMinutes: 240,
        title: 'Offsite',
      }),
    ]);
    const { getByTestId, findByTestId } = await openSheetWith(['afternoon']);

    fireEvent.changeText(getByTestId('add-block-title'), 'Strategy memo');
    fireEvent.press(getByTestId('add-block-demand-heavy'));
    fireEvent.press(getByTestId('add-block-confirm'));

    await findByTestId('add-block-overlap');
    expect(mockCreateBlock).not.toHaveBeenCalled();
  });

  it("checks TOMORROW's list when the block lands tomorrow", async () => {
    jest.spyOn(Date.prototype, 'getHours').mockReturnValue(23);
    // Today's load is empty; tomorrow already holds a 9:00 block, which is
    // exactly where the rollover suggestion wants to go. Checking today's list
    // would wrongly allow it.
    const tomorrow9 = new Date();
    tomorrow9.setDate(tomorrow9.getDate() + 1);
    tomorrow9.setHours(9, 0, 0, 0);
    mockListBlocks
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        makeBlock({ id: 'tmr', start: tomorrow9, durationMinutes: 60, title: 'Deep work' }),
      ]);

    const { getByTestId, findByTestId, getByText } = await openSheetWith(['mid_morning']);

    fireEvent.changeText(getByTestId('add-block-title'), 'Strategy memo');
    fireEvent.press(getByTestId('add-block-demand-heavy'));
    fireEvent.press(getByTestId('add-block-confirm'));

    await findByTestId('add-block-overlap');
    expect(getByText(overlapMessage('Deep work'))).toBeTruthy();
    expect(mockCreateBlock).not.toHaveBeenCalled();
    // And the day it queried was tomorrow, not today.
    const [, queriedStart] = mockListBlocks.mock.calls[1];
    expect(queriedStart.getDate()).toBe(tomorrow9.getDate());
  });

  it('offers an explicit close, and closing discards the draft', async () => {
    // Standards 7.5: swipe/overlay dismissal is not an exit on its own.
    const first = await openSheetWith(['afternoon']);
    fireEvent.changeText(first.getByTestId('add-block-title'), 'Q3 board deck');
    fireEvent.press(first.getByTestId('add-block-demand-heavy'));

    fireEvent.press(first.getByLabelText('Close'));

    await waitFor(() => expect(first.queryByTestId('add-block-sheet')).toBeNull());
    expect(mockCreateBlock).not.toHaveBeenCalled();

    // Reopening starts clean: the keyed remount is what guarantees it.
    fireEvent.press(first.getByTestId('day-blocks-add'));
    await first.findByTestId('add-block-sheet');
    expect(first.getByTestId('add-block-title').props.value).toBe('');
    for (const option of ['light', 'medium', 'heavy']) {
      expect(
        first.getByTestId(`add-block-demand-${option}`).props.accessibilityState.selected
      ).toBe(false);
    }
  });

  it('hides the close X while the picker has taken the sheet over', async () => {
    // One exit at a time: the takeover's Cancel, not an X that would close the
    // whole sheet from underneath it.
    const { getByTestId, queryByLabelText } = await openSheetWith(['afternoon']);

    fireEvent.press(getByTestId('add-block-choose-time'));

    expect(queryByLabelText('Close')).toBeNull();
    expect(getByTestId('time-picker-cancel')).toBeTruthy();
  });

  it('commits the picker from a bottom primary, not a header link', async () => {
    const { getByTestId, queryByTestId, getByText } = await openSheetWith(['afternoon']);

    fireEvent.press(getByTestId('add-block-choose-time'));

    // Done is gone from the header in the takeover.
    expect(queryByTestId('time-picker-done')).toBeNull();
    expect(getByText(USE_THIS_TIME)).toBeTruthy();

    scrollPickerTo(15, 45);
    fireEvent.press(getByTestId('time-picker-commit'));

    expect(getByText(startsAtRow('3:45 PM'))).toBeTruthy();
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

describe('editing a block (TB-1c)', () => {
  const EXISTING = () =>
    makeBlock({
      id: 'b1',
      start: new Date(new Date().setHours(9, 0, 0, 0)),
      durationMinutes: 60,
      title: 'Q3 board deck',
      demand: 'heavy',
      isProtected: true,
      suggestedFrom: 'mid_morning',
    });

  async function openEditor(blocks = [EXISTING()]) {
    mockListBlocks.mockResolvedValue(blocks);
    const utils = render(<DayBlocksScreen />);
    fireEvent.press(await utils.findByTestId('block-card-b1'));
    await utils.findByTestId('add-block-sheet');
    return utils;
  }

  it('pre-fills every field from the block', async () => {
    const { getByTestId, getByText } = await openEditor();

    expect(getByTestId('add-block-title').props.value).toBe('Q3 board deck');
    expect(getByTestId('add-block-demand-heavy').props.accessibilityState.selected).toBe(true);
    expect(getByTestId('add-block-duration-60').props.accessibilityState.selected).toBe(true);
    expect(getByTestId('add-block-protect').props.value).toBe(true);
    // The block's own time is already committed, so Save is live immediately.
    expect(getByText(startsAtRow('9:00 AM'))).toBeTruthy();
    expect(getByText(SAVE_CHANGES)).toBeTruthy();
  });

  it('offers no rhythm suggestion while editing', async () => {
    // Adjusting a concrete time is not re-running placement.
    mockGetRhythms.mockResolvedValue(['afternoon']);
    const { queryByTestId } = await openEditor();

    expect(queryByTestId('add-block-suggestion')).toBeNull();
    expect(queryByTestId('add-block-choose-time')).toBeNull();
  });

  it('patches through updateDayBlock, never createDayBlock', async () => {
    const { getByTestId } = await openEditor();

    fireEvent.changeText(getByTestId('add-block-title'), 'Renamed deck');
    fireEvent.press(getByTestId('add-block-confirm'));

    await waitFor(() => expect(mockUpdateBlock).toHaveBeenCalled());
    expect(mockCreateBlock).not.toHaveBeenCalled();
    const [blockId, patch] = mockUpdateBlock.mock.calls[0];
    expect(blockId).toBe('b1');
    expect(patch.title).toBe('Renamed deck');
  });

  it('PRESERVES suggestedFrom when the time is untouched', async () => {
    const { getByTestId } = await openEditor();

    fireEvent.changeText(getByTestId('add-block-title'), 'Renamed deck');
    fireEvent.press(getByTestId('add-block-confirm'));

    await waitFor(() => expect(mockUpdateBlock).toHaveBeenCalled());
    const [, patch] = mockUpdateBlock.mock.calls[0];
    // Absent from the patch means untouched in Firestore.
    expect('suggestedFrom' in patch).toBe(false);
  });

  it('CLEARS suggestedFrom when the time moves', async () => {
    // The block no longer sits where the suggestion put it, so the provenance
    // has stopped being true. Data honesty, not copy.
    const { getByTestId } = await openEditor();

    fireEvent.press(getByTestId('add-block-time-row'));
    scrollPickerTo(14, 30);
    fireEvent.press(getByTestId('time-picker-commit'));
    fireEvent.press(getByTestId('add-block-confirm'));

    await waitFor(() => expect(mockUpdateBlock).toHaveBeenCalled());
    const [, patch] = mockUpdateBlock.mock.calls[0];
    expect(patch.suggestedFrom).toBeNull();
  });

  it('does not treat the edited block as its own overlap', async () => {
    // Stretching 60 minutes to 90 overlaps its own old span every time.
    const { getByTestId } = await openEditor();

    fireEvent.press(getByTestId('add-block-duration-90'));
    fireEvent.press(getByTestId('add-block-confirm'));

    await waitFor(() => expect(mockUpdateBlock).toHaveBeenCalled());
    const [, patch] = mockUpdateBlock.mock.calls[0];
    expect(patch.durationMinutes).toBe(90);
  });

  it('refuses an edit that collides with a DIFFERENT block, naming it', async () => {
    const neighbour = makeBlock({
      id: 'b2',
      start: new Date(new Date().setHours(11, 0, 0, 0)),
      durationMinutes: 60,
      title: 'Standup',
    });
    const { getByTestId, findByTestId, getByText } = await openEditor([EXISTING(), neighbour]);

    fireEvent.press(getByTestId('add-block-time-row'));
    scrollPickerTo(11, 30);
    fireEvent.press(getByTestId('time-picker-commit'));
    fireEvent.press(getByTestId('add-block-confirm'));

    await findByTestId('add-block-overlap');
    expect(getByText(overlapMessage('Standup'))).toBeTruthy();
    expect(mockUpdateBlock).not.toHaveBeenCalled();
  });

  it('keeps exact adjacency legal on edit', async () => {
    const neighbour = makeBlock({
      id: 'b2',
      start: new Date(new Date().setHours(11, 0, 0, 0)),
      durationMinutes: 60,
      title: 'Standup',
    });
    const { getByTestId } = await openEditor([EXISTING(), neighbour]);

    // 10:00 for 60 minutes ends exactly where Standup begins.
    fireEvent.press(getByTestId('add-block-time-row'));
    scrollPickerTo(10, 0);
    fireEvent.press(getByTestId('time-picker-commit'));
    fireEvent.press(getByTestId('add-block-confirm'));

    await waitFor(() => expect(mockUpdateBlock).toHaveBeenCalledTimes(1));
  });

  it('offers Remove in the sheet, behind a confirm', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { getByTestId, getByText } = await openEditor();

    expect(getByText(REMOVE_BLOCK)).toBeTruthy();
    fireEvent.press(getByTestId('add-block-remove'));

    // Confirmed first, not deleted on the spot.
    expect(alertSpy).toHaveBeenCalled();
    expect(mockDeleteBlock).not.toHaveBeenCalled();
  });

  it('deletes once the confirm is accepted', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation((_t: any, _m: any, buttons: any) => {
      const accept = buttons.find((b: any) => b.style !== 'cancel');
      accept.onPress();
    });
    const { getByTestId } = await openEditor();

    fireEvent.press(getByTestId('add-block-remove'));

    await waitFor(() => expect(mockDeleteBlock).toHaveBeenCalledWith('b1'));
  });

  it('shows no Remove when creating', async () => {
    mockListBlocks.mockResolvedValue([]);
    const utils = render(<DayBlocksScreen />);
    fireEvent.press(await utils.findByTestId('day-blocks-add'));
    await utils.findByTestId('add-block-sheet');

    expect(utils.queryByTestId('add-block-remove')).toBeNull();
  });
});

describe('the Tomorrow tab (TB-1c)', () => {
  async function switchToTomorrow() {
    const utils = render(<DayBlocksScreen />);
    await utils.findByTestId('day-blocks-tab-tomorrow');
    fireEvent.press(utils.getByTestId('day-blocks-tab-tomorrow'));
    return utils;
  }

  it('queries tomorrow local midnight to midnight', async () => {
    await switchToTomorrow();

    await waitFor(() => expect(mockListBlocks.mock.calls.length).toBeGreaterThan(1));
    const calls = mockListBlocks.mock.calls;
    const [, start, end] = calls[calls.length - 1];
    const expected = new Date();
    expected.setDate(expected.getDate() + 1);

    expect(start.getDate()).toBe(expected.getDate());
    expect(start.getHours()).toBe(0);
    expect(end.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it('switches the heading and the empty line', async () => {
    const { getByText } = await switchToTomorrow();

    await waitFor(() => expect(getByText(TOMORROW_TITLE)).toBeTruthy());
    expect(getByText(TOMORROW_EMPTY)).toBeTruthy();
  });

  it('draws NO strip on Tomorrow, even with blocks', async () => {
    // The strip reads rhythm-vs-placed for the day being lived through.
    mockListBlocks.mockResolvedValue([makeBlock({ id: 'b1', start: TODAY_9AM })]);
    const { queryByTestId, findByTestId } = await switchToTomorrow();

    await findByTestId('block-card-b1');
    expect(queryByTestId('day-shape-strip')).toBeNull();
  });

  it('creates on TOMORROWs date from the Tomorrow tab', async () => {
    mockGetRhythms.mockResolvedValue(['afternoon']);
    const utils = await switchToTomorrow();
    await waitFor(() => expect(utils.getByTestId('day-blocks-add')).toBeTruthy());

    fireEvent.press(utils.getByTestId('day-blocks-add'));
    await utils.findByTestId('add-block-sheet');
    // Manual only on this tab: no suggestion to accidentally place on today.
    expect(utils.queryByTestId('add-block-suggestion')).toBeNull();

    fireEvent.changeText(utils.getByTestId('add-block-title'), 'Strategy memo');
    fireEvent.press(utils.getByTestId('add-block-demand-heavy'));
    fireEvent.press(utils.getByTestId('add-block-time-row'));
    scrollPickerTo(10, 0);
    fireEvent.press(utils.getByTestId('time-picker-commit'));
    fireEvent.press(utils.getByTestId('add-block-confirm'));

    await waitFor(() => expect(mockCreateBlock).toHaveBeenCalled());
    const [, draft] = mockCreateBlock.mock.calls[0];
    const expected = new Date();
    expected.setDate(expected.getDate() + 1);
    expect(draft.startAt.getDate()).toBe(expected.getDate());
    expect(draft.startAt.getHours()).toBe(10);
  });

  it('checks the Tomorrow tabs own list for overlaps', async () => {
    const tomorrow10 = new Date();
    tomorrow10.setDate(tomorrow10.getDate() + 1);
    tomorrow10.setHours(10, 0, 0, 0);
    mockListBlocks.mockResolvedValue([
      makeBlock({ id: 'tmr', start: tomorrow10, durationMinutes: 60, title: 'Deep work' }),
    ]);

    const utils = await switchToTomorrow();
    await waitFor(() => expect(utils.getByTestId('day-blocks-add')).toBeTruthy());
    fireEvent.press(utils.getByTestId('day-blocks-add'));
    await utils.findByTestId('add-block-sheet');

    fireEvent.changeText(utils.getByTestId('add-block-title'), 'Strategy memo');
    fireEvent.press(utils.getByTestId('add-block-demand-heavy'));
    fireEvent.press(utils.getByTestId('add-block-time-row'));
    scrollPickerTo(10, 30);
    fireEvent.press(utils.getByTestId('time-picker-commit'));
    fireEvent.press(utils.getByTestId('add-block-confirm'));

    await utils.findByTestId('add-block-overlap');
    expect(utils.getByText(overlapMessage('Deep work'))).toBeTruthy();
    expect(mockCreateBlock).not.toHaveBeenCalled();
  });

  it('shows no tomorrow notice for a save made FROM the Tomorrow tab', async () => {
    // The block is right there in the list being looked at.
    const utils = await switchToTomorrow();
    await waitFor(() => expect(utils.getByTestId('day-blocks-add')).toBeTruthy());
    fireEvent.press(utils.getByTestId('day-blocks-add'));
    await utils.findByTestId('add-block-sheet');

    fireEvent.changeText(utils.getByTestId('add-block-title'), 'Strategy memo');
    fireEvent.press(utils.getByTestId('add-block-demand-light'));
    fireEvent.press(utils.getByTestId('add-block-time-row'));
    scrollPickerTo(10, 0);
    fireEvent.press(utils.getByTestId('time-picker-commit'));
    fireEvent.press(utils.getByTestId('add-block-confirm'));

    await waitFor(() => expect(mockCreateBlock).toHaveBeenCalled());
    expect(utils.queryByTestId('day-blocks-tomorrow-notice')).toBeNull();
  });
});
