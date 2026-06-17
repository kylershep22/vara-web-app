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
  onNavigateToHabits: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('RoutineCard — empty state', () => {
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

describe('RoutineCard — CTA ladder', () => {
  const r1 = routine('r1', 'Morning');
  const r2 = routine('r2', 'Evening');

  it('none done → "Today\'s routine" title, focal routine body, Begin', () => {
    const { getByTestId, getByText } = render(
      <RoutineCard routines={[r1, r2]} completions={{}} {...baseProps} />
    );
    expect(getByText("Today's routine")).toBeTruthy();
    expect(getByText('Morning')).toBeTruthy(); // focal (first incomplete) routine name
    fireEvent.press(getByTestId('dashboard-routine-begin'));
    expect(baseProps.onBeginRoutine).toHaveBeenCalledWith(r1);
  });

  it('some done → Continue, begins the first incomplete', () => {
    const { getByTestId } = render(
      <RoutineCard routines={[r1, r2]} completions={{ r1: true }} {...baseProps} />
    );
    fireEvent.press(getByTestId('dashboard-routine-continue'));
    expect(baseProps.onBeginRoutine).toHaveBeenCalledWith(r2);
  });

  it('all done → Check habits', () => {
    const { getByTestId } = render(
      <RoutineCard
        routines={[r1, r2]}
        completions={{ r1: true, r2: true }}
        {...baseProps}
      />
    );
    fireEvent.press(getByTestId('dashboard-routine-check-habits'));
    expect(baseProps.onNavigateToHabits).toHaveBeenCalledTimes(1);
  });

  it('neutral progress shows one dot per routine', () => {
    const { getByTestId } = render(
      <RoutineCard routines={[r1, r2]} completions={{ r1: true }} {...baseProps} />
    );
    expect(getByTestId('dashboard-routine-progress').children.length).toBe(2);
  });
});
