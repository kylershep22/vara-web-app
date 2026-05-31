/**
 * Locks the onboarding entry-protocol override: the signup-moment demo must be
 * phone-only / doable anywhere. Wired is routed off Cold Water Reset (needs
 * cold running water) and onto breathwork.
 */
import { ONBOARDING_ENTRY_PROTOCOL_OVERRIDES } from '../onboardingStressRecovery';
import { getProtocolById } from '../brainStateProtocols';

describe('onboarding entry-protocol overrides', () => {
  it('routes Wired to cyclic sighing (physiological sigh)', () => {
    expect(ONBOARDING_ENTRY_PROTOCOL_OVERRIDES.wired).toBe('cyclic-sighing-2');
  });

  it('every override resolves to a real, phone-only (non-cold) protocol', () => {
    for (const id of Object.values(ONBOARDING_ENTRY_PROTOCOL_OVERRIDES)) {
      const protocol = getProtocolById(id as string);
      expect(protocol).not.toBeNull();
      // Phone-only: no environmental modality (cold water, bright light, etc.).
      expect(protocol?.modality).toBe('breath');
    }
  });
});
