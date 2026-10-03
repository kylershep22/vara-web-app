#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * NPM-3a-ii walk helper: writes ONE Community test event, as the mobile app
 * would, so the deployed sender pushes to the phone on the walk.
 *
 * KYLE'S RULING II-D11 (Round 8, verbatim):
 *   "D11: approve the walk helper script. It must be constrained to explicitly
 *   named test UIDs, refuse any UID outside that allowlist, show
 *   project/sender/recipient before writing, write only the exact test event
 *   shapes, contain no committed credentials, and preferably default to
 *   dry-run unless an explicit execute flag is supplied."
 *
 * WHAT IT DOES
 *   message  writes one directMessages document from --from to --to, in their
 *            EXISTING conversation. Refuses if they have no conversation.
 *   request  writes one pending connections document from --from to --to.
 *            Refuses if ANY connection document already exists between them.
 *   The shapes are the mobile app's, from the sender's own test fixture
 *   (functions-notifications/src/__tests__/fixtures/communityEventShapes.js).
 *   It writes nothing else: unlike the app, a message does not update the
 *   conversation's lastMessage or unread count.
 *
 * SAFETY
 *   - DRY RUN BY DEFAULT. A dry run only reads. It prints the project, the
 *     sender and recipient (UID and display name) and the exact document it
 *     would write. Only --execute writes.
 *   - ALLOWLIST. allowlist.local.json beside this file (ignored by git; copy
 *     allowlist.example.json) names the project and the test UIDs. Without it
 *     the script refuses to run. A sender or recipient outside it is refused,
 *     and so is a credential for any other project.
 *   - NO CREDENTIALS IN THE REPO. Application Default Credentials: set
 *     GOOGLE_APPLICATION_CREDENTIALS to a service-account key stored OUTSIDE
 *     this repo, or pass --key <path>. Behind Norton TLS inspection, set
 *     NODE_EXTRA_CA_CERTS to the root CA first (see scripts/migrations).
 *   - It never reads userPrivate and never prints a token.
 *
 * USAGE (from the repo root)
 *   node scripts/walk/community-push/communityPushHelper.js message --from B --to A
 *   node scripts/walk/community-push/communityPushHelper.js message --from B --to A --execute
 *   node scripts/walk/community-push/communityPushHelper.js request --from C --to A --execute
 *   --from and --to take an allowlist label (A, B, C) or a UID in the allowlist.
 */

const fs = require("fs");
const path = require("path");
const {
  directMessageDoc,
  connectionRequestDoc,
} = require("../../../functions-notifications/src/__tests__/fixtures/communityEventShapes");

const DEFAULT_ALLOWLIST = path.join(__dirname, "allowlist.local.json");
const MESSAGE_TEXT = "NPM-3a-ii walk test message";
const USAGE = [
  "Usage: node scripts/walk/community-push/communityPushHelper.js",
  "         <message|request> --from <label|uid> --to <label|uid>",
  "         [--execute] [--key <service-account-key.json>]",
].join("\n");

/** A refusal: printed plainly, nothing written, exit code 1. */
class Refusal extends Error {}

/**
 * @param {string[]} argv process.argv
 * @return {{event: string|null, from: string|null, to: string|null,
 *   execute: boolean, keyPath: string|null}}
 */
function parseArgs(argv) {
  const args = {event: null, from: null, to: null, execute: false, keyPath: null};
  const rest = argv.slice(2);
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a === "--from") args.from = rest[++i] || null;
    else if (a === "--to") args.to = rest[++i] || null;
    else if (a === "--execute") args.execute = true;
    else if (a === "--key") args.keyPath = rest[++i] || null;
    else if (!a.startsWith("--") && !args.event) args.event = a;
    else throw new Refusal(`Unknown argument: ${a}\n${USAGE}`);
  }
  if (args.event !== "message" && args.event !== "request") {
    throw new Refusal(`Name the event: message or request.\n${USAGE}`);
  }
  if (!args.from || !args.to) throw new Refusal(`Give --from and --to.\n${USAGE}`);
  return args;
}

