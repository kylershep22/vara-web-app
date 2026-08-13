// dayBlocks — the Time-Blocking persistence layer (TB-1a).
//
// Mocked at the firebase/firestore boundary, the same way
// weeklyCycle.service.test.ts does it: the refs echo the arguments they were
// built from, so a payload written against the wrong ref cannot still match.

const mockDoc = jest.fn((..._a: any[]) => ({ __ref: true, builtFrom: _a }));
const mockGetDocs = jest.fn((..._a: any[]): any => undefined);
const mockCollection = jest.fn((..._a: any[]) => ({ __collection: true, builtFrom: _a }));
const mockQuery = jest.fn((..._a: any[]) => ({ __query: true, parts: _a }));
const mockWhere = jest.fn((...a: any[]) => ({ __where: a }));
const mockOrderBy = jest.fn((...a: any[]) => ({ __orderBy: a }));
const mockAddDoc = jest.fn((..._a: any[]): any => ({ id: 'new-block-id' }));
const mockDeleteDoc = jest.fn((..._a: any[]): any => undefined);
const mockServerTimestamp = jest.fn(() => ({ __serverTimestamp: true }));

jest.mock('firebase/firestore', () => ({
  doc: (...a: any[]) => mockDoc(...a),
  getDocs: (...a: any[]) => mockGetDocs(...a),
  collection: (...a: any[]) => mockCollection(...a),
  query: (...a: any[]) => mockQuery(...a),
  where: (...a: any[]) => mockWhere(...a),
  orderBy: (...a: any[]) => mockOrderBy(...a),
  addDoc: (...a: any[]) => mockAddDoc(...a),
  deleteDoc: (...a: any[]) => mockDeleteDoc(...a),
  serverTimestamp: () => mockServerTimestamp(),
}));
// requireDb() reads `db` from this module, so mocking it here narrows the
// handle for the service without needing to mock ensureDb itself.
jest.mock('../../../config/firebase', () => ({
  db: { __db: true },
  firebaseError: null,
}));

import {
  createDayBlock,
  listDayBlocksBetween,
  deleteDayBlock,
} from '../dayBlocks.service';

const ALICE = 'alice-uid';
const START_AT = new Date(2026, 7, 13, 9, 0, 0);

