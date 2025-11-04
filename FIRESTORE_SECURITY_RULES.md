# Firestore Security Rules Documentation

## Overview

This document explains the comprehensive security rules implemented for the Vara wellness app. These rules replace the insecure default rules that allowed any authenticated user to read/write all data.

## 🔒 Security Model

### Authentication Requirement
- **All operations require authentication** - No unauthenticated access
- Users can only access data they own or have explicit permissions to view
- Cloud Functions (using Admin SDK) bypass these rules for system operations

### Key Security Principles

1. **Data Isolation**: Users can only access their own personal data (goals, habits, tasks, journal entries)
2. **Privacy Controls**: User profiles respect privacy settings (public/connections/private)
3. **Group Membership**: Access to group content requires membership
4. **Message Privacy**: Only conversation participants can read messages
5. **Notification Security**: Only recipients can read their notifications

---

## 📚 Collection-by-Collection Rules

### Personal Data Collections

#### `users/{userId}` - User Profiles
- **Read**: Based on privacy settings
  - `public`: Anyone authenticated can read
  - `connections`: Only connected users can read
  - `private`: Only the user themselves can read
  - Default: `public` if privacy field not set
- **Create/Update**: Only the user can modify their own profile
- **Delete**: Not allowed (use Cloud Function if needed)

**Sub-collections:**
- `users/{userId}/moods` - Only owner can read/write
- `users/{userId}/goals` - Only owner can read/write (legacy pattern)

#### `goals/{goalId}` - User Goals
- **Read**: Only the goal owner (via `userId` field)
- **Create**: User must be the owner in the document
- **Update/Delete**: Only the goal owner

#### `habits/{habitId}` - User Habits
- **Read**: Only the habit owner (via `userId` field)
- **Create**: User must be the owner in the document
- **Update/Delete**: Only the habit owner

#### `tasks/{taskId}` - User Tasks
- **Read**: Only the task owner (via `userId` field)
- **Create**: User must be the owner in the document
- **Update/Delete**: Only the task owner

#### `journalEntries/{entryId}` - Journal Entries
- **Read**: Only the entry owner (via `userId` field)
- **Create**: User must be the owner in the document
- **Update/Delete**: Only the entry owner

---

### Community Features

#### `groups/{groupId}` - Community Groups
- **Read**:
  - Public groups: Any authenticated user
  - Private groups: Only members
- **Create**: Any authenticated user (must set themselves as owner)
- **Update**: Group owner or members (for join/leave operations)
- **Delete**: Only group owner

**Note**: Supports both `visibility` and `type` fields for public/private distinction

#### `posts/{postId}` - Group Forum Posts
- **Read**: If user can read the group (member or public group)
- **Create**: User must be a group member and set themselves as author
- **Update/Delete**: Post author or group owner

---

### Connections & Social

#### `connections/{connectionId}` - User Connections
Uses **pairId pattern**: Document ID is sorted UIDs joined with `_`

- **Read**: If user is participant `a` or `b`
- **Create**: If user is participant `a` or `b`
- **Update**: If user is participant (to accept/decline requests)
- **Delete**: If user is participant

**Connection Status Values:**
- `pending` - Connection request sent
- `accepted` - Connection established
- `declined` - Connection request declined

#### `connectionRequests/{requestId}` - Legacy Connection Requests
- **Read**: If user is `from` or `to`
- **Create**: User must be the `from` user
- **Update**: Only the `to` user (to accept/decline)
- **Delete**: Either participant

#### `connectionInvites/{inviteId}` - Connection Invite Triggers
Triggers Cloud Function for notifications

- **Read**: If user is `from` or `to`
- **Create**: User must be the `from` user
- **Update**: Only the `to` user
- **Delete**: Either participant

---

### Messaging

#### `conversations/{conversationId}` - Message Conversations
- **Read**: If user is in `participants` array
- **Create**: If user is in `participants` array
- **Update**: If user is a participant (for `lastMessage` updates)
- **Delete**: Not allowed

#### `directMessages/{messageId}` - Individual Messages
- **Read**: If user is `senderId` or `receiverId`
- **Create**: User must be the `senderId`
- **Update/Delete**: **Not allowed** - messages are immutable

---

### Notifications

#### `notifications/{notificationId}` - In-App Notifications
- **Read**: Only the recipient (`userId` or `recipientId`)
- **Create**: **Not allowed** - Cloud Functions create notifications
- **Update**: Only recipient (to mark as read)
- **Delete**: Only recipient

**Note**: Supports both `userId` (legacy) and `recipientId` (new) field names

---

## 🔧 Helper Functions

### `isAuthenticated()`
Checks if user is logged in

### `isOwner(userId)`
Checks if current user matches the given userId

