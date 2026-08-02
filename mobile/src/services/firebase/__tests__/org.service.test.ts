const mockDoc = jest.fn((..._a: any[]) => ({ __ref: true }));
const mockGetDoc = jest.fn((..._a: any[]): any => undefined);
const mockGetDocs = jest.fn((..._a: any[]): any => undefined);
const mockCollection = jest.fn((..._a: any[]) => ({ __collection: true }));
const mockQuery = jest.fn((..._a: any[]) => ({ __query: true }));
const mockWhere = jest.fn((..._a: any[]) => ({ __where: true }));

jest.mock('firebase/firestore', () => ({
  doc: (...a: any[]) => mockDoc(...a),
  getDoc: (...a: any[]) => mockGetDoc(...a),
  getDocs: (...a: any[]) => mockGetDocs(...a),
  collection: (...a: any[]) => mockCollection(...a),
  query: (...a: any[]) => mockQuery(...a),
  where: (...a: any[]) => mockWhere(...a),
}));
// requireDb() reads `db` from this module, so mocking it here narrows the handle
// for the service without needing to mock ensureDb itself.
jest.mock('../../../config/firebase', () => ({
  db: { __db: true },
  firebaseError: null,
}));

import {
  membershipDocId,
  getOrganization,
  getMembership,
  getMembershipsForUser,
} from '../org.service';

const absent = { exists: () => false };
const present = (data: Record<string, unknown> = {}) => ({
  exists: () => true,
  data: () => data,
});

describe('org.service', () => {
  beforeEach(() => {
    mockDoc.mockClear();
    mockGetDoc.mockReset();
    mockGetDocs.mockReset();
    mockCollection.mockClear();
    mockQuery.mockClear();
    mockWhere.mockClear();
  });

  describe('membershipDocId', () => {
    test('builds the deterministic composite id', () => {
      expect(membershipDocId('org1', 'alice')).toBe('org1_alice');
    });

    test('matches the shape the firestore.rules isOrgMember() helper concatenates', () => {
      // The rule does `orgId + '_' + request.auth.uid`. If this ever diverges,
      // every membership check silently fails closed — hence the explicit lock.
      const orgId = 'org1';
      const uid = 'alice123';
      expect(membershipDocId(orgId, uid)).toBe(orgId + '_' + uid);
    });
  });

  describe('getOrganization', () => {
    test('addresses organizations/{orgId}', async () => {
      mockGetDoc.mockResolvedValue(absent);
      await getOrganization('org1');
      expect(mockDoc).toHaveBeenCalledWith({ __db: true }, 'organizations', 'org1');
    });

    test('returns null when the organization does not exist', async () => {
      mockGetDoc.mockResolvedValue(absent);
      expect(await getOrganization('org1')).toBeNull();
    });

    test('returns the stored fields with id attached', async () => {
      mockGetDoc.mockResolvedValue(
        present({ name: 'Acme', type: 'corporate', seatLimit: 25 })
      );
      expect(await getOrganization('org1')).toEqual({
        id: 'org1',
        name: 'Acme',
        type: 'corporate',
        seatLimit: 25,
      });
    });

    test('id comes from the argument, not the stored field', async () => {
      mockGetDoc.mockResolvedValue(present({ id: 'someone-else', name: 'Acme' }));
      expect((await getOrganization('org1'))?.id).toBe('org1');
    });
  });

  describe('getMembership', () => {
    test('addresses memberships/{orgId}_{userId}', async () => {
      mockGetDoc.mockResolvedValue(absent);
      await getMembership('org1', 'alice');
      expect(mockDoc).toHaveBeenCalledWith(
        { __db: true },
        'memberships',
        'org1_alice'
      );
    });

    test('returns null when the user is not a member', async () => {
      // Absence of the document IS the "not a member" answer — the same signal
      // the rules' exists() check keys off.
      mockGetDoc.mockResolvedValue(absent);
      expect(await getMembership('org1', 'alice')).toBeNull();
    });

    test('returns the stored fields with the composite id attached', async () => {
      mockGetDoc.mockResolvedValue(
        present({ orgId: 'org1', userId: 'alice', role: 'coach' })
      );
      expect(await getMembership('org1', 'alice')).toEqual({
        id: 'org1_alice',
        orgId: 'org1',
        userId: 'alice',
        role: 'coach',
      });
    });
  });

  describe('getMembershipsForUser', () => {
    test('queries memberships by the userId field', async () => {
      mockGetDocs.mockResolvedValue({ docs: [] });
      await getMembershipsForUser('alice');
      expect(mockCollection).toHaveBeenCalledWith({ __db: true }, 'memberships');
      expect(mockWhere).toHaveBeenCalledWith('userId', '==', 'alice');
    });

    test('returns [] when the user belongs to no organization', async () => {
      // The normal state for every user today — not an error.
      mockGetDocs.mockResolvedValue({ docs: [] });
      expect(await getMembershipsForUser('alice')).toEqual([]);
    });

    test('maps each document, taking id from the document ID', async () => {
      mockGetDocs.mockResolvedValue({
        docs: [
          { id: 'org1_alice', data: () => ({ orgId: 'org1', userId: 'alice', role: 'member' }) },
          { id: 'org2_alice', data: () => ({ orgId: 'org2', userId: 'alice', role: 'coach' }) },
        ],
      });
      expect(await getMembershipsForUser('alice')).toEqual([
        { id: 'org1_alice', orgId: 'org1', userId: 'alice', role: 'member' },
        { id: 'org2_alice', orgId: 'org2', userId: 'alice', role: 'coach' },
      ]);
    });
  });

  describe('read-only surface', () => {
    test('exposes no write helpers — provisioning is server-side', () => {
      // The rules answer `allow write: if false` to every client write, so a
      // write helper here would be dead code that reads as a supported path.
      // require, not dynamic import(): this Jest config runs without
      // --experimental-vm-modules, so import() throws at runtime here.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require('../org.service');
      const exported = Object.keys(mod).sort();
      expect(exported).toEqual([
        'getMembership',
        'getMembershipsForUser',
        'getOrganization',
        'membershipDocId',
      ]);
    });
  });
});
