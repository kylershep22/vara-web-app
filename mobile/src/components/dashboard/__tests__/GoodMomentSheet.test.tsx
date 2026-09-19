import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { PanResponder } from 'react-native';

jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: 'MaterialCommunityIcons',
}));

jest.mock('../../../hooks/useReducedMotion', () => ({
  useReducedMotion: jest.fn(() => false),
}));

import { GoodMomentSheet } from '../GoodMomentSheet';
import { GOOD_MOMENT_MAX_LENGTH } from '../goodMoments.copy';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import { Colors } from '../../../constants';

const flatten = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean));

/** A gesture as the PanResponder handlers receive it. */
type Gesture = { dy: number; dx?: number; vy?: number };

interface PanConfig {
  onMoveShouldSetPanResponder: (e: unknown, g: Gesture) => boolean;
  onPanResponderRelease: (e: unknown, g: Gesture) => void;
}

/** Capture the PanResponder config the sheet builds, to drive the swipe. */
function panConfig(): PanConfig {
  const spy = PanResponder.create as unknown as jest.Mock;
  return spy.mock.calls[spy.mock.calls.length - 1][0] as PanConfig;
}

const baseProps = {
  visible: true,
  status: 'idle' as const,
  onConfirm: jest.fn(),
  onDismiss: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  (useReducedMotion as jest.Mock).mockReturnValue(false);
  jest.spyOn(PanResponder, 'create');
});

describe('GoodMomentSheet — the prompt and the field', () => {
  it('asks Jen approved question and offers no placeholder', () => {
    const { getByTestId } = render(<GoodMomentSheet {...baseProps} />);

    expect(getByTestId('good-moment-sheet-prompt').props.children).toBe(
      'What was one good moment from today?'
    );
    // No placeholder, deliberately (Jen, 2026-09-12): the prompt is the whole
    // framing and a placeholder would either repeat it or lead the user.
    expect(getByTestId('good-moment-sheet-input').props.placeholder).toBeUndefined();
  });

  it('is single-line and capped at 200', () => {
    const { getByTestId } = render(<GoodMomentSheet {...baseProps} />);
    const input = getByTestId('good-moment-sheet-input');

    expect(input.props.maxLength).toBe(200);
    expect(GOOD_MOMENT_MAX_LENGTH).toBe(200);
    expect(input.props.multiline).toBe(false);
  });

  it('shows no counter, no warning and no limit copy', () => {
    const { getByTestId, queryByText } = render(<GoodMomentSheet {...baseProps} />);

    fireEvent.changeText(getByTestId('good-moment-sheet-input'), 'x'.repeat(200));

    expect(queryByText(/200/)).toBeNull();
    expect(queryByText(/characters?/i)).toBeNull();
    expect(queryByText(/limit/i)).toBeNull();
  });
});

