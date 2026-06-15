import { flowReducer, initFlow } from '../reducer';
import type {
  FlowAction,
  FlowState,
  RecommendationStep,
  RunningStep,
  ReflectionStep,
  PointerOfferStep,
  RecoveryConfirmStep,
} from '../types';
import { getProtocolById } from '../../../../constants/brainStateProtocols';
import type { Protocol } from '../../../../types/models';
import type { Arousal, Situation, Valence } from '../../../../engine';

// Deterministic clocks. Engine evening rules key on the local hour; noon keeps
// every non-evening cell stable, the 21:00 stamp exercises the §8 find_energy
// evening reframe.
const NOON = new Date(2026, 0, 15, 12, 0, 0).getTime();
const EVENING = new Date(2026, 0, 15, 21, 0, 0).getTime();

function getProtocol(id: string): Protocol {
  const p = getProtocolById(id);
  if (!p) throw new Error(`test fixture: protocol "${id}" not in library`);
  return p;
}
const CYCLIC_SIGHING = getProtocol('cyclic-sighing-2');

// Drive the standard flow to the recommendation step (also exercises the
// resolve() wiring + clock injection).
function toRecommendation(
  situation: Situation,
  arousal: Arousal,
  valence: Valence,
  timeWindow: 2 | 5 | 10 | 20 | 45,
  nowMs = NOON
): RecommendationStep {
  let s: FlowState = initFlow({ entrySource: 'standard' });
  s = flowReducer(s, { type: 'situation_selected', situation });
  s = flowReducer(s, { type: 'state_selected', arousal, valence });
  s = flowReducer(s, { type: 'time_selected', timeWindow, nowMs });
  if (s.step !== 'recommendation') {
    throw new Error(`expected recommendation, got ${s.step}`);
  }
  return s;
}

describe('initFlow', () => {
  it('standard entry initializes at situation_pick', () => {
    expect(initFlow({ entrySource: 'standard' })).toEqual({
      step: 'situation_pick',
      entrySource: 'standard',
    });
  });

  it('overwhelm entry initializes directly at running (Tense / just_reset)', () => {
    const state = initFlow({
      entrySource: 'overwhelm_safety_card',
      protocol: CYCLIC_SIGHING,
      nowMs: 5_000_000,
    });
    expect(state.step).toBe('running');
    if (state.step === 'running') {
      expect(state.entrySource).toBe('overwhelm_safety_card');
      expect(state.situation).toBe('just_reset');
      expect(state.quadrant).toBe('Tense');
      expect(state.timeWindow).toBe(2);
      expect(state.protocol.id).toBe('cyclic-sighing-2');
      expect(state.sessionStartedAt).toBe(5_000_000);
    }
  });

  it('state_preselected bridges the BrainState to the circumplex and lands on time_pick', () => {
    const state = initFlow({
      entrySource: 'state_preselected',
      stateBefore: 'foggy', // → low / hard (Depleted)
    });
    expect(state.step).toBe('time_pick');
    if (state.step === 'time_pick') {
      expect(state.arousal).toBe('low');
      expect(state.valence).toBe('hard');
      expect(state.situation).toBe('just_reset');
    }
  });

  it('recovery entry initializes at recovery_confirm preserving the original entrySource', () => {
    const state = initFlow({
      entrySource: 'recovery',
      recoveredPayload: {
        protocol: CYCLIC_SIGHING,
        stateBefore: 'wired',
        timeWindow: 2,
        sessionStartedAt: 1_700_000_000_000,
        sessionEndedAt: 1_700_000_000_000 + 120_000,
        durationActualSeconds: 120,
        intentPath: 'default',
        entrySource: 'overwhelm_safety_card',
      },
    });
    expect(state.step).toBe('recovery_confirm');
    if (state.step === 'recovery_confirm') {
      expect(state.entrySource).toBe('overwhelm_safety_card');
      expect(state.recoveredPayload.protocol.id).toBe('cyclic-sighing-2');
    }
  });
});

describe('situation_pick → state_pick', () => {
  it('situation_selected advances to state_pick with the situation captured', () => {
    const start: FlowState = { step: 'situation_pick', entrySource: 'standard' };
    const result = flowReducer(start, {
      type: 'situation_selected',
      situation: 'quiet_mind',
    });
    expect(result).toEqual({
      step: 'state_pick',
      entrySource: 'standard',
      situation: 'quiet_mind',
    });
  });

  it('back from situation_pick is a no-op (parent owns dismissal)', () => {
    const start: FlowState = { step: 'situation_pick', entrySource: 'standard' };
    expect(flowReducer(start, { type: 'back' })).toBe(start);
  });
});

