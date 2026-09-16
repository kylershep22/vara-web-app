// mobile/src/screens/ConversationsScreen.tsx
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Modal,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
  PanResponder,
} from 'react-native';
import Text from '../components/shared/Text';
import TextInput from '../components/shared/TextInput';
import { Ionicons, MaterialCommunityIcons as MCIcon } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabBarInset } from '../hooks/useTabBarInset';
import { useAuth } from '../context/AuthContext';
import { useConversations } from '../hooks/useConversations';
import { useConnections, useStartConversation } from '../hooks';
import { Colors, Spacing, Typography, Layout } from '../constants';
import { db } from '../config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { ConversationListItem, MessagingEmptyState } from '../components/messaging';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.78;
const SWIPE_THRESHOLD = 80;

const ConversationsScreen = () => {
  // Bottom clearance for the floating tab bar (12.2). Used twice on this
  // screen: for the list's scroll content here, and for the FAB's anchor.
  const tabBarInset = useTabBarInset();
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { conversations, loading } = useConversations();
  const { getConnectionIds } = useConnections();
  const { startConversation } = useStartConversation();

  const [showNewMessage, setShowNewMessage] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sheetSearchQuery, setSheetSearchQuery] = useState('');
  const [connectionProfiles, setConnectionProfiles] = useState<any[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  // Bottom sheet animation
  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  const openSheet = useCallback(() => {
    setShowNewMessage(true);
    slideAnim.setValue(SHEET_HEIGHT);
    overlayAnim.setValue(0);
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(overlayAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideAnim, overlayAnim]);

  const closeSheet = useCallback(() => {
    Keyboard.dismiss();
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: SHEET_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(overlayAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowNewMessage(false);
      setSheetSearchQuery('');
      setSearchFocused(false);
    });
  }, [slideAnim, overlayAnim]);

  // Pan responder for swipe-to-dismiss
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only capture vertical downward drags on the handle area
        return gestureState.dy > 8 && Math.abs(gestureState.dx) < Math.abs(gestureState.dy);
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          slideAnim.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > SWIPE_THRESHOLD || gestureState.vy > 0.5) {
          closeSheet();
        } else {
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  // Filter conversations by search query
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter((c) =>
      c.otherUser?.displayName?.toLowerCase().includes(q)
    );
  }, [conversations, searchQuery]);

  // Load connection profiles when sheet opens
  useEffect(() => {
    const loadConnectionProfiles = async () => {
      if (!showNewMessage || !db) return;

      setLoadingProfiles(true);
      try {
        const connectionIds = getConnectionIds();
        const profiles = await Promise.all(
          connectionIds.map(async (id) => {
            const userDoc = await getDoc(doc(db, 'users', id));
            if (userDoc.exists()) {
              return { id: userDoc.id, ...userDoc.data() };
            }
            return null;
          })
        );
        setConnectionProfiles(profiles.filter((p) => p !== null));
      } catch (error) {
        console.error('Error loading connection profiles:', error);
      } finally {
        setLoadingProfiles(false);
      }
    };

    loadConnectionProfiles();
  }, [showNewMessage]);

  const filteredConnections = connectionProfiles.filter((profile) =>
    profile.displayName?.toLowerCase().includes(sheetSearchQuery.toLowerCase())
  );

  const handleStartConversation = async (userId: string) => {
    try {
      const conversationId = await startConversation(userId);
      closeSheet();
      // Small delay to let the sheet close animation finish
      setTimeout(() => {
        navigation.navigate('Chat', { conversationId, otherUserId: userId });
      }, 260);
    } catch (error) {
      console.error('Error starting conversation:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading conversations...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color={Colors.evergreenTeal} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Search Bar */}
      {conversations.length > 0 && (
        <View style={styles.searchContainer}>
          <View style={styles.searchInputWrapper}>
            <Ionicons name="search" size={18} color={Colors.mutedSageGray} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search conversations..."
              placeholderTextColor={Colors.text.secondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close-circle" size={18} color={Colors.mutedSageGray} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Conversation List */}
      {conversations.length === 0 ? (
        <MessagingEmptyState
          icon="chatbubbles-outline"
          title="No Messages Yet"
          subtitle="Start a conversation with someone from the community!"
          actionLabel="New Message"
          onAction={openSheet}
        />
      ) : filteredConversations.length === 0 ? (
        <MessagingEmptyState
          icon="search-outline"
          title="No Results"
          subtitle={`No conversations matching "${searchQuery}"`}
        />
      ) : (
        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ConversationListItem
              conversation={item}
              currentUserId={user?.uid || ''}
              onPress={() =>
                navigation.navigate('Chat', {
                  conversationId: item.id,
                  otherUserId: item.participants.find(
                    (id: string) => id !== user?.uid
                  ),
                })
              }
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={[styles.listContent, { paddingBottom: tabBarInset }]}
        />
      )}

      {/*
        FAB RE-ANCHORED AT R2. `styles.fab` sat at `bottom: Spacing.lg` (24),
        which worked only because the opaque bar ended where it began. Under a
        60pt capsule lifted 34pt off the bottom on a 14 Plus, a FAB at 24 is
        WHOLLY BEHIND the bar. `useTabBarInset()` already carries the bar's
        height, its offset and the gap, so it is the anchor here as well as the
        scroll inset above - the only bottom-anchored control in the sixteen
        that actually collides.
      */}
      <TouchableOpacity
        style={[styles.fab, { bottom: tabBarInset }]}
        onPress={openSheet}
        activeOpacity={0.8}
      >
        <MCIcon name="message-plus" size={24} color="#fff" />
      </TouchableOpacity>

      {/* New Message Bottom Sheet */}
      <Modal
        visible={showNewMessage}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeSheet}
      >
        {/*
          OVERLAY SITS OUTSIDE THE KeyboardAvoidingView, AND THAT IS THE POINT.
          Inside, it was `absoluteFillObject` resolved against the KAV's PADDING
          box. The moment the keyboard raised, the KAV's `paddingBottom` shrank
          that box to exactly the region the sheet already covered, so there was
          no exposed overlay pixel anywhere on screen and tap-to-dismiss
          silently stopped working. Out here it fills the modal instead.
          `HabitNoteSheet.tsx` has always had it this way.
        */}
        <TouchableWithoutFeedback onPress={closeSheet}>
          <Animated.View
            style={[
              styles.overlay,
              { opacity: overlayAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.3] }) },
            ]}
          />
        </TouchableWithoutFeedback>

        {/*
          TWO PROPS HERE ARE LOAD BEARING AND NEITHER IS OBVIOUS.

          `pointerEvents="box-none"`. The KAV is `flex: 1`, so it covers the
          whole modal, and it now paints OVER the overlay rather than containing
          it. A plain View is its own hit-test target, so without this the KAV
          would swallow every tap in the backdrop and tap-to-dismiss would end
          up MORE broken than it was before the overlay moved. `box-none` makes
          the KAV itself untargetable while leaving its child — the sheet —
          targetable exactly as before.

          NO `keyboardVerticalOffset`, AND ADDING A POSITIVE ONE IS NOT THE FIX.
          RN ADDS the offset to the padding it computes:

            paddingBottom = frame.y + frame.height - (keyboardScreenY - offset)

          This KAV is full-screen, so that already resolves to exactly the
          keyboard's height and 0 is the arithmetically correct value. A
          positive offset — 64 from `utils/keyboard.ts`, 100 from
          `EnhancedModal` — displaces the sheet FURTHER up by that amount, which
          is the defect this slice exists to fix. A positive offset is for a KAV
          that is NOT full-screen and so under-pads. The sheet yields through
          `flexShrink` on `styles.sheet` instead; see the note on that style.
        */}
        <KeyboardAvoidingView
          pointerEvents="box-none"
          style={[styles.sheetWrapper, { paddingTop: insets.top }]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Sheet */}
          <Animated.View
            style={[
              styles.sheet,
              {
                height: SHEET_HEIGHT,
                paddingBottom: insets.bottom,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Handle Bar (swipe area) */}
            <View {...panResponder.panHandlers} style={styles.handleArea}>
              <View style={styles.handleBar} />
            </View>

            {/* Header */}
            <View style={styles.sheetHeader}>
              <View style={styles.sheetTitleContainer}>
                <Text style={styles.sheetTitle}>New Message</Text>
                <Text style={styles.sheetSubtitle}>Select a connection to message</Text>
              </View>
              <TouchableOpacity
                onPress={closeSheet}
                style={styles.sheetCloseButton}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={24} color={Colors.mutedSageGray} />
              </TouchableOpacity>
            </View>

            {/* Search Field */}
            <View style={styles.sheetSearchContainer}>
              <View
                style={[
                  styles.sheetSearchField,
                  searchFocused && styles.sheetSearchFieldFocused,
                ]}
              >
                <Ionicons name="search" size={18} color={Colors.mutedSageGray} />
                <TextInput
                  style={styles.sheetSearchInput}
                  placeholder="Search your connections..."
                  placeholderTextColor={Colors.mutedSageGray}
                  value={sheetSearchQuery}
                  onChangeText={setSheetSearchQuery}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  returnKeyType="search"
                  autoCorrect={false}
                  autoFocus
                />
                {sheetSearchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setSheetSearchQuery('')}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close-circle" size={18} color={Colors.mutedSageGray} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* User List */}
            <View style={styles.sheetListContainer}>
              {loadingProfiles ? (
                <View style={styles.sheetLoading}>
                  <ActivityIndicator size="large" color={Colors.evergreenTeal} />
                  <Text style={styles.loadingText}>Loading connections...</Text>
                </View>
              ) : filteredConnections.length === 0 ? (
                <View style={styles.sheetEmpty}>
                  <Ionicons name="people-outline" size={48} color={Colors.mutedSageGray} />
                  <Text style={styles.sheetEmptyTitle}>
                    {sheetSearchQuery ? 'No connections found' : 'No connections yet'}
                  </Text>
                  <Text style={styles.sheetEmptySubtitle}>
                    {sheetSearchQuery
                      ? `No one matching "${sheetSearchQuery}"`
                      : 'Connect with people first to start messaging'}
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={filteredConnections}
                  keyExtractor={(item) => item.id}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator
                  contentContainerStyle={styles.sheetListContent}
                  ItemSeparatorComponent={() => <View style={styles.connectionSeparator} />}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.connectionRow}
                      onPress={() => handleStartConversation(item.id)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={`Message ${item.displayName || 'User'}`}
                    >
                      {item.avatarUrl ? (
                        <Image source={{ uri: item.avatarUrl }} style={styles.connectionAvatar} />
                      ) : (
                        <View style={styles.connectionAvatarPlaceholder}>
                          <Text style={styles.connectionAvatarText}>
                            {item.displayName ? item.displayName[0].toUpperCase() : 'U'}
                          </Text>
                        </View>
                      )}
                      <Text style={styles.connectionName} numberOfLines={1}>
                        {item.displayName || 'User'}
                      </Text>
                      <Ionicons name="chevron-forward" size={16} color={Colors.silverSage} />
                    </TouchableOpacity>
                  )}
                />
              )}
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.default,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.default,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: Layout.borderWidth.thin,
    borderBottomColor: Colors.borderLight,
  },
  backButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  headerTitle: {
    flex: 1,
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
  },
  headerSpacer: {
    width: 40,
  },
  // Conversations search
  searchContainer: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: Layout.borderWidth.thin,
    borderBottomColor: Colors.borderLight,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.default,
    borderRadius: Layout.borderRadius.lg,
    paddingHorizontal: Spacing.md,
    height: 40,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.primary,
    paddingVertical: 0,
  },
  // List
  listContent: {
    flexGrow: 1,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginLeft: Spacing.base + 52 + Spacing.md,
  },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    // `bottom` comes from useTabBarInset() at the call site (12.2). It is not
    // a constant: the floating bar's footprint depends on the device inset.

    width: 56,
    height: 56,
    borderRadius: 9999,
    backgroundColor: Colors.evergreenTeal,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },

  // =============================================
  // Bottom Sheet
  // =============================================
  sheetWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    // `flexShrink: 1` IS THE FIX, and Yoga's default of 0 is why this surface
    // was unusable. The sheet's `height` (SHEET_HEIGHT, set inline at the call
    // site) is its flex BASIS. Its parent is the KeyboardAvoidingView, which
    // shrinks by the keyboard's full height under `behavior: 'padding'`. With
    // the default `flexShrink: 0` a 78%-of-screen basis could not yield, so it
    // overflowed — and because the wrapper is `justifyContent: 'flex-end'`, the
    // overflow went off the TOP: handle, title, subtitle and the close control
    // all rendered above y=0, leaving no visible way out of the sheet. With
    // shrink enabled the sheet resolves to min(basis, available) instead, and
    // `sheetListContainer`'s `flex: 1` absorbs all of it, so the header and the
    // search field keep their exact dimensions and the list gets the remainder.
    // Nothing about the no-keyboard state changes: the basis fits, so it does
    // not shrink. REMOVING THIS RESTORES THE DEFECT.
    flexShrink: 1,
  },
  // Handle
  handleArea: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.silverSage,
  },
  // Header
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: Spacing.sm,
  },
  sheetTitleContainer: {
    flex: 1,
    marginRight: Spacing.md,
  },
  sheetTitle: {
    fontSize: Typography.fontSize.lg, // 18px
    fontWeight: Typography.fontWeight.medium,
    color: Colors.softCharcoal,
    marginBottom: 2,
  },
  sheetSubtitle: {
    fontSize: Typography.fontSize.sm, // 14px
    fontWeight: Typography.fontWeight.regular,
    color: Colors.mutedSageGray,
  },
  sheetCloseButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -4,
    marginRight: -8,
  },
  // Search
  sheetSearchContainer: {
    paddingHorizontal: 24,
    paddingTop: Spacing.base, // 16px top margin
    paddingBottom: Spacing.md,
  },
  sheetSearchField: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.silverSage,
    borderRadius: Layout.borderRadius.md, // 8px
    paddingHorizontal: 14,
    gap: Spacing.sm,
  },
  sheetSearchFieldFocused: {
    borderColor: Colors.evergreenTeal,
  },
  sheetSearchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: Typography.fontWeight.regular,
    color: Colors.text.primary,
    paddingVertical: 0,
  },
  // User list
  sheetListContainer: {
    flex: 1,
  },
  sheetListContent: {
    paddingBottom: 32,
  },
  sheetLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl * 2,
  },
  sheetEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  sheetEmptyTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  sheetEmptySubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  // Connection rows
  connectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: 24,
  },
  connectionSeparator: {
    height: 1,
    backgroundColor: 'rgba(184, 205, 186, 0.5)', // Silver Sage at 50%
    marginLeft: 24 + 40 + 12, // padding + avatar + gap
  },
  connectionAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  connectionAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.evergreenTeal,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  connectionAvatarText: {
    fontSize: Typography.fontSize.sm, // 14px
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textOnPrimary,
  },
  connectionName: {
    flex: 1,
    fontSize: Typography.fontSize.base, // 16px
    fontWeight: Typography.fontWeight.regular,
    color: Colors.softCharcoal,
  },
});

export default ConversationsScreen;
