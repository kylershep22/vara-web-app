// The week number, end to end, through the REAL count path.
//
// The sibling WeeklyTodayScreen.test.tsx mocks weeklyCycle.service and so
// asserts what the screen does with a count it is handed. This file mocks only
// firebase/firestore and lets getLatestWeeklyCycle and
// countWeeklyCyclesForOutcome actually run, so what is under test is the whole
// chain: persisted documents -> equality-filtered getDocs -> snapshot size ->
// applyQuickWin -> what renders.
//
// WHAT THIS PINS. The week number previously had two derivations against two
// database states: the open counted before its own write and passed count + 1
// forward, while Today recounted after the write. Nothing forced them to agree,
// so re-entering the same week could flip the quick win off. There is now one
// derivation, and the case below (two stored cycles for one outcome must never
// show the quick win, however the screen was reached) is what keeps it that way.

const mockFirestoreDocs: { id: string; data: Record<string, unknown> }[] = [];

jest.mock('firebase/firestore', () => ({
  collection: (_db: unknown, name: string) => ({ __collection: name }),
  where: (field: string, op: string, value: unknown) => ({ __where: { field, op, value } }),
  query: (_coll: unknown, ...constraints: any[]) => ({ __constraints: constraints }),
  // Applies the equality filters for real, so a service that forgot one is
  // caught here rather than silently counting every cycle the user has.
  getDocs: async (q: any) => {
    const filters = (q.__constraints ?? [])
      .filter((c: any) => c?.__where)
      .map((c: any) => c.__where);
    const matched = mockFirestoreDocs.filter((d) =>
      filters.every((f: any) => d.data[f.field] === f.value)
    );
    return {
      docs: matched.map((d) => ({ id: d.id, data: () => d.data })),
      size: matched.length,
    };
  },
  doc: () => ({ __ref: true }),
  getDoc: async () => ({ exists: () => false }),
  addDoc: async () => ({ id: 'new-id' }),
  setDoc: async () => undefined,
  updateDoc: async () => undefined,
  orderBy: () => ({ __orderBy: true }),
  limit: () => ({ __limit: true }),
  serverTimestamp: () => ({ __ts: true }),
}));
// requireDb() reads `db` from this module, so mocking it here narrows the handle
// for the real services without mocking ensureDb itself.
jest.mock('../../../config/firebase', () => ({
  db: { __db: true },
  firebaseError: null,
}));
const mockReplace = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ replace: mockReplace }),
}));
jest.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'u1' } }),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: any) => {
    const { View } = require('react-native');
    return <View>{children}</View>;
  },
}));

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { WeeklyTodayScreen } from '../WeeklyTodayScreen';
import { PROTOCOL_MATRIX } from '../../../weeklyEngine';

/** Persist one weekly cycle, exactly as createWeeklyCycle would have. */
function persistCycle(over: Record<string, unknown> = {}) {
  const id = `cycle-${mockFirestoreDocs.length + 1}`;
  mockFirestoreDocs.push({
    id,
    data: {
      userId: 'u1',
      weekStart: '2026-08-03',
      outcome: 'focus',
      capacityInitial: 'normal',
      capacityCurrent: 'normal',
      protocolId: 'focus-normal',
      ...over,
    },
  });
  return id;
}

async function renderToday() {
  const screen = render(<WeeklyTodayScreen />);
  await waitFor(() => expect(screen.getByTestId('weekly-today')).toBeTruthy());
  return screen;
}

describe('WeeklyTodayScreen week number, derived from stored cycles', () => {
  beforeEach(() => {
    mockFirestoreDocs.length = 0;
    mockReplace.mockClear();
  });

  test('one stored cycle for the outcome is week 1, and the quick win renders', async () => {
    persistCycle();
    const screen = await renderToday();

    expect(screen.getByTestId('weekly-today-quickwin')).toBeTruthy();
    expect(screen.getByTestId('weekly-today-action').props.children).toBe(
      PROTOCOL_MATRIX.focus.normal.dailyAction
    );
  });

  test('a second stored cycle for the same outcome is week 2, and it does not', async () => {
    persistCycle({ weekStart: '2026-07-27' });
    persistCycle({ weekStart: '2026-08-03' });
    const screen = await renderToday();

    expect(screen.queryByTestId('weekly-today-quickwin')).toBeNull();
  });

  test('the quick win stays off on re-entry in that same second week', async () => {
    // The bug this file exists for: with the week number derived in two places,
    // arriving fresh from the open and arriving through the guard could give
    // different answers for one week. Two renders of the same stored state must
    // agree, because there is only one derivation left.
    persistCycle({ weekStart: '2026-07-27' });
    persistCycle({ weekStart: '2026-08-03' });

    const first = await renderToday();
    expect(first.queryByTestId('weekly-today-quickwin')).toBeNull();

    const second = await renderToday();
    expect(second.queryByTestId('weekly-today-quickwin')).toBeNull();
  });

  test('cycles on OTHER outcomes are not counted', async () => {
    // The week number is per outcome (spec 6.3): a user switching to a new
    // outcome is on week 1 of it and gets the quick win again, however long
    // they have had the app.
    persistCycle({ outcome: 'energy', weekStart: '2026-07-06' });
    persistCycle({ outcome: 'energy', weekStart: '2026-07-13' });
    persistCycle({ outcome: 'energy', weekStart: '2026-07-20' });
    persistCycle({ outcome: 'routines', weekStart: '2026-08-03' });
    const screen = await renderToday();

    // Latest cycle is the routines one, and routines has exactly one cycle.
    expect(screen.getByTestId('weekly-today-quickwin')).toBeTruthy();
    expect(screen.getByTestId('weekly-today-action').props.children).toBe(
      PROTOCOL_MATRIX.routines.normal.dailyAction
    );
  });

  test("another user's cycles are not counted", async () => {
    mockFirestoreDocs.push({
      id: 'someone-else-1',
      data: {
        userId: 'u2',
        weekStart: '2026-07-27',
        outcome: 'focus',
        capacityInitial: 'normal',
        capacityCurrent: 'normal',
        protocolId: 'focus-normal',
      },
    });
    persistCycle();
    const screen = await renderToday();

    // One cycle belongs to this user, so week 1, quick win on.
    expect(screen.getByTestId('weekly-today-quickwin')).toBeTruthy();
  });

  test('no stored cycle hands the decision back to the entry guard', async () => {
    render(<WeeklyTodayScreen />);

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('WeeklyEntry'));
  });
});
