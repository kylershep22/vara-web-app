# Vara — Four-Pillar IA Spec
**Version 1.0 | For review | The tab/IA switch: Home / Focus / Energy / Time / Community**

This specifies the switch from the current four tabs (Home / Rhythms / Community / Wellness) to the outcomes-led five-tab IA. It assumes the reworked dashboard (Home) and the check-in loop are landed on main. Grounded in the CC Phase A discovery; defers to `Vara_Mobile_UI_Standards` and the brand docs for tokens, components, and copy.

---

## 1. Scope

**In scope (Phase 1):** the five-tab shell, the two net-new pillar hubs (Energy, Focus), re-housing the existing Time / Home / Community content, docking the Guide on pillar screens, and dissolving the Wellness tab with its features re-homed.

**Out of scope (Phase 2+):** the reflective Insights surface, the cross-pillar insights engine, the heavier Focus toolkit (focus blocks, time-blocking, task-batching, device-free breaks), longer movement/video, nutrition (education-only later), HealthKit/sleep tracking, and the `BrainPillar` taxonomy rename (hygiene).

The organizing principle is unchanged: a smaller, calmer app with a tight loop beats a deep content store. The IA exists to route the loop, not to merchandise content.

---

## 2. The target IA

Five bottom tabs: **Home · Focus · Energy · Time · Community.** A docked **Guide** (AI) sits top-right on the four pillar screens, hidden during sessions.

```
Home (dashboard)  —  Focus  —  Energy  —  Time  —  Community
   reworked        the wedge   rest/      habits +   retained
                   hub on      regulate/  routines   unchanged
                   the loop    fuel + Learn
```

- **Focus** = attention and how you work today (a pointer/tool hub, no own catalog).
- **Energy** = how you feel: rest it, regulate it, fuel it; plus the Learn library.
- **Time** = recurring patterns: habits and routines.
- **Community** = social layer, carried over as-is.

Tab bar rebuilds for five (the iOS and UI-Standards ceiling). App utilities (Settings, Connected Apps, Help) live behind the settings cog, not a tab.

---

## 3. Per-pillar launch composition

### Home — re-house [done]
The reworked dashboard. No IA-side work beyond wiring it as the Home tab destination.

### Focus — the wedge, a pointer/tool hub on the existing loop [Phase 1]
Focus has no own catalog; it routes to the deep-work tool and borrows Energy's regulation for the pre-session reset. Its "depth" is the loop already built.

**Ships:**
- **Focus hub screen** — one CTA + calm cards (net-new shell, light).
- **Deep-work timer** — the existing Pomodoro (`screens/Focus/FocusScreen`), re-housed as the Focus tool.
- **Pre-session reset** — borrowed from Energy regulation / the loop; the activation moment.
- **Post-session felt reflection** — from the loop.
- **Focus rhythms** — new, lightweight self-report ("when do you focus best"), no automation.

**Deferred [Phase 2]:** focus blocks, time-blocking, task-batching, device-free breaks.

**Folder split:** the existing `screens/Focus/` folder holds the Pomodoro *and* routines. Routines move to Time; the Pomodoro becomes the Focus tool. Split without churning the `Focus/components/*` imports (build-Phase-A mechanics).

### Energy — net-new hub, content-ready [Phase 1]
All 14 catalog protocols are already `pillar:'energy'`, so the hub is built by filtering the existing catalog plus the discover library.

- **Energy hub** — Rest / Regulate / Fuel structure (net-new shell).
- **Regulate** — breathwork + grounding (settle/energize), filtered from the catalog by direction/modality/length.
- **Rest** — sleep wind-down + NSDR; **Journal lives here** (evening wind-down reflection; see §4).
- **Fuel** — short movement resets.
- **Learn library** — the education layer; **masterclass content lives here** (see §4), reachable from the pillar, not a tab.

### Time — re-house, mostly assembled [Phase 1]
- **Time hub** — the existing `PlanScreen` (Habits/Routines toggle + filters).
- **Habits** — `habits.service`.
- **Routines + ActiveRoutinePlayer** — claimed from the `Focus/` folder.
- No time-blocking exists; it's a deferred Focus feature, not Time.

### Community — re-house, unchanged [Phase 1]
Self-contained `CommunityNavigator`, including report/block. Carried over with no changes.

---

## 4. Wellness dissolution — re-housing map

The Wellness tab (`MoreMenuScreen`) is a menu hub, not content. It's removed as a tab; its items re-home:

| Wellness item | New home |
|---|---|
| Breathwork / Sleep / Movement | Energy (Rest / Regulate / Fuel) |
| Focus → FocusTimer | Pomodoro → Focus; routines → Time |
| **Masterclass** | **Energy → Learn library** (education layer, pillar-reachable, not a tab) |
| **Journal** | **Energy → Rest** (evening wind-down reflection); also surfaces in the loop's post-session reflection |
| **Insights (stats)** | **Removed from the launch IA.** Reworked as a reflective surface in Phase 2 (see §7) |
| Connected Apps / Settings / Help | Settings cog (Profile/Settings stack), not a tab |

