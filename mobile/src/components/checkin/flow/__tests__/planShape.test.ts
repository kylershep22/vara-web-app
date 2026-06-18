import { resolve } from '../../../../engine';
import type { Arousal, Situation, Valence } from '../../../../engine';
import { classifyPlanShape, leadPracticeSlot } from '../planShape';

const NOON = { hour: 12 };

// Generous default budget: the pointer presentation shapes (focus-session /
// plan) only occur at medium/long budgets. A ≤5 budget now branches pointers
// to a short practice (time-budget fix), so the canonical-shape assertions use
// a long budget to exercise the pointer shapes.
function shapeFor(
  situation: Situation,
  arousal: Arousal,
  valence: Valence,
  timeBudget = 45
): ReturnType<typeof classifyPlanShape> {
  const plan = resolve({
    situation,
    state: { arousal, valence },
    clockTime: NOON,
    timeBudget,
  });
  return classifyPlanShape(plan);
}

describe('classifyPlanShape — the seven presentation shapes from the 24-cell map', () => {
  it('zero-slot: find_energy / Activated', () => {
    expect(shapeFor('find_energy', 'revved', 'good').kind).toBe('zero');
  });

  it('single_practice: quiet_mind / Tense', () => {
    expect(shapeFor('quiet_mind', 'revved', 'hard').kind).toBe('single_practice');
  });

  it('single_pointer: get_through_hard / Activated (focus-session only)', () => {
    const shape = shapeFor('get_through_hard', 'revved', 'good');
    expect(shape.kind).toBe('single_pointer');
    if (shape.kind === 'single_pointer') {
      expect(shape.pointer.type).toBe('focus-session');
    }
  });

  it('practice_then_pointer: get_through_hard / Tense (settle-breath → focus-session)', () => {
    expect(shapeFor('get_through_hard', 'revved', 'hard').kind).toBe('practice_then_pointer');
  });

  it('practice_then_offered_pointer: quiet_mind / Activated (grounding → focus-session [offer])', () => {
    expect(shapeFor('quiet_mind', 'revved', 'good').kind).toBe('practice_then_offered_pointer');
  });

  it('offered_practice_then_pointer: get_through_hard / Calm (grounding [offer] → focus-session)', () => {
    expect(shapeFor('get_through_hard', 'low', 'good').kind).toBe('offered_practice_then_pointer');
  });

  it('message_offered: quiet_mind / Calm ("You\'re already there.")', () => {
    const shape = shapeFor('quiet_mind', 'low', 'good');
    expect(shape.kind).toBe('message_offered');
    if (shape.kind === 'message_offered') {
      expect(shape.message).toMatch(/already there/i);
    }
  });

  it('plan pointer: grip_on_day / Activated routes to the time pillar', () => {
    const shape = shapeFor('grip_on_day', 'revved', 'good');
    expect(shape.kind).toBe('single_pointer');
    if (shape.kind === 'single_pointer') {
      expect(shape.pointer.type).toBe('plan');
    }
  });
});

describe('leadPracticeSlot', () => {
  it('returns the practice slot for practice shapes', () => {
    const plan = resolve({
      situation: 'quiet_mind',
      state: { arousal: 'revved', valence: 'hard' },
      clockTime: NOON,
      timeBudget: 5,
    });
    const slot = leadPracticeSlot(plan);
    expect(slot).not.toBeNull();
    expect(slot!.pillar).toBe('energy');
    expect(slot!.direction).toBe('settle');
  });

  it('returns null for a pointer-only / zero plan', () => {
    const pointerOnly = resolve({
      situation: 'get_through_hard',
      state: { arousal: 'revved', valence: 'good' },
      clockTime: NOON,
      // Long budget so the focus-session pointer is emitted (a ≤5 budget now
      // branches it to a short practice).
      timeBudget: 45,
    });
    expect(leadPracticeSlot(pointerOnly)).toBeNull();

    const zero = resolve({
      situation: 'find_energy',
      state: { arousal: 'revved', valence: 'good' },
      clockTime: NOON,
      timeBudget: 5,
    });
    expect(leadPracticeSlot(zero)).toBeNull();
  });
});
