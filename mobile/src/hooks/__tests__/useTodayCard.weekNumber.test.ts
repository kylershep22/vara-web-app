// The week number, end to end, through the REAL count path.
//
// RE-HOMED from screens/weekly/__tests__/WeeklyTodayScreen.weekNumber.test.tsx
// when the standalone Today route was deleted. The rule did not move house with
// the screen: it now lives in useTodayCard (countWeeklyCyclesForOutcome ->
// applyQuickWin), which is what Home resolves its day's action through. The
// mocking strategy is deliberately unchanged so the coverage is the same
// coverage and not a lighter restatement of it.
//
// The sibling useTodayCard suites mock weeklyCycle.service and so assert what
// the hook does with a count it is handed. This file mocks only
// firebase/firestore and lets countWeeklyCyclesForOutcome actually run, so what
// is under test is the whole chain: persisted documents -> equality-filtered
// getDocs -> snapshot size -> applyQuickWin -> what the hook reports.
//
// WHAT THIS PINS. The week number previously had two derivations against two
// database states: the open counted before its own write and passed count + 1
// forward, while Today recounted after the write. Nothing forced them to agree,
// so re-entering the same week could flip the quick win off. There is now one
// derivation, and the case below (two stored cycles for one outcome must never
// show the quick win, however Home was reached) is what keeps it that way.
//
// NOT re-homed, because it was never about the week number: the deleted suite's
// last case asserted the Today SCREEN bounced back to the entry guard when no
// cycle was stored. That was the screen's own self-heal. Home answers the same
// question by rendering instead of navigating, and the rule behind it is
// covered directly in screens/weekly/__tests__/weeklyEntry.test.ts.

const mockFirestoreDocs: { id: string; data: Record<string, unknown> }[] = [];

// useTodayCard imports the event writer for the capacity re-set. This suite
// deliberately lets the real Firestore services run, so without this mock the
// real writer loads too and drags in expo-constants, which dies on
// `EventEmitter` outside a native runtime. Nothing here taps anything that
// fires an event; this is purely keeping the chain under test to the one this
// file is about.
jest.mock('../../services/firebase/analyticsEvents.service', () => ({
  logEvent: jest.fn(),
}));

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
jest.mock('../../config/firebase', () => ({
  db: { __db: true },
  firebaseError: null,
}));

import { renderHook, waitFor } from '@testing-library/react-native';

import { cycleSource, useTodayCard } from '../useTodayCard';
import { PROTOCOL_MATRIX } from '../../protocolEngine';
import type { WeeklyCycle } from '../../types/models';

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

/**
 * The cycle Home has resolved and hands to the hook. Defaults to the same shape
 * persistCycle writes, since on Home the two are the same document: the landing
 * hook reads it, the card hook counts alongside it.
 */
const resolved = (over: Partial<WeeklyCycle> = {}): WeeklyCycle =>
  ({
    id: 'cycle-1',
    userId: 'u1',
    weekStart: '2026-08-03',
    outcome: 'focus',
    capacityInitial: 'normal',
    capacityCurrent: 'normal',
    protocolId: 'focus-normal',
    ...over,
  }) as WeeklyCycle;

async function renderToday(cycle: WeeklyCycle = resolved()) {
  const view = renderHook(() => useTodayCard('u1', cycleSource(cycle)));
  await waitFor(() => expect(view.result.current.protocol).not.toBeNull());
  return view;
}

describe('useTodayCard week number, derived from stored cycles', () => {
  beforeEach(() => {
    mockFirestoreDocs.length = 0;
  });

  test('one stored cycle for the outcome is week 1, and the quick win is active', async () => {
    persistCycle();
    const { result } = await renderToday();

    expect(result.current.protocol?.quickWinActive).toBe(true);
    expect(result.current.protocol?.dailyAction).toBe(
      PROTOCOL_MATRIX.focus.normal[0].dailyAction
    );
  });

  test('a second stored cycle for the same outcome is week 2, and it is not', async () => {
    persistCycle({ weekStart: '2026-07-27' });
    persistCycle({ weekStart: '2026-08-03' });
    const { result } = await renderToday();

    expect(result.current.protocol?.quickWinActive).toBe(false);
  });

  test('the quick win stays off on re-entry in that same second week', async () => {
    // The bug this file exists for: with the week number derived in two places,
    // arriving fresh from the open and arriving through the guard could give
    // different answers for one week. Two resolves of the same stored state
    // must agree, because there is only one derivation left.
    persistCycle({ weekStart: '2026-07-27' });
    persistCycle({ weekStart: '2026-08-03' });

    const first = await renderToday();
    expect(first.result.current.protocol?.quickWinActive).toBe(false);

    const second = await renderToday();
    expect(second.result.current.protocol?.quickWinActive).toBe(false);
  });

  test('cycles on OTHER outcomes are not counted', async () => {
    // The week number is per outcome (spec 6.3): a user switching to a new
    // outcome is on week 1 of it and gets the quick win again, however long
    // they have had the app.
    persistCycle({ outcome: 'energy', weekStart: '2026-07-06' });
    persistCycle({ outcome: 'energy', weekStart: '2026-07-13' });
    persistCycle({ outcome: 'energy', weekStart: '2026-07-20' });
    persistCycle({ outcome: 'routines', weekStart: '2026-08-03' });
    const { result } = await renderToday(resolved({ outcome: 'routines' } as Partial<WeeklyCycle>));

    // Routines has exactly one stored cycle, so week 1 of routines.
    expect(result.current.protocol?.quickWinActive).toBe(true);
    expect(result.current.protocol?.dailyAction).toBe(
      PROTOCOL_MATRIX.routines.normal[0].dailyAction
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
    const { result } = await renderToday();

    // One cycle belongs to this user, so week 1, quick win on.
    expect(result.current.protocol?.quickWinActive).toBe(true);
  });
});
