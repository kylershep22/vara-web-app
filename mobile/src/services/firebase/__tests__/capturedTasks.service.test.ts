// capturedTasks — the Task-Batching persistence layer (TB-2a).
//
// Mocked at the firebase/firestore boundary, the same way
// dayBlocks.service.test.ts does it: the refs echo the arguments they were
// built from, so a payload written against the wrong ref cannot still match.

const mockDoc = jest.fn((..._a: any[]) => ({ __ref: true, builtFrom: _a }));
const mockGetDocs = jest.fn((..._a: any[]): any => undefined);
const mockCollection = jest.fn((..._a: any[]) => ({ __collection: true, builtFrom: _a }));
const mockQuery = jest.fn((..._a: any[]) => ({ __query: true, parts: _a }));
const mockWhere = jest.fn((...a: any[]) => ({ __where: a }));
const mockOrderBy = jest.fn((...a: any[]) => ({ __orderBy: a }));
const mockAddDoc = jest.fn((..._a: any[]): any => ({ id: 'new-task-id' }));
const mockDeleteDoc = jest.fn((..._a: any[]): any => undefined);
const mockServerTimestamp = jest.fn(() => ({ __serverTimestamp: true }));

jest.mock('firebase/firestore', () => ({
  doc: (...a: any[]) => mockDoc(...a),
  getDocs: (...a: any[]) => mockGetDocs(...a),
  collection: (...a: any[]) => mockCollection(...a),
  query: (...a: any[]) => mockQuery(...a),
  where: (...a: any[]) => mockWhere(...a),
  // Exposed but never expected to fire. See the ordering test below: this mock
  // existing is what makes "no orderBy" a tripwire rather than an import error.
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
  createCapturedTask,
  listCapturedTasks,
  deleteCapturedTask,
} from '../capturedTasks.service';
// Namespace import for the surface test at the bottom. A dynamic import() there
// needs --experimental-vm-modules under this jest config, which nothing else in
// the suite turns on.
import * as capturedTasksService from '../capturedTasks.service';

const ALICE = 'alice-uid';

const snapshotOf = (docs: Array<{ id: string; data: Record<string, unknown> }>) => ({
  docs: docs.map((d) => ({ id: d.id, data: () => d.data })),
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('createCapturedTask', () => {
  it('writes an owner-scoped task and returns the new id', async () => {
    const id = await createCapturedTask(ALICE, {
      title: 'Draft investor update',
      demand: 'heavy',
    });

    expect(id).toBe('new-task-id');
    expect(mockCollection).toHaveBeenCalledWith({ __db: true }, 'capturedTasks');

    const [, payload] = mockAddDoc.mock.calls[0];
    expect(payload).toMatchObject({
      userId: ALICE,
      title: 'Draft investor update',
      demand: 'heavy',
    });
  });

  it('stamps createdAt and updatedAt with serverTimestamp', async () => {
    await createCapturedTask(ALICE, { title: 'Book dentist', demand: 'light' });

    const [, payload] = mockAddDoc.mock.calls[0];
    expect(payload.createdAt).toEqual({ __serverTimestamp: true });
    expect(payload.updatedAt).toEqual({ __serverTimestamp: true });
  });

  it('NEVER writes to the legacy tasks collection', async () => {
    // The two entities share an English word and nothing else. `tasks` is the
    // web app's, carries `priority`, and is frozen; a stray string here would
    // have mobile writing demand-tagged rows into it.
    await createCapturedTask(ALICE, { title: 'Expense report', demand: 'light' });

    expect(mockCollection).not.toHaveBeenCalledWith(expect.anything(), 'tasks');
  });

  it('writes a name and a demand tag and NOTHING else', async () => {
    // The whole product fence, pinned as a field list. Every absence here is an
    // answer (see the CapturedTask note in models.ts), so a new key appearing in
    // this payload should fail a test before it reaches a schema review.
    await createCapturedTask(ALICE, { title: 'Reply to Sam', demand: 'medium' });

    const [, payload] = mockAddDoc.mock.calls[0];
    expect(Object.keys(payload).sort()).toEqual([
      'createdAt',
      'demand',
      'title',
      'updatedAt',
      'userId',
    ]);
  });

  it('writes no completed field — a cleared task is deleted, not ticked', async () => {
    // Distinct from DayBlock's identical-looking absence: a block has no done
    // state at all, whereas a task's done state is "the row is gone". Either
    // way there is nothing to store, and restoring the flag would silently
    // introduce a history this feature is designed not to keep.
    await createCapturedTask(ALICE, { title: 'Strategy memo', demand: 'heavy' });

    const [, payload] = mockAddDoc.mock.calls[0];
    expect('completed' in payload).toBe(false);
    expect('completedAt' in payload).toBe(false);
  });

  it('refuses the legacy importance axis at compile time', async () => {
    await createCapturedTask(ALICE, {
      title: 'Q3 board deck',
      demand: 'heavy',
      // @ts-expect-error `priority` is the LEGACY Task's axis (importance), not
      // this one's (cognitive load). If this directive ever reports as UNUSED,
      // someone widened CreateCapturedTaskInput to accept it and tsc fails here
      // — which is the point. Same cardinality, different question; never alias.
      priority: 'high',
    });

    // The guard is the type, not a runtime check — the call itself still runs.
    expect(mockAddDoc).toHaveBeenCalledTimes(1);
  });
});

describe('listCapturedTasks', () => {
  it('scopes to the owner through the userId field', async () => {
    mockGetDocs.mockResolvedValueOnce(snapshotOf([]));

    await listCapturedTasks(ALICE);

    expect(mockCollection).toHaveBeenCalledWith({ __db: true }, 'capturedTasks');
    expect(mockWhere).toHaveBeenCalledWith('userId', '==', ALICE);
  });

  it('issues a BARE equality query — no orderBy, so no composite index', async () => {
    // THE INDEX DECISION, PINNED. `where userId ==` alone is served by a
    // single-field index; adding an orderBy would silently require a
    // (userId, createdAt) composite, and a missing composite fails against
    // PRODUCTION while every mocked test in this file still passes. That is the
    // exact class of bug that bit dayBlocks and getRecentWeeklyCycles.
    //
    // This is a tripwire, not a behavioural proof: the firestore mock above
    // exposes orderBy, so adding one to the service fires it and fails here
    // rather than compiling into a production-only outage. Ordering and
    // grouping are the screen layer's job (TB-2b), client-side.
    mockGetDocs.mockResolvedValueOnce(snapshotOf([]));

    await listCapturedTasks(ALICE);

    expect(mockOrderBy).not.toHaveBeenCalled();
    expect(mockWhere).toHaveBeenCalledTimes(1);
  });

  it('maps the document id onto each task', async () => {
    mockGetDocs.mockResolvedValueOnce(
      snapshotOf([
        { id: 'task-1', data: { userId: ALICE, title: 'Expense report', demand: 'light' } },
        { id: 'task-2', data: { userId: ALICE, title: 'Q3 board deck', demand: 'heavy' } },
      ])
    );

    const tasks = await listCapturedTasks(ALICE);

    expect(tasks).toHaveLength(2);
    expect(tasks[0]).toMatchObject({ id: 'task-1', title: 'Expense report', demand: 'light' });
    expect(tasks[1]).toMatchObject({ id: 'task-2', title: 'Q3 board deck', demand: 'heavy' });
  });

  it('lets the document id beat a stale id stored in the data', async () => {
    // id is spread LAST for exactly this. A row that somehow carries its own
    // `id` field must not be able to shadow the identity Firestore assigned it.
    mockGetDocs.mockResolvedValueOnce(
      snapshotOf([
        { id: 'real-id', data: { id: 'stale-id', userId: ALICE, title: 'Book dentist', demand: 'light' } },
      ])
    );

    const tasks = await listCapturedTasks(ALICE);

    expect(tasks[0].id).toBe('real-id');
  });

  it('returns an empty list rather than throwing when nothing is captured', async () => {
    mockGetDocs.mockResolvedValueOnce(snapshotOf([]));

    await expect(listCapturedTasks(ALICE)).resolves.toEqual([]);
  });
});

describe('deleteCapturedTask', () => {
  it('deletes the row outright — clearing keeps no history', async () => {
    await deleteCapturedTask('task-1');

    expect(mockDoc).toHaveBeenCalledWith({ __db: true }, 'capturedTasks', 'task-1');
    expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
  });
});

describe('the service surface', () => {
  it('exposes no update path at MVP', () => {
    // Retagging today is clear-and-recapture. When a real need arrives, the
    // patch function belongs here and must be CONSTRUCTED FROM AN ALLOWLIST
    // rather than spread from caller input, the way updateDayBlock is — writing
    // that down before the function exists is what made the dayBlocks update
    // path safe when it landed. This asserts the gap is still a gap, so adding
    // one is a deliberate act with a test to update.
    expect(Object.keys(capturedTasksService).sort()).toEqual([
      'createCapturedTask',
      'deleteCapturedTask',
      'listCapturedTasks',
    ]);
  });
});
