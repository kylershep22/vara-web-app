// The daily-log half of what used to be weeklyCycle.service.test.ts, moved
// verbatim by journey slice 0 when dailyLogs left that service. The weekly
// cases stayed behind; nothing here asserts on weeklyCycles.
//
// The ref echoes the arguments it was built from, matching the harness in the
// sibling weekly suite.
const mockDoc = jest.fn((..._a: any[]) => ({ __ref: true, builtFrom: _a }));
const mockGetDoc = jest.fn((..._a: any[]): any => undefined);
const mockSetDoc = jest.fn((..._a: any[]): any => undefined);
const mockServerTimestamp = jest.fn(() => ({ __serverTimestamp: true }));
const mockGetDocs = jest.fn((..._a: any[]): any => undefined);
const mockCollection = jest.fn((..._a: any[]) => ({ __collection: true }));
const mockQuery = jest.fn((..._a: any[]) => ({ __query: true }));
const mockWhere = jest.fn((..._a: any[]) => ({ __where: true }));
const mockOrderBy = jest.fn((..._a: any[]) => ({ __orderBy: true }));

jest.mock('firebase/firestore', () => ({
  doc: (...a: any[]) => mockDoc(...a),
  getDoc: (...a: any[]) => mockGetDoc(...a),
  getDocs: (...a: any[]) => mockGetDocs(...a),
  setDoc: (...a: any[]) => mockSetDoc(...a),
  collection: (...a: any[]) => mockCollection(...a),
  query: (...a: any[]) => mockQuery(...a),
  where: (...a: any[]) => mockWhere(...a),
  orderBy: (...a: any[]) => mockOrderBy(...a),
  serverTimestamp: () => mockServerTimestamp(),
}));
// requireDb() reads `db` from this module, so mocking it here narrows the handle
// for the service without needing to mock ensureDb itself.
jest.mock('../../../config/firebase', () => ({
  db: { __db: true },
  firebaseError: null,
}));

import {
  dailyLogDocId,
  upsertDailyLog,
  getDailyLog,
  getDailyLogsSince,
  hasPickedToday,
} from '../dailyLog.service';
import type { DailyLog } from '../../../types/models';
import {
  completionWithProvenance,
  dailyLog,
  historicalCompletion,
  identityWithoutCompletion,
  pickedNotCompleted,
} from './dailyLogFixtures';

const absent = { exists: () => false };
const present = (data: Record<string, unknown> = {}) => ({
  exists: () => true,
  data: () => data,
});

const ALICE = 'alice123';
const WEEK = '2026-08-03';

