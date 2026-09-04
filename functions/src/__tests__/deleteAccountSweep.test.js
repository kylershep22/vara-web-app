/**
 * deleteAccount's sweep, run against the Firestore and Auth EMULATORS.
 *
 * WHY AN EMULATOR AND NOT A FAKE. The sibling suite
 * (deleteAccountCleanup.test.js) asserts that collection names appear on the
 * manifest. That is worth having and it is not evidence: a name on a list
 * proves nothing about whether a document disappears. This suite seeds real
 * documents into a real Firestore, runs the real sweep, and reads back. It is
 * the only thing in the repo that can catch a query that silently matches
 * nothing - the exact failure mode that would leave the privacy policy's
 * 30-day removal promise unmet while every test stayed green.
 *
 * NO SKIP-IF-UNAVAILABLE. If the emulator is not up this suite THROWS rather
 * than skipping. A skipped deletion test reads as a clean run in CI, which is
 * the vacuous green this project has been bitten by before. `npm test` runs
 * the whole suite under `firebase emulators:exec`, so the emulator is always
 * there; if it is not, that is a broken harness and it should look broken.
 *
 * THE PRODUCTION-DATA GUARD below is not paranoia. This file's whole job is
 * deleting users. Without FIRESTORE_EMULATOR_HOST set, firebase-admin talks to
 * the real project, and a passing test run would be a mass deletion.
 */

const admin = require("firebase-admin");

const {
  USERID_FIELD_COLLECTIONS,
  OWNER_FIELD_COLLECTIONS,
  ARRAY_MEMBER_COLLECTIONS,
  MEMBERSHIP_ARRAYS,
  UID_KEYED_DOC_TREES,
  PARENT_SUBCOLLECTIONS,
  BATCH_LIMIT,
  deleteUserFirestoreData,
  deleteAccountCompletely,
} = require("../lib/accountDeletion");

// ---------------------------------------------------------------------------
// Production-data guard. Runs at module load, before anything can connect.
// ---------------------------------------------------------------------------
if (!process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error(
      "FIRESTORE_EMULATOR_HOST is not set. This suite deletes users and must " +
    "never reach a real project. Run it via `npm test` in functions/, which " +
    "wraps jest in `firebase emulators:exec --only firestore,auth`.",
  );
}
if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  throw new Error(
      "FIREBASE_AUTH_EMULATOR_HOST is not set. The Auth emulator is required " +
    "so admin.auth().deleteUser() cannot reach a real project.",
  );
}

admin.initializeApp({projectId: process.env.GCLOUD_PROJECT || "vara-emulator"});
const db = admin.firestore();
const auth = admin.auth();

jest.setTimeout(120000);

/** Unique uid per test, so tests cannot see each other's leftovers. */
let counter = 0;
/** @return {string} */
function freshUid() {
  counter += 1;
  return `sweep-uid-${Date.now()}-${counter}`;
}

/**
 * Seed one document into every target the manifests name, for one user.
 *
 * Deliberately writes through the plain document API rather than the
 * services: this suite is asserting what the SWEEP reaches, and routing the
 * seed through the same abstractions the sweep uses would let a shared
 * mistake cancel itself out.
 *
 * @param {string} uid
 * @return {Promise<void>}
 */
async function seedUser(uid) {
  const writes = [];

  for (const collection of USERID_FIELD_COLLECTIONS) {
    writes.push(db.collection(collection).doc(`${uid}_seed`).set({
      userId: uid, note: "seeded",
    }));
  }

  for (const {collection, field} of OWNER_FIELD_COLLECTIONS) {
    writes.push(db.collection(collection).doc(`${uid}_${field}`).set({
      [field]: uid, note: "seeded",
    }));
  }

  for (const {collection, field} of ARRAY_MEMBER_COLLECTIONS) {
    writes.push(db.collection(collection).doc(`${uid}_${field}`).set({
      [field]: [uid, "someone-else"], note: "seeded",
    }));
  }

  for (const collection of UID_KEYED_DOC_TREES) {
    writes.push(db.collection(collection).doc(uid).set({note: "seeded"}));
  }

  // Subcollections under uid-keyed documents.
  writes.push(db.collection("users").doc(uid)
      .collection("moods").doc("m1").set({mood: "ok"}));
  writes.push(db.collection("users").doc(uid)
      .collection("goals").doc("g1").set({title: "legacy"}));
  writes.push(db.collection("users").doc(uid)
      .collection("moderationHistory").doc("h1").set({action: "warn"}));
  writes.push(db.collection("rateLimits").doc(uid)
      .collection("requests").doc("journalPrompt").set({count: 3}));
  writes.push(db.collection("notificationLog").doc(uid)
      .collection("dailyRhythm").doc("2026-09-04").set({sent: true}));
  writes.push(db.collection("notificationLog").doc(uid)
      .collection("habitReminder").doc("r1").set({sent: true}));

  // Subcollections under parents the sweep deletes. The parent documents were
  // already seeded above by USERID_FIELD_COLLECTIONS.
  for (const {collection, subcollection} of PARENT_SUBCOLLECTIONS) {
    writes.push(db.collection(collection).doc(`${uid}_seed`)
        .collection(subcollection).doc("c1").set({done: true}));
  }

  // Shared documents the uid is only listed in.
  for (const {collection, field} of MEMBERSHIP_ARRAYS) {
    writes.push(db.collection(collection).doc(`shared_${uid}`).set({
      [field]: ["bystander-uid", uid], ownerId: "bystander-uid",
    }));
  }

  await Promise.all(writes);
}

