/**
 * Dashboard configuration flags
 * DASHBOARD_V2: When true, renders the simplified dashboard layout.
 * Set to false to restore the original V1 layout.
 */
export const DASHBOARD_V2 = true;
export const ONBOARDING_V2 = true;

/**
 * ONBOARDING_V3 — the progressive onboarding arc. DEFAULT TRUE: this is the
 * LIVE, MOUNTED first run, not a hidden branch.
 *
 * It takes precedence over ONBOARDING_V2 in OnboardingNavigator. The V2 branch
 * is retained for ONE transition cycle as a one-line revert lever (flip this to
 * false and the stress-recovery arc is restored byte-for-byte); it is not a
 * long-lived fork. V2, its screens and this flag are deleted in the cleanup
 * slice.
 *
 * There are zero live users, so reversibility here is a convenience during the
 * device walk, not a production safety mechanism.
 */
export const ONBOARDING_V3 = true;

/**
 * FOUR_PILLAR_IA — Four-Pillar IA navigator switch (Phase B-3a).
 *
 * When true, MainNavigator mounts the five-tab pillar navigator
 * (Home / Focus / Energy / Time / Community) instead of the legacy four-tab
 * BottomTabsNavigator. Compile-time const, default FALSE — ships OFF, so there
 * is zero user-facing change; flipped locally to walk the new IA.
 *
 * Unlike DASHBOARD_V2 (which gates render/data logic), this flag gates the
 * NAVIGATOR only. Reversibility is the whole point: flipping this one line back
 * to false restores the original four-tab IA byte-for-byte.
 */
export const FOUR_PILLAR_IA = true;

/**
 * Dashboard rework — reversible suppression flags.
 *
 * The reworked Home renders the spec component set ONLY. Cards that predate the
 * rework but aren't in the spec are SUPPRESSED here (flag flip), not deleted, so
 * they can be restored once their role is confirmed. See the dashboard-rework
 * report for the EventCode / NotificationOptIn open questions (left rendering,
 * intentionally NOT flagged here yet).
 */
export const DASHBOARD_SUPPRESS = {
  // First-shift "logged in Patterns" footer — not in the spec set.
  firstShiftFooter: true,
  // End-of-day reflection prompt — a different surface, not in the spec set.
  dailyReflection: true,
  // System prompts not in the spec set — the reworked Home renders the spec
  // components only.
  eventCode: true,
  notifOptIn: true,
  // NOTE: the `nudge` flag was retired with NudgeCard itself in the landing
  // slice (sub-step 3). Home no longer has an algorithmic cross-feature nudge
  // surface, so there is nothing left to suppress.
} as const;
