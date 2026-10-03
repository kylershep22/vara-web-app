# Community V1 rulings register

Path of record: `docs/decisions/community-v1-rulings.md`
First committed with: NPM-3a-i, first docs commit
Covers: every ruling Kyle made on Community for V1 in the review thread that began 2026-10-02, from the NPM-3a Step 0 through NPM-3a-ii sheet 1 (Round 8, 2026-10-03).

## How to read this file

- **Kyle's words are in block quotes and are verbatim.** They are never edited. If a ruling changes, the old block stays, its status becomes Superseded, and the entry says what superseded it.
- **Reviewer text is labelled "Reviewer recommendation" or "Reviewer note" and is never Kyle's wording.** Where Kyle ruled "as recommended", the recommendation he approved is reproduced verbatim from the ruling sheet so the ruling can be read without the thread.
- **Status values:** Active, Superseded, Conditional (binding only if a stated condition holds), Pending fact (binding, but an implementation choice waits on a fact a Step 0 must establish).
- **Rounds reuse numbers.** Always cite a ruling by round and ID, never by number alone.
- **Amendments** are dated appends at the end of the affected entry. Nothing above an append is rewritten.

## Workstreams (set by PA-3)

| Short name | Row |
|---|---|
| 3a-i | NPM-3a-i, Community server/rules/push correctness |
| 3a-ii | NPM-3a-ii, Community mobile notification correctness |
| RULES | COMMUNITY-RULES-INTEGRITY, launch-blocking |
| SAFETY | COMMUNITY-SAFETY-AND-MODERATION, launch-blocking |
| AGE-TERMS | AGE-TERMS-SUBMISSION-ALIGNMENT, launch-blocking |

---

## Round 0: rulings carried in from earlier threads

These were handed to this thread as Kyle's wording, verbatim. The roadmap (§5 rows and §12.1) remains the text of record for them.

### R0-D1
- **Status:** Superseded by R1-D1 (reworded).
- **Owner/workstream:** notifications model; 3a-i
- **Ruling (Kyle, verbatim):**
  > V1 uses phone/local delivery only. serverPushEnabled must remain OFF for V1 until the server timezone model is corrected. The app does not read that flag to decide whether the local daily reminder exists.
- **Notes:** Read literally, this forbade Community pushes. R1-D1 resolves that.

### R0-D2
- **Status:** Active.
- **Owner/workstream:** notifications model
- **Ruling (Kyle, verbatim):**
  > General notifications. Define the product contract as: General notifications controls Vara-initiated general reminders and updates, including the daily rhythm. It does not control reminders/alerts that the user explicitly configured as part of a specific feature. Routine reminders remain controlled per routine. Timer/focus alerts remain independent.

### R0-COMMUNITY
- **Status:** Active. Reaffirmed by PA-1.
- **Owner/workstream:** all five
- **Ruling (Kyle, verbatim):**
  > Community is part of V1, including its current Messages, People and Connect functionality. The Direct Messages and Connection Requests preferences stay; enforcing them on the server is NPM-3a's work, not this slice's.
- **Notes:** Reviewer note: "this slice" meant NPM-2. The NPM-3a roadmap row carries a longer verbatim ruling (D5 and ruling 6, as revised) that names the duplicate DM sender architecture, the connection-request field mismatch, preference enforcement, and one correct push per relevant event. It is not retyped here because the copy available in the thread was damaged in a terminal paste. The roadmap row is the text of record.

### R0-NPM2-5
- **Status:** Active.
- **Owner/workstream:** 3a-i, 3a-ii
- **Ruling (Kyle, verbatim):**
  > Push tokens: as recommended for NPM-2. Do not choose the future Community token architecture by implication. NPM-3a retains token-registration ownership.
- **Notes:** Reviewer note: the recommendation was that NPM-2 preserves the existing push-token registration only and changes nothing about it.

### R0-NPM2-7
- **Status:** Active.
- **Owner/workstream:** 3a-i
- **Ruling (Kyle, verbatim):**
  > General gating DMs: confirmed. NPM-3a removes that server coupling. Community notification preferences are independent of General.

### R0-NPM2-9
- **Status:** Active. Scope set by R1-K9.
- **Owner/workstream:** 3a-i
- **Ruling (Kyle, verbatim):**
  > Quiet Hours: approve hiding it in NPM-2 with an explicit launch dependency: NPM-3a must remove server enforcement of stored Quiet Hours before notification behavior is launch-ready.

### R0-WALK-SCOPE
- **Status:** Active.
- **Owner/workstream:** every walked slice
- **Ruling (Kyle, verbatim):**
  > I appreciate the thoroughness of the test cases but I am not spending my time on these edge cases. If we launch a user submits a support case we can deal with it then - I want these tests to cover 90 - 95% of common use cases
- **Clarification (Round 6, Kyle, verbatim):**
  > The general 90–95% common-use-case walk preference does not override later explicit launch-blocking tests, security/privacy invariants, Community safety requirements, account-isolation checks, or required pre-launch checks. Later specific rulings control.

---

## Round 1: rulings on the NPM-3a Step 0 and Addendum 1 (K-series)

**Round approval sentence (Kyle, verbatim):**
> Approve K1–K5, K7–K16, and K18 as recommended, with the following clarifications.

Where an entry below says "Approved as recommended", that sentence is the ruling and the reviewer recommendation is the approved text.

### R1-K1
- **Status:** Active. Extended by PA-3.
- **Owner/workstream:** 3a-i, 3a-ii
- **Ruling:** Approved as recommended.
- **Reviewer recommendation (verbatim):** Split. 3a-i is server, rules and deploy. 3a-ii is the phone.

### R1-K2
- **Status:** Active. Deploy gate added by S2-9.
- **Owner/workstream:** 3a-i
- **Ruling:** Approved as recommended.
- **Reviewer recommendation (verbatim):** The notifications codebase is the single sender, through Expo. Delete onNewDirectMessage and onNewConnection. Deploy unscoped. `npm test` runs in both codebases before any deploy.

### R1-K3
- **Status:** Active.
- **Owner/workstream:** 3a-i (no change to the function); ledger
- **Ruling (Kyle, verbatim):**
  > K3: leave `notifyOnInviteCreated` unchanged only because Step 0 proved both ends are web-only. Record it as dormant legacy web infrastructure; do not imply it was reviewed as part of mobile V1.
- **Reviewer recommendation (verbatim):** Leave notifyOnInviteCreated's behaviour unchanged. It is web-only at both ends. (CC: delete.)

### R1-K4
- **Status:** Active.
- **Owner/workstream:** 3a-i
- **Ruling:** Approved as recommended.
- **Reviewer recommendation (verbatim):** The DM sender stops writing bell documents. Add `recipientId` on `notifications` to the account-deletion sweep in 3a-i.

### R1-K5
- **Status:** Active.
- **Owner/workstream:** 3a-i, 3a-ii; NPM-3b
- **Ruling:** Approved as recommended.
- **Reviewer recommendation (verbatim):** Expo token. Keep writing `fcmToken` until NPM-3b.

