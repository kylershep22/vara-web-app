import React from 'react';
import { BrainState } from '../../../types';
import { DashboardAnchorExpanded } from './DashboardAnchorExpanded';

interface DashboardAnchorProps {
  brainState: BrainState;
  onChangeStatePress: () => void;
}

/**
 * DashboardAnchor
 * The brain-state card shown at the top of the dashboard after check-in.
 *
 * Renders inline (it scrolls away with the rest of the page). The earlier
 * scroll-driven "sticky" collapsed strip was removed — it duplicated this
 * card's information and had a content bleed-through bug (calm-over-
 * stimulation: no persistent floating UI when the same information is
 * already on the page). The re-check entry point now lives on this card
 * via the "Change" affordance.
 */
export const DashboardAnchor: React.FC<DashboardAnchorProps> = ({
  brainState,
  onChangeStatePress,
}) => {
  return (
    <DashboardAnchorExpanded
      brainState={brainState}
      onChangePress={onChangeStatePress}
    />
  );
};
