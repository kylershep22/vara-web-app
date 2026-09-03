/**
 * Resource ordering on the support screen (journey slice 3c-i, Step 4).
 *
 * THE ASSERTION THAT MATTERS MOST is the last one: no resource is ever
 * unreachable. Ranking a list is one careless filter away from hiding most of
 * it, and on this screen a hidden resource is a door someone could not find.
 */
import { orderResources } from '../resourceOrder';
import { SAFETY_RESOURCES } from '../safetyCopy';
import type { PrecheckCategory } from '../textPrecheck';

const CATEGORIES: PrecheckCategory[] = [
  'self_harm',
  'harm_from_others',
  'substance',
  'eating',
  'self_directed_negative',
];

describe('988 is always row one', () => {
  test.each([undefined, ...CATEGORIES])('with category %s', (category) => {
    expect(orderResources(category).surfaced[0].id).toBe('lifeline_988');
  });
});

describe('row two follows the matched category', () => {
  test.each([
    ['self_harm', 'crisis_text_line'],
    ['harm_from_others', 'domestic_violence'],
    ['substance', 'samhsa'],
    ['eating', 'eating_disorders'],
  ] as const)('%s surfaces %s', (category, expected) => {
    expect(orderResources(category).surfaced[1].id).toBe(expected);
  });

  test('no category surfaces Crisis Text Line, the general second door', () => {
    expect(orderResources(undefined).surfaced[1].id).toBe('crisis_text_line');
  });

  test('a category with no dedicated line also falls to the general door', () => {
    // self_directed_negative has no service of its own. Routing it at a
    // mismatched hotline would be worse than the general one.
    expect(orderResources('self_directed_negative').surfaced[1].id).toBe(
      'crisis_text_line'
    );
  });
});

describe('NO RESOURCE IS EVER UNREACHABLE', () => {
  test.each([undefined, ...CATEGORIES])(
    'surfaced plus collapsed is the whole list, category %s',
    (category) => {
      const { surfaced, collapsed } = orderResources(category);
      const ids = [...surfaced, ...collapsed].map((r) => r.id).sort();
      expect(ids).toEqual(SAFETY_RESOURCES.map((r) => r.id).sort());
    }
  );

  test.each([undefined, ...CATEGORIES])(
    'nothing is duplicated across the two groups, category %s',
    (category) => {
      const { surfaced, collapsed } = orderResources(category);
      const ids = [...surfaced, ...collapsed].map((r) => r.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  );

  test('exactly two are surfaced, so the expander always has something in it', () => {
    for (const category of [undefined, ...CATEGORIES]) {
      const { surfaced, collapsed } = orderResources(category);
      expect(surfaced).toHaveLength(2);
      expect(collapsed.length).toBe(SAFETY_RESOURCES.length - 2);
    }
  });
});
