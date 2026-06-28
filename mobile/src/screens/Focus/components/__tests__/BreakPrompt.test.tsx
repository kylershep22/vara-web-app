// BreakPrompt — the focus completion surface (B-3c.1). Renders standalone
// (outside the timer ring) for session_complete / break_running / break_complete.

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { BreakPrompt } from '../BreakPrompt';
import { FocusCopy } from '../../../../constants/focusContent';

const noop = () => {};

describe('BreakPrompt', () => {
  describe('session_complete', () => {
    it('renders the completion copy and the three continuation actions', () => {
      const { getByText } = render(
        <BreakPrompt
          state="session_complete"
          onStartBreak={noop}
          onBeginAnother={noop}
          onDoneForNow={noop}
          breakDurationMinutes={5}
          onAdjustBreak={noop}
        />
      );
      expect(getByText(FocusCopy.sessionCompleteLine1)).toBeTruthy();
      expect(getByText(FocusCopy.sessionCompleteLine2)).toBeTruthy();
      expect(getByText(`${FocusCopy.breakCtaTakeBreak} (5m)`)).toBeTruthy();
      expect(getByText(FocusCopy.breakCtaStartAnother)).toBeTruthy();
      expect(getByText(FocusCopy.breakCtaDoneForNow)).toBeTruthy();
    });

    it('fires the action callbacks', () => {
      const onStartBreak = jest.fn();
      const onBeginAnother = jest.fn();
      const onDoneForNow = jest.fn();
      const { getByText } = render(
        <BreakPrompt
          state="session_complete"
          onStartBreak={onStartBreak}
          onBeginAnother={onBeginAnother}
          onDoneForNow={onDoneForNow}
          breakDurationMinutes={5}
          onAdjustBreak={noop}
        />
      );
      fireEvent.press(getByText(`${FocusCopy.breakCtaTakeBreak} (5m)`));
      fireEvent.press(getByText(FocusCopy.breakCtaStartAnother));
      fireEvent.press(getByText(FocusCopy.breakCtaDoneForNow));
      expect(onStartBreak).toHaveBeenCalledTimes(1);
      expect(onBeginAnother).toHaveBeenCalledTimes(1);
      expect(onDoneForNow).toHaveBeenCalledTimes(1);
    });

    it('the +/- steppers adjust the break duration', () => {
      const onAdjustBreak = jest.fn();
      const { getByLabelText } = render(
        <BreakPrompt
          state="session_complete"
          onStartBreak={noop}
          onBeginAnother={noop}
          onDoneForNow={noop}
          breakDurationMinutes={5}
          onAdjustBreak={onAdjustBreak}
        />
      );
      fireEvent.press(getByLabelText('Increase break duration'));
      fireEvent.press(getByLabelText('Decrease break duration'));
      expect(onAdjustBreak).toHaveBeenCalledWith(6);
      expect(onAdjustBreak).toHaveBeenCalledWith(4);
    });
  });

  describe('inline reflection (session_complete only)', () => {
    const chips = [
      { id: 'settled', label: 'Stayed with it' },
      { id: 'some', label: 'Drifted some' },
      { id: 'still_busy', label: 'Kept slipping' },
    ];

    it('renders the reflection chips on session_complete, above the actions', () => {
      const { getByText } = render(
        <BreakPrompt
          state="session_complete"
          onStartBreak={noop}
          onBeginAnother={noop}
          onDoneForNow={noop}
          breakDurationMinutes={5}
          onAdjustBreak={noop}
          reflectionChips={chips}
          selectedReflectionId={null}
          onSelectReflection={noop}
        />
      );
      expect(getByText('Stayed with it')).toBeTruthy();
      expect(getByText('Drifted some')).toBeTruthy();
      expect(getByText('Kept slipping')).toBeTruthy();
      // Actions remain on the same surface (reflection is skippable).
      expect(getByText(FocusCopy.breakCtaDoneForNow)).toBeTruthy();
    });

    it('selecting a chip fires onSelectReflection with the chip id', () => {
      const onSelectReflection = jest.fn();
      const { getByText } = render(
        <BreakPrompt
          state="session_complete"
          onStartBreak={noop}
          onBeginAnother={noop}
          onDoneForNow={noop}
          breakDurationMinutes={5}
          onAdjustBreak={noop}
          reflectionChips={chips}
          selectedReflectionId={null}
          onSelectReflection={onSelectReflection}
        />
      );
      fireEvent.press(getByText('Drifted some'));
      expect(onSelectReflection).toHaveBeenCalledWith('some');
    });

    it('marks the selected chip', () => {
      const { getByTestId } = render(
        <BreakPrompt
          state="session_complete"
          onStartBreak={noop}
          onBeginAnother={noop}
          onDoneForNow={noop}
          breakDurationMinutes={5}
          onAdjustBreak={noop}
          reflectionChips={chips}
          selectedReflectionId="settled"
          onSelectReflection={noop}
        />
      );
      expect(getByTestId('break-reflection-chip-settled').props.accessibilityState.selected).toBe(true);
      expect(getByTestId('break-reflection-chip-some').props.accessibilityState.selected).toBe(false);
    });

    it('does NOT render reflection chips on break_complete (reflection is per focus block)', () => {
      const { queryByText } = render(
        <BreakPrompt
          state="break_complete"
          onStartBreak={noop}
          onBeginAnother={noop}
          onDoneForNow={noop}
          reflectionChips={chips}
          selectedReflectionId={null}
          onSelectReflection={noop}
        />
      );
      expect(queryByText('Stayed with it')).toBeNull();
    });

    it('session_complete without chips renders no reflection block', () => {
      const { queryByText } = render(
        <BreakPrompt
          state="session_complete"
          onStartBreak={noop}
          onBeginAnother={noop}
          onDoneForNow={noop}
          breakDurationMinutes={5}
          onAdjustBreak={noop}
        />
      );
      expect(queryByText('Stayed with it')).toBeNull();
    });
  });

  describe('break_running', () => {
    it('renders the countdown', () => {
      const { getByText } = render(
        <BreakPrompt
          state="break_running"
          onStartBreak={noop}
          onBeginAnother={noop}
          onDoneForNow={noop}
          breakTimeRemaining="04:30"
        />
      );
      expect(getByText('04:30')).toBeTruthy();
      expect(getByText('Taking a break')).toBeTruthy();
    });
  });

  describe('break_complete', () => {
    it('renders the break-over copy and begin/done actions', () => {
      const onBeginAnother = jest.fn();
      const onDoneForNow = jest.fn();
      const { getByText } = render(
        <BreakPrompt
          state="break_complete"
          onStartBreak={noop}
          onBeginAnother={onBeginAnother}
          onDoneForNow={onDoneForNow}
        />
      );
      expect(getByText(FocusCopy.breakCompleteLine1)).toBeTruthy();
      expect(getByText(FocusCopy.breakCtaPrimary)).toBeTruthy();
      fireEvent.press(getByText(FocusCopy.breakCtaPrimary));
      fireEvent.press(getByText(FocusCopy.breakCtaTertiary));
      expect(onBeginAnother).toHaveBeenCalledTimes(1);
      expect(onDoneForNow).toHaveBeenCalledTimes(1);
    });
  });
});
