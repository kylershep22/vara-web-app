# Vara Tech Debt Backlog

Items found during phased work that don't block the current phase.
Phase 6 polish sweep is the working list.

---

## Pre-existing TypeScript errors (181 total as of Phase 1 sub-step 1)

`npx tsc --noEmit` reports 181 errors across roughly 60 files. None are
introduced by Phase 0 or Phase 1 work — they predate the redesign branch.
Run tsc fresh at Phase 6 entry to get a live list before triaging.

### Top error codes by frequency

| Code | Count | Meaning | Common pattern |
|---|---|---|---|
| TS2322 | 45 | Type not assignable | Lucide icon names typed too strictly; string literals don't match closed unions |
| TS2769 | 40 | No overload matches | `Firestore \| null` passed where `Firestore` is required (e.g. `NeuroplasticityTracker.tsx`) |
| TS2339 | 33 | Property does not exist | Stale property references (e.g. `radius.thin` not in current token set) |
| TS7053 | 14 | Index expression is not of type 'number' | Implicit-any indexing |
| TS2345 | 13 | Argument type not assignable | Often the same Firestore-null shape as TS2769 |
| TS2353 | 11 | Object literal extra properties | Stale prop names on shared components |
| TS2304 | 5 | Cannot find name | Typically removed-but-still-imported symbols |
| TS18047 | 4 | Possibly null | Same Firestore-null shape, narrowed differently |
| TS2820 | 3 | Did you mean...? | Lucide icon typos (`'lung'` → `'lungs'`) |
| TS2551, TS2367 | 3 each | Property/comparison typos | Renamed fields not propagated |
| Others | 4 | TS7006, TS7016, TS2741, TS2430, TS2305, TS1117 | Long tail |

### High-confidence sweep candidates

These cluster around three root causes. Fixing each root fixes most of the
errors in the cluster:

1. **Firestore null narrowing.** `getFirestore()` typed as
   `Firestore | null` but call sites assume non-null. Add a single
   non-null assertion at the boundary (or a typed wrapper) in
   `src/config/firebase.ts` and the cluster collapses. Affects most
   TS2769 / TS2345 / TS18047 errors.
2. **Lucide icon name drift.** Several components reference icon names
   that aren't in the installed lucide version's literal-union type.
   Sweep with a search for the offending names and pick the closest valid
   icon. Affects TS2322 / TS2820 errors.
3. **Stale design tokens.** Components reference tokens like
   `radius.thin` that don't exist in the current
   `src/constants/spacing.ts`. Either add the token (if it's a
   semantically-needed alias) or rewrite the call site. Affects
   TS2339 errors.

### Working list (top files by error count)

Run during Phase 6:

```bash
npx tsc --noEmit 2>&1 | grep -E "^src/" | \
  sed -E 's/^(src\/[^(]+).*$/\1/' | sort | uniq -c | sort -rn
```

The current top-of-list (April 2026) starts with the brain/, dashboard/,
community/, and library/ component clusters.

### Discipline

Do **not** fix these ad-hoc during Phases 1–5 unless one actively blocks
work. Touching them during in-flight phase work risks merge churn and
distracts from phase deliverables. Phase 6 is the sweep window.

---

## Accessibility — known shortfalls

### "End early" destructive button: WCAG AA contrast shortfall

**Where:** `EndEarlyConfirmModal` modal CTA + `PlayerTransport` End early
button label. Style is `Soft Coral (#D97A6E)` on `Mist White (#FAFAF6)`,
`fontSize.base = 16` / `fontWeight.medium = '500'`.

**Measured contrast:** 2.884 : 1 (computed via the WCAG 2.1 sRGB
linearization formula).

**WCAG AA target for normal text:** 4.5:1. The destructive label is
classified as normal text per WCAG (large text requires ≥18.66px AND
weight ≥700; 16px/500 qualifies for neither relaxation).

**Why it hasn't been fixed:** Founder directive during sub-step 4.3
sign-off was "don't change the color" to preserve brand fidelity for
Soft Coral as the destructive signal. Bumping the weight to Bold (700)
wouldn't help — size is the binding constraint for the WCAG large-text
rule, not weight. The shortfall is a brand-vs-AA tradeoff that's been
explicitly accepted.

**Phase 6 paths to consider:**
- A slightly darker brand-coral variant (target ≥4.5:1 against Mist
  White; would need Vara_Color_System update).
- Bumping the destructive label to a larger size (≥18.66px) and bold
  weight together — qualifies for the 3:1 large-text rule, which the
  current pair would still narrowly fail, so this likely also requires
  a darker variant.
- A bordered destructive button with the high-contrast color carried
  by the border + a darker text color (visual: still feels like Soft
  Coral, label itself uses a higher-contrast token).
- Accept the AA shortfall and document it in the public a11y
  conformance statement.

Surface to the design system review during Phase 6.

---

## Observability — `logger` is `console.*` in production

**Where:** `mobile/src/utils/logger.ts` — `logger.log/warn/error/debug` are
thin wrappers around `console.*`. The `error` method has a TODO comment
referencing `crashReporting.recordError` that's not wired up.

