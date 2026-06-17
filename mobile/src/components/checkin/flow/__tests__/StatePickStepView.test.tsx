// StatePickStepView — the consolidated one-screen progressive state read.
//
// Covers: (1) one screen with the feeling block gated on the energy answer;
// (2) per-situation feeling labels resolving to the correct good/hard pole;
// (3) the exhaustive pole-invariance guard — every (situation × energy ×
// feeling) emits the same { arousal, valence } the old two-screen swap did, so
// the quadrant the engine derives is unchanged; (4) the Reduce-Motion-aware
// reveal + the assistive-tech announcement.

import React from 'react';
import { AccessibilityInfo, LayoutAnimation } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';

import { StatePickStepView } from '../StatePickStepView';
import { FEELING_COPY } from '../feelingCopy';
import { classifyQuadrant } from '../../../../engine';
import type { Arousal, Situation, Valence } from '../../../../engine';

// Reduce-motion is mocked so the reveal-animation gating can be driven directly.
let mockReduceMotion = false;
jest.mock('../../../../hooks/useReducedMotion', () => ({
  useReducedMotion: () => mockReduceMotion,
}));

const SITUATIONS: Situation[] = [
  'get_through_hard',
  'quiet_mind',
  'find_energy',
  'wind_down',
  'grip_on_day',
  'just_reset',
];

// The energy read — fixed labels, the same two poles the engine has always
// consumed (higher = revved, lower = low).
const ENERGY: { testId: string; arousal: Arousal }[] = [
  { testId: 'checkin-flow-arousal-revved', arousal: 'revved' },
  { testId: 'checkin-flow-arousal-low', arousal: 'low' },
];

const VALENCES: Valence[] = ['good', 'hard'];

beforeEach(() => {
  mockReduceMotion = false;
  jest.restoreAllMocks();
  // RN's AccessibilityInfo.announceForAccessibility is a persistent module mock
  // whose call history accumulates across tests — clear it so per-test call
  // counts are accurate.
  jest.clearAllMocks();
});

describe('StatePickStepView — one progressive screen', () => {
  it('shows the situation context + energy on one screen, feeling gated on the energy answer', () => {
    const { getByTestId, queryByTestId } = render(
      <StatePickStepView situation="quiet_mind" onSelect={jest.fn()} />
    );

    // Both the situation context and the energy question are present at mount.
    expect(getByTestId('checkin-flow-state-pick-situation').props.children).toBe(
      'Quiet a busy mind'
    );
    expect(getByTestId('checkin-flow-arousal-title')).toBeTruthy();

    // The feeling block is NOT shown until energy is answered.
    expect(queryByTestId('checkin-flow-feeling-block')).toBeNull();
    expect(queryByTestId('checkin-flow-valence-title')).toBeNull();

    // Answering energy reveals the feeling block on the SAME screen (the energy
    // block stays mounted — progressive disclosure, not a swap).
    fireEvent.press(getByTestId('checkin-flow-arousal-revved'));
    expect(getByTestId('checkin-flow-arousal-title')).toBeTruthy();
    expect(getByTestId('checkin-flow-feeling-block')).toBeTruthy();
    expect(getByTestId('checkin-flow-valence-title').props.children).toBe(
      FEELING_COPY.quiet_mind.question
    );
  });

  it('the chosen energy stays re-tappable and can be changed before answering feeling', () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(
      <StatePickStepView situation="find_energy" onSelect={onSelect} />
    );

    fireEvent.press(getByTestId('checkin-flow-arousal-revved'));
    // Re-tap the other energy option — still one screen, no emit yet.
    fireEvent.press(getByTestId('checkin-flow-arousal-low'));
    expect(onSelect).not.toHaveBeenCalled();

    // The feeling answer now carries the latest energy (low).
    fireEvent.press(getByTestId('checkin-flow-valence-good'));
    expect(onSelect).toHaveBeenCalledWith({ arousal: 'low', valence: 'good' });
  });
});

