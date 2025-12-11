/**
 * App Navigator
 * Root navigation component with auth flow
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner } from '../components';
import { Colors } from '../constants';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Auth screens
import {
  LoginScreen,
  SignupScreen,
  ForgotPasswordScreen,
  EmailVerificationScreen,
} from '../screens/auth';

// App screens
import DashboardScreen from '../screens/DashboardScreen';
import PlanScreen from '../screens/PlanScreen';
import FocusScreen from '../screens/FocusScreen';
import JournalScreen from '../screens/JournalScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ConversationsScreen from '../screens/ConversationsScreen';
import ChatScreen from '../screens/ChatScreen';
import {
  CommunityScreen,
  GroupsScreen,
  PeopleScreen,
  MessagesScreen,
} from '../screens/community';

// Create navigators
const AuthStack = createNativeStackNavigator();
const AppStack = createNativeStackNavigator();
const CommunityStack = createNativeStackNavigator();
const MessagesStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();
const BottomTabs = createBottomTabNavigator();

/**
 * Auth Stack Navigator
 * Screens for unauthenticated users
 */
const AuthNavigator = () => {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Signup" component={SignupScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </AuthStack.Navigator>
  );
};

/**
 * Community Stack Navigator
 * Navigation for community features
 */
const CommunityNavigator = () => {
  return (
    <CommunityStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <CommunityStack.Screen name="CommunityMain" component={CommunityScreen} />
      <CommunityStack.Screen name="Groups" component={GroupsScreen} />
      <CommunityStack.Screen name="People" component={PeopleScreen} />
      <CommunityStack.Screen name="Messages" component={MessagesScreen} />
    </CommunityStack.Navigator>
  );
};

/**
 * Messages Stack Navigator
 * Navigation for direct messaging
 */
const MessagesNavigator = () => {
  return (
    <MessagesStack.Navigator
      screenOptions={{
        animation: 'slide_from_right',
      }}
    >
      <MessagesStack.Screen
        name="Conversations"
        component={ConversationsScreen}
        options={{
          title: 'Messages',
          headerStyle: {
            backgroundColor: Colors.evergreenTeal,
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: '700',
          },
        }}
      />
      <MessagesStack.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          title: 'Chat',
          headerStyle: {
            backgroundColor: Colors.evergreenTeal,
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: '700',
          },
        }}
      />
    </MessagesStack.Navigator>
  );
};

/**
 * Profile Stack Navigator
 * Navigation for profile and settings
 */
const ProfileNavigator = () => {
  return (
    <ProfileStack.Navigator
      screenOptions={{
        animation: 'slide_from_right',
      }}
    >
      <ProfileStack.Screen
        name="ProfileMain"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          headerStyle: {
            backgroundColor: Colors.evergreenTeal,
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: '700',
          },
        }}
      />
      <ProfileStack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Settings',
          headerStyle: {
            backgroundColor: Colors.evergreenTeal,
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: '700',
          },
        }}
      />
    </ProfileStack.Navigator>
  );
};

/**
 * Bottom Tabs Navigator
 * Main app navigation with bottom tabs
 */
const BottomTabsNavigator = () => {
  return (
    <BottomTabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.evergreenTeal,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.borderLight,
          borderTopWidth: 1,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <BottomTabs.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Icon name="view-dashboard" size={size} color={color} />
          ),
        }}
      />
      <BottomTabs.Screen
        name="Plan"
        component={PlanScreen}
        options={{
          tabBarLabel: 'Plan',
          tabBarIcon: ({ color, size }) => (
            <Icon name="clipboard-check" size={size} color={color} />
          ),
        }}
      />
      <BottomTabs.Screen
        name="Focus"
        component={FocusScreen}
        options={{
          tabBarLabel: 'Focus',
          tabBarIcon: ({ color, size }) => (
            <Icon name="timer-outline" size={size} color={color} />
          ),
        }}
      />
      <BottomTabs.Screen
        name="Journal"
        component={JournalScreen}
        options={{
          tabBarLabel: 'Journal',
          tabBarIcon: ({ color, size }) => (
            <Icon name="book-open-page-variant" size={size} color={color} />
          ),
        }}
      />
      <BottomTabs.Screen
        name="Community"
        component={CommunityNavigator}
        options={{
          tabBarLabel: 'Community',
          tabBarIcon: ({ color, size }) => (
            <Icon name="account-group" size={size} color={color} />
          ),
        }}
      />
      <BottomTabs.Screen
        name="Messages"
        component={MessagesNavigator}
        options={{
          tabBarLabel: 'Messages',
          tabBarIcon: ({ color, size }) => (
            <Icon name="message-text" size={size} color={color} />
          ),
        }}
      />
      <BottomTabs.Screen
        name="Profile"
        component={ProfileNavigator}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Icon name="account" size={size} color={color} />
          ),
        }}
      />
    </BottomTabs.Navigator>
  );
};

/**
 * App Stack Navigator
 * Screens for authenticated users
 */
const MainNavigator = () => {
  return (
    <AppStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <AppStack.Screen name="Main" component={BottomTabsNavigator} />
    </AppStack.Navigator>
  );
};

/**
 * Email Verification Navigator
 * For users who haven't verified their email
 */
const VerificationNavigator = () => {
  return (
    <AppStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <AppStack.Screen name="EmailVerification" component={EmailVerificationScreen} />
    </AppStack.Navigator>
  );
};

/**
 * Root App Navigator
 * Conditionally renders auth or main app based on auth state
 */
const AppNavigator: React.FC = () => {
  const { user, isAuthReady } = useAuth();

  // Show loading spinner while checking auth state
  if (!isAuthReady) {
    return <LoadingSpinner message="Loading..." />;
  }

  return (
    <NavigationContainer>
      {!user ? (
        // User is not logged in -> Show auth screens
        <AuthNavigator />
      ) : !user.emailVerified ? (
        // User is logged in but email not verified -> Show verification screen
        <VerificationNavigator />
      ) : (
        // User is logged in and verified -> Show main app
        <MainNavigator />
      )}
    </NavigationContainer>
  );
};

export default AppNavigator;
