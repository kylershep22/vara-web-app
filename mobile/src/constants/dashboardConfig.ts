/**
 * Dashboard configuration flags
 * DASHBOARD_V2: When true, renders the simplified dashboard layout.
 * Set to false to restore the original V1 layout.
 */
export const DASHBOARD_V2 = true;
export const ONBOARDING_V2 = true;

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
export const FOUR_PILLAR_IA = false;

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
  // NudgeCard: it IS live-gated (renders only when a suggestion exists), but it
  // is an algorithmic cross-feature nudge, NOT a user-opted-in nudge — so per the
  // decision it is suppressed (the "leave it" carve-out was only for an
  // opted-in, live nudge). Flip to false to restore.
  nudge: true,
} as const;