const snapshotOf = (docs: Array<{ id: string; data: Record<string, unknown> }>) => ({
  docs: docs.map((d) => ({ id: d.id, data: () => d.data })),
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('createDayBlock', () => {
  it('writes an owner-scoped block and returns the new id', async () => {
    const id = await createDayBlock(ALICE, {
      title: 'Draft the roadmap',
      demand: 'heavy',
      durationMinutes: 90,
      startAt: START_AT,
      isProtected: true,
    });

    expect(id).toBe('new-block-id');
    expect(mockCollection).toHaveBeenCalledWith({ __db: true }, 'dayBlocks');

    const [, payload] = mockAddDoc.mock.calls[0];
    expect(payload).toMatchObject({
      userId: ALICE,
      title: 'Draft the roadmap',
      demand: 'heavy',
      durationMinutes: 90,
      startAt: START_AT,
      isProtected: true,
    });
  });

  it('stamps createdAt and updatedAt with serverTimestamp', async () => {
    await createDayBlock(ALICE, {
      title: 'Inbox',
      demand: 'light',
      durationMinutes: 30,
      startAt: START_AT,
      isProtected: false,
    });

    const [, payload] = mockAddDoc.mock.calls[0];
    expect(payload.createdAt).toEqual({ __serverTimestamp: true });
    expect(payload.updatedAt).toEqual({ __serverTimestamp: true });
  });

  it('stores a real start instant and a numeric duration, never a zone label', async () => {
    // THE export-clean constraint, pinned. Phase 2 calendar sync must be able
    // to read startAt + durationMinutes directly with no re-derivation, so a
    // rhythm zone key must never stand in for the time.
    await createDayBlock(ALICE, {
      title: 'Deep work',
      demand: 'heavy',
      durationMinutes: 60,
      startAt: START_AT,
      isProtected: true,
      suggestedFrom: 'mid_morning',
    });

    const [, payload] = mockAddDoc.mock.calls[0];
    expect(payload.startAt).toBeInstanceOf(Date);
    expect(typeof payload.durationMinutes).toBe('number');
    // Provenance only — it records that a suggestion was accepted, and is
    // never the source of the block's time.
    expect(payload.suggestedFrom).toBe('mid_morning');
    expect(payload.startAt).not.toBe('mid_morning');
  });

  it('OMITS suggestedFrom entirely when no suggestion was accepted', async () => {
    // Not `undefined`: Firestore rejects undefined field values outright, so
    // writing the key unset would throw at runtime against a real backend.
    await createDayBlock(ALICE, {
      title: 'Inbox',
      demand: 'light',
      durationMinutes: 30,
      startAt: START_AT,
      isProtected: false,
    });

    const [, payload] = mockAddDoc.mock.calls[0];
    expect('suggestedFrom' in payload).toBe(false);
  });

  it("rejects 'varies' as provenance at compile time", async () => {
    await createDayBlock(ALICE, {
      title: 'Deep work',
      demand: 'medium',
      durationMinutes: 60,
      startAt: START_AT,
      isProtected: false,
      // @ts-expect-error 'varies' maps to no clock range, so suggestPlacement
      // can never propose it and it can never be the provenance of an accepted
      // suggestion. If this directive ever reports as UNUSED, suggestedFrom was
      // widened back to FocusRhythmKey and tsc will fail here.
      suggestedFrom: 'varies',
    });

    // The guard is the type, not a runtime check — the call itself still runs.
    expect(mockAddDoc).toHaveBeenCalledTimes(1);
  });

  it('writes no completed field — blocks have no done state by design', async () => {
    // Past blocks fade; they are never ticked off. Treat this absence as
    // designed, not missing, and do not "restore" it.
    await createDayBlock(ALICE, {
      title: 'Deep work',
      demand: 'medium',
      durationMinutes: 60,
      startAt: START_AT,
      isProtected: false,
    });

    const [, payload] = mockAddDoc.mock.calls[0];
    expect('completed' in payload).toBe(false);
    expect('completedAt' in payload).toBe(false);
  });
});

describe('listDayBlocksBetween', () => {
  const RANGE_START = new Date(2026, 7, 13, 0, 0, 0);
  const RANGE_END = new Date(2026, 7, 13, 23, 59, 59);

  it('scopes to the owner and bounds the range on startAt', async () => {
    mockGetDocs.mockResolvedValueOnce(snapshotOf([]));

    await listDayBlocksBetween(ALICE, RANGE_START, RANGE_END);

    expect(mockWhere).toHaveBeenCalledWith('userId', '==', ALICE);
    expect(mockWhere).toHaveBeenCalledWith('startAt', '>=', RANGE_START);
    expect(mockWhere).toHaveBeenCalledWith('startAt', '<=', RANGE_END);
  });

  it('orders by startAt ascending so the day reads top to bottom', async () => {
    mockGetDocs.mockResolvedValueOnce(snapshotOf([]));

    await listDayBlocksBetween(ALICE, RANGE_START, RANGE_END);

    expect(mockOrderBy).toHaveBeenCalledWith('startAt', 'asc');
  });

  it('maps the document id onto each block', async () => {
    mockGetDocs.mockResolvedValueOnce(
      snapshotOf([
        { id: 'block-1', data: { userId: ALICE, title: 'Deep work' } },
        { id: 'block-2', data: { userId: ALICE, title: 'Inbox' } },
      ])
    );

    const blocks = await listDayBlocksBetween(ALICE, RANGE_START, RANGE_END);

    expect(blocks).toHaveLength(2);
    expect(blocks[0].id).toBe('block-1');
    expect(blocks[1].title).toBe('Inbox');
  });

  it('returns an empty list for a day with no blocks', async () => {
    // The normal state of most days, not an error.
    mockGetDocs.mockResolvedValueOnce(snapshotOf([]));

    await expect(listDayBlocksBetween(ALICE, RANGE_START, RANGE_END)).resolves.toEqual([]);
  });

  it('does not let a stored id field overwrite the document id', async () => {
    mockGetDocs.mockResolvedValueOnce(
      snapshotOf([{ id: 'real-id', data: { id: 'stale-id', title: 'Deep work' } }])
    );

    const blocks = await listDayBlocksBetween(ALICE, RANGE_START, RANGE_END);

    expect(blocks[0].id).toBe('real-id');
  });
});

describe('deleteDayBlock', () => {
  it('deletes the block by id', async () => {
    await deleteDayBlock('block-1');

    expect(mockDoc).toHaveBeenCalledWith({ __db: true }, 'dayBlocks', 'block-1');
    expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
  });
});
