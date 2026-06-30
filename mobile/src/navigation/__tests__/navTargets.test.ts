/**
 * Flag-aware nav target resolution (B-3d.1).
 *
 * Verifies NAV_TARGETS resolves to LIVE, registered route names under the
 * default FOUR_PILLAR_IA = false (OFF) build. The ON-state resolutions
 * (PillarTime / PillarEnergy) are documented here and exercised by the flag-ON
 * device walk; both branches reference registry constants so neither can drift
 * to an unregistered string.
 */

import { NAV_TARGETS } from '../navTargets';
import { ROUTES } from '../routes';
import { FOUR_PILLAR_IA } from '../../constants/dashboardConfig';

describe('NAV_TARGETS — flag-aware tab destinations', () => {
  it('resolves to legacy tab routes while FOUR_PILLAR_IA is OFF', () => {
    // Guard: this file documents the OFF baseline. If the flag flips, the ON
    // expectations below apply instead.
    expect(FOUR_PILLAR_IA).toBe(false);
    expect(NAV_TARGETS.plan).toBe(ROUTES.Rhythms);
    expect(NAV_TARGETS.browseContent).toBe(ROUTES.Masterclass);
  });

  it('every NAV_TARGETS value is a registered route name', () => {
    const registered = new Set<string>(Object.values(ROUTES));
    for (const target of Object.values(NAV_TARGETS)) {
      expect(registered.has(target)).toBe(true);
    }
  });

  // Documented ON-state contract (asserted by the device walk, not here, since
  // the flag is a compile-time const): under FOUR_PILLAR_IA = true,
  //   NAV_TARGETS.plan          === ROUTES.PillarTime
  //   NAV_TARGETS.browseContent === ROUTES.PillarEnergy
  // Both are registered FivePillarTabs route names.
});
