/**
 * Capacity tier labels and glosses. SHARED VOCABULARY, which is why they live
 * in constants/ rather than beside any one screen.
 *
 * Moved verbatim out of screens/weekly/copy.ts by journey slice 0. Three
 * surfaces read them and they do not belong to any of the three: the weekly
 * open (deleted in journey slice 3b), the V3 onboarding capacity screen (through the
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

/**
 * The capacity question itself. TWO SURFACES ASK IT, WHICH IS WHY IT IS HERE.
 *
 * Moved verbatim out of PICKER_COPY (components/dashboard/dailyPicker.copy.ts)
 * by journey slice 4, for the reason that module's own header gives: files
 * under screens/ must never import copy from components/, and the V3
 * onboarding capacity screen is under screens/. Anything with a non-daily
 * reader belongs in constants/ instead. Same move CAPACITY_LABELS and
 * CAPACITY_GLOSSES made in slice 0, for the same rule.
 *
 * NOT A NEW STRING, and the sentinel does not move for it. It is the one that
 * already shipped on the daily picker, relocated with its marker and its owner
 * intact. The onboarding screen previously asked a DIFFERENT question ("How
 * much room does this week have?"); that string is deleted, and this one now
 * answers for both surfaces.
 *
 * ONE QUESTION, TWO SCOPES, DELIBERATELY. The picker asks it about today and
 * stores a daily answer; onboarding asks it once and stores a seed the day
 * falls back to when it has not been picked. Asking it in the same words is
 * the point: the user is being taught the question they will meet every day.
 */
// COPY: draft, not from guidelines doc - pending Jen
export const CAPACITY_QUESTION = 'How much are you up for today?';
