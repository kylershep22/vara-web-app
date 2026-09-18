// moments — Good moments persistence (journey slice 8).
//
// Mocked at the firebase/firestore boundary, the same way
// capturedTasks.service.test.ts does it: the refs echo the arguments they were
// built from, so a payload written against the wrong collection cannot still
// match.

type Args = unknown[];

const mockCollection = jest.fn((...a: Args) => ({ __collection: true, builtFrom: a }));
const mockAddDoc = jest.fn((...a: Args) => {
  void a;
  return { id: 'new-moment-id' } as { id: string };
});
const mockServerTimestamp = jest.fn(() => ({ __serverTimestamp: true }));
const mockDoc = jest.fn((...a: Args) => ({ __ref: true, builtFrom: a }));
const mockSetDoc = jest.fn((...a: Args) => {
  void a;
});
const mockGetDocs = jest.fn((...a: Args) => {
  void a;
});

jest.mock('firebase/firestore', () => ({
  collection: (...a: Args) => mockCollection(...a),
  addDoc: (...a: Args) => mockAddDoc(...a),
  serverTimestamp: () => mockServerTimestamp(),
  // Exposed but never expected to fire. Their existence is what makes the
  // "writes by auto-ID, not by a constructed ID" and "never reads" assertions
  // below tripwires rather than import errors.
  doc: (...a: Args) => mockDoc(...a),
  setDoc: (...a: Args) => mockSetDoc(...a),
  getDocs: (...a: Args) => mockGetDocs(...a),
}));

jest.mock('../../../config/firebase', () => ({
  db: { __db: true },
  firebaseError: null,
}));

import { createMoment } from '../moments.service';
import * as momentsService from '../moments.service';

const ALICE = 'alice-uid';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('createMoment', () => {
  it('writes userId, text and a SERVER timestamp, and returns the new id', async () => {
    const id = await createMoment(ALICE, 'The dog met me at the door.');

    expect(id).toBe('new-moment-id');
    expect(mockCollection).toHaveBeenCalledWith({ __db: true }, 'moments');

    const [ref, payload] = mockAddDoc.mock.calls[0];
    // The payload went to the collection the service named, not merely to some
    // collection.
    expect(ref).toEqual({ __collection: true, builtFrom: [{ __db: true }, 'moments'] });
    expect(payload).toEqual({
      userId: ALICE,
      text: 'The dog met me at the door.',
      createdAt: { __serverTimestamp: true },
    });
  });

  it('carries no field beyond the three', () => {
    // The document shape IS the product fence here. A fourth field arriving
    // without a decision is the thing this pins.
    return createMoment(ALICE, 'Quiet morning.').then(() => {
      const [, payload] = mockAddDoc.mock.calls[0];
      expect(Object.keys(payload).sort()).toEqual(['createdAt', 'text', 'userId']);
    });
  });

  it('uses serverTimestamp, never a client clock', async () => {
    await createMoment(ALICE, 'Sun on the wall.');

    expect(mockServerTimestamp).toHaveBeenCalledTimes(1);
    const [, payload] = mockAddDoc.mock.calls[0];
    // A Date here would mean a device with a wrong clock files a moment under
    // the wrong day, permanently, in a collection nothing reads back yet.
    expect(payload.createdAt).not.toBeInstanceOf(Date);
    expect(typeof payload.createdAt).toBe('object');
  });

  it('writes by auto-ID: ownership is the field, never the document path', async () => {
    await createMoment(ALICE, 'Late light.');

    // Row 8 specified `moments/{uid}_{ts}`. The slice shipped the capturedTasks
    // shape instead, and this is the assertion that says so: a constructed ID
    // would go through doc()/setDoc(), not addDoc().
    expect(mockAddDoc).toHaveBeenCalledTimes(1);
    expect(mockDoc).not.toHaveBeenCalled();
    expect(mockSetDoc).not.toHaveBeenCalled();

    const [, payload] = mockAddDoc.mock.calls[0];
    expect(payload.userId).toBe(ALICE);
  });

  it('writes the text exactly as handed in, trimming nothing', async () => {
    // Trimming belongs to the caller, which is also what decides whether the
    // save is allowed at all. Two definitions of "empty" would drift.
    await createMoment(ALICE, '  padded  ');

    const [, payload] = mockAddDoc.mock.calls[0];
    expect(payload.text).toBe('  padded  ');
  });

  it('lets a write failure reach the caller rather than swallowing it', async () => {
    mockAddDoc.mockRejectedValueOnce(new Error('offline'));

    await expect(createMoment(ALICE, 'Nope.')).rejects.toThrow('offline');
  });
});

describe('the service surface', () => {
  it('exports exactly one function, and it is a write', () => {
    // WRITE-ONLY IS THE DESIGN, not an omission. Row 8: the feature "feeds
    // nothing until Insights ships". A read added here without a surface would
    // be a caller waiting to happen.
    const exported = Object.keys(momentsService).filter(
      (k) => typeof (momentsService as Record<string, unknown>)[k] === 'function'
    );
    expect(exported).toEqual(['createMoment']);
  });

  it('never queries', async () => {
    await createMoment(ALICE, 'Still no reads.');
    expect(mockGetDocs).not.toHaveBeenCalled();
  });
});
