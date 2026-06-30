/**
 * Flag-aware navigation targets — Four-Pillar IA Phase B-3d.1.
 *
 * A small set of destinations differ between the legacy four-tab IA and the
 * four-pillar IA because the TAB route names differ between the two navigators
 * (BottomTabsNavigator vs FivePillarTabs in AppNavigator.tsx). Data-driven
 * callers — dashboard CTAs, the brain-state nudge, the check-in plan hand-off —
 * name a destination as a string, so when FOUR_PILLAR_IA flips they would
 * otherwise navigate to a tab route that is no longer registered (a dead
 * target, the exact failure B-1 cleaned up).
 *
 * These resolvers return the route name that is ACTUALLY registered under the
 * current FOUR_PILLAR_IA state, so the same caller resolves live under either
 * flag. Because FOUR_PILLAR_IA is a compile-time const, each value below is a
 * single narrowed string literal at build time (no runtime branching cost), and
 * its TYPE tracks the flag — so flipping the flag in B-3d.8 changes only the
 * constant and the types stay consistent.
 *
 * NOTE: AppStack (root stack) screens — FocusTimer, Journal, Breathwork, Sleep,
 * Movement, Masterclass, Insights, … — are registered identically under both
 * flags, so they are referenced by their plain `ROUTES.*` name and need no alias
 * here. Only TAB-level destinations belong in this map.
 */

import { FOUR_PILLAR_IA } from '../constants/dashboardConfig';
import { ROUTES } from './routes';

export const NAV_TARGETS = {
  /**
   * The planning surface (PlanScreen: habits + routines). The legacy IA mounts
   * it as the `Rhythms` tab; the four-pillar IA mounts the same component as the
   * `PillarTime` tab. Callers that deep-link into routines/habits resolve here.
   */
  plan: FOUR_PILLAR_IA ? ROUTES.PillarTime : ROUTES.Rhythms,

  /**
   * The "browse wellness content" hub. The four-pillar IA routes this to the
   * Energy tab (EnergyHubScreen — Regulate / Rest / Fuel browse). The legacy IA
   * has no general browse hub once the Wellness tab is dissolved in this slice,
   * so it falls back to the Masterclass content screen (an AppStack screen, live
   * under both flags). Both resolutions are registered routes — never dead.
   */
  browseContent: FOUR_PILLAR_IA ? ROUTES.PillarEnergy : ROUTES.Masterclass,
} as const;
