#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Beta Cohort Reset — combined grandfather + onboarding-reset migration.
 *
 * ONE-TIME, IRREVERSIBLE migration that prepares the entire beta cohort
 * (<30 users) to re-experience the new stress-recovery onboarding flow on
 * the next TestFlight build.
 *
 * Per user it (a) flips hasCompletedOnboarding=false, (b) clears the resume
 * pointers / collected onboarding inputs, (c) clears the scheduled daily
 * reminder, (d) grandfathers the Firestore subscription to event access, and
 * (e) HARD-DELETES the user's derived wellness data (habits, journal,
 * check-ins, sessions, etc.). Firebase Auth accounts and RevenueCat state are
 * never touched.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * SAFETY MODEL
 *   - Default mode is DRY-RUN. Reads everything, writes nothing.
 *   - --apply runs for real, but ONLY after an interactive prompt that
 *     requires the exact string CONFIRM to be typed.
 *   - --user <UID> targets a single account (combinable with --apply) so the
 *     real run can be validated on one user before the cohort.
 *   - Idempotent: re-running produces the same end state (sets are absolute,
 *     deletes are no-ops when already gone, grandfather only fires for
 *     non-privileged source types).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️  CONFIG BELOW REQUIRES KYLE'S SIGN-OFF BEFORE ANY --apply RUN.
 *     The dry-run is safe to run now; it only reads. The PURGE_COLLECTIONS
 *     list, the GRANDFATHER window, and the dailyReminders interpretation are
 *     decisions flagged in the Phase-1 report. Do not --apply until they are
 *     confirmed. See README.md "Open decisions".
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Usage:
 *   node migrate.js                     # dry-run, whole cohort
 *   node migrate.js --user <uid>        # dry-run, single user
 *   node migrate.js --backup            # read-only JSON snapshot, whole cohort
 *   node migrate.js --backup --user <uid># read-only JSON snapshot, single user
 *   node migrate.js --apply             # REAL run, whole cohort (prompts CONFIRM)
 *   node migrate.js --apply --user <uid># REAL run, single user (prompts CONFIRM)
 *   node migrate.js --key /path/key.json# override service-account key path
 *
 * --backup captures every doc + field about to be modified or deleted (full
 * user doc, full notificationPreferences doc, and every purgeable doc incl.
 * habit/routine completions and legacy users/{uid}/moods+goals) to a
 * timestamped JSON file under backups/. Read-only; never writes. Privileged
 * users get a minimal {uid,email,subscriptionType} entry only.
 */

const path = require('path');
const fs = require('fs');
const readline = require('readline');
const admin = require('firebase-admin');

// ===========================================================================
// CONFIG — ⚠️ NEEDS SIGN-OFF (see report "Open decisions")
// ===========================================================================

// Service-account key. Defaults to the gitignored key already in scripts/.
const DEFAULT_KEY_PATH = path.join(__dirname, '..', '..', 'serviceAccountKey.json');

// --- Privileged users: EXCLUDED FROM EVERYTHING -------------------------
// Locked decision (Phase-1 review): users on these tiers are skipped
// entirely — no onboarding reset, no notif-pref change, no data purge, no
// grandfather. They are logged as "SKIPPED (privileged)" and the loop
// `continue`s before any plan/write. (coaching is lifetime access; treat it
// the same as premium/event for exclusion safety.)
const PRIVILEGED_TYPES = ['premium', 'event', 'coaching'];

// --- (d) Grandfather subscription ---------------------------------------
// Source types that get upgraded to event access. Privileged tiers
// (premium / coaching / already-event) are NEVER downgraded — and per the
// locked decision above they're skipped wholesale, so they never reach here.
// NOTE: under Model A new signups bootstrap to type:'none', NOT 'trial'.
const GRANDFATHER = {
  fromTypes: ['none', 'trial', 'expired'], // ⚠️ confirm against dry-run output
  eventDays: 365,                          // ⚠️ confirm the grandfather window
  eventName: 'Beta Grandfather',           // synthetic eventData.eventName
  eventCode: 'BETA',                       // synthetic eventData.eventCode
  eventId: 'beta-grandfather',             // synthetic eventData.eventId (no real /events doc)
};

