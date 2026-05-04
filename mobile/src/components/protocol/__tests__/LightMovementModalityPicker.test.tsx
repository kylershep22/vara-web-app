// Sub-step 2.7 round 4 (Obs 10) — unit tests for the Light Movement
// pre-timer modality picker. Verifies the two-option layout, copy,
// and cancel/select callbacks. Integration coverage of the wrapper
// flow lives in LightMovementProtocolFlow.test.tsx.
//
// Round 3 update (Layers 2 + 3): the picker now renders the protocol
// name + duration above the title, and conditionally renders a
// gap-acknowledgment line when the recommender's protocol is shorter
// than the user's chosen time window. Tests below cover both states
// (matched window: line hidden; mismatch: line shown).

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { LightMovementModalityPicker } from '../LightMovementModalityPicker';
import { getProtocolById } from '../../../constants/brainStateProtocols';

const protocol = getProtocolById('brief-movement-10')!;
const shortProtocol = getProtocolById('brief-movement-5')!;

describe('LightMovementModalityPicker', () => {
  it('renders both Walk and Stretch options with their descriptive subtext', () => {
    const { getByTestId, getByText } = render(
      <LightMovementModalityPicker
        protocol={protocol}
        onSelect={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    expect(getByTestId('modality-picker-walk')).toBeTruthy();
    expect(getByTestId('modality-picker-stretch')).toBeTruthy();
    expect(
      getByText('If you have space or can step outside')
    ).toBeTruthy();
    expect(
      getByText("If you're at a desk or in a tight space")
    ).toBeTruthy();
  });

  it('renders the title "Pick what fits right now"', () => {
    const { getByTestId } = render(
      <LightMovementModalityPicker
        protocol={protocol}
        onSelect={jest.fn()}
        onCancel={jest.fn()}
      />
    );
    expect(getByTestId('modality-picker-title').props.children).toBe(
      'Pick what fits right now'
    );
  });

  it('renders the protocol name and duration above the title (Layer 2)', () => {
    const { getByTestId } = render(
      <LightMovementModalityPicker
        protocol={protocol}
        onSelect={jest.fn()}
        onCancel={jest.fn()}
      />
    );
    // Children are rendered as ['Light Movement', ' · ', '10 min'];
    // join and assert on the composed string.
    const meta = getByTestId('modality-picker-protocol-meta');
    expect(
      Array.isArray(meta.props.children)
        ? meta.props.children.join('')
        : meta.props.children
    ).toBe('Light Movement · 10 min');
  });

  it('renders a Cancel/X affordance', () => {
    const { getByTestId } = render(
      <LightMovementModalityPicker
        protocol={protocol}
        onSelect={jest.fn()}
        onCancel={jest.fn()}
      />
    );
    expect(getByTestId('modality-picker-cancel')).toBeTruthy();
  });

  it("fires onSelect('walk') when the Walk card is tapped", () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(
      <LightMovementModalityPicker
        protocol={protocol}
        onSelect={onSelect}
        onCancel={jest.fn()}
      />
    );
    fireEvent.press(getByTestId('modality-picker-walk'));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('walk');
  });

  it("fires onSelect('stretch') when the Stretch card is tapped", () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(
      <LightMovementModalityPicker
        protocol={protocol}
        onSelect={onSelect}
        onCancel={jest.fn()}
      />
    );
    fireEvent.press(getByTestId('modality-picker-stretch'));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('stretch');
  });

  it('fires onCancel when the X is tapped (no session is written — pre-protocol)', () => {
    const onCancel = jest.fn();
    const { getByTestId } = render(
      <LightMovementModalityPicker
        protocol={protocol}
        onSelect={jest.fn()}
        onCancel={onCancel}
      />
    );
    fireEvent.press(getByTestId('modality-picker-cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  describe('gap-acknowledgment line (Layer 3)', () => {
    it('renders the line when protocol.timeWindow < timeWindowSelected', () => {
      // brief-movement-5 (5 min) recommended for a 20-min budget.
      // Shorter-than-chosen → line should render.
      const { getByTestId } = render(
        <LightMovementModalityPicker
          protocol={shortProtocol}
          onSelect={jest.fn()}
          onCancel={jest.fn()}
          timeWindowSelected={20}
        />
      );
      expect(getByTestId('modality-picker-time-left').props.children).toBe(
        "You'll have time left in your window."
      );
    });

    it('does NOT render the line when durations match', () => {
      // brief-movement-10 (10 min) recommended for a 10-min budget.
      // Exact match → line should be absent.
      const { queryByTestId } = render(
        <LightMovementModalityPicker
          protocol={protocol}
          onSelect={jest.fn()}
          onCancel={jest.fn()}
          timeWindowSelected={10}
        />
      );
      expect(queryByTestId('modality-picker-time-left')).toBeNull();
    });

    it('does NOT render the line when timeWindowSelected is omitted (browse path)', () => {
      // BrowseRunFlow does not thread timeWindowSelected. The picker
      // silently omits the line so the user — who picked the protocol
      // from a list — is not handed redundant duration info.
      const { queryByTestId } = render(
        <LightMovementModalityPicker
          protocol={shortProtocol}
          onSelect={jest.fn()}
          onCancel={jest.fn()}
        />
      );
      expect(queryByTestId('modality-picker-time-left')).toBeNull();
    });
  });
});
