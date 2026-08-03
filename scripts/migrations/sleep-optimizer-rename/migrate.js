#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Sleep Optimizer → Sleep Wind-Down — persisted routine-name rename.
 *
 * ONE-TIME, idempotent data migration over existing user routine documents.
 *
 * WHY
 *   The routine template was renamed in source (routineTemplates.ts:
 *   name 'Sleep Wind-Down', id 'evening-sleep-optimizer'). But
 *   handleApplyRoutineTemplate (useDashboard.ts) copies template.name INTO the
 *   user's Firestore routine doc AT APPLY TIME. Any user who applied this
 *   template BEFORE the rename has a persisted routine document whose `name`
 *   field is the old "Sleep Optimizer" — a banned word — which the dashboard
 *   renders verbatim ("Today's routine"). brandCopyGuard scans source only and
 *   cannot see persisted user data, so this is invisible to it.
 *
 * WHAT (per matched routine doc)
 *   - Set `name` = "Sleep Wind-Down". Touch ONLY the `name` field (+ updatedAt).
 *   - Leave EVERYTHING else untouched. In particular the doc carries NO template
 *     id (createRoutine persists only userId/name/type/activities/active/mode/
 *     timestamps — verified in routines.service.ts), and the stable slug
 *     'evening-sleep-optimizer' lives only in source, never in the doc. There is
 *     nothing here to renames-orphan: completions hang off routines/{id}/...,
 *     keyed by the doc id, which we never change.
 *
 * SELECTOR (two tiers — see note below)
 *   - RENAME: name === "Sleep Optimizer" / "Sleep Optimiser" (exact, the known
 *     pre-rename template names). These are auto-renamed.
 *   - FLAG-ONLY: any other routine name matching optim* (case-insensitive,
 *     incl. British -ise/-isation). NOT auto-renamed — reported for manual
 *     review so an unrelated user-authored name isn't silently rewritten.
 *
 *   NOTE: the spec asked to also target docs by template id
 *   'evening-sleep-optimizer'. That id is NOT persisted on the routine doc
 *   (confirmed against createRoutine), so it cannot be a selector. The optim*
 *   flag tier is the compensating safety net.
 *
 * SAFETY MODEL (mirrors scripts/migrations/beta-cohort-reset)
 *   - Default mode is DRY-RUN. Reads everything, writes nothing.
 *   - --apply runs for real, but ONLY after an interactive prompt that requires
 *     the exact string CONFIRM.
 *   - --user <UID> restricts to a single owner (combinable with --apply).
 *   - Idempotent: docs already named "Sleep Wind-Down" are skipped; re-running
 *     converges to the same state and reports 0 to rename.
 *
 * Usage:
 *   node migrate.js                      # dry-run, whole collection
 *   node migrate.js --user <uid>         # dry-run, single user's routines
 *   node migrate.js --apply              # REAL run (prompts CONFIRM)
 *   node migrate.js --apply --user <uid> # REAL run, single user (prompts CONFIRM)
 *   node migrate.js --key /path/key.json # override service-account key path
 *
 * Credentials: Admin SDK, NOT committed. Defaults to Application Default
 * Credentials, so set GOOGLE_APPLICATION_CREDENTIALS to a key stored OUTSIDE
 * this repo (or pass --key). If the corporate AV does
 * TLS inspection (Norton), export NODE_EXTRA_CA_CERTS=<root-ca.pem> before
 * running so the Admin SDK's gRPC channel trusts the intercepted chain.
 */

const path = require('path');
const fs = require('fs');
const readline = require('readline');
const admin = require('firebase-admin');

// ===========================================================================
// CONFIG
// ===========================================================================

// Credentials: Application Default Credentials by default, which read
// GOOGLE_APPLICATION_CREDENTIALS. Keep the key OUTSIDE this repo and never
// commit it. `--key <path>` still overrides with an explicit key file.
const DEFAULT_KEY_PATH = null;

// Top-level collection keyed by a `userId` field (routines.service.ts).
const COLLECTION = 'routines';

// Exact pre-rename names that are auto-renamed. Both spellings for safety.
const OLD_NAMES = ['Sleep Optimizer', 'Sleep Optimiser'];

// Canonical replacement (matches routineTemplates.ts).
const NEW_NAME = 'Sleep Wind-Down';

// Safety net: any OTHER name containing optim* is flagged, not rewritten.
const OPTIM_RE = /optimi[sz](?:e|er|ation|ing)/i;

const CHUNK = 400; // < Firestore 500-write batch limit

// ===========================================================================
// ARG PARSING
// ===========================================================================

