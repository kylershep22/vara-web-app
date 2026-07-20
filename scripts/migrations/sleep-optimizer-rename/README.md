# Sleep Optimizer → Sleep Wind-Down (routine-name rename)

One-time, **idempotent** data migration. Renames the persisted routine `name`
field `"Sleep Optimizer"` → `"Sleep Wind-Down"` on existing user routine
documents.

## Why this exists

The routine template was renamed in source (`routineTemplates.ts`:
`name: 'Sleep Wind-Down'`, `id: 'evening-sleep-optimizer'`). But
`handleApplyRoutineTemplate` (`useDashboard.ts`) copies `template.name` **into**
the user's Firestore routine doc at apply time. Any user who applied the
template **before** the rename has a doc with `name: "Sleep Optimizer"` — a
banned word — which the dashboard renders verbatim under "Today's routine".

`brandCopyGuard` scans **source only** and cannot see persisted user data, so
this slips past it. This migration fixes the data; the source is already clean.

## What it touches

| Field | Action |
|-------|--------|
| `name` | `"Sleep Optimizer"` / `"Sleep Optimiser"` → `"Sleep Wind-Down"` |
| `updatedAt` | bumped to `serverTimestamp()` |
| _everything else_ | **untouched** |

- **No id is changed.** The routine doc id (the stable completion key for
  `routines/{id}/completions/*`) is never modified. The slug
  `evening-sleep-optimizer` lives only in source, never in the doc, so there is
  no history to orphan.
- **Collection:** top-level `routines`, keyed by a `userId` field.
- **Project:** `vara-4a99f`. Admin SDK / scripted batch — never client writes.

## Selector — two tiers

1. **Auto-rename:** `name` exactly equals `"Sleep Optimizer"` or
   `"Sleep Optimiser"` (the known pre-rename template names).
2. **Flag-only (manual review):** any *other* `name` matching `optim*`
   (case-insensitive, incl. British `-ise/-isation`). These are **reported, not
   rewritten**, so an unrelated user-authored name isn't silently changed.

> The spec also asked to target docs by template id `evening-sleep-optimizer`.
> That id is **not persisted** on the routine doc (`createRoutine` stores only
> `userId/name/type/activities/active/mode/timestamps`), so it can't be a
> selector. The `optim*` flag tier is the compensating safety net.

## Running

```bash
cd scripts/migrations/sleep-optimizer-rename

# Dry-run (read-only) — whole collection. SAFE. Default mode.
node migrate.js

# Dry-run a single user's routines
node migrate.js --user <UID>

# REAL run (prompts: type CONFIRM)
node migrate.js --apply

# REAL run on one user first
node migrate.js --apply --user <UID>

# Override the service-account key path
node migrate.js --key /abs/path/serviceAccountKey.json
```

Pipe the dry-run to a log for review (`.gitignore` excludes `*.txt`):

```bash
node migrate.js > dry-run-$(date +%Y%m%d).txt 2>&1
```

## Flags

| Flag | Effect |
|------|--------|
| _(none)_ | Dry-run. Reads everything, writes nothing. |
| `--apply` | Real run. Requires typing `CONFIRM` at the interactive prompt. |
| `--user <UID>` | Restrict to one owner's routines. Combinable with `--apply`. |
| `--key <path>` | Service-account key path. Default: `scripts/serviceAccountKey.json`. |

## Safety model

- **Dry-run by default.** `--apply` is the only way to write.
- **Interactive confirmation.** `--apply` aborts unless the exact string
  `CONFIRM` is typed.
- **Idempotent.** Docs already named `"Sleep Wind-Down"` are skipped; the
  exact-match query finds them no more after a successful run. Re-running
  converges to 0-to-rename.
- **Narrow blast radius.** Only `name` (+ `updatedAt`) is written, and only on
  exact-name matches. `optim*` near-misses are flagged, never auto-written.

## Credentials / environment

The Admin SDK key is **not** committed (defaults to the gitignored
`scripts/serviceAccountKey.json`, project `vara-4a99f`; override with `--key`).

Known local blockers (see repo memory `reference_admin_sdk_env_blockers`):

- **`scripts/serviceAccountKey.json` is revoked** (invalid JWT signature) — a
  fresh key is required before either the dry-run or apply can authenticate.
- **Norton TLS inspection** — export `NODE_EXTRA_CA_CERTS=<root-ca.pem>` so the
  Admin SDK trusts the intercepted chain. (`*.pem` is gitignored.)

## Sequencing

- **Not a launch blocker** at the current user count (almost nobody applied the
  template before the rename), but it is a live banned word on a user-facing
  surface, so run it **before launch**.
- **Independent of B-3d** — this is data, not source. It does not gate the
  `FOUR_PILLAR_IA` flip and can run any time.

## Status

- [x] Script written, idempotent, dry-run default.
- [x] **Dry-run executed 2026-06-30** against `vara-4a99f` (key valid;
      `NODE_EXTRA_CA_CERTS=../beta-cohort-reset/norton-root-ca.pem`). Result:
      7 routine docs scanned, **1 exact match to rename**
      (`XBwjboIf05nLiMcGqRN1`, user `9gTx3NyOiSbuNkZgazwVZB04x7D3`,
      `"Sleep Optimizer"`), 1 already `"Sleep Wind-Down"` (idempotency
      confirmed), 0 `optim*` flags. Near-zero, as expected.
- [ ] `--apply` (after CONFIRM) — pending sign-off. Run before launch.
