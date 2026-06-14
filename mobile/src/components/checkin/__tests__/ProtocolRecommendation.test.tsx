import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import {
  ProtocolRecommendation,
  recommendationLeadCopy,
} from '../ProtocolRecommendation';
import type {
  BrainState,
  Protocol,
  ProtocolTimeWindow,
} from '../../../types/models';

const sampleProtocol: Protocol = {
  id: 'cyclic-sighing-2',
  pillar: 'energy',
  regulationDirection: 'settle',
  family: 'cyclic-sighing',
  name: 'Cyclic Sighing',
  description:
    'Two short inhales through the nose, one long exhale through the mouth.',
  whatItIs: 'wi',
  whatYoullNeed: 'wyn',
  howItWorks: 'hiw',
  whenItFits: 'wif',
  firstTimeOrientation: {
    whatYoullDo: 'do',
    whatYoullNeed: 'need',
    whyItWorks: 'why',
  },
  evidenceTier: 1,
  durationSeconds: 120,
  timeWindow: 2,
  modality: 'breath',
  suitableForStates: ['wired'],
  suitableForTimesOfDay: [],
  steps: [
    {
      kind: 'breath',
      id: 'cycle',
      durationSeconds: 120,
      phases: [
        { kind: 'inhale', seconds: 1.5 },
        { kind: 'exhale', seconds: 5 },
      ],
    },
  ],
};

describe('recommendationLeadCopy', () => {
  it('Wired/Foggy → "Here\'s what fits your [State] state and [N] minutes:"', () => {
    expect(recommendationLeadCopy('wired', 2)).toBe(
      "Here's what fits your Wired state and 2 minutes:"
    );
    expect(recommendationLeadCopy('foggy', 10)).toBe(
      "Here's what fits your Foggy state and 10 minutes:"
    );
  });

  it('45-minute window renders as "45+" in the lead copy', () => {
    expect(recommendationLeadCopy('foggy', 45)).toBe(
      "Here's what fits your Foggy state and 45+ minutes:"
    );
  });

  it('Steady → optional-framed "if you\'d like" copy', () => {
    expect(recommendationLeadCopy('steady', 5)).toBe(
      "You're Steady. Here's a way to build from here, if you'd like:"
    );
  });

  it('Clear and Alive share the "good place" copy', () => {
    const expected =
      "You're in a good place. Here's a way to use it:";
    expect(recommendationLeadCopy('clear', 45)).toBe(expected);
    expect(recommendationLeadCopy('alive', 5)).toBe(expected);
  });
});

