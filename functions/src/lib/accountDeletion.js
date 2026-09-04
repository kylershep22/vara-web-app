/**
 * ACCOUNT DELETION — the full per-user Firestore sweep.
 *
 * WHY THIS IS A MODULE AND NOT AN INLINE BLOCK. It used to live inside the
 * `deleteAccount` onCall handler in functions/index.js, where the only thing
 * that could test it was a regex over the source text. The sweep is now the
 * mechanism behind a legal promise — the privacy policy says personal data is
 * removed from active systems within 30 days of a deletion request — so it has
 * to be exercisable against a real Firestore, per collection, including the
 * awkward shapes (legacy auto-ID rows, orphaned subcollections). That needs an
 * importable function taking `db` and `auth`, which is this file.
 *
 * WHAT WENT WRONG BEFORE. The inline list was written once and then never grew
 * with the app. Twenty-six deletion targets were missing by the time this was
 * audited: every collection the weekly loop, time-blocking, task-batching,
 * analytics and org slices added, plus subcollections whose PARENT the code
 * deleted (deleting a document in Firestore does NOT delete its
 * subcollections — those rows simply become unreachable and immortal).
 *
 * THE THREE OWNERSHIP SHAPES, and why each needs its own list:
 *
 *   1. A `userId` FIELD on each document. The overwhelming majority. Swept by
 *      `where('userId','==',uid)`.
 *   2. An owner field under some OTHER name — `authorId`, `muterId`,
 *      `reporterId`, `inviterId`, `from`. Same query, different field.
 *   3. The document ID IS the uid (`users/{uid}`, `userPrivate/{uid}`,
 *      `notificationLog/{uid}`). Deleted by path, recursively.
 *
 * NEVER SWEEP A DETERMINISTIC-ID COLLECTION BY RECONSTRUCTING ITS IDS.
 * `dailyLogs` is `${uid}_${date}` and `weeklyCycles` is `${uid}_${weekStart}`
 * TODAY, but weeklyCycles rows written before that convention have Firestore
 * auto-IDs, and no amount of ID construction will ever find them. Every one of
 * those collections carries a `userId` field precisely so a query can. Query is
 * the only complete sweep; ID construction is a sweep that quietly misses the
 * oldest accounts, which are the beta testers.
 *
 * IDEMPOTENCY IS THE RECOVERY PATH. Every operation here is "delete what
 * matches" or "delete this path", both of which are no-ops the second time.
 * A run that fails partway leaves an account whose Auth record still exists
 * (Auth is deleted last, and only if every Firestore step succeeded), so the
 * user can sign in and press delete again, and the second run finishes what the
 * first started. Do not add ordering that breaks this property.
 *
 * ONE FAILING STEP MUST NOT BLOCK THE OTHER FIFTY. The steps run
 * independently and failures are collected rather than thrown at the first
 * one — otherwise a single permanently-broken collection would pin every
 * collection after it in the list undeleted forever, no matter how many times
 * the user retried. The accumulated failures are returned, so the caller still
 * raises an error and Auth still survives for the retry.
 */

/** Firestore's hard cap on writes in one batch. */
const BATCH_LIMIT = 500;

/**
 * Collections whose per-user ownership is a `userId` FIELD on each document.
 *
 * Grouped by app area rather than alphabetised, so a reviewer can see which
 * slice contributed what. Adding a collection to the app means adding it here
 * in the same slice — nothing else in the repo will notice if you do not, and
 * the failure mode is silent: no error, no log, just personal data that
 * outlives the account.
 */
const USERID_FIELD_COLLECTIONS = [
  // Core personal data (the original list).
  "goals", "habits", "tasks", "journalEntries", "journal_entries",
  "habitCompletions", "joyMoments", "fourThreeTwoOne",
  "dailyWellnessScores", "morningCheckIns", "brainMetrics",
  "neuroplasticitySignals", "nervousSystemSessions", "amccChallenges",
  "sleepLogs", "sleepRoutineRuns", "puzzleCompletions", "focusSessions",
  "routines", "weeklyRecaps", "wheelOfLife", "reflections",
  "masterclassProgress", "audioListens", "audioFavorites",
  "socialConnections", "natureExposure", "energyCheckins",
  "gratitudeEntries", "bedtimeRoutines", "emotionalCheckins",
  "cognitiveReframes", "digitalWellbeing", "brainHealthScores",
  "notifications", "challengeParticipants", "challengeCheckIns",

  // Journey (slice 1). The document ID is the uid, but the row also carries a
  // userId field (the rules refuse a forged one), so it sweeps with its
  // siblings rather than needing a one-off delete by path.
  "journeyStates",

  // Dashboard V2 / protocol engine.
  "brainStateCheckIns", "protocolSessions", "dailyReflections",

  // Weekly loop. weeklyCycles is the auto-ID case described in the header.
  "weeklyCycles", "dailyLogs", "downshiftEvents",

  // Time blocking (TB-1) and task batching (TB-2).
  "dayBlocks", "capturedTasks",

  // Analytics. The content firewall keeps event payloads free of user text,
  // but every row is still stamped with the uid, which is personal data.
  "analyticsEvents",

  // Notification preferences. The document ID is the uid AND the row carries a
  // userId field; the uid-path delete below is belt to this braces, because a
  // row written before that field existed is reachable only by path.
  "notificationPreferences",

  // Org roster. The document ID is `${orgId}_${uid}` — queried, never
  // constructed, because a user can belong to more than one organisation.
  "memberships",

  // Community preferences.
  "hiddenPosts",
];