describe('state_pick (two-tap circumplex) → time_pick', () => {
  const start: FlowState = {
    step: 'state_pick',
    entrySource: 'standard',
    situation: 'get_through_hard',
  };

  it('state_selected carries the full {arousal, valence} pair to time_pick', () => {
    const result = flowReducer(start, {
      type: 'state_selected',
      arousal: 'revved',
      valence: 'hard',
    });
    expect(result).toEqual({
      step: 'time_pick',
      entrySource: 'standard',
      situation: 'get_through_hard',
      arousal: 'revved',
      valence: 'hard',
    });
  });

  it('back from state_pick returns to situation_pick', () => {
    expect(flowReducer(start, { type: 'back' })).toEqual({
      step: 'situation_pick',
      entrySource: 'standard',
    });
  });
});

describe('time_pick → recommendation (resolve() wiring)', () => {
  it('time_selected resolves a plan with the quadrant from the circumplex', () => {
    // quiet_mind + Tense (revved/hard) → single mandatory settle practice.
    const reco = toRecommendation('quiet_mind', 'revved', 'hard', 5);
    expect(reco.quadrant).toBe('Tense');
    expect(reco.timeWindow).toBe(5);
    expect(reco.plan.slots).toHaveLength(1);
    expect(reco.plan.slots[0].kind).toBe('practice');
  });

  it('injects the device clock so the §8 find_energy evening reframe fires', () => {
    // find_energy + Depleted (low/hard): daytime → energize practice; evening →
    // the nsdr rest reframe.
    const day = toRecommendation('find_energy', 'low', 'hard', 10, NOON);
    expect(day.plan.message).toBeUndefined();

    const evening = toRecommendation('find_energy', 'low', 'hard', 10, EVENING);
    expect(evening.plan.message).toMatch(/rest is the energy move/i);
  });

  it('back from time_pick returns to state_pick preserving the situation', () => {
    const start: FlowState = {
      step: 'time_pick',
      entrySource: 'standard',
      situation: 'wind_down',
      arousal: 'low',
      valence: 'good',
    };
    expect(flowReducer(start, { type: 'back' })).toEqual({
      step: 'state_pick',
      entrySource: 'standard',
      situation: 'wind_down',
    });
  });
});

describe('recommendation → running / flow_complete (plan shapes)', () => {
  it('single_practice: plan_primary starts running with the slot pillar/direction', () => {
    const reco = toRecommendation('quiet_mind', 'revved', 'hard', 5);
    const result = flowReducer(reco, { type: 'plan_primary', nowMs: 1_000 });
    expect(result.step).toBe('running');
    if (result.step === 'running') {
      expect(result.pillar).toBe('energy');
      expect(result.direction).toBe('settle');
      expect(result.sessionStartedAt).toBe(1_000);
    }
  });

  it('zero-slot (find_energy/Activated): plan_primary completes as acknowledged', () => {
    const reco = toRecommendation('find_energy', 'revved', 'good', 5);
    expect(reco.plan.slots).toHaveLength(0);
    const result = flowReducer(reco, { type: 'plan_primary', nowMs: 1_000 });
    expect(result.step).toBe('flow_complete');
    if (result.step === 'flow_complete') {
      expect(result.completion.kind).toBe('acknowledged');
    }
  });

  it('single_pointer (get_through_hard/Activated): plan_primary hands off to the focus-session pointer', () => {
    const reco = toRecommendation('get_through_hard', 'revved', 'good', 5);
    const result = flowReducer(reco, { type: 'plan_primary', nowMs: 1_000 });
    expect(result.step).toBe('flow_complete');
    if (result.step === 'flow_complete' && result.completion.kind === 'pointer_only') {
      expect(result.completion.pointerLaunched.type).toBe('focus-session');
    } else {
      throw new Error('expected pointer_only completion');
    }
  });

  it('message_offered (quiet_mind/Calm): primary acknowledges, secondary runs the offered practice', () => {
    const reco = toRecommendation('quiet_mind', 'low', 'good', 5);
    const acknowledged = flowReducer(reco, { type: 'plan_primary', nowMs: 1 });
    expect(acknowledged.step).toBe('flow_complete');
    if (acknowledged.step === 'flow_complete') {
      expect(acknowledged.completion.kind).toBe('acknowledged');
    }
    const running = flowReducer(reco, { type: 'plan_secondary', nowMs: 2 });
    expect(running.step).toBe('running');
  });

  it('offered_practice_then_pointer (get_through_hard/Calm): primary launches pointer, secondary runs the pre-roll', () => {
    const reco = toRecommendation('get_through_hard', 'low', 'good', 5);
    const launched = flowReducer(reco, { type: 'plan_primary', nowMs: 1 });
    expect(launched.step).toBe('flow_complete');
    if (launched.step === 'flow_complete' && launched.completion.kind === 'pointer_only') {
      expect(launched.completion.pointerLaunched.type).toBe('focus-session');
    } else {
      throw new Error('expected pointer_only');
    }
    const preRoll = flowReducer(reco, { type: 'plan_secondary', nowMs: 2 });
    expect(preRoll.step).toBe('running');
  });

  it('back from recommendation returns to time_pick', () => {
    const reco = toRecommendation('quiet_mind', 'revved', 'hard', 5);
    const result = flowReducer(reco, { type: 'back' });
    expect(result.step).toBe('time_pick');
  });
});

