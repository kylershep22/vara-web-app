/**
 * MembersModal
 * Modal displaying group member list with owner badge.
 */

import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { UserProfile } from '../../services/firebase/community.service';

export interface MembersModalProps {
  visible: boolean;
  members: UserProfile[];
  ownerId: string;
  onDismiss: () => void;
}

const MembersModal = memo(({ visible, members, ownerId, onDismiss }: MembersModalProps) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
    <View style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: Spacing.lg}}>
    <View style={memberStyles.membersModal}>
      <Text style={memberStyles.modalTitle}>
        Members ({members.length})
      </Text>

      <FlatList
        data={members}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={memberStyles.memberItem}>
            <View style={[memberStyles.memberAvatar, {width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center'}]}>
              <Text style={{color: Colors.textOnPrimary, fontSize: 14, fontWeight: '600'}}>
                {(item.displayName || 'U').substring(0, 2).toUpperCase()}
              </Text>
            </View>
            <View style={memberStyles.memberInfo}>
              <Text style={memberStyles.memberName}>
                {item.displayName || 'Unknown User'}
              </Text>
              {item.id === ownerId && (
                <View style={[memberStyles.ownerChip, {paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12}]}>
                  <Text style={memberStyles.ownerChipText}>Host</Text>
                </View>
              )}
            </View>
          </View>
        )}
        style={memberStyles.membersList}
      />

      <TouchableOpacity
        onPress={onDismiss}
        style={[memberStyles.modalButton, {borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingVertical: 10, alignItems: 'center' as const}]}
      >
        <Text style={{color: Colors.textPrimary, fontSize: 14, fontWeight: '500'}}>Close</Text>
      </TouchableOpacity>
    </View>
    </View>
    </Modal>
  );
});

const memberStyles = StyleSheet.create({
  membersModal: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.lg,
    maxHeight: '70%',
  },
  modalTitle: {
    color: Colors.evergreenTeal,
    marginBottom: Spacing.lg,
    fontWeight: Typography.fontWeight.semibold,
  },
  membersList: {
    maxHeight: 300,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: Layout.borderWidth.thin,
    borderBottomColor: Colors.borderLight,
  },
  memberAvatar: {
    backgroundColor: Colors.evergreenTeal,
    marginRight: Spacing.base,
  },
  memberInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  memberName: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.medium,
  },
  ownerChip: {
    backgroundColor: Colors.dewSage,
    height: 24,
  },
  ownerChipText: {
    fontSize: 12,
    color: Colors.evergreenTeal,
  },
  modalButton: {
    flex: 1,
  },
});

export default MembersModal;
