/**
 * The supportive response shown when the crisis pre-check does not pass
 * (journey slice 3c-i).
 *
 * APPROVED COPY. Every string below is Jen's, landed verbatim, and carries no
 * drafted-copy sentinel. `__tests__/safetyCopy.authored.test.ts` holds the
 * whole file to that.
 *
 * WHAT THIS SCREEN MUST NOT DO, settled and not open for a copy pass:
 *   - NEVER echo, paraphrase, or characterize what the user typed. The screen
 *     does not receive the text and has nothing to render it into.
 *   - NEVER promise confidentiality or an outcome on behalf of a resource.
 *     Vara does not run these services and cannot speak for them.
 *   - NEVER imply the entry was kept. The privacy line says plainly that it was
 *     not, because it was not.
 *   - NEVER offer a way past the pre-check. There is no "edit your answer",
 *     which would read as "say that differently so we can file it".
 *
 * NO CORAL, NO ALARM ICONOGRAPHY, NO SEVERITY TIERS. The visual register is
 * ordinary body text. A person who has just written something hard is not
 * helped by the interface treating it as an emergency state.
 */

export interface SafetyResource {
  /** The resource id, used for ordering. Stable; never rendered. */
  id: SafetyResourceId;
  /** What the resource is called. */
  label: string;
  /** How to reach it. Never a bare number without its context. */
  detail: string;
}

export type SafetyResourceId =
  | 'lifeline_988'
  | 'crisis_text_line'
  | 'domestic_violence'
  | 'samhsa'
  | 'eating_disorders';

export const SAFETY_COPY = {
  title: 'What you wrote deserves more than an app can offer.',
  body: "This sounds like something worth taking seriously. Vara isn't built for this, and we won't pretend it is. The resources below can connect you with people who are trained to help.",
  /**
   * The honesty line. It states the fact the whole fail path is built around:
   * nothing was stored. Do not soften it into "we won't share this", which is a
   * promise about handling rather than a statement that there is nothing to
   * handle.
   */
  privacy: "This entry hasn't been saved to your Vara account.",
  /**
   * ALWAYS SHOWN, and its own element between the privacy line and the
   * resources. Plain body text: no icon, no card, no coral. It is the one line
   * that must not be missed, and making it look like an alert is what would
   * cause it to be skipped past.
   */
  immediateDanger: 'If you or someone else is in immediate danger, call 911.',
  resourcesHeading: 'Support you can reach',
  /** The collapsed section holding every resource not surfaced as a top row. */
  expander: 'More support',
  action: 'Back to Today',
} as const;

/**
 * Numbers and hours verified 2026-09-02. Re-verify before launch. US-only;
 * international pass tracked pre-launch.
 */
export const SAFETY_RESOURCES: readonly SafetyResource[] = [
  {
    id: 'lifeline_988',
    label: '988 Suicide & Crisis Lifeline',
    detail: 'Call or text 988. Available 24/7.',
  },
  {
    id: 'crisis_text_line',
    label: 'Crisis Text Line',
    detail: 'Text HOME to 741741. Available 24/7.',
  },
  {
    id: 'domestic_violence',
    label: 'National Domestic Violence Hotline',
    detail: 'Call 1-800-799-7233 or text START to 88788. Available 24/7.',
  },
  {
    id: 'samhsa',
    label: 'SAMHSA National Helpline',
    detail:
      'Call 1-800-662-4357 for mental health and substance-use treatment information and referrals. Available 24/7.',
  },
  {
    id: 'eating_disorders',
    label: 'National Alliance for Eating Disorders',
    detail: 'Call 1-866-662-1235 for eating-disorder support and referrals. Weekdays.',
  },
] as const;
