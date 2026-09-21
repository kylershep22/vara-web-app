/**
 * DailyLog fixtures, shared across every suite that constructs one.
 *
 * NOT A SUITE. `jest.config.js` matches `**\/__tests__/**\/*.(test|spec).(ts|tsx)`,
 * so a plain `.ts` file in a `__tests__` directory is a module and is never
 * collected. Precedent: `src/__tests__/allowlistIntegrity.ts`.
 *
 * WHY THIS EXISTS. Five suites each declared their own local builder, in three
 * different signatures, and each one cast past the type in its own way. That
 * was survivable while `DailyLog` had one shape. Slice 9.1a makes the shapes
 * plural - a row can now carry completion with provenance, completion without
 * it, or no completion key at all - and the whole point of the historical-read
 * contract is that every reader treats all of them correctly. Five private
 * definitions of "a DailyLog" is how that contract quietly stops being tested.
 *
 * IT ABSORBS THE CAST, IN ONE PLACE, AND THE CAST CANNOT BE REMOVED.
 * `createdAt` and `updatedAt` are required `Timestamp`s, and `Timestamp` is NOT
 * exported by the global Firestore mock in `jest.setup.js` - that mock supplies
 * eight functions and no classes - so `Timestamp.now()` is a call on undefined
 * in any suite that does not declare its own. A fixture cannot construct a real
 * one portably. Every scenario below therefore still needs the assertion, and
 * chasing its removal is out of scope. What IS achieved is that it lives here
 * rather than in five places, where a later reader can see the reason.
 *
 * THE BASE PRESERVES TODAY'S DEFAULT SHAPE ON PURPOSE. `dailyLog()` still fills
 * `protocolCompleted: false` and `practiceIds: []`, exactly as the five local
 * builders did, so migrating them is a refactor and not a behaviour change. The
 * shapes that omit those keys are the NAMED scenarios below, where the omission
 * is the point and is visible at the call site.
 */
import type { DailyLog, RemoveFamily } from '../../../types/models';
// `CapacityTier` and `TimeClass` are declared in the engine and only IMPORTED
// by `types/models`, not re-exported from it, so they come from the barrel -
// the same route `dailyLog.service.ts` takes. Type-only, so nothing is wired.
import type { CapacityTier, TimeClass } from '../../../protocolEngine';

/** The default owner. Suites that assert on a specific uid override it. */
const DEFAULT_USER_ID = 'u1';

/**
 * A daily log in the shape the picker-then-completion flow produces.
 *
 * `id` is derived from the RESOLVED `userId`, so a suite overriding the owner
 * gets a consistent document key without restating it. An explicit `id` in the
 * overrides still wins, because the spread is last.
 */
export function dailyLog(date: string, overrides: Partial<DailyLog> = {}): DailyLog {
  const userId = overrides.userId ?? DEFAULT_USER_ID;
  return {
    id: `${userId}_${date}`,
    userId,
    date,
    protocolCompleted: false,
    practiceIds: [],
    ...overrides,
  } as DailyLog;
}

/**
 * SCENARIO 1 - a day completed before slice 9.1a.
 *
 * `protocolCompleted: true` and no provenance of any kind. This is the row the
 * historical-read contract is mostly about: it must count as complete, and its
 * missing identity must never be filled in from today's engine.
 */
export function historicalCompletion(
  date: string,
  overrides: Partial<DailyLog> = {}
): DailyLog {
  return dailyLog(date, { protocolCompleted: true, ...overrides });
}

/**
 * SCENARIO 2 - the user picked and has not completed.
 *
 * NO `protocolCompleted` KEY AT ALL, and no `practiceIds` either. This is what
 * a picker confirm actually writes: `upsertDailyLog` merges, and the two
 * writers are disjoint. It is live behaviour on a row written today, not a
 * legacy shape - and it is EXPRESSIBLE ONLY BECAUSE 9.1a made
 * `protocolCompleted` optional. Before that, this fixture could not have been
 * written honestly.
 *
 * The distinction it exists to test: absent is not `false` that a user
 * authored. Both read as not-done, and neither is a decline.
 */
export function pickedNotCompleted(
  date: string,
  overrides: Partial<DailyLog> = {}
): DailyLog {
  const userId = overrides.userId ?? DEFAULT_USER_ID;
  return {
    id: `${userId}_${date}`,
    userId,
    date,
    dailyCapacity: 'normal' as CapacityTier,
    dailyTimeBudget: 'medium' as TimeClass,
    ...overrides,
  } as DailyLog;
}

/**
 * SCENARIO 3 - a completion written by slice 9.1a or later.
 *
 * All four provenance fields present. `completedAt` is a stand-in rather than a
 * real `Timestamp`, for the reason in this file's header; no reader inspects
 * its contents, and the service suite asserts on the mock's sentinel instead.
 */
export function completionWithProvenance(
  date: string,
  overrides: Partial<DailyLog> = {}
): DailyLog {
  return dailyLog(date, {
    protocolCompleted: true,
    completedAt: { __fixtureTimestamp: true } as unknown as DailyLog['completedAt'],
    completionSource: 'user_declared',
    protocolCellId: 'remove-normal',
    protocolFamily: 'behavioral' as RemoveFamily,
    ...overrides,
  });
}

/**
 * SCENARIO 4 - identity present, no completion key.
 *
 * A STATE 9.1a's WRITER CANNOT PRODUCE, and that is why it is here. Provenance
 * is written only by the write that establishes the completion, so identity
 * without completion should be unreachable. The fixture exists to prove the
 * READERS do not infer completion from the presence of identity: if one ever
 * starts reading `protocolCellId` as evidence a day is done, this is the row
 * that catches it.
 */
export function identityWithoutCompletion(
  date: string,
  overrides: Partial<DailyLog> = {}
): DailyLog {
  const userId = overrides.userId ?? DEFAULT_USER_ID;
  return {
    id: `${userId}_${date}`,
    userId,
    date,
    protocolCellId: 'remove-limited',
    protocolFamily: 'mental' as RemoveFamily,
    ...overrides,
  } as DailyLog;
}
