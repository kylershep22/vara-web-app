/**
 * PaywallScreen Tests
 * Tests rendering states, CTAs, and brand compliance
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

jest.mock('../services/subscription.service', () => ({
  initiatePurchase: (...args: any[]) => mockInitiatePurchase(...args),
  restorePurchase: (...args: any[]) => mockRestorePurchase(...args),
  getCurrentOfferingPackages: (...args: any[]) =>
    mockGetCurrentOfferingPackages(...args),
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

const { useSubscription } = require('../hooks/useSubscription');

describe('PaywallScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentOfferingPackages.mockResolvedValue({ monthly: null, annual: null });
  });

  describe('Trial active state', () => {
    beforeEach(() => {
      useSubscription.mockReturnValue({
        status: { type: 'trial', isActive: true, canAccessApp: true },
        loading: false,
        error: null,
      });
    });

    it('renders heading for active trial', () => {
      render(<PaywallScreen />);
      expect(screen.getByText('The full Vara experience')).toBeTruthy();
    });

    it('shows "Start your 7-day free trial" CTA', () => {
      render(<PaywallScreen />);
      expect(screen.getByText('Start your 7-day free trial')).toBeTruthy();
    });

    it('has accessible CTA button with correct label', () => {
      render(<PaywallScreen />);
      const cta = screen.getByRole('button', {
        name: 'Start your 7-day free trial',
      });
      expect(cta).toBeTruthy();
    });

    it('shows feature list', () => {
      render(<PaywallScreen />);
      expect(screen.getByText('AI-powered brain health guidance')).toBeTruthy();
      expect(screen.getByText('Full audio and content library')).toBeTruthy();
    });
  });

  describe('Trial expired state', () => {
    beforeEach(() => {
      useSubscription.mockReturnValue({
        status: { type: 'expired', isActive: false, canAccessApp: false },
        loading: false,
        error: null,
      });
    });

    it('renders heading for expired trial', () => {
      render(<PaywallScreen />);
      expect(screen.getByText('Your free trial has ended')).toBeTruthy();
    });

    it('shows "Continue with Vara" CTA when expired', () => {
      render(<PaywallScreen />);
      expect(screen.getByText('Continue with Vara')).toBeTruthy();
    });
  });

  describe('Common elements', () => {
    it('shows "Restore previous purchase" button', () => {
      render(<PaywallScreen />);
      const restore = screen.getByRole('button', {
        name: 'Restore previous purchase',
      });
      expect(restore).toBeTruthy();
    });

    it('shows legal text about trial terms', () => {
      render(<PaywallScreen />);
      expect(
        screen.getByText(/Free for 7 days.*Cancel anytime/i)
      ).toBeTruthy();
    });

    it('renders pricing selector', () => {
      render(<PaywallScreen />);
      expect(screen.getByTestId('pricing-selector')).toBeTruthy();
    });
  });

  describe('Subscribe handler', () => {
    beforeEach(() => {
      useSubscription.mockReturnValue({
        status: { type: 'trial', isActive: true, canAccessApp: true },
        loading: false,
        error: null,
      });
      jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    });

    it('calls initiatePurchase when CTA is pressed', async () => {
      mockInitiatePurchase.mockResolvedValue({ success: true });
      render(<PaywallScreen />);
      const cta = screen.getByRole('button', {
        name: 'Start your 7-day free trial',
      });
      fireEvent.press(cta);
      await waitFor(() => {
        expect(mockInitiatePurchase).toHaveBeenCalledWith('annual');
      });
    });

    it('shows alert on purchase error', async () => {
      mockInitiatePurchase.mockResolvedValue({
        success: false,
        error: 'Purchase not available during beta',
      });
      render(<PaywallScreen />);
      fireEvent.press(
        screen.getByRole('button', { name: 'Start your 7-day free trial' })
      );
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Not Available',
          'Purchase not available during beta'
        );
      });
    });

    it('shows alert on purchase exception', async () => {
      mockInitiatePurchase.mockRejectedValue(new Error('network'));
      render(<PaywallScreen />);
      fireEvent.press(
        screen.getByRole('button', { name: 'Start your 7-day free trial' })
      );
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Something went wrong. Please try again.'
        );
      });
    });
  });

  describe('Restore handler', () => {
    beforeEach(() => {
      useSubscription.mockReturnValue({
        status: { type: 'trial', isActive: true, canAccessApp: true },
        loading: false,
        error: null,
      });
      jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    });

    it('calls restorePurchase when restore button is pressed', async () => {
      mockRestorePurchase.mockResolvedValue({ success: true, restored: true });
      render(<PaywallScreen />);
      fireEvent.press(
        screen.getByRole('button', { name: 'Restore previous purchase' })
      );
      await waitFor(() => {
        expect(mockRestorePurchase).toHaveBeenCalled();
      });
    });

    it('shows success alert on restore', async () => {
      mockRestorePurchase.mockResolvedValue({ success: true, restored: true });
      render(<PaywallScreen />);
      fireEvent.press(
        screen.getByRole('button', { name: 'Restore previous purchase' })
      );
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Restored',
          'Your subscription has been restored.'
        );
      });
    });

    it('shows error alert on restore failure', async () => {
      mockRestorePurchase.mockResolvedValue({
        success: false,
        restored: false,
        error: 'Restore not available during beta',
      });
      render(<PaywallScreen />);
      fireEvent.press(
        screen.getByRole('button', { name: 'Restore previous purchase' })
      );
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Restore',
          'Restore not available during beta'
        );
      });
    });

    it('shows error alert on restore exception', async () => {
      mockRestorePurchase.mockRejectedValue(new Error('network'));
      render(<PaywallScreen />);
      fireEvent.press(
        screen.getByRole('button', { name: 'Restore previous purchase' })
      );
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Could not restore purchase. Please try again.'
        );
      });
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
