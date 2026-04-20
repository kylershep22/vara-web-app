import React from 'react';
import { render } from '@testing-library/react-native';
import { DashboardAnchorExpanded } from '../DashboardAnchorExpanded';
import { getBrainStateBrief } from '../brainStateBriefs';

describe('DashboardAnchorExpanded', () => {
  it('renders the label for the given brain state', () => {
    const { getByText } = render(<DashboardAnchorExpanded brainState="foggy" />);
    expect(getByText('Foggy')).toBeTruthy();
  });

  it('renders the message for the given brain state', () => {
    const clearBrief = getBrainStateBrief('clear');
    const { getByText } = render(<DashboardAnchorExpanded brainState="clear" />);
    expect(getByText(clearBrief.message)).toBeTruthy();
  });

  it('renders the icon by testID', () => {
    const { getByTestId } = render(<DashboardAnchorExpanded brainState="energized" />);
    expect(getByTestId('dashboard-anchor-expanded-icon')).toBeTruthy();
  });
});
