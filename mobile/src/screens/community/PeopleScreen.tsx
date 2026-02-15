/**
 * People Screen
 * Enhanced UI with suggested connections, mutual connections, and improved profile cards
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Animated,
  ScrollView,
} from 'react-native';
import { Text, Searchbar, Avatar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Button, Card, LoadingSpinner, PersonCard } from '../../components';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import {
  useConnections,
  useUserSearch,
  useConnectionProfiles,
  useStartConversation,
  useSuggestedConnections,
} from '../../hooks';
import { useAuth } from '../../context/AuthContext';
import { UserProfile, getUserById } from '../../services/firebase';
import { EnhancedUserProfile } from '../../services/firebase/connections.service';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

type FilterTab = 'connections' | 'discover' | 'requests';

const PeopleScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [filter, setFilter] = useState<FilterTab>('connections');
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

  // Suggested connections
  const { suggestions, loading: suggestionsLoading, refresh: refreshSuggestions } = useSuggestedConnections(6);

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
            return otherUserId ? getUserById(otherUserId) : Promise.resolve(null);
          })
        );
        setRequestProfiles(profiles.filter((p): p is UserProfile => p !== null));
      } catch (err) {
        console.error('Error loading request profiles:', err);
      } finally {
        setLoadingRequestProfiles(false);
      }
    };

    loadRequestProfiles();
  }, [filter, requests.length, user?.uid]);

  // Auto-switch to Discover tab when user starts typing
  useEffect(() => {
    if (searchQuery.trim().length > 0 && filter !== 'discover') {
      setFilter('discover');
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

  // Handle search with debounce
  useEffect(() => {
    if (searchQuery.trim().length >= 1) {
      const timer = setTimeout(() => {
        search(searchQuery);
      }, 200);
      return () => clearTimeout(timer);
    } else {
      clear();
    }
  }, [searchQuery]);

  // Determine what to display based on filter
  const displayData = useMemo(() => {
    if (filter === 'connections') {
      return connectionProfiles.map((p) => ({ ...p, uid: p.id } as EnhancedUserProfile));
    } else if (filter === 'requests') {
      return requestProfiles.map((p) => ({ ...p, uid: p.id } as EnhancedUserProfile));
    } else {
      // 'discover' - show search results, filter out current user and existing connections
      return searchResults
        .filter((u) => u.id !== user?.uid && !isConnected(u.id))
        .map((p) => ({ ...p, uid: p.id } as EnhancedUserProfile));
    }
  }, [filter, connectionProfiles, requestProfiles, searchResults, user, isConnected]);

  const loading = connectionsLoading || profilesLoading || (filter === 'discover' && searchLoading);

  const handleSendRequest = async (userId: string, userName: string) => {
    try {
      await sendRequest(userId);
      Alert.alert('Success', `Connection request sent to ${userName}`);
      refreshSuggestions();
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

  const handleViewProfile = (userId: string) => {
    navigation.navigate('UserProfile', { userId });
  };

  // Tab button component
  const TabButton = ({
    value,
    label,
    count,
    icon,
    isActive,
  }: {
    value: FilterTab;
    label: string;
    count?: number;
    icon?: string;
    isActive: boolean;
  }) => (
    <TouchableOpacity
      style={[styles.tabButton, isActive && styles.tabButtonActive]}
      onPress={() => {
        setFilter(value);
        if (value !== 'discover') {
          setSearchQuery('');
          clear();
        }
      }}
    >
      {icon && (
        <Icon
          name={icon as any}
          size={18}
          color={isActive ? Colors.textOnPrimary : Colors.textSecondary}
        />
      )}
      <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
        {label}
      </Text>
      {count !== undefined && count > 0 && (
        <View style={[styles.tabBadge, isActive && styles.tabBadgeActive]}>
          <Text style={[styles.tabBadgeText, isActive && styles.tabBadgeTextActive]}>
            {count}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text variant="headlineMedium" style={styles.screenTitle}>
              People
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              Build your wellness network
            </Text>
          </View>
          {/* Network stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{connectionProfiles.length}</Text>
              <Text style={styles.statLabel}>Connections</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search by name or interests..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={[styles.searchbar, isSearchFocused && styles.searchbarFocused]}
          iconColor={Colors.evergreenTeal}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setIsSearchFocused(false)}
        />
        <Animated.View
          style={[styles.searchHint, { opacity: searchHintOpacity }]}
          pointerEvents="none"
        >
          <Icon name="arrow-down" size={14} color={Colors.evergreenTeal} />
          <Text variant="bodySmall" style={styles.searchHintText}>
            Showing search results below
          </Text>
        </Animated.View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContent}
        >
          <TabButton
            value="connections"
            label="My Network"
            count={connectionProfiles.length}
            icon="account-group"
            isActive={filter === 'connections'}
          />
          <TabButton
            value="discover"
            label="Find People"
            icon="magnify"
            isActive={filter === 'discover'}
          />
          <TabButton
            value="requests"
            label="Requests"
            count={requests.length}
            icon="account-plus"
            isActive={filter === 'requests'}
          />
        </ScrollView>
      </View>

      {/* Live search indicator */}
      {searchQuery.length > 0 && filter === 'discover' && searchLoading && (
        <View style={styles.searchingIndicator}>
          <Icon name="magnify" size={16} color={Colors.evergreenTeal} />
          <Text variant="bodySmall" style={styles.searchingText}>
            Searching for "{searchQuery}"...
          </Text>
        </View>
      )}

      {/* Main Content */}
      <FlatList
        data={displayData}
        keyExtractor={(item) => item.uid || item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={() => (
          <>
            {/* Suggested Connections Section (only show on My Network tab) */}
            {filter === 'connections' && suggestions.length > 0 && !searchQuery && (
              <View style={styles.suggestionsSection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Suggested for you</Text>
                  <TouchableOpacity onPress={refreshSuggestions}>
                    <Icon name="refresh" size={20} color={Colors.evergreenTeal} />
                  </TouchableOpacity>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.suggestionsScroll}
                >
                  {suggestions.map((suggestion) => (
                    <TouchableOpacity
                      key={suggestion.uid}
                      style={styles.suggestionCard}
                      onPress={() => handleViewProfile(suggestion.uid)}
                    >
                      {/* Suggestion reason badge */}
                      <View style={styles.suggestionReasonBadge}>
                        <Icon
                          name={
                            suggestion.suggestionReason === 'group'
                              ? 'account-group'
                              : suggestion.suggestionReason === 'interests'
                              ? 'heart'
                              : 'account-multiple'
                          }
                          size={10}
                          color={Colors.evergreenTeal}
                        />
                      </View>
                      <Avatar.Text
                        size={56}
                        label={(suggestion.displayName || 'U').substring(0, 2).toUpperCase()}
                        style={styles.suggestionAvatar}
                        color={Colors.textOnPrimary}
                      />
                      <Text style={styles.suggestionName} numberOfLines={1}>
                        {suggestion.displayName || 'Unknown'}
                      </Text>
                      <Text style={styles.suggestionReason} numberOfLines={1}>
                        {suggestion.suggestionReason === 'group'
                          ? 'Shared group'
                          : suggestion.suggestionReason === 'interests'
                          ? 'Similar interests'
                          : 'Mutual connection'}
                      </Text>
                      <TouchableOpacity
                        style={styles.miniConnectButton}
                        onPress={() => handleSendRequest(suggestion.uid, suggestion.displayName)}
                      >
                        <Icon name="plus" size={14} color={Colors.textOnPrimary} />
                        <Text style={styles.miniConnectText}>Connect</Text>
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Section title for main list */}
            {displayData.length > 0 && (
              <Text style={styles.listSectionTitle}>
                {filter === 'connections'
                  ? 'Your Connections'
                  : filter === 'requests'
                  ? 'Pending Requests'
                  : searchQuery.length > 0
                  ? `Results for "${searchQuery}"`
                  : 'Discover People'}
              </Text>
            )}
          </>
        )}
        renderItem={({ item, index }) => (
          <PersonCard
            user={item}
            mode={
              filter === 'requests'
                ? 'request'
                : filter === 'connections'
                ? 'connection'
                : 'discover'
            }
            onConnect={() => handleSendRequest(item.uid, item.displayName)}
            onMessage={() => handleMessage(item.uid)}
            onAccept={() => handleAcceptRequest(index)}
            onDecline={() => handleDeclineRequest(index)}
            onPress={() => handleViewProfile(item.uid)}
            isPending={hasPendingRequest(item.uid)}
            showMutualConnections={filter !== 'connections'}
          />
        )}
        ListEmptyComponent={() =>
          loading ? (
            <LoadingSpinner message="Loading people..." />
          ) : (
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
          )
        }
      />
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
    paddingVertical: Spacing.base,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  screenTitle: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.bold,
  },
  subtitle: {
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  statsContainer: {
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.evergreenTeal,
  },
  statLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.base,
  },
  searchbar: {
    backgroundColor: Colors.surface,
    elevation: 0,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: Layout.borderRadius.lg,
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
  tabsContainer: {
    marginBottom: Spacing.base,
  },
  tabsContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: Layout.borderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  tabButtonActive: {
    backgroundColor: Colors.evergreenTeal,
    borderColor: Colors.evergreenTeal,
  },
  tabText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
  },
  tabTextActive: {
    color: Colors.textOnPrimary,
  },
  tabBadge: {
    backgroundColor: Colors.inputBackground,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Layout.borderRadius.full,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  tabBadgeText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeight.bold,
  },
  tabBadgeTextActive: {
    color: Colors.textOnPrimary,
  },
  searchingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  searchingText: {
    color: Colors.evergreenTeal,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  // Suggestions Section
  suggestionsSection: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
  },
  suggestionsScroll: {
    gap: Spacing.base,
  },
  suggestionCard: {
    width: 120,
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.xl,
    padding: Spacing.base,
    alignItems: 'center',
    ...Layout.shadow.sm,
    position: 'relative',
  },
  suggestionReasonBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: Colors.mintCream,
    padding: 4,
    borderRadius: Layout.borderRadius.full,
  },
  suggestionAvatar: {
    backgroundColor: Colors.evergreenTeal,
    marginBottom: Spacing.sm,
  },
  suggestionName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 2,
  },
  suggestionReason: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  miniConnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.evergreenTeal,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Layout.borderRadius.full,
  },
  miniConnectText: {
    fontSize: 11,
    color: Colors.textOnPrimary,
    fontWeight: Typography.fontWeight.semibold,
  },
  listSectionTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.base,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing['3xl'],
  },
  emptyIcon: {
    marginBottom: Spacing.base,
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
