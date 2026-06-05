// Phase 2.8.1 — FAB visibility rule tests.
//
// Default behavior when no <Stack.Screen> declares options.showFAB: HIDDEN.
// Destinations explicitly opt in via options.showFAB = true.
// Guided/single-focus screens stay silent and inherit the safe default.
// Subflows inside a destination toggle via navigation.setOptions and revert
// on unmount — this catches a class of bugs where setOptions wouldn't
// propagate or revert correctly.

jest.mock('../../components/ai/AIAssistantFAB', () => {
  const ReactLib = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    AIAssistantFAB: () =>
      ReactLib.createElement(View, { testID: 'ai-fab' }),
  };
});

import React from 'react';
import { Text, View, Button } from 'react-native';
import {
  render,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react-native';
import {
  NavigationContainer,
  createNavigationContainerRef,
  useFocusEffect,
  useNavigation,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { FABHost } from '../FABHost';

function PlaceholderScreen({ label }: { label: string }) {
  return (
    <View>
      <Text>{label}</Text>
    </View>
  );
}

function renderNavTree(
  navTree: React.ReactNode,
  ref = createNavigationContainerRef<any>()
) {
  return {
    ref,
    ...render(
      <NavigationContainer ref={ref}>
        {navTree}
        <FABHost navigationRef={ref} />
      </NavigationContainer>
    ),
  };
}

describe('FABHost — visibility rule', () => {
  test('hides FAB when initial screen has no showFAB declaration (default HIDE)', async () => {
    const Stack = createNativeStackNavigator();
    const { queryByTestId } = renderNavTree(
      <Stack.Navigator>
        <Stack.Screen
          name="A"
        >
          {() => <PlaceholderScreen label="A" />}
        </Stack.Screen>
      </Stack.Navigator>
    );

    await waitFor(() => expect(queryByTestId('ai-fab')).toBeNull());
  });

  test('shows FAB when initial screen declares options.showFAB = true', async () => {
    const Stack = createNativeStackNavigator();
    const { findByTestId } = renderNavTree(
      <Stack.Navigator>
        <Stack.Screen
          name="A"
          options={{ showFAB: true } as any}
        >
          {() => <PlaceholderScreen label="A" />}
        </Stack.Screen>
      </Stack.Navigator>
    );

    await findByTestId('ai-fab');
  });

  test('hides FAB when initial screen explicitly declares options.showFAB = false', async () => {
    const Stack = createNativeStackNavigator();
    const { queryByTestId } = renderNavTree(
      <Stack.Navigator>
        <Stack.Screen
          name="A"
          options={{ showFAB: false } as any}
        >
          {() => <PlaceholderScreen label="A" />}
        </Stack.Screen>
      </Stack.Navigator>
    );

    await waitFor(() => expect(queryByTestId('ai-fab')).toBeNull());
  });

  test('toggles visibility when navigating from a destination to a guided-sequence screen', async () => {
    const Stack = createNativeStackNavigator();
    const ref = createNavigationContainerRef<any>();

    function NavTrigger() {
      const nav = useNavigation<any>();
      return (
        <Button
          testID="goto-B"
          title="Go B"
          onPress={() => nav.navigate('B')}
        />
      );
    }

    const { queryByTestId, findByTestId } = renderNavTree(
      <Stack.Navigator>
        <Stack.Screen
          name="A"
          component={NavTrigger}
          options={{ showFAB: true } as any}
        />
        <Stack.Screen name="B">
          {() => <PlaceholderScreen label="B" />}
        </Stack.Screen>
      </Stack.Navigator>,
      ref
    );

    await findByTestId('ai-fab');

    fireEvent.press(await findByTestId('goto-B'));

    await waitFor(() => expect(queryByTestId('ai-fab')).toBeNull());
  });

  test('reads leaf route options through a nested navigator', async () => {
    const RootStack = createNativeStackNavigator();
    const ChildStack = createNativeStackNavigator();

    function ChildNavigator() {
      return (
        <ChildStack.Navigator>
          <ChildStack.Screen
            name="ChildA"
            options={{ showFAB: true } as any}
          >
            {() => <PlaceholderScreen label="ChildA" />}
          </ChildStack.Screen>
        </ChildStack.Navigator>
      );
    }

    const { findByTestId } = renderNavTree(
      <RootStack.Navigator>
        <RootStack.Screen name="Parent" component={ChildNavigator} />
      </RootStack.Navigator>
    );

    await findByTestId('ai-fab');
  });

  test('hides FAB when leaf route in a nested stack has no showFAB declared', async () => {
    const RootStack = createNativeStackNavigator();
    const ChildStack = createNativeStackNavigator();

    function ChildNavigator() {
      return (
        <ChildStack.Navigator>
          <ChildStack.Screen name="ChildA">
            {() => <PlaceholderScreen label="ChildA" />}
          </ChildStack.Screen>
        </ChildStack.Navigator>
      );
    }

    const { queryByTestId } = renderNavTree(
      <RootStack.Navigator>
        <RootStack.Screen name="Parent" component={ChildNavigator} />
      </RootStack.Navigator>
    );

    await waitFor(() => expect(queryByTestId('ai-fab')).toBeNull());
  });

  // Subflow case (founder-mandated): Dashboard with showFAB:true (registration).
  // A subflow inside Dashboard activates and calls
  // navigation.setOptions({ showFAB: false }) via useFocusEffect.
  // When the subflow unmounts, the cleanup must run and FAB must return to visible.
  // This catches a bug class where setOptions wouldn't propagate or revert correctly.
  describe('subflow override via useFocusEffect + setOptions', () => {
    let setSubflowActive: ((active: boolean) => void) | null = null;

    function Subflow() {
      const navigation = useNavigation<any>();
      useFocusEffect(
        React.useCallback(() => {
          navigation.setOptions({ showFAB: false });
          return () => navigation.setOptions({ showFAB: true });
        }, [navigation])
      );
      return null;
    }

    function DashboardWithSubflow() {
      const [active, setActive] = React.useState(false);
      setSubflowActive = setActive;
      return (
        <View>
          <Text>Dashboard</Text>
          {active && <Subflow />}
        </View>
      );
    }

    beforeEach(() => {
      setSubflowActive = null;
    });

    test('Dashboard → FAB visible; subflow active → FAB hidden; subflow unmounts → FAB visible again', async () => {
      const Stack = createNativeStackNavigator();
      const { findByTestId, queryByTestId } = renderNavTree(
        <Stack.Navigator>
          <Stack.Screen
            name="Dashboard"
            component={DashboardWithSubflow}
            options={{ showFAB: true } as any}
          />
        </Stack.Navigator>
      );

      await findByTestId('ai-fab');

      await act(async () => {
        setSubflowActive?.(true);
      });

      await waitFor(() => expect(queryByTestId('ai-fab')).toBeNull());

      await act(async () => {
        setSubflowActive?.(false);
      });

      await findByTestId('ai-fab');
    });
  });
});
