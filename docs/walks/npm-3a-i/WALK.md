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
