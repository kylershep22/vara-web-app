/**
 * Capacity tier labels and glosses. SHARED VOCABULARY, which is why they live
 * in constants/ rather than beside any one screen.
 *
 * Moved verbatim out of screens/weekly/copy.ts by journey slice 0. Three
 * surfaces read them and they do not belong to any of the three: the weekly
 * open (WeeklyOpenScreen), the V3 onboarding capacity screen (through the
 * re-export in screens/onboarding/v3/copy.ts), and the daily picker
 * (DailyPickerSheet, TodayHeroCard). The weekly loop is being retired and the
 * daily loop is not, so leaving these in the weekly module would have taken
 * shared vocabulary down with it.
 *
 * A SECOND SET OF LABELS FOR THE SAME CapacityTier UNION IS THE DIVERGENCE
 * VOCABULARY LOCK EXISTS TO PREVENT. Import from here; do not restate.
 *
 * Copy rule (product principle 8): no em dashes in user-facing strings.
 */

/**
 * Capacity labels. The tier names are spec 6.1.
 *
 * The three glosses are APPROVED COPY, authored by guidelines 1.2. They were
 * previously attributed to the spec, which was the wrong owner; 1.2 supersedes
 * that. Meaning is READINESS, not time: slammed is the gentler week, never
 * merely the shorter one.
 */
export const CAPACITY_LABELS = {
  normal: 'Normal',
  limited: 'Limited',
  slammed: 'Slammed',
} as const;

export const CAPACITY_GLOSSES = {
  normal: 'Ready to make some progress.',
  limited: 'Some room, so be selective.',
  slammed: 'Very little room. Keep the bar realistic.',
} as const;
