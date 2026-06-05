/**
 * useAccountActions
 *
 * Shared account-level actions (sign out + account deletion) so the SAME
 * confirmation dialogs and deletion logic back both Settings and the paywall
 * escape hatch — the deletion flow and its confirmation are defined once here,
 * not duplicated.
 *
 * Deletion calls the existing `deleteAccount` Cloud Function and then signs out.
 * Sign-out goes through AuthContext's `logout()` → `signOut()`; the auth-state
 * listener resets both Firebase and RevenueCat identity on sign-out
 * (clearPurchaser → Purchases.logOut, plus clearRcEntitlement), so neither path
 * leaves a stale entitlement behind.
 *
 * This is a reachability-only extraction: the dialog copy and deletion flow are
 * unchanged from the original Settings implementation.
 */

import { useState } from 'react';
import { Alert } from 'react-native';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '../context/AuthContext';

export function useAccountActions() {
  const { logout } = useAuth();
  const [deleting, setDeleting] = useState(false);

  const confirmLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              Alert.alert('Error', 'Failed to logout');
            }
          },
        },
      ]
    );
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action is permanent and cannot be undone. All your data, including goals, habits, journal entries, and connections, will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete My Account',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you sure?',
              'This cannot be reversed. Your account and all associated data will be permanently removed.',
              [
                { text: 'Go Back', style: 'cancel' },
                {
                  text: 'Yes, Delete Everything',
                  style: 'destructive',
                  onPress: async () => {
                    setDeleting(true);
                    try {
                      const functions = getFunctions();
                      const deleteAccountFn = httpsCallable(functions, 'deleteAccount');
                      await deleteAccountFn();
                      // Sign out locally so auth listener navigates to login,
                      // not onboarding (the user doc is already deleted).
                      await logout();
                    } catch (err: any) {
                      setDeleting(false);
                      Alert.alert(
                        'Deletion Failed',
                        'Something went wrong. Please try again or contact support@varawellness.co for help.'
                      );
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  return { deleting, confirmLogout, confirmDeleteAccount };
}

export default useAccountActions;
