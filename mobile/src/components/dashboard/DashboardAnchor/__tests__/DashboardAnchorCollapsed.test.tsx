import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { DashboardAnchorCollapsed } from '../DashboardAnchorCollapsed';

describe('DashboardAnchorCollapsed', () => {
  it('renders the brain state label', () => {
    const { getByText } = render(
      <DashboardAnchorCollapsed
        brainState="foggy"
        protocolCompleted={false}
        onChangePress={jest.fn()}
        onAnchorPress={jest.fn()}
      />
    );
    expect(getByText('Foggy')).toBeTruthy();
  });

  it('shows "Protocol ready" when protocolCompleted is false', () => {
    const { getByText } = render(
      <DashboardAnchorCollapsed
        brainState="clear"
        protocolCompleted={false}
        onChangePress={jest.fn()}
        onAnchorPress={jest.fn()}
      />
    );
    expect(getByText('Protocol ready')).toBeTruthy();
  });

  it('shows "Protocol done" when protocolCompleted is true', () => {
    const { getByText } = render(
      <DashboardAnchorCollapsed
        brainState="clear"
        protocolCompleted={true}
        onChangePress={jest.fn()}
        onAnchorPress={jest.fn()}
      />
    );
    expect(getByText('Protocol done')).toBeTruthy();
  });

  it('calls onChangePress when the Change button is tapped', () => {
    const onChangePress = jest.fn();
    const { getByText } = render(
      <DashboardAnchorCollapsed
        brainState="wired"
        protocolCompleted={false}
        onChangePress={onChangePress}
        onAnchorPress={jest.fn()}
      />
    );
    fireEvent.press(getByText('Change'));
    expect(onChangePress).toHaveBeenCalledTimes(1);
  });

  it('calls onAnchorPress when the anchor body is tapped', () => {
    const onAnchorPress = jest.fn();
    const { getByTestId } = render(
      <DashboardAnchorCollapsed
        brainState="wired"
        protocolCompleted={false}
        onChangePress={jest.fn()}
        onAnchorPress={onAnchorPress}
      />
    );
    fireEvent.press(getByTestId('dashboard-anchor-collapsed-body'));
    expect(onAnchorPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onAnchorPress when the Change button is tapped', () => {
    const onAnchorPress = jest.fn();
    const onChangePress = jest.fn();
    const { getByText } = render(
      <DashboardAnchorCollapsed
        brainState="wired"
        protocolCompleted={false}
        onChangePress={onChangePress}
        onAnchorPress={onAnchorPress}
      />
    );
    fireEvent.press(getByText('Change'));
    expect(onAnchorPress).not.toHaveBeenCalled();
    expect(onChangePress).toHaveBeenCalledTimes(1);
  });
});
