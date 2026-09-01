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

jest.mock('firebase/firestore', () => ({
  doc: (...a: any[]) => mockDoc(...a),
  getDoc: (...a: any[]) => mockGetDoc(...a),
  setDoc: (...a: any[]) => mockSetDoc(...a),
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
  hasPickedToday,
} from '../dailyLog.service';
import type { DailyLog } from '../../../types/models';

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
});
