import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { resolve } from '../../../../engine';
import type { Arousal, Situation, Valence } from '../../../../engine';
import { PlanRecommendation } from '../PlanRecommendation';

const NOON = { hour: 12 };

function planFor(
  situation: Situation,
  arousal: Arousal,
  valence: Valence,
  timeBudget = 45
) {
  return resolve({
    situation,
    state: { arousal, valence },
    clockTime: NOON,
    timeBudget,
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

  it('focus-session branch renders the ring/hero with the budget-derived duration', () => {
    const { getByTestId } = render(
      <PlanRecommendation
        plan={planFor('get_through_hard', 'revved', 'good', 45)} // focus pointer @45
        reason="Because you've got energy, straight into focus."
        onPrimary={noop}
        onSeeOtherOptions={noop}
      />
    );
    expect(getByTestId('checkin-flow-plan-timed')).toBeTruthy();
    expect(getByTestId('checkin-flow-plan-duration').props.children).toBe('45 min');
  });

  it('short-practice branch renders the ring/hero from the resolved practice', () => {
    // A non-pointer short-budget cell: find_energy/Depleted @2min resolves to a
    // brief-movement practice clamped to the 2-min budget. (Pointer cells no
    // longer degrade to a short practice — they preserve the pointer.)
    const { getByTestId } = render(
      <PlanRecommendation
        plan={planFor('find_energy', 'low', 'hard', 2)}
        reason="Because you're running low, a couple minutes of movement."
        onPrimary={noop}
        onSeeOtherOptions={noop}
      />
    );
    expect(getByTestId('checkin-flow-plan-timed')).toBeTruthy();
    expect(getByTestId('checkin-flow-plan-duration').props.children).toBe('2 min');
    expect(getByTestId('checkin-flow-plan-primary').props.accessibilityLabel).toBe('Begin');
  });

  it('offered pre-roll shape: focus session is the hero with the optional pre-roll above the CTA', () => {
    const onPrimary = jest.fn();
    const onSecondary = jest.fn();
    const { getByTestId } = render(
      <PlanRecommendation
        plan={planFor('get_through_hard', 'low', 'good', 25)} // grounding [offer] → focus
        reason="Because you're steady, straight into focus when you're ready."
        onPrimary={onPrimary}
        onSecondary={onSecondary}
        onSeeOtherOptions={noop}
      />
    );
    // Focus session is the hero: new ring/hero with the budget-derived duration.
    expect(getByTestId('checkin-flow-plan-timed')).toBeTruthy();
    expect(getByTestId('checkin-flow-plan-duration').props.children).toBe('25 min');
    // Primary routes straight to the focus session.
    expect(getByTestId('checkin-flow-plan-primary').props.accessibilityLabel).toBe(
      'Start focus session'
    );
    // The optional pre-roll runs practice → focus via the existing routing.
    fireEvent.press(getByTestId('checkin-flow-plan-secondary'));
    expect(onSecondary).toHaveBeenCalledTimes(1);
    fireEvent.press(getByTestId('checkin-flow-plan-primary'));
    expect(onPrimary).toHaveBeenCalledTimes(1);
  });

  it('zero-slot: renders the affirmation, no reason, primary "Done", no reset', () => {
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
    // No-offer variant: no reset button.
    expect(queryByTestId('checkin-flow-plan-secondary')).toBeNull();
  });

  it('offered-reset: one affirmation hero with three weighted choices, no duplicate line', () => {
    const { getByTestId, getByText, queryByTestId } = render(
      <PlanRecommendation
        plan={planFor('quiet_mind', 'low', 'good', 45)} // message_offered (Calm)
        reason="ignored for the affirmation shape"
        onPrimary={noop}
        onSecondary={noop}
        onSeeOtherOptions={noop}
      />
    );
    expect(getByTestId('checkin-flow-plan-affirmation')).toBeTruthy();
    expect(getByText("You're already there.")).toBeTruthy();
    expect(getByText('Nothing needed unless you want it.')).toBeTruthy();
    // The redundant reason subhead is gone.
    expect(queryByTestId('checkin-flow-plan-reason')).toBeNull();
    // Three weighted choices: primary / outline secondary / tertiary link.
    expect(getByTestId('checkin-flow-plan-primary').props.accessibilityLabel).toBe("I'm good");
    expect(getByTestId('checkin-flow-plan-secondary').props.accessibilityLabel).toBe(
      'Take a short reset'
    );
    expect(getByTestId('checkin-flow-plan-see-other-options')).toBeTruthy();
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