/**
 * Every document still readable for a uid, as "collection/docId" strings.
 *
 * @param {string} uid
 * @return {Promise<Array<string>>}
 */
async function survivingDocs(uid) {
  const found = [];

  for (const collection of USERID_FIELD_COLLECTIONS) {
    const snap = await db.collection(collection)
        .where("userId", "==", uid).get();
    snap.docs.forEach((d) => found.push(`${collection}/${d.id}`));
  }
  for (const {collection, field} of OWNER_FIELD_COLLECTIONS) {
    const snap = await db.collection(collection).where(field, "==", uid).get();
    snap.docs.forEach((d) => found.push(`${collection}.${field}/${d.id}`));
  }
  for (const {collection, field} of ARRAY_MEMBER_COLLECTIONS) {
    const snap = await db.collection(collection)
        .where(field, "array-contains", uid).get();
    snap.docs.forEach((d) => found.push(`${collection}.${field}/${d.id}`));
  }
  for (const collection of UID_KEYED_DOC_TREES) {
    const snap = await db.collection(collection).doc(uid).get();
    if (snap.exists) found.push(`${collection}/${uid}`);
  }
  return found;
}

/**
 * Documents under uid-rooted or parent-rooted subcollections, as paths.
 *
 * Listed explicitly rather than derived, because the whole point of this
 * check is that deleting a parent document does NOT delete its children.
 *
 * @param {string} uid
 * @return {Promise<Array<string>>}
 */
async function survivingSubDocs(uid) {
  const paths = [
    `users/${uid}/moods`,
    `users/${uid}/goals`,
    `users/${uid}/moderationHistory`,
    `rateLimits/${uid}/requests`,
    `notificationLog/${uid}/dailyRhythm`,
    `notificationLog/${uid}/habitReminder`,
    `habits/${uid}_seed/completions`,
    `routines/${uid}_seed/completions`,
  ];
  const found = [];
  for (const path of paths) {
    const snap = await db.collection(path).get();
    snap.docs.forEach((d) => found.push(`${path}/${d.id}`));
  }
  return found;
}

