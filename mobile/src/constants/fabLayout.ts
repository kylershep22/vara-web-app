import { Spacing } from './spacing';

/**
 * Docked Guide FAB geometry + scroll clearance (A3 interim guard, B-3d polish).
 *
 * The Guide FAB (components/ai/AIAssistantFAB.tsx) is absolutely positioned,
 * 68px tall, sitting `Spacing.xl + 60` above the screen bottom — so its top edge
 * intrudes ~100px into the scroll area and can occlude a bottom CTA/card.
 * Scroll content on FAB-showing screens pads its bottom by FAB_SCROLL_CLEARANCE
 * so nothing sits under the FAB.
 *
 * Kept in this lightweight module (Spacing only) so screens can import the value
 * without pulling AIAssistantFAB's heavy dependency tree (chat modal, svg,
 * gradient). Keep FAB_HEIGHT / FAB_BOTTOM_OFFSET in sync with the FAB's styles.
 *
 * Remove (or fold into the layout) when the Guide-pill migration replaces the
 * docked FAB.
 */
export const FAB_HEIGHT = 68;
export const FAB_BOTTOM_OFFSET = Spacing.xl + 60;

/** FAB footprint into the scroll area, plus a gap, so bottom content clears it. */
export const FAB_SCROLL_CLEARANCE = Spacing.xl + FAB_HEIGHT + Spacing.md;
