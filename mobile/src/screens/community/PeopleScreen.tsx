/**
 * People Screen
 * Search users and manage connections
 */

import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { Text, SegmentedButtons, Searchbar, Avatar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Button, Card, LoadingSpinner } from '../../components';
import { Colors, Spacing } from '../../constants';
import { useConnections, useUserSearch, useConnectionProfiles, useStartConversation } from '../../hooks';
import { useAuth } from '../../context/AuthContext';
import { UserProfile, getUserById } from '../../services/firebase';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const PeopleScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const {
    connections,
    requests,
    loading: connectionsLoading,
    sendRequest,
    acceptRequest,
    declineRequest,
    getConnectionIds,
    isConnected,
    hasPendingRequest,
  } = useConnections();

  const { users: searchResults, loading: searchLoading, search, clear } = useUserSearch();

  // Memoize connectionIds to prevent infinite loops
  const connectionIds = useMemo(() => getConnectionIds(), [connections]);

  const { profiles: connectionProfiles, loading: profilesLoading } = useConnectionProfiles(connectionIds);
  const { startConversation } = useStartConversation();

  // Profiles for incoming requests
  const [requestProfiles, setRequestProfiles] = useState<UserProfile[]>([]);
  const [loadingRequestProfiles, setLoadingRequestProfiles] = useState(false);

  useEffect(() => {
    const loadRequestProfiles = async () => {
      if (filter !== 'requests' || requests.length === 0) {
        setRequestProfiles([]);
        return;
      }

      setLoadingRequestProfiles(true);
      try {
        const profiles = await Promise.all(
          requests.map((req) => {
            const otherUserId = req.requester === user!.uid
              ? (req.a === user!.uid ? req.b : req.a)
              : req.requester;
            return getUserById(otherUserId);
          })
        );
        setRequestProfiles(profiles.filter((p) => p !== null) as UserProfile[]);
      } catch (err) {
        console.error('Error loading request profiles:', err);
      } finally {
        setLoadingRequestProfiles(false);
      }
    };

    loadRequestProfiles();
  }, [filter, requests.length, user?.uid]); // Use requests.length instead of requests array

  // Handle search with debounce
  useEffect(() => {
    if (filter !== 'all') {
      clear();
      return;
    }

    if (searchQuery.trim().length >= 2) {
      const timer = setTimeout(() => {
        search(searchQuery);
      }, 300); // Debounce search

      return () => clearTimeout(timer);
    } else {
      clear();
    }
  }, [searchQuery, filter]); // search and clear are stable from the hook

  // Determine what to display based on filter
  const displayData = useMemo(() => {
    if (filter === 'connections') {
      return connectionProfiles;
    } else if (filter === 'requests') {
      return requestProfiles;
    } else {
      // 'all' - show search results, filter out current user and existing connections
      return searchResults.filter(
        (u) => u.id !== user?.uid && !isConnected(u.id)
      );
    }
  }, [filter, connectionProfiles, requestProfiles, searchResults, user, isConnected]);

  const loading = connectionsLoading || profilesLoading || (filter === 'all' && searchLoading);

  const handleSendRequest = async (userId: string, userName: string) => {
    try {
      await sendRequest(userId);
      Alert.alert('Success', `Connection request sent to ${userName}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to send connection request');
    }
  };

  const handleAcceptRequest = async (requestIndex: number) => {
    const request = requests[requestIndex];
    try {
      await acceptRequest(request.id);
      Alert.alert('Success', 'Connection request accepted!');
    } catch (error) {
      Alert.alert('Error', 'Failed to accept connection request');
    }
  };

  const handleDeclineRequest = async (requestIndex: number) => {
    const request = requests[requestIndex];
    try {
      await declineRequest(request.id);
      Alert.alert('Success', 'Connection request declined');
    } catch (error) {
      Alert.alert('Error', 'Failed to decline connection request');
    }
  };

  const handleMessage = async (userId: string) => {
    try {
      const conversationId = await startConversation(userId);
      // TODO: Navigate to chat screen when it's created
      // navigation.navigate('Chat', { conversationId, userId });
      Alert.alert('Coming Soon', 'Direct messaging will be available soon!');
    } catch (error) {
      Alert.alert('Error', 'Failed to start conversation');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.screenTitle}>
          People
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Build your wellness network
        </Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search people..."
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
            { value: 'all', label: 'Discover' },
            { value: 'connections', label: 'Connections' },
            { value: 'requests', label: 'Requests' },
          ]}
          style={styles.segmentedButtons}
        />
      </View>

      {/* People List */}
      {loading ? (
        <LoadingSpinner message="Loading people..." />
      ) : displayData.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon
            name="account-multiple"
            size={64}
            color={Colors.textSecondary}
            style={styles.emptyIcon}
          />
          <Text variant="titleMedium" style={styles.emptyTitle}>
            {filter === 'connections'
              ? 'No connections yet'
              : filter === 'requests'
              ? 'No pending requests'
              : searchQuery.length >= 2
              ? 'No people found'
              : 'Search for people'}
          </Text>
          <Text variant="bodyMedium" style={styles.emptyText}>
            {filter === 'connections'
              ? 'Start connecting with people to build your network'
              : filter === 'requests'
              ? 'No pending connection requests'
              : searchQuery.length >= 2
              ? 'Try a different search term'
              : 'Type at least 2 characters to search'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={displayData}
          renderItem={({ item, index }) => (
            <TouchableOpacity activeOpacity={0.7}>
              <Card style={styles.personCard}>
                <View style={styles.personContent}>
                  <Avatar.Text
                    size={50}
                    label={(item.displayName || 'U').substring(0, 2).toUpperCase()}
                    style={styles.avatar}
                    color={Colors.textOnPrimary}
                  />
                  <View style={styles.personInfo}>
                    <Text variant="titleMedium" style={styles.personName}>
                      {item.displayName || 'Unknown'}
                    </Text>
                    {item.bio && (
                      <Text
                        variant="bodyMedium"
                        style={styles.personBio}
                        numberOfLines={2}
                      >
                        {item.bio}
                      </Text>
                    )}
                  </View>
                </View>
                <View style={styles.actions}>
                  {filter === 'requests' ? (
                    <>
                      <Button
                        variant="primary"
                        style={styles.actionButton}
                        onPress={() => handleAcceptRequest(index)}
                      >
                        Accept
                      </Button>
                      <Button
                        variant="outline"
                        style={styles.actionButton}
                        onPress={() => handleDeclineRequest(index)}
                      >
                        Decline
                      </Button>
                    </>
                  ) : filter === 'connections' ? (
                    <Button
                      variant="outline"
                      style={styles.actionButton}
                      onPress={() => handleMessage(item.id)}
                    >
                      Message
                    </Button>
                  ) : hasPendingRequest(item.id) ? (
                    <Button
                      variant="outline"
                      style={[styles.actionButton, styles.requestedButton]}
                      disabled
                    >
                      Requested
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      style={styles.actionButton}
                      onPress={() => handleSendRequest(item.id, item.displayName)}
                    >
                      Connect
                    </Button>
                  )}
                </View>
              </Card>
            </TouchableOpacity>
          )}
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
  personCard: {
    marginBottom: Spacing.md,
  },
  personContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  avatar: {
    backgroundColor: Colors.evergreenTeal,
    marginRight: Spacing.md,
  },
  personInfo: {
    flex: 1,
  },
  personName: {
    color: Colors.textPrimary,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  personBio: {
    color: Colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
  requestedButton: {
    opacity: 0.6,
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

export default PeopleScreen;
