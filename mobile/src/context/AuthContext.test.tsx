/**
 * AuthContext Tests
 * Tests logout behavior and auth state management
 */

import React from 'react';

// Mock Firebase auth — must be before importing AuthContext
const mockSignOut = jest.fn().mockResolvedValue(undefined);
const mockOnAuthStateChanged = jest.fn();

jest.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signOut: (...args: any[]) => mockSignOut(...args),
  onAuthStateChanged: (...args: any[]) => {
    mockOnAuthStateChanged(...args);
    const callback = args[1];
    if (callback) callback(null);
    return jest.fn(); // unsubscribe
  },
  sendPasswordResetEmail: jest.fn(),
  sendEmailVerification: jest.fn(),
  updateProfile: jest.fn(),
}));

jest.mock('../config/firebase', () => ({
  auth: { currentUser: null },
  db: {},
}));

const mockDeleteItemAsync = jest.fn().mockResolvedValue(undefined);
const mockSetItemAsync = jest.fn().mockResolvedValue(undefined);

jest.mock('expo-secure-store', () => ({
  setItemAsync: (...args: any[]) => mockSetItemAsync(...args),
  deleteItemAsync: (...args: any[]) => mockDeleteItemAsync(...args),
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  setDoc: jest.fn(),
  serverTimestamp: jest.fn(() => new Date()),
  Timestamp: { fromDate: jest.fn() },
}));

jest.mock('../services/crashReporting.service', () => ({
  setUserId: jest.fn(),
  setUserAttributes: jest.fn(),
  clearUser: jest.fn(),
}));

jest.mock('../services/analytics.service', () => ({
  setUserId: jest.fn(),
  setUserProperties: jest.fn(),
  trackLogin: jest.fn(),
  trackSignup: jest.fn(),
}));

jest.mock('../utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// Now import after all mocks are set up
import { AuthProvider, useAuth } from './AuthContext';
import { renderHook, act } from '@testing-library/react-native';

describe('AuthContext', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('provides auth context to children', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current).toBeDefined();
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthReady).toBe(true);
  });

  it('logout clears userId from SecureStore', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.logout();
    });

    expect(mockSignOut).toHaveBeenCalled();
    expect(mockDeleteItemAsync).toHaveBeenCalledWith('userId');
  });

  it('throws when useAuth is used outside AuthProvider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within an AuthProvider');
    spy.mockRestore();
  });
});
