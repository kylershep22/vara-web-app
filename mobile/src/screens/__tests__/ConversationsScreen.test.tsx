// ConversationsScreen's new-message sheet: the two entry points, dismissal,
// and the empty-connections branch.
//
// WHAT THIS FILE CAN AND CANNOT PROVE, STATED UP FRONT BECAUSE IT IS THE WHOLE
// POINT OF THE SLICE THAT PRODUCED IT.
//
// The defect this screen shipped with was GEOMETRIC: the sheet's header, its
// title, its subtitle and its close control all rendered about 132pt ABOVE the
// top of the screen on a 14 Plus, because a fixed `height` could not shrink
// inside a KeyboardAvoidingView that had shrunk by the keyboard's full height.
// Every one of those elements was in the tree the whole time.
//
// RNTL has no layout engine. There is no Yoga pass, no keyboard, no frame and
// no screen. So `expect(getByLabelText('Close')).toBeTruthy()` passes against
// the BROKEN build and against the FIXED one alike, and so would a snapshot,
// and so would asserting `closeButton.props.onPress === closeSheet`. Any test
// in this file that looked like it was guarding the defect would be guarding
// nothing.
//
// So this file does not try. It asserts BEHAVIOUR that is real in jest — the
// entry points wire to the same opener, the close control actually removes the
// sheet, the empty branch renders — and its sibling
// `ConversationsScreen.geometry.test.tsx` pins the PROPERTIES THE GEOMETRY
// DEPENDS ON. Neither asserts the geometry itself. THAT IS THE WALK'S JOB, and
// it is scripted at `docs/walks/new-message-sheet/WALK.md`.
//
// DISMISSAL IS PROVEN BY OUTCOME, NOT BY PROP. `props.onPress` being the right
// function reference proves the reference, not that pressing it does anything:
// the callback runs an `Animated.parallel` whose completion callback is what
// actually unmounts the sheet. So the test presses, drives the animation, and
// asserts the sheet is GONE.

import React from 'react';
import { TouchableWithoutFeedback } from 'react-native';
import { render, fireEvent, screen, act } from '@testing-library/react-native';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
}));

jest.mock('react-native-safe-area-context', () => ({
  // Passed through from the real module rather than re-created, per R2's
  // precedent on the four DashboardScreen suites: the screen reads the
  // safe-area CONTEXT through `useTabBarInset`, not only the hook, so a stub of
  // this module has to carry it or the stub stops being true the moment
  // anything downstream reaches for the context.
  SafeAreaInsetsContext: jest.requireActual('react-native-safe-area-context')
    .SafeAreaInsetsContext,
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));

// The global `@expo/vector-icons` mock in jest.setup.js exports only
// MaterialCommunityIcons, and this screen imports Ionicons as well. Rendering
// each glyph as a testID-bearing View also gives the FAB a handle, which it
// otherwise does not have: it carries NO accessibilityRole and NO
// accessibilityLabel. That is a real defect, booked to TECH_DEBT rather than
// fixed here because it introduces a user-facing string and so carries a
// sentinel decision and an owner. This mock works around it for the test; it
// does not excuse it.
jest.mock('@expo/vector-icons', () => {
  // `jest.requireActual` rather than `require`: mock factories are hoisted
  // above the imports, so the module-scope `react-native` import is not in
  // scope here, and a bare `require` costs a lint error against a baseline
  // this slice holds flat.
  const RN = jest.requireActual('react-native');
  return {
    Ionicons: ({ name }: { name: string }) => <RN.View testID={`icon-${name}`} />,
    MaterialCommunityIcons: ({ name }: { name: string }) => (
      <RN.View testID={`icon-${name}`} />
    ),
  };
});

// `db: null` short-circuits the sheet's connection-profile effect at its first
// line, which is what puts the sheet in its no-connections branch — the state
// Kyle's own accounts are actually in.
jest.mock('../../config/firebase', () => ({ db: null }));

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'u1' } }),
}));

jest.mock('../../hooks/useTabBarInset', () => ({
  useTabBarInset: () => 110,
}));

