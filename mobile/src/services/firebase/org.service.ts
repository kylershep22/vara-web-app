/**
 * organizations/{orgId} and memberships/{orgId}_{userId} — READ-ONLY accessors.
 *
 * The org/roster data model (Reconciled Product Spec S17.1–17.2). Both
 * collections are provisioned SERVER-SIDE by the Admin SDK; there are
 * deliberately no create/update/delete helpers here, because the rules answer
 * `allow write: if false` to every client write. A write helper would be dead
 * code that reads as a supported path.
 *
 * Nothing in the running app calls this yet. This slice establishes the schema,
 * the rules and these accessors; provisioning and the surfaces that consume them
 * come later.
 *
 * SCOPE BOUNDARY: entitlement resolution is NOT here. Whether an org membership
 * grants app access is a separate concern that touches useSubscription and the
 * paywall; this module only answers what the org and membership documents say.
 *
 * Uses requireDb() so the Firestore handle is narrowed to non-null, keeping this
 * module clear of the "Firestore | null is not assignable" errors that the raw
 * `db` import produces elsewhere in this directory.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { requireDb } from './ensureDb';
import type { Membership, Organization } from '../../types/models';

const ORGANIZATIONS = 'organizations';
const MEMBERSHIPS = 'memberships';

/**
 * The one place the deterministic membership document ID is built.
 *
 * Must stay in lockstep with the `isOrgMember()` helper in firestore.rules,
 * which concatenates the same way to do its exists() check. If this shape ever
 * changes, that rule changes with it or every membership check silently starts
 * failing closed.
 *
 * Safe for the ID values this app produces: Firestore document IDs cannot
 * contain '/', and Firebase Auth UIDs here are the generated 28-character
 * alphanumeric kind (email/password is the only provider). Note the separator
 * assumes orgIds contain no '_' — see the note in the slice report.
 */
export function membershipDocId(orgId: string, userId: string): string {
  return `${orgId}_${userId}`;
}

/**
 * Read an organization.
 *
 * Returns null when absent. Note the rules allow this read only to members of
 * that org, so a non-member does not get null here — the read is REJECTED and
 * this rejects too. Callers must not treat a thrown permission error as "no
 * such org".
 */
export async function getOrganization(
  orgId: string
): Promise<Organization | null> {
  const snap = await getDoc(doc(requireDb(), ORGANIZATIONS, orgId));
  if (!snap.exists()) return null;
  // `id` comes from the argument: the document ID is the authority, so a stored
  // id that ever disagreed with it would still read back correctly.
  return { ...(snap.data() as Omit<Organization, 'id'>), id: orgId };
}

/**
 * Read one user's membership in one organization.
 *
 * Returns null when the user is not a member — absence of the document IS the
 * "not a member" answer, which is exactly what the rules' exists() check keys
 * off. Reading someone else's membership is rejected by the rules.
 */
export async function getMembership(
  orgId: string,
  userId: string
): Promise<Membership | null> {
  const id = membershipDocId(orgId, userId);
  const snap = await getDoc(doc(requireDb(), MEMBERSHIPS, id));
  if (!snap.exists()) return null;
  return { ...(snap.data() as Omit<Membership, 'id'>), id };
}

/**
 * Read every membership belonging to a user.
 *
 * Queried by the `userId` FIELD rather than by document-ID prefix, because a
 * user's orgs are not knowable from their uid alone. The rules restrict each
 * returned document to its owner, so this only ever yields the caller's own
 * rows. Returns [] when the user belongs to no organization, which is the
 * normal state for every user today.
 */
export async function getMembershipsForUser(
  userId: string
): Promise<Membership[]> {
  const q = query(
    collection(requireDb(), MEMBERSHIPS),
    where('userId', '==', userId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    ...(d.data() as Omit<Membership, 'id'>),
    id: d.id,
  }));
}
