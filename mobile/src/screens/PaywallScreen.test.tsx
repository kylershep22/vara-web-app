/**
 * PaywallScreen Tests
 * Tests rendering states, CTAs, trial-eligibility branching, and brand compliance.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import PaywallScreen from './PaywallScreen';

// Mock dependencies
jest.mock('../hooks/useSubscription', () => ({
  useSubscription: jest.fn(() => ({
    status: { type: 'trial', isActive: true, canAccessApp: true },
    loading: false,
    error: null,
  })),
}));

const mockInitiatePurchase = jest.fn();
const mockRestorePurchase = jest.fn();
const mockGetCurrentOfferingPackages = jest.fn();
const mockConfirmLogout = jest.fn();
const mockConfirmDeleteAccount = jest.fn();
const mockCheckEligibility = jest.fn();

// react-native-purchases: provide the intro-eligibility enum + the per-Apple-ID
// eligibility check the paywall now calls. Default resolves ELIGIBLE; specific
// describes override for the ineligible / no-trial path.
jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: {
    checkTrialOrIntroductoryPriceEligibility: (...args: any[]) => mockCheckEligibility(...args),
  },
  INTRO_ELIGIBILITY_STATUS: {
    INTRO_ELIGIBILITY_STATUS_UNKNOWN: 0,
    INTRO_ELIGIBILITY_STATUS_INELIGIBLE: 1,
    INTRO_ELIGIBILITY_STATUS_ELIGIBLE: 2,
    INTRO_ELIGIBILITY_STATUS_NO_INTRO_OFFER_EXISTS: 3,
  },
}));

jest.mock('../hooks/useAccountActions', () => ({
  useAccountActions: () => ({
    deleting: false,
    confirmLogout: mockConfirmLogout,
    confirmDeleteAccount: mockConfirmDeleteAccount,
  }),
}));

jest.mock('../services/subscription.service', () => ({
  initiatePurchase: (...args: any[]) => mockInitiatePurchase(...args),
  restorePurchase: (...args: any[]) => mockRestorePurchase(...args),
  getCurrentOfferingPackages: (...args: any[]) => mockGetCurrentOfferingPackages(...args),
}));

jest.mock('../components/paywall/PricingSelector', () => {
  const { View, Text } = require('react-native');
  return function MockPricingSelector({ selectedPlan }: any) {
    return (
      <View testID="pricing-selector">
        <Text>{selectedPlan}</Text>
      </View>
    );
  };
});

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return <View {...props}>{children}</View>;
  },
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

// Probe for the event-code sheet: render a marker only when visible, so we can
// assert the "Have a code?" link toggles it open.
jest.mock('../components/events/EventCodeSheet', () => ({
  EventCodeSheet: ({ visible }: any) => {
    const { Text } = require('react-native');
    return visible ? <Text>EVENT_CODE_SHEET_OPEN</Text> : null;
  },
}));

const { useSubscription } = require('../hooks/useSubscription');

const ELIGIBLE = 2;
const INELIGIBLE = 1;

// Packages carrying product identifiers so the eligibility effect can run.
const PACKAGES = {
  monthly: { product: { identifier: 'vara.monthly', priceString: '$9.99' } },
  annual: { product: { identifier: 'vara.annual', priceString: '$59.99' } },
};

function setEligibility(status: number) {
  mockCheckEligibility.mockResolvedValue({
    'vara.annual': { status },
    'vara.monthly': { status },
  });
}

describe('PaywallScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentOfferingPackages.mockResolvedValue(PACKAGES);
    setEligibility(ELIGIBLE);
    useSubscription.mockReturnValue({
      status: { type: 'trial', isActive: true, canAccessApp: true },
      loading: false,
      error: null,
    });
  });

  describe('Trial-eligible (new user)', () => {
    it('names the offer in the heading (offer, not trial mechanic)', async () => {
      render(<PaywallScreen />);
      expect(await screen.findByText('The full Vara experience')).toBeTruthy();
      expect(screen.queryByText('Your 14-day plan')).toBeNull();
    });

    it('shows "Start your 14-day free trial" CTA', async () => {
      render(<PaywallScreen />);
      expect(await screen.findByText('Start your 14-day free trial')).toBeTruthy();
    });

    it('renders the trial timeline with the day-14 milestone', async () => {
      render(<PaywallScreen />);
      expect(await screen.findByText('Day 14')).toBeTruthy();
    });

    it('shows 14-day legal terms', async () => {
      render(<PaywallScreen />);
      expect(await screen.findByText(/Free for 14 days.*Cancel anytime/i)).toBeTruthy();
    });

    it('shows feature list', () => {
      render(<PaywallScreen />);
      expect(screen.getByText('AI-powered brain health guidance')).toBeTruthy();
      expect(screen.getByText('Full audio and content library')).toBeTruthy();
      expect(
        screen.getByText('Brain-aligned guidance that adapts to how you arrive each day')
      ).toBeTruthy();
    });
  });

  describe('Intro-ineligible (no-trial state)', () => {
    beforeEach(() => setEligibility(INELIGIBLE));

    it('shows the "Subscribe" CTA instead of a trial CTA', async () => {
      render(<PaywallScreen />);
      expect(await screen.findByText('Subscribe')).toBeTruthy();
      expect(screen.queryByText('Start your 14-day free trial')).toBeNull();
    });

    it('hides the trial timeline', async () => {
      render(<PaywallScreen />);
      await screen.findByText('Subscribe');
      expect(screen.queryByText('Day 14')).toBeNull();
    });

    it('shows honest no-trial legal copy', async () => {
      render(<PaywallScreen />);
      await screen.findByText('Subscribe');
      expect(screen.getByText(/Cancel anytime\./i)).toBeTruthy();
      expect(screen.queryByText(/Free for 14 days/i)).toBeNull();
    });
  });

  describe('Returning gated user, intro-ineligible (copy no longer driven by status.type)', () => {
    beforeEach(() => {
      setEligibility(INELIGIBLE);
      useSubscription.mockReturnValue({
        status: { type: 'expired', isActive: false, canAccessApp: false },
        loading: false,
        error: null,
      });
    });

    it('renders the non-trial heading — NOT the old "free trial has ended" copy', async () => {
      render(<PaywallScreen />);
      expect(await screen.findByText('The full Vara experience')).toBeTruthy();
      expect(screen.queryByText('Your free trial has ended')).toBeNull();
    });

    it('shows the Subscribe CTA (no trial available)', async () => {
      render(<PaywallScreen />);
      expect(await screen.findByText('Subscribe')).toBeTruthy();
    });
  });

  describe('Common elements', () => {
    it('shows "Restore previous purchase" button', () => {
      render(<PaywallScreen />);
      expect(screen.getByRole('button', { name: 'Restore previous purchase' })).toBeTruthy();
    });

    it('renders pricing selector', () => {
      render(<PaywallScreen />);
      expect(screen.getByTestId('pricing-selector')).toBeTruthy();
    });

    it('"Have a code?" opens the EventCodeSheet', () => {
      render(<PaywallScreen />);
      expect(screen.queryByText('EVENT_CODE_SHEET_OPEN')).toBeNull();
      fireEvent.press(screen.getByRole('button', { name: 'Have a code?' }));
      expect(screen.getByText('EVENT_CODE_SHEET_OPEN')).toBeTruthy();
    });
  });

  describe('Subscribe handler', () => {
    beforeEach(() => {
      jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    });

    it('calls initiatePurchase when CTA is pressed', async () => {
      mockInitiatePurchase.mockResolvedValue({ success: true });
      render(<PaywallScreen />);
      const cta = await screen.findByRole('button', { name: 'Start your 14-day free trial' });
      fireEvent.press(cta);
      await waitFor(() => expect(mockInitiatePurchase).toHaveBeenCalledWith('annual'));
    });

    it('shows alert on purchase error', async () => {
      mockInitiatePurchase.mockResolvedValue({
        success: false,
        error: 'Purchase not available during beta',
      });
      render(<PaywallScreen />);
      fireEvent.press(await screen.findByRole('button', { name: 'Start your 14-day free trial' }));
      await waitFor(() =>
        expect(Alert.alert).toHaveBeenCalledWith('Not Available', 'Purchase not available during beta')
      );
    });

    it('shows alert on purchase exception', async () => {
      mockInitiatePurchase.mockRejectedValue(new Error('network'));
      render(<PaywallScreen />);
      fireEvent.press(await screen.findByRole('button', { name: 'Start your 14-day free trial' }));
      await waitFor(() =>
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Something went wrong. Please try again.')
      );
    });
  });

  describe('Restore handler', () => {
    beforeEach(() => {
      jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    });

    it('calls restorePurchase when restore button is pressed', async () => {
      mockRestorePurchase.mockResolvedValue({ success: true, restored: true });
      render(<PaywallScreen />);
      fireEvent.press(screen.getByRole('button', { name: 'Restore previous purchase' }));
      await waitFor(() => expect(mockRestorePurchase).toHaveBeenCalled());
    });

    it('shows success alert on restore', async () => {
      mockRestorePurchase.mockResolvedValue({ success: true, restored: true });
      render(<PaywallScreen />);
      fireEvent.press(screen.getByRole('button', { name: 'Restore previous purchase' }));
      await waitFor(() =>
        expect(Alert.alert).toHaveBeenCalledWith('Restored', 'Your subscription has been restored.')
      );
    });

    it('shows error alert on restore failure', async () => {
      mockRestorePurchase.mockResolvedValue({
        success: false,
        restored: false,
        error: 'Restore not available during beta',
      });
      render(<PaywallScreen />);
      fireEvent.press(screen.getByRole('button', { name: 'Restore previous purchase' }));
      await waitFor(() =>
        expect(Alert.alert).toHaveBeenCalledWith('Restore', 'Restore not available during beta')
      );
    });

    it('shows error alert on restore exception', async () => {
      mockRestorePurchase.mockRejectedValue(new Error('network'));
      render(<PaywallScreen />);
      fireEvent.press(screen.getByRole('button', { name: 'Restore previous purchase' }));
      await waitFor(() =>
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Could not restore purchase. Please try again.')
      );
    });
  });

  describe('Account actions (gated escape hatch)', () => {
    beforeEach(() => {
      useSubscription.mockReturnValue({
        status: { type: 'expired', isActive: false, canAccessApp: false },
        loading: false,
        error: null,
      });
    });

    it('surfaces Log out and Delete account actions', () => {
      render(<PaywallScreen />);
      expect(screen.getByRole('button', { name: 'Log out' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Delete account' })).toBeTruthy();
    });

    it('invokes the shared confirmations when pressed', () => {
      render(<PaywallScreen />);
      fireEvent.press(screen.getByRole('button', { name: 'Log out' }));
      expect(mockConfirmLogout).toHaveBeenCalled();
      fireEvent.press(screen.getByRole('button', { name: 'Delete account' }));
      expect(mockConfirmDeleteAccount).toHaveBeenCalled();
    });
  });

  describe('Brand compliance', () => {
    it('does not contain urgency language', () => {
      const { toJSON } = render(<PaywallScreen />);
      const json = JSON.stringify(toJSON());
      expect(json).not.toMatch(/Subscribe Now/i);
      expect(json).not.toMatch(/Unlock Your/i);
      expect(json).not.toMatch(/Don't break/i);
      expect(json).not.toMatch(/Don't miss/i);
      expect(json).not.toMatch(/Limited time/i);
      expect(json).not.toMatch(/Act now/i);
    });
  });
});