const mockUseConversations = jest.fn();
jest.mock('../../hooks/useConversations', () => ({
  useConversations: () => mockUseConversations(),
}));

const mockStartConversation = jest.fn();
jest.mock('../../hooks', () => ({
  useConnections: () => ({ getConnectionIds: () => [] }),
  useStartConversation: () => ({ startConversation: mockStartConversation }),
}));

import ConversationsScreen from '../ConversationsScreen';

/** Unique to the sheet. The title "New Message" is NOT: the empty state's own
 *  action button carries the same words, so asserting on it would pass while
 *  the sheet stayed shut. */
const SHEET_MARKER = 'Select a connection to message';

const ONE_CONVERSATION = [
  {
    id: 'c1',
    participants: ['u1', 'u2'],
    otherUser: { displayName: 'Sam' },
  },
];

/** The sheet's open and close both run `Animated.parallel(...).start()`, and the
 *  close only unmounts the sheet from that animation's COMPLETION callback. */
const settleAnimations = async () => {
  await act(async () => {
    jest.advanceTimersByTime(1000);
  });
};

beforeEach(() => {
  jest.useFakeTimers();
  mockUseConversations.mockReturnValue({ conversations: [], loading: false });
  mockStartConversation.mockReset();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('the new-message sheet opens from both entry points', () => {
  it('opens from the empty state action, which is the zero-conversation route', async () => {
    mockUseConversations.mockReturnValue({ conversations: [], loading: false });
    render(<ConversationsScreen />);

    expect(screen.queryByText(SHEET_MARKER)).toBeNull();

    fireEvent.press(screen.getByLabelText('New Message'));
    await settleAnimations();

    expect(screen.getByText(SHEET_MARKER)).toBeTruthy();
  });

  it('opens from the FAB, which is the only route once a conversation exists', async () => {
    mockUseConversations.mockReturnValue({
      conversations: ONE_CONVERSATION,
      loading: false,
    });
    render(<ConversationsScreen />);

    // The empty state — and with it the second entry point — is gone.
    expect(screen.queryByLabelText('New Message')).toBeNull();
    expect(screen.queryByText(SHEET_MARKER)).toBeNull();

    fireEvent.press(screen.getByTestId('icon-message-plus'));
    await settleAnimations();

    expect(screen.getByText(SHEET_MARKER)).toBeTruthy();
  });
});

describe('the sheet can be dismissed', () => {
  it('the close control REMOVES the sheet, not merely holds a reference to closeSheet', async () => {
    render(<ConversationsScreen />);
    fireEvent.press(screen.getByLabelText('New Message'));
    await settleAnimations();
    expect(screen.getByText(SHEET_MARKER)).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Close'));
    await settleAnimations();

    // The outcome, not the wiring. This is the assertion that a
    // `props.onPress` check cannot make.
    expect(screen.queryByText(SHEET_MARKER)).toBeNull();
  });

  it('tapping the backdrop removes the sheet', async () => {
    render(<ConversationsScreen />);
    fireEvent.press(screen.getByLabelText('New Message'));
    await settleAnimations();

    // The overlay carries no testID and needs none: it is the screen's only
    // TouchableWithoutFeedback.
    fireEvent.press(screen.UNSAFE_getByType(TouchableWithoutFeedback));
    await settleAnimations();

    expect(screen.queryByText(SHEET_MARKER)).toBeNull();
  });
});

describe('the sheet with no connections', () => {
  it('renders the empty branch, which is the state a real account lands in', async () => {
    render(<ConversationsScreen />);
    fireEvent.press(screen.getByLabelText('New Message'));
    await settleAnimations();

    expect(screen.getByText('No connections yet')).toBeTruthy();
    expect(
      screen.getByText('Connect with people first to start messaging')
    ).toBeTruthy();

    // And the header is in the tree beside it. This asserts the branch does not
    // replace the header — it does NOT assert the header is on screen, which
    // RNTL cannot see. See this file's header.
    expect(screen.getByLabelText('Close')).toBeTruthy();
  });
});
