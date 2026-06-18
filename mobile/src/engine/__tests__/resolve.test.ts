import { resolve } from '../resolve';
import { slotModalities, directionMatches } from '../slotFilter';
import { timeWindowToLengthClass } from '../lengthClass';
import type {
  Arousal,
  Quadrant,
  ResolvedPlan,
  ResolvedSlot,
  Situation,
  SlotMode,
  SlotType,
  Valence,
} from '../types';

// --- helpers ---
function stateFor(q: Quadrant): { arousal: Arousal; valence: Valence } {
  switch (q) {
    case 'Tense':
      return { arousal: 'revved', valence: 'hard' };
    case 'Activated':
      return { arousal: 'revved', valence: 'good' };
    case 'Depleted':
      return { arousal: 'low', valence: 'hard' };
    case 'Calm':
      return { arousal: 'low', valence: 'good' };
  }
}

interface ExpectSlot {
  kind: 'practice' | 'pointer';
  type: SlotType;
  direction: 'settle' | 'energize' | 'neutral';
  mode: SlotMode;
}
const p = (type: SlotType, direction: 'settle' | 'energize', mode: SlotMode): ExpectSlot => ({
  kind: 'practice',
  type,
  direction,
  mode,
});
const ptr = (type: SlotType, mode: SlotMode): ExpectSlot => ({
  kind: 'pointer',
  type,
  direction: 'neutral',
  mode,
});

interface Case {
  situation: Situation;
  quadrant: Quadrant;
  message?: boolean;
  slots: ExpectSlot[];
}

const DAYTIME = { hour: 12 };
const GENEROUS_BUDGET = 45;

// Every one of the 24 cells (§7), asserted explicitly (not mirrored from the map).
const CASES: Case[] = [
  // 1. Get through something hard
  { situation: 'get_through_hard', quadrant: 'Tense', slots: [p('settle-breath', 'settle', 'mandatory'), ptr('focus-session', 'mandatory')] },
  { situation: 'get_through_hard', quadrant: 'Activated', slots: [ptr('focus-session', 'mandatory')] },
  { situation: 'get_through_hard', quadrant: 'Depleted', slots: [p('energize', 'energize', 'mandatory'), ptr('focus-session', 'mandatory')] },
  { situation: 'get_through_hard', quadrant: 'Calm', slots: [p('grounding', 'settle', 'offered'), ptr('focus-session', 'mandatory')] },

  // 2. Quiet a busy mind
  { situation: 'quiet_mind', quadrant: 'Tense', slots: [p('settle', 'settle', 'mandatory')] },
  { situation: 'quiet_mind', quadrant: 'Activated', slots: [p('grounding', 'settle', 'mandatory'), ptr('focus-session', 'offered')] },
  { situation: 'quiet_mind', quadrant: 'Depleted', slots: [p('grounding', 'settle', 'mandatory')] },
  { situation: 'quiet_mind', quadrant: 'Calm', message: true, slots: [p('settle', 'settle', 'offered')] },

  // 3. Find energy
  { situation: 'find_energy', quadrant: 'Tense', slots: [p('settle-breath', 'settle', 'mandatory')] },
  { situation: 'find_energy', quadrant: 'Activated', message: true, slots: [] }, // zero-slot
  { situation: 'find_energy', quadrant: 'Depleted', slots: [p('energize', 'energize', 'mandatory')] },
  { situation: 'find_energy', quadrant: 'Calm', message: true, slots: [p('energize', 'energize', 'offered')] },

  // 4. Wind down
  { situation: 'wind_down', quadrant: 'Tense', slots: [p('settle', 'settle', 'mandatory')] },
  { situation: 'wind_down', quadrant: 'Activated', slots: [p('nsdr', 'settle', 'mandatory')] },
  { situation: 'wind_down', quadrant: 'Depleted', slots: [p('nsdr', 'settle', 'mandatory')] },
  { situation: 'wind_down', quadrant: 'Calm', slots: [p('settle', 'settle', 'mandatory')] },

  // 5. Get a grip on my day
  { situation: 'grip_on_day', quadrant: 'Tense', slots: [p('settle-breath', 'settle', 'mandatory'), ptr('plan', 'mandatory')] },
  { situation: 'grip_on_day', quadrant: 'Activated', slots: [ptr('plan', 'mandatory')] },
  { situation: 'grip_on_day', quadrant: 'Depleted', message: true, slots: [ptr('plan', 'mandatory')] },
  { situation: 'grip_on_day', quadrant: 'Calm', slots: [ptr('plan', 'mandatory')] },

  // 6. Just need a reset
  { situation: 'just_reset', quadrant: 'Tense', slots: [p('settle-breath', 'settle', 'mandatory')] },
  { situation: 'just_reset', quadrant: 'Activated', slots: [p('grounding', 'settle', 'mandatory')] },
  { situation: 'just_reset', quadrant: 'Depleted', slots: [p('nsdr', 'settle', 'mandatory')] },
  { situation: 'just_reset', quadrant: 'Calm', slots: [p('settle', 'settle', 'mandatory')] },
];

