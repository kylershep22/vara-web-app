# NPM-3a-i deploy and walk

**BUILT hash:** `40e17af` on `journey/npm-3a-i-community-push-server`.

**Kyle deploys and walks. Nothing here is run by CC.** Every result below is recorded in Kyle's own words.

**Accounts:** R receives. S is the second test account. One iPhone on the Expo dev client.

---

## Evidence rule

Kyle's ruling S3-4, quoted from `docs/decisions/community-v1-rulings.md`:

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

**REVIEWER READING, NOT RULED ON BY KYLE:** for a step that should send nothing, the server evidence is exactly one received line, an ineligible outcome with its reason code, no marker document and no send.

**What the server writes (for reading the evidence).** Every invocation writes exactly two log lines, both with the message `community_push`:

- a **received** line at the start: `stage: received`, `kind`, `eventId`;
- an **outcome** line at the end:
  - `stage: outcome` and `outcome`, which is one of `sent`, `ineligible`, `duplicate`, `config_missing` or `send_failed`;
  - a `sent` line carries `kind`, `eventId`, `recipientId` and Expo's `ticketId`, and is written only after Expo accepted the request;
  - every other outcome carries `reason` (and `code` for errors).

---

## Part 1: push tool check

Run this **before any deploy, and before the Expo security setting is on.**

Kyle's ruling S3-5, quoted from `docs/decisions/community-v1-rulings.md`:

> 5. Expo Push Tool: approve as walk step 1 before deploy/security enforcement.
> Interpret it as:
> - successful visible push → device-banner proof is feasible and required in this walk;
> - confirmed dev-client/runtime inability → use the server-evidence branch and mark banner steps NOT RUN;
> - ambiguous/configuration failure → STOP; do not treat it as proof that the dev client cannot receive pushes.

1. Sign in as R. Open Settings › Notifications and check that Device notifications says Allowed.
2. In the Firestore console, copy R's `expoPushToken` from `userPrivate`.
3. At expo.dev/notifications, paste the token, enter any title and body, send, and lock the phone at once. Note what the tool reports, and whether a banner arrived within two minutes.
4. Sign in as S and repeat step 3 with R's token.
5. If a banner arrived both times, device evidence is required in Part 3. For anything else, STOP and report to the reviewer exactly what the tool showed. Do not deploy.

---

## Part 2: deploy

Do these in this order. Kyle records each result in his own words.

1. From the repo root, record the branch, `git rev-parse --short HEAD` and a clean `git status`. HEAD is the deployed hash.
2. Run `npm test` in `functions/` and in `functions-notifications/`. Expected:
   - `functions/`: 60 tests in 6 suites;
   - `functions-notifications/`: 109 tests in 6 suites.

   These were measured at `40e17af`.
3. In Cloud Scheduler, check that sendDailyRhythm, sendHabitReminders, sendInsights and sendMilestones all show Paused.
4. Run `firebase deploy --only functions` from the repo root. The deletion prompt must list exactly onNewDirectMessage and onNewConnection; answer yes only then. If it lists anything else, answer no and stop.
5. Run `firebase deploy --only firestore:rules`.
6. Check Cloud Scheduler again: all four should still show Paused. Pause any that is not, and record which.
7. In the functions list, check that notifyOnConnectionRequestCreated exists and that onNewDirectMessage and onNewConnection are gone. Check that Firestore still has no `config` collection.
8. At expo.dev/settings/access-tokens, turn on Enhanced Security for Push Notifications. Then send the Part 1 tool push once more, without an access token. It should now be refused.
9. Record under deployment evidence that 2185d83 went live with this deploy, and that onUserCreate's repo version was accepted as reviewed. Kyle's ruling S3-3, quoted from `docs/decisions/community-v1-rulings.md`:

   > 3. Deploy inventory: approve `2185d83` going live with the 3a-i unscoped deploy. Also accept the repo version of `onUserCreate` as reviewed based on its previously merged/walked `userPrivate` slice despite the missing console deploy date. Record both explicitly in the deployment evidence.

---

## Part 3: events

For each event, Kyle records the server evidence and, if Part 1 required it, what the phone showed.

**Where the evidence is:**

- **Logs:** Logs Explorer (Google Cloud console › Logging). Set the time range to cover the step.
- **Event ID:** the ID of the triggering document. That is the new `directMessages` document for a message, or the new `connections` document for a request. It is also printed in the received line.
- **The marker:** `notificationLog/{R's uid}/community/{event ID}`, in the Firestore console.

**Direct-message trigger query (E1, E2, E4):**

```
resource.type="cloud_run_revision"
resource.labels.service_name="notifyondirectmessagecreated"
jsonPayload.message="community_push"
jsonPayload.eventId="<the directMessages document ID>"
```

**Connection-request trigger query (E3):**

