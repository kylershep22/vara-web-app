# CLAUDE.md — Vara Mobile

**Scope:** everything under `mobile/`. This is the active app. The web app at the repo root is dormant; see the root `CLAUDE.md`.

## WHAT THIS IS

React Native + Expo + TypeScript. All app code lives in `mobile/src/`.
Run every command from `mobile/`, never the repo root: `npx tsc --noEmit`, `npm run lint`, `npm test`. The root has no `tsconfig.json` and no `typescript` dependency, so `npx tsc` there resolves to an unrelated placeholder package on npm that prints "This is not the tsc command you are looking for" and exits 1 having typechecked nothing. **Exit 1 with zero `error TS` lines is the trap** — that is not a failing build or a clean one, it is no build at all. A real run reports errors or prints nothing and exits 0.
Jest must run with `--forceExit` (reanimated and timer handles keep the process alive). `npm test` already includes it.

## SOURCE-OF-TRUTH PRECEDENCE

Highest to lowest. When two documents disagree, the higher one wins.

1. `docs/Vara_Journey_Architecture_Roadmap_v3.md` — the journey build: IA, tabs, the Today surface, the weekly loop, phase/journey semantics, and the build sequence (Section 5) with its Section 13 build log. Supersedes the doc below on every topic it covers.
2. `docs/Vara_Today_IA_Restructure_Roadmap_v2.md` — IA, tabs, the Today surface, the capacity model — **only where the journey roadmap above is silent.**
3. `docs/Vara_Reconciled_Product_Spec.md` (v1.7) — all other product behavior.
4. `docs/brand/Vara_Brand_Voice_Copy_Guidelines.md` — all copy.
5. `mobile/Vara_Mobile_UI_Standards.md` (v2.0) — the visual and interaction authority, including token-to-code mapping.

The contracts stay authoritative for their own scope beneath this ladder: `docs/Vara_Engine_Contract.md`, `docs/Vara_Protocol_Engine_Contract.md`, `docs/Vara_Modal_Design_System_v1.1.md`, `docs/Vara_Core_Loop_v2.md`.

`docs/archive/` is history, never a build source. **If a needed decision is not covered by these docs, STOP and ask Kyle. Do not guess on brand-level or product-level decisions.**

## MACHINE-ENFORCED GUARDS

These fail or warn in CI. Know them before you write code.

- **No raw hex literals** — `.eslintrc.js` `no-restricted-syntax` (error). Import from `src/constants/`.
- **`src/__tests__/brandCompliance.test.ts`** — prohibited copy (streak, confetti, urgency). **Walks all of `src/`**, so a new screen is guarded automatically. A waiver means adding the file to `ALLOWLIST` with a one-line reason; an allowlisted path that stops existing FAILS, so stale entries cannot rot.
- **`src/__tests__/brandCopyGuard.test.ts`** — em dash (U+2014) and the optimize/optimizer/optimization family. **Walks all of `src/`** on the same contract: reasoned `ALLOWLIST`, and an allowlist entry naming a missing file FAILS.
- **`src/__tests__/copyDraftSentinel.test.ts`** — pinned count of unapproved drafted strings. **`EXPECTED_SENTINELS` in that file is the single source of truth; read it there rather than trusting a number quoted anywhere else, including here.** This line used to carry a copy of the count and was stale for two slices. The count goes down when the copy owner signs off (Jen for efficacy-adjacent and check-in copy, Kyle for UI strings) and up when new drafted copy lands; either direction must be made in the same commit as the string change **and named in the commit message, with the owner and the strings**. A silent edit to the number is the exact failure this test exists to catch.
- **`src/screens/Focus/__tests__/blocksBrandGuard.test.ts`** — Soft Coral is barred from routine controls in the blocks feature.
- **Firestore rules** — `npm run test:rules`, from the **repo root**, needs the emulator.

## NON-NEGOTIABLES

- No streaks, scores, or denominators anywhere in the UI.
- Soft Coral `#D97A6E` is for genuine errors only. Never pure red, never for routine destructive actions.
- No em dashes in user-facing copy.
- Tokens from `src/constants/` only, never raw colors, sizes, or spacing.
- One primary action per screen.
- Animations respect `useReducedMotion` (`src/hooks/useReducedMotion.ts`).
- Claims are conditional ("can help", "many people find"), never absolute.
- No confetti, no celebration animation. Quiet acknowledgment instead.
- Outcomes are felt self-report. Never a metrics dashboard.
- Firestore rules are allowlist and fail-closed. New collections need rules before the first write.
- **The legacy tasks layer is frozen:** `src/hooks/useTasks.ts`, `src/services/firebase/tasks.service.ts`, `Task` in `src/types/models.ts`, and the `tasks` collection. Never extend, migrate, or delete it. New task work goes through `capturedTasks`.
- Every UI slice's REPORT answers the Section 18 checklist of the UI Standards item by item.
- **Retired vocabulary:** the five-state model (Wired/Foggy/Steady/Clear/Alive), the five-pillar model (`brainPillars` tokens), intent paths, and the floating V button are RETIRED. Code referencing them is legacy pending removal — never extend it. Removal is tracked on the backlog.

## WORKFLOW

- One slice per branch. `--no-ff` merge. Kyle merges, not you.
- Read-only Step-0 diagnostic before any build pass. Report findings before changing anything.
- Commit on the branch before a device walk, so the walk has a fixed reference.
- STOP-and-report gates are hard stops. Commit what is done, report, wait.
- Never `git checkout --` to undo a mutation test; it reverts to HEAD and takes uncommitted work with it.

## POINTERS

- `mobile/docs/CONTRIBUTING.md` — screen and component patterns, accessibility checklist, pre-commit checklist, naming, code style.
- `mobile/Vara_Mobile_UI_Standards.md` Section 3.3 — which token lives in which file under `src/constants/`.
- `mobile/docs/inventory/CC_Inventory_2026-08-15.md` — route-by-route reachability (BUILT AND REACHABLE / BUILT BUT DARK / NOT PRESENT), and the flags that decide which navigator mounts. Read this before assuming a screen is live.
- `mobile/docs/inventory/CC_Guide_Diagnostic.md` — the AI Guide, client and server.
- Backlogs, all under `docs/`: `TECH_DEBT_BACKLOG.md`, `TEST_INFRASTRUCTURE_BACKLOG.md`, `DESIGN_BACKLOG.md`, `SPEC_CONSISTENCY_BACKLOG.md`, `VOICE_AUDIT_BACKLOG.md`.
