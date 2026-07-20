# Beta Cohort Reset migration

One-time, **irreversible** migration that prepares the entire beta cohort
(<30 users) to re-experience the new stress-recovery onboarding flow on the
next TestFlight build.

Per user it:

| # | Action | Where |
|---|--------|-------|
| a | `hasCompletedOnboarding = false` | `users/{uid}` |
| b | Delete `onboardingStep`, `onboardingStressRecovery` (resume pointer + collected inputs); **decision pending** on `firstShiftAt`, `intentPath` | `users/{uid}` |
| c | Null `dailyRhythm.reminderTime`, delete legacy `dailyReminders` | `notificationPreferences/{uid}` |
| d | Grandfather subscription → `event` (non-privileged source types only) | `users/{uid}` |
| e | Hard-delete derived wellness data (habits, journal, check-ins, sessions, …) | ~38 top-level collections keyed by `userId` |

**Never touched:** Firebase Auth accounts, RevenueCat entitlements, and (by
default) the social graph / messaging / community collections.

## Running

```bash
cd scripts/migrations/beta-cohort-reset

# Dry-run (read-only) — whole cohort. SAFE. Default mode.
node migrate.js

# Dry-run a single user
node migrate.js --user <UID>

# REAL run on ONE user first (prompts: type CONFIRM)
node migrate.js --apply --user <UID>

# REAL run on the whole cohort (prompts: type CONFIRM)
node migrate.js --apply

# Override the service-account key path
node migrate.js --key /abs/path/serviceAccountKey.json
```

Pipe the dry-run to a log for review (the dir's `.gitignore` excludes `*.txt`):

```bash
node migrate.js > dry-run-$(date +%Y%m%d).txt 2>&1
```

## Flags

| Flag | Effect |
|------|--------|
| _(none)_ | Dry-run. Reads everything, writes nothing. |
| `--apply` | Real run. Requires typing `CONFIRM` at the interactive prompt. |
| `--user <UID>` | Target a single user. Combinable with `--apply`. |
| `--key <path>` | Service-account key path. Default: `scripts/serviceAccountKey.json`. |

## Safety model

- **Dry-run by default.** `--apply` is the only way to write.
- **Interactive confirmation.** `--apply` aborts unless the exact string
  `CONFIRM` is typed — a single stray flag cannot wipe data.
- **Idempotent.** Field sets are absolute, deletes no-op when already gone,
  and the grandfather step only fires for non-privileged source types and
  won't clobber existing `eventData`. Re-running converges to the same state.
- **Auth & RevenueCat preserved.** No `admin.auth()` calls; the subscription
  change is Firestore-only.

## Credentials

The Admin SDK key is **not** committed. The script defaults to the existing
gitignored `scripts/serviceAccountKey.json` (project `vara-4a99f`). Override
with `--key`. This directory's `.gitignore` also blocks any local key/log.

## ✅ Locked decisions (Phase-1 review, 2026-06-05)

All config below is confirmed. Recorded here so a Phase-2 runner doesn't
re-litigate it.

1. **Privileged users excluded entirely.** `subscription.type` in
   `['premium', 'event', 'coaching']` → skipped wholesale (no onboarding
   reset, no notif-pref change, no purge, no grandfather). Logged as
   `SKIPPED (privileged)`. See `PRIVILEGED_TYPES`.
2. **Grandfather scope & window.** `none | trial | expired` (and the 12
   accounts with no `subscription` object, treated as `none`) → `event` for
   **365 days**, with a synthetic `eventData` (`eventId: 'beta-grandfather'`;
   no real `/events` doc). See `GRANDFATHER`.
3. **Daily reminder.** Null `dailyRhythm.reminderTime` + delete legacy
   `dailyReminders` in `notificationPreferences/{uid}`. See `RESET_NOTIF_PREFS`.
4. **`firstShiftAt` and `intentPath`.** Both cleared. See `RESET_USER_DOC`.
5. **Purge list.** All 38 top-level collections in `PURGE_COLLECTIONS`
   confirmed as-is. Social / community / messaging (`REVIEW_NOT_PURGED`)
   remain **preserved** (counted in the dry-run, never deleted).

**`lastCheckIn`:** no such user-doc field exists; "today's check-in" is
`brainStateCheckIns/{uid}_{date}`, which is intentionally in the purge list.
Nothing special preserved.
