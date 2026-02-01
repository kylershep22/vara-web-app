/**
 * Groups Screen
 * Browse and join community groups
 */

import React, { useState, useMemo } from 'react';
import { View, StyleSheet, FlatList, Alert, TextInput as RNTextInput, Keyboard, InputAccessoryView, Platform, ScrollView, KeyboardAvoidingView, TouchableOpacity } from 'react-native';
import { Text, SegmentedButtons, Searchbar, FAB, Portal, Modal, Button as PaperButton, Switch, Avatar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Button, Card, LoadingSpinner, Input } from '../../components';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { useGroups } from '../../hooks';
import { useAuth } from '../../context/AuthContext';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { createGroup } from '../../services/firebase';

const INPUT_ACCESSORY_VIEW_ID = 'groupsInputAccessory';

const GroupsScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [filter, setFilter] = useState<'all' | 'my' | 'public'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { groups, loading, joinGroup, leaveGroup, isUserMember } = useGroups(filter);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    setSubmitting(true);
    try {
      await createGroup({
        name: groupName,
        description: groupDescription,
        visibility: isPublic ? 'public' : 'private',
        ownerId: user!.uid,
      });
      setGroupName('');
      setGroupDescription('');
      setIsPublic(true);
      setShowCreateGroup(false);
      Alert.alert('Success', 'Group created successfully!');
    } catch (error) {
      console.error('Error creating group:', error);
      Alert.alert('Error', 'Failed to create group. Please try again.');
    } finally {
      setSubmitting(false);
    }
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
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => navigation.navigate('GroupDetail', {
                  groupId: item.id,
                  groupName: item.name,
                })}
              >
                <Card style={styles.groupCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.groupIconSmall}>
                      <Icon name="account-group" size={24} color={Colors.evergreenTeal} />
                    </View>
                    <View style={styles.cardHeaderText}>
                      <Text variant="titleMedium" style={styles.groupName}>
                        {item.name}
                      </Text>
                      <View style={styles.groupMetaInline}>
                        <Icon name="account" size={12} color={Colors.textSecondary} />
                        <Text variant="bodySmall" style={styles.groupMetaText}>
                          {item.memberCount || item.members?.length || 0} members
                        </Text>
                        <Text variant="bodySmall" style={styles.metaDivider}>·</Text>
                        <Icon
                          name={item.isPublic ? 'earth' : 'lock'}
                          size={12}
                          color={Colors.textSecondary}
                        />
                        <Text variant="bodySmall" style={styles.groupMetaText}>
                          {item.isPublic ? 'Public' : 'Private'}
                        </Text>
                      </View>
                    </View>
                    {isMember && (
                      <View style={styles.memberBadge}>
                        <Icon name="check-circle" size={16} color={Colors.evergreenTeal} />
                      </View>
                    )}
                  </View>
                  {item.description && (
                    <Text
                      variant="bodyMedium"
                      style={styles.groupDescription}
                      numberOfLines={2}
                    >
                      {item.description}
                    </Text>
                  )}
                  <View style={styles.cardFooter}>
                    {isMember ? (
                      <Button
                        variant="outline"
                        compact
                        style={styles.joinButton}
                        onPress={() => handleLeaveGroup(item.id, item.name)}
                      >
                        Leave
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        compact
                        style={styles.joinButton}
                        onPress={() => handleJoinGroup(item.id, item.name)}
                      >
                        Join
                      </Button>
                    )}
                    <View style={styles.viewGroupHint}>
                      <Text variant="bodySmall" style={styles.viewGroupText}>
                        Tap to view
                      </Text>
                      <Icon name="chevron-right" size={16} color={Colors.textSecondary} />
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            );
          }}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* FAB for Create Group */}
      <FAB
        icon="plus"
        label="Create Group"
        style={styles.fab}
        onPress={() => setShowCreateGroup(true)}
        color={Colors.textOnPrimary}
      />

      {/* Create Group Modal */}
      <Portal>
        <Modal
          visible={showCreateGroup}
          onDismiss={() => {
            Keyboard.dismiss();
            setShowCreateGroup(false);
          }}
          contentContainerStyle={styles.modal}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              <Text variant="headlineSmall" style={styles.modalTitle}>
                Create New Group
              </Text>

              <Input
                label="Group Name *"
                value={groupName}
                onChangeText={setGroupName}
                placeholder="e.g., Morning Meditation Circle"
                style={styles.input}
              />

              <Input
                label="Description"
                value={groupDescription}
                onChangeText={setGroupDescription}
                placeholder="What is this group about?"
                multiline
                numberOfLines={3}
                style={styles.input}
              />

              <View style={styles.switchContainer}>
                <View style={styles.switchLabel}>
                  <Text variant="bodyLarge" style={styles.switchLabelText}>
                    Public Group
                  </Text>
                  <Text variant="bodySmall" style={styles.switchDescription}>
                    Anyone can discover and join
                  </Text>
                </View>
                <Switch
                  value={isPublic}
                  onValueChange={setIsPublic}
                  color={Colors.evergreenTeal}
                />
              </View>

              <View style={styles.modalActions}>
                <PaperButton
                  mode="outlined"
                  onPress={() => setShowCreateGroup(false)}
                  style={styles.modalButton}
                >
                  Cancel
                </PaperButton>
                <PaperButton
                  mode="contained"
                  onPress={handleCreateGroup}
                  loading={submitting}
                  disabled={submitting || !groupName.trim()}
                  style={styles.modalButton}
                  buttonColor={Colors.evergreenTeal}
                >
                  Create
                </PaperButton>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>
      </Portal>

      {/* Keyboard Accessory Toolbar (iOS) */}
      {Platform.OS === 'ios' && (
        <InputAccessoryView nativeID={INPUT_ACCESSORY_VIEW_ID}>
          <View style={styles.keyboardAccessory}>
            <Button variant="text" onPress={() => Keyboard.dismiss()}>
              Done
            </Button>
          </View>
        </InputAccessoryView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.mistWhite,
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  groupIconSmall: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.dewSage,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  cardHeaderText: {
    flex: 1,
  },
  groupName: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.semibold,
  },
  groupMetaInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: 2,
  },
  metaDivider: {
    color: Colors.textSecondary,
  },
  memberBadge: {
    marginLeft: Spacing.sm,
  },
  groupDescription: {
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    marginLeft: Spacing.xl + Spacing.md + 4, // Align with text after icon
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  groupMetaText: {
    color: Colors.textSecondary,
  },
  joinButton: {
    minWidth: 80,
  },
  viewGroupHint: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewGroupText: {
    color: Colors.textSecondary,
    marginRight: Spacing.xs,
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
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.lg,
    backgroundColor: Colors.evergreenTeal,
  },
  modal: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.lg,
    maxHeight: '85%',
  },
  scrollContent: {
    paddingBottom: Spacing.md,
  },
  modalTitle: {
    color: Colors.evergreenTeal,
    marginBottom: Spacing.lg,
    fontWeight: Typography.fontWeight.semibold,
  },
  input: {
    marginBottom: Spacing.md,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    marginBottom: Spacing.lg,
    borderTopWidth: Layout.borderWidth.thin,
    borderBottomWidth: Layout.borderWidth.thin,
    borderColor: Colors.borderLight,
  },
  switchLabel: {
    flex: 1,
  },
  switchLabelText: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.medium,
    marginBottom: Spacing.xs / 2,
  },
  switchDescription: {
    color: Colors.textSecondary,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  modalButton: {
    flex: 1,
  },
  keyboardAccessory: {
    backgroundColor: Colors.surface,
    borderTopWidth: Layout.borderWidth.thin,
    borderTopColor: Colors.borderLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
});

export default GroupsScreen;
