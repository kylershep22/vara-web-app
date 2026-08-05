/**
 * AuthContext Tests
 * Tests logout behavior and auth state management
 */

import React from 'react';

// Mock Firebase auth — must be before importing AuthContext
const mockSignOut = jest.fn().mockResolvedValue(undefined);
const mockOnAuthStateChanged = jest.fn();
const mockCreateUser = jest.fn();
const mockSignIn = jest.fn();

jest.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: (...args: any[]) => mockCreateUser(...args),
  signInWithEmailAndPassword: (...args: any[]) => mockSignIn(...args),
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

// The real event pipe, mocked at the same seam every wired screen uses.
const mockLogEvent = jest.fn();
jest.mock('../services/firebase/analyticsEvents.service', () => ({
  logEvent: (...args: any[]) => mockLogEvent(...args),
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
    mockCreateUser.mockResolvedValue({ user: { uid: 'new-user-1' } });
    mockSignIn.mockResolvedValue({ user: { uid: 'returning-user-1' } });
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

  // The two events that fire on a real production path. Everything else wired
  // this slice sits behind the __DEV__-gated weekly loop.
  describe('the sign_up event', () => {
    it('fires once with the method after the account is created', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.signup('a@example.com', 'pw', 'Alice');
      });

      expect(mockLogEvent).toHaveBeenCalledTimes(1);
      const [uid, name, params] = mockLogEvent.mock.calls[0];
      expect(uid).toBe('new-user-1');
      expect(name).toBe('sign_up');
      expect(params).toEqual({ method: 'email' });
    });

    it('carries the uid off the credential, not the auth state', async () => {
      // onAuthStateChanged has fired with null by this point, so the `user`
      // state and auth.currentUser both still hold the pre-signup value. Reading
      // either would log an empty or wrong owner onto the event.
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.signup('a@example.com', 'pw', 'Alice');
      });

      expect(result.current.user).toBeNull();
      expect(mockLogEvent.mock.calls[0][0]).toBe('new-user-1');
    });

    it('does not fire when account creation fails', async () => {
      // An event for an account that does not exist would be a lie in the
      // funnel, and its userId would not match any owner.
      mockCreateUser.mockRejectedValue(new Error('auth/email-already-in-use'));
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await expect(
          result.current.signup('a@example.com', 'pw', 'Alice')
        ).rejects.toThrow();
      });

      expect(mockLogEvent).not.toHaveBeenCalled();
    });

    it('a throwing analytics call does not fail the signup', async () => {
      mockLogEvent.mockImplementation(() => {
        throw new Error('analytics exploded');
      });
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await expect(
          result.current.signup('a@example.com', 'pw', 'Alice')
        ).resolves.toBeUndefined();
      });
    });
  });

  describe('the login event', () => {
    it('fires once with the method after a successful sign-in', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login('a@example.com', 'pw');
      });

      expect(mockLogEvent).toHaveBeenCalledTimes(1);
      const [uid, name, params] = mockLogEvent.mock.calls[0];
      expect(uid).toBe('returning-user-1');
      expect(name).toBe('login');
      expect(params).toEqual({ method: 'email' });
    });

    it('does not fire when sign-in fails', async () => {
      mockSignIn.mockRejectedValue(new Error('auth/wrong-password'));
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await expect(result.current.login('a@example.com', 'pw')).rejects.toThrow();
      });

      expect(mockLogEvent).not.toHaveBeenCalled();
    });

    it('a throwing analytics call does not fail the login', async () => {
      mockLogEvent.mockImplementation(() => {
        throw new Error('analytics exploded');
      });
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await expect(result.current.login('a@example.com', 'pw')).resolves.toBeUndefined();
      });
    });
  });
});