function assertSlotValid(resolved: ResolvedSlot, expected: ExpectSlot) {
  expect(resolved.kind).toBe(expected.kind);
  expect(resolved.slot.type).toBe(expected.type);
  expect(resolved.slot.direction).toBe(expected.direction);
  expect(resolved.mode).toBe(expected.mode);

  if (resolved.kind === 'practice') {
    const { practice, slot } = resolved;
    // modality is within the slot's accepted set
    expect(slotModalities(slot)).toContain(practice.modality);
    // direction tag satisfies the slot (settle accepts settle|both, etc.)
    expect(directionMatches(slot.direction, practice.regulationDirection)).toBe(true);
    // length class is within the slot's accepted classes
    expect(slot.lengthClasses).toContain(timeWindowToLengthClass(practice.timeWindow));
  } else {
    expect(resolved.pointer.type).toBe(expected.type);
  }
}

describe('resolve — all 24 cells (§7)', () => {
  it('covers exactly 24 cells', () => {
    expect(CASES).toHaveLength(24);
  });

  it.each(CASES)('$situation / $quadrant', (c) => {
    const plan: ResolvedPlan = resolve({
      situation: c.situation,
      state: stateFor(c.quadrant),
      clockTime: DAYTIME,
      timeBudget: GENEROUS_BUDGET,
    });

    expect(plan.quadrant).toBe(c.quadrant);
    expect(plan.slots).toHaveLength(c.slots.length);
    if (c.message) {
      expect(typeof plan.message).toBe('string');
      expect(plan.message!.length).toBeGreaterThan(0);
    }
    plan.slots.forEach((slot, i) => assertSlotValid(slot, c.slots[i]));
  });
});

describe('resolve — edge cases', () => {
  it('zero-slot plan: S3/Activated returns a message and no practice', () => {
    const plan = resolve({
      situation: 'find_energy',
      state: stateFor('Activated'),
      clockTime: DAYTIME,
      timeBudget: GENEROUS_BUDGET,
    });
    expect(plan.slots).toHaveLength(0);
    expect(plan.message).toBeTruthy();
  });

  it('offered vs mandatory: S2/Activated grounding is mandatory, focus is offered', () => {
    const plan = resolve({
      situation: 'quiet_mind',
      state: stateFor('Activated'),
      clockTime: DAYTIME,
      timeBudget: GENEROUS_BUDGET,
    });
    expect(plan.slots[0].slot.type).toBe('grounding');
    expect(plan.slots[0].mode).toBe('mandatory');
    expect(plan.slots[1].slot.type).toBe('focus-session');
    expect(plan.slots[1].mode).toBe('offered');
    expect(plan.slots[1].kind).toBe('pointer');
  });

  it('S3/Depleted daytime serves an energize movement practice', () => {
    const plan = resolve({
      situation: 'find_energy',
      state: stateFor('Depleted'),
      clockTime: DAYTIME,
      timeBudget: GENEROUS_BUDGET,
    });
    const slot = plan.slots[0];
    expect(slot.kind).toBe('practice');
    if (slot.kind === 'practice') {
      expect(slot.slot.direction).toBe('energize');
      expect(slot.practice.id).toBe('brief-movement-5');
    }
  });

  it('clock: S3/Depleted + evening biases to nsdr/rest, not energize', () => {
    const plan = resolve({
      situation: 'find_energy',
      state: stateFor('Depleted'),
      clockTime: { hour: 21 },
      timeBudget: GENEROUS_BUDGET,
    });
    expect(plan.message).toBeTruthy();
    expect(plan.slots).toHaveLength(1);
    const slot = plan.slots[0];
    expect(slot.slot.type).toBe('nsdr');
    expect(slot.slot.direction).toBe('settle');
    if (slot.kind === 'practice') {
      expect(slot.practice.modality).toBe('audio');
      expect(slot.practice.family).toBe('nsdr');
    }
  });

  it('time-budget cap: S4/Depleted picks nsdr-20 with a long budget, nsdr-10 with a medium budget', () => {
    const long = resolve({
      situation: 'wind_down',
      state: stateFor('Depleted'),
      clockTime: DAYTIME,
      timeBudget: 20,
    });
    const medium = resolve({
      situation: 'wind_down',
      state: stateFor('Depleted'),
      clockTime: DAYTIME,
      timeBudget: 10,
    });
    const longSlot = long.slots[0];
    const medSlot = medium.slots[0];
    if (longSlot.kind === 'practice') expect(longSlot.practice.id).toBe('nsdr-20');
    if (medSlot.kind === 'practice') expect(medSlot.practice.id).toBe('nsdr-10');
  });
});