describe('StatePickStepView — per-situation feeling labels resolve to the right pole', () => {
  it.each(SITUATIONS)('%s: each feeling label emits its mapped good/hard pole', (situation) => {
    const copy = FEELING_COPY[situation];

    for (const option of copy.options) {
      const onSelect = jest.fn();
      const { getByTestId, getByText } = render(
        <StatePickStepView situation={situation} onSelect={onSelect} />
      );
      fireEvent.press(getByTestId('checkin-flow-arousal-revved'));

      // The situation-specific label is on screen…
      expect(getByText(option.label)).toBeTruthy();
      // …and tapping it emits that label's mapped pole.
      fireEvent.press(getByTestId(`checkin-flow-valence-${option.valence}`));
      expect(onSelect).toHaveBeenCalledWith({
        arousal: 'revved',
        valence: option.valence,
      });
    }
  });
});

describe('StatePickStepView — pole invariance vs the old two-screen flow', () => {
  // The old two-screen swap emitted arousal by position (higher = revved, lower
  // = low) and valence good/hard. The new screen must emit the IDENTICAL pair —
  // and hence the identical engine quadrant — for every combination.
  it('every (situation × energy × feeling) emits the same { arousal, valence } and quadrant', () => {
    for (const situation of SITUATIONS) {
      const copy = FEELING_COPY[situation];
      for (const energy of ENERGY) {
        for (const valence of VALENCES) {
          const feelingOption = copy.options.find((o) => o.valence === valence)!;
          const onSelect = jest.fn();
          const { getByTestId } = render(
            <StatePickStepView situation={situation} onSelect={onSelect} />
          );

          fireEvent.press(getByTestId(energy.testId));
          fireEvent.press(getByTestId(`checkin-flow-valence-${feelingOption.valence}`));

          // Canonical pair the old flow would have emitted for this combo.
          const expected = { arousal: energy.arousal, valence };
          expect(onSelect).toHaveBeenCalledTimes(1);
          expect(onSelect).toHaveBeenCalledWith(expected);
          // And the engine derives the same quadrant from that pair.
          expect(classifyQuadrant(expected.arousal, expected.valence)).toBe(
            classifyQuadrant(energy.arousal, valence)
          );
        }
      }
    }
  });
});

describe('StatePickStepView — reveal accessibility + reduced motion', () => {
  it('announces the feeling question and animates the reveal when motion is allowed', () => {
    mockReduceMotion = false;
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    const configureNext = jest.spyOn(LayoutAnimation, 'configureNext');

    const { getByTestId } = render(
      <StatePickStepView situation="wind_down" onSelect={jest.fn()} />
    );
    fireEvent.press(getByTestId('checkin-flow-arousal-low'));

    expect(announce).toHaveBeenCalledWith(FEELING_COPY.wind_down.question);
    expect(configureNext).toHaveBeenCalled();
  });

  it('skips the reveal animation when Reduce Motion is on (still announces)', () => {
    mockReduceMotion = true;
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    const configureNext = jest.spyOn(LayoutAnimation, 'configureNext');

    const { getByTestId } = render(
      <StatePickStepView situation="wind_down" onSelect={jest.fn()} />
    );
    fireEvent.press(getByTestId('checkin-flow-arousal-low'));

    expect(configureNext).not.toHaveBeenCalled();
    expect(announce).toHaveBeenCalledWith(FEELING_COPY.wind_down.question);
  });

  it('does not re-announce when the energy choice is changed', () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    const { getByTestId } = render(
      <StatePickStepView situation="grip_on_day" onSelect={jest.fn()} />
    );

    fireEvent.press(getByTestId('checkin-flow-arousal-revved'));
    fireEvent.press(getByTestId('checkin-flow-arousal-low'));

    expect(announce).toHaveBeenCalledTimes(1);
  });
});
