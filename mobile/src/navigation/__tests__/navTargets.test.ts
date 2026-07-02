/**
 * Flag-aware nav target resolution (B-3d.1 / B-3d.8).
 *
 * Verifies NAV_TARGETS resolves to LIVE, registered route names for whichever
 * IA is active. The test branches on FOUR_PILLAR_IA so it holds under both the
 * legacy four-tab IA (Rhythms / Masterclass) and the four-pillar IA (PillarTime
 * / PillarEnergy) — i.e. it passes both before and after the B-3d.8 flip.
 */

import { NAV_TARGETS } from '../navTargets';
import { ROUTES } from '../routes';
import { FOUR_PILLAR_IA } from '../../constants/dashboardConfig';

describe('NAV_TARGETS — flag-aware tab destinations', () => {
  it('resolves each target to the registered tab route for the active IA', () => {
    if (FOUR_PILLAR_IA) {
      // Four-pillar IA: the PlanScreen tab is PillarTime; the browse hub is the
      // Energy tab.
      expect(NAV_TARGETS.plan).toBe(ROUTES.PillarTime);
      expect(NAV_TARGETS.browseContent).toBe(ROUTES.PillarEnergy);
    } else {
      // Legacy IA: the PlanScreen tab is Rhythms; browse falls back to the
      // Masterclass content screen (the Wellness tab is dissolved).
      expect(NAV_TARGETS.plan).toBe(ROUTES.Rhythms);
      expect(NAV_TARGETS.browseContent).toBe(ROUTES.Masterclass);
    }
  });

  it('every NAV_TARGETS value is a registered route name', () => {
    const registered = new Set<string>(Object.values(ROUTES));
    for (const target of Object.values(NAV_TARGETS)) {
      expect(registered.has(target)).toBe(true);
    }
  });
});
