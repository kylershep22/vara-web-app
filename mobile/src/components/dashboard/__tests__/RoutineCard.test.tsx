import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { RoutineCard } from '../RoutineCard';
import type { Routine } from '../../../services/firebase/routines.service';

function routine(id: string, name: string): Routine {
  return {
    id,
    name,
    activities: [{ id: 1, name: 'Breathe', duration: 5, icon: 'meditation', order: 0 }],
    active: true,
  } as unknown as Routine;
}

const baseProps = {
  onBeginRoutine: jest.fn(),
  onNavigateToRoutines: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('RoutineCard, empty state', () => {
  it('renders the warm spec line + single create affordance', () => {
    const { getByTestId, getByText } = render(
      <RoutineCard routines={[]} completions={{}} {...baseProps} />
    );
    expect(getByTestId('dashboard-routine-empty')).toBeTruthy();
    expect(getByText("When you set a routine, it'll show up here.")).toBeTruthy();
    fireEvent.press(getByTestId('dashboard-routine-create'));
    expect(baseProps.onNavigateToRoutines).toHaveBeenCalledTimes(1);
  });
});

describe('RoutineCard, CTA ladder', () => {
  const r1 = routine('r1', 'Morning');
  const r2 = routine('r2', 'Evening');

  it('none done → "Today\'s routine" title, focal routine body, Begin', () => {
    const { getByTestId, getByText } = render(
      <RoutineCard routines={[r1, r2]} completions={{}} {...baseProps} />
    );
    expect(getByText("Today's routine")).toBeTruthy();
    expect(getByText('Morning')).toBeTruthy(); // focal (first incomplete) routine name
    expect(getByText('5 min')).toBeTruthy();
    fireEvent.press(getByTestId('dashboard-routine-begin'));
    expect(baseProps.onBeginRoutine).toHaveBeenCalledWith(r1);
  });

  it('some done → surfaces and begins the first incomplete routine', () => {
    const { getByTestId } = render(
      <RoutineCard routines={[r1, r2]} completions={{ r1: true }} {...baseProps} />
    );
    fireEvent.press(getByTestId('dashboard-routine-begin'));
    expect(baseProps.onBeginRoutine).toHaveBeenCalledWith(r2);
  });

  it('all done → "All done for today." with no action and no meta line', () => {
    const { getByTestId, getByText, queryByTestId, queryByText, UNSAFE_root } = render(
      <RoutineCard
        routines={[r1, r2]}
        completions={{ r1: true, r2: true }}
        {...baseProps}
      />
    );
    expect(getByTestId('dashboard-routine')).toBeTruthy();
    expect(getByText('All done for today.')).toBeTruthy();
    // "Check habits" left with habits; nothing replaced it.
    expect(queryByTestId('dashboard-routine-check-habits')).toBeNull();
    expect(queryByTestId('dashboard-routine-begin')).toBeNull();
    expect(queryByText(/Check habits/)).toBeNull();
    expect(queryByText(/min$/)).toBeNull();
    // No pressable of any kind survives in this state.
    const pressables = UNSAFE_root.findAll(
      (n: { props?: Record<string, unknown> }) =>
        typeof n.props?.onPress === 'function' || n.props?.accessibilityRole === 'button'
    );
    expect(pressables).toHaveLength(0);
  });

  it('shows a single routine and no progress dot strip', () => {
    const { queryByTestId, getByText, queryByText } = render(
      <RoutineCard routines={[r1, r2]} completions={{ r1: true }} {...baseProps} />
    );
    // The multi-routine dot strip is gone (was the 3-vs-1 inconsistency source).
    expect(queryByTestId('dashboard-routine-progress')).toBeNull();
    // Only the focal (first incomplete) routine is surfaced.
    expect(getByText('Evening')).toBeTruthy();
    expect(queryByText('Morning')).toBeNull();
  });
});