describe('ProtocolRecommendation', () => {
  const baseProps = {
    protocol: sampleProtocol,
    brainState: 'wired' as BrainState,
    timeWindow: 2 as ProtocolTimeWindow,
    onBegin: jest.fn(),
    onSeeOtherOptions: jest.fn(),
  };

  beforeEach(() => {
    baseProps.onBegin.mockClear();
    baseProps.onSeeOtherOptions.mockClear();
  });

  it('renders protocol name, duration label, evidence chip, and description', () => {
    const { getByTestId } = render(<ProtocolRecommendation {...baseProps} />);
    expect(getByTestId('protocol-recommendation-name').props.children).toBe(
      'Cyclic Sighing'
    );
    expect(
      getByTestId('protocol-recommendation-duration').props.children
    ).toBe('2 min');
    expect(
      getByTestId('protocol-recommendation-description').props.children
    ).toBe(sampleProtocol.description);
  });

  it('renders the state-aware lead copy', () => {
    const { getByTestId, rerender } = render(
      <ProtocolRecommendation {...baseProps} brainState="wired" timeWindow={5} />
    );
    expect(
      getByTestId('protocol-recommendation-lead').props.children
    ).toBe("Here's what fits your Wired state and 5 minutes:");

    rerender(
      <ProtocolRecommendation
        {...baseProps}
        brainState="steady"
        timeWindow={5}
      />
    );
    expect(
      getByTestId('protocol-recommendation-lead').props.children
    ).toBe(
      "You're Steady. Here's a way to build from here, if you'd like:"
    );

    rerender(
      <ProtocolRecommendation
        {...baseProps}
        brainState="clear"
        timeWindow={45}
      />
    );
    expect(
      getByTestId('protocol-recommendation-lead').props.children
    ).toBe("You're in a good place. Here's a way to use it:");
  });

  it('Begin button fires onBegin', () => {
    const { getByTestId } = render(<ProtocolRecommendation {...baseProps} />);
    fireEvent.press(getByTestId('protocol-recommendation-begin'));
    expect(baseProps.onBegin).toHaveBeenCalledTimes(1);
  });

  it('See other options button fires onSeeOtherOptions', () => {
    const { getByTestId } = render(<ProtocolRecommendation {...baseProps} />);
    fireEvent.press(getByTestId('protocol-recommendation-alternates'));
    expect(baseProps.onSeeOtherOptions).toHaveBeenCalledTimes(1);
  });

  it('Back/Close buttons render only when callbacks provided', () => {
    const { queryByTestId, rerender } = render(
      <ProtocolRecommendation {...baseProps} />
    );
    expect(queryByTestId('protocol-recommendation-back')).toBeNull();
    expect(queryByTestId('protocol-recommendation-close')).toBeNull();

    const onBack = jest.fn();
    const onClose = jest.fn();
    rerender(
      <ProtocolRecommendation
        {...baseProps}
        onBack={onBack}
        onClose={onClose}
      />
    );
    fireEvent.press(queryByTestId('protocol-recommendation-back')!);
    fireEvent.press(queryByTestId('protocol-recommendation-close')!);
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  describe('showSeeOtherOptions prop (Round 12 — Finding G fix)', () => {
    // The "See other options" affordance is the opt-in escape hatch
    // from the recommendation screen. It must render by default
    // (daily check-in path) and hide when explicitly disabled
    // (onboarding path — Practices index unreachable from the
    // onboarding stack).

    it('renders the "See other options" affordance by default', () => {
      const { queryByTestId } = render(
        <ProtocolRecommendation {...baseProps} />
      );
      expect(queryByTestId('protocol-recommendation-alternates')).not.toBeNull();
    });

    it('renders the affordance when showSeeOtherOptions is explicitly true', () => {
      const { queryByTestId } = render(
        <ProtocolRecommendation {...baseProps} showSeeOtherOptions />
      );
      expect(queryByTestId('protocol-recommendation-alternates')).not.toBeNull();
    });

    it('hides the affordance when showSeeOtherOptions is false', () => {
      const { queryByTestId } = render(
        <ProtocolRecommendation
          {...baseProps}
          showSeeOtherOptions={false}
        />
      );
      expect(queryByTestId('protocol-recommendation-alternates')).toBeNull();
    });

    it('does not invoke onSeeOtherOptions when the affordance is hidden', () => {
      // Defensive — without a render target there's nothing to tap,
      // but the prop still being passed shouldn't fire spuriously.
      render(
        <ProtocolRecommendation
          {...baseProps}
          showSeeOtherOptions={false}
        />
      );
      expect(baseProps.onSeeOtherOptions).not.toHaveBeenCalled();
    });
  });

  describe('gap-acknowledgment line (Layer 3)', () => {
    it('renders the line when protocol.timeWindow < timeWindowSelected', () => {
      // sampleProtocol.timeWindow = 2; user picked a 10-min budget.
      // Shorter-than-chosen → line should render.
      const { getByTestId } = render(
        <ProtocolRecommendation
          {...baseProps}
          timeWindow={10 as ProtocolTimeWindow}
        />
      );
      expect(getByTestId('protocol-recommendation-time-left').props.children).toBe(
        "You'll have time left in your window."
      );
    });

    it('does NOT render the line when durations match', () => {
      // sampleProtocol.timeWindow = 2; user picked a 2-min budget.
      // Exact match → line should be absent.
      const { queryByTestId } = render(
        <ProtocolRecommendation
          {...baseProps}
          timeWindow={2 as ProtocolTimeWindow}
        />
      );
      expect(queryByTestId('protocol-recommendation-time-left')).toBeNull();
    });
  });
});
