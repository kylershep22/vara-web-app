// Tests for PracticesIndexScreen's eligibility filter. The screen now re-runs
// the engine's eligiblePractices(slot, …) for the slot the check-in's "See
// other options" was filling, instead of an inline suitableForStates filter.

import React from 'react';
import { render } from '@testing-library/react-native';

import { eligiblePractices, timeWindowToLengthClass, isEvening } from '../../../engine';
import type { Slot } from '../../../engine';
import { getAllProtocols } from '../../../constants/brainStateProtocols';

// A short settle-breath slot — the lead for several Tense cells.
const SETTLE_BREATH_SLOT: Slot = {
  pillar: 'energy',
  direction: 'settle',
  type: 'settle-breath',
  lengthClasses: ['short'],
  mode: 'mandatory',
};

const mockRouteParams: {
  params: {
    slot: Slot;
    state: string;
    timeWindow?: number;
    fromCheckInFlow?: boolean;
    intentPath?: string;
  };
} = { params: { slot: SETTLE_BREATH_SLOT, state: 'wired', timeWindow: 5 } };

const mockSetOptions = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useRoute: () => mockRouteParams,
  useNavigation: () => ({
    setOptions: mockSetOptions,
    goBack: jest.fn(),
    navigate: jest.fn(),
  }),
}));

import { PracticesIndexScreen } from '../PracticesIndexScreen';

beforeEach(() => {
  mockSetOptions.mockClear();
});

describe('PracticesIndexScreen — engine slot eligibility', () => {
  it('renders exactly the practices the engine accepts for the slot + budget', () => {
    mockRouteParams.params = { slot: SETTLE_BREATH_SLOT, state: 'wired', timeWindow: 5 };
    const { queryByTestId } = render(<PracticesIndexScreen />);

    const expected = eligiblePractices(
      SETTLE_BREATH_SLOT,
      getAllProtocols(),
      timeWindowToLengthClass(5),
      isEvening({ hour: new Date().getHours() })
    );
    expect(expected.length).toBeGreaterThan(0);

    // Every engine-eligible practice has a card; the empty state is absent.
    for (const p of expected) {
      expect(queryByTestId(`practices-index-card-${p.id}`)).not.toBeNull();
    }
    expect(queryByTestId('practices-index-empty')).toBeNull();
  });

  it('does not render practices outside the slot filter (e.g. an energize movement for a settle slot)', () => {
    mockRouteParams.params = { slot: SETTLE_BREATH_SLOT, state: 'wired', timeWindow: 5 };
    const { queryByTestId } = render(<PracticesIndexScreen />);
    // brief-movement is energize → never eligible for a settle slot.
    expect(queryByTestId('practices-index-card-brief-movement-5')).toBeNull();
  });

  it('a larger budget admits at least as many practices (length-class cap)', () => {
    const groundingSlot: Slot = {
      pillar: 'energy',
      direction: 'settle',
      type: 'grounding',
      lengthClasses: ['short'],
      mode: 'mandatory',
    };
    const small = eligiblePractices(
      groundingSlot,
      getAllProtocols(),
      timeWindowToLengthClass(2),
      false
    );
    const large = eligiblePractices(
      groundingSlot,
      getAllProtocols(),
      timeWindowToLengthClass(45),
      false
    );
    expect(large.length).toBeGreaterThanOrEqual(small.length);
  });
});
