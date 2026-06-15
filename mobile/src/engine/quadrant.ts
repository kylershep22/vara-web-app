/**
 * Two-tap circumplex → quadrant (Vara_Engine_Contract.md §2).
 *   Tense    = revved + hard  (down-regulate)
 *   Activated = revved + good  (proceed / go)
 *   Depleted = low + hard      (lift or rest)
 *   Calm     = low + good      (maintain)
 */
import type { Arousal, Valence, Quadrant } from './types';

export function classifyQuadrant(arousal: Arousal, valence: Valence): Quadrant {
  if (arousal === 'revved') return valence === 'hard' ? 'Tense' : 'Activated';
  return valence === 'hard' ? 'Depleted' : 'Calm';
}