describe('running → reflection / abandoned', () => {
  function running(): RunningStep {
    const reco = toRecommendation('quiet_mind', 'revved', 'hard', 5);
    const r = flowReducer(reco, { type: 'plan_primary', nowMs: 1_000_000 });
    if (r.step !== 'running') throw new Error('setup');
    return r;
  }

  it('player_exit completed advances to reflection with computed duration', () => {
    const result = flowReducer(running(), {
      type: 'player_exit',
      reason: 'completed',
      nowMs: 1_125_500,
    });
    expect(result.step).toBe('reflection');
    if (result.step === 'reflection') {
      expect(result.durationActualSeconds).toBe(126);
      expect(result.pillar).toBe('energy');
      expect(result.direction).toBe('settle');
    }
  });

  it('player_exit ended_early short-circuits to abandoned (no reflection)', () => {
    const result = flowReducer(running(), {
      type: 'player_exit',
      reason: 'ended_early',
      nowMs: 1_030_000,
    });
    expect(result.step).toBe('abandoned');
    if (result.step === 'abandoned') {
      expect(result.durationActualSeconds).toBe(30);
    }
  });

  it('back from running is a no-op (locked decision B)', () => {
    const start = running();
    expect(flowReducer(start, { type: 'back' })).toBe(start);
  });
});

describe('reflection → flow_complete / pointer_offer', () => {
  function reflectionFor(
    situation: Situation,
    arousal: Arousal,
    valence: Valence
  ): ReflectionStep {
    const reco = toRecommendation(situation, arousal, valence, 5);
    let s: FlowState = flowReducer(reco, { type: 'plan_primary', nowMs: 1_000_000 });
    s = flowReducer(s, { type: 'player_exit', reason: 'completed', nowMs: 1_120_000 });
    if (s.step !== 'reflection') throw new Error(`setup: ${s.step}`);
    return s;
  }

  it('single_practice reflection completes with the reflection id and no pointer', () => {
    const result = flowReducer(reflectionFor('quiet_mind', 'revved', 'hard'), {
      type: 'reflection_selected',
      reflectionId: 'calmer',
    });
    expect(result.step).toBe('flow_complete');
    if (result.step === 'flow_complete' && result.completion.kind === 'practice') {
      expect(result.completion.reflection).toBe('calmer');
      expect(result.completion.pointerLaunched).toBeNull();
    } else {
      throw new Error('expected practice completion');
    }
  });

  it('practice_then_pointer reflection launches the mandatory pointer', () => {
    // get_through_hard / Tense → settle-breath → focus-session (mandatory).
    const result = flowReducer(reflectionFor('get_through_hard', 'revved', 'hard'), {
      type: 'reflection_selected',
      reflectionId: 'calmer',
    });
    expect(result.step).toBe('flow_complete');
    if (result.step === 'flow_complete' && result.completion.kind === 'practice') {
      expect(result.completion.pointerLaunched?.type).toBe('focus-session');
    } else {
      throw new Error('expected practice completion with pointer');
    }
  });

  it('practice_then_offered_pointer reflection presents the offered pointer (never auto-chains)', () => {
    // quiet_mind / Activated → grounding → focus-session [offer].
    const result = flowReducer(reflectionFor('quiet_mind', 'revved', 'good'), {
      type: 'reflection_selected',
      reflectionId: 'calmer',
    });
    expect(result.step).toBe('pointer_offer');
    if (result.step === 'pointer_offer') {
      expect(result.pointer.type).toBe('focus-session');
      expect(result.reflection).toBe('calmer');
    }
  });

  it('back from reflection is a no-op', () => {
    const start = reflectionFor('quiet_mind', 'revved', 'hard');
    expect(flowReducer(start, { type: 'back' })).toBe(start);
  });
});

