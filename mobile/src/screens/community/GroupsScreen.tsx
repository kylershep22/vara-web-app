/**
 * Groups Screen
 * Browse and join community groups
 */

import React, { useState, useMemo } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Text, SegmentedButtons, Searchbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, LoadingSpinner } from '../../components';
import { Colors, Spacing } from '../../constants';
import { useGroups } from '../../hooks';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const GroupsScreen: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'my' | 'public'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { groups, loading, joinGroup, leaveGroup, isUserMember } = useGroups(filter);

  // Filter groups by search query
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groups;

    const query = searchQuery.toLowerCase();
    return groups.filter(
      (group) =>
        group.name.toLowerCase().includes(query) ||
        group.description?.toLowerCase().includes(query)
    );
  }, [groups, searchQuery]);

  const handleJoinGroup = async (groupId: string, groupName: string) => {
    try {
      await joinGroup(groupId);
      Alert.alert('Success', `You joined ${groupName}!`);
    } catch (error) {
      Alert.alert('Error', 'Failed to join group. Please try again.');
    }
  };

  const handleLeaveGroup = async (groupId: string, groupName: string) => {
    Alert.alert(
      'Leave Group',
      `Are you sure you want to leave ${groupName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveGroup(groupId);
              Alert.alert('Success', `You left ${groupName}`);
            } catch (error) {
              Alert.alert('Error', 'Failed to leave group. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.screenTitle}>
          Groups
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Find your community
        </Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search groups..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
          iconColor={Colors.evergreenTeal}
        />
      </View>

      {/* Filter */}
      <View style={styles.filterContainer}>
        <SegmentedButtons
          value={filter}
          onValueChange={setFilter}
          buttons={[
            { value: 'all', label: 'All Groups' },
            { value: 'my', label: 'My Groups' },
            { value: 'public', label: 'Public' },
          ]}
          style={styles.segmentedButtons}
        />
      </View>

      {/* Groups List */}
      {loading ? (
        <LoadingSpinner message="Loading groups..." />
      ) : filteredGroups.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon
            name="account-group"
            size={64}
            color={Colors.textSecondary}
            style={styles.emptyIcon}
          />
          <Text variant="titleMedium" style={styles.emptyTitle}>
            {searchQuery ? 'No groups found' : 'No groups available'}
          </Text>
          <Text variant="bodyMedium" style={styles.emptyText}>
            {searchQuery
              ? 'Try a different search term'
              : filter === 'my'
              ? "You haven't joined any groups yet"
              : 'Check back later for new groups'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredGroups}
          renderItem={({ item }) => {
            const isMember = isUserMember(item);

            return (
              <Card style={styles.groupCard}>
                <Text variant="titleMedium" style={styles.groupName}>
                  {item.name}
                </Text>
                <Text variant="bodyMedium" style={styles.groupDescription}>
                  {item.description}
                </Text>
                <View style={styles.groupMeta}>
                  <Text variant="bodySmall" style={styles.groupMetaText}>
                    <Icon name="account" size={14} /> {item.memberCount || 0} members
                  </Text>
                  <Text variant="bodySmall" style={styles.groupMetaText}>
                    {item.isPublic ? 'Public' : 'Private'}
                  </Text>
                </View>
                {isMember ? (
                  <Button
                    variant="outline"
                    style={styles.joinButton}
                    onPress={() => handleLeaveGroup(item.id, item.name)}
                  >
                    Leave Group
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    style={styles.joinButton}
                    onPress={() => handleJoinGroup(item.id, item.name)}
                  >
                    Join Group
                  </Button>
                )}
              </Card>
            );
          }}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  screenTitle: {
    color: Colors.evergreenTeal,
    fontWeight: '700',
  },
  subtitle: {
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  searchbar: {
    backgroundColor: Colors.surface,
    elevation: 0,
  },
  filterContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  segmentedButtons: {
    backgroundColor: Colors.surface,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  groupCard: {
    marginBottom: Spacing.md,
  },
  groupName: {
    color: Colors.textPrimary,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  groupDescription: {
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  groupMeta: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  groupMetaText: {
    color: Colors.textSecondary,
  },
  joinButton: {
    alignSelf: 'flex-start',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyIcon: {
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});

export default GroupsScreen;
