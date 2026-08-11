// The ref echoes the arguments it was built from. Nothing asserts on its
// shape, and carrying the path is what lets the batched re-set tests below tell
// the event ref apart from the cycle ref: both are refs, and without the echo a
// payload written to the wrong one would still match.
const mockDoc = jest.fn((..._a: any[]) => ({ __ref: true, builtFrom: _a }));
const mockGetDoc = jest.fn((..._a: any[]): any => undefined);
const mockGetDocs = jest.fn((..._a: any[]): any => undefined);
const mockCollection = jest.fn((..._a: any[]) => ({ __collection: true }));
const mockQuery = jest.fn((..._a: any[]) => ({ __query: true }));
const mockWhere = jest.fn((..._a: any[]) => ({ __where: true }));
const mockOrderBy = jest.fn((..._a: any[]) => ({ __orderBy: true }));
const mockLimit = jest.fn((..._a: any[]) => ({ __limit: true }));
const mockAddDoc = jest.fn((..._a: any[]): any => ({ id: 'new-id' }));
const mockSetDoc = jest.fn((..._a: any[]): any => undefined);
const mockUpdateDoc = jest.fn((..._a: any[]): any => undefined);
const mockServerTimestamp = jest.fn(() => ({ __serverTimestamp: true }));
const mockBatchSet = jest.fn((..._a: any[]) => undefined);
const mockBatchUpdate = jest.fn((..._a: any[]) => undefined);
const mockBatchCommit = jest.fn((): any => Promise.resolve());
const mockWriteBatch = jest.fn((..._a: any[]) => ({
  set: (...a: any[]) => mockBatchSet(...a),
  update: (...a: any[]) => mockBatchUpdate(...a),
  commit: () => mockBatchCommit(),
}));

jest.mock('firebase/firestore', () => ({
  doc: (...a: any[]) => mockDoc(...a),
  getDoc: (...a: any[]) => mockGetDoc(...a),
  getDocs: (...a: any[]) => mockGetDocs(...a),
  collection: (...a: any[]) => mockCollection(...a),
  query: (...a: any[]) => mockQuery(...a),
  where: (...a: any[]) => mockWhere(...a),
  orderBy: (...a: any[]) => mockOrderBy(...a),
  limit: (...a: any[]) => mockLimit(...a),
  addDoc: (...a: any[]) => mockAddDoc(...a),
  setDoc: (...a: any[]) => mockSetDoc(...a),
  updateDoc: (...a: any[]) => mockUpdateDoc(...a),
  serverTimestamp: () => mockServerTimestamp(),
  writeBatch: (...a: any[]) => mockWriteBatch(...a),
}));
// requireDb() reads `db` from this module, so mocking it here narrows the handle
// for the service without needing to mock ensureDb itself.
jest.mock('../../../config/firebase', () => ({
  db: { __db: true },
  firebaseError: null,
}));

import {
  dailyLogDocId,
  countWeeklyCyclesForOutcome,
  createWeeklyCycle,
  getLatestWeeklyCycle,
  getWeeklyCyclesForUser,
  getWeeklyCycleForWeek,
  getRecentWeeklyCycles,
  updateWeeklyCycle,
  closeWeeklyCycle,
  upsertDailyLog,
  getDailyLog,
  hasPickedToday,
  createDownshiftEvent,
  getDownshiftEventsForCycle,
} from '../weeklyCycle.service';
import type { DailyLog } from '../../../types/models';

const absent = { exists: () => false };
const present = (data: Record<string, unknown> = {}) => ({
  exists: () => true,
  data: () => data,
});
const docsSnap = (docs: { id: string; data: Record<string, unknown> }[]) => ({
  docs: docs.map((d) => ({ id: d.id, data: () => d.data })),
});

const ALICE = 'alice123';
const WEEK = '2026-08-03';
/** The week's inclusive last day. Stored on the cycle, never re-derived. */
const WEEK_END = '2026-08-09';