// --- (a,b) User-doc onboarding fields to reset --------------------------
// Set hasCompletedOnboarding=false; delete the resume pointer and the
// collected stress-recovery inputs so the flow starts clean.
// firstShiftAt / intentPath are derived-from-deleted-data — flagged for a
// decision (default: also clear, to stay consistent with the data wipe).
const RESET_USER_DOC = {
  setFalse: ['hasCompletedOnboarding'],
  deleteFields: [
    'onboardingStep',              // resume pointer (onboardingStressRecovery.service.ts)
    'onboardingStressRecovery',    // collected inputs (initialState/stressors/peakWindow/recheck*)
    'firstShiftAt',                // ⚠️ derived from protocolSessions (being deleted)
    'intentPath',                  // ⚠️ onboarding-derived; readers default to 'default' when absent
  ],
};

// --- (c) Daily reminder reset -------------------------------------------
// The scheduled daily reminder lives in notificationPreferences/{uid}, NOT
// on the user doc. V2 reads dailyRhythm.reminderTime; the legacy
// `dailyReminders` field is vestigial. "No scheduled reminders" = null out
// dailyRhythm.reminderTime (the new Anchor onboarding screen re-sets it) and
// drop the legacy field. ⚠️ confirm this interpretation.
const RESET_NOTIF_PREFS = {
  setNull: ['dailyRhythm.reminderTime'],
  deleteFields: ['dailyReminders'],
};

// --- (e) Derived user-data collections to HARD-DELETE -------------------
// All are TOP-LEVEL collections keyed by a `userId` field unless noted.
// `docIdIsUid: true` => the doc id IS the uid (single doc, no query).
// `subcollections` => named subcollections under each matched doc to also
// recursively delete.
// ⚠️ THIS LIST IS THE BLAST RADIUS. Confirm every entry before apply.
const PURGE_COLLECTIONS = [
  // Habits & core tracking
  { name: 'habits', subcollections: ['completions'] },
  { name: 'habitCompletions' },
  { name: 'goals' },
  { name: 'tasks' },
  { name: 'journalEntries' },
  { name: 'journal_entries' },
  { name: 'joyMoments' },
  { name: 'fourThreeTwoOne' },
  // Brain-state / protocol engine (the new core loop's data)
  { name: 'brainStateCheckIns' },
  { name: 'protocolSessions' },
  { name: 'dailyReflections' },
  // Wellness score inputs
  { name: 'dailyWellnessScores' },
  { name: 'morningCheckIns' },
  { name: 'brainMetrics' },
  { name: 'brainHealthScores' },
  // Brain-health activity logs
  { name: 'neuroplasticitySignals' },
  { name: 'nervousSystemSessions' },
  { name: 'amccChallenges' },
  { name: 'focusSessions' },
  { name: 'puzzleCompletions' },
  // Sleep
  { name: 'sleepLogs' },
  { name: 'sleepRoutines', docIdIsUid: true },
  { name: 'sleepRoutineRuns' },
  { name: 'bedtimeRoutines' },
  // Routines
  { name: 'routines', subcollections: ['completions'] },
  { name: 'weeklyRecaps' },
  // Reflection / assessment surfaces
  { name: 'wheelOfLife' },
  { name: 'reflections' },
  { name: 'gratitudeEntries' },
  { name: 'emotionalCheckins' },
  { name: 'energyCheckins' },
  { name: 'cognitiveReframes' },
  { name: 'natureExposure' },
  { name: 'socialConnections' },
  { name: 'digitalWellbeing' },
  { name: 'masterclassProgress' },
  { name: 'audioListens' },
  { name: 'audioFavorites' },
  // Legacy subcollections under users/{uid}
  { name: 'users', docIdIsUid: true, subcollections: ['moods', 'goals'], userDocChildrenOnly: true },
];

