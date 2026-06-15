/**
 * Quadrant ↔ BrainState bridge (Vara_Engine_Contract.md §2 migration aid).
 *
 * The engine speaks the two-tap circumplex (arousal × valence → quadrant). The
 * legacy `brainStateCheckIns` collection, the dashboard gating/summary card, and
 * the recovery marker still speak the five-state `BrainState`. This module is the
 * single, intentional bridge between the two vocabularies.
 *
 * Direction of use (locked, Phase B):
 *   - `quadrantToBrainState` — used ONLY for the legacy `brainStateCheckIns` doc
 *     write so dashboard gating survives. The circumplex stays authoritative on
 *     `protocolSessions`; the bridged value is never surfaced as new user-facing
 *     copy. The legacy collection is flagged for later removal.
 *   - `brainStateToCircumplex` — used by the recovery entry, whose marker stores
 *     a bridged `BrainState`; we invert it to resume the engine flow.
 *
 * The bridge is a bijection on the four quadrants ↔ four of the five brain
 * states (Tense↔wired, Activated↔alive, Depleted↔foggy, Calm↔steady). `clear`
 * is never produced by the bridge; `brainStateToCircumplex` maps it to Calm so
 * a stray legacy/marker value still resolves.
 */
import type { BrainState } from '../types/models';
import type { Arousal, Quadrant, Valence } from './types';

export function quadrantToBrainState(quadrant: Quadrant): BrainState {
  switch (quadrant) {
    case 'Tense':
      return 'wired';
    case 'Activated':
      return 'alive';
    case 'Depleted':
      return 'foggy';
    case 'Calm':
      return 'steady';
  }
}

export function brainStateToCircumplex(state: BrainState): {
  arousal: Arousal;
  valence: Valence;
} {
  switch (state) {
    case 'wired':
      return { arousal: 'revved', valence: 'hard' };
    case 'alive':
      return { arousal: 'revved', valence: 'good' };
    case 'foggy':
      return { arousal: 'low', valence: 'hard' };
    case 'steady':
    case 'clear':
      return { arousal: 'low', valence: 'good' };
  }
}
