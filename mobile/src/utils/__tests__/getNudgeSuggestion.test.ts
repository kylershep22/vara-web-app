/**
 * getNudgeSuggestion — dead-target regression guard (B-3d.1).
 *
 * The brain-state nudge's `screenName` is fed straight into
 * navigation.navigate() on the dashboard. Two configs (discover, masterclass)
 * used to point at ROUTES.Wellness — the legacy tab, which does NOT exist under
 * the four-pillar IA. This guards that NO nudge, for ANY brain state, can return
 * the dead Wellness target, and that every reachable target is a registered
 * route name.
 */

import { getNudgeSuggestion, PRIORITY_MAP, type Feature } from '../getNudgeSuggestion';
import { ROUTES } from '../../navigation/routes';
import { NAV_TARGETS } from '../../navigation/navTargets';
import type { BrainState } from '../../types/models';

const ALL_STATES = Object.keys(PRIORITY_MAP) as BrainState[];

// Walk the full priority list for a state by progressively marking each
// surfaced feature as completed, collecting every nudge it can ever produce.
function allNudgesForState(state: BrainState) {
  const completed = new Set<Feature>();
  const out = [];
  for (let i = 0; i < PRIORITY_MAP[state].length + 1; i++) {
    const s = getNudgeSuggestion(state, completed);
    if (!s) break;
    out.push(s);
    completed.add(s.feature as Feature);
  }
  return out;
}

describe('getNudgeSuggestion — no dead Wellness target', () => {
  const registered = new Set<string>(Object.values(ROUTES));

  it.each(ALL_STATES)('never returns the dead ROUTES.Wellness target for state "%s"', (state) => {
    for (const nudge of allNudgesForState(state)) {
      expect(nudge.screenName).not.toBe(ROUTES.Wellness);
    }
  });

  it.each(ALL_STATES)('every nudge target for state "%s" is a registered route', (state) => {
    for (const nudge of allNudgesForState(state)) {
      expect(registered.has(nudge.screenName)).toBe(true);
    }
  });

  it('discover + masterclass resolve to their B-3d.1 homes', () => {
    // Exhaust everything except discover/masterclass by completing the rest.
    const all: Feature[] = ['journal', 'focus', 'breathwork', 'community', 'brainHealth', 'discover', 'masterclass'];
    const discoverOnly = new Set<Feature>(all.filter((f) => f !== 'discover'));
    const masterclassOnly = new Set<Feature>(all.filter((f) => f !== 'masterclass'));
    // 'steady' lists discover above masterclass; 'alive' surfaces masterclass.
    expect(getNudgeSuggestion('steady', discoverOnly)?.screenName).toBe(NAV_TARGETS.browseContent);
    expect(getNudgeSuggestion('alive', masterclassOnly)?.screenName).toBe(ROUTES.Masterclass);
  });
});
