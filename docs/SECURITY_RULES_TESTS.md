# Security & Subscription Tests — Manual Checklist

This document tracks security-critical test scenarios that are **not yet** covered by automated tests, including everything in `functions/` (which has no jest setup) and any manual verification needed against deployed rules.

For automated rules tests, see `firestore.rules.test.js` at the repo root (run with `npm run test:rules`).

---

## A. `firestore.rules` — automated coverage

The following are covered by automated tests in `firestore.rules.test.js` under the **"Subscription State Lockdown"** describe block. Listed here for reference:

**CREATE path** (initial user-doc creation during signup — trial bootstrap is owned by the `onUserCreate` Cloud Function trigger, NOT the client):

- [x] Authenticated client can create their own user doc without subscription fields
- [x] Authenticated client cannot include a `subscription` block on CREATE
- [x] Authenticated client cannot include `eventData` on CREATE
- [x] Authenticated client cannot include `subscriptionType` on CREATE
- [x] Authenticated client cannot include `hasActiveSubscription` on CREATE

**UPDATE path:**

- [x] Authenticated client cannot write `subscription.type`
- [x] Authenticated client cannot replace the entire `subscription` object
- [x] Authenticated client cannot extend `subscription.trialExpiresAt`
- [x] Authenticated client cannot write `eventData`
- [x] Authenticated client cannot flip `subscriptionType` (top-level convenience field)
- [x] Authenticated client cannot flip `hasActiveSubscription` (top-level convenience field)
- [x] Authenticated client can still update `displayName`
- [x] Authenticated client can still update `hasCompletedOnboarding`
- [x] Authenticated client cannot smuggle a subscription change inside a multi-field update

Run: `npm run test:rules` (requires Firebase emulators).

---

## B. `validateEventCode` Cloud Function — manual verification

The `functions/` package has no test framework installed (only `firebase-functions-test` as a devDependency, no jest config). The following scenarios should be verified manually against the emulator until a function test suite is set up.

### Setup
1. `firebase emulators:start --only functions,firestore,auth`
2. Seed an `events` collection doc: `{ code: "TEST123", isActive: true, expiresAt: <future>, name: "Test Event", freeAccessDays: 90 }`
3. Seed a `users/{uid}` doc per scenario below.

### Test matrix

| # | User `subscription.type` | Expected | Verifies |
|---|---|---|---|
| 1 | `'trial'` | ✅ Redemption succeeds — user becomes `event` | Trial users can redeem |
| 2 | `'expired'` | ✅ Redemption succeeds — user becomes `event` | Expired users can redeem (reactivation path) |
| 3 | `null` / undefined / no doc | ✅ Redemption succeeds — user becomes `event` | New / no-subscription users can redeem |
| 4 | `'premium'` | ❌ `HttpsError('already-subscribed', "You already have an active Vara subscription — event access isn't needed.")` | **Premium not downgraded** |
| 5 | `'coaching'` | ❌ `HttpsError('already-subscribed', ...)` | **Coaching not downgraded** |
| 6 | `'event'` (eventData already set) | ❌ `HttpsError('already-exists', "You've already joined an event")` | Existing double-redemption guard preserved |

### Invocation
```javascript
const { httpsCallable, getFunctions, connectFunctionsEmulator } = require('firebase/functions');
// ...auth as test user...
const functions = getFunctions();
connectFunctionsEmulator(functions, 'localhost', 5001);
const validate = httpsCallable(functions, 'validateEventCode');
try {
  const result = await validate({ code: 'TEST123' });
  console.log('Result:', result.data);
} catch (err) {
  console.log('Error code:', err.code);
  console.log('Error message:', err.message);
}
```

### Acceptance for cases 4 & 5
- Server-side: `users/{uid}.subscription` is **unchanged** after the rejected call (premium expiry not overwritten).
- Client-side: `EventCodeSheet` displays the friendly message verbatim.

---

## C. Trial bootstrap — server-side via `onUserCreate`

Trial subscription bootstrap is now owned by the `onUserCreate` auth trigger:

- **Trigger**: `functions/src/auth/onUserCreate.js` (v1 `functions.auth.user().onCreate`)
- **Behavior**: when a new Firebase Auth account is created (any provider), writes the trial subscription block to `users/{uid}` via Admin SDK with `merge: true`
- **Field shape** (identical to the pre-migration client-side write):
  - `subscription: { type: 'trial', trialStartedAt: <serverTimestamp>, trialExpiresAt: <now + 7 days> }`
  - `subscriptionType: 'trial'`
  - `hasActiveSubscription: true`
- **Idempotency**: if `subscription.type` is already set on the doc, the trigger logs and exits without overwriting
- **Client**: `AuthContext.tsx` no longer writes any subscription fields; it uses `setDoc(..., { merge: true })` so its non-subscription fields don't race-overwrite the trigger

### Manual verification scenario — new signup

1. Run the mobile app pointing at the Firebase emulator suite (or a non-production project) with `emulators:start --only auth,firestore,functions`.
2. Sign up a new test user via the app's signup screen.
3. In the Firebase Emulator UI (or Firestore Console for a real project), open `users/<new-uid>`.
4. Verify:
   - `subscription.type === 'trial'`
   - `subscription.trialStartedAt` is a server-issued timestamp (not client time)
   - `subscription.trialExpiresAt` is exactly 7 days after `trialStartedAt`
   - `subscriptionType === 'trial'`
   - `hasActiveSubscription === true`
   - The client-side fields (`displayName`, `email`, `hasCompletedOnboarding: false`, `createdAt`, `updatedAt`) are also present
5. In the Functions emulator logs (or production Cloud Logging), find the `"Trial subscription bootstrapped"` log line tagged with the new uid.

## D. Residual gaps (not fixed by this change)

- **Event-code redemption cap**: `validateEventCode.js` increments `participantCount` but does not enforce a max — codes can be redeemed an unlimited number of times. Tracked separately.
- **Cross-event collision**: `users/{uid}.eventData` is a single object; the `already-exists` guard prevents joining a second event, but there's no flow to switch events. Tracked separately.
