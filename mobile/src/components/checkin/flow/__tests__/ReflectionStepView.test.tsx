import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { ReflectionStepView } from '../ReflectionStepView';
import { getProtocolById } from '../../../../constants/brainStateProtocols';
import type { Protocol } from '../../../../types/models';

function getProtocol(id: string): Protocol {
  const p = getProtocolById(id);
  if (!p) throw new Error(`fixture: ${id} missing`);
  return p;
}

const CYCLIC_SIGHING = getProtocol('cyclic-sighing-2');
const NSDR = getProtocol('nsdr-10'); // audio → rest category

describe('ReflectionStepView', () => {
  it('renders the down-regulate set (complete-answer labels) and the completion banner', () => {
    const { getByTestId, getByText } = render(
      <ReflectionStepView
        protocol={CYCLIC_SIGHING}
        pillar="energy"
        direction="settle"
        onSelect={jest.fn()}
      />
    );
    expect(getByTestId('checkin-flow-reflection-protocol-chip')).toBeTruthy();
    // Energy/settle, down-regulate labels — the middle is a complete answer.
    expect(getByText('Calmer')).toBeTruthy();
    expect(getByText('A little calmer')).toBeTruthy();
    expect(getByText('Still wound up')).toBeTruthy();
  });

  it('renders the energize set for an energize slot', () => {
    const { getByText } = render(
      <ReflectionStepView
        protocol={CYCLIC_SIGHING}
        pillar="energy"
        direction="energize"
        onSelect={jest.fn()}
      />
    );
    expect(getByText('More with it')).toBeTruthy();
    expect(getByText('A little more')).toBeTruthy();
    expect(getByText('Still flat')).toBeTruthy();
  });

  it('uses the rest labels for an audio (NSDR) settle practice, same ids', () => {
    const onSelect = jest.fn();
    const { getByText, getByTestId } = render(
      <ReflectionStepView
        protocol={NSDR}
        pillar="energy"
        direction="settle"
        onSelect={onSelect}
      />
    );
    expect(getByText('More rested')).toBeTruthy();
    expect(getByText('Still tense')).toBeTruthy();
    // Same stable id the classifier reads.
    fireEvent.press(getByTestId('checkin-flow-reflection-chip-calmer'));
    expect(onSelect).toHaveBeenCalledWith('calmer');
  });

  it('uses the settle-before-focus labels when the practice leads a focus session', () => {
    const { getByText } = render(
      <ReflectionStepView
        protocol={CYCLIC_SIGHING}
        pillar="energy"
        direction="settle"
        leadsToFocus
        onSelect={jest.fn()}
      />
    );
    expect(getByText('Clearer')).toBeTruthy();
    expect(getByText('A little clearer')).toBeTruthy();
    expect(getByText('Still scattered')).toBeTruthy();
  });

  it('fires onSelect with the chip id', () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(
      <ReflectionStepView
        protocol={CYCLIC_SIGHING}
        pillar="energy"
        direction="settle"
        onSelect={onSelect}
      />
    );
    fireEvent.press(getByTestId('checkin-flow-reflection-chip-calmer'));
    expect(onSelect).toHaveBeenCalledWith('calmer');
  });
});
