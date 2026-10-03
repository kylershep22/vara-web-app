/**
 * Community push targets are registered, and a navigate call arrives
 * (NPM-3a-ii). Two halves, as for the pillar routes:
 *
 * 1. REGISTRATION, read from AppNavigator's source (the precedent and the
 *    reasons are in pillarRoutes.test.ts): Chat and People are Screens of the
 *    Community stack, the Community stack is the Community tab of the four-tab
 *    navigator, and that navigator is the root's Main.
 * 2. ARRIVAL, through a REAL navigator of the same shape (Main, then
 *    Community, then CommunityMain, Chat, People) driven by the exact navigate
 *    call the router builds: the screen lands with its params, and Back goes to
 *    the Community stack's root.
 */
jest.mock('react-native-safe-area-context', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const insets = { top: 0, left: 0, right: 0, bottom: 0 };
  const frame = { x: 0, y: 0, width: 320, height: 640 };
  return {
    SafeAreaProvider: ({ children }: { children: unknown }) => React.createElement(View, null, children),
    SafeAreaView: ({ children }: { children: unknown }) => React.createElement(View, null, children),
    SafeAreaInsetsContext: React.createContext(insets),
    SafeAreaFrameContext: React.createContext(frame),
    useSafeAreaInsets: () => insets,
    useSafeAreaFrame: () => frame,
    initialWindowMetrics: { insets, frame },
  };
});

import React from 'react';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Text } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import {
  NavigationContainer,
  createNavigationContainerRef,
  useRoute,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { communityPushTarget, navigationArgsFor } from '../communityPushRoute';
import { ROUTES } from '../routes';

const SOURCE = readFileSync(join(__dirname, '..', 'AppNavigator.tsx'), 'utf8');

/** The source of one function component in AppNavigator, from its declaration to the next top-level const. */
function body(name: string): string {
  const start = SOURCE.indexOf(`const ${name} = `);
  if (start < 0) throw new Error(`${name} not found in AppNavigator.tsx`);
  const next = SOURCE.indexOf('\nconst ', start + 1);
  return SOURCE.slice(start, next < 0 ? undefined : next);
}

describe('registration (AppNavigator source)', () => {
  test('Chat and People are Screens of the Community stack', () => {
    // Mutation caught: either Screen removed or renamed.
    const community = body('CommunityNavigator');
    expect(ROUTES.Chat).toBe('Chat');
    expect(ROUTES.People).toBe('People');
    expect(community).toContain('name="Chat"');
    expect(community).toContain('name="People"');
  });

  test('the Community stack is the Community tab, and that tab navigator is Main', () => {
    const tabs = body('FivePillarTabs');
    expect(tabs).toMatch(/name=\{ROUTES\.Community\}\s+component=\{CommunityNavigator\}/);
    const main = body('MainNavigator');
    expect(main).toMatch(/name="Main"\s+component=\{FOUR_PILLAR_IA \? FivePillarTabs/);
  });
});

describe('arrival (a real navigator of the same shape)', () => {
  const Root = createNativeStackNavigator();
  const Community = createNativeStackNavigator();
  const Inner = createNativeStackNavigator();

  function Show({ label }: { label: string }) {
    const route = useRoute();
    return <Text>{`${label} ${JSON.stringify(route.params ?? {})}`}</Text>;
  }
  const CommunityMain = () => <Show label="CommunityMain" />;
  const Chat = () => <Show label="Chat" />;
  const People = () => <Show label="People" />;
  const Home = () => <Show label="Home" />;

  function CommunityStack() {
    return (
      <Inner.Navigator>
        <Inner.Screen name="CommunityMain" component={CommunityMain} />
        <Inner.Screen name="People" component={People} />
        <Inner.Screen name="Chat" component={Chat} />
      </Inner.Navigator>
    );
  }
  function MainTabsStandIn() {
    return (
      <Community.Navigator>
        <Community.Screen name="Home" component={Home} />
        <Community.Screen name="Community" component={CommunityStack} />
      </Community.Navigator>
    );
  }

  function mount() {
    const ref = createNavigationContainerRef();
    render(
      <NavigationContainer ref={ref}>
        <Root.Navigator>
          <Root.Screen name="Main" component={MainTabsStandIn} />
        </Root.Navigator>
      </NavigationContainer>
    );
    return ref;
  }

  test('a direct-message target lands on Chat with its params; Back goes to the Community root', async () => {
    const ref = mount();
    const target = communityPushTarget(
      { type: 'direct_message', conversationId: 'conv-AB', senderId: 'uid-B', recipientId: 'uid-A' },
      'uid-A',
      'n1'
    )!;
    const navigate = ref.navigate as (name: string, params?: object) => void;
    await act(async () => {
      navigate(...navigationArgsFor(target));
    });

    expect(screen.getByText('Chat {"conversationId":"conv-AB","otherUserId":"uid-B"}')).toBeTruthy();
    await act(async () => {
      ref.goBack();
    });
    expect(screen.getByText('CommunityMain {}')).toBeTruthy();
  });

  test('a request target lands on People with the Requests param', async () => {
    const ref = mount();
    const target = communityPushTarget(
      { type: 'connection_request', connectionId: 'c1', requesterId: 'uid-C', recipientId: 'uid-A' },
      'uid-A',
      'n2'
    )!;
    const navigate = ref.navigate as (name: string, params?: object) => void;
    await act(async () => {
      navigate(...navigationArgsFor(target));
    });

    expect(screen.getByText('People {"initialFilter":"requests","filterRequestId":"n2"}')).toBeTruthy();
  });
});