// Collections intentionally NOT purged by default — social graph / content
// shared with OTHER users, or system state. Counted in the dry-run under
// "REVIEW (not purged)" so Kyle can decide. ⚠️ confirm preserve vs purge.
const REVIEW_NOT_PURGED = [
  'groups', 'posts', 'connections', 'connectionInvites', 'conversations',
  'directMessages', 'notifications', 'challengeParticipants', 'challengeCheckIns',
  'groupInvites', 'challengeInvites', 'hiddenPosts', 'mutedUsers', 'postReports',
];

// ===========================================================================
// ARG PARSING
// ===========================================================================

function parseArgs(argv) {
  const args = { apply: false, backup: false, user: null, keyPath: DEFAULT_KEY_PATH };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--apply') args.apply = true;
    else if (a === '--backup') args.backup = true;
    else if (a === '--user') args.user = argv[++i];
    else if (a === '--key') args.keyPath = path.resolve(argv[++i]);
    else if (a === '--help' || a === '-h') args.help = true;
    else {
      console.error(`Unknown argument: ${a}`);
      process.exit(1);
    }
  }
  return args;
}

// ===========================================================================
// HELPERS
// ===========================================================================

const CHUNK = 400; // < Firestore 500-write batch limit

async function promptConfirm(message) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(message, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// Count (and optionally delete) docs in a top-level collection owned by uid.
async function processOwnedCollection(db, col, uid, { apply }) {
  const ref = db.collection(col.name);
  let docs = [];

  if (col.docIdIsUid) {
    const snap = await ref.doc(uid).get();
    if (snap.exists) docs = [snap.ref];
  } else {
    const snap = await ref.where('userId', '==', uid).get();
    docs = snap.docs.map((d) => d.ref);
  }

  let subCounts = {};
  // Recursively delete named subcollections (count them too).
  if (col.subcollections && col.subcollections.length) {
    for (const sub of col.subcollections) {
      subCounts[sub] = 0;
      for (const docRef of docs) {
        const subSnap = await docRef.collection(sub).get();
        subCounts[sub] += subSnap.size;
        if (apply) {
          await deleteRefsInChunks(db, subSnap.docs.map((d) => d.ref));
        }
      }
    }
  }

  // For the users/{uid} legacy-subcollection case we only delete the
  // subcollections, NOT the parent user doc.
  if (apply && !col.userDocChildrenOnly) {
    await deleteRefsInChunks(db, docs);
  }

  return { count: col.userDocChildrenOnly ? 0 : docs.length, subCounts };
}

async function deleteRefsInChunks(db, refs) {
  for (let i = 0; i < refs.length; i += CHUNK) {
    const batch = db.batch();
    refs.slice(i, i + CHUNK).forEach((r) => batch.delete(r));
    await batch.commit();
  }
}

function planUserDocUpdate(userData) {
  const update = {};
  const log = { setFalse: [], deleted: [], grandfather: null };

  for (const f of RESET_USER_DOC.setFalse) {
    if (userData[f] !== false) {
      update[f] = false;
      log.setFalse.push(f);
    }
  }
  for (const f of RESET_USER_DOC.deleteFields) {
    if (userData[f] !== undefined) {
      update[f] = admin.firestore.FieldValue.delete();
      log.deleted.push(f);
    }
  }

  // Grandfather subscription.
  const currentType = userData?.subscription?.type ?? '(unset)';
  if (GRANDFATHER.fromTypes.includes(userData?.subscription?.type ?? 'none')) {
    const now = admin.firestore.Timestamp.now();
    const expires = admin.firestore.Timestamp.fromMillis(
      now.toMillis() + GRANDFATHER.eventDays * 24 * 60 * 60 * 1000
    );
    update['subscription.type'] = 'event';
    update['subscription.eventAccessExpiresAt'] = expires;
    update['subscription.eventGrantedAt'] = now;
    update['subscriptionType'] = 'event';
    update['hasActiveSubscription'] = true;
    // Only stamp eventData if the user has none (idempotent / non-clobbering).
    if (!userData.eventData) {
      update['eventData'] = {
        eventId: GRANDFATHER.eventId,
        eventCode: GRANDFATHER.eventCode,
        eventName: GRANDFATHER.eventName,
        joinedAt: now,
      };
    }
    log.grandfather = { from: currentType, to: 'event', expiresInDays: GRANDFATHER.eventDays };
  } else {
    log.grandfather = { from: currentType, to: currentType, skipped: 'privileged or out-of-scope type' };
  }

  return { update, log };
}

function planNotifPrefsUpdate(prefsData) {
  if (!prefsData) return { update: null, log: { exists: false } };
  const update = {};
  const log = { setNull: [], deleted: [] };
  for (const f of RESET_NOTIF_PREFS.setNull) {
    update[f] = null;
    log.setNull.push(f);
  }
  for (const f of RESET_NOTIF_PREFS.deleteFields) {
    if (prefsData[f] !== undefined) {
      update[f] = admin.firestore.FieldValue.delete();
      log.deleted.push(f);
    }
  }
  return { update, log: { exists: true, ...log } };
}

// ===========================================================================
// BACKUP (read-only snapshot)
// ===========================================================================

// Recursively convert Firestore-native types to plain, faithful, restorable
// JSON. Uses instanceof on the live objects (before JSON.stringify, so we
// don't depend on each type's toJSON()). Timestamps keep both an ISO string
// (readability) and seconds/nanoseconds (lossless restore).
function toSerializable(value) {
  if (value === null || value === undefined) return value;
  if (value instanceof admin.firestore.Timestamp) {
    return {
      __type: 'timestamp',
      iso: value.toDate().toISOString(),
      seconds: value.seconds,
      nanoseconds: value.nanoseconds,
    };
  }
  if (value instanceof admin.firestore.GeoPoint) {
    return { __type: 'geopoint', latitude: value.latitude, longitude: value.longitude };
  }
  if (value instanceof admin.firestore.DocumentReference) {
    return { __type: 'docref', path: value.path };
  }
  if (Buffer.isBuffer(value)) {
    return { __type: 'bytes', base64: value.toString('base64') };
  }
  if (Array.isArray(value)) return value.map(toSerializable);
  if (typeof value === 'object') {
    const out = {};
    for (const k of Object.keys(value)) out[k] = toSerializable(value[k]);
    return out;
  }
  return value;
}

// Capture (read-only) every purgeable doc for a user across PURGE_COLLECTIONS,
// including named subcollections (habit/routine completions) nested under
// their parent, and the legacy users/{uid}/moods + /goals (without the parent
// user doc, which is captured separately as userDocBefore). Returns the
// collection-keyed map plus a total doc count that matches the dry-run purge
// total for the same user.
async function captureUserPurgedDocs(db, uid) {
  const out = {};
  let totalDocs = 0;

  for (const col of PURGE_COLLECTIONS) {
    let docSnaps = [];
    if (col.docIdIsUid) {
      const snap = await db.collection(col.name).doc(uid).get();
      if (snap.exists) docSnaps = [snap];
    } else {
      const snap = await db.collection(col.name).where('userId', '==', uid).get();
      docSnaps = snap.docs;
    }

    const items = [];
    for (const snap of docSnaps) {
      const entry = { id: snap.id };
      if (!col.userDocChildrenOnly) entry.data = toSerializable(snap.data());

      let subHadDocs = false;
      if (col.subcollections && col.subcollections.length) {
        for (const sub of col.subcollections) {
          const subSnap = await snap.ref.collection(sub).get();
          entry[sub] = subSnap.docs.map((d) => ({ id: d.id, data: toSerializable(d.data()) }));
          totalDocs += entry[sub].length;
          if (entry[sub].length) subHadDocs = true;
        }
      }

      if (col.userDocChildrenOnly) {
        // Only the legacy subcollections are purged here, never the user doc.
        if (subHadDocs) items.push(entry);
      } else {
        totalDocs += 1; // the doc itself
        items.push(entry);
      }
    }
    if (items.length) out[col.name] = items;
  }

  return { collections: out, totalDocs };
}

async function runBackup(db, userDocs) {
  const backupsDir = path.join(__dirname, 'backups');
  fs.mkdirSync(backupsDir, { recursive: true });

  let scriptCommitHash = 'unknown';
  try {
    scriptCommitHash = require('child_process')
      .execSync('git rev-parse HEAD', { cwd: __dirname })
      .toString()
      .trim();
  } catch {
    // not a git checkout / git unavailable — leave 'unknown'
  }

  const users = [];
  let usersProcessed = 0;
  let usersSkipped = 0;
  let grandTotalDocs = 0;

  for (const userDoc of userDocs) {
    const uid = userDoc.id;
    const data = userDoc.data() || {};
    const subType = data?.subscription?.type ?? '(unset)';

    // Same exclusion list as --apply: privileged users are not touched, so we
    // only record a minimal snapshot entry (no data capture).
    if (PRIVILEGED_TYPES.includes(data?.subscription?.type)) {
      usersSkipped++;
      users.push({
        uid,
        email: data.email || null,
        status: 'skipped',
        subscriptionType: subType,
      });
      console.log(`  [skip] ${uid} (${data.email || 'no-email'}) — privileged: ${subType}`);
      continue;
    }

    usersProcessed++;
    const prefsSnap = await db.collection('notificationPreferences').doc(uid).get();
    const { collections, totalDocs } = await captureUserPurgedDocs(db, uid);
    grandTotalDocs += totalDocs;

    users.push({
      uid,
      email: data.email || null,
      status: 'processed',
      subscriptionType: subType,
      userDocBefore: toSerializable(data),
      notificationPreferencesBefore: prefsSnap.exists ? toSerializable(prefsSnap.data()) : null,
      purgedDocuments: collections,
    });
    console.log(`  [ok]   ${uid} (${data.email || 'no-email'}) — user doc + ` +
      `${prefsSnap.exists ? 'prefs' : 'no-prefs'} + ${totalDocs} purgeable doc(s)`);
  }

  const backup = {
    metadata: {
      timestamp: new Date().toISOString(),
      scriptCommitHash,
      totalUsersInCohort: userDocs.length,
      usersProcessed,
      usersSkipped,
      purgedCollections: PURGE_COLLECTIONS.map((c) => c.name),
    },
    users,
  };

  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-` +
    `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const outPath = path.join(backupsDir, `backup-${stamp}.json`);
  fs.writeFileSync(outPath, JSON.stringify(backup, null, 2));

  const bytes = fs.statSync(outPath).size;
  console.log('\n' + '═'.repeat(72));
  console.log('  BACKUP complete (read-only — no data was modified)');
  console.log('═'.repeat(72));
  console.log(`  File:                       ${outPath}`);
  console.log(`  Size:                       ${(bytes / 1024).toFixed(1)} KB (${bytes} bytes)`);
  console.log(`  Total users in scope:       ${userDocs.length}`);
  console.log(`  Users captured (processed): ${usersProcessed}`);
  console.log(`  Users minimal (skipped):    ${usersSkipped}`);
  console.log(`  Purgeable docs captured:    ${grandTotalDocs}`);
  console.log(`  Script commit:              ${scriptCommitHash}`);
  console.log('═'.repeat(72));
  return outPath;
}

// ===========================================================================
// MAIN
// ===========================================================================

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(1, 47).join('\n'));
    return;
  }

  if (args.backup && args.apply) {
    console.error('❌ --backup and --apply are mutually exclusive. --backup is read-only.');
    process.exit(1);
  }

  const mode = args.backup
    ? 'BACKUP (read-only snapshot)'
    : args.apply ? 'APPLY (REAL, IRREVERSIBLE)' : 'DRY-RUN (read-only)';
  console.log('═'.repeat(72));
  console.log('  Beta Cohort Reset migration');
  console.log(`  Mode:   ${mode}`);
  console.log(`  Target: ${args.user ? `single user ${args.user}` : 'ENTIRE cohort'}`);
  console.log('═'.repeat(72));

  if (!fs.existsSync(args.keyPath)) {
    console.error(`\n❌ Service-account key not found at:\n   ${args.keyPath}\n` +
      `   Pass --key <path> or place the key there. (Never commit it.)`);
    process.exit(1);
  }
  const serviceAccount = require(args.keyPath);

  if (args.apply) {
    console.log(`\n⚠️  You are about to PERMANENTLY modify and DELETE data in project`);
    console.log(`    "${serviceAccount.project_id}".`);
    console.log(`    This cannot be undone. Auth accounts and RevenueCat are not touched.\n`);
    const answer = await promptConfirm('    Type CONFIRM to proceed: ');
    if (answer !== 'CONFIRM') {
      console.log('\nAborted — confirmation string did not match. No changes made.');
      process.exit(0);
    }
    console.log('\nConfirmed. Proceeding…\n');
  }

  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  const db = admin.firestore();

  // Resolve target users.
  let userDocs;
  if (args.user) {
    const snap = await db.collection('users').doc(args.user).get();
    if (!snap.exists) {
      console.error(`\n❌ User ${args.user} not found in /users.`);
      process.exit(1);
    }
    userDocs = [snap];
  } else {
    const snap = await db.collection('users').get();
    userDocs = snap.docs;
  }

  console.log(`Found ${userDocs.length} user(s).\n`);

  // Backup mode: read-only snapshot, then exit before any dry-run/apply logic.
  if (args.backup) {
    await runBackup(db, userDocs);
    return;
  }

  const summary = {
    usersFound: userDocs.length,
    usersProcessed: 0,
    skippedPrivileged: 0,
    userDocFieldsModified: 0,
    grandfathered: 0,
    grandfatherSkipped: 0,
    notifPrefsModified: 0,
    purgeDocsDeleted: 0,
    anomalies: [],
    bySubscriptionType: {},
  };

  for (const userDoc of userDocs) {
    const uid = userDoc.id;
    const data = userDoc.data() || {};
    const subType = data?.subscription?.type ?? '(unset)';
    summary.bySubscriptionType[subType] = (summary.bySubscriptionType[subType] || 0) + 1;

    // Locked decision: privileged users are excluded from ALL operations.
    // Skip before any plan is computed or any read of their sub-data — no
    // onboarding reset, no notif-pref change, no purge, no grandfather.
    if (PRIVILEGED_TYPES.includes(data?.subscription?.type)) {
      console.log('─'.repeat(72));
      console.log(`USER ${uid}  (${data.email || 'no-email'})  — SKIPPED (privileged): ` +
        `subscription.type=${subType}`);
      summary.skippedPrivileged++;
      continue;
    }
    summary.usersProcessed++;

    console.log('─'.repeat(72));
    console.log(`USER ${uid}  (${data.email || 'no-email'})`);
    console.log(`  read: subscription.type=${subType}  subscriptionType=${data.subscriptionType ?? '(unset)'}` +
      `  hasActiveSubscription=${data.hasActiveSubscription ?? '(unset)'}  eventData=${data.eventData ? 'present' : 'none'}`);
    console.log(`  read: hasCompletedOnboarding=${data.hasCompletedOnboarding}` +
      `  onboardingStep=${data.onboardingStep ?? '(unset)'}` +
      `  onboardingStressRecovery=${data.onboardingStressRecovery ? 'present' : 'none'}` +
      `  firstShiftAt=${data.firstShiftAt ? 'set' : 'unset'}  intentPath=${data.intentPath ?? '(unset)'}`);

    // Anomaly checks.
    if (data.hasCompletedOnboarding === undefined) {
      summary.anomalies.push(`${uid}: hasCompletedOnboarding field is MISSING`);
    }
    if (!data.subscription || !data.subscription.type) {
      summary.anomalies.push(`${uid}: subscription/subscription.type MISSING (onUserCreate may not have run)`);
    }

    // Plan user-doc update.
    const { update: userUpdate, log: userLog } = planUserDocUpdate(data);
    if (userLog.setFalse.length || userLog.deleted.length) {
      console.log(`  user-doc: setFalse=[${userLog.setFalse}] deleteFields=[${userLog.deleted}]`);
      summary.userDocFieldsModified += userLog.setFalse.length + userLog.deleted.length;
    }
    if (userLog.grandfather && !userLog.grandfather.skipped) {
      console.log(`  grandfather: ${userLog.grandfather.from} → event (${GRANDFATHER.eventDays}d)`);
      summary.grandfathered++;
    } else {
      console.log(`  grandfather: SKIP (${userLog.grandfather.skipped}; type=${userLog.grandfather.from})`);
      summary.grandfatherSkipped++;
    }

    // Plan notification-prefs update.
    const prefsSnap = await db.collection('notificationPreferences').doc(uid).get();
    const { update: prefsUpdate, log: prefsLog } = planNotifPrefsUpdate(
      prefsSnap.exists ? prefsSnap.data() : null
    );
    if (prefsLog.exists) {
      console.log(`  notifPrefs: setNull=[${prefsLog.setNull}] deleteFields=[${prefsLog.deleted}]`);
      summary.notifPrefsModified++;
    } else {
      console.log(`  notifPrefs: no notificationPreferences/${uid} doc (nothing to reset)`);
    }

    // Plan / execute purges.
    let userPurgeTotal = 0;
    const purgeReport = [];
    for (const col of PURGE_COLLECTIONS) {
      const { count, subCounts } = await processOwnedCollection(db, col, uid, { apply: args.apply });
      const subTotal = Object.values(subCounts).reduce((a, b) => a + b, 0);
      if (count > 0 || subTotal > 0) {
        const subStr = subTotal > 0
          ? ' {' + Object.entries(subCounts).map(([k, v]) => `${k}:${v}`).join(', ') + '}'
          : '';
        purgeReport.push(`${col.name}=${count}${subStr}`);
      }
      userPurgeTotal += count + subTotal;
    }
    console.log(`  purge ${args.apply ? 'DELETED' : 'WOULD DELETE'} ${userPurgeTotal} doc(s)` +
      (purgeReport.length ? `: ${purgeReport.join(', ')}` : ' (none)'));
    summary.purgeDocsDeleted += userPurgeTotal;

    // Review (not-purged) counts — informational only.
    const reviewReport = [];
    for (const name of REVIEW_NOT_PURGED) {
      try {
        const snap = await db.collection(name).where('userId', '==', uid).get();
        if (snap.size > 0) reviewReport.push(`${name}=${snap.size}`);
      } catch {
        // collection may use a different owner field; skip silently in diagnostic
      }
    }
    if (reviewReport.length) {
      console.log(`  REVIEW (NOT purged, userId field): ${reviewReport.join(', ')}`);
    }

    // Execute writes (apply only).
    if (args.apply) {
      if (Object.keys(userUpdate).length) {
        userUpdate.updatedAt = admin.firestore.FieldValue.serverTimestamp();
        await db.collection('users').doc(uid).update(userUpdate);
      }
      if (prefsUpdate) {
        prefsUpdate.updatedAt = admin.firestore.FieldValue.serverTimestamp();
        await db.collection('notificationPreferences').doc(uid).update(prefsUpdate);
      }
    }
  }

  // Summary.
  console.log('\n' + '═'.repeat(72));
  console.log('  SUMMARY' + (args.apply ? '' : ' (DRY-RUN — nothing was written)'));
  console.log('═'.repeat(72));
  console.log(`  Users found:                ${summary.usersFound}`);
  console.log(`  Users processed:            ${summary.usersProcessed}`);
  console.log(`  Skipped (privileged):       ${summary.skippedPrivileged}`);
  console.log(`  Subscription types seen:    ${JSON.stringify(summary.bySubscriptionType)}`);
  console.log(`  User-doc fields modified:   ${summary.userDocFieldsModified}`);
  console.log(`  Grandfathered → event:      ${summary.grandfathered}`);
  console.log(`  Grandfather skipped:        ${summary.grandfatherSkipped}`);
  console.log(`  Notif-pref docs modified:   ${summary.notifPrefsModified}`);
  console.log(`  Purge docs ${args.apply ? 'deleted' : 'would delete'}:    ${summary.purgeDocsDeleted}`);
  console.log(`  Anomalies:                  ${summary.anomalies.length}`);
  for (const a of summary.anomalies) console.log(`    ⚠️  ${a}`);
  console.log('═'.repeat(72));

  if (!args.apply) {
    console.log('\nDRY-RUN complete. No data was modified. Review output before --apply.');
  } else {
    console.log('\nAPPLY complete.');
  }
}

main().catch((err) => {
  console.error('\n❌ Migration failed:', err);
  process.exit(1);
});