### R1-K6
- **Status:** Active. Extended by S2-3.
- **Owner/workstream:** 3a-i
- **Ruling (Kyle, verbatim):**
  > K6: authoritative absence of a preferences document uses Community defaults and sends. A failed, unavailable, or indeterminate preference read must not be treated as document absence or default-send.
- **Notes:** K6 was not in the "as recommended" list; Kyle's words above are the whole ruling. The reviewer recommendation it replaced read: "A missing preferences document means defaults: send."

### R1-K7
- **Status:** Active.
- **Owner/workstream:** 3a-i
- **Ruling:** Approved as recommended.
- **Reviewer recommendation (verbatim):** DM push: "New message" / "{name} sent you a message." No message text. Name cut to 50 characters; "Someone" when empty.

### R1-K8
- **Status:** Active.
- **Owner/workstream:** 3a-i (push); 3a-ii (tap routing)
- **Ruling:** Approved as recommended.
- **Reviewer recommendation (verbatim):** Connection push: "New connection request" / "{name} wants to connect. Open Vara to respond." Tap goes to People › Requests (routing lands in 3a-ii).

### R1-K9
- **Status:** Active.
- **Owner/workstream:** 3a-i; NPM-3b
- **Ruling:** Approved as recommended.
- **Reviewer recommendation (verbatim):** Remove Quiet Hours enforcement for Community only. The scheduled senders' callers move to NPM-3b. (CC: remove all.)

### R1-K10
- **Status:** Active.
- **Owner/workstream:** 3a-i
- **Ruling:** Approved as recommended. See also R1-D1.
- **Reviewer recommendation (verbatim):** Community never reads `serverPushEnabled`. No second kill switch. D1 is reworded; suggested text below.

### R1-D1 (reworded)
- **Status:** Active. Supersedes R0-D1.
- **Owner/workstream:** notifications model; §12.1 dated append
- **Ruling (Kyle, verbatim):**
  > Keep the proposed D1 wording:
  > “V1 uses phone/local delivery for Vara-initiated reminders. serverPushEnabled must remain OFF for V1 until the server timezone model is corrected. The app does not read that flag to decide whether the local daily reminder exists. Community pushes are event-triggered, sent by the server, and do not read that flag.”

### R1-K11
- **Status:** Active. Token-match protection confirmed in Round 6.
- **Owner/workstream:** 3a-ii; AUTH-OFFLINE-REFRESH-SIGNOUT
- **Ruling (Kyle, verbatim):**
  > K11: keep the awaited token delete while still authenticated, with no local unregister or registry. Add UID/session ownership protection so a sign-out cleanup can only delete the token belonging to the session that initiated it. Retain the accepted offline/forced-sign-out residual under `AUTH-OFFLINE-REFRESH-SIGNOUT`.
- **Reviewer recommendation (verbatim):** Sign-out deletes the tokens with an awaited write while still signed in. No local unregister, no token registry. Accepted limit: an offline sign-out leaves the token until the next online sign-out or account deletion. (CC: all three.)
- **Confirmation (Round 6, Kyle, verbatim):**
  > K11 token-match protection is now confirmed.
  > Sign-out cleanup captures the departing UID and this device’s token. It may clear a stored token only if the session still belongs to that UID and the stored token still matches this device’s token. If another device has replaced the token, leave it untouched.
- **Notes:** Reviewer note: the reviewer had proposed reading "ownership protection" as two protections. (1) The cleanup captures the UID when sign-out begins, writes only to that UID's document, and fails closed if the authenticated UID differs at the moment of the write. (2) It deletes the stored token only if it equals this device's token, because tokens are one value per user. Kyle's Round 6 confirmation above is the ruling; this note records where the reading came from.

### R1-K12
- **Status:** Active. Text cap fixed by S2-2. Scope boundary fixed by S2-1.
- **Owner/workstream:** 3a-i
- **Ruling:** Approved as recommended.
- **Reviewer recommendation (verbatim):** Rules hardening in 3a-i. Messages: receiver must be the other participant; text is a string, capped at the composer's limit or 2000 characters if it has none. Conversations: exactly two distinct participants. Connections: requester is the caller, status pending, no legacy fields, active user. Accepted: this may break the dormant web app's Community writes.

### R1-K13
- **Status:** Active.
- **Owner/workstream:** 3a-ii
- **Ruling:** Approved as recommended.
- **Reviewer recommendation (verbatim):** Foreground: a tappable toast, hidden while you are in that conversation. In 3a-ii.

### R1-K14
- **Status:** Active.
- **Owner/workstream:** 3a-i, 3a-ii walks
- **Ruling:** Approved as recommended.
- **Reviewer recommendation (verbatim):** Walk covers common cases, sent from the second account on the same phone. Console only as fallback.

### R1-K15
- **Status:** Active.
- **Owner/workstream:** 3a-i
- **Ruling:** Approved as recommended.
- **Reviewer recommendation (verbatim):** Remove the email step from the DM sender.

### R1-K16
- **Status:** Active. Extended by RI-6 (suspended senders).
- **Owner/workstream:** 3a-i
- **Ruling:** Approved as recommended.
- **Reviewer recommendation (verbatim):** A DM push is sent only when an accepted connection exists between sender and recipient.

