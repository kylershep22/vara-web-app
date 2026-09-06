/**
 * The Remove capture flow as ONE registered screen (slices 3c-i and 3c-ii).
 *
 * A nested stack rather than six AppStack registrations, for two reasons:
 * the provider has to sit above every screen in the flow so the in-flight
 * answers survive navigation, and the six route names stay namespaced inside
 * their own navigator where they cannot collide with the app-wide registry.
 *
 * NO HEADER AND NO GESTURE-DISMISS ON THE SUPPORT SCREEN. Backing out of the
 * support screen by swipe would land the user back on the text they typed,
 * which is the one place this flow must never return them to.
 *
 * NO GESTURE-DISMISS ON THE REPLACEMENT SCREEN EITHER, for a different reason:
 * the capture is already written by the time it mounts, so swiping back lands
 * on a first-move screen whose work is done. Its primary handles that case by
 * navigating forward rather than re-writing, and closing the gesture keeps the
 * common path from reaching it at all.
 */
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { REMOVE_CAPTURE_ROUTES } from './routes';
import { RemoveCaptureProvider } from './RemoveCaptureContext';
import { IdentifyScreen } from './IdentifyScreen';
import { ClarifyScreen } from './ClarifyScreen';
import { SleepScreen } from './SleepScreen';
import { TimingScreen } from './TimingScreen';
import { FirstMoveScreen } from './FirstMoveScreen';
import { ReplacementScreen } from './ReplacementScreen';
import { SupportScreen } from './SupportScreen';

const Stack = createNativeStackNavigator();

export const RemoveCaptureNavigator: React.FC = () => (
  <RemoveCaptureProvider>
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={REMOVE_CAPTURE_ROUTES.Identify} component={IdentifyScreen} />
      <Stack.Screen name={REMOVE_CAPTURE_ROUTES.Clarify} component={ClarifyScreen} />
      <Stack.Screen name={REMOVE_CAPTURE_ROUTES.Sleep} component={SleepScreen} />
      <Stack.Screen name={REMOVE_CAPTURE_ROUTES.Timing} component={TimingScreen} />
      <Stack.Screen name={REMOVE_CAPTURE_ROUTES.FirstMove} component={FirstMoveScreen} />
      <Stack.Screen
        name={REMOVE_CAPTURE_ROUTES.Replacement}
        component={ReplacementScreen}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen
        name={REMOVE_CAPTURE_ROUTES.Support}
        component={SupportScreen}
        options={{ gestureEnabled: false }}
      />
    </Stack.Navigator>
  </RemoveCaptureProvider>
);
