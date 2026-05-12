import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { RecoveryConfirmStepView } from '../RecoveryConfirmStepView';
import { getProtocolById } from '../../../../constants/brainStateProtocols';
import type { Protocol } from '../../../../types/models';

function getProtocol(id: string): Protocol {
  const p = getProtocolById(id);
  if (!p) throw new Error(`fixture: ${id} missing`);
  return p;
}

const CYCLIC_SIGHING = getProtocol('cyclic-sighing-2');

describe('RecoveryConfirmStepView — render', () => {
  it('renders the locked title verbatim', () => {
    const { getByTestId } = render(
      <RecoveryConfirmStepView
        protocol={CYCLIC_SIGHING}
        onConfirm={jest.fn()}
        onDecline={jest.fn()}
      />
    );
    expect(
      getByTestId('checkin-flow-recovery-confirm-title').props.children
    ).toBe('Picking up where you left off');
  });

  it('interpolates the protocol name into the body copy', () => {
    const { getByTestId } = render(
      <RecoveryConfirmStepView
        protocol={CYCLIC_SIGHING}
        onConfirm={jest.fn()}
        onDecline={jest.fn()}
      />
    );
    const body = getByTestId('checkin-flow-recovery-confirm-body').props
      .children;
    expect(body).toBe(
      `You finished ${CYCLIC_SIGHING.name} a few minutes ago. Want to record how you're feeling now?`
    );
  });

  it('renders the locked CTA labels verbatim', () => {
    const { getByTestId } = render(
      <RecoveryConfirmStepView
        protocol={CYCLIC_SIGHING}
        onConfirm={jest.fn()}
        onDecline={jest.fn()}
      />
    );
    expect(
      getByTestId('checkin-flow-recovery-confirm-primary').props
        .accessibilityLabel
    ).toBe('Yes, check in');
    expect(
      getByTestId('checkin-flow-recovery-confirm-secondary').props
        .accessibilityLabel
    ).toBe('Start fresh');
  });

  it('uses positive recovery framing — no negative crash language', () => {
    // Build Guide §3 support over surveillance: framing is "we caught
    // you, you don't have to redo", not "you crashed and lost data".
    // Catches a future "improvement" PR that adds clinical or
    // alarming language to either the title or body copy.
    const { getByTestId } = render(
      <RecoveryConfirmStepView
        protocol={CYCLIC_SIGHING}
        onConfirm={jest.fn()}
        onDecline={jest.fn()}
      />
    );
    const title = String(
      getByTestId('checkin-flow-recovery-confirm-title').props.children
    );
    const body = String(
      getByTestId('checkin-flow-recovery-confirm-body').props.children
    );
    const combined = `${title} ${body}`;
    expect(combined).not.toMatch(/crash/i);
    expect(combined).not.toMatch(/lost/i);
    expect(combined).not.toMatch(/error/i);
    expect(combined).not.toMatch(/fail/i);
    expect(combined).not.toMatch(/recover[ye]/i);
  });
});

describe('RecoveryConfirmStepView — taps', () => {
  it('primary CTA fires onConfirm exactly once, never onDecline', () => {
    const onConfirm = jest.fn();
    const onDecline = jest.fn();
    const { getByTestId } = render(
      <RecoveryConfirmStepView
        protocol={CYCLIC_SIGHING}
        onConfirm={onConfirm}
        onDecline={onDecline}
      />
    );
    fireEvent.press(getByTestId('checkin-flow-recovery-confirm-primary'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onDecline).not.toHaveBeenCalled();
  });

  it('secondary CTA fires onDecline exactly once, never onConfirm', () => {
    const onConfirm = jest.fn();
    const onDecline = jest.fn();
    const { getByTestId } = render(
      <RecoveryConfirmStepView
        protocol={CYCLIC_SIGHING}
        onConfirm={onConfirm}
        onDecline={onDecline}
      />
    );
    fireEvent.press(getByTestId('checkin-flow-recovery-confirm-secondary'));
    expect(onDecline).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