describe("deleteAccount sweep (emulated Firestore)", () => {
  describe("a fully seeded account", () => {
    const uid = freshUid();
    let result;

    beforeAll(async () => {
      await seedUser(uid);
      // Prove the seed landed, or every "is now empty" assertion below is
      // vacuously true and this suite proves nothing.
      const before = await survivingDocs(uid);
      expect(before.length).toBeGreaterThan(60);
      const subsBefore = await survivingSubDocs(uid);
      expect(subsBefore.length).toBe(8);

      await auth.createUser({uid, email: `${uid}@example.test`});
      result = await deleteAccountCompletely(db, auth, uid);
    });

    it("reports no failures and deletes the Auth record", async () => {
      expect(result.failures).toEqual([]);
      expect(result.authDeleted).toBe(true);
      await expect(auth.getUser(uid)).rejects.toThrow();
    });

    it("leaves no document in any swept collection", async () => {
      expect(await survivingDocs(uid)).toEqual([]);
    });

    it("leaves no document in any swept subcollection", async () => {
      // Deleting habits/{id} does not delete habits/{id}/completions, and
      // deleting users/{uid} does not delete users/{uid}/moods. Both were
      // orphaned before this slice.
      expect(await survivingSubDocs(uid)).toEqual([]);
    });

    it("counts a deletion for every collection it swept", () => {
      // A zero-count collection here would mean the query matched nothing
      // despite the seed - the silent-miss failure mode.
      for (const collection of USERID_FIELD_COLLECTIONS) {
        expect(result.counts[collection]).toBe(1);
      }
    });
  });

  it("deletes a legacy auto-ID weeklyCycles document", async () => {
    // weeklyCycles rows are `${uid}_${weekStart}` today but were auto-ID
    // before that convention, and beta accounts hold the auto-ID ones. An ID
    // reconstruction sweep would miss exactly these; the userId query does
    // not, which is why the sweep is query-based.
    const uid = freshUid();
    const legacy = await db.collection("weeklyCycles").add({
      userId: uid, weekStart: "2026-01-05", note: "legacy auto-id",
    });
    await db.collection("weeklyCycles").doc(`${uid}_2026-08-31`).set({
      userId: uid, weekStart: "2026-08-31",
    });
    expect(legacy.id).not.toContain(uid);

    const {counts, failures} = await deleteUserFirestoreData(db, uid);

    expect(failures).toEqual([]);
    expect(counts.weeklyCycles).toBe(2);
    expect((await legacy.get()).exists).toBe(false);
    const remaining = await db.collection("weeklyCycles")
        .where("userId", "==", uid).get();
    expect(remaining.empty).toBe(true);
  });

  it("does not touch another user's data", async () => {
    const victim = freshUid();
    const bystander = freshUid();
    await seedUser(victim);
    await seedUser(bystander);

    await deleteUserFirestoreData(db, victim);

    expect(await survivingDocs(victim)).toEqual([]);
    const survived = await survivingDocs(bystander);
    expect(survived.length).toBeGreaterThan(60);
    expect(await survivingSubDocs(bystander)).toHaveLength(8);
  });

  it("removes the uid from shared arrays without deleting the document", async () => {
    // Deleting a group because one member closed their account would destroy
    // everyone else's content.
    const uid = freshUid();
    await seedUser(uid);

    await deleteUserFirestoreData(db, uid);

    for (const {collection, field} of MEMBERSHIP_ARRAYS) {
      const snap = await db.collection(collection).doc(`shared_${uid}`).get();
      expect(snap.exists).toBe(true);
      expect(snap.data()[field]).toEqual(["bystander-uid"]);
    }
  });

  it("deletes past a single 500-document batch", async () => {
    // The sweep re-runs the same query after each commit rather than paging
    // with a cursor. This is the test that the loop actually converges rather
    // than stopping at the batch limit.
    const uid = freshUid();
    const total = BATCH_LIMIT + 1;
    let writer = db.batch();
    for (let i = 0; i < total; i += 1) {
      writer.set(db.collection("capturedTasks").doc(`${uid}_${i}`), {
        userId: uid, name: `t${i}`,
      });
      if ((i + 1) % BATCH_LIMIT === 0) {
        await writer.commit();
        writer = db.batch();
      }
    }
    await writer.commit();

    const {counts, failures} = await deleteUserFirestoreData(db, uid);

    expect(failures).toEqual([]);
    expect(counts.capturedTasks).toBe(total);
    const left = await db.collection("capturedTasks")
        .where("userId", "==", uid).get();
    expect(left.empty).toBe(true);
  });

  it("is idempotent: a second run succeeds and deletes nothing", async () => {
    const uid = freshUid();
    await seedUser(uid);
    await auth.createUser({uid, email: `${uid}@example.test`});

    const first = await deleteAccountCompletely(db, auth, uid);
    expect(first.failures).toEqual([]);
    expect(Object.keys(first.counts).length).toBeGreaterThan(60);

    const second = await deleteAccountCompletely(db, auth, uid);

    expect(second.failures).toEqual([]);
    // Nothing left to delete, and the already-missing Auth record is the
    // success case rather than an error.
    expect(second.counts).toEqual({});
    expect(second.authDeleted).toBe(true);
  });

  it("survives a partial failure and completes on re-run", async () => {
    // The recovery path in one test: one collection is made to fail, the run
    // reports it, the Auth record is left alive so the user can retry, every
    // OTHER collection is still swept, and the retry finishes the job.
    const uid = freshUid();
    await seedUser(uid);
    await auth.createUser({uid, email: `${uid}@example.test`});

    /**
     * `db` with one collection's queries broken.
     *
     * A Proxy rather than a hand-written double: everything except the one
     * poisoned collection must behave exactly as the real client does, or
     * "every other collection was still swept" would not be a real claim.
     *
     * @param {string} broken collection name to break
     * @return {Object} a db-shaped object
     */
    function dbWithBrokenCollection(broken) {
      return new Proxy(db, {
        get(target, prop, receiver) {
          if (prop === "collection") {
            return (name) => {
              if (name === broken) {
                throw new Error(`simulated Firestore outage on ${name}`);
              }
              return target.collection(name);
            };
          }
          const value = Reflect.get(target, prop, receiver);
          return typeof value === "function" ? value.bind(target) : value;
        },
      });
    }

    const faulted = await deleteAccountCompletely(
        dbWithBrokenCollection("dayBlocks"), auth, uid,
    );

    expect(faulted.authDeleted).toBe(false);
    expect(faulted.failures).toEqual([
      {step: "dayBlocks", message: "simulated Firestore outage on dayBlocks"},
    ]);
    // The Auth record survives, which is what makes the retry possible.
    await expect(auth.getUser(uid)).resolves.toBeTruthy();
    // One broken collection did not pin the ones after it in the list.
    const stranded = await survivingDocs(uid);
    expect(stranded).toEqual([`dayBlocks/${uid}_seed`]);

    const retry = await deleteAccountCompletely(db, auth, uid);

    expect(retry.failures).toEqual([]);
    expect(retry.counts).toEqual({dayBlocks: 1});
    expect(retry.authDeleted).toBe(true);
    expect(await survivingDocs(uid)).toEqual([]);
    await expect(auth.getUser(uid)).rejects.toThrow();
  });
});
