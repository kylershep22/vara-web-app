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
});