---

## 5. The Guide (docked AI)

The existing `AIAssistantFAB` → `AIChatModal`, rendered globally by `FABHost` at the MainNavigator level, shown when a focused screen sets `showFAB === true`, already hidden during sessions.

- **Dock it top-right** on the four pillar screens via a dedicated screen option (`isPillarScreen` / `guidePosition`), not by overloading `showFAB`.
- Reuse the existing session-hide mechanism unchanged.
- It doubles as the single persistent help affordance per pillar screen, and is the re-access point for contextual education.
- Home keeps the Guide treatment defined in the dashboard spec.

---

## 6. Two "pillar" taxonomies — keep separate

Two unrelated taxonomies share the word "pillar":
- **`BrainPillar`** (5 tags: growth/energy/focus/resilience/connection) — drives goals, brain-health framing, feature-unlock.
- **Nav/IA pillars** (4: focus/energy/time/community) — the tab structure and the catalog `pillar` field.

**Do not merge them** — different cardinality and purpose; merging is a risky migration for no launch benefit. Keep both; in code and this spec, "pillar" without qualifier means the nav/IA pillar. **Defer renaming `BrainPillar`** (to e.g. `BrainArea`) to a later hygiene pass; out of scope here.

---

## 7. Phase 2 — captured so it isn't lost

**Reflective Insights ("what works for you, and when").** The valuable version is a *story*, not a stats dashboard: it draws on the user's own check-ins and reflections and tells them back in plain felt language ("you've tended to feel most settled in the evenings lately"; "the downshift breath usually leaves you calmer"). Rules: the user's own felt vocabulary; no scores, percentages, charts, streaks, or rankings; conditional and tentative ("tends to," "usually," "lately"); observational, never prescriptive-optimization; strength-leaning and non-judgmental; only names a pattern when there's enough data to be real, with a warm early state until then. It needs accumulated history to say anything true, so it is structurally post-launch. When it exists, the cleanest home-screen doorway is the dashboard's existing insight slot occasionally carrying a personalized reflection instead of a general tip — no stats card, no new surface. The old stats Insights screen is **not** the basis for this; it's a fresh build in the reflective paradigm.

Also Phase 2: cross-pillar insights engine, the heavier Focus toolkit, longer movement/video, nutrition (education-only), HealthKit/sleep, the `BrainPillar` rename.

---

## 8. Build sequencing

**Prerequisites (land first):** the dashboard merged to main (Home destination ready) and the loop chain on main (Focus's reset/reflection ready). Both are in flight tonight.

**Gate the whole switch behind an IA flag** (mirror the existing `DASHBOARD_V2` pattern), default off, flip when the shell is complete. This keeps a large nav refactor from shipping half-built and keeps the current tabs working until the new IA is whole.

**Suggested order, each its own concern/commit (likely several PRs):**
1. Tab-bar rebuild for five + the nav scaffold behind the IA flag (new pillar routes as stubs).
2. Cheap re-houses: Time (PlanScreen), Community, Home references.
3. Energy hub (Rest/Regulate/Fuel from the catalog + discover library).
4. Focus hub (Pomodoro re-house + focus rhythms + loop wiring) and the `Focus/` folder split (routines → Time).
5. Guide dock on pillar screens.
6. Wellness dissolution: Journal → Energy/Rest, Masterclass → Energy/Learn, utilities → cog, remove the stats Insights route.
7. Flip the IA flag.
8. Tests reworked across the moved surfaces.

Conflict surface with the dashboard work is minimal — `dashboard-rework` touches no nav files; the only shared reference is `DashboardScreen` as the Home destination.

---

## 9. Open items for the build's Phase A

To resolve in CC's build-discovery, not now:
1. The `Focus/` folder split mechanics — moving routines to Time without churning `Focus/components/*` imports.
2. Tab-bar rebuild for five (current bar is built for four; the custom `showFAB` threading).
3. The Guide dock option shape (`isPillarScreen` vs `guidePosition`) and top-right anchoring.
4. Energy hub composition — catalog filter + discover library merge, and the Rest/Regulate/Fuel mapping of existing content.
5. Journal re-housing under Energy/Rest (entry point + any existing nav references).
6. Insights stats route — remove vs hide the screen/route cleanly.
7. The IA flag name and where it gates.

---

## 10. Guardrails (this surface)

- The tab bar stays calm: muted inactive, teal active, no badges/counts/dots, no streaks.
- The Guide is one quiet affordance per screen, not two.
- Pillar hubs follow the dashboard's restraint: one clear action, calm cards, no content-store carousels or popularity/ratings.
- Conditional claims only; accents ≤10–15%; Reduce Motion respected; coral for genuine errors only.

---

*Source of truth for tokens, components, and copy: `Vara_Mobile_UI_Standards` and the brand docs. Companion docs: `Vara_Dashboard_Spec.md` (Home), `Vara_Engine_Contract.md` (the loop/state model), `Vara_Refactor_Plan.md` (the parent plan).*
