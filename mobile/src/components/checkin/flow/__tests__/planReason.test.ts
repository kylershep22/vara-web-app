import { resolve } from '../../../../engine';
import type { Arousal, Situation, Valence } from '../../../../engine';
import { planReason } from '../planReason';

const NOON = { hour: 12 };
const EVENING = { hour: 21 };

function planFor(
  situation: Situation,
  arousal: Arousal,
  valence: Valence,
  clockTime = NOON,
  timeBudget = 45
) {
  return resolve({ situation, state: { arousal, valence }, clockTime, timeBudget });
}

describe('planReason — interim felt "why" composed from quadrant + lead slot', () => {
  it('single practice: names the state and the lead action', () => {
    // just_reset/Tense → settle-breath.
    const reason = planReason(planFor('just_reset', 'revved', 'hard'), false);
    expect(reason).toBe("Because you're wound up, a few breaths to settle.");
  });

  it('single focus-session pointer', () => {
    // get_through_hard/Activated → focus-session.
    const reason = planReason(planFor('get_through_hard', 'revved', 'good'), false);
    expect(reason).toBe("Because you've got energy, straight into focus.");
  });

  it('single plan pointer names routines (honest to the destination)', () => {
    // grip_on_day/Activated → plan.
    const reason = planReason(planFor('grip_on_day', 'revved', 'good'), false);
    expect(reason).toBe("Because you've got energy, line up your routines.");
  });

  it('practice → pointer uses "first" for the chained shape', () => {
    // get_through_hard/Tense → settle-breath → focus-session.
    const reason = planReason(planFor('get_through_hard', 'revved', 'hard'), false);
    expect(reason).toBe("Because you're wound up, a few breaths to settle first.");
  });

  it('message_offered (Calm) frames the optional reset', () => {
    const reason = planReason(planFor('quiet_mind', 'low', 'good'), false);
    expect(reason).toBe("Because you're steady, a short reset is here if you want it.");
  });

  it('find_energy evening rest acknowledges the hour', () => {
    // find_energy/Depleted + evening → nsdr (rest) at a generous budget.
    const reason = planReason(
      planFor('find_energy', 'low', 'hard', EVENING),
      true
    );
    expect(reason).toBe("Because you're running low and it's late, a short rest.");
  });

  it('zero-slot returns null (the acknowledgment message speaks)', () => {
    // find_energy/Activated → zero-slot.
    expect(planReason(planFor('find_energy', 'revved', 'good'), false)).toBeNull();
  });
});
