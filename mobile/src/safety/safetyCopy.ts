/**
 * The supportive response shown when the crisis pre-check does not pass
 * (journey slice 3c-i).
 *
 * ==========================================================================
 * EVERY STRING IN THIS FILE IS A PLACEHOLDER. JEN OWNS ALL OF IT.
 * ==========================================================================
 * `__tests__/safetyCopy.authored.test.ts` FAILS while any marker below is
 * still present, and that failing test is this slice's merge gate. It is
 * expected to be red.
 *
 * WHY THIS COPY IS NOT DRAFTED BY ENGINEERING, even as a stand-in that reads
 * well: this is the screen a person sees at the moment they have typed
 * something about self-harm, abuse, or not eating. Getting the register wrong
 * here is not a copy defect, it is a harm. A plausible-sounding placeholder is
 * worse than an obvious one, because it invites shipping.
 *
 * THE RESOURCE LIST IS ALSO JEN'S, and is deliberately empty rather than
 * seeded with a guess. A wrong or out-of-date crisis number is the single most
 * damaging string this app could contain. Nothing is better than approximately
 * right.
 *
 * WHAT THE SCREEN MUST DO, which is settled and is not Jen's to change:
 *   - store NOTHING. No text, no category, no derived signal.
 *   - offer exactly one action, which returns to Today.
 *   - never name what it matched, or imply the app has understood the person.
 *   - never ask them to try rephrasing, which reads as "say it differently so
 *     we can file it".
 */

/** The marker every unauthored string carries. The merge gate greps for it. */
export const SAFETY_PLACEHOLDER_MARKER = '[PLACEHOLDER - JEN\'S SAFETY COPY]';

export interface SafetyResource {
  /** What the resource is called. */
  label: string;
  /** How to reach it. Never a bare number without its context. */
  detail: string;
}

export const SAFETY_COPY = {
  title: `${SAFETY_PLACEHOLDER_MARKER} heading`,
  body: `${SAFETY_PLACEHOLDER_MARKER} the supportive response, two or three sentences`,
  resourcesHeading: `${SAFETY_PLACEHOLDER_MARKER} resources heading`,
  /**
   * The one action. Returns to Today and writes nothing.
   *
   * "Go gently" is the working label from the framework and is itself pending
   * Jen; it carries the marker like everything else here.
   */
  action: `${SAFETY_PLACEHOLDER_MARKER} Go gently`,
} as const;

/**
 * DELIBERATELY EMPTY until Jen supplies the list. The screen renders the
 * heading and no rows, which looks unfinished, because it is.
 */
export const SAFETY_RESOURCES: readonly SafetyResource[] = [];
