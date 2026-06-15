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

describe('ReflectionStepView', () => {
  it('renders the (pillar, direction) chip set and the completed-practice chip', () => {
    const { getByTestId, getByText } = render(
      <ReflectionStepView
        protocol={CYCLIC_SIGHING}
        pillar="energy"
        direction="settle"
        onSelect={jest.fn()}
      />
    );
    expect(getByTestId('checkin-flow-reflection-protocol-chip')).toBeTruthy();
    // Energy/settle set.
    expect(getByText('Calmer')).toBeTruthy();
    expect(getByText('A little')).toBeTruthy();
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
    expect(getByText('Still flat')).toBeTruthy();
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
