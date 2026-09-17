// The new-message sheet's geometry CONTRACT.
//
// READ THIS BEFORE ADDING AN ASSERTION HERE, BECAUSE THE FILE'S WHOLE VALUE
// DEPENDS ON BEING HONEST ABOUT WHAT IT DOES.
//
// THIS FILE GUARDS THE PROPERTIES THE GEOMETRY DEPENDS ON. IT CANNOT ASSERT THE
// GEOMETRY. RNTL has no layout engine: no Yoga pass, no keyboard, no frame, no
// screen. Nothing here can observe that the sheet's header renders above y=0,
// which is the defect this slice fixed, and nothing here would have caught it.
// A test that asserted the close control is "present" would have passed against
// the broken build — it was present the entire time, just off-screen.
//
// THE GEOMETRY'S PROOF IS THE WALK, at `docs/walks/new-message-sheet/WALK.md`.
// What this file does instead is pin the four properties the walked geometry is
// derived from, so that an edit which would reintroduce the defect goes red in
// CI rather than surviving to a device:
//
//   1. `flexShrink` on the sheet. Its `height` is a flex BASIS; Yoga's default
//      `flexShrink: 0` is what stopped a 78%-of-screen sheet yielding to a
//      KeyboardAvoidingView that had shrunk by the keyboard's full height, and
//      `justifyContent: 'flex-end'` is what sent the overflow off the TOP.
//   2. The KAV's `paddingTop`, taken from the safe-area inset. Latent until (1)
//      and activated by it: once the sheet stops overflowing it stops at the
//      top of the KAV's content box, and without the inset that is under the
//      status bar.
//   3. The KAV's `behavior`, and the ABSENCE of a `keyboardVerticalOffset`. RN
//      ADDS the offset to the padding it computes, so a positive one deepens
//      this defect. `utils/keyboard.ts` hands out 64 and `EnhancedModal` uses
//      100; either would look like a fix and would not be one. This is the most
//      likely well-meant regression on this surface, which is why it is pinned.
//   4. The overlay is NOT a descendant of the KAV (ruling 2). Inside it, the
//      backdrop was `absoluteFillObject` against the KAV's PADDING box, so the
//      keyboard shrank it to exactly the region the sheet already covered and
//      tap-to-dismiss silently stopped working.
//
// And `pointerEvents="box-none"`, which (4) cannot ship without: the KAV is
// `flex: 1` and now paints OVER the overlay, and a plain View is its own
// hit-test target, so without it the KAV swallows every backdrop tap.

import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TouchableWithoutFeedback,
} from 'react-native';
import { render, fireEvent, screen, act } from '@testing-library/react-native';

/** RNTL's element handle, derived from its own API rather than imported from
 *  `react-test-renderer`, which ships no declarations and would cost a tsc
 *  error against a baseline this slice holds flat. */
type Instance = ReturnType<typeof screen.getByLabelText>;

const INSET_TOP = 47; // an iPhone 14 Plus, the device the defect was found on
const SE_INSET_TOP = 20; // an iPhone SE, the end of the matrix that is not walkable here

/** Mutable so one test can change the inset WITHOUT `jest.resetModules()`.
 *  Resetting the registry here loads a second copy of React and every
 *  subsequent test in the file dies on a null dispatcher. */
let mockInsetTop = INSET_TOP;

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
}));

jest.mock('react-native-safe-area-context', () => ({
  // Real context, stubbed hook — R2's precedent on the four DashboardScreen
  // suites. The inset value here is what assertion (2) reads back.
  SafeAreaInsetsContext: jest.requireActual('react-native-safe-area-context')
    .SafeAreaInsetsContext,
  useSafeAreaInsets: () => ({
    top: mockInsetTop,
    bottom: 34,
    left: 0,
    right: 0,
  }),
}));

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

jest.mock('../../config/firebase', () => ({ db: null }));
jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'u1' } }),
}));
jest.mock('../../hooks/useTabBarInset', () => ({ useTabBarInset: () => 110 }));
jest.mock('../../hooks/useConversations', () => ({
  useConversations: () => ({ conversations: [], loading: false }),
}));
jest.mock('../../hooks', () => ({
  useConnections: () => ({ getConnectionIds: () => [] }),
  useStartConversation: () => ({ startConversation: jest.fn() }),
}));

import ConversationsScreen from '../ConversationsScreen';

/** Open the sheet. Every assertion below needs it mounted. */
const openSheet = async () => {
  render(<ConversationsScreen />);
  fireEvent.press(screen.getByLabelText('New Message'));
  await act(async () => {
    jest.advanceTimersByTime(1000);
  });
};

/** The sheet, found by IDENTITY rather than by position among the KAV's
 *  children. Taking `children[0]` would couple this to sibling ORDER, so
 *  anything that added a sibling ahead of the sheet — including moving the
 *  overlay back inside the KAV — would red the flexShrink test for a reason
 *  that has nothing to do with flexShrink. `borderTopLeftRadius` is the sheet's
 *  own rounded top and belongs to nothing else in this modal. */
