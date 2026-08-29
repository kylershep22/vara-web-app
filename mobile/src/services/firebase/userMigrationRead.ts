/**
 * MIGRATION_FALLBACK — read-through for the userPrivate migration (slice 2 of 4).
 *
 * WHAT THIS EXISTS FOR. Slice 2 repoints writers: a non-allowlist field that
 * used to be written to users/{uid} is now written to userPrivate/{uid}. Slice
 * 3 backfills the historical values. Until that backfill lands, a given user's
 * value may live in EITHER document — the new one if they have written since
 * updating, the old one if they have not. Every reader of such a field has to
 * look in both.
 *
 * THE RULE: userPrivate wins, users/{uid} is the fallback. That ordering is
 * what makes the transition correct in both directions. A user on a new build
 * writes only userPrivate, so the fresh value is found first; a user on an old
 * build writes only users/{uid}, so the fallback finds it. Neither can read a
 * stale value over a fresh one.
 *
 * DEEP, NOT SHALLOW. The merge recurses into plain objects. This is
 * load-bearing, not tidiness: a writer like trackEngagementMetric touches only
 * `featureDiscovery.engagement`, so a mid-migration user has
 * `featureDiscovery.features` on users/{uid} and `featureDiscovery.engagement`
 * on userPrivate. A shallow overlay would let the private half win whole and
 * silently drop every feature state. Arrays and scalars replace outright —
 * only maps merge.
 *
 * SLICE 4 REMOVES THIS FILE. Every call site carries the MIGRATION_FALLBACK
 * token so `git grep MIGRATION_FALLBACK` finds the complete removal list.
 * After the flip, readers go straight to getUserPrivate().
 */
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { requireDb } from './ensureDb';

/** A user's fields as the app sees them mid-migration: both documents, merged. */
export type MergedUserData = Record<string, unknown>;

/**
 * Keys the userPrivate store owns for its OWN bookkeeping, which must never
 * shadow the public document's versions of the same names.
 *
 * `createdAt` is the sharp one. On users/{uid} it is the account creation time,
 * which useDashboard uses for the event-code prompt window and
 * useNotificationOptInCards uses for account age. On userPrivate it is when the
 * private document was first written, which for a migrated user is some
 * arbitrary later moment. Letting it through would make every migrated account
 * look newly created.
 */
const PRIVATE_STORE_KEYS = ['uid', 'createdAt', 'updatedAt'] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    // Firestore Timestamps, Dates and DocumentReferences are objects but are
    // values, not maps. Merging into them would corrupt them, so anything with
    // a non-Object prototype replaces rather than merges.
    (Object.getPrototypeOf(value) === Object.prototype ||
      Object.getPrototypeOf(value) === null)
  );
}

function deepMerge(
  base: Record<string, unknown>,
  overlay: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };
  for (const [key, overlayValue] of Object.entries(overlay)) {
    const baseValue = out[key];
    out[key] =
      isPlainObject(baseValue) && isPlainObject(overlayValue)
        ? deepMerge(baseValue, overlayValue)
        : overlayValue;
  }
  return out;
}

/**
 * Merge the two documents into the shape readers expect.
 *
 * Exported for tests, which pin both directions (private present / absent) and
 * the createdAt shadowing rule.
 */
export function mergeUserDocuments(
  publicData: Record<string, unknown> | null | undefined,
  privateData: Record<string, unknown> | null | undefined
): MergedUserData | null {
  if (!publicData && !privateData) return null;
  const overlay: Record<string, unknown> = { ...(privateData ?? {}) };
  for (const key of PRIVATE_STORE_KEYS) delete overlay[key];
  return deepMerge(publicData ?? {}, overlay);
}

/**
 * One-shot read of a user's merged fields.
 *
 * Returns null only when NEITHER document exists. A missing userPrivate
 * document is the normal state for anyone not yet backfilled, not an error.
 */
export async function getMergedUserData(uid: string): Promise<MergedUserData | null> {
  const db = requireDb();
  const [publicSnap, privateSnap] = await Promise.all([
    getDoc(doc(db, 'users', uid)),
    getDoc(doc(db, 'userPrivate', uid)),
  ]);
  return mergeUserDocuments(
    publicSnap.exists() ? publicSnap.data() : null,
    privateSnap.exists() ? privateSnap.data() : null
  );
}

/**
 * Live subscription to a user's merged fields, for the sites that were already
 * onSnapshot listeners rather than one-shot reads.
 *
 * FIRST EMIT WAITS FOR BOTH documents. Emitting as soon as users/{uid} arrives
 * would publish the pre-migration value for a beat before userPrivate corrects
 * it — which on the AppNavigator gate means a migrated user watching the app
 * bounce into onboarding and back out. After both have delivered once, every
 * subsequent snapshot from either side emits immediately.
 *
 * An error on EITHER listener is surfaced once and stops further emits, which
 * matches what each call site's single listener did before.
 */
export function subscribeMergedUserData(
  uid: string,
  onData: (data: MergedUserData | null) => void,
  onError?: (error: Error) => void
): () => void {
  const db = requireDb();

  let publicData: Record<string, unknown> | null = null;
  let privateData: Record<string, unknown> | null = null;
  let publicReady = false;
  let privateReady = false;
  let failed = false;

  const emit = () => {
    if (failed || !publicReady || !privateReady) return;
    onData(mergeUserDocuments(publicData, privateData));
  };

  const fail = (error: Error) => {
    if (failed) return;
    failed = true;
    onError?.(error);
  };

  const unsubPublic = onSnapshot(
    doc(db, 'users', uid),
    (snap) => {
      publicData = snap.exists() ? (snap.data() as Record<string, unknown>) : null;
      publicReady = true;
      emit();
    },
    fail
  );

  const unsubPrivate = onSnapshot(
    doc(db, 'userPrivate', uid),
    (snap) => {
      privateData = snap.exists() ? (snap.data() as Record<string, unknown>) : null;
      privateReady = true;
      emit();
    },
    fail
  );

  return () => {
    unsubPublic();
    unsubPrivate();
  };
}
