/**
 * The safety copy gate (journey slice 3c-i).
 *
 * WAS THE MERGE GATE AND IS NOW A GUARD. It was red by design until Jen's copy
 * landed; it stays as the thing that keeps this file honest afterwards, because
 * the strings it covers render to a person who has just written something about
 * self-harm, abuse, or food restriction.
 *
 * The four assertions are deliberately about the SHAPE of the copy rather than
 * its wording: no placeholder markers, no em dashes, no journey framework
 * words, and no counters or tallies. A copy pass may rewrite every sentence
 * here; none of those four may creep back in while it does.
 */
import {
  SAFETY_COPY,
  SAFETY_RESOURCES,
  type SafetyResource,
} from '../safetyCopy';

/** Every user-facing string in the module, labelled for failure messages. */
const ALL_STRINGS: Array<[string, string]> = [
  ...Object.entries(SAFETY_COPY).map(
    ([key, value]) => [`SAFETY_COPY.${key}`, value] as [string, string]
  ),
  ...SAFETY_RESOURCES.flatMap((r: SafetyResource) => [
    [`resource ${r.id}.label`, r.label] as [string, string],
    [`resource ${r.id}.detail`, r.detail] as [string, string],
  ]),
];

describe('the safety screen is structurally sound', () => {
  test('every slot the screen renders exists and is non-empty', () => {
    // Vacuity guard: an empty string carries no marker, no em dash and no
    // framework word, and would sail through every assertion below while
    // rendering nothing.
    for (const [label, value] of ALL_STRINGS) {
      expect(typeof value).toBe('string');
      if (value.length === 0) throw new Error(`${label} is empty`);
    }
  });

  test('the resource list is populated', () => {
    expect(SAFETY_RESOURCES.length).toBeGreaterThan(0);
  });

  test('no resource is half-filled', () => {
    // A label with no detail is a resource a person cannot reach.
    for (const resource of SAFETY_RESOURCES) {
      expect(resource.label.length).toBeGreaterThan(0);
      expect(resource.detail.length).toBeGreaterThan(0);
    }
  });

  test('resource ids are unique, so ordering cannot silently drop one', () => {
    const ids = SAFETY_RESOURCES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('GATE: the safety copy is authored', () => {
  test('no placeholder marker remains in any safety string', () => {
    const offending = ALL_STRINGS.filter(([, v]) =>
      /\[PLACEHOLDER/i.test(v)
    ).map(([label]) => `  ${label}`);

    if (offending.length > 0) {
      throw new Error(
        `${offending.length} safety string(s) still carry a placeholder marker:\n` +
          `${offending.join('\n')}\n\n` +
          'These render to a person who has just disclosed self-harm, abuse, or\n' +
          'food restriction. Do not edit this test to make it pass.'
      );
    }
  });

  test('no em dash anywhere (product principle 8)', () => {
    // Built from char code so no literal em-dash byte lives in this file and
    // the guard cannot flag its own definition.
    const emDash = String.fromCharCode(0x2014);
    const enDash = String.fromCharCode(0x2013);
    for (const [label, value] of ALL_STRINGS) {
      if (value.includes(emDash) || value.includes(enDash)) {
        throw new Error(`${label} contains an em or en dash: ${value}`);
      }
    }
  });

  test('no journey framework word reaches this screen', () => {
    // remove / recover / rewire / refocus are internal keys (roadmap section
    // 8). A person in crisis must never be shown the phase vocabulary, least
    // of all the word "remove".
    const framework = /\b(remove|recover|rewire|refocus)\b/i;
    for (const [label, value] of ALL_STRINGS) {
      if (framework.test(value)) {
        throw new Error(`${label} contains a journey framework word: ${value}`);
      }
    }
  });

  test('no counter or tally pattern in the body copy', () => {
    // The prose must not count anything at the user. Phone numbers and the
    // 24/7 hours in the RESOURCE details are addresses, not tallies, so this
    // runs over SAFETY_COPY only, which is where the sentences live.
    const counter = /\b\d+\s*(days?|weeks?|times?|streaks?|in a row|so far)\b/i;
    for (const [key, value] of Object.entries(SAFETY_COPY)) {
      if (counter.test(value)) {
        throw new Error(`SAFETY_COPY.${key} reads as a counter: ${value}`);
      }
    }
  });

  test('no confidentiality or outcome promise is made on a resource behalf', () => {
    // Vara does not run these services and cannot speak for them. This catches
    // the specific phrasings that would claim otherwise.
    const promise = /\b(confidential|anonymous|private|guaranteed|will help you|they will)\b/i;
    for (const [label, value] of ALL_STRINGS) {
      if (promise.test(value)) {
        throw new Error(
          `${label} makes a promise on a resource behalf: ${value}`
        );
      }
    }
  });
});