const findSheetStyle = (kav: Instance): Record<string, unknown> => {
  const sheet = React.Children.toArray(kav.props.children)
    .filter(React.isValidElement)
    .map(
      (el) =>
        StyleSheet.flatten(
          (el as React.ReactElement<{ style?: unknown }>).props.style
        ) as Record<string, unknown> | undefined
    )
    .find((flat) => flat?.borderTopLeftRadius !== undefined);

  if (!sheet) {
    throw new Error(
      'The sheet is no longer a child of the KeyboardAvoidingView. That is a ' +
        'structural change, not a style change — re-read the geometry before ' +
        'relaxing this.'
    );
  }
  return sheet;
};

const hasAncestorOfType = (node: Instance, type: unknown): boolean => {
  let current: Instance | null = node.parent;
  while (current) {
    if (current.type === type) return true;
    current = current.parent;
  }
  return false;
};

beforeEach(() => {
  jest.useFakeTimers();
  mockInsetTop = INSET_TOP;
});

afterEach(() => {
  jest.useRealTimers();
});

describe('(1) the sheet can yield to the keyboard', () => {
  it('carries flexShrink, without which its fixed height overflows off the top', async () => {
    await openSheet();
    const kav = screen.UNSAFE_getByType(KeyboardAvoidingView);
    const sheetStyle = findSheetStyle(kav);

    expect(sheetStyle.flexShrink).toBe(1);

    // Non-vacuity: flexShrink only means something because a definite height is
    // there to be shrunk. If the height ever goes away, `flexShrink` is
    // guarding a different component and this test has stopped being about the
    // defect.
    expect(typeof sheetStyle.height).toBe('number');
  });
});

describe('(2) the KeyboardAvoidingView reserves the status bar', () => {
  it('takes paddingTop from the safe-area inset, not a literal', async () => {
    await openSheet();
    const kav = screen.UNSAFE_getByType(KeyboardAvoidingView);
    const kavStyle = StyleSheet.flatten(kav.props.style) as Record<
      string,
      unknown
    >;

    // Equal to the MOCKED inset, so a hardcoded 47 in the source would still
    // pass here but would fail the moment this mock's value changed — which is
    // what the next assertion is for.
    expect(kavStyle.paddingTop).toBe(INSET_TOP);
  });

  it('tracks the inset rather than hardcoding a device value', async () => {
    // Render at a DIFFERENT inset. A literal 47 in the source survives the
    // previous assertion; it cannot survive this one. The two devices are the
    // two ends of the walk matrix, and the SE end is the one nobody can walk in
    // this setup — which is exactly why it is worth pinning in jest.
    mockInsetTop = SE_INSET_TOP;
    await openSheet();

    const kav = screen.UNSAFE_getByType(KeyboardAvoidingView);
    const kavStyle = StyleSheet.flatten(kav.props.style) as Record<
      string,
      unknown
    >;
    expect(kavStyle.paddingTop).toBe(SE_INSET_TOP);
  });
});

describe('(3) the keyboard behaviour is the one the arithmetic assumes', () => {
  it("is 'padding' on iOS and carries NO keyboardVerticalOffset", async () => {
    expect(Platform.OS).toBe('ios');
    await openSheet();
    const kav = screen.UNSAFE_getByType(KeyboardAvoidingView);

    expect(kav.props.behavior).toBe('padding');

    // RN ADDS this to the padding it computes. A positive value displaces the
    // sheet FURTHER off the top — it is not a fix, it is the defect with a
    // number attached. The KAV is full-screen, so 0 is arithmetically correct.
    expect(kav.props.keyboardVerticalOffset).toBeUndefined();
  });

  it('is undefined on Android, where the padding mechanism does not apply', async () => {
    const original = Platform.OS;
    // Writable at run time under the react-native preset, and the types agree,
    // so no directive is needed here. Restored in the `finally` below: leaking
    // Platform.OS would silently change what every later test in the run means.
    Platform.OS = 'android';
    try {
      await openSheet();
      const kav = screen.UNSAFE_getByType(KeyboardAvoidingView);
      expect(kav.props.behavior).toBeUndefined();
    } finally {
      Platform.OS = original;
    }
  });
});

describe('(4) ruling 2: the overlay is outside the KeyboardAvoidingView', () => {
  it('the backdrop is not a descendant of the KAV, so the keyboard cannot shrink it away', async () => {
    await openSheet();
    const kav = screen.UNSAFE_getByType(KeyboardAvoidingView);
    const overlay = screen.UNSAFE_getByType(TouchableWithoutFeedback);

    expect(hasAncestorOfType(overlay, KeyboardAvoidingView)).toBe(false);

    // NON-VACUITY, and it is the assertion that makes the one above mean
    // something. `hasAncestorOfType` returning false would also be the answer
    // if the walk were broken, the tree were empty, or the helper were wrong.
    // The sheet IS inside the KAV, and proving that with the same helper proves
    // the helper works and the tree is real.
    const sheetHandle = screen.getByLabelText('Close');
    expect(hasAncestorOfType(sheetHandle, KeyboardAvoidingView)).toBe(true);
    expect(kav).toBeTruthy();
  });

  it("the KAV is box-none, without which it swallows every backdrop tap", async () => {
    await openSheet();
    const kav = screen.UNSAFE_getByType(KeyboardAvoidingView);

    // The KAV is `flex: 1` and now paints OVER the overlay rather than
    // containing it. A plain View is its own hit-test target, so `box-none` is
    // what keeps the backdrop reachable. Without it ruling 2 makes
    // tap-to-dismiss worse than it was, not better.
    expect(kav.props.pointerEvents).toBe('box-none');
  });
});