describe('pointer_offer → flow_complete', () => {
  function pointerOffer(): PointerOfferStep {
    const reco = toRecommendation('quiet_mind', 'revved', 'good', 5);
    let s: FlowState = flowReducer(reco, { type: 'plan_primary', nowMs: 1_000_000 });
    s = flowReducer(s, { type: 'player_exit', reason: 'completed', nowMs: 1_120_000 });
    s = flowReducer(s, { type: 'reflection_selected', reflectionId: 'calmer' });
    if (s.step !== 'pointer_offer') throw new Error('setup');
    return s;
  }

  it('accept launches the pointer', () => {
    const result = flowReducer(pointerOffer(), { type: 'pointer_accepted' });
    if (result.step === 'flow_complete' && result.completion.kind === 'practice') {
      expect(result.completion.pointerLaunched?.type).toBe('focus-session');
    } else {
      throw new Error('expected practice completion with pointer');
    }
  });

  it('decline completes without launching the pointer', () => {
    const result = flowReducer(pointerOffer(), { type: 'pointer_declined' });
    if (result.step === 'flow_complete' && result.completion.kind === 'practice') {
      expect(result.completion.pointerLaunched).toBeNull();
    } else {
      throw new Error('expected practice completion without pointer');
    }
  });
});

describe('recovery_confirm transitions', () => {
  function recoveryConfirm(
    entrySource: RecoveryConfirmStep['entrySource'] = 'standard'
  ): RecoveryConfirmStep {
    return {
      step: 'recovery_confirm',
      entrySource,
      recoveredPayload: {
        protocol: CYCLIC_SIGHING,
        stateBefore: 'wired',
        timeWindow: 2,
        sessionStartedAt: 1_700_000_000_000,
        sessionEndedAt: 1_700_000_000_000 + 120_000,
        durationActualSeconds: 120,
        intentPath: 'default',
      },
    };
  }

  it('recovery_confirmed resumes at reflection with the recovered practice', () => {
    const result = flowReducer(recoveryConfirm('overwhelm_safety_card'), {
      type: 'recovery_confirmed',
    });
    expect(result.step).toBe('reflection');
    if (result.step === 'reflection') {
      expect(result.entrySource).toBe('overwhelm_safety_card');
      expect(result.protocol.id).toBe('cyclic-sighing-2');
      expect(result.durationActualSeconds).toBe(120);
      expect(result.direction).toBe('settle');
    }
  });

  it('recovery_declined starts fresh at situation_pick', () => {
    expect(
      flowReducer(recoveryConfirm('overwhelm_safety_card'), {
        type: 'recovery_declined',
      })
    ).toEqual({ step: 'situation_pick', entrySource: 'standard' });
  });

  it('back from recovery_confirm is a no-op', () => {
    const start = recoveryConfirm();
    expect(flowReducer(start, { type: 'back' })).toBe(start);
  });
});

describe('terminal states are absorbing', () => {
  const flowComplete: FlowState = {
    step: 'flow_complete',
    entrySource: 'standard',
    situation: 'quiet_mind',
    arousal: 'revved',
    valence: 'hard',
    quadrant: 'Tense',
    timeWindow: 5,
    plan: { situation: 'quiet_mind', quadrant: 'Tense', slots: [] },
    completion: { kind: 'acknowledged' },
  };

  it('any action on flow_complete returns the same state', () => {
    expect(flowReducer(flowComplete, { type: 'back' })).toBe(flowComplete);
    expect(
      flowReducer(flowComplete, { type: 'reflection_selected', reflectionId: 'calmer' })
    ).toBe(flowComplete);
  });
});

describe('full standard traversal', () => {
  it('situation → state → time → plan → run → reflect → complete', () => {
    let s: FlowState = initFlow({ entrySource: 'standard' });
    expect(s.step).toBe('situation_pick');
    s = flowReducer(s, { type: 'situation_selected', situation: 'quiet_mind' });
    expect(s.step).toBe('state_pick');
    s = flowReducer(s, { type: 'state_selected', arousal: 'revved', valence: 'hard' });
    expect(s.step).toBe('time_pick');
    s = flowReducer(s, { type: 'time_selected', timeWindow: 5, nowMs: NOON });
    expect(s.step).toBe('recommendation');
    s = flowReducer(s, { type: 'plan_primary', nowMs: 1_000_000 });
    expect(s.step).toBe('running');
    s = flowReducer(s, { type: 'player_exit', reason: 'completed', nowMs: 1_300_000 });
    expect(s.step).toBe('reflection');
    s = flowReducer(s, { type: 'reflection_selected', reflectionId: 'calmer' });
    expect(s.step).toBe('flow_complete');
  });
});

const _TYPECHECK: FlowAction[] = [
  { type: 'situation_selected', situation: 'quiet_mind' },
  { type: 'state_selected', arousal: 'revved', valence: 'hard' },
  { type: 'time_selected', timeWindow: 2, nowMs: 0 },
  { type: 'plan_primary', nowMs: 0 },
  { type: 'plan_secondary', nowMs: 0 },
  { type: 'player_exit', reason: 'completed', nowMs: 0 },
  { type: 'reflection_selected', reflectionId: 'calmer' },
  { type: 'pointer_accepted' },
  { type: 'pointer_declined' },
  { type: 'recovery_confirmed' },
  { type: 'recovery_declined' },
  { type: 'back' },
];
void _TYPECHECK;