### `areConnected(otherUserId)`
Checks if two users have an accepted connection
- Uses `get()` to fetch connection document
- Constructs pairId from sorted UIDs
- Returns true if status is 'accepted'

**Performance Note**: Uses document reads, counts toward quota

### `canReadProfile(userId)`
Checks if user can read a profile based on privacy settings
- Owner can always read own profile
- Public (or null): Anyone can read
- Connections: Only connected users can read
- Private: Only owner can read

### `isGroupMember(groupId)`
Checks if user is in group's `members` array

### `isGroupOwner(groupId)`
Checks if user is the group's `ownerId`

### `isPublicGroup(groupId)`
Checks if group is public via `visibility` or `type` field

---

## 🚀 Deployment

### Testing Locally (Firebase Emulator)
```bash
# Start emulators with security rules
firebase emulators:start

# Test rules in Emulator UI
open http://localhost:4000
```

### Deploy to Production
```bash
# Deploy only security rules
firebase deploy --only firestore:rules

# Or deploy everything
firebase deploy
```

### Verify Deployment
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `vara-4a99f`
3. Navigate to Firestore Database → Rules
4. Verify rules are updated with new timestamp

---

## ⚠️ Important Considerations

### 1. Document Read Costs
The `areConnected()` and `canReadProfile()` functions use `get()` calls, which count as document reads. This is necessary for security but impacts quotas.

**Optimization suggestions:**
- Cache connection status in client
- Use Cloud Functions to denormalize data where appropriate
- Monitor Firestore usage in Firebase Console

### 2. Default Privacy Settings
Profiles without a `privacy` field default to **public**. Ensure your signup flow sets privacy:

```javascript
// In signup/onboarding
await setDoc(doc(db, 'users', user.uid), {
  displayName: name,
  email: email,
  privacy: 'public', // or 'connections' or 'private'
  // ... other fields
});
```

### 3. Group Visibility Fields
Rules support both naming patterns:
- `visibility: 'public'` or `visibility: 'private'`
- `type: 'public'` or `type: 'private'`

**Recommendation**: Standardize on one field name across your codebase.

### 4. Cloud Functions Bypass Rules
Cloud Functions using Admin SDK bypass these rules entirely. This is by design and allows system operations (creating notifications, cleanup tasks, etc.).

Ensure Cloud Function code validates data appropriately.

### 5. Testing Recommendations
Test these scenarios thoroughly:
- User cannot read another user's goals/habits/tasks/journal
- Private profiles are not visible to non-connections
- Group posts are not visible to non-members
- Messages are only readable by participants
- Connection requests work correctly with pairId pattern

---

## 🐛 Troubleshooting

### "Missing or insufficient permissions" Errors

**Check:**
1. User is authenticated (`request.auth != null`)
2. User owns the resource they're trying to access
3. Privacy settings are correct
4. Group membership is up-to-date
5. Connection status is 'accepted' if privacy is 'connections'

**Common causes:**
- Trying to read another user's private data
- Accessing group content without membership
- Profile privacy set to 'connections' but not connected
- Using wrong field names (userId vs recipientId)

### Rules Not Taking Effect

**Solutions:**
1. Re-deploy rules: `firebase deploy --only firestore:rules`
2. Clear browser cache and reload
3. Check Firebase Console for rule syntax errors
4. Verify in Firestore Rules tab that rules are deployed

### Performance Issues

If experiencing slow queries due to `get()` calls in rules:
1. Monitor in Firebase Console → Firestore → Usage
2. Consider denormalizing connection status
3. Cache results on client side when possible
4. Review query patterns and indexes

---

## 📝 Migration Notes

### Before These Rules
- Any authenticated user could read/write all data
- No privacy controls enforced
- Group membership not validated
- Message privacy not enforced

### After These Rules
- Strict data isolation per user
- Privacy settings enforced
- Group membership required for access
- Message participants validated

**Breaking Changes:**
- Admin tools must use Admin SDK (not client SDK)
- Background jobs must use Cloud Functions with Admin SDK
- Any cross-user queries not following privacy rules will fail

---

## 🔐 Security Audit Checklist

- [x] Personal data isolated to owners
- [x] Profile privacy settings enforced
- [x] Group membership validated
- [x] Message privacy protected
- [x] Notification recipients validated
- [x] Connection status checked for 'connections' privacy
- [x] Post authors must be group members
- [x] Profile deletion prevented (use Cloud Function)
- [x] Message immutability enforced
- [x] Notification creation restricted to Cloud Functions

---

## 📞 Support

For issues or questions about security rules:
1. Check troubleshooting section above
2. Review [Firestore Security Rules docs](https://firebase.google.com/docs/firestore/security/rules-structure)
3. Test rules in Firebase Emulator
4. Review audit logs in Firebase Console

---

**Last Updated**: 2025-11-01
**Rules Version**: 2
**Project**: vara-4a99f
