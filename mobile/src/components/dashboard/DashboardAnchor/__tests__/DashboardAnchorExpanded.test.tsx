import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
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
    const { getByTestId } = render(<DashboardAnchorExpanded brainState="alive" />);
    expect(getByTestId('dashboard-anchor-expanded-icon')).toBeTruthy();
  });

  it('renders a Change affordance and calls onChangePress when tapped', () => {
    const onChangePress = jest.fn();
    const { getByText } = render(
      <DashboardAnchorExpanded brainState="foggy" onChangePress={onChangePress} />
    );
    fireEvent.press(getByText('Change'));
    expect(onChangePress).toHaveBeenCalledTimes(1);
  });

  it('omits the Change affordance when onChangePress is not provided', () => {
    const { queryByText } = render(<DashboardAnchorExpanded brainState="foggy" />);
    expect(queryByText('Change')).toBeNull();
  });
});
