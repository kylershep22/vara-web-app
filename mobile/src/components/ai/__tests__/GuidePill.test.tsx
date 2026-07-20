// GuidePill — the docked AI Guide affordance that replaced the bottom-right FAB.
// Verifies it renders as a labeled pill and opens the chat through the consent
// gate when pressed.

const mockRequireConsent = jest.fn((cb?: () => void) => cb && cb());
jest.mock('../../../context/AIConsentContext', () => ({
  useAIConsent: () => ({
    requireConsent: mockRequireConsent,
    hasConsent: true,
    setConsent: jest.fn(),
  }),
}));
jest.mock('../AIChatModal', () => ({
  AIChatModal: ({ visible }: any) => {
    const { Text } = require('react-native');
    return visible ? <Text>chat-open</Text> : null;
  },
}));
jest.mock('../../../hooks/useReducedMotion', () => ({
  useReducedMotion: () => false,
}));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { GuidePill } from '../GuidePill';

beforeEach(() => {
  mockRequireConsent.mockClear();
});

describe('GuidePill', () => {
  it('renders as a labeled pill', () => {
    const { getByText, getByTestId } = render(
      <GuidePill context={{ screen: 'test' }} />
    );
    expect(getByText('Guide')).toBeTruthy();
    expect(getByTestId('guide-pill')).toBeTruthy();
  });

  it('opens the chat through the consent gate when pressed', () => {
    const { getByTestId, getByText } = render(
      <GuidePill context={{ screen: 'test' }} />
    );
    fireEvent.press(getByTestId('guide-pill'));
    expect(mockRequireConsent).toHaveBeenCalledTimes(1);
    // Consent is granted in the mock, so the callback fires and the chat opens.
    expect(getByText('chat-open')).toBeTruthy();
  });
});
