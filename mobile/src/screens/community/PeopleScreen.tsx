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
import { Text, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Button, Card, LoadingSpinner, PersonCard } from '../../components';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { CommunityAvatar } from '../../components/shared/CommunityAvatar';
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

  // Tab pill component
  const TabPill = ({
    value,
    label,
    count,
    isActive,
    isRequestTab,
  }: {
    value: FilterTab;
    label: string;
    count?: number;
    isActive: boolean;
    isRequestTab?: boolean;
  }) => (
    <TouchableOpacity
      style={[styles.tabPill, isActive && styles.tabPillActive]}
      onPress={() => {
        setFilter(value);
        if (value !== 'discover') {
          setSearchQuery('');
          clear();
        }
      }}
    >
      <Text style={[styles.tabPillText, isActive && styles.tabPillTextActive]}>
        {label}
      </Text>
      {count !== undefined && count > 0 && (
        <View style={[
          styles.tabBadge,
          isActive && styles.tabBadgeActive,
          isRequestTab && !isActive && styles.requestBadge,
        ]}>
          <Text style={[
            styles.tabBadgeText,
            isActive && styles.tabBadgeTextActive,
            isRequestTab && !isActive && styles.requestBadgeText,
          ]}>
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
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Icon name="arrow-left" size={20} color={Colors.evergreenTeal} />
            </TouchableOpacity>
            <Text style={styles.screenTitle}>People</Text>
          </View>
          <Text style={styles.connectionCount}>
            {connectionProfiles.length} connection{connectionProfiles.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <Text style={styles.subtitle}>Build your wellness network</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchbar, isSearchFocused && styles.searchbarFocused, {flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12}]}>
          <Icon name="magnify" size={20} color={Colors.evergreenTeal} style={{marginRight: 8}} />
          <TextInput
            placeholder="Search by name or interests..."
            placeholderTextColor={Colors.mutedSageGray}
            onChangeText={setSearchQuery}
            value={searchQuery}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            style={{flex: 1, fontSize: 14, color: Colors.softCharcoal, paddingVertical: 8}}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
              <Icon name="close-circle" size={18} color={Colors.mutedSageGray} />
            </TouchableOpacity>
          )}
        </View>
        <Animated.View
          style={[styles.searchHint, { opacity: searchHintOpacity }]}
          pointerEvents="none"
        >
          <Icon name="arrow-down" size={14} color={Colors.evergreenTeal} />
          <Text style={styles.searchHintText}>
            Showing search results below
          </Text>
        </Animated.View>
      </View>

      {/* Filter Tab Pills */}
      <View style={styles.tabsContainer}>
        <TabPill
          value="connections"
          label="Connections"
          count={connectionProfiles.length}
          isActive={filter === 'connections'}
        />
        <TabPill
          value="discover"
          label="Discover"
          isActive={filter === 'discover'}
        />
        <TabPill
          value="requests"
          label="Requests"
          count={requests.length}
          isActive={filter === 'requests'}
          isRequestTab
        />
      </View>

      {/* Live search indicator */}
      {searchQuery.length > 0 && filter === 'discover' && searchLoading && (
        <View style={styles.searchingIndicator}>
          <Icon name="magnify" size={16} color={Colors.evergreenTeal} />
          <Text style={styles.searchingText}>
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
                    <Text style={styles.seeAllText}>See all &rarr;</Text>
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
                      <CommunityAvatar
                        name={suggestion.displayName || 'U'}
                        photoURL={suggestion.avatar || suggestion.avatarUrl || null}
                        size={48}
                      />
                      <Text style={styles.suggestionName} numberOfLines={1}>
                        {suggestion.displayName || 'Unknown'}
                      </Text>
                      <Text style={styles.suggestionReason} numberOfLines={2}>
                        {suggestion.suggestionReason === 'group'
                          ? suggestion.sharedGroupNames?.[0] || 'Shared group'
                          : suggestion.suggestionReason === 'interests'
                          ? 'Similar interests'
                          : 'Mutual connection'}
                      </Text>
                      <TouchableOpacity
                        style={styles.sayHelloBtn}
                        onPress={() => handleSendRequest(suggestion.uid, suggestion.displayName)}
                      >
                        <Text style={styles.sayHelloBtnText}>Say hello</Text>
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
                  ? 'Your connections'
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
          filter === 'connections' ? (
            <TouchableOpacity
              style={[
                styles.connectionRow,
                index < displayData.length - 1 && styles.connectionRowBorder,
              ]}
              onPress={() => handleViewProfile(item.uid)}
              activeOpacity={0.7}
            >
              <CommunityAvatar
                name={item.displayName || 'U'}
                photoURL={item.avatar || item.avatarUrl || null}
                size={40}
              />
              <View style={styles.connectionInfo}>
                <Text style={styles.connectionName} numberOfLines={1}>
                  {item.displayName || 'Unknown'}
                </Text>
                {item.bio ? (
                  <Text style={styles.connectionContext} numberOfLines={1}>
                    {item.bio}
                  </Text>
                ) : item.location ? (
                  <Text style={styles.connectionContext} numberOfLines={1}>
                    {item.location}
                  </Text>
                ) : null}
              </View>
              <TouchableOpacity
                style={styles.messageIconBtn}
                onPress={() => handleMessage(item.uid)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Icon name="message-outline" size={20} color={Colors.mutedSageGray} />
              </TouchableOpacity>
            </TouchableOpacity>
          ) : (
            <PersonCard
              user={item}
              mode={
                filter === 'requests'
                  ? 'request'
                  : 'discover'
              }
              onConnect={() => handleSendRequest(item.uid, item.displayName)}
              onMessage={() => handleMessage(item.uid)}
              onAccept={() => handleAcceptRequest(index)}
              onDecline={() => handleDeclineRequest(index)}
              onPress={() => handleViewProfile(item.uid)}
              isPending={hasPendingRequest(item.uid)}
              showMutualConnections={true}
            />
          )
        )}
        ListEmptyComponent={() =>
          loading ? (
            <LoadingSpinner message="Loading people..." />
          ) : (
            <View style={styles.emptyContainer}>
              <Icon
                name={filter === 'discover' ? 'account-search' : 'account-multiple'}
                size={64}
                color={Colors.mutedSageGray}
                style={styles.emptyIcon}
              />
              <Text style={styles.emptyTitle}>
                {filter === 'connections'
                  ? 'No connections yet'
                  : filter === 'requests'
                  ? 'No pending requests'
                  : searchQuery.length >= 1
                  ? 'No people found'
                  : 'Find new connections'}
              </Text>
              <Text style={styles.emptyText}>
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
    backgroundColor: Colors.mistWhite,
  },

  // ── Header ──────────────────────────────────────────
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backButton: {
    padding: 4,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: Colors.evergreenTeal,
  },
  connectionCount: {
    fontSize: 14,
    color: Colors.mutedSageGray,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.mutedSageGray,
    marginTop: 4,
    marginBottom: 14,
  },

  // ── Search ──────────────────────────────────────────
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchbar: {
    backgroundColor: Colors.white,
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
    marginTop: 4,
    gap: 4,
  },
  searchHintText: {
    color: Colors.evergreenTeal,
    fontWeight: '500',
  },

  // ── Tab Pills ───────────────────────────────────────
  tabsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: Colors.dewSageLight,
  },
  tabPillActive: {
    backgroundColor: Colors.evergreenTeal,
  },
  tabPillText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.mutedSageGray,
  },
  tabPillTextActive: {
    color: Colors.white,
  },
  tabBadge: {
    backgroundColor: Colors.dewSageLight,
    paddingHorizontal: 8,
    paddingVertical: 1,
    borderRadius: 12,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  tabBadgeText: {
    fontSize: 12,
    color: Colors.mutedSageGray,
    fontWeight: '700',
  },
  tabBadgeTextActive: {
    color: Colors.white,
  },
  requestBadge: {
    backgroundColor: Colors.softCoral,
  },
  requestBadgeText: {
    color: Colors.white,
  },

  // ── Searching indicator ─────────────────────────────
  searchingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  searchingText: {
    color: Colors.evergreenTeal,
  },

  // ── List content ────────────────────────────────────
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },

  // ── Suggestions Section ─────────────────────────────
  suggestionsSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.softCharcoal,
  },
  seeAllText: {
    fontSize: 12,
    color: Colors.evergreenTeal,
  },
  suggestionsScroll: {
    gap: 12,
  },
  suggestionCard: {
    minWidth: 150,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    ...Layout.shadow.sm,
  },
  suggestionName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.softCharcoal,
    textAlign: 'center',
    marginTop: 12,
  },
  suggestionReason: {
    fontSize: 12,
    color: Colors.mutedSageGray,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 12 * 1.3,
  },
  sayHelloBtn: {
    marginTop: 12,
    width: '100%',
    alignItems: 'center',
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.evergreenTeal,
  },
  sayHelloBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.evergreenTeal,
  },

  // ── Connection List Section ─────────────────────────
  listSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.softCharcoal,
    paddingBottom: 4,
  },
  connectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  connectionRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  connectionInfo: {
    flex: 1,
  },
  connectionName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.softCharcoal,
  },
  connectionContext: {
    fontSize: 12,
    color: Colors.mutedSageGray,
    marginTop: 2,
  },
  messageIconBtn: {
    padding: 8,
  },

  // ── Empty state ─────────────────────────────────────
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 64,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    color: Colors.softCharcoal,
    marginBottom: 8,
  },
  emptyText: {
    color: Colors.mutedSageGray,
    textAlign: 'center',
  },
  findPeopleButton: {
    marginTop: 24,
    paddingHorizontal: 32,
  },
});

export default PeopleScreen;
