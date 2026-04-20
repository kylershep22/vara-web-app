import React from 'react';
import { render } from '@testing-library/react-native';
import { DashboardAnchorExpanded } from '../DashboardAnchorExpanded';

describe('DashboardAnchorExpanded', () => {
  it('renders the label for the given brain state', () => {
    const { getByText } = render(<DashboardAnchorExpanded brainState="foggy" />);
    expect(getByText('Foggy')).toBeTruthy();
  });

  it('renders the message for the given brain state', () => {
    const { getByText } = render(<DashboardAnchorExpanded brainState="clear" />);
    expect(
      getByText("You're in a great headspace. This is the day to lock in focus work and build on your habits.")
    ).toBeTruthy();
  });

  it('renders the icon by testID', () => {
    const { getByTestId } = render(<DashboardAnchorExpanded brainState="energized" />);
    expect(getByTestId('dashboard-anchor-expanded-icon')).toBeTruthy();
  });
});
