const mockDoc = jest.fn((..._a: any[]) => ({ __ref: true }));
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
}));
// requireDb() reads `db` from this module, so mocking it here narrows the handle
// for the service without needing to mock ensureDb itself.
jest.mock('../../../config/firebase', () => ({
  db: { __db: true },
  firebaseError: null,
}));

import {
  dailyLogDocId,
  createWeeklyCycle,
  getWeeklyCycleForWeek,
  getRecentWeeklyCycles,
  updateWeeklyCycle,
  upsertDailyLog,
  getDailyLog,
  createDownshiftEvent,
  getDownshiftEventsForCycle,
} from '../weeklyCycle.service';

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
        outcome: 'focus',
        capacityInitial: 'normal',
        protocolId: 'focus-normal',
      });
      expect(mockCollection).toHaveBeenCalledWith({ __db: true }, 'weeklyCycles');
    });

    test('initializes capacityCurrent to capacityInitial', async () => {
      await createWeeklyCycle(ALICE, {
        weekStart: WEEK,
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
        outcome: 'focus',
        capacityInitial: 'normal',
        protocolId: 'focus-normal',
      });
      const written = mockAddDoc.mock.calls[0][1];
      expect(written.userId).toBe(ALICE);
      expect(written.createdAt).toEqual({ __serverTimestamp: true });
      expect(written.updatedAt).toEqual({ __serverTimestamp: true });
    });

    test('returns the new document id', async () => {
      expect(
        await createWeeklyCycle(ALICE, {
          weekStart: WEEK,
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
});