describe('resolve — time budget branches the plan (BUG: budget not honored)', () => {
  it('2-min Activated/get_through_hard branches to box-breathing-2, NOT a focus-session pointer', () => {
    const plan = resolve({
      situation: 'get_through_hard',
      state: stateFor('Activated'),
      clockTime: DAYTIME,
      timeBudget: 2,
    });
    expect(plan.slots).toHaveLength(1);
    const slot = plan.slots[0];
    expect(slot.kind).toBe('practice');
    if (slot.kind === 'practice') {
      expect(slot.practice.id).toBe('box-breathing-2');
      expect(slot.slot.pillar).toBe('energy');
    }
  });

  it('2-min Tense/get_through_hard keeps the lead breath and drops the focus pointer', () => {
    const plan = resolve({
      situation: 'get_through_hard',
      state: stateFor('Tense'),
      clockTime: DAYTIME,
      timeBudget: 2,
    });
    expect(plan.slots).toHaveLength(1);
    expect(plan.slots[0].kind).toBe('practice');
    expect(plan.slots.some((s) => s.kind === 'pointer')).toBe(false);
  });

  it('45-min Activated/get_through_hard keeps the focus-session pointer, prefilled to 45', () => {
    const plan = resolve({
      situation: 'get_through_hard',
      state: stateFor('Activated'),
      clockTime: DAYTIME,
      timeBudget: 45,
    });
    expect(plan.slots).toHaveLength(1);
    const slot = plan.slots[0];
    expect(slot.kind).toBe('pointer');
    if (slot.kind === 'pointer') {
      expect(slot.pointer.type).toBe('focus-session');
      expect(slot.pointer.length).toBe(45);
    }
  });

  it('snaps a 10-min budget to a 10-min focus session and a 20-min budget to 15 (tie → lower)', () => {
    const ten = resolve({
      situation: 'get_through_hard',
      state: stateFor('Activated'),
      clockTime: DAYTIME,
      timeBudget: 10,
    });
    const twenty = resolve({
      situation: 'get_through_hard',
      state: stateFor('Activated'),
      clockTime: DAYTIME,
      timeBudget: 20,
    });
    const tenSlot = ten.slots[0];
    const twentySlot = twenty.slots[0];
    if (tenSlot.kind === 'pointer') expect(tenSlot.pointer.length).toBe(10);
    if (twentySlot.kind === 'pointer') expect(twentySlot.pointer.length).toBe(15);
  });

  it('never emits a focus-session / plan pointer at a ≤5 budget across all pointer cells', () => {
    const POINTER_CELLS: ReadonlyArray<{ situation: Situation; quadrant: Quadrant }> = [
      { situation: 'get_through_hard', quadrant: 'Activated' },
      { situation: 'get_through_hard', quadrant: 'Tense' },
      { situation: 'get_through_hard', quadrant: 'Depleted' },
      { situation: 'get_through_hard', quadrant: 'Calm' },
      { situation: 'grip_on_day', quadrant: 'Activated' },
      { situation: 'grip_on_day', quadrant: 'Tense' },
      { situation: 'grip_on_day', quadrant: 'Depleted' },
      { situation: 'grip_on_day', quadrant: 'Calm' },
    ];
    for (const cell of POINTER_CELLS) {
      for (const budget of [2, 5] as const) {
        const plan = resolve({
          situation: cell.situation,
          state: stateFor(cell.quadrant),
          clockTime: DAYTIME,
          timeBudget: budget,
        });
        expect(plan.slots.some((s) => s.kind === 'pointer')).toBe(false);
        expect(plan.slots.length).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('find_energy/Depleted at a 2-min budget serves brief-movement-5 (shortest energizing, length-honest)', () => {
    const plan = resolve({
      situation: 'find_energy',
      state: stateFor('Depleted'),
      clockTime: DAYTIME,
      timeBudget: 2,
    });
    const slot = plan.slots[0];
    expect(slot.kind).toBe('practice');
    if (slot.kind === 'practice') expect(slot.practice.id).toBe('brief-movement-5');
  });
});

// ────────────────────────────────────────────────────────────
// Graceful degradation — resolve() never throws on a valid selection.
// NSDR rest slots declare medium/long length classes; at a 2- or 5-min budget
// (length class 'short') they have no in-budget candidate. The pre-fix engine
// threw "no practice fills slot nsdr/settle"; it now degrades.
// ────────────────────────────────────────────────────────────
const SHORT_BUDGETS = [2, 5] as const;
const EVENING = { hour: 21 };

describe('resolve — graceful degradation at a short budget (BUG 2)', () => {
  // The four MANDATORY NSDR rest cells. Each degrades to a within-budget short
  // settle practice instead of throwing.
  const MANDATORY_NSDR_CELLS: ReadonlyArray<{
    situation: Situation;
    quadrant: Quadrant;
    clockTime: { hour: number };
  }> = [
    { situation: 'wind_down', quadrant: 'Activated', clockTime: DAYTIME },
    { situation: 'wind_down', quadrant: 'Depleted', clockTime: DAYTIME },
    { situation: 'just_reset', quadrant: 'Depleted', clockTime: DAYTIME },
    // find_energy/Depleted only routes to NSDR in the evening (§8 clock modifier).
    { situation: 'find_energy', quadrant: 'Depleted', clockTime: EVENING },
  ];

  for (const cell of MANDATORY_NSDR_CELLS) {
    for (const budget of SHORT_BUDGETS) {
      it(`${cell.situation}/${cell.quadrant} @ ${budget}min degrades to a short settle, no throw`, () => {
        let plan: ResolvedPlan;
        expect(() => {
          plan = resolve({
            situation: cell.situation,
            state: stateFor(cell.quadrant),
            clockTime: cell.clockTime,
            timeBudget: budget,
          });
        }).not.toThrow();

        expect(plan!.slots).toHaveLength(1);
        const slot = plan!.slots[0];
        expect(slot.kind).toBe('practice');
        if (slot.kind === 'practice') {
          // Reflection set + See-other-options key on pillar+direction.
          expect(slot.slot.pillar).toBe('energy');
          expect(slot.slot.direction).toBe('settle');
          // A brief reset that fits — a short settle, NOT a longer-than-budget NSDR.
          expect(slot.practice.family).not.toBe('nsdr');
          expect(slot.practice.timeWindow).toBeLessThanOrEqual(5);
          // The degraded slot re-filters consistently (its length class admits
          // the picked practice; its modality set contains the pick).
          expect(slot.slot.lengthClasses).toContain(
            timeWindowToLengthClass(slot.practice.timeWindow)
          );
          expect(slotModalities(slot.slot)).toContain(slot.practice.modality);
        }
      });
    }
  }

  // The OFFERED NSDR cell (find_energy/Calm + evening) is DROPPED at a short
  // budget — an optional slot that can't fit the time isn't offered (and is not
  // substituted). The leading reframe message is preserved.
  for (const budget of SHORT_BUDGETS) {
    it(`find_energy/Calm + evening @ ${budget}min drops the offered NSDR, keeps the message`, () => {
      let plan: ResolvedPlan;
      expect(() => {
        plan = resolve({
          situation: 'find_energy',
          state: stateFor('Calm'),
          clockTime: EVENING,
          timeBudget: budget,
        });
      }).not.toThrow();
      expect(plan!.slots).toHaveLength(0);
      expect(plan!.message).toBeTruthy();
    });
  }
});

describe('resolve — full no-throw sweep (every cell × budget × time-of-day)', () => {
  const SITUATIONS: Situation[] = [
    'get_through_hard',
    'quiet_mind',
    'find_energy',
    'wind_down',
    'grip_on_day',
    'just_reset',
  ];
  const QUADRANTS: Quadrant[] = ['Tense', 'Activated', 'Depleted', 'Calm'];
  const BUDGETS = [2, 5, 10, 20, 45] as const;
  const CLOCKS = [DAYTIME, EVENING];

  it('resolves without throwing for all 240 (situation × quadrant × budget × time) combinations', () => {
    const failures: string[] = [];
    for (const situation of SITUATIONS) {
      for (const quadrant of QUADRANTS) {
        for (const timeBudget of BUDGETS) {
          for (const clockTime of CLOCKS) {
            try {
              resolve({ situation, state: stateFor(quadrant), clockTime, timeBudget });
            } catch (e) {
              failures.push(
                `${situation}/${quadrant} @ ${timeBudget}min hour=${clockTime.hour}: ${(e as Error).message}`
              );
            }
          }
        }
      }
    }
    expect(failures).toEqual([]);
  });
});
