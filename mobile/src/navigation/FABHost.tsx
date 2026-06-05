// Phase 2.8.1 — Global FAB visibility host.
//
// Reads the focused leaf screen's `showFAB` option from the navigation
// container's current options and conditionally renders AIAssistantFAB.
//
// Default behavior when no <Stack.Screen> declares options.showFAB: HIDDEN.
// Destinations explicitly opt in via `<Stack.Screen options={{ showFAB: true }}>`.
// Guided/single-focus screens stay silent and inherit the safe default.
//
// Subflow override pattern (e.g., focused check-in inside Dashboard):
//
//   useFocusEffect(useCallback(() => {
//     navigation.setOptions({ showFAB: false });
//     return () => navigation.setOptions({ showFAB: true });
//   }, [navigation]));
//
// The 'options' listener on the container ref fires when setOptions runs,
// so FABHost re-reads and updates visibility immediately.

import React from 'react';
import type { NavigationContainerRef } from '@react-navigation/native';

import { AIAssistantFAB } from '../components/ai/AIAssistantFAB';
import './types';

export interface FABHostProps {
  /** Container ref used to read getCurrentOptions() and subscribe to changes. */
  navigationRef: NavigationContainerRef<any>;
  /** Context passed through to AIAssistantFAB (user habits, screen tag, etc.). */
  context?: {
    screen: string;
    userGoals?: any[];
    userHabits?: any[];
    [key: string]: any;
  };
}

export function FABHost({ navigationRef, context }: FABHostProps) {
  const [showFAB, setShowFAB] = React.useState(false);

  React.useEffect(() => {
    const read = () => {
      if (!navigationRef.isReady?.()) {
        setShowFAB(false);
        return;
      }
      const options = navigationRef.getCurrentOptions() as
        | { showFAB?: boolean }
        | undefined;
      setShowFAB(options?.showFAB === true);
    };

    // First read may need to wait until the container is ready.
    if (navigationRef.isReady?.()) {
      read();
    }

    const stateUnsub = navigationRef.addListener?.('state', read);
    const optionsUnsub = navigationRef.addListener?.('options', read);

    return () => {
      stateUnsub?.();
      optionsUnsub?.();
    };
  }, [navigationRef]);

  if (!showFAB) return null;
  return <AIAssistantFAB context={context ?? { screen: 'global' }} />;
}
