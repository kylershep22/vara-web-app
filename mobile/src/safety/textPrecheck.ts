/**
 * Crisis pre-check for the one free-text field in the Remove capture
 * (journey slice 3c-i).
 *
 * ==========================================================================
 * JEN OWNS EVERY ADDITION TO THE TERM LISTS BELOW.
 * ==========================================================================
 * This file is a reviewed artifact, not a utility to extend casually. Adding a
 * term widens what the app treats as a crisis disclosure; removing one narrows
 * it. Both are clinical judgments and neither is an engineering call. Bring
 * proposed changes to Jen with the phrasing that prompted them.
 *
 * WHAT THIS IS. A pure, client-side, first-pass screen that runs BEFORE any
 * write and before any echo of what the user typed. If it does not pass,
 * nothing is stored: no text, no category, no analytics payload beyond a bare
 * event that records only that the support screen was shown.
 *
 * WHAT THIS IS NOT, stated plainly so nobody mistakes its scope:
 *
 *   - NOT a diagnosis, a risk score, or a triage decision.
 *   - NOT reliable. A term list cannot understand a sentence. It will miss
 *     real disclosures phrased in ways nobody listed (false negatives) and it
 *     will stop people who meant something else entirely (false positives).
 *   - NOT a reason to relax anything else. It is one guard on one field.
 *
 * WHY IT IS DELIBERATELY BIASED TOWARD STOPPING. The two failure modes are not
 * symmetric. A false positive costs a user one screen they did not need and a
 * second attempt at phrasing. A false negative means the app takes a
 * disclosure of self-harm, files it as a habit to remove, and later renders it
 * back inside a chirpy protocol card. The first is an annoyance; the second is
 * the thing this whole precondition exists to make impossible.
 *
 * WHY CLIENT-SIDE. It has to run before the text leaves the device, because
 * the entire promise is that a disclosure is never stored. A server check
 * would require storing it first.
 */

/** The kinds of disclosure this screen looks for. */
export type PrecheckCategory =
  | 'self_harm'
  | 'harm_from_others'
  | 'substance'
  | 'eating'
  | 'self_directed_negative';

export type PrecheckResult =
  | { pass: true }
  | { pass: false; category: PrecheckCategory };

/**
 * The term lists, one per category.
 *
 * MATCHED ON WORD BOUNDARIES, case-insensitively, after the normalization
 * below. Multi-word entries match as phrases. Keep entries lowercase and
 * unpunctuated; the normalizer handles the rest.
 *
 * ORDER OF THE CATEGORIES BELOW IS THE ORDER THEY ARE CHECKED, and it is
 * severity-first on purpose: a sentence that trips both self-harm and
 * self-directed-negative should report the more serious one, because the
 * category is what a later slice would route the response on.
 */
const TERMS: Record<PrecheckCategory, readonly string[]> = {
  self_harm: [
    'kill myself',
    'killing myself',
    'end my life',
    'ending my life',
    'end it all',
    'take my own life',
    'suicide',
    'suicidal',
    'self harm',
    'selfharm',
    'harm myself',
    'hurt myself',
    'hurting myself',
    'cut myself',
    'cutting myself',
    'want to die',
    'wish i was dead',
    'wish i were dead',
    'better off dead',
    'not want to be here',
    'no reason to live',
  ],
  harm_from_others: [
    'hits me',
    'hitting me',
    'beats me',
    'beat me up',
    'hurts me',
    'abusing me',
    'abuses me',
    'abusive',
    'abuse',
    'threatens me',
    'threatening me',
    'scared of him',
    'scared of her',
    'scared of them',
    'afraid of him',
    'afraid of her',
    'not safe at home',
    'assaulted',
    'assaulting me',
  ],
  substance: [
    'drinking too much',
    'drink too much',
    'blackout',
    'blacking out',
    'hungover',
    'withdrawal',
    'relapse',
    'relapsed',
    'using again',
    'cocaine',
    'heroin',
    'meth',
    'opioids',
    'painkillers',
    'benzos',
    'addicted',
    'addiction',
    'cant stop drinking',
    'cannot stop drinking',
  ],
  eating: [
    'not eating',
    'stopped eating',
    'starve',
    'starving myself',
    'purge',
    'purging',
    'binge',
    'bingeing',
    'binging',
    'throw up after',
    'throwing up after',
    'anorexia',
    'anorexic',
    'bulimia',
    'bulimic',
    'restricting food',
    'restrict my food',
  ],
  self_directed_negative: [
    'hate myself',
    'hate my body',
    'i am worthless',
    'im worthless',
    'i am disgusting',
    'im disgusting',
    'i am a failure',
    'im a failure',
    'i am pathetic',
    'im pathetic',
    'everyone would be better off without me',
    'no one would miss me',
    'nobody would miss me',
    'i ruin everything',
  ],
};

/** Severity-first. See the note on TERMS. */
const CATEGORY_ORDER: readonly PrecheckCategory[] = [
  'self_harm',
  'harm_from_others',
  'eating',
  'substance',
  'self_directed_negative',
];

/**
 * Fold the common ways a phrase gets broken up so the term list does not have
 * to enumerate them.
 *
 * WHAT IT HANDLES: mixed case, curly apostrophes, internal punctuation used as
 * separators ("k.i.l.l", "self-harm", "i'm"), and runs of whitespace. Letters,
 * digits and single spaces survive; everything else becomes nothing, and the
 * result is re-spaced.
 *
 * WHAT IT DOES NOT HANDLE, and is not pretending to: leetspeak, deliberate
 * misspelling, other languages, or anything else an adversary would reach for.
 * This screens for people writing plainly while distressed, which is the actual
 * population, not for people evading a filter.
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[^a-z0-9\s']/g, '')
    .replace(/'/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Whole-word / whole-phrase containment against the normalized haystack. */
function containsTerm(haystack: string, term: string): boolean {
  const padded = ` ${haystack} `;
  return padded.includes(` ${term.replace(/'/g, '')} `)
    || padded.includes(` ${term.replace(/'/g, '')},`)
    || new RegExp(`(^| )${term.replace(/'/g, '')}( |$)`).test(haystack);
}

/**
 * Screen one free-text answer.
 *
 * Returns `{ pass: true }` for anything the lists do not recognise, INCLUDING
 * empty and whitespace-only input: an empty answer is not a disclosure, and the
 * caller has its own reason to reject it.
 *
 * THE CATEGORY IS FOR ROUTING THE RESPONSE, NOT FOR STORAGE. It must not be
 * written to Firestore, attached to an analytics event, or logged.
 */
export function precheckFreeText(text: string): PrecheckResult {
  const normalized = normalize(text ?? '');
  if (!normalized) return { pass: true };

  for (const category of CATEGORY_ORDER) {
    for (const term of TERMS[category]) {
      if (containsTerm(normalized, term)) return { pass: false, category };
    }
  }
  return { pass: true };
}
