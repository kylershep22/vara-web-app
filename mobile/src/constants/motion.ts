// Motion timing constants aligned to the Vara Build Guide.
//
// Build Guide §UI motion (Vara_Build_Guide.md, lines 188–191) defines
// three duration ranges that motion should fall into:
//
//   - 100–150 ms — feedback (button taps, toggle reactions, tactile
//     confirmations)
//   - 250–300 ms — transitions (modal opens, screen changes, step
//     crossfades, view swaps)
//   - 400–500 ms — content fills (skeleton-to-content reveals,
//     image loads, page-level fades)
//
// Add new constants here as concrete needs surface — don't pre-fill
// the file with values nothing references yet. Hoist hardcoded
// numeric durations from component files when they're (a) clearly
// motion (not protocol durations, breath cadences, etc.) and (b)
// reusable across more than one call site.
//
// Pre-existing motion durations elsewhere in the tree are mapped in
// docs/TECH_DEBT_BACKLOG.md for the Phase 6 sweep — do not refactor
// them ad hoc during in-flight phase work.

/**
 * Duration of step-to-step crossfade transitions in multi-step flows.
 *
 * Used by:
 *   - `GuidedSessionPlayer.tsx` step crossfade between Breath /
 *     Audio / Instruction / Timer leaves.
 *   - Phase 2 sub-step 2.2's check-in flow transitions
 *     (state-pick → time-pick → recommendation → re-check → response).
 *
 * Value: 250ms — the lower bound of the Build Guide's "transitions"
 * range. Originally 200ms in `GuidedSessionPlayer.tsx`; lifted to
 * 250ms in commit `1660110` to align with the Build Guide range.
 */
export const STEP_TRANSITION_DURATION_MS = 250;