/**
 * Collections owned through a field that is NOT called `userId`.
 *
 * `posts` appears with BOTH fields: the mobile client writes `userId` and
 * `authorId` on every post, but the web client writes `authorId` only, so a
 * sweep on `userId` alone leaves every web-authored post standing. Duplicate
 * hits across the two queries are harmless — the second query cannot see rows
 * the first already deleted.
 *
 * Both sides of each invite pair are swept: a pending invite names an inviter
 * and an invitee, and the deleted account may be either.
 */
const OWNER_FIELD_COLLECTIONS = [
  {collection: "posts", field: "userId"},
  {collection: "posts", field: "authorId"},
  {collection: "directMessages", field: "senderId"},
  {collection: "mutedUsers", field: "muterId"},
  {collection: "postReports", field: "reporterId"},
  {collection: "groupInvites", field: "inviterId"},
  {collection: "groupInvites", field: "inviteeId"},
  {collection: "challengeInvites", field: "inviterId"},
  {collection: "challengeInvites", field: "inviteeId"},
  {collection: "connectionInvites", field: "from"},
  {collection: "connectionInvites", field: "to"},
  // connections carries three historical shapes: the web app's
  // {requesterId, addresseeId, participants} and the mobile app's {a, b}.
  // participants is an array and is handled below; these are the scalars.
  {collection: "connections", field: "requesterId"},
  {collection: "connections", field: "addresseeId"},
  {collection: "connections", field: "a"},
  {collection: "connections", field: "b"},
];

/** Collections where membership in an array IS ownership of the document. */
const ARRAY_MEMBER_COLLECTIONS = [
  {collection: "conversations", field: "participants"},
  {collection: "connections", field: "participants"},
];

/**
 * Collections where the uid must be REMOVED from a shared array rather than
 * the document deleted. These documents belong to other people too — deleting
 * a group because one member closed their account would destroy everyone
 * else's content.
 */
const MEMBERSHIP_ARRAYS = [
  {collection: "groups", field: "members"},
  {collection: "challenges", field: "members"},
];

/**
 * Documents whose ID is the uid, deleted along with everything beneath them.
 *
 * `users` is deliberately last: it is the row the rest of the app treats as
 * "this account exists", so it should be the last Firestore thing to go.
 * Every entry is a RECURSIVE delete because every one of them either has
 * subcollections today (users/{uid}/moods, /goals, /moderationHistory;
 * rateLimits/{uid}/requests; notificationLog/{uid}/{category}) or is one
 * feature away from having them, and a plain document delete strands those.
 */
const UID_KEYED_DOC_TREES = [
  "userPrivate",
  "sleepRoutines",
  "notificationPreferences",
  "rateLimits",
  "notificationLog",
  "users",
];

/**
 * Parent collections whose per-document `completions` subcollection has to be
 * swept BEFORE the parents are deleted — once the parent row is gone there is
 * no query that finds its children.
 *
 * Both are owned by a `userId` field on the PARENT, which is why the parents
 * themselves sit in USERID_FIELD_COLLECTIONS and only the children are here.
 */
const PARENT_SUBCOLLECTIONS = [
  {collection: "habits", subcollection: "completions"},
  {collection: "routines", subcollection: "completions"},
];

/**
 * Delete every document a query matches, in batches of BATCH_LIMIT.
 *
 * Re-runs the SAME query after each commit rather than paging with a cursor:
 * the committed deletes remove those rows from the result set, so the next
 * page is always fresh and the loop converges. A cursor would be wrong here —
 * it would page forward while the collection shrank underneath it.
 *
 * @param {FirebaseFirestore.Firestore} db
 * @param {FirebaseFirestore.Query} query
 * @return {Promise<number>} documents deleted
 */
async function deleteQueryBatched(db, query) {
  let total = 0;
  let snapshot = await query.limit(BATCH_LIMIT).get();
  while (!snapshot.empty) {
    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    total += snapshot.size;
    // A short page is the last page: fewer than the limit matched, and the
    // commit just removed all of them.
    if (snapshot.size < BATCH_LIMIT) break;
    snapshot = await query.limit(BATCH_LIMIT).get();
  }
  return total;
}

/**
 * Delete a document and everything beneath it.
 *
 * Uses the Admin SDK's recursiveDelete, which walks subcollections the client
 * SDK cannot even enumerate. Deleting a document that does not exist is a
 * no-op, which is the normal case on a re-run and for a user who never wrote
 * the row at all.
 *
 * @param {FirebaseFirestore.Firestore} db
 * @param {FirebaseFirestore.DocumentReference} ref
 * @return {Promise<void>}
 */
async function deleteDocTree(db, ref) {
  await db.recursiveDelete(ref);
}

