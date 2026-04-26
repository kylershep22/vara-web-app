// Render tests for ShiftedResponse — one cell per outcome family.
//
// Auto-dismiss + onChoose dispatch is already covered by the
// CheckInFlow integration tests (CheckInFlow.test.tsx). These tests
// verify the (table → component → DOM) contract specifically — that
// the right copy reaches the rendered title and body for each
// outcome family.

import React from 'react';
import { render } from '@testing-library/react-native';

import { ShiftedResponse } from '../ShiftedResponse';

describe('ShiftedResponse — renders correct copy per outcome family', () => {
  it('renders shifted copy (wired → steady) with duration interpolation', () => {
    const { getByTestId } = render(
      <ShiftedResponse
        stateBefore="wired"
        stateAfter="steady"
        durationActualSeconds={300}
        onChoose={jest.fn()}
      />
    );
    expect(getByTestId('shifted-response-title').props.children).toBe(
      'You settled.'
    );
    // 300s ÷ 60 = 5 minutes; the body's template should pick that up.
    expect(getByTestId('shifted-response-body').props.children).toBe(
      "Wired to Steady in 5 minutes. That's your system returning to baseline."
    );
  });

  it('renders partial_shift copy (wired → foggy)', () => {
    const { getByTestId } = render(
      <ShiftedResponse
        stateBefore="wired"
        stateAfter="foggy"
        durationActualSeconds={120}
        onChoose={jest.fn()}
      />
    );
    expect(getByTestId('shifted-response-title').props.children).toBe(
      'Some of the edge came off.'
    );
    expect(getByTestId('shifted-response-body').props.children).toMatch(
      /Wired down to Foggy/
    );
  });

  it('renders maintenance copy (steady → steady) without duration noise', () => {
    const { getByTestId } = render(
      <ShiftedResponse
        stateBefore="steady"
        stateAfter="steady"
        durationActualSeconds={600}
        onChoose={jest.fn()}
      />
    );
    expect(getByTestId('shifted-response-title').props.children).toBe(
      'Held steady.'
    );
    // The maintenance copy doesn't reference duration — verify the
    // body string doesn't contain "10 minutes" or any minute count.
    const bodyText = getByTestId('shifted-response-body').props
      .children as string;
    expect(bodyText).not.toMatch(/\d+ minutes?/);
    expect(bodyText).toBe(
      'Sometimes the practice is about not losing ground. You did that.'
    );
  });

  it('rounds durationActualSeconds up to at least 1 minute (no "0 minutes" copy)', () => {
    // A 30-second session would otherwise round to "0 minutes" via
    // Math.round, which reads worse than "1 minute" in the body.
    const { getByTestId } = render(
      <ShiftedResponse
        stateBefore="wired"
        stateAfter="steady"
        durationActualSeconds={30}
        onChoose={jest.fn()}
      />
    );
    expect(getByTestId('shifted-response-body').props.children).toBe(
      "Wired to Steady in 1 minute. That's your system returning to baseline."
    );
  });
});
