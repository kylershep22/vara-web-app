/**
 * Muted Accounts Screen
 * Manage muted users — view and unmute
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, Typography, Layout } from '../constants';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { CommunityAvatar } from '../components/shared/CommunityAvatar';
import { fetchMutedUserIds, unmuteUser, getUserById } from '../services/firebase';

interface MutedAccount {
  id: string;
  displayName: string;
  avatar?: string;
}

const MutedAccountsScreen = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const { showNotificationToast } = useToast();
  const [accounts, setAccounts] = useState<MutedAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMutedAccounts = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const mutedIds = await fetchMutedUserIds(user.uid);
      const profiles = await Promise.all(
        mutedIds.map(async (id) => {
          const profile = await getUserById(id);
          return {
            id,
            displayName: profile?.displayName || 'Unknown user',
            avatar: profile?.avatarUrl || profile?.avatar,
          };
        })
      );
      setAccounts(profiles);
    } catch (error) {
      console.error('Error loading muted accounts:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadMutedAccounts();
  }, [loadMutedAccounts]);

  const handleUnmute = async (account: MutedAccount) => {
    if (!user) return;

    // Optimistic removal
    setAccounts((prev) => prev.filter((a) => a.id !== account.id));
    showNotificationToast(`Unmuted ${account.displayName}.`, '');

    try {
      await unmuteUser(user.uid, account.id);
    } catch (error) {
      // Revert
      setAccounts((prev) => [...prev, account]);
      showNotificationToast("Something didn't connect. Try again when ready.", '');
    }
  };

  const renderItem = ({ item }: { item: MutedAccount }) => (
    <View style={styles.row}>
      <CommunityAvatar name={item.displayName} photoURL={item.avatar} size={40} />
      <Text style={styles.name} numberOfLines={1}>{item.displayName}</Text>
      <TouchableOpacity
        style={styles.unmuteButton}
        onPress={() => handleUnmute(item)}
        activeOpacity={0.7}
      >
        <Text style={styles.unmuteText}>Unmute</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Custom header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="chevron-left" size={24} color={Colors.evergreenTeal} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Muted Accounts</Text>
        <View style={{ width: 32 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.evergreenTeal} />
        </View>
      ) : accounts.length === 0 ? (
        <View style={styles.centered}>
          <Icon name="volume-high" size={48} color={Colors.silverSage} />
          <Text style={styles.emptyTitle}>No muted accounts</Text>
          <Text style={styles.emptyBody}>
            When you mute someone, they'll appear here so you can unmute them later.
          </Text>
        </View>
      ) : (
        <FlatList
          data={accounts}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
};

export default MutedAccountsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    height: Layout.headerHeight,
    paddingHorizontal: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.softCharcoal,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
    marginTop: Spacing.base,
  },
  emptyBody: {
    fontSize: 14,
    color: Colors.mutedSageGray,
    textAlign: 'center',
    lineHeight: 21,
    marginTop: Spacing.sm,
  },
  list: {
    paddingVertical: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.softCharcoal,
    marginLeft: Spacing.md,
  },
  unmuteButton: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: Layout.borderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.silverSage,
  },
  unmuteText: {
    fontSize: 14,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.mutedSageGray,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.divider,
    marginHorizontal: Spacing.lg,
  },
});