```
resource.type="cloud_run_revision"
resource.labels.service_name="notifyonconnectionrequestcreated"
jsonPayload.message="community_push"
jsonPayload.eventId="<the connections document ID>"
```

To confirm there is exactly one expected trigger, the same queries without the `jsonPayload.eventId` line, over the step's time window, should show only that event's two lines.

### E1. A message between connected users is pushed

R and S are connected, and R has Direct messages on. As S, send R the message "walk test 1" and lock the phone.

- **Expect a push:** title New message, body "{S's name} sent you a message.", with no message text.
- **Server evidence to look for:**
  - one received line, `kind: direct_message`;
  - one outcome line, `outcome: sent`, carrying `recipientId` (R's uid) and a `ticketId`;
  - the marker document exists;
  - no line contains "walk test 1", either name or a token.

### E2. Direct messages off sends nothing

As R, turn Direct messages off and wait for any Saving... to clear. As S, send "walk test 2" and lock the phone.

- **Expect nothing sent.**
- **Server evidence to look for:**
  - one received line;
  - one outcome line, `outcome: ineligible`, `reason: preference_off`, at INFO severity;
  - no marker document for this event ID;
  - no send.

Then, as R, turn Direct messages back on.

### E3. A connection request is pushed

In the Firestore console, delete the connection document between R and S. As S, send R a connection request and lock the phone.

- **Expect a push:** title New connection request, body "{S's name} wants to connect. Open Vara to respond."
- **Server evidence to look for:**
  - on notifyonconnectionrequestcreated: one received line, `kind: connection_request`;
  - one outcome line, `outcome: sent`, carrying `recipientId` (R's uid) and a `ticketId`;
  - the marker document exists at `notificationLog/{R's uid}/community/{connections document ID}`.

### E4. A message without an accepted connection sends nothing

With that request still pending, as S open the existing conversation with R, send "walk test 4" and lock the phone.

- **Expect nothing sent,** because there is no accepted connection.
- **Server evidence to look for:**
  - one received line;
  - one outcome line, `outcome: ineligible`, `reason: not_connected`;
  - no marker document for this event ID;
  - no send.

Then, as R, accept the request.

**Reason codes you may see if a step goes wrong:**

| Reason | Outcome | Severity | Meaning |
|---|---|---|---|
| `shape_ignored` | ineligible | INFO | the document is not in the shape the app writes |
| `actor_inactive` | ineligible | INFO | the sender is suspended or banned |
| `preference_off` | ineligible | INFO | the recipient turned this preference off |
| `not_connected` | ineligible | INFO | no accepted connection between the two |
| `token_missing`, `token_malformed` | ineligible | INFO | the recipient has no usable Expo token in `userPrivate` |
| `actor_read_failed`, `connection_read_failed`, `preference_read_failed`, `token_read_failed` | ineligible | ERROR | a read failed |
| `preference_malformed` | ineligible | ERROR | a stored preference is not literal true or false |
| `duplicate_event` | duplicate | INFO | the marker already existed |
| `expo_access_token_missing` | config_missing | ERROR | the EXPO_ACCESS_TOKEN secret is unavailable or empty |
| `marker_failed` | send_failed | ERROR | the marker could not be written |
| `expo_send_failed` | send_failed | ERROR | the request to Expo failed; `code` carries Expo's code, for example UNAUTHORIZED |
| `expo_ticket_error` | send_failed | ERROR | Expo returned an error ticket; `code` carries Expo's code, for example DeviceNotRegistered |
| `unexpected_error` | send_failed | ERROR | something threw unexpectedly |

---

## Tests only, not walked

General off; stored quiet hours; the three flag states; a repeated event; a failed marker write; a suspended sender; a malformed preference; a missing or failed token read; the name limit; a message to yourself; legacy connection shapes; the rules rejections; a missing access token; Android.

## Not covered here

Tap routing and token handling at sign-out belong to NPM-3a-ii. The two-person standalone proof is the required pre-launch check PLC-1.

## Merge gate

Kyle states both gate keys in his own words, the suite numbers and that the walk passed, before any merge command is issued.

---

## Results (Kyle's words only)

Recorded 2026-10-03. Kyle's statements are in block quotes, exactly as he gave them. Recorded facts and reviewer notes are under their own headings and are not Kyle's words.

### Part 1: push check

**Kyle's words:**

> In my testing, I sent a note from R to S and I did get the toast banner.

> Sent another message and minimized Vara - the notification popped up as an iOS push notification - looks to be working as intended

**Reviewer note:** Kyle did not use the Expo push tool for Part 1. He sent messages through the sender that was live before the deploy. The reviewer treated the toast and the iOS notification as the successful visible push in ruling S3-5, so device evidence was required in Part 3. The pre-deploy toast showed the old copy, with the sender's name and the message text.

**Recorded fact:** Kyle's pre-deploy screenshot was not in the repo when these results were recorded (docs/walks/npm-3a-i/predeploy/predeploy-toast.png did not exist), so it is not referenced here.

### Part 2: deploy

**Recorded facts, from the terminal output Kyle pasted:**

- Branch journey/npm-3a-i-community-push-server, HEAD 3acafa8, clean tree. 3acafa8 is the deployed hash.
- functions: 60 tests passed in 6 suites. functions-notifications: 109 tests passed in 6 suites.
- firebase deploy --only functions: the deletion prompt listed exactly api:onNewConnection and api:onNewDirectMessage; Kyle answered Yes; both were deleted. notifyOnConnectionRequestCreated was created. Every other function was updated, including onUserCreate. Access to EXPO_ACCESS_TOKEN was granted. Deploy complete.
- firebase deploy --only firestore:rules: compiled and released.

**Kyle's words on the checks after the deploy (scheduled jobs; functions list; no config collection; the Expo setting):**

> 1. All paused

> 2. Confirmed

> 3. Confirmed

> 4. Toggled Enhanced security for push notifications ON

**The refusal check.**

Kyle's words on the web tool:

> Send the notification and it came through on my phone - I left the Access Token section blank

**Recorded fact:** a raw request from Kyle's terminal with no access token was then refused by Expo with code UNAUTHORIZED.

Kyle's words:

> Nothing arrived on my phone

**Reviewer note:** the web tool delivered because Kyle was signed in to Expo in that browser; the raw request is the unauthenticated test.

**Not reported:** Kyle did not report the Cloud Scheduler check before the deploy. It is recorded as not confirmed before the deploy and confirmed after it.

**Deployment evidence.** 2185d83 went live with this deploy, and the repo version of onUserCreate went live accepted as reviewed, under Kyle's ruling S3-3, quoted from docs/decisions/community-v1-rulings.md:

> 3. Deploy inventory: approve `2185d83` going live with the 3a-i unscoped deploy. Also accept the repo version of `onUserCreate` as reviewed based on its previously merged/walked `userPrivate` slice despite the missing console deploy date. Record both explicitly in the deployment evidence.

### Part 3: events

Times are as shown in the Logs Explorer on 2026-10-03.

#### E1. A message between connected users

**Recorded facts, from Kyle's log screenshot:** on notifyondirectmessagecreated, exactly two results: received at 11:54:49.397, and outcome sent at 11:54:50.323 with a recipient ID and a ticket ID.

**Kyle's words on the marker and the phone:**

> 1. confirmed I see that in firestore

> 2. It was a notification box that appeared at the top of the app with the message you stated (I think that is a toast?)

**Reviewer note:** the message stated to Kyle was title New message, body "Kyle Shepard62 sent you a message."

#### E2. Direct messages off

**Kyle's words:**

> Running E2, I did not get the toast message with Direct Messages notification off - attached are the logs

> I turned off the notification for 63, logged out and sent the message as 62 - no notification sent to 63 as intended - The way this is working now satisfies what I want.

**Recorded facts:** received at 12:03:42.385; outcome ineligible with reason preference_off at 12:03:42.671. The query showed four results: these two and E1's two. The absence of a marker was not checked.

#### E3. A connection request, and one extra event Kyle added (a connection request to an account with Connection requests off)

**Kyle's words:**

> I used a few different test account that I already had for this test - the first one with connections on fired a toast message, the one that had those notifications toggled off did not fire a toast - here are the logs for both. Everything worked as expected - lets close this out and move on

**Recorded facts:** on notifyonconnectionrequestcreated:
- The first event was received at 12:13:49.366, with outcome sent at 12:13:50.178 carrying a recipient ID and a ticket ID. The query showed exactly two results.
- The second event was received at 12:18:14.963, with outcome ineligible and reason preference_off at 12:18:15.101.

**Marker for the first event, Kyle's attestation:**

> Marker for the connection request that sent (12:13):lAdN0VIknjuF5B6z5bFe

#### E4. A message without an accepted connection

**NOT RUN, by Kyle's decision.** Tests are the evidence.

### Deviations from the script

- Part 1 used live messages, not the Expo push tool.
- The accounts used were not the script's R and S throughout.
- A lock-screen banner from the new sender was not captured (the two post-deploy notifications were toasts), so that stays with the required pre-launch check COMMUNITY-PUSH-STANDALONE-CHECK.

**Reviewer note on accounts:** the user ID that received E1 and the E3 request is the same ID the log shows as the sender of E2. Kyle's account of E2 names the sender as 62 and the recipient as 63. Which test account holds which ID was not checked. Neither reading changes a result.

### Gate keys

**Kyle's attestation, verbatim:**

> Gate keys, in my own words: Suites green: functions 60 tests passed in 6 suites, functions-notifications 109 tests passed in 6 suites. Walk passed.
