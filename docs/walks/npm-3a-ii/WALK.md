# NPM-3a-ii deploy and walk

**BUILT at `67e6112`** on `journey/npm-3a-ii-community-push-phone`. The branch tip is the docs
commit directly after it; it changes no code.

Kyle deploys and walks. Nothing here is run by CC.

**Accounts.** A is the account on the phone. B and C are other test accounts. A and B are
connected; A and C are not. One iPhone on the Expo dev client, built from this branch.

## What the evidence must show

Register entry S3-4 (Kyle, verbatim):

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

Kyle's Round 8 ruling on what this walk must prove after sign-out (verbatim):

> The walk should separately prove after sign-out that existing delivered notifications are cleared and that newly generated events for the departed account no longer reach that phone.

The walk-scope clarification (R0-WALK-SCOPE, Round 6, Kyle, verbatim):

> The general 90–95% common-use-case walk preference does not override later explicit launch-blocking tests, security/privacy invariants, Community safety requirements, account-isolation checks, or required pre-launch checks. Later specific rulings control.

W7, W8 and W9 are account-isolation checks and are REQUIRED.

## Part 1: deploy

Record each result in your own words in Results.

1. **Branch, hash and clean tree.** In Windows cmd, from `C:\Users\kyler\wellness-app`:
   ```
   git branch --show-current
   git rev-parse --short HEAD
   git status --porcelain
   git diff --stat 67e6112 HEAD -- functions functions-notifications firebase.json
   ```
   Expect `journey/npm-3a-ii-community-push-phone`, the docs commit's hash, and nothing from the
   last two commands (a clean tree, and no functions change after BUILT). Record the hash; it
   is the deployed hash.
2. **Both functions test suites.**
   ```
   cd functions
   npm test
   cd ..\functions-notifications
   npm test
   cd ..
   ```
   Expect functions: 60 tests passed in 6 suites. functions-notifications: 125 tests passed
   in 8 suites.
3. **The four scheduled jobs are Paused** (Google Cloud console, Cloud Scheduler), before the
   deploy.