describe('dailyLog.service', () => {
  beforeEach(() => {
    mockDoc.mockClear();
    mockGetDoc.mockReset();
    mockSetDoc.mockClear();
    mockGetDocs.mockReset();
    mockCollection.mockClear();
    mockQuery.mockClear();
    mockWhere.mockClear();
    mockOrderBy.mockClear();
  });

  describe('dailyLogDocId', () => {
    test('builds the deterministic composite id', () => {
      expect(dailyLogDocId(ALICE, WEEK)).toBe('alice123_2026-08-03');
    });

    test('matches the existing brainStateCheckIns convention', () => {
      expect(dailyLogDocId(ALICE, WEEK)).toBe(ALICE + '_' + WEEK);
    });

    test('the date component carries no underscore, so the key cannot be ambiguous', () => {
      // The org-ID invariant in miniature: an ISO date is unambiguous under a
      // '_' separator in a way a slug would not be. If the date format ever
      // gains an underscore, `${userId}_${date}` stops being parseable and this
      // goes red.
      expect(WEEK).not.toContain('_');
      expect(dailyLogDocId(ALICE, WEEK).split('_')).toHaveLength(2);
    });
  });

  describe('upsertDailyLog', () => {
    test('addresses the composite document id', async () => {
      mockGetDoc.mockResolvedValue(absent);
      await upsertDailyLog(ALICE, WEEK, { protocolCompleted: true, practiceIds: [] });
      expect(mockDoc).toHaveBeenCalledWith(
        { __db: true },
        'dailyLogs',
        'alice123_2026-08-03'
      );
    });

    test('merges rather than overwriting', async () => {
      mockGetDoc.mockResolvedValue(absent);
      await upsertDailyLog(ALICE, WEEK, { protocolCompleted: true, practiceIds: [] });
      expect(mockSetDoc.mock.calls[0][2]).toEqual({ merge: true });
    });

    test('stamps createdAt on the first write of the day', async () => {
      mockGetDoc.mockResolvedValue(absent);
      await upsertDailyLog(ALICE, WEEK, { protocolCompleted: true, practiceIds: [] });
      expect(mockSetDoc.mock.calls[0][1].createdAt).toEqual({ __serverTimestamp: true });
    });

    test('does NOT restamp createdAt on a later write the same day', async () => {
      // A blind serverTimestamp() under merge would reset the creation time on
      // every call, which is why this reads before it writes.
      mockGetDoc.mockResolvedValue(present({ userId: ALICE, date: WEEK }));
      await upsertDailyLog(ALICE, WEEK, { protocolCompleted: false, practiceIds: [] });
      const written = mockSetDoc.mock.calls[0][1];
      expect(written).not.toHaveProperty('createdAt');
      expect(written.updatedAt).toEqual({ __serverTimestamp: true });
    });

    test('writes the owner and date fields, not just the doc id', async () => {
      // The rules gate on the userId FIELD; a row with only the composite ID
      // would be unreadable by its own owner.
      mockGetDoc.mockResolvedValue(absent);
      await upsertDailyLog(ALICE, WEEK, { protocolCompleted: true, practiceIds: ['x'] });
      const written = mockSetDoc.mock.calls[0][1];
      expect(written.userId).toBe(ALICE);
      expect(written.date).toBe(WEEK);
      expect(written.practiceIds).toEqual(['x']);
    });

    test('strips owned keys a caller casts past the type', async () => {
      mockGetDoc.mockResolvedValue(present({}));
      await upsertDailyLog(ALICE, WEEK, {
        id: 'forged',
        userId: 'mallory',
        createdAt: 'forged-time',
        protocolCompleted: true,
        practiceIds: [],
      } as any);
      const written = mockSetDoc.mock.calls[0][1];
      expect(written.userId).toBe(ALICE);
      expect(written).not.toHaveProperty('id');
      expect(written).not.toHaveProperty('createdAt');
    });

    // The day's capacity read (roadmap 3b-i). It rides the SAME document as the
    // completion because they describe the same day, and it is stored as the
    // INPUT the protocol was derived from rather than as the derived protocol.
    describe("the day's capacity", () => {
      test('writes the tier through to the document', async () => {
        mockGetDoc.mockResolvedValue(absent);
        await upsertDailyLog(ALICE, WEEK, {
          protocolCompleted: false,
          practiceIds: [],
          dailyCapacity: 'slammed',
        });
        expect(mockSetDoc.mock.calls[0][1].dailyCapacity).toBe('slammed');
      });

      test('an omitted tier is not written, so merge leaves a stored one alone', async () => {
        // The two writers are independent: a completion that carries no
        // capacity must not blank the answer the day already has. `merge: true`
        // gives that for free ONLY while the key stays absent rather than being
        // written as undefined.
        mockGetDoc.mockResolvedValue(present({ userId: ALICE, date: WEEK }));
        await upsertDailyLog(ALICE, WEEK, {
          protocolCompleted: true,
          practiceIds: [],
        });
        expect(mockSetDoc.mock.calls[0][1]).not.toHaveProperty('dailyCapacity');
      });

      test('writes the time budget through to the document', async () => {
        mockGetDoc.mockResolvedValue(absent);
        await upsertDailyLog(ALICE, WEEK, {
          protocolCompleted: false,
          practiceIds: [],
          dailyCapacity: 'normal',
          dailyTimeBudget: 'short',
        });
        expect(mockSetDoc.mock.calls[0][1].dailyTimeBudget).toBe('short');
      });

      test('an omitted time budget is not written, so merge leaves a stored one alone', async () => {
        mockGetDoc.mockResolvedValue(present({ userId: ALICE, date: WEEK }));
        await upsertDailyLog(ALICE, WEEK, {
          protocolCompleted: true,
          practiceIds: [],
        });
        expect(mockSetDoc.mock.calls[0][1]).not.toHaveProperty('dailyTimeBudget');
      });

      test('stores no derived protocolId beside it', async () => {
        // The protocol is a pure function of (outcome, capacity), so a stored
        // copy would be a second answer that drifts the first time the matrix
        // content changes. The inputs are the durable fact.
        //
        // CLARIFIED IN SLICE 9.1a, AND THIS ASSERTION IS KEPT RATHER THAN
        // RETIRED. 9.1a does persist protocol identity, as `protocolCellId` +
        // `protocolFamily`, and that is an APPLICATION of the rule above
        // rather than an exception to it: the premise "can be recomputed" is
        // true for TODAY and false for a PAST DAY. `selectProtocol` needs six
        // inputs and the row stores two; the other four live on a mutable
        // journeyStates document, and `removeFamily` has no history at all.
        // For Remove, (capacity, timeClass) leaves three candidates.
        //
        // So: nothing may write a literal `protocolId` here, which is what
        // this test still guards. The general rule against storing a value
        // that IS recomputable is unchanged.
        mockGetDoc.mockResolvedValue(absent);
        await upsertDailyLog(ALICE, WEEK, {
          protocolCompleted: true,
          practiceIds: [],
          dailyCapacity: 'normal',
        });
        expect(mockSetDoc.mock.calls[0][1]).not.toHaveProperty('protocolId');
      });
    });
  });

  // hasPickedToday — the ONE definition of "the user answered for today".
  //
  // Keyed on the TIME field and nothing else. See the predicate's own comment
  // in dailyLog.service.ts for why capacity cannot serve, and for the scope of
  // the seeded-capacity window it guards against. Not restated here: a data
  // claim copied into two files is a claim that gets corrected in one.
  describe('hasPickedToday', () => {
    /** A two-line alias over the shared fixture (slice 9.1a). */
    const row = (over: Partial<DailyLog> = {}): DailyLog =>
      dailyLog(WEEK, { userId: ALICE, ...over });

    test('is false when there is no row at all', () => {
      expect(hasPickedToday(null)).toBe(false);
    });

    test('is false for a row with no inputs', () => {
      expect(hasPickedToday(row())).toBe(false);
    });

    test('is FALSE for capacity alone, which is the 3b-i seed and not an answer', () => {
      // THE CASE THIS PREDICATE EXISTS FOR. A row could carry a dailyCapacity
      // written from `capacityInitial` rather than answered, if it was written
      // in the ~7-hour window on 2026-08-11 between merges `530cfaa` and
      // `6da51cc`. Keying on capacity would read such a row as "already
      // picked" and the morning prompt would never appear for it.
      //
      // WHETHER ANY SUCH ROW EXISTS IS UNKNOWN, AND THE ASSERTION DOES NOT
      // DEPEND ON IT. It turns on whether a build shipped inside that window,
      // which is deploy state and is not inferrable from this repo; nobody has
      // checked. The predicate should behave this way regardless, and being
      // correct about a row that may not exist is the cheap direction. The
      // seed-write itself was removed in `504282a`. Rationale corrected in
      // slice 9.1a - the previous wording stated the rows' existence as fact
      // and was present-tense about a write that no longer happens.
      expect(hasPickedToday(row({ dailyCapacity: 'slammed' }))).toBe(false);
    });

    test('is true once a time budget is set, which only a confirm does', () => {
      expect(
        hasPickedToday(row({ dailyCapacity: 'normal', dailyTimeBudget: 'medium' }))
      ).toBe(true);
    });

    test('is true on a completed day that was picked', () => {
      expect(
        hasPickedToday(
          row({ protocolCompleted: true, dailyCapacity: 'normal', dailyTimeBudget: 'long' })
        )
      ).toBe(true);
    });
  });

  describe('getDailyLog', () => {
    test('addresses the composite document id', async () => {
      mockGetDoc.mockResolvedValue(absent);
      await getDailyLog(ALICE, WEEK);
      expect(mockDoc).toHaveBeenCalledWith(
        { __db: true },
        'dailyLogs',
        'alice123_2026-08-03'
      );
    });

    test('returns null when nothing was recorded that day', async () => {
      mockGetDoc.mockResolvedValue(absent);
      expect(await getDailyLog(ALICE, WEEK)).toBeNull();
    });

    test('returns the log with its composite id when present', async () => {
      mockGetDoc.mockResolvedValue(
        present({ userId: ALICE, date: WEEK, protocolCompleted: true, practiceIds: [] })
      );
      expect(await getDailyLog(ALICE, WEEK)).toEqual({
        id: 'alice123_2026-08-03',
        userId: ALICE,
        date: WEEK,
        protocolCompleted: true,
        practiceIds: [],
      });
    });
  });

  // -------------------------------------------------------------------------
  // getDailyLogsSince (journey slice 1)
  //
  // The RANGE query. Its shape is what the composite index in
  // firestore.indexes.json has to match, so these assertions are the only
  // place the two are pinned together: an equality on userId plus a range on
  // date, ordered by date. Change the query and the index goes stale silently,
  // failing at runtime and nowhere else.
  // -------------------------------------------------------------------------
  describe('getDailyLogsSince', () => {
    test('addresses the dailyLogs collection', async () => {
      mockGetDocs.mockResolvedValue({ docs: [] });
      await getDailyLogsSince(ALICE, WEEK);
      expect(mockCollection).toHaveBeenCalledWith({ __db: true }, 'dailyLogs');
    });

    test('filters on userId equality AND a date range, ordered by date', async () => {
      mockGetDocs.mockResolvedValue({ docs: [] });
      await getDailyLogsSince(ALICE, WEEK);
      expect(mockWhere).toHaveBeenCalledWith('userId', '==', ALICE);
      expect(mockWhere).toHaveBeenCalledWith('date', '>=', WEEK);
      expect(mockOrderBy).toHaveBeenCalledWith('date', 'asc');
    });

    test('returns [] when the user has no logs in range', async () => {
      mockGetDocs.mockResolvedValue({ docs: [] });
      expect(await getDailyLogsSince(ALICE, WEEK)).toEqual([]);
    });

    test('carries the document id onto every row', async () => {
      mockGetDocs.mockResolvedValue({
        docs: [
          { id: 'alice123_2026-08-03', data: () => ({ userId: ALICE, date: WEEK }) },
          {
            id: 'alice123_2026-08-04',
            data: () => ({ userId: ALICE, date: '2026-08-04' }),
          },
        ],
      });
      const rows = await getDailyLogsSince(ALICE, WEEK);
      expect(rows.map((r) => r.id)).toEqual([
        'alice123_2026-08-03',
        'alice123_2026-08-04',
      ]);
    });
  });

  // =========================================================================
  // COMPLETION PROVENANCE (slice 9.1a)
  //
  // Four fields, written TOGETHER and only by the write that establishes the
  // completion. The rule lives in `upsertDailyLog` as `stampProvenance` and
  // has three clauses; each gets its own case below, and each case asserts on
  // ALL FOUR FIELDS rather than on the timestamp alone.
  //
  // WHICH CLAUSE DOES THE WORK, so neither gets tidied away:
  //   (c) is load-bearing today - it is the historical-row protection.
  //   (b) is unreachable through the app, because `completedAt` is off
  //       `DailyLogInput` and `stripOwnedKeys` removes it. It covers a console
  //       or Admin SDK write and any future second writer.
  // A reader who observes that (b) alone passes must NOT conclude (c) is
  // redundant. They catch different writes.
  // =========================================================================
  describe('completion provenance', () => {
    const PROVENANCE = {
      completionSource: 'user_declared',
      protocolCellId: 'remove-normal',
      protocolFamily: 'behavioral',
    } as const;

    const completionPatch = () => ({
      protocolCompleted: true,
      practiceIds: [],
      ...PROVENANCE,
    });

    describe('clause (a) - the patch must assert completion', () => {
      test('a fresh completion stamps all four fields', async () => {
        mockGetDoc.mockResolvedValue(absent);
        await upsertDailyLog(ALICE, WEEK, completionPatch());

        const written = mockSetDoc.mock.calls[0][1];
        expect(written.completedAt).toEqual({ __serverTimestamp: true });
        expect(written.completionSource).toBe('user_declared');
        expect(written.protocolCellId).toBe('remove-normal');
        expect(written.protocolFamily).toBe('behavioral');
      });

      test('a completion onto an EXISTING incomplete row still stamps', async () => {
        // The ordinary case in production: the picker wrote the row this
        // morning, the user completes this evening. The document exists and
        // the day was not complete, so this write IS the establishing one.
        mockGetDoc.mockResolvedValue(
          present({
            userId: ALICE,
            date: WEEK,
            dailyCapacity: 'normal',
            dailyTimeBudget: 'short',
          })
        );
        await upsertDailyLog(ALICE, WEEK, completionPatch());

        const written = mockSetDoc.mock.calls[0][1];
        expect(written.completedAt).toEqual({ __serverTimestamp: true });
        expect(written.completionSource).toBe('user_declared');
        expect(written.protocolCellId).toBe('remove-normal');
        expect(written.protocolFamily).toBe('behavioral');
      });

      test('a PICK writes no provenance, even if a caller supplies some', async () => {
        // The picker confirm carries no completion, so it cannot establish
        // one. A caller that sends identity anyway has it dropped.
        mockGetDoc.mockResolvedValue(absent);
        await upsertDailyLog(ALICE, WEEK, {
          dailyCapacity: 'normal',
          dailyTimeBudget: 'short',
          ...PROVENANCE,
        });

        const written = mockSetDoc.mock.calls[0][1];
        expect(written).not.toHaveProperty('completedAt');
        expect(written).not.toHaveProperty('completionSource');
        expect(written).not.toHaveProperty('protocolCellId');
        expect(written).not.toHaveProperty('protocolFamily');
        // The pick itself is untouched by the drop.
        expect(written.dailyCapacity).toBe('normal');
        expect(written.dailyTimeBudget).toBe('short');
      });

      test('protocolCompleted false is not a completion', async () => {
        mockGetDoc.mockResolvedValue(absent);
        await upsertDailyLog(ALICE, WEEK, {
          protocolCompleted: false,
          practiceIds: [],
          ...PROVENANCE,
        });

        const written = mockSetDoc.mock.calls[0][1];
        expect(written).not.toHaveProperty('completedAt');
        expect(written).not.toHaveProperty('completionSource');
        expect(written).not.toHaveProperty('protocolCellId');
        expect(written).not.toHaveProperty('protocolFamily');
      });
    });

    describe('clause (b) - provenance is never re-stamped', () => {
      test('a stored completedAt blocks all four, even if the flag is re-sent', async () => {
        // Unreachable through the app today. It covers a console or Admin SDK
        // write, and any writer a later slice adds. Do not delete this on the
        // grounds that nothing can produce the state: that is the point.
        mockGetDoc.mockResolvedValue(
          present({
            userId: ALICE,
            date: WEEK,
            completedAt: { __alreadyStamped: true },
          })
        );
        await upsertDailyLog(ALICE, WEEK, completionPatch());

        const written = mockSetDoc.mock.calls[0][1];
        expect(written).not.toHaveProperty('completedAt');
        expect(written).not.toHaveProperty('completionSource');
        expect(written).not.toHaveProperty('protocolCellId');
        expect(written).not.toHaveProperty('protocolFamily');
      });

      test('the rest of the patch still lands when provenance is blocked', async () => {
        // Blocking provenance must not turn into blocking the write. The
        // day inputs are a different fact and go through as always.
        mockGetDoc.mockResolvedValue(
          present({
            userId: ALICE,
            date: WEEK,
            completedAt: { __alreadyStamped: true },
          })
        );
        await upsertDailyLog(ALICE, WEEK, {
          ...completionPatch(),
          dailyCapacity: 'slammed',
        });

        const written = mockSetDoc.mock.calls[0][1];
        expect(written.protocolCompleted).toBe(true);
        expect(written.dailyCapacity).toBe('slammed');
        expect(written.updatedAt).toEqual({ __serverTimestamp: true });
      });
    });

    describe('clause (c) - an ALREADY-COMPLETE day is never re-attributed', () => {
      test('THE HISTORICAL-ROW PROTECTION: a pre-9.1a completed row gains nothing', async () => {
        // THE MOST IMPORTANT ASSERTION IN THIS SLICE.
        //
        // A row completed before 9.1a carries `protocolCompleted: true` and no
        // provenance whatsoever. A later write of `protocolCompleted: true` -
        // from a second surface, a retry, a future caller - must not stamp
        // TODAY timestamp, source and protocol onto a completion that happened
        // weeks ago, under a phase, capacity and family the user may since
        // have changed. The fabricated record would be indistinguishable from
        // a real one, and the row cannot be repaired afterwards.
        //
        // markDone early return means this does not happen today. That is one
        // caller at one moment, not a structural guarantee, and 9.1b adds a
        // surface that can sit open across a change. This clause is the
        // structural guarantee.
        mockGetDoc.mockResolvedValue(
          present({
            userId: ALICE,
            date: WEEK,
            protocolCompleted: true,
            practiceIds: [],
          })
        );
        await upsertDailyLog(ALICE, WEEK, completionPatch());

        const written = mockSetDoc.mock.calls[0][1];
        expect(written).not.toHaveProperty('completedAt');
        expect(written).not.toHaveProperty('completionSource');
        expect(written).not.toHaveProperty('protocolCellId');
        expect(written).not.toHaveProperty('protocolFamily');
      });

      test('a row already complete WITH provenance keeps its original', async () => {
        // The same protection one day later: the row was completed by 9.1a, so
        // both (b) and (c) hold. Nothing is overwritten. Merge leaves the
        // stored values alone precisely because the keys are absent from the
        // patch rather than present with new values.
        mockGetDoc.mockResolvedValue(
          present({
            userId: ALICE,
            date: WEEK,
            protocolCompleted: true,
            completedAt: { __original: true },
            completionSource: 'user_declared',
            protocolCellId: 'remove-slammed',
            protocolFamily: 'interpersonal',
          })
        );
        await upsertDailyLog(ALICE, WEEK, {
          ...completionPatch(),
          protocolCellId: 'remove-normal',
        });

        const written = mockSetDoc.mock.calls[0][1];
        expect(written).not.toHaveProperty('completedAt');
        expect(written).not.toHaveProperty('protocolCellId');
        expect(written).not.toHaveProperty('protocolFamily');
      });

      test('an unrelated later write does not disturb a stored completedAt', async () => {
        // The second-write case the device walk also checks. A capacity write
        // landing on a completed day must leave the timestamp exactly as it
        // was, which merge gives only while the key stays out of the patch.
        mockGetDoc.mockResolvedValue(
          present({
            userId: ALICE,
            date: WEEK,
            protocolCompleted: true,
            completedAt: { __original: true },
          })
        );
        await upsertDailyLog(ALICE, WEEK, { dailyCapacity: 'limited' });

        const written = mockSetDoc.mock.calls[0][1];
        expect(written).not.toHaveProperty('completedAt');
        expect(written.dailyCapacity).toBe('limited');
      });
    });

    describe('completedAt is service-owned', () => {
      test('a forged completedAt is stripped even on an establishing write', async () => {
        // `completedAt` is not on `DailyLogInput`, so this needs a cast; the
        // strip makes the guarantee unconditional rather than dependent on
        // nobody casting past the type.
        mockGetDoc.mockResolvedValue(absent);
        await upsertDailyLog(ALICE, WEEK, {
          ...completionPatch(),
          completedAt: 'forged-time',
        } as any);

        const written = mockSetDoc.mock.calls[0][1];
        expect(written.completedAt).toEqual({ __serverTimestamp: true });
      });

      test('a forged completedAt is stripped on a NON-establishing write too', async () => {
        mockGetDoc.mockResolvedValue(
          present({ userId: ALICE, date: WEEK, protocolCompleted: true })
        );
        await upsertDailyLog(ALICE, WEEK, {
          ...completionPatch(),
          completedAt: 'forged-time',
        } as any);

        expect(mockSetDoc.mock.calls[0][1]).not.toHaveProperty('completedAt');
      });
    });

    describe('identity is optional and an absent one is valid', () => {
      test('a completion with NO identity still stamps time and source', async () => {
        // The load-failure path: the card has no resolved protocol, so it
        // sends none. A completion with unknown identity is a valid row, not
        // a degraded one.
        mockGetDoc.mockResolvedValue(absent);
        await upsertDailyLog(ALICE, WEEK, {
          protocolCompleted: true,
          practiceIds: [],
          completionSource: 'user_declared',
        });

        const written = mockSetDoc.mock.calls[0][1];
        expect(written.completedAt).toEqual({ __serverTimestamp: true });
        expect(written.completionSource).toBe('user_declared');
        expect(written).not.toHaveProperty('protocolCellId');
        expect(written).not.toHaveProperty('protocolFamily');
      });

      test('a cell id with no family lands, which is Recover and Refocus', async () => {
        mockGetDoc.mockResolvedValue(absent);
        await upsertDailyLog(ALICE, WEEK, {
          protocolCompleted: true,
          practiceIds: [],
          completionSource: 'user_declared',
          protocolCellId: 'refocus-normal',
        });

        const written = mockSetDoc.mock.calls[0][1];
        expect(written.protocolCellId).toBe('refocus-normal');
        expect(written).not.toHaveProperty('protocolFamily');
      });
    });
  });

  // THE HISTORICAL-READ CONTRACT, at the predicate (slice 9.1a).
  //
  // `hasPickedToday` keys on the time field and must stay indifferent to
  // everything 9.1a added. Tested here because this is where the real
  // predicate runs - `useTodayCard.dailyCapacity.test.ts` deliberately
  // requireActual's it so that suite cannot drift from this one definition.
  describe('hasPickedToday - the historical-read contract (9.1a)', () => {
    test('a legacy completed row with no provenance is NOT picked', () => {
      // Completion has never implied a pick. A pre-9.1a completed row carries
      // no time budget, so the morning prompt is still owed to that day.
      expect(hasPickedToday(historicalCompletion(WEEK, { userId: ALICE }))).toBe(false);
    });

    test('a row with no completion key at all IS picked, when it has a time budget', () => {
      // Sub-shape 3a. Absence of the completion key says nothing about
      // whether the day was answered.
      const picked = pickedNotCompleted(WEEK, { userId: ALICE });
      expect(picked.protocolCompleted).toBeUndefined();
      expect(hasPickedToday(picked)).toBe(true);
    });

    test('provenance does not make a day picked', () => {
      // A completed row with full provenance and no time budget is still
      // unanswered. If this ever goes green the other way, the predicate has
      // acquired a second key.
      expect(hasPickedToday(completionWithProvenance(WEEK, { userId: ALICE }))).toBe(false);
    });

    test('identity alone does not make a day picked', () => {
      expect(hasPickedToday(identityWithoutCompletion(WEEK, { userId: ALICE }))).toBe(false);
    });

    test('the base fixture still produces the pre-9.1a default shape', () => {
      // The migration own guard. Five suites now share one definition of "a
      // DailyLog", and the base must keep emitting exactly what their five
      // local builders emitted, or the migration silently changed what every
      // existing assertion is asserting against.
      expect(dailyLog(WEEK, { userId: ALICE })).toEqual({
        id: `${ALICE}_${WEEK}`,
        userId: ALICE,
        date: WEEK,
        protocolCompleted: false,
        practiceIds: [],
      });
    });
  });

});