describe('GoodMomentSheet — when Save is live', () => {
  const saveState = (el: { props: { accessibilityState?: { disabled?: boolean } } }) => ({
    disabled: el.props.accessibilityState?.disabled,
  });

  it('is disabled on open', () => {
    const { getByTestId } = render(<GoodMomentSheet {...baseProps} />);
    const save = getByTestId('good-moment-sheet-save');

    expect(saveState(save).disabled).toBe(true);
  });

  it('stays disabled when the field holds only whitespace', () => {
    const onConfirm = jest.fn();
    const { getByTestId } = render(
      <GoodMomentSheet {...baseProps} onConfirm={onConfirm} />
    );

    fireEvent.changeText(getByTestId('good-moment-sheet-input'), '    ');

    expect(saveState(getByTestId('good-moment-sheet-save')).disabled).toBe(true);
    // And the press genuinely does nothing, which a disabled prop alone would
    // not prove in this renderer.
    fireEvent.press(getByTestId('good-moment-sheet-save'));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('becomes enabled once there is real text, and confirms it trimmed', () => {
    const onConfirm = jest.fn();
    const { getByTestId } = render(
      <GoodMomentSheet {...baseProps} onConfirm={onConfirm} />
    );

    fireEvent.changeText(getByTestId('good-moment-sheet-input'), '  a quiet walk  ');

    expect(saveState(getByTestId('good-moment-sheet-save')).disabled).toBe(false);

    fireEvent.press(getByTestId('good-moment-sheet-save'));
    expect(onConfirm).toHaveBeenCalledWith('a quiet walk');
  });

  it('is disabled again the moment the text is deleted back to empty', () => {
    const onConfirm = jest.fn();
    const { getByTestId } = render(
      <GoodMomentSheet {...baseProps} onConfirm={onConfirm} />
    );
    const input = getByTestId('good-moment-sheet-input');

    fireEvent.changeText(input, 'something');
    expect(saveState(getByTestId('good-moment-sheet-save')).disabled).toBe(false);

    fireEvent.changeText(input, '');
    expect(saveState(getByTestId('good-moment-sheet-save')).disabled).toBe(true);

    fireEvent.press(getByTestId('good-moment-sheet-save'));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('announces the disabled state rather than silently refusing', () => {
    const { getByTestId } = render(<GoodMomentSheet {...baseProps} />);
    const save = getByTestId('good-moment-sheet-save');

    expect(save.props.accessibilityRole).toBe('button');
    expect(save.props.accessibilityState).toEqual({ disabled: true });
  });

  it('offers no disabled-reason copy, because the field is the reason', () => {
    const { queryByText } = render(<GoodMomentSheet {...baseProps} />);

    expect(queryByText(/write something/i)).toBeNull();
    expect(queryByText(/enter/i)).toBeNull();
    expect(queryByText(/required/i)).toBeNull();
  });

  it('refuses a second confirm while a save is in flight', () => {
    const onConfirm = jest.fn();
    const { getByTestId, rerender } = render(
      <GoodMomentSheet {...baseProps} onConfirm={onConfirm} />
    );

    fireEvent.changeText(getByTestId('good-moment-sheet-input'), 'once');
    rerender(
      <GoodMomentSheet {...baseProps} status="saving" onConfirm={onConfirm} />
    );

    fireEvent.press(getByTestId('good-moment-sheet-save'));
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

describe('GoodMomentSheet — success', () => {
  it('shows the approved acknowledgment inline', () => {
    const { getByTestId } = render(
      <GoodMomentSheet {...baseProps} status="saved" />
    );

    expect(getByTestId('good-moment-sheet-saved').props.children).toBe('Saved.');
  });

  it('paints it Teal, never bright green', () => {
    const { getByTestId } = render(
      <GoodMomentSheet {...baseProps} status="saved" />
    );
    const style = flatten(getByTestId('good-moment-sheet-saved').props.style);

    expect(style.color).toBe(Colors.evergreenTeal);
  });

  it('does not dismiss itself: the caller owns the hold and the close', () => {
    const onDismiss = jest.fn();
    render(<GoodMomentSheet {...baseProps} status="saved" onDismiss={onDismiss} />);

    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('holds the field while the acknowledgment is up', () => {
    const { getByTestId } = render(
      <GoodMomentSheet {...baseProps} status="saved" />
    );

    expect(getByTestId('good-moment-sheet-input').props.editable).toBe(false);
  });
});

describe('GoodMomentSheet — failure', () => {
  it('shows the approved failure line inline, in Coral', () => {
    const { getByTestId } = render(
      <GoodMomentSheet {...baseProps} status="failed" />
    );
    const error = getByTestId('good-moment-sheet-error');

    expect(error.props.children).toBe("Couldn't save that. Try again.");
    expect(flatten(error.props.style).color).toBe(Colors.softCoral);
  });

  it('keeps the sheet open and the user text intact', () => {
    const onDismiss = jest.fn();
    const { getByTestId, rerender } = render(
      <GoodMomentSheet {...baseProps} onDismiss={onDismiss} />
    );

    fireEvent.changeText(getByTestId('good-moment-sheet-input'), 'the good bit');
    rerender(<GoodMomentSheet {...baseProps} status="failed" onDismiss={onDismiss} />);

    expect(onDismiss).not.toHaveBeenCalled();
    expect(getByTestId('good-moment-sheet-input').props.value).toBe('the good bit');
  });

  it('lets the same text be retried in place', () => {
    const onConfirm = jest.fn();
    const { getByTestId, rerender } = render(
      <GoodMomentSheet {...baseProps} onConfirm={onConfirm} />
    );

    fireEvent.changeText(getByTestId('good-moment-sheet-input'), 'the good bit');
    rerender(
      <GoodMomentSheet {...baseProps} status="failed" onConfirm={onConfirm} />
    );

    expect(getByTestId('good-moment-sheet-input').props.editable).toBe(true);
    fireEvent.press(getByTestId('good-moment-sheet-save'));
    expect(onConfirm).toHaveBeenCalledWith('the good bit');
  });

  it('renders success and failure in one slot, never both', () => {
    const { queryByTestId, rerender } = render(
      <GoodMomentSheet {...baseProps} status="failed" />
    );
    expect(queryByTestId('good-moment-sheet-saved')).toBeNull();

    rerender(<GoodMomentSheet {...baseProps} status="saved" />);
    expect(queryByTestId('good-moment-sheet-error')).toBeNull();
  });
});

describe('GoodMomentSheet — all three dismissal routes discard', () => {
  it('dismisses on Cancel', () => {
    const onDismiss = jest.fn();
    const onConfirm = jest.fn();
    const { getByTestId } = render(
      <GoodMomentSheet {...baseProps} onDismiss={onDismiss} onConfirm={onConfirm} />
    );

    fireEvent.changeText(getByTestId('good-moment-sheet-input'), 'unsaved words');
    fireEvent.press(getByTestId('good-moment-sheet-cancel'));

    expect(onDismiss).toHaveBeenCalledTimes(1);
    // Discarded silently: no write requested, no confirm dialog.
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('dismisses on a tap outside', () => {
    const onDismiss = jest.fn();
    const { getByTestId } = render(
      <GoodMomentSheet {...baseProps} onDismiss={onDismiss} />
    );

    fireEvent.press(getByTestId('good-moment-sheet-overlay'));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('dismisses on a downward swipe past the threshold', () => {
    const onDismiss = jest.fn();
    render(<GoodMomentSheet {...baseProps} onDismiss={onDismiss} />);

    const cfg = panConfig();
    expect(cfg.onMoveShouldSetPanResponder({}, { dy: 20, dx: 0 })).toBe(true);
    cfg.onPanResponderRelease({}, { dy: 120, vy: 0.1 });

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('does not dismiss on a short drag', () => {
    const onDismiss = jest.fn();
    render(<GoodMomentSheet {...baseProps} onDismiss={onDismiss} />);

    panConfig().onPanResponderRelease({}, { dy: 10, vy: 0.1 });

    expect(onDismiss).toHaveBeenCalledTimes(0);
  });

  it('offers no discard-changes confirmation anywhere', () => {
    const { getByTestId, queryByText } = render(<GoodMomentSheet {...baseProps} />);

    fireEvent.changeText(getByTestId('good-moment-sheet-input'), 'unsaved words');

    expect(queryByText(/discard/i)).toBeNull();
    expect(queryByText(/are you sure/i)).toBeNull();
    expect(queryByText(/unsaved/i)).toBeNull();
  });

  it('starts empty on every opening', () => {
    const { getByTestId, rerender } = render(<GoodMomentSheet {...baseProps} />);

    fireEvent.changeText(getByTestId('good-moment-sheet-input'), 'yesterday');
    rerender(<GoodMomentSheet {...baseProps} visible={false} />);
    rerender(<GoodMomentSheet {...baseProps} visible />);

    expect(getByTestId('good-moment-sheet-input').props.value).toBe('');
  });
});

describe('GoodMomentSheet — Reduce Motion', () => {
  it('slides normally when Reduce Motion is off', () => {
    const { getByTestId } = render(<GoodMomentSheet {...baseProps} />);
    expect(getByTestId('good-moment-sheet').props.animationType).toBe('slide');
  });

  it('fades instead of travelling when Reduce Motion is on', () => {
    (useReducedMotion as jest.Mock).mockReturnValue(true);
    const { getByTestId } = render(<GoodMomentSheet {...baseProps} />);
    expect(getByTestId('good-moment-sheet').props.animationType).toBe('fade');
  });

  it('still dismisses on swipe under Reduce Motion, it just does not track', () => {
    (useReducedMotion as jest.Mock).mockReturnValue(true);
    const onDismiss = jest.fn();
    render(<GoodMomentSheet {...baseProps} onDismiss={onDismiss} />);

    panConfig().onPanResponderRelease({}, { dy: 120, vy: 0.1 });

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

describe('GoodMomentSheet — the 10.5 bottom-sheet shape', () => {
  it('uses the 30 percent scrim, not the 50 percent modal one', () => {
    const { getByTestId } = render(<GoodMomentSheet {...baseProps} />);
    const style = flatten(getByTestId('good-moment-sheet-overlay').props.style);

    expect(style.backgroundColor).toBe(Colors.overlayLight);
    expect(style.backgroundColor).not.toBe(Colors.overlay);
  });
});