**Implication:** in TestFlight and App Store builds, `logger.warn`
produces output only to the device console — invisible to the founder
or any remote monitoring. Surfaced during Phase 1 sub-step 4.3.3 sign-off
because the GuidedSessionPlayer's recovery flow logs warnings on
parent-rejection, parent-timeout, and a few other graceful-degradation
paths. If a Phase 2 Firestore write hangs the recovery acknowledgment,
no one finds out unless the user happens to be tethered to a Mac.

**Phase 6 paths to consider:**
- Wire Sentry / Crashlytics / Bugsnag for structured remote logging
  (the `recordError` TODO is the existing scaffold).
- Add a lightweight in-app debug panel that reads from a recent-warnings
  ring buffer (low cost, dev-only, gives founder visibility).
- Decide which warnings warrant remote vs. local-only (recovery
  rejections probably want remote; routine debug noise local-only).

---

## Late-night NSDR swap — device clock skew detection

`services/lateNightNSDRSwap.ts` (Phase 2 sub-step 2.4) reads
`new Date().getHours()` to decide whether to route a Wired user's
"Try something longer" tap to NSDR-20 instead of the Practices
index. Device-local-hour is the source of truth for v1.

Failure modes that v1 doesn't handle:
- **Misconfigured device clock.** Rare. User's device set to wrong
  time. The swap fires (or doesn't fire) at the wrong hour relative
  to their actual local time.
- **Device-time vs server-time drift.** Server has the canonical
  time; we only ever ask the device. No cross-check.

Future versions may want to detect a >30 min skew between device-
time and server-time and either warn the user or fall back to a
server-side hour. Phase 4 at the earliest (alongside the recommender
absorbing this wrapper).

Why not now: spoofing is self-harm only (the user's losing the
benefit of a tailored recommendation, not harming anyone else).
Misconfigured clocks are rare. Skew detection adds a network
dependency to a previously offline-capable surface, which is a
real cost.

---

## CRLF normalization warnings — fix before Android development

Every `git add` of files edited on Windows surfaces:

```
warning: in the working copy of '<path>', LF will be replaced by CRLF
the next time Git touches it
```

Cosmetic noise in Phase 2 (iOS-only on macOS dev means it's invisible
to most contributors) but becomes painful when Android development
starts. Per the Implementation Plan, Android lands at Google Play
submission later in the cycle — Windows machines doing Android work
will trip the warning on every commit and risk silent line-ending
mismatches in CI diffs.

**Fix:** add `.gitattributes` at repo root with
`* text=auto eol=lf`. 5-minute change. One follow-up
`git add --renormalize .` to rewrite the index.

**Why not now:** scope creep against Phase 2 charter, and the fix is
genuinely invisible on macOS until Android work begins. Land before
the first Windows-side Android session.

---

## Path aliases for imports — Phase 6 polish

Considered during Phase 2 sub-step 2.2 composition. Currently no
`paths` in `mobile/tsconfig.json` and no `babel-plugin-module-resolver`
config — every import is relative. Sub-step 2.2's deeper folder
nesting (`components/checkin/flow/`) makes relative paths fragile
(`../../../services/outcomeClassifier`).

**Phase 6 path:** introduce `@services/*`, `@components/*`,
`@constants/*`, `@hooks/*`, `@types/*`, `@utils/*` aliases via
`tsconfig.json.compilerOptions.paths` + the corresponding
`babel-plugin-module-resolver` config + Jest's
`moduleNameMapper`. Sweep the existing tree in one pass.

Not done now: scope creep against the 2.2 charter, and the sweep
touches every file. Cleanest at Phase 6 alongside the broader
import/test-config consolidation.

---

## Phase 1 acceptable, post-launch consolidation

### Consolidate End early modal — currently two instances

`EndEarlyConfirmModal` is mounted in two places:
- Inside `PlayerTransport.tsx` — owned by transport, opened by the
  transport's End early button.
- Inside `GuidedSessionPlayer.tsx` — owned by the player, opened by the
  header X button.

Both render identical UI and both ultimately dispatch
`END_EARLY` (with potentially different `reason` values — transport may
fire `audio_error` in error state, header X always fires `user_exit`).

**Why two instances:** PlayerTransport's modal ownership was signed off
during sub-step 4.3.2 with explicit YAGNI framing. Adding the header X
in 4.3.3 needed the same confirmation pattern but couldn't reach into
PlayerTransport's modal without lifting state up. Two instances was
cheaper than the refactor and the in-tree behavior is correct (only one
modal can be visible at any given moment due to local visibility state).

**Drift risk:** if copy or styling on the modal changes, both instances
must be touched. The component is shared but the *invocations* aren't.
A future writer who tweaks the modal in PlayerTransport without noticing
the header X path will produce visible inconsistency.

**Phase 6 path:** lift modal state up to GuidedSessionPlayer. Both
PlayerTransport's End early button and the header X open the same modal.
Transport calls `onEndEarlyRequested()` (signal, not confirmation);
player owns visibility and the dispatched-reason mapping. Single source
of truth for the modal's behavior.