### R1-K17 (reviewer recommendation)
- **Status:** Superseded by R1-K17 (Kyle's ruling), below.
- **Reviewer recommendation (verbatim):** New launch-blocking row, COMMUNITY-BLOCK-AND-REPORT: block a user, report a user or message. It also owns the rules gap that lets a non-connection write a message, and message rate limits.

### R1-K17 (Kyle's ruling)
- **Status:** Active. Scope redistributed across RULES, SAFETY and AGE-TERMS by PA-3; nothing in it is dropped.
- **Owner/workstream:** RULES (non-connection message-write gap, rate limits); SAFETY (the rest); AGE-TERMS (checklist item)
- **Ruling (Kyle, verbatim):**
  > K17: broaden and rename.
  > Create `COMMUNITY-SAFETY-AND-MODERATION — LAUNCH BLOCKING`, not only `COMMUNITY-BLOCK-AND-REPORT`.
  > Its Step 0/build must cover:
  > block user; report user; report message; enforcement preventing blocked users from relevant messaging/connection interactions; non-connection message-write gap; message abuse/rate limits; existing objectionable-content filtering/moderation coverage; operational handling of reports; and published user-facing support/contact information.
  > Do not assume new sophisticated moderation is required until Step 0 inventories what Vara already has. The launch gate is compliance with the actual UGC safety surface, not merely the presence of Block and Report buttons.
  > Add an App Store pre-submission checklist item to answer the current social-media capability questions in the age-rating questionnaire.

### R1-K18
- **Status:** Active. Further ledger items added by S2-7 and RI-5.
- **Owner/workstream:** ledger (not launch-blocking)
- **Ruling:** Approved as recommended.
- **Reviewer recommendation (verbatim):** New ledger rows, not launch-blocking: Profile name validation; token ownership on account switch after an offline sign-out; web bell notifications for when the web app returns.

### R1-DEPLOY
- **Status:** Active. The four console checks are recorded (see CONSOLE-FACTS in Round 7). The paused-jobs re-check after the deploy is still to come.
- **Owner/workstream:** 3a-i; Kyle (console)
- **Ruling (Kyle, verbatim):**
  > Deployment: complete the four read-only console checks before drafting 3a-i. Keep the four scheduled jobs paused. After the unscoped Functions deploy, explicitly re-check that all four remain paused.
- **Notes:** The four checks: (1) `userPrivate/{R}`: whether `expoPushToken` exists and what `fcmToken` looks like, without pasting values; (2) last-deployed dates for the eight notification functions and deleteAccount; (3) whether `SENDGRID_API_KEY` is set on notifyOnDirectMessageCreated and notifyOnInviteCreated; (4) the state of the four scheduled jobs.

---

## Round 2: scope ruling (Path A)

### PA-1
- **Status:** Active.
- **Owner/workstream:** all five
- **Ruling (Kyle, verbatim):**
  > Scope ruling: Path A. Community remains in V1 and is a core Vara feature.
  > I accept the additional engineering and operational work required to ship it safely. Do not reopen Community deferral unless new evidence shows a hard blocker rather than additional scope.

### PA-2
- **Status:** Active.
- **Owner/workstream:** RULES, SAFETY, AGE-TERMS
- **Ruling (Kyle, verbatim):**
  > Use the trimmed implementation approach:
  > - skip migrations where only disposable beta/test Community data exists; wipe/reset that data instead;
  > - test a rules-only comment hardening approach before introducing a comment subcollection;
  > - do not expand third-party AI moderation into comments, profiles, or messages until the consent/privacy path is explicitly verified;
  > - keep private-message review report-triggered for V1;
  > - rate-limit connection requests rather than building a broad spam engine;
  > - do not publish a 24-hour moderation SLA;
  > - use a web Community Guidelines page plus Terms alignment rather than a separate in-app acceptance gate unless App Review/product requirements prove one is necessary;
  > - fold documentation into the functional safety slices rather than creating a docs-only safety slice.
- **Notes:** The disposability condition in the first bullet is met by DD-1.

### PA-3
- **Status:** Active.
- **Owner/workstream:** all five
- **Ruling (Kyle, verbatim):**
  > Pre-launch workstreams are:
  > 1. NPM-3a-i — Community server/rules/push correctness
  > Consolidate the push sender, remove duplicate/legacy senders and bell docs/email, harden conversations/messages/connections rules, enforce accepted-connection push eligibility, clamp display names, and remove Community coupling to Quiet Hours and `serverPushEnabled`.
  > 2. NPM-3a-ii — Community mobile notification correctness
  > Token registration, tap routing, foreground toast, active-conversation suppression, sign-out cleanup and end-to-end push proof.
  > 3. COMMUNITY-RULES-INTEGRITY — launch-blocking
  > Close unauthorized comment edits/deletes, like inflation, non-connection messaging writes, connection abuse and suspension gaps. Verify a rules-only comment design first.
  > 4. COMMUNITY-SAFETY-AND-MODERATION — launch-blocking
  > Block user; report user; report message; repair post reporting; block enforcement in both directions; remove connection on block; moderation delivery/runbook; objectionable-content filtering appropriate to each public surface; published support/contact information.
  > 5. AGE-TERMS-SUBMISSION-ALIGNMENT — launch-blocking
  > Reconcile repo/published Terms; settle one minimum-age policy; add the matching signup statement; update the App Store age-rating/submission checklist for social media, UGC, messaging/chat and wellness content.

### PA-4
- **Status:** Active.
- **Owner/workstream:** SAFETY
- **Ruling (Kyle, verbatim):**
  > Keep the previously agreed block behavior: both directions, remove the connection, do not notify the blocked user.

### PA-5
- **Status:** Active.
- **Owner/workstream:** SAFETY, AGE-TERMS
- **Ruling (Kyle, verbatim):**
  > Keep one support address.
- **Notes:** The address is support@varawellness.co (SM-9, SM-15).

### PA-6
- **Status:** Active.
- **Owner/workstream:** all five
- **Ruling (Kyle, verbatim):**
  > Preserve all existing Community findings as requirements rather than superseding them.
- **Notes:** See "Findings carried as requirements" below.

---

## Round 3: rulings on NPM-3a-i, sheet 2

### S2-1
- **Status:** Active.
- **Owner/workstream:** 3a-i; RULES
- **Ruling (Kyle, verbatim):**
  > 1. Scope: approve as recommended. NPM-3a-i changes only the K12 rules already approved. Comments, likes, non-connection write hardening, request rate limits and remaining suspension gaps stay in `COMMUNITY-RULES-INTEGRITY`.

### S2-2
- **Status:** Active. Fixes the open cap in R1-K12.
- **Owner/workstream:** 3a-i
- **Ruling (Kyle, verbatim):**
  > 2. Message limit: approve 1,000 characters, matching the current composer.

### S2-3
- **Status:** Active. Extends R1-K6.
- **Owner/workstream:** 3a-i
- **Ruling (Kyle, verbatim):**
  > 3. Failed/indeterminate delivery reads: approve with this distinction:
  > - authoritative missing preferences document → use the approved Community defaults;
  > - authoritative missing token → no push, normal condition;
  > - failed or indeterminate preference/connection/token read → no push and structured error log.
  >
  > No automatic event retry in V1. Do not log message text.
- **Notes:** Reviewer note: logs will carry event IDs, user IDs and a reason code only: no message text, display names or tokens. The same fail-closed handling applies to the sender-status read (RI-6).

### S2-4
- **Status:** Active.
- **Owner/workstream:** 3a-i
- **Ruling (Kyle, verbatim):**
  > 4. Duplicate marker: approve at-most-once behavior. The event-specific duplicate marker is successfully written before the Expo send. If marker creation fails, do not send. A crash after marker creation but before send may lose that one push; this is an accepted V1 tradeoff in preference to duplicates.
- **Notes:** Marker path: `notificationLog/{recipientUid}/community/{eventId}`. `notificationLog` is already on the account-deletion list, so no new manifest entry is needed.

### S2-5
- **Status:** Active.
- **Owner/workstream:** 3a-i
- **Ruling (Kyle, verbatim):**
  > 5. Token source: approve `userPrivate` Expo token only. Remove the legacy token fallback.

### S2-6
- **Status:** Active.
- **Owner/workstream:** 3a-i
- **Ruling (Kyle, verbatim):**
  > 6. Presentation: approve default notification sound and no app icon badge.

### S2-7
- **Status:** Active.
- **Owner/workstream:** 3a-i; ledger
- **Ruling (Kyle, verbatim):**
  > 7. Delivery receipts: approve logging Expo send errors with no receipt polling in V1. Add a ledger item for Expo delivery receipts and stale/unregistered-token cleanup.

### S2-8
- **Status:** Active. Was Conditional; the condition is met by DD-1.
- **Owner/workstream:** 3a-i
- **Ruling (Kyle, verbatim):**
  > 8. Connection shape: approve the current mobile connection shape only if current Community test/beta data is declared disposable. No legacy compatibility or migration merely for test data.

### S2-9
- **Status:** Active. The merge condition in its last sentence is amended by S3-4. The inventory approval is S3-3.
- **Owner/workstream:** 3a-i; Kyle (deploy)
- **Ruling (Kyle, verbatim):**
  > 9. Deployment: approve deployment from the exact built branch commit before walk, with an added hard gate:
  > - clean tree;
  > - exact commit recorded;
  > - both Functions test suites green;
  > - console deployment dates reviewed;
  > - CC lists every function the unscoped deploy will update, including unrelated repo changes;
  > - stop for approval if that inventory contains unreviewed behavior;
  > - verify all four scheduled jobs Paused immediately before and after deploy;
  > - record the deployed hash in WALK.md.
  >
  > Walk against the deployed branch code. Fix failures forward on the branch; merge only after the deployed walk passes.
- **Notes:** Reviewer note: once the deploy dates are recorded, the reviewer lists every commit the unscoped deploy would put live and brings it to Kyle. The build prompt then names the approved commits by hash, and CC stops only on a commit outside that list.

### S2-10
- **Status:** Active.
- **Owner/workstream:** 3a-i
- **Ruling (Kyle, verbatim):**
  > 10. Branch: approve `journey/npm-3a-i-community-push-server`.

### S2-ENG
- **Status:** Active.
- **Owner/workstream:** 3a-i
- **Ruling (Kyle, verbatim):**
  > Engineering choices approved with one constraint: the no-index connection check may filter a bounded sender-specific result set in code, but must not read the global connections collection.
  > Shared delivery eligibility helper and fixed navigation payload are approved.
- **Reviewer text these refer to (verbatim):**
  - One shared delivery check. The sender gets a single "is delivery allowed" function, so blocking can be added later in one place.
  - No new index. The connection lookup filters the sender's own connections in code, which avoids an index deploy.
  - A fixed payload. The push carries the event type and IDs that 3a-ii's tap routing will need.
  - Walk setup. The two test accounts must start unconnected for the connection-request step. The app has no disconnect, so you may need to delete their existing connection document in the console first.

### S2-GATE
- **Status:** Satisfied. The four checks were recorded before build prompt 1 was issued (see CONSOLE-FACTS in Round 7).
- **Owner/workstream:** 3a-i
- **Ruling (Kyle, verbatim):**
  > Do not draft the build until the four required console checks are recorded.
- **Later restatement (Round 5, Kyle, verbatim):**
  > 3a-i still waits on the four console checks before the build prompt is drafted.

---

## Round 4: rulings on the safety sheet (RI, SM, AT), with Round 5 refinements

**Round approval sentence (Kyle, verbatim):**
> Approve the safety sheet with these rulings.

**Round 5 opening sentence (Kyle, verbatim):**
> Your implementation readings are approved with these refinements.

### Workstream RULES

#### RI-1
- **Status:** Active. Pending fact (see notes).
- **Owner/workstream:** RULES
- **Ruling (Kyle, verbatim):**
  > RI-1–RI-4: as recommended.
- **Reviewer recommendation (verbatim):** Each conversation stores its connection ID. The rules require that connection to be accepted and to include both people, on creating a conversation and on every message.
- **Notes:** Reviewer note: predictable connection IDs were ruled out at Step 0 only because of migration cost. DD-1 removes that cost, and predictable IDs would also enforce "one pending request per target" (RI-5, Round 5). The RULES Step 0 should compare the two designs. Any change from the approved design needs a new ruling.

#### RI-2
- **Status:** Active.
- **Owner/workstream:** RULES
- **Ruling:** As recommended (see RI-1 for Kyle's sentence).
- **Reviewer recommendation (verbatim):** When a connection ends, the conversation becomes read-only for both people. History stays readable.

#### RI-3
- **Status:** Active. Pending fact: whether the app lets authors delete their own comments today.
- **Owner/workstream:** RULES
- **Ruling:** As recommended (see RI-1 for Kyle's sentence).
- **Reviewer recommendation (verbatim):** Comments: a user can add a comment and remove their own. No editing. Likes: a user can add or remove only their own.

#### RI-4
- **Status:** Active.
- **Owner/workstream:** RULES
- **Ruling:** As recommended (see RI-1 for Kyle's sentence).
- **Reviewer recommendation (verbatim):** If the rules-only comment design fails its test, comments move to a sub-collection with no migration.

#### RI-5 (reviewer recommendation)
- **Status:** Superseded by RI-5 (Kyle's ruling), below.
- **Reviewer recommendation (verbatim):** Connection requests: one per 10 seconds and 30 per day, enforced in the rules. If a daily cap cannot be expressed there, ship the gap only and record the cap as a ledger item.

#### RI-5 (Kyle's ruling)
- **Status:** Conditional. Pending fact: whether a cooldown or a daily cap is cleanly enforceable in the existing rules design.
- **Owner/workstream:** RULES; ledger
- **Ruling (Kyle, verbatim):**
  > RI-5: approve the short connection-request cooldown if it is cleanly enforceable in the existing Rules design. Do not build a new counter/rate-limit subsystem solely to force the 30/day cap into Firestore Rules. If a reliable daily cap is not expressible without widening architecture, ledger it for the next abuse-control pass.
- **Refinement (Round 5, Kyle, verbatim):**
  > RI-5 fallback: if neither cooldown nor daily cap can be enforced cleanly without a new rate-limit subsystem, ledger both for post-launch. For V1, still require one pending request per target plus working block/report.

#### RI-6
- **Status:** Active.
- **Owner/workstream:** RULES (rules); 3a-i (push eligibility)
- **Ruling (Kyle, verbatim):**
  > RI-6: as recommended, with one addition: a suspended user also cannot cause Community push notifications.
- **Reviewer recommendation (verbatim):** A suspended user is read-only in Community: they cannot create or change anything another user sees or receives, including public profile fields. They can still read, leave groups, delete their own content, file reports and delete their account. The rest of Vara is unaffected.
- **Refinement (Round 5, Kyle, verbatim):**
  > RI-6: put suspended-user push eligibility into NPM-3a-i’s shared delivery check. Failed/indeterminate sender-status read means no push.

#### RI-7
- **Status:** Active. Was Conditional; the condition is met by DD-1.
- **Owner/workstream:** RULES; Kyle runs the script
- **Ruling (Kyle, verbatim):**
  > RI-7: approve subject to the previously requested declaration that current Community data is disposable. Dry-run counts first; wipe Community data/storage only, not profiles/accounts.
- **Reviewer recommendation (verbatim):** The data wipe is one script, written by CC and run by you, with a dry-run count first. It removes all Community data and its stored files and leaves profiles alone. It runs once, before this workstream's rules deploy.

### Workstream SAFETY

#### SM-1
- **Status:** Active.
- **Owner/workstream:** SAFETY
- **Ruling (Kyle, verbatim):**
  > SM-1–SM-7: as recommended.
- **Reviewer recommendation (verbatim):** Blocks are stored under the blocker's own user document, so they are deleted with the account.

#### SM-2
- **Status:** Active. See PA-4.
- **Owner/workstream:** SAFETY
- **Ruling:** As recommended (see SM-1 for Kyle's sentence).
- **Reviewer recommendation (verbatim):** A block hides each person from the other everywhere: feed, comments, profiles, People, Discover, search and groups. Pending requests and invites between them are removed.

#### SM-3
- **Status:** Active.
- **Owner/workstream:** SAFETY
- **Ruling:** As recommended (see SM-1 for Kyle's sentence).
- **Reviewer recommendation (verbatim):** After a block, the conversation leaves the blocker's list. The blocked person keeps the history, read-only, and sees the same neutral "no longer connected" state as any ended connection.

#### SM-4
- **Status:** Active.
- **Owner/workstream:** SAFETY
- **Ruling:** As recommended (see SM-1 for Kyle's sentence).
- **Reviewer recommendation (verbatim):** Unblock lives in Settings › Blocked people. It restores visibility only; the connection is not restored.

#### SM-5
- **Status:** Active.
- **Owner/workstream:** SAFETY
- **Ruling:** As recommended (see SM-1 for Kyle's sentence).
- **Reviewer recommendation (verbatim):** Add a plain "Remove connection" action. (CC: not for launch.) Without it, Block is the only way out of a connection, and after RI-1 it is one menu item.

#### SM-6
- **Status:** Active.
- **Owner/workstream:** SAFETY
- **Ruling:** As recommended (see SM-1 for Kyle's sentence).
- **Reviewer recommendation (verbatim):** Report appears on posts, comments, profiles and a message long-press. Each confirmation offers Block. (CC: also the conversation header, which duplicates the profile entry.)

#### SM-7
- **Status:** Active.
- **Owner/workstream:** SAFETY
- **Ruling:** As recommended (see SM-1 for Kyle's sentence).
- **Reviewer recommendation (verbatim):** Report reasons: the current five plus "Pretending to be someone else".

#### SM-8
- **Status:** Active.
- **Owner/workstream:** SAFETY
- **Ruling (Kyle, verbatim):**
  > SM-8: approve storing the specific reported-message snapshot with explicit confirmation that it will be shared with Vara. Store only the minimum moderation evidence required; do not copy full conversations by default.
- **Reviewer recommendation it responds to (verbatim):** Reports stay in the existing collection with a target type added. A message report stores that one message's text, and the confirm step says the message will be shared with Vara.

#### SM-9 (reviewer recommendation)
- **Status:** Superseded in part by SM-9 (Kyle's ruling), below. The email no longer carries content.
- **Reviewer recommendation (verbatim):** Every report, and every high-severity automatic flag, emails support@varawellness.co. The runbook is one page and acts through the Firebase console. Your part: a SendGrid account, key and verified sender domain.

#### SM-9 (Kyle's ruling)
- **Status:** Active.
- **Owner/workstream:** SAFETY; Kyle (SendGrid account, key, sender domain)
- **Ruling (Kyle, verbatim):**
  > SM-9: approve email notification to `support@varawellness.co`, but email must not contain private message/post content. Send metadata/reason/IDs and review instructions; Firebase remains the authoritative report store.
- **Refinement (Round 5, Kyle, verbatim):**
  > SM-9: metadata-only moderation email with IDs/reason and a Firebase console link is approved. Do not include reported content in email.

#### SM-10
- **Status:** Active.
- **Owner/workstream:** SAFETY
- **Ruling (Kyle, verbatim):**
  > SM-10/11: as recommended.
- **Reviewer recommendation (verbatim):** Moderator actions for V1: remove post, remove comment, remove message, warn, suspend, ban, dismiss. The phone must honour every removal.

#### SM-11
- **Status:** Active.
- **Owner/workstream:** SAFETY
- **Ruling:** As recommended (see SM-10 for Kyle's sentence).
- **Reviewer recommendation (verbatim):** A suspended user sees a short notice with the support address. No notice for individual removed content.

#### SM-12 (reviewer recommendation)
- **Status:** Superseded by SM-12 (Kyle's ruling), below.
- **Reviewer recommendation (verbatim):** A keyword blocklist checks every public text surface on the server: posts including edits, comments, names and bios, group and challenge text. A match hides the content where possible and queues it. You approve the list.

#### SM-12 (Kyle's ruling)
- **Status:** Active. Pending: Jen's review of the list.
- **Owner/workstream:** SAFETY; Jen (list review)
- **Ruling (Kyle, verbatim):**
  > SM-12: approve deterministic keyword filtering over public text, but change the behavior:
  > - synchronous known-blocklist match before publication → reject the submission with neutral edit-and-retry UI;
  > - later/asynchronous high-severity flag → hide/quarantine and queue for moderation.
  >
  > Do not silently publish-then-hide content when synchronous rejection is possible.
- **Refinement (Round 5, Kyle, verbatim):**
  > SM-12: client-side synchronous blocklist plus server backstop is approved. The client-readable list must contain only the minimal terms/patterns needed for rejection—no internal moderation metadata.
  > Do not include crisis/self-harm language in the blocklist pending Jen’s ruling. Start with narrow, high-confidence abuse terms, preferably whole-word matches, and have Jen review the list.

#### SM-13
- **Status:** Conditional. Pending facts: whether the consent gate and Privacy Policy cover post text sent to OpenAI; what service the image check calls.
- **Owner/workstream:** SAFETY; AGE-TERMS (Privacy Policy)
- **Ruling (Kyle, verbatim):**
  > SM-13: conditional as recommended. Do not expand AI moderation. Keep existing post review only if the consent gate and Privacy Policy investigation explicitly support it; otherwise disable it for V1.
- **Reviewer recommendation (verbatim):** The existing AI review of posts stays only if consent and the privacy policy are verified to cover it; otherwise it is switched off. The image decision waits for the open fact below.

#### SM-14
- **Status:** Active. Pending: Jen's ruling.
- **Owner/workstream:** SAFETY; Jen
- **Ruling (Kyle, verbatim):**
  > SM-14/15: as recommended. Jen owns the separate crisis/safety ruling.
- **Reviewer recommendation (verbatim):** Self-harm content stays separate from Jen's SAFETY row. Reports marked unsafe get their own runbook path. Ask Jen now whether her crisis pre-check should cover Community composers.

#### SM-15
- **Status:** Active.
- **Owner/workstream:** SAFETY
- **Ruling:** As recommended (see SM-14 for Kyle's sentence).
- **Reviewer recommendation (verbatim):** Help & Support gains a "Report a safety concern" line using the same support address.

#### SM-REHEARSAL
- **Status:** Active.
- **Owner/workstream:** required pre-launch check; Kyle
- **Ruling (Kyle, verbatim):**
  > Add a pre-launch end-to-end Community moderation rehearsal using the two demo accounts: report → notification → moderator action → phone removal; block → bilateral enforcement → unblock without connection restoration.

### Workstream AGE-TERMS

#### AT-1
- **Status:** Active.
- **Owner/workstream:** AGE-TERMS; Kyle (published Terms)
- **Ruling (Kyle, verbatim):**
  > AT-1: set Vara minimum age to 18 and make all legal/product/signup surfaces consistent.
- **Notes:** The published Terms say 16+ and the repo copy says 13+ (16 in Europe) until they are updated.

#### AT-2 (reviewer recommendation)
- **Status:** Superseded by AT-2 (Kyle's ruling), below.
- **Reviewer recommendation (verbatim):** Signup uses one checkbox covering both age and agreement to the Terms and Privacy Policy.

#### AT-2 (Kyle's ruling)
- **Status:** Active. Pending fact: whether existing beta users must re-acknowledge.
- **Owner/workstream:** AGE-TERMS
- **Ruling (Kyle, verbatim):**
  > AT-2: use two explicit signup acknowledgements:
  > I confirm that I am 18 or older.
  > I agree to the Terms of Service and acknowledge the Privacy Policy.
  > Store the relevant acceptance evidence.
- **Refinement (Round 5, Kyle, verbatim):**
  > AT-2: store acknowledgement type, timestamp and Terms version. Step 0 decides whether existing beta users must re-acknowledge.
- **Notes:** The two acknowledgement sentences are Kyle's approved copy. The stored fields are new, so the workstream carries a deletion-manifest statement.

#### AT-3
- **Status:** Active.
- **Owner/workstream:** AGE-TERMS; Kyle (published Terms)
- **Ruling (Kyle, verbatim):**
  > AT-3/AT-4: as recommended. The published Terms are canonical; Community Guidelines are a linked web page, not another required signup gate.
- **Reviewer recommendation (verbatim):** The published Terms are the only Terms. Repo copies are replaced with a pointer. The Terms are updated to match what ships, including the points below.
  AT-3 covers these Terms changes:
  - a no-tolerance clause for objectionable content and abusive users;
  - block and report language that matches the build;
  - messages are reviewed only when reported;
  - the unshipped "group owners can moderate" promise is removed;
  - the support address is corrected.

#### AT-4
- **Status:** Active.
- **Owner/workstream:** AGE-TERMS; Kyle (website)
- **Ruling:** As recommended (see AT-3 for Kyle's sentence).
- **Reviewer recommendation (verbatim):** Community Guidelines are a page on varawellness.co, linked from Help & Support and the report confirmation.

#### AT-5
- **Status:** Conditional. Exact language waits on legal review.
- **Owner/workstream:** AGE-TERMS; legal review
- **Ruling (Kyle, verbatim):**
  > AT-5: product direction approved, but exact retention/legal language requires legal review before publication.
- **Reviewer recommendation (verbatim):** When an account is deleted, stored copies of that user's reported content are deleted too. Content-free action records (who, what action, when) are kept, and the Privacy Policy says so. (CC: keep everything for a fixed period, which needs a purge job.)

#### AT-6
- **Status:** Active.
- **Owner/workstream:** AGE-TERMS; pre-submission checklist
- **Ruling (Kyle, verbatim):**
  > AT-6: as recommended.
- **Reviewer recommendation (verbatim):** The pre-submission checklist gains two items: the age-rating answers, and App Review notes.
  AT-6 covers these checklist items:
  - age-rating answers for user-generated content, messaging, social media, wellness topics and age assurance;
  - App Review notes that describe filtering, reporting, blocking and contact, with two connected demo accounts.

### Open facts

#### OF-1
- **Status:** Active.
- **Owner/workstream:** each workstream's Step 0
- **Ruling (Kyle, verbatim):**
  > Open-fact investigations proceed in their respective Step 0s and block only the implementation choices they actually decide.

---

## Round 5: declarations and register

### DD-1 (disposability declaration)
- **Status:** Active. Satisfies the conditions in PA-2 (first bullet), S2-8 and RI-7.
- **Owner/workstream:** 3a-i, RULES
- **Ruling (Kyle, verbatim):**
  > Disposability declaration:
  > All existing Community data is disposable for the V1 hardening work. Posts, connections, conversations, messages, groups, challenges, comments, likes, reports, and Community storage assets may be wiped/reset as needed. User accounts, profiles, subscriptions, and non-Community Vara data are not disposable. No migration compatibility is required solely to preserve beta/test Community data.

### REG-1 (this file)
- **Status:** Active.
- **Owner/workstream:** 3a-i, first docs commit
- **Ruling (Kyle, verbatim):**
  > Rulings register: yes, create it now as part of 3a-i’s first docs commit.
  > Suggested path: `docs/decisions/community-v1-rulings.md`
  > Organize by ruling round/workstream and include for each item:
  > - ID
  > - Status: Active / Superseded / Conditional / Pending fact
  > - Exact ruling text
  > - Owner/workstream
  > - Dependencies/notes
  >
  > Preserve superseded rulings and mark what superseded them rather than deleting them. Do not replace exact ruling language with paraphrased summaries.

### Round 5 reviewer readings that Kyle approved with refinements

These are the reviewer's words (verbatim). Kyle's refinements are quoted under RI-6, SM-12, SM-9 and AT-2 above.

- RI-6, suspended users cannot cause pushes. I will put this in NPM-3a-i's shared delivery check, not wait for workstream 3. The sender already reads the sending user's document for the display name, so checking their status costs no extra read. A failed status read means no push, consistent with your sheet 2 ruling.
- SM-12, synchronous rejection. The app writes posts straight to Firestore with no server in between, so "before publication" means a check in the app, the same pattern as the existing crisis pre-check. The server check with the same list is the backstop that hides and queues anything a modified client gets past. The list must therefore be readable by the app.
- SM-9, email without content. The email carries the reason, IDs and a direct Firebase console link to the report document. The runbook starts from that link.
- AT-2, acceptance evidence. This adds stored fields (which acknowledgements, when, which Terms version), so the workstream carries a deletion-manifest statement. Whether existing beta accounts must re-acknowledge is a question its Step 0 will bring you.

---

## Round 6: register review

### REG-2 (register approval)
- **Status:** Active.
- **Owner/workstream:** 3a-i, first docs commit
- **Ruling (Kyle, verbatim):**
  > Register reviewed and approved with three updates:
  
  > Everything else in `community-v1-rulings.md` is approved as currently written.
  > Keep the file outside the repo until the 3a-i build prompt explicitly brings it into the first docs commit, preserving the clean-tree gate.
- **Notes:** The three updates are recorded at R1-K11 (confirmation), PLC-1 (below) and R0-WALK-SCOPE (clarification).

### PLC-1 (standalone Community push check)
- **Status:** Active.
- **Owner/workstream:** required pre-launch check; Kyle; depends on 3a-i and 3a-ii merged and deployed
- **Ruling (Kyle, verbatim):**
  > Approve the proposed standalone Community-push pre-launch check.
  > On the first standalone/TestFlight-class build, verify real-device end-to-end Community push registration and delivery, including at least one DM push and one connection-request push. Add it to Required pre-launch checks.
- **Notes:** Reviewer note: proposed by CC at the NPM-3a Step 0 because the dev client uses the APNs sandbox, so a pass there does not carry over to a standalone build.

---

## Round 7: Expo push security, console facts and NPM-3a-i sheet 3

### EXPO-SEC (first answer)
- **Status:** Superseded by EXPO-SEC (ruling), below.
- **Owner/workstream:** 3a-i
- **Statement (Kyle, verbatim):**
  > No need for expo push security as I image that is just for the dev environment? Is there any impact to regular users once this app is live?
- **Notes:** Reviewer note: the reviewer answered that the setting is not development-only, applies to every push sent through Expo, and has no effect users can see.

### EXPO-SEC (ruling)
- **Status:** Active.
- **Owner/workstream:** 3a-i; Kyle (Expo account setting)
- **Ruling (Kyle, verbatim):**
  > Yes, lets do the expo push security
- **Notes:** Reviewer note: what was approved is that the sender sends every Expo push request with an access token held as a function secret, and that Kyle switches on Expo's enhanced push security after the deploy and before the walk. Kyle created the secret `EXPO_ACCESS_TOKEN` in Firebase (version 1) on 2026-10-02. Its value is a personal access token and is stored nowhere else. Proposed by the reviewer and not yet ruled: a ledger item to move to a robot user's token.

### WALK-DIRECTION
- **Status:** Superseded by S3-4 and S3-5, which make it precise. The two-person TestFlight proof it asks for is PLC-1.
- **Owner/workstream:** 3a-i
- **Statement (Kyle, verbatim):**
  > What I would like to do here is build it to best practice and run what tests can be done in CC, then I am going to need to wait until I can get another user in test flight to help me test the requests and DMs.

### CONSOLE-FACTS
- **Status:** Recorded fact, not a ruling.
- **Owner/workstream:** 3a-i deploy evidence
- **What Kyle reported from the consoles (verbatim where quoted):**
  - A test user's `userPrivate` document has an `expoPushToken` in the ExponentPushToken[...] format and an `fcmToken` of 64 hexadecimal characters. Reviewer note: values were pasted in the thread and are deliberately not reproduced here.
  - Cloud Run list, screenshot of 2026-10-03: 25 services. The 23 in the api codebase show Last deployed Sep 6, 2026. `notifyondirectmessagecreated` and `notifyoninvitecreated` show Aug 30, 2026.
  - > Neither notifyondirectmessagecreated nor notifyoninvitecreated have SENDGRID_API_KEY listed as an environment variable
  - > if its the 4 we paused earlier they are still paused
  - Firestore rules, screenshot of 2026-10-03: most recent published version Sep 18, 2026 at 12:37 PM.
- **Notes:** Reviewer note: `onUserCreate` is a first-generation function and does not appear in the Cloud Run list, so its deploy date was not read. See S3-3.

### S3-1
- **Status:** Active. Extends R1-K6 and S2-3.
- **Owner/workstream:** 3a-i
- **Ruling (Kyle, verbatim):**
  > 1. Malformed preference: approve as recommended. A stored Community preference value that is not literal boolean `true` or `false` is indeterminate: send nothing and emit a structured error log. Never coerce malformed state to enabled.

### S3-2
- **Status:** Active.
- **Owner/workstream:** RULES
- **Ruling (Kyle, verbatim):**
  > 2. Connection rules: approve adding these requirements to `COMMUNITY-RULES-INTEGRITY`, not NPM-3a-i:
  > - only the addressee may accept or decline;
  > - requester/addressee identity cannot change after creation;
  > - on creation, addressee must be a different user and participants must be exactly requester + addressee.
- **Notes:** Reviewer note: until this lands, a requester can mark their own pending request accepted, which would satisfy the push eligibility check in R1-K16. Nothing ships before all five workstreams land.

### S3-3
- **Status:** Active.
- **Owner/workstream:** 3a-i deploy evidence
- **Ruling (Kyle, verbatim):**
  > 3. Deploy inventory: approve `2185d83` going live with the 3a-i unscoped deploy. Also accept the repo version of `onUserCreate` as reviewed based on its previously merged/walked `userPrivate` slice despite the missing console deploy date. Record both explicitly in the deployment evidence.
- **Notes:** Reviewer note: `2185d83` makes account deletion also remove the user's moments.

### S3-4
- **Status:** Active. Amends the merge condition in S2-9.
- **Owner/workstream:** 3a-i walk and merge
- **Ruling (Kyle, verbatim):**
  > 4. Walk evidence: approve the server/device split with a stronger server requirement.
  > For each tested Community event, server evidence must prove:
  > - exactly one expected trigger;
  > - successful eligibility path;
  > - event-specific duplicate marker;
  > - Expo send attempted;
  > - Expo accepted the push request successfully;
  > - structured success log identifying event type, event ID and recipient ID without message text, names, tokens or secrets.
  >
  > If the dev client can receive remote pushes, visible device/banner evidence is also required before merge.
  > If the dev client genuinely cannot receive them, record the banner step NOT RUN with that reason. In that case the strengthened server evidence is sufficient for the 3a-i merge, while the already-approved standalone/TestFlight DM + connection-request push check remains launch-blocking before release.
- **Notes:** Reviewer note: for a walk event that is meant to send nothing (a preference turned off, no accepted connection), the reviewer reads the server evidence as: exactly one trigger, an ineligible outcome with its reason code, no duplicate marker and no send. Kyle has not ruled on that reading.

### S3-5
- **Status:** Active.
- **Owner/workstream:** 3a-i walk
- **Ruling (Kyle, verbatim):**
  > 5. Expo Push Tool: approve as walk step 1 before deploy/security enforcement.
  > Interpret it as:
  > - successful visible push → device-banner proof is feasible and required in this walk;
  > - confirmed dev-client/runtime inability → use the server-evidence branch and mark banner steps NOT RUN;
  > - ambiguous/configuration failure → STOP; do not treat it as proof that the dev client cannot receive pushes.

### S3-HARNESS
- **Status:** Active.
- **Owner/workstream:** 3a-i build record
- **Ruling (Kyle, verbatim):**
  > The earlier test-harness network calls are accepted as handled, provided the build record preserves the disclosure and the new guard/tests continue to prove tests cannot reach Expo.
- **Notes:** Reviewer note: during build prompt 2, CC's first test harness sent four real requests to Expo's push API with a fake access token and a fake push token. Expo rejected all four. The guard and its two tests landed in commit a7a8ec9.

---

## Round 8: rulings on NPM-3a-ii, sheet 1 (2026-10-03)

All entries in this round are Active. Owner/workstream for all: 3a-ii. II-D4 amends S2-ENG's fixed payload.

**Kyle's rulings, verbatim:**

> Approve D1–D16 as recommended with these clarifications.
> D1: the always-mounted owner also retries token registration when the authenticated user's email-verification state transitions to verified.
> D3/D15 ordering: delivered Vara notifications are cleared locally and immediately when the session ends, before waiting for server token deletion. Token deletion then gets up to five seconds; sign-out completes regardless of the result.
> D11: approve the walk helper script. It must be constrained to explicitly named test UIDs, refuse any UID outside that allowlist, show project/sender/recipient before writing, write only the exact test event shapes, contain no committed credentials, and preferably default to dry-run unless an explicit execute flag is supplied.
> D13: tests-only is approved for the two-device case. Record that V1 stores one token per user and does not claim comprehensive multi-device push behavior.
> D15: clear all delivered Vara notifications on every authoritative session-loss path.
> D16: approve the two written before-state observations rather than four captures.
> Add one ruling:
> D17 — Missing recipient ownership: Community payloads with missing, malformed, or nonmatching `recipientId` fail closed. They produce no foreground toast and no navigation on tap. Never infer that a payload without a valid recipient belongs to the currently signed-in user.
> Unscoped deployment remains the rule, with the same deploy gates used by NPM-3a-i.
> The walk should separately prove after sign-out that existing delivered notifications are cleared and that newly generated events for the departed account no longer reach that phone.

**Reviewer recommendations Kyle approved (reviewer's words, verbatim). Entry IDs are II-D1 to II-D16; Kyle's added ruling above is II-D17.**

- II-D1, who registers the token: One owner in the always-mounted provider. It runs at sign-in, on every return to the app, after any permission grant and on token rotation. It compares against the stored value and writes only on change.
- II-D2, fcmToken: Register it in the same owner and clear it in the same sign-out step, each under its own match test.
- II-D3, sign-out wait: Up to 5 seconds for the server to confirm the clear, then sign out anyway. No copy.
- II-D4, recipient ID in the push: Add `recipientId` to both Community payloads. This amends the fixed payload you approved in sheet 2. Deploy unscoped, with the 3a-i gates.
- II-D5, tap on another account's push: No navigation and no message.
- II-D6, foreground push for another account: Show nothing.
- II-D7, toast tap: Same destination as the banner tap, for messages and for requests.
- II-D8, two toasts close together: Newest wins, with a full duration.
- II-D9, old Settings-only hook: Remove it. Add a dated note on the daily-rhythm tap row that its accidental Settings-only route to Home goes with it.
- II-D10, unused local Community notification code: Leave it, with a ledger row.
- II-D11, walk sender: A helper script that you run, limited to accounts you name, for the positive steps. The two required negative steps use the app. (CC: console documents.)
- II-D12, unverified accounts: No token registration until the email is verified.
- II-D13, two-device walk step: Tests only. (CC: required.)
- II-D14, request no longer pending when tapped: Show the Requests list as it is. No new copy.
- II-D15, delivered notifications at sign-out: Clear all delivered notifications whenever a session ends, on every path.
- II-D16, before-state evidence: Two observations in your words, which CC writes into the notes file, as happened in NPM-3a-i. (CC: four captures, including a fresh account through onboarding.)

**Reviewer notes, not Kyle's words:** "authoritative session-loss path" in Kyle's D15 clarification is implemented as the transitions the existing session-loss effect already uses (explicit sign-out, account deletion, a different account signing in); a signed-out cold start is not one. The two forced sign-out paths are not changed by this slice and stay under AUTH-OFFLINE-REFRESH-SIGNOUT.

---

## Findings carried as requirements (PA-6)

The one-line labels below are reviewer summaries, not ruling text and not CC's wording. CC's three report files (NPM-3a Step 0, Addendum 1, Community safety Step 0) are the text of record for each finding.

| Finding | Reviewer summary | Workstream |
|---|---|---|
| H1 | Only one of the two DM senders can deliver to an iPhone | 3a-i |
| H2 | The sender that delivers ignores every preference | 3a-i |
| H3 | Most users never have an Expo token saved | 3a-ii |
| H4 | Connection requests produce no push | 3a-i |
| H5 | Any signed-in user can push arbitrary text to any user | 3a-i (push side); RULES (write side) |
| H6 | Nothing removes a token at sign-out or account switch | 3a-ii |
| N1 | Account deletion leaves Community notification records behind | 3a-i |
| N2 | Unregistering at sign-out is undone at the next launch | 3a-ii (resolved by R1-K11: no local unregister) |
| N3 | Connections-only messaging is enforced by screens, not rules | 3a-i (push eligibility); RULES (writes) |
| S1 | Removing a post does nothing on the phone | SAFETY |
| S2 | Any signed-in user can rewrite comments and inflate likes | RULES |
| S3 | Most content is never checked | SAFETY |
| S4 | A report notifies nobody | SAFETY |
| S5 | The repo Terms promise blocking the app does not have; Terms copies disagree | AGE-TERMS; SAFETY (block) |
| S6 | Suspension only blocks some actions | RULES; 3a-i (push eligibility) |
| S7 | An accepted connection cannot be ended in the app | SAFETY (SM-5, block) |

## Pending facts and open confirmations

| Item | Blocks | Owner |
|---|---|---|
| Expo push tool check (S3-5) | Which branch of S3-4 the 3a-i walk uses | Kyle, as walk step 1 |
| Reviewer's reading of server evidence for no-send events (S3-4 note) | How those walk steps are judged | Kyle |
| Cooldown or daily cap cleanly enforceable in rules | RI-5 | RULES Step 0 |
| Stored connection ID versus predictable connection IDs | RI-1 design choice | RULES Step 0, then Kyle |
| Authors can delete their own comments today | RI-3 | RULES Step 0 |
| Consent gate and Privacy Policy cover post text sent to OpenAI | SM-13 | SAFETY Step 0 |
| What service the image check calls | SM-13 (images) | SAFETY Step 0 |
| Blocklist contents | SM-12 | Kyle, with Jen's review |
| Crisis language in Community composers | SM-14 | Jen |
| Existing beta users must re-acknowledge | AT-2 | AGE-TERMS Step 0 |
| Retention and legal language | AT-5 | Legal review |

## Ledger and checklist items these rulings create

- **Proposed by the reviewer, not yet ruled:** a ledger item to replace the personal Expo access token with a robot user's token (EXPO-SEC).
- **Ledger, not launch-blocking:** Profile name validation; token ownership on account switch after an offline sign-out; web bell notifications for the web app's return (all R1-K18). Expo delivery receipts and stale or unregistered token cleanup (S2-7). Connection-request cooldown and daily cap, if not cleanly enforceable (RI-5). `notifyOnInviteCreated` as dormant legacy web infrastructure (R1-K3).
- **Pre-submission checklist:** age-rating answers (R1-K17, AT-6); App Review notes with two connected demo accounts (AT-6).
- **Required pre-launch checks:** the end-to-end moderation rehearsal (SM-REHEARSAL); Community push registration and delivery on the first standalone build, with at least one DM push and one connection-request push (PLC-1); the four scheduled jobs still Paused after any functions deploy (R1-DEPLOY, S2-9).