describe('weeklyCycle.service', () => {
  beforeEach(() => {
    mockDoc.mockClear();
    mockGetDoc.mockReset();
    mockGetDocs.mockReset();
    mockCollection.mockClear();
    mockQuery.mockClear();
    mockWhere.mockClear();
    mockOrderBy.mockClear();
    mockLimit.mockClear();
    mockAddDoc.mockClear();
    mockSetDoc.mockClear();
    mockUpdateDoc.mockClear();
    mockWriteBatch.mockClear();
    mockBatchSet.mockClear();
    mockBatchUpdate.mockClear();
    mockBatchCommit.mockReset();
    mockBatchCommit.mockResolvedValue(undefined);
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

  describe('createWeeklyCycle', () => {
    test('addresses the weeklyCycles collection', async () => {
      await createWeeklyCycle(ALICE, {
        weekStart: WEEK,
        weekEnd: WEEK_END,
        outcome: 'focus',
        capacityInitial: 'normal',
        protocolId: 'focus-normal',
      });
      expect(mockCollection).toHaveBeenCalledWith({ __db: true }, 'weeklyCycles');
    });

    test('initializes capacityCurrent to capacityInitial', async () => {
      await createWeeklyCycle(ALICE, {
        weekStart: WEEK,
        weekEnd: WEEK_END,
        outcome: 'stress',
        capacityInitial: 'limited',
        protocolId: 'stress-limited',
      });
      const written = mockAddDoc.mock.calls[0][1];
      expect(written.capacityInitial).toBe('limited');
      expect(written.capacityCurrent).toBe('limited');
    });

    test('stamps the owner and both timestamps', async () => {
      await createWeeklyCycle(ALICE, {
        weekStart: WEEK,
        weekEnd: WEEK_END,
        outcome: 'focus',
        capacityInitial: 'normal',
        protocolId: 'focus-normal',
      });
      const written = mockAddDoc.mock.calls[0][1];
      expect(written.userId).toBe(ALICE);
      expect(written.createdAt).toEqual({ __serverTimestamp: true });
      expect(written.updatedAt).toEqual({ __serverTimestamp: true });
    });

    test('persists the week boundary, so nothing has to re-derive it', async () => {
      // The whole point of storing weekEnd: a cycle is not always seven days
      // (the first one is a partial stub), and a boundary re-derived at read
      // time would move under a user who later changes their start day.
      await createWeeklyCycle(ALICE, {
        weekStart: WEEK,
        weekEnd: '2026-08-05',
        outcome: 'focus',
        capacityInitial: 'normal',
        protocolId: 'focus-normal',
      });
      const written = mockAddDoc.mock.calls[0][1];
      expect(written.weekStart).toBe(WEEK);
      // A stub, deliberately shorter than a week — a hardcoded weekStart + 6
      // anywhere in the write path fails here.
      expect(written.weekEnd).toBe('2026-08-05');
    });

    test('returns the new document id', async () => {
      expect(
        await createWeeklyCycle(ALICE, {
          weekStart: WEEK,
          weekEnd: WEEK_END,
          outcome: 'focus',
          capacityInitial: 'normal',
          protocolId: 'focus-normal',
        })
      ).toBe('new-id');
    });
  });

  describe('getWeeklyCycleForWeek', () => {
    test('filters on both userId and weekStart', async () => {
      mockGetDocs.mockResolvedValue(docsSnap([]));
      await getWeeklyCycleForWeek(ALICE, WEEK);
      expect(mockWhere).toHaveBeenCalledWith('userId', '==', ALICE);
      expect(mockWhere).toHaveBeenCalledWith('weekStart', '==', WEEK);
    });

    test('returns null when the week has not been opened', async () => {
      mockGetDocs.mockResolvedValue(docsSnap([]));
      expect(await getWeeklyCycleForWeek(ALICE, WEEK)).toBeNull();
    });

    test('returns the cycle with its document id when present', async () => {
      mockGetDocs.mockResolvedValue(
        docsSnap([{ id: 'cycle1', data: { userId: ALICE, weekStart: WEEK } }])
      );
      expect(await getWeeklyCycleForWeek(ALICE, WEEK)).toEqual({
        id: 'cycle1',
        userId: ALICE,
        weekStart: WEEK,
      });
    });
  });

  describe('getWeeklyCyclesForUser', () => {
    test('filters on userId only, so no composite index is needed', async () => {
      // The moment an orderBy joins this query it needs an index that
      // firestore.indexes.json does not contain. Equality-only is the point.
      mockGetDocs.mockResolvedValue(docsSnap([]));
      await getWeeklyCyclesForUser(ALICE);
      expect(mockWhere).toHaveBeenCalledWith('userId', '==', ALICE);
      expect(mockOrderBy).not.toHaveBeenCalled();
      expect(mockLimit).not.toHaveBeenCalled();
    });

    test('returns [] when the user has no cycles', async () => {
      mockGetDocs.mockResolvedValue(docsSnap([]));
      expect(await getWeeklyCyclesForUser(ALICE)).toEqual([]);
    });

    test('carries the document id onto every row', async () => {
      mockGetDocs.mockResolvedValue(
        docsSnap([
          { id: 'c1', data: { weekStart: '2026-08-03' } },
          { id: 'c2', data: { weekStart: '2026-08-10' } },
        ])
      );
      expect((await getWeeklyCyclesForUser(ALICE)).map((c) => c.id)).toEqual(['c1', 'c2']);
    });
  });

  describe('getLatestWeeklyCycle', () => {
    test('returns null when the user has never opened a week', async () => {
      // The normal state for a new user, not an error: the entry guard routes
      // on exactly this.
      mockGetDocs.mockResolvedValue(docsSnap([]));
      expect(await getLatestWeeklyCycle(ALICE)).toBeNull();
    });

    test('picks the greatest weekStart regardless of document order', async () => {
      mockGetDocs.mockResolvedValue(
        docsSnap([
          { id: 'c1', data: { weekStart: '2026-07-20' } },
          { id: 'c3', data: { weekStart: '2026-08-03' } },
          { id: 'c2', data: { weekStart: '2026-07-27' } },
        ])
      );
      expect((await getLatestWeeklyCycle(ALICE))?.id).toBe('c3');
    });

    test('compares dates correctly across a month boundary', async () => {
      // ISO YYYY-MM-DD sorts lexicographically as it sorts chronologically,
      // which is the property the in-memory comparison leans on.
      mockGetDocs.mockResolvedValue(
        docsSnap([
          { id: 'sep', data: { weekStart: '2026-09-01' } },
          { id: 'aug', data: { weekStart: '2026-08-31' } },
        ])
      );
      expect((await getLatestWeeklyCycle(ALICE))?.id).toBe('sep');
    });

    test('returns the only cycle when there is one', async () => {
      mockGetDocs.mockResolvedValue(docsSnap([{ id: 'c1', data: { weekStart: WEEK } }]));
      expect((await getLatestWeeklyCycle(ALICE))?.weekStart).toBe(WEEK);
    });
  });

  describe('countWeeklyCyclesForOutcome', () => {
    test('filters on userId AND outcome, both equality, no index required', async () => {
      mockGetDocs.mockResolvedValue({ ...docsSnap([]), size: 0 });
      await countWeeklyCyclesForOutcome(ALICE, 'focus');
      expect(mockWhere).toHaveBeenCalledWith('userId', '==', ALICE);
      expect(mockWhere).toHaveBeenCalledWith('outcome', '==', 'focus');
      expect(mockOrderBy).not.toHaveBeenCalled();
    });

    test('is zero for an outcome the user has never run', async () => {
      mockGetDocs.mockResolvedValue({ ...docsSnap([]), size: 0 });
      expect(await countWeeklyCyclesForOutcome(ALICE, 'routines')).toBe(0);
    });

    test('counts the stored cycles for that outcome', async () => {
      mockGetDocs.mockResolvedValue({ ...docsSnap([]), size: 3 });
      expect(await countWeeklyCyclesForOutcome(ALICE, 'focus')).toBe(3);
    });
  });

  describe('getRecentWeeklyCycles', () => {
    test('orders by weekStart descending and applies the limit', async () => {
      mockGetDocs.mockResolvedValue(docsSnap([]));
      await getRecentWeeklyCycles(ALICE, 4);
      expect(mockOrderBy).toHaveBeenCalledWith('weekStart', 'desc');
      expect(mockLimit).toHaveBeenCalledWith(4);
    });

    test('returns [] when the user has no history', async () => {
      mockGetDocs.mockResolvedValue(docsSnap([]));
      expect(await getRecentWeeklyCycles(ALICE, 4)).toEqual([]);
    });

    test('maps every row, carrying the document id', async () => {
      mockGetDocs.mockResolvedValue(
        docsSnap([
          { id: 'c2', data: { weekStart: '2026-08-10' } },
          { id: 'c1', data: { weekStart: '2026-08-03' } },
        ])
      );
      const result = await getRecentWeeklyCycles(ALICE, 4);
      expect(result.map((c) => c.id)).toEqual(['c2', 'c1']);
    });
  });

  describe('updateWeeklyCycle', () => {
    test('addresses weeklyCycles/{cycleId}', async () => {
      await updateWeeklyCycle('cycle1', { capacityCurrent: 'slammed' });
      expect(mockDoc).toHaveBeenCalledWith({ __db: true }, 'weeklyCycles', 'cycle1');
    });

    test('writes the patch and refreshes updatedAt', async () => {
      await updateWeeklyCycle('cycle1', { capacityCurrent: 'slammed' });
      const written = mockUpdateDoc.mock.calls[0][1];
      expect(written.capacityCurrent).toBe('slammed');
      expect(written.updatedAt).toEqual({ __serverTimestamp: true });
    });

    test('strips owned keys a caller casts past the type', async () => {
      // The slice-1 lesson: spread order alone does not protect these on an
      // UPDATE path, because the service supplies no createdAt to win the
      // collision. The keys have to be removed.
      await updateWeeklyCycle('cycle1', {
        id: 'forged',
        userId: 'mallory',
        createdAt: 'forged-time',
        capacityCurrent: 'slammed',
      } as any);
      const written = mockUpdateDoc.mock.calls[0][1];
      expect(written).not.toHaveProperty('id');
      expect(written).not.toHaveProperty('userId');
      expect(written).not.toHaveProperty('createdAt');
      expect(written.capacityCurrent).toBe('slammed');
    });
  });

  // -------------------------------------------------------------------------
  // closeWeeklyCycle — the weekly close (spec 8)
  // -------------------------------------------------------------------------

  describe('closeWeeklyCycle', () => {
    const closeInput = (over: Record<string, unknown> = {}) => ({
      ratingFocus: 4,
      ratingRecovery: 2,
      ratingEnergy: 3,
      closeNote: 'the days it slipped were the late ones',
      adjustmentSelected: 'smaller-daily-action',
      floorMet: true,
      ...over,
    });

    describe('the write itself', () => {
      test('addresses weeklyCycles/{cycleId}', async () => {
        await closeWeeklyCycle('cycle1', closeInput());

        expect(mockDoc).toHaveBeenCalledWith({ __db: true }, 'weeklyCycles', 'cycle1');
      });

      test('is ONE updateDoc on ONE document, with no batch and no second collection', async () => {
        // The close captures five answers, and all five live on the cycle. A
        // batch here would be ceremony; a second collection would mean the
        // close could half-land, which is exactly what one document rules out.
        await closeWeeklyCycle('cycle1', closeInput());

        expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
        expect(mockWriteBatch).not.toHaveBeenCalled();
        expect(mockAddDoc).not.toHaveBeenCalled();
        expect(mockSetDoc).not.toHaveBeenCalled();
      });

      test('writes the three ratings and the chosen adjustment', async () => {
        await closeWeeklyCycle('cycle1', closeInput());

        expect(mockUpdateDoc.mock.calls[0][1]).toMatchObject({
          ratingFocus: 4,
          ratingRecovery: 2,
          ratingEnergy: 3,
          adjustmentSelected: 'smaller-daily-action',
        });
      });

      test('stores the adjustment ID, which a copy rewrite cannot move', async () => {
        // adjustmentSelected holds the stable option id, never the label. The
        // labels are placeholders Jen replaces; storing one would orphan every
        // row written before the rewrite.
        await closeWeeklyCycle('cycle1', closeInput({ adjustmentSelected: 'different-time' }));

        expect(mockUpdateDoc.mock.calls[0][1].adjustmentSelected).toBe('different-time');
      });

      test('rejects when the write fails, leaving the week unchanged', async () => {
        mockUpdateDoc.mockRejectedValueOnce(new Error('permission denied'));

        await expect(closeWeeklyCycle('cycle1', closeInput())).rejects.toThrow(
          'permission denied'
        );
      });
    });

    describe('closeCompletedAt is stamped, never supplied', () => {
      test('is a server timestamp', async () => {
        await closeWeeklyCycle('cycle1', closeInput());

        expect(mockUpdateDoc.mock.calls[0][1].closeCompletedAt).toEqual({
          __serverTimestamp: true,
        });
      });

      test('refreshes updatedAt alongside it', async () => {
        await closeWeeklyCycle('cycle1', closeInput());

        expect(mockUpdateDoc.mock.calls[0][1].updatedAt).toEqual({
          __serverTimestamp: true,
        });
      });

      test('ignores a closeCompletedAt a caller casts past the type', async () => {
        // The field is typed `Timestamp`, so supplying serverTimestamp() needs a
        // cast. If one is ever written, the SERVER clock still decides when the
        // week closed: the fields are listed one by one, not spread.
        await closeWeeklyCycle('cycle1', closeInput({
          closeCompletedAt: 'last tuesday',
        }) as any);

        expect(mockUpdateDoc.mock.calls[0][1].closeCompletedAt).toEqual({
          __serverTimestamp: true,
        });
      });
    });

    describe('floorMet (open item #10, self-reported)', () => {
      test('records a met floor', async () => {
        await closeWeeklyCycle('cycle1', closeInput({ floorMet: true }));

        expect(mockUpdateDoc.mock.calls[0][1].floorMet).toBe(true);
      });

      test('records a missed floor as false, not as an omission', async () => {
        // A missed week has to be STORED as false. Omitting it would be
        // indistinguishable from a week that was never closed, and continuity
        // would then treat "I did not hold it" and "I never answered" the same
        // way by accident rather than by decision.
        await closeWeeklyCycle('cycle1', closeInput({ floorMet: false }));

        const written = mockUpdateDoc.mock.calls[0][1];
        expect(written.floorMet).toBe(false);
        expect(written).toHaveProperty('floorMet');
      });

      test('carries no capacity tier alongside it', async () => {
        // Continuity is judged against the floor and never against the tier.
        // The moment a tier rides along on this write, that invariant stops
        // holding at the storage layer.
        await closeWeeklyCycle('cycle1', closeInput());

        const written = mockUpdateDoc.mock.calls[0][1];
        expect(written).not.toHaveProperty('capacityCurrent');
        expect(written).not.toHaveProperty('capacityInitial');
      });
    });

    describe('the free-text note is skippable', () => {
      test('is written when the user answered', async () => {
        await closeWeeklyCycle('cycle1', closeInput({ closeNote: 'mornings held, evenings did not' }));

        expect(mockUpdateDoc.mock.calls[0][1].closeNote).toBe(
          'mornings held, evenings did not'
        );
      });

      test('is trimmed', async () => {
        await closeWeeklyCycle('cycle1', closeInput({ closeNote: '  travel week  ' }));

        expect(mockUpdateDoc.mock.calls[0][1].closeNote).toBe('travel week');
      });

      test('is ABSENT rather than empty when skipped', async () => {
        // "They skipped it" and "they answered and said nothing" are different
        // facts. An '' would record the second one for every skip.
        await closeWeeklyCycle('cycle1', closeInput({ closeNote: undefined }));

        expect(mockUpdateDoc.mock.calls[0][1]).not.toHaveProperty('closeNote');
      });

      test('is ABSENT when the user typed only whitespace', async () => {
        await closeWeeklyCycle('cycle1', closeInput({ closeNote: '   ' }));

        expect(mockUpdateDoc.mock.calls[0][1]).not.toHaveProperty('closeNote');
      });

      test('the rest of the close still lands when the note is skipped', async () => {
        await closeWeeklyCycle('cycle1', closeInput({ closeNote: undefined }));

        expect(mockUpdateDoc.mock.calls[0][1]).toMatchObject({
          ratingFocus: 4,
          floorMet: true,
          adjustmentSelected: 'smaller-daily-action',
        });
      });
    });

    describe('the close records how the week went, never what the week was', () => {
      test('writes exactly the close fields and the two stamps, and nothing else', async () => {
        // Tighter than the negatives below: a field added to this payload has
        // to be a deliberate change to this test rather than a silent widening
        // of what the close is allowed to overwrite.
        await closeWeeklyCycle('cycle1', closeInput());

        expect(Object.keys(mockUpdateDoc.mock.calls[0][1]).sort()).toEqual([
          'adjustmentSelected',
          'closeCompletedAt',
          'closeNote',
          'floorMet',
          'ratingEnergy',
          'ratingFocus',
          'ratingRecovery',
          'updatedAt',
        ]);
      });

      test('never writes the tier, the outcome or the protocol, even when cast in', async () => {
        // capacityInitial is the weekly forecast and the gap between it and
        // capacityCurrent is the S7 instrumentation. The close reports on the
        // week; it does not get to rewrite what the week was.
        await closeWeeklyCycle('cycle1', closeInput({
          capacityInitial: 'slammed',
          capacityCurrent: 'slammed',
          outcome: 'stress',
          protocolId: 'stress-slammed',
        }) as any);

        const written = mockUpdateDoc.mock.calls[0][1];
        expect(written).not.toHaveProperty('capacityInitial');
        expect(written).not.toHaveProperty('capacityCurrent');
        expect(written).not.toHaveProperty('outcome');
        expect(written).not.toHaveProperty('protocolId');
      });

      test('never writes identity or creation time, even when cast in', async () => {
        await closeWeeklyCycle('cycle1', closeInput({
          id: 'forged',
          userId: 'mallory',
          createdAt: 'forged-time',
        }) as any);

        const written = mockUpdateDoc.mock.calls[0][1];
        expect(written).not.toHaveProperty('id');
        expect(written).not.toHaveProperty('userId');
        expect(written).not.toHaveProperty('createdAt');
      });

      test('stores no computed continuity, which is derived and never persisted', async () => {
        await closeWeeklyCycle('cycle1', closeInput({ continuity: 7 }) as any);

        expect(mockUpdateDoc.mock.calls[0][1]).not.toHaveProperty('continuity');
      });
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
  // for why capacity cannot serve: 3b-i's markDone writes a SEEDED capacity, so
  // every day completed since then carries one the user never chose.
  describe('hasPickedToday', () => {
    const row = (over: Partial<DailyLog> = {}): DailyLog =>
      ({
        id: `${ALICE}_${WEEK}`,
        userId: ALICE,
        date: WEEK,
        protocolCompleted: false,
        practiceIds: [],
        ...over,
      }) as DailyLog;

    test('is false when there is no row at all', () => {
      expect(hasPickedToday(null)).toBe(false);
    });

    test('is false for a row with no inputs', () => {
      expect(hasPickedToday(row())).toBe(false);
    });

    test('is FALSE for capacity alone, which is the 3b-i seed and not an answer', () => {
      // THE CASE THIS PREDICATE EXISTS FOR. Every day completed between 3b-i
      // and the picker has a dailyCapacity written from capacityInitial. Keying
      // on capacity would read all of those as "already picked" and the morning
      // prompt would never appear for them.
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

  describe('createDownshiftEvent', () => {
    test('addresses the downshiftEvents collection', async () => {
      await createDownshiftEvent(ALICE, {
        weeklyCycleId: 'cycle1',
        fromCapacity: 'normal',
        toCapacity: 'slammed',
      });
      expect(mockCollection).toHaveBeenCalledWith({ __db: true }, 'downshiftEvents');
    });

    test('records the owner, the cycle, both tiers and a timestamp', async () => {
      await createDownshiftEvent(ALICE, {
        weeklyCycleId: 'cycle1',
        fromCapacity: 'normal',
        toCapacity: 'slammed',
      });
      const written = mockAddDoc.mock.calls[0][1];
      expect(written).toMatchObject({
        userId: ALICE,
        weeklyCycleId: 'cycle1',
        fromCapacity: 'normal',
        toCapacity: 'slammed',
      });
      expect(written.timestamp).toEqual({ __serverTimestamp: true });
    });

    test('records an UPSHIFT too, despite the collection name', async () => {
      // from/to carry the direction; the collection is not downshift-only.
      await createDownshiftEvent(ALICE, {
        weeklyCycleId: 'cycle1',
        fromCapacity: 'slammed',
        toCapacity: 'normal',
      });
      const written = mockAddDoc.mock.calls[0][1];
      expect(written.fromCapacity).toBe('slammed');
      expect(written.toCapacity).toBe('normal');
    });
  });

  describe('getDownshiftEventsForCycle', () => {
    test('filters on userId as well as the cycle, so the query is rule-legal', async () => {
      mockGetDocs.mockResolvedValue(docsSnap([]));
      await getDownshiftEventsForCycle(ALICE, 'cycle1');
      expect(mockWhere).toHaveBeenCalledWith('userId', '==', ALICE);
      expect(mockWhere).toHaveBeenCalledWith('weeklyCycleId', '==', 'cycle1');
    });

    test('returns [] when the cycle has no events', async () => {
      mockGetDocs.mockResolvedValue(docsSnap([]));
      expect(await getDownshiftEventsForCycle(ALICE, 'cycle1')).toEqual([]);
    });

    test('maps every event, carrying the document id', async () => {
      mockGetDocs.mockResolvedValue(
        docsSnap([
          { id: 'e1', data: { fromCapacity: 'normal', toCapacity: 'limited' } },
          { id: 'e2', data: { fromCapacity: 'limited', toCapacity: 'slammed' } },
        ])
      );
      const result = await getDownshiftEventsForCycle(ALICE, 'cycle1');
      expect(result.map((e) => e.id)).toEqual(['e1', 'e2']);
    });
  });

  // -------------------------------------------------------------------------
  // RETIRED: resetWeeklyCapacity — the atomic in-week re-set (spec 7).
  //
  // Its cases went with the function (roadmap 3b-i). They pinned the atomicity
  // of a two-collection batch, and there is no longer a weekly tier to move:
  // capacity is answered per day on the dailyLogs row. The downshiftEvents
  // helpers above are KEPT and still tested; they are orphaned writers-of-
  // record, not dead code, and the rows already written stay readable.
  // -------------------------------------------------------------------------
});