/**
 * Read and check the allowlist file.
 * @param {string} file
 * @return {{projectId: string, uids: Object<string, string>}}
 */
function loadAllowlist(file) {
  if (!fs.existsSync(file)) {
    throw new Refusal(
        `No allowlist at ${file}.\n` +
        "Copy allowlist.example.json to allowlist.local.json beside this " +
        "script and fill in the project and the test UIDs. Nothing was read " +
        "or written.");
  }
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (err) {
    throw new Refusal(`The allowlist at ${file} is not valid JSON.`);
  }
  const uids = parsed && parsed.uids;
  const valid = parsed && typeof parsed.projectId === "string" &&
    parsed.projectId && uids && typeof uids === "object" &&
    Object.keys(uids).length > 0 &&
    Object.values(uids).every((u) => typeof u === "string" && u.length > 0);
  if (!valid) {
    throw new Refusal(
        "The allowlist needs a projectId and a uids object of label to UID.");
  }
  return {projectId: parsed.projectId, uids};
}

/**
 * Resolve a label or UID against the allowlist, or refuse.
 * @param {string} value
 * @param {Object<string, string>} uids
 * @param {string} role "sender" or "recipient"
 * @return {{label: string, uid: string}}
 */
function resolveAllowed(value, uids, role) {
  if (Object.prototype.hasOwnProperty.call(uids, value)) {
    return {label: value, uid: uids[value]};
  }
  const label = Object.keys(uids).find((k) => uids[k] === value);
  if (label) return {label, uid: value};
  throw new Refusal(
      `The ${role} ${value} is not in the allowlist. Only these test ` +
      `accounts can be used: ${Object.keys(uids).join(", ")}.`);
}

/**
 * @param {object} db
 * @param {string} uid
 * @return {Promise<string>}
 */
async function displayName(db, uid) {
  const snap = await db.doc(`users/${uid}`).get();
  const name = snap.exists ? (snap.data() || {}).displayName : undefined;
  return typeof name === "string" && name ? name : "(no display name)";
}

/**
 * Every connection document between the two, any status, from a query
 * scoped to the sender (no index needed), filtered in code.
 * @param {object} db
 * @param {string} a
 * @param {string} b
 * @return {Promise<object[]>}
 */
async function connectionsBetween(db, a, b) {
  const snap = await db.collection("connections")
      .where("participants", "array-contains", a).get();
  return snap.docs.filter((d) => {
    const c = d.data() || {};
    const parts = Array.isArray(c.participants) ? c.participants : [];
    return parts.includes(b) ||
      (c.requesterId === a && c.addresseeId === b) ||
      (c.requesterId === b && c.addresseeId === a);
  });
}

/**
 * The run, with every dependency injected so the guards can be tested
 * without credentials or network.
 * @param {object} deps
 * @param {string[]} deps.argv
 * @param {string} deps.allowlistPath
 * @param {function(): {db: object, projectId: string|null}} deps.connect
 *   called only after the arguments and the allowlist pass
 * @param {function(): *} deps.serverTimestamp
 * @param {function(string): void} deps.log
 * @return {Promise<{written: string|null}>}
 */