function parseArgs(argv) {
  const args = { apply: false, user: null, keyPath: DEFAULT_KEY_PATH };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--apply') args.apply = true;
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

async function promptConfirm(message) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(message, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// Under Application Default Credentials there is no key object in hand, but
// GOOGLE_APPLICATION_CREDENTIALS points at the key file — read the real project
// id from it so the confirmation prompt names the actual target. Returns null
// when the env var is unset or the file cannot be read/parsed.
function adcProjectId() {
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!keyPath) return null;
  try {
    return JSON.parse(fs.readFileSync(keyPath, 'utf8')).project_id || null;
  } catch (err) {
    return null;
  }
}

async function commitRenames(db, refs) {
  for (let i = 0; i < refs.length; i += CHUNK) {
    const batch = db.batch();
    refs.slice(i, i + CHUNK).forEach((r) =>
      batch.update(r, {
        name: NEW_NAME,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
    );
    await batch.commit();
  }
}

// ===========================================================================
// MAIN
// ===========================================================================

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(1, 60).join('\n'));
    return;
  }

  const mode = args.apply ? 'APPLY (REAL)' : 'DRY-RUN (read-only)';
  console.log('═'.repeat(72));
  console.log('  Sleep Optimizer → Sleep Wind-Down  (routine-name rename)');
  console.log(`  Mode:   ${mode}`);
  console.log(`  Target: ${args.user ? `single user ${args.user}` : 'ENTIRE collection'}`);
  console.log('═'.repeat(72));

  // Credentials: an explicit --key file, else Application Default Credentials
  // (GOOGLE_APPLICATION_CREDENTIALS). Either way the key lives OUTSIDE this
  // repo and is never committed.
  let serviceAccount = null;
  if (args.keyPath) {
    if (!fs.existsSync(args.keyPath)) {
      console.error(`\n❌ Service-account key not found at:\n   ${args.keyPath}\n` +
        `   Pass a valid --key <path>. (Never commit it, and keep it outside the repo.)`);
      process.exit(1);
    }
    serviceAccount = require(args.keyPath);
  } else if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error('\n❌ No credentials. Set GOOGLE_APPLICATION_CREDENTIALS to a\n' +
      '   service-account key stored OUTSIDE this repo, or pass --key <path>.\n' +
      '   (Never commit the key.)');
    process.exit(1);
  }
  const projectLabel =
    (serviceAccount && serviceAccount.project_id) ||
    adcProjectId() ||
    'the project your credentials point at';

  if (args.apply) {
    console.log(`\n⚠️  You are about to modify routine documents in project`);
    console.log(`    "${projectLabel}". Only the \`name\` field is changed.\n`);
    const answer = await promptConfirm('    Type CONFIRM to proceed: ');
    if (answer !== 'CONFIRM') {
      console.log('\nAborted — confirmation string did not match. No changes made.');
      process.exit(0);
    }
    console.log('\nConfirmed. Proceeding…\n');
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: serviceAccount
        ? admin.credential.cert(serviceAccount)
        : admin.credential.applicationDefault(),
    });
  }
  const db = admin.firestore();

  // Read the whole collection (tiny pre-launch dataset) so we can do both the
  // exact-match rename and the optim* safety scan in one pass. Firestore can't
  // do a regex/contains query, hence the in-memory filter.
  const snap = await db.collection(COLLECTION).get();
  let docs = snap.docs;
  if (args.user) docs = docs.filter((d) => (d.data() || {}).userId === args.user);

  console.log(`Scanned ${snap.size} routine doc(s)` +
    (args.user ? ` (${docs.length} owned by ${args.user})` : '') + '.\n');

  const toRename = [];   // exact OLD_NAMES match → auto-rename
  const flagged = [];    // other optim* names → manual review only
  let alreadyNew = 0;    // idempotency counter

  for (const d of docs) {
    const data = d.data() || {};
    const name = data.name;
    if (typeof name !== 'string') continue;

    if (OLD_NAMES.includes(name)) {
      toRename.push(d.ref);
      console.log(`  [rename] ${d.id}  user=${data.userId || '(none)'}  "${name}" → "${NEW_NAME}"`);
    } else if (name === NEW_NAME) {
      alreadyNew++;
    } else if (OPTIM_RE.test(name)) {
      flagged.push({ id: d.id, userId: data.userId, name });
      console.log(`  [FLAG]   ${d.id}  user=${data.userId || '(none)'}  "${name}" — contains optim*, NOT auto-renamed`);
    }
  }

  if (args.apply && toRename.length) {
    await commitRenames(db, toRename);
  }

  console.log('\n' + '═'.repeat(72));
  console.log('  SUMMARY' + (args.apply ? '' : ' (DRY-RUN — nothing was written)'));
  console.log('═'.repeat(72));
  console.log(`  Routine docs scanned:       ${args.user ? docs.length : snap.size}`);
  console.log(`  Exact match ${args.apply ? 'renamed' : 'to rename'}:     ${toRename.length}`);
  console.log(`  Already "${NEW_NAME}":   ${alreadyNew}`);
  console.log(`  Flagged optim* (manual):    ${flagged.length}`);
  for (const f of flagged) console.log(`    ⚠️  ${f.id} (user=${f.userId || 'none'}): "${f.name}"`);
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