/**
 * Run one named step, recording its outcome instead of throwing.
 *
 * @param {Array<Object>} failures accumulator, appended to on error
 * @param {Object} counts accumulator, step name to documents deleted
 * @param {string} name
 * @param {function(): Promise<number|undefined>} fn
 * @return {Promise<void>}
 */
async function runStep(failures, counts, name, fn) {
  try {
    const deleted = await fn();
    if (typeof deleted === "number" && deleted > 0) {
      counts[name] = (counts[name] || 0) + deleted;
    }
  } catch (err) {
    failures.push({step: name, message: err.message});
  }
}

/**
 * Delete every Firestore document belonging to a user.
 *
 * Does NOT touch the Auth record — see deleteAccountCompletely for the order
 * and why it matters.
 *
 * @param {FirebaseFirestore.Firestore} db
 * @param {string} uid
 * @return {Promise<{counts: Object, failures: Array<Object>}>}
 */
async function deleteUserFirestoreData(db, uid) {
  const failures = [];
  const counts = {};

  // 1. Subcollections under parents this sweep is about to delete. These run
  //    FIRST because they are reachable only while their parents exist.
  for (const {collection, subcollection} of PARENT_SUBCOLLECTIONS) {
    const name = collection + "/*/" + subcollection;
    await runStep(failures, counts, name, async () => {
      const parents = await db.collection(collection)
          .where("userId", "==", uid).get();
      let deleted = 0;
      for (const parent of parents.docs) {
        deleted += await deleteQueryBatched(
            db, parent.ref.collection(subcollection),
        );
      }
      return deleted;
    });
  }

  // 2. Owner-on-userId-field collections.
  for (const collection of USERID_FIELD_COLLECTIONS) {
    await runStep(failures, counts, collection, () => deleteQueryBatched(
        db, db.collection(collection).where("userId", "==", uid),
    ));
  }

  // 3. Owner under some other field name.
  for (const {collection, field} of OWNER_FIELD_COLLECTIONS) {
    const name = collection + "." + field;
    await runStep(failures, counts, name, () => deleteQueryBatched(
        db, db.collection(collection).where(field, "==", uid),
    ));
  }

  // 4. Array membership that means ownership (a conversation, a connection
  //    between two people).
  for (const {collection, field} of ARRAY_MEMBER_COLLECTIONS) {
    const name = collection + "." + field;
    await runStep(failures, counts, name, () => deleteQueryBatched(
        db, db.collection(collection).where(field, "array-contains", uid),
    ));
  }

  // 5. Shared documents the uid is merely listed in: remove the uid, keep the
  //    document. Read-modify-write rather than arrayRemove so the same path
  //    works whatever else the document holds.
  for (const {collection, field} of MEMBERSHIP_ARRAYS) {
    const name = collection + "." + field + "[-uid]";
    await runStep(failures, counts, name, async () => {
      const snap = await db.collection(collection)
          .where(field, "array-contains", uid).get();
      for (const doc of snap.docs) {
        const members = doc.data()[field] || [];
        await doc.ref.update({[field]: members.filter((m) => m !== uid)});
      }
      return snap.size;
    });
  }

  // 6. uid-keyed document trees, users/{uid} last.
  for (const collection of UID_KEYED_DOC_TREES) {
    const name = collection + "/{uid}";
    await runStep(failures, counts, name, () => deleteDocTree(
        db, db.collection(collection).doc(uid),
    ));
  }

  return {counts, failures};
}

/**
 * Delete a user's Firestore data and then their Auth record.
 *
 * ORDER IS LOAD-BEARING. Auth goes last and only after a fully clean Firestore
 * pass, because the Auth record is what lets the user call this function
 * again. Delete it after a partial sweep and the leftover data becomes
 * undeletable by any path the user has — recovery would need a console
 * operator. Deleting it last makes the retry button the recovery path.
 *
 * @param {FirebaseFirestore.Firestore} db
 * @param {Object} auth an admin.auth() instance
 * @param {string} uid
 * @return {Promise<{counts: Object, failures: Array<Object>,
 *   authDeleted: boolean}>}
 */
async function deleteAccountCompletely(db, auth, uid) {
  const {counts, failures} = await deleteUserFirestoreData(db, uid);

  if (failures.length > 0) {
    return {counts, failures, authDeleted: false};
  }

  try {
    await auth.deleteUser(uid);
  } catch (err) {
    // A re-run reaches here with the Auth record already gone. That is the
    // success case for an idempotent delete, not a failure — anything else
    // is reported.
    if (err.code !== "auth/user-not-found") {
      return {
        counts,
        failures: [{step: "auth", message: err.message}],
        authDeleted: false,
      };
    }
  }

  return {counts, failures, authDeleted: true};
}

module.exports = {
  BATCH_LIMIT,
  USERID_FIELD_COLLECTIONS,
  OWNER_FIELD_COLLECTIONS,
  ARRAY_MEMBER_COLLECTIONS,
  MEMBERSHIP_ARRAYS,
  UID_KEYED_DOC_TREES,
  PARENT_SUBCOLLECTIONS,
  deleteQueryBatched,
  deleteUserFirestoreData,
  deleteAccountCompletely,
};
