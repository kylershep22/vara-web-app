# Vara Refactor Plan

**Status:** Draft / living document
**Last updated:** 2026-06-17
**Scope:** Information-architecture (IA) move from the current four-tab layout to the
four-pillar model, plus the supporting workstreams already in flight.

This plan is grounded in the Phase A discovery inventory of the React Native app
(`mobile/`). It records the **target**, the **current reality**, and the **decisions
the switch forces**. It is not yet a sequenced build plan; §3 characterizes the work,
it does not schedule it.

---

## 1. Goal

Users should be able to reach Vara's core surfaces through a pillar-based bottom bar
that mirrors how the product reasons about brain state and behavior, rather than the
legacy Home / Rhythms / Community / Wellness grouping.

**Target IA:** `Home · Focus · Energy · Time · Community`, with a docked AI Guide
(top-right) on pillar screens, hidden during sessions.

**Pillar meanings:**
- **Home** — the reworked dashboard.
- **Focus** — attention and the "how you work" toolkit.
- **Energy** — rest / regulate / fuel.
- **Time** — habits and routines.
- **Community** — retained as-is.

---

## 2. Current state (RN)

- **Bottom tabs (4):** `Home → DashboardScreen`, `Rhythms → PlanScreen`,
  `Community → CommunityNavigator`, `Wellness → MoreMenuScreen` (a menu hub, not
  content). Defined in `mobile/src/navigation/AppNavigator.tsx`.
- **No `Focus` / `Energy` / `Time` pillar screens, routes, or tab entries exist.**
  Pillar work is confined to design/docs today.
- ⚠️ **Naming collision:** `mobile/src/screens/Focus/` is a *focus timer*
  (Pomodoro + routine runner) mounted as stack route `FocusTimer` under Wellness —
  it is **not** the planned Focus pillar. Its routine pieces belong to **Time**.
- ⚠️ **Two "pillar" taxonomies exist and differ:** `BrainPillarBadge` / `featureUnlock`
  / `BrainPillar` use 5 data tags (growth/energy/focus/resilience/connection); the
  engine + catalog (`Vara_Engine_Contract.md`, `brainStateProtocols.ts`) use 4
  (focus/energy/time/community). Same word, different things.
- **Protocol catalog** (`constants/brainStateProtocols.ts`): 14 protocols, 100% tagged
  with `pillar` / `regulationDirection` / `modality` / length — but **all are
  `pillar: 'energy'`**. Focus/Time carry no catalog content (contract routes them via
  pointers to FocusTimer / routines).
- **AI Guide:** `components/ai/AIAssistantFAB.tsx` → `AIChatModal.tsx`, mounted globally
  by `navigation/FABHost.tsx` as a bottom-right FAB, shown when a screen sets
  `options.showFAB`. Session-hiding already works via the safe default.
- **Community** is a self-contained stack (report/block/mute flow intact); carryable
  into the new IA unchanged.
- **tsc baseline:** ~173 errors (pre-existing noise floor; refactor must not raise it).

---

## 3. The tab / IA switch

Characterization per pillar (what kind of work, not a schedule):

| Pillar | Work type | Notes |
|---|---|---|
| **Home** | Re-house existing | `DashboardScreen` (reworked on `feature/dashboard-rework`). |
| **Community** | Re-house unchanged | Self-contained; no cross-tab coupling. |
| **Time** | Re-house existing | `PlanScreen` + habits + routines + `ActiveRoutinePlayer` already form the hub; claim the routine half of the `Focus/` folder. |
| **Energy** | Existing content + net-new hub shell | Catalog (all `energy`) + Discover library are filter-ready, but no Energy hub screen exists. |
| **Focus** | Net-new hub + net-new content | Only the Pomodoro timer fits today; catalog has zero focus-tagged practices; the attention toolkit is largely unbuilt. |
| **Guide docking** | Reposition existing | Move bottom-right FAB to a pillar-screen top-right dock; reuse the existing session-hide. |

**Summary:** Home / Community / Time are mostly re-housing; Energy needs a net-new hub
over existing content; Focus needs both a net-new hub and net-new content.

---

## 4. Open questions

1. **Focus content** — net-new catalog practices (`pillar:'focus'`), a re-skin of the
   existing Pomodoro/FocusTimer, or a pointer hub? Decides whether Focus is a thin
   shell or a content effort.
2. **Two pillar taxonomies** — reconcile, alias, or keep separate? `BrainPillar` lacks
   "time" and adds growth/resilience/connection.
3. **`Focus/` folder rename/split** — routines → Time, Pomodoro → Focus, without
   churning the many `Focus/components/*` imports.
4. **Energy hub composition** — catalog filter, Discover library, or both? And where do
   the orphaned Wellness menu items go (Journal, Insights, Masterclass, Connected Apps,
   Settings, Help)?
5. **Five-tab ergonomics** — the bottom bar is built for 4; confirm it takes 5 and
   decide where Journal/Insights/Settings live once Wellness dissolves.
6. **Guide docking option** — new `guidePosition` / `isPillarScreen` screen option vs
   overloading `showFAB`; modal presentation if anchored top-right.
7. **Deep links** — `linking.ts` only maps `login` / `main` / `verify`; tabs aren't
   individually deep-linked, so the rename has no deep-link blast radius today.

---

## 5. Related workstreams (sequencing context)

- **Loop chain** (`feature/checkin-flow-polish`): consolidated state-pick screen, plan
  screen + felt reason, closed focus-session loop. **Un-merged.**
- **Dashboard rework** (`feature/dashboard-rework`): the Home surface. **Un-merged.**
  Touches no navigation files, so it does not conflict with the nav refactor.

The IA refactor should branch off `main` once the loop chain and dashboard rework land,
to avoid rebasing the pillar work over a moving Home/check-in surface.
