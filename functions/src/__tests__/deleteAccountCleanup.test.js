/**
 * deleteAccount's cleanup MANIFEST, asserted against the exported lists.
 *
 * WHY THIS NO LONGER READS SOURCE TEXT. The previous version of this file
 * regex-parsed `const personalCollections = [...]` out of functions/index.js,
 * because the array was a local inside an onCall handler and there was nothing
 * importable to assert against. The sweep now lives in src/lib/accountDeletion,
 * which exports its manifest, so the test reads the same values the deployed
 * code iterates. The header note it used to carry — "repoint this test rather
 * than deleting it" — is what happened here.
 *
 * WHAT IT IS REALLY GUARDING. A collection added to the app but not to a
 * manifest survives account deletion silently: no error, no log, just orphaned
 * personal data. Nothing else in the repo notices. This suite is the cheap
 * always-on half of that guard; deleteAccountSweep.test.js is the half that
 * proves documents actually disappear.
 */

const {
  USERID_FIELD_COLLECTIONS,
  OWNER_FIELD_COLLECTIONS,
  ARRAY_MEMBER_COLLECTIONS,
  MEMBERSHIP_ARRAYS,
  UID_KEYED_DOC_TREES,
  PARENT_SUBCOLLECTIONS,
} = require("../lib/accountDeletion");

/** Every collection name any manifest mentions. */
function allSweptCollections() {
  return [
    ...USERID_FIELD_COLLECTIONS,
    ...OWNER_FIELD_COLLECTIONS.map((e) => e.collection),
    ...ARRAY_MEMBER_COLLECTIONS.map((e) => e.collection),
    ...UID_KEYED_DOC_TREES,
    ...PARENT_SUBCOLLECTIONS.map((e) => e.collection),
  ];
}

describe("deleteAccount cleanup manifest", () => {
  it("is non-trivial (guards against a vacuous pass)", () => {
    // Without this, a manifest that had been emptied or renamed to nothing
    // would make every `toContain` below fail loudly rather than pass
    // quietly - but a future rewrite towards `.every` style assertions would
    // not. Pin the shape here so the guard survives that rewrite.
    expect(Array.isArray(USERID_FIELD_COLLECTIONS)).toBe(true);
    expect(USERID_FIELD_COLLECTIONS.length).toBeGreaterThan(45);
    expect(OWNER_FIELD_COLLECTIONS.length).toBeGreaterThan(10);
    expect(UID_KEYED_DOC_TREES.length).toBeGreaterThan(4);
  });

  it("still sweeps the collections it swept before", () => {
    // A spot check, not the full list: the point is that restructuring the
    // manifest into three shapes did not drop any of the original entries.
    for (const expected of [
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
      "journeyStates",
    ]) {
      expect(USERID_FIELD_COLLECTIONS).toContain(expected);
    }
  });

  it("sweeps journeyStates, so a journey does not outlive the account", () => {
    // journeyStates carries phase history and the destination the user chose.
    // It is keyed by uid as its document ID and also carries a userId field,
    // which is what makes this `where userId ==` sweep reach it.
    expect(USERID_FIELD_COLLECTIONS).toContain("journeyStates");
  });

  it("sweeps every behavioural collection the audit found missing", () => {
    // The seven the roadmap tracked, plus the five its note did not know
    // about. These are the collections that survived deletion indefinitely
    // before this slice - each one is a standing breach of the 30-day promise
    // if it drops off the list again.
    for (const expected of [
      "brainStateCheckIns", "protocolSessions", "dailyReflections",
      "weeklyCycles", "dailyLogs", "downshiftEvents",
      "dayBlocks", "capturedTasks",
      "analyticsEvents", "notificationPreferences", "memberships",
      "hiddenPosts",
    ]) {
      expect(USERID_FIELD_COLLECTIONS).toContain(expected);
    }
  });

  it("sweeps posts by authorId as well as userId", () => {
    // The mobile client stamps both fields, the web client stamps authorId
    // only. Sweeping userId alone leaves every web-authored post standing.
    const postFields = OWNER_FIELD_COLLECTIONS
        .filter((e) => e.collection === "posts")
        .map((e) => e.field);
    expect(postFields).toContain("userId");
    expect(postFields).toContain("authorId");
  });

  it("sweeps both sides of every invite pair", () => {
    // A pending invite names an inviter and an invitee; the deleted account
    // may be either, and only sweeping one side strands half the rows.
    const pairs = {
      groupInvites: ["inviterId", "inviteeId"],
      challengeInvites: ["inviterId", "inviteeId"],
      connectionInvites: ["from", "to"],
    };
    for (const [collection, fields] of Object.entries(pairs)) {
      const swept = OWNER_FIELD_COLLECTIONS
          .filter((e) => e.collection === collection)
          .map((e) => e.field);
      expect(swept.sort()).toEqual(fields.sort());
    }
  });

  it("recursively deletes every uid-keyed document tree", () => {
    // Each of these has, or is one feature away from having, subcollections.
    // A plain document delete strands them permanently.
    for (const expected of [
      "users", "userPrivate", "sleepRoutines", "notificationPreferences",
      "rateLimits", "notificationLog",
    ]) {
      expect(UID_KEYED_DOC_TREES).toContain(expected);
    }
  });

  it("deletes users/{uid} last of the uid-keyed trees", () => {
    // users/{uid} is what the rest of the app reads as "this account exists".
    expect(UID_KEYED_DOC_TREES[UID_KEYED_DOC_TREES.length - 1]).toBe("users");
  });

  it("sweeps completions subcollections whose parents it deletes", () => {
    const parents = PARENT_SUBCOLLECTIONS.map((e) => e.collection);
    expect(parents).toContain("habits");
    expect(parents).toContain("routines");
    for (const entry of PARENT_SUBCOLLECTIONS) {
      expect(entry.subcollection).toBe("completions");
      // The parent must itself be swept, or the subcollection pass is
      // reaching for documents nothing ever deletes.
      expect(USERID_FIELD_COLLECTIONS).toContain(entry.collection);
    }
  });

  it("strips the uid from shared arrays instead of deleting the document", () => {
    // Deleting a group because one member closed their account would destroy
    // everyone else's content. These two are the only shared-array cases.
    const shared = MEMBERSHIP_ARRAYS.map((e) => e.collection);
    expect(shared).toContain("groups");
    expect(shared).toContain("challenges");
    // ...and they must NOT also be on a delete list.
    for (const collection of shared) {
      expect(USERID_FIELD_COLLECTIONS).not.toContain(collection);
      expect(OWNER_FIELD_COLLECTIONS.map((e) => e.collection))
          .not.toContain(collection);
    }
  });

  it("lists every userId-field collection exactly once", () => {
    expect(new Set(USERID_FIELD_COLLECTIONS).size)
        .toBe(USERID_FIELD_COLLECTIONS.length);
  });

  it("lists every (collection, field) owner pair exactly once", () => {
    const keys = OWNER_FIELD_COLLECTIONS.map((e) => e.collection + "." + e.field);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("never sweeps a shared-content collection", () => {
    // These hold admin-authored content shared by every user. Deleting rows
    // from them on an account deletion would take the library down for
    // everybody, which is the opposite failure to the one this slice fixes.
    const swept = new Set(allSweptCollections());
    for (const shared of [
      "puzzles", "wellnessLibrary", "tags", "masterclasses", "audioLibrary",
      "educationalContent", "movementContent", "config", "events",
      "organizations", "adminAnalytics", "groupPrompts",
    ]) {
      expect(swept.has(shared)).toBe(false);
    }
  });
});