async function run(deps) {
  const args = parseArgs(deps.argv);
  const allow = loadAllowlist(deps.allowlistPath);
  const sender = resolveAllowed(args.from, allow.uids, "sender");
  const recipient = resolveAllowed(args.to, allow.uids, "recipient");
  if (sender.uid === recipient.uid) {
    throw new Refusal("The sender and the recipient are the same account.");
  }

  const {db, projectId} = deps.connect(args);
  if (projectId !== allow.projectId) {
    throw new Refusal(
        `The credential is for project ${projectId || "(unknown)"}, but the ` +
        `allowlist names ${allow.projectId}. Nothing was read or written.`);
  }

  const [senderName, recipientName] = await Promise.all([
    displayName(db, sender.uid), displayName(db, recipient.uid),
  ]);
  deps.log(`Project:   ${projectId}`);
  deps.log(`Sender:    ${sender.label}  ${sender.uid}  ${senderName}`);
  deps.log(`Recipient: ${recipient.label}  ${recipient.uid}  ${recipientName}`);

  let collection;
  let doc;
  if (args.event === "message") {
    const pair = [sender.uid, recipient.uid].sort();
    const convs = await db.collection("conversations")
        .where("participants", "==", pair).get();
    if (convs.docs.length === 0) {
      throw new Refusal(
          `${sender.label} and ${recipient.label} have no conversation. ` +
          "Open a conversation between them in the app first. Nothing " +
          "was written.");
    }
    const conversationId = convs.docs[0].id;
    const linked = await connectionsBetween(db, sender.uid, recipient.uid);
    const accepted = linked.some((d) => (d.data() || {}).status === "accepted");
    deps.log(`Conversation: ${conversationId}`);
    deps.log(`Accepted connection between them: ${accepted ? "yes" : "no"}` +
      (accepted ? "" : " (the sender will log ineligible, not_connected)"));
    collection = "directMessages";
    doc = directMessageDoc({
      conversationId,
      senderId: sender.uid,
      receiverId: recipient.uid,
      text: MESSAGE_TEXT,
      createdAt: deps.serverTimestamp(),
    });
  } else {
    const existing = await connectionsBetween(db, sender.uid, recipient.uid);
    if (existing.length > 0) {
      const ids = existing.map((d) => {
        const status = (d.data() || {}).status;
        return `${d.id} (${status})`;
      }).join(", ");
      throw new Refusal(
          `A connection document already exists between ${sender.label} and ` +
          `${recipient.label}: ${ids}. Delete it in the console first if the ` +
          "walk needs a fresh request. Nothing was written.");
    }
    collection = "connections";
    doc = connectionRequestDoc({
      requesterId: sender.uid,
      addresseeId: recipient.uid,
      createdAt: deps.serverTimestamp(),
    });
  }

  const shown = Object.assign({}, doc, {createdAt: "<server timestamp>"});
  deps.log(`Document:  ${collection}/<new auto ID>`);
  deps.log(JSON.stringify(shown, null, 2));

  if (!args.execute) {
    deps.log("DRY RUN: nothing was written. Add --execute to write it.");
    return {written: null};
  }
  const ref = await db.collection(collection).add(doc);
  const written = `${collection}/${ref.id}`;
  deps.log(`WROTE ${written}`);
  deps.log(`Event ID for the Logs Explorer and the marker: ${ref.id}`);
  return {written};
}

/**
 * The project ID of the credential in use, from the key file.
 * @param {string|null} keyPath
 * @return {string|null}
 */
function credentialProjectId(keyPath) {
  const file = keyPath || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!file) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")).project_id || null;
  } catch (err) {
    return null;
  }
}

/* istanbul ignore next: the real entry point, with real credentials */
async function main() {
  try {
    await run({
      argv: process.argv,
      allowlistPath: DEFAULT_ALLOWLIST,
      connect: (args) => {
        const admin = require("firebase-admin");
        const projectId = credentialProjectId(args.keyPath);
        const credential = args.keyPath ?
          admin.credential.cert(JSON.parse(fs.readFileSync(args.keyPath, "utf8"))) :
          admin.credential.applicationDefault();
        admin.initializeApp(Object.assign({credential},
            projectId ? {projectId} : {}));
        return {db: admin.firestore(), projectId};
      },
      serverTimestamp: () =>
        require("firebase-admin").firestore.FieldValue.serverTimestamp(),
      log: (line) => console.log(line),
    });
    process.exit(0);
  } catch (err) {
    if (err instanceof Refusal) {
      console.error(`REFUSED: ${err.message}`);
    } else {
      console.error(`FAILED: ${err && err.message ? err.message : err}`);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {run, parseArgs, loadAllowlist, resolveAllowed, Refusal, MESSAGE_TEXT};
