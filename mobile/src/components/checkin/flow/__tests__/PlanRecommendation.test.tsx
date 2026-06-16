import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { resolve } from '../../../../engine';
import type { Arousal, Situation, Valence } from '../../../../engine';
import { PlanRecommendation } from '../PlanRecommendation';

const NOON = { hour: 12 };

function planFor(situation: Situation, arousal: Arousal, valence: Valence) {
  return resolve({
    situation,
    state: { arousal, valence },
    clockTime: NOON,
    timeBudget: 45,
  });
}

const noop = () => {};

describe('PlanRecommendation', () => {
  it('renders the reason subhead on a non-zero shape', () => {
    const { getByTestId } = render(
      <PlanRecommendation
        plan={planFor('quiet_mind', 'revved', 'hard')}
        reason="Because you're wound up, a short reset."
        onPrimary={noop}
        onSeeOtherOptions={noop}
      />
    );
    expect(getByTestId('checkin-flow-plan-reason').props.children).toBe(
      "Because you're wound up, a short reset."
    );
  });

  it('single practice: renders the practice card + a single Begin', () => {
    const { getByTestId } = render(
      <PlanRecommendation
        plan={planFor('quiet_mind', 'revved', 'hard')}
        reason="x"
        onPrimary={noop}
        onSeeOtherOptions={noop}
      />
    );
    expect(getByTestId('checkin-flow-plan-primary').props.accessibilityLabel).toBe('Begin');
  });

  it('plan pointer: button reads "Open your routines", no "ready when you are" placeholder', () => {
    const { getByTestId, queryByText } = render(
      <PlanRecommendation
        plan={planFor('grip_on_day', 'revved', 'good')} // single plan pointer
        reason="Because you've got energy, line up your routines."
        onPrimary={noop}
        onSeeOtherOptions={noop}
      />
    );
    expect(getByTestId('checkin-flow-plan-primary').props.accessibilityLabel).toBe(
      'Open your routines'
    );
    expect(queryByText(/ready when you are/i)).toBeNull();
  });

  it('focus-session pointer: button still reads "Start focus session"', () => {
    const { getByTestId } = render(
      <PlanRecommendation
        plan={planFor('get_through_hard', 'revved', 'good')} // single focus pointer
        reason="Because you've got energy, straight into focus."
        onPrimary={noop}
        onSeeOtherOptions={noop}
      />
    );
    expect(getByTestId('checkin-flow-plan-primary').props.accessibilityLabel).toBe(
      'Start focus session'
    );
  });

  it('zero-slot: renders the acknowledgment message, no reason, primary "Done"', () => {
    const { getByTestId, queryByTestId } = render(
      <PlanRecommendation
        plan={planFor('find_energy', 'revved', 'good')} // zero-slot
        reason={null}
        onPrimary={noop}
        onSeeOtherOptions={noop}
      />
    );
    expect(queryByTestId('checkin-flow-plan-reason')).toBeNull();
    expect(getByTestId('checkin-flow-plan-zero')).toBeTruthy();
    expect(getByTestId('checkin-flow-plan-primary').props.accessibilityLabel).toBe('Done');
  });

  it('primary CTA fires onPrimary', () => {
    const onPrimary = jest.fn();
    const { getByTestId } = render(
      <PlanRecommendation
        plan={planFor('quiet_mind', 'revved', 'hard')}
        reason="x"
        onPrimary={onPrimary}
        onSeeOtherOptions={noop}
      />
    );
    fireEvent.press(getByTestId('checkin-flow-plan-primary'));
    expect(onPrimary).toHaveBeenCalledTimes(1);
  });
});
