/**
 * People Screen
 * Search users and manage connections
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Alert, Animated } from 'react-native';
import { Text, SegmentedButtons, Searchbar, Avatar, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Button, Card, LoadingSpinner } from '../../components';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { useConnections, useUserSearch, useConnectionProfiles, useStartConversation } from '../../hooks';
import { useAuth } from '../../context/AuthContext';
import { UserProfile, getUserById } from '../../services/firebase';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

const PeopleScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [filter, setFilter] = useState('connections');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchHintOpacity = useRef(new Animated.Value(0)).current;

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

  // Auto-switch to Discover tab when user starts typing
  useEffect(() => {
    if (searchQuery.trim().length > 0 && filter !== 'discover') {
      setFilter('discover');
      // Show hint animation
      Animated.sequence([
        Animated.timing(searchHintOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.delay(2000),
        Animated.timing(searchHintOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [searchQuery]);

  // Handle search with debounce - now searches immediately when typing
  useEffect(() => {
    if (searchQuery.trim().length >= 1) {
      const timer = setTimeout(() => {
        search(searchQuery);
      }, 200); // Faster debounce for more responsive feel

      return () => clearTimeout(timer);
    } else {
      clear();
    }
  }, [searchQuery]); // search and clear are stable from the hook

  // Clear search when switching away from discover
  useEffect(() => {
    if (filter !== 'discover' && searchQuery.trim().length > 0) {
      // Keep the query but it won't show results on other tabs
    }
  }, [filter]);

  // Determine what to display based on filter
  const displayData = useMemo(() => {
    if (filter === 'connections') {
      return connectionProfiles;
    } else if (filter === 'requests') {
      return requestProfiles;
    } else {
      // 'discover' - show search results, filter out current user and existing connections
      return searchResults.filter(
        (u) => u.id !== user?.uid && !isConnected(u.id)
      );
    }
  }, [filter, connectionProfiles, requestProfiles, searchResults, user, isConnected]);

  const loading = connectionsLoading || profilesLoading || (filter === 'discover' && searchLoading);

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
      navigation.navigate('Chat', { conversationId, otherUserId: userId });
    } catch (error) {
      console.error('Error starting conversation:', error);
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
          placeholder="Search for people to connect..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={[
            styles.searchbar,
            isSearchFocused && styles.searchbarFocused,
          ]}
          iconColor={Colors.evergreenTeal}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setIsSearchFocused(false)}
        />
        {/* Search hint that appears when auto-switching to Discover */}
        <Animated.View
          style={[
            styles.searchHint,
            { opacity: searchHintOpacity },
          ]}
          pointerEvents="none"
        >
          <Icon name="arrow-down" size={14} color={Colors.evergreenTeal} />
          <Text variant="bodySmall" style={styles.searchHintText}>
            Showing search results below
          </Text>
        </Animated.View>
      </View>

      {/* Filter tabs with badge for requests */}
      <View style={styles.filterContainer}>
        <SegmentedButtons
          value={filter}
          onValueChange={(value) => {
            setFilter(value);
            // Clear search when switching to non-discover tabs
            if (value !== 'discover') {
              setSearchQuery('');
              clear();
            }
          }}
          buttons={[
            {
              value: 'connections',
              label: `My Network${connectionProfiles.length > 0 ? ` (${connectionProfiles.length})` : ''}`,
            },
            {
              value: 'discover',
              label: 'Find People',
              icon: searchQuery.length > 0 ? 'magnify' : undefined,
            },
            {
              value: 'requests',
              label: `Requests${requests.length > 0 ? ` (${requests.length})` : ''}`,
            },
          ]}
          style={styles.segmentedButtons}
        />
      </View>

      {/* Live search results preview when typing */}
      {searchQuery.length > 0 && filter === 'discover' && searchLoading && (
        <View style={styles.searchingIndicator}>
          <Icon name="magnify" size={16} color={Colors.evergreenTeal} />
          <Text variant="bodySmall" style={styles.searchingText}>
            Searching for "{searchQuery}"...
          </Text>
        </View>
      )}

      {/* People List */}
      {loading && !searchLoading ? (
        <LoadingSpinner message="Loading people..." />
      ) : displayData.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon
            name={filter === 'discover' ? 'account-search' : 'account-multiple'}
            size={64}
            color={Colors.textSecondary}
            style={styles.emptyIcon}
          />
          <Text variant="titleMedium" style={styles.emptyTitle}>
            {filter === 'connections'
              ? 'No connections yet'
              : filter === 'requests'
              ? 'No pending requests'
              : searchQuery.length >= 1
              ? 'No people found'
              : 'Find new connections'}
          </Text>
          <Text variant="bodyMedium" style={styles.emptyText}>
            {filter === 'connections'
              ? 'Use the search bar above to find and connect with people'
              : filter === 'requests'
              ? 'Connection requests will appear here'
              : searchQuery.length >= 1
              ? `No results for "${searchQuery}". Try a different name.`
              : 'Start typing a name to find people in the community'}
          </Text>
          {filter === 'connections' && (
            <Button
              variant="primary"
              style={styles.findPeopleButton}
              onPress={() => setFilter('discover')}
            >
              Find People
            </Button>
          )}
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
    backgroundColor: Colors.background.default,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  screenTitle: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.bold,
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
    borderWidth: 1,
    borderColor: 'transparent',
  },
  searchbarFocused: {
    borderColor: Colors.evergreenTeal,
  },
  searchHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xs,
    gap: Spacing.xs,
  },
  searchHintText: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.medium,
  },
  searchingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xs,
  },
  searchingText: {
    color: Colors.evergreenTeal,
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
    fontWeight: Typography.fontWeight.semibold,
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
  findPeopleButton: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
});

export default PeopleScreen;