4. **Deploy**, from the repo root:
   ```
   firebase deploy --only functions
   ```
   This is the unscoped functions deploy (Kyle's Round 8: "Unscoped deployment remains the
   rule, with the same deploy gates used by NPM-3a-i."). **No deletion prompt is expected.** If
   one appears, answer **no** and stop; report what it listed.
5. **The four scheduled jobs are still Paused**, after the deploy.
6. **No rules deploy.** This slice changes no rules.

What the deploy changes: notifyOnDirectMessageCreated and notifyOnConnectionRequestCreated now
put `recipientId` in the push data. Every other function is redeployed unchanged.

## Part 2: helper setup

The helper writes one test event as the app would. It is dry-run by default, refuses any account
outside your allowlist, and never prints a token. Details: `scripts/walk/community-push/README.md`.

1. Create the allowlist from the example, and put in the project ID and the UIDs of A, B and C
   (Firebase console, Authentication):
   ```
   copy scripts\walk\community-push\allowlist.example.json scripts\walk\community-push\allowlist.local.json
   notepad scripts\walk\community-push\allowlist.local.json
   ```
   `allowlist.local.json` is ignored by git.
2. Point the helper at the service-account key kept outside the repo. If Norton TLS inspection is
   on, set the root CA too, as for the migration scripts:
   ```
   set GOOGLE_APPLICATION_CREDENTIALS=C:\path\outside\the\repo\serviceAccountKey.json
   set NODE_EXTRA_CA_CERTS=C:\path\to\norton-root-ca.pem
   ```
3. One dry run:
   ```
   node scripts\walk\community-push\communityPushHelper.js message --from B --to A
   ```
   It should print the project, `Sender:    B  <B's UID>  <B's name>`, `Recipient: A  <A's UID>
   <A's name>`, the A and B conversation's ID, `Accepted connection between them: yes`, the
   `directMessages` document it would write, and `DRY RUN: nothing was written.` Nothing is
   written.

Every helper command below adds `--execute`. It then prints `WROTE <collection>/<id>`; that ID is
the event ID for the queries and the marker.

## Part 3: steps

**Server evidence, as in `docs/walks/npm-3a-i/WALK.md`.** Logs Explorer (Google Cloud console,
Logging), time range covering the step.

Direct-message trigger:
```
resource.type="cloud_run_revision"
resource.labels.service_name="notifyondirectmessagecreated"
jsonPayload.message="community_push"
jsonPayload.eventId="<the directMessages document ID>"
```

Connection-request trigger:
```
resource.type="cloud_run_revision"
resource.labels.service_name="notifyonconnectionrequestcreated"
jsonPayload.message="community_push"
jsonPayload.eventId="<the connections document ID>"
```

Without the `eventId` line, over the step's window, the query should show only that event's two
lines (exactly one trigger). A pushed event shows a received line and an outcome line with
`outcome: sent`, the recipient's ID and a ticket ID, and its marker
`notificationLog/{recipient UID}/community/{event ID}` exists in Firestore. No line contains a
message text, a name or a token.

### W1. A grant in onboarding saves the token
Create a fresh account, verify its email, go through onboarding and tap the button to allow
notifications at the Reminder step, then Allow on the iOS sheet. Do not open Settings.
- **Firestore console:** `userPrivate/{new UID}` has an `expoPushToken` (ExponentPushToken[...]
  format; do not paste the value).

### W2. The toast taps through
A signed in, the app open on Today.
```
node scripts\walk\community-push\communityPushHelper.js message --from B --to A --execute
```
- **Phone:** a toast reading **New message** and "{B's name} sent you a message.", with no
  message text. Tap it: the A and B conversation opens.
- **Server:** `outcome: sent`, recipient A, a ticket ID; the marker exists.

### W3. Hidden in the open conversation
A inside the A and B conversation.
```
node scripts\walk\community-push\communityPushHelper.js message --from B --to A --execute
```
- **Phone:** no toast; "NPM-3a-ii walk test message" appears in the thread.
- Then go back out of the conversation and run the same command again. **Phone:** the toast
  shows.
- **Server, both events:** `outcome: sent`; the hiding happens on the phone.

### W4. Tap from the background
A signed in, the app in the background (home screen).
```
node scripts\walk\community-push\communityPushHelper.js message --from B --to A --execute
```
- **Phone:** a banner. Tap it: Vara opens on the A and B conversation.
- **Server:** `outcome: sent`; the marker exists.

### W5. Tap from a cold start
A signed in, Vara swiped away in the app switcher.
```
node scripts\walk\community-push\communityPushHelper.js message --from B --to A --execute
```
- **Phone:** a banner. Tap it: Vara launches into the A and B conversation, not Today.
- **Server:** `outcome: sent`.
- If the dev client cannot do this, record W5 NOT RUN with the reason. It then stays with
  COMMUNITY-PUSH-STANDALONE-CHECK.

### W6. Connection request
A and C have no connection document (the helper refuses otherwise). A signed in, the app open.
```
node scripts\walk\community-push\communityPushHelper.js request --from C --to A --execute
```
- **Phone:** **New connection request**, "{C's name} wants to connect. Open Vara to respond."
  Tap it: People opens on Requests.
- **Server:** connection-request trigger, `outcome: sent`, recipient A; the marker exists.

### W7. REQUIRED. Delivered notifications are cleared at sign-out
A signed in, the app in the background.
```
node scripts\walk\community-push\communityPushHelper.js message --from B --to A --execute
```
Leave the banner in Notification Center, untapped. Open Vara from its icon (not the banner),
go to Settings, Logout.
- **Phone:** the Vara notification is gone from Notification Center.

### W8. REQUIRED. Nothing arrives for the signed-out account
Still signed out after W7.
- **Firestore console:** `userPrivate/{A's UID}` has no `expoPushToken` and no `fcmToken`.
```
node scripts\walk\community-push\communityPushHelper.js message --from B --to A --execute
```
- **Phone:** nothing.
- **Server:** the outcome line is `ineligible` with reason `token_missing`; no marker.

### W9. REQUIRED. Nothing arrives for the previous account after a switch
Sign in as B. In the app, open the conversation with A and send A a message.
- **Phone:** nothing for A.
- **Server:** `ineligible`, reason `token_missing`, recipient A.

Then:
```
node scripts\walk\community-push\communityPushHelper.js message --from A --to B --execute
```
- **Phone:** B gets the toast, which shows B is registered on this phone.
- **Server:** `outcome: sent`, recipient B.

## Tests only, not walked

- The two-device case. Kyle's words (Round 8, D13): "D13: tests-only is approved for the
  two-device case. Record that V1 stores one token per user and does not claim comprehensive
  multi-device push behavior." (Ledger row MULTI-DEVICE-PUSH.)
- Grants from the routine editor and the focus timer saving the token.
- A sign-out whose token clear times out or fails offline (signOut proceeds after 5 seconds).
- The forced sign-outs (AUTH-OFFLINE-REFRESH-SIGNOUT).
- Token rotation.
- A payload with no recipientId, or one for another account: no toast and no navigation.
- The toast timing cases: a newer toast replaces the current one with a full duration, also
  during the fade-out; a re-render does not extend a toast.

## Merge gate

Kyle states both gate keys in his own words before any merge command is issued: the suites are
green, and the walk passed.

## Results (Kyle's words only)
