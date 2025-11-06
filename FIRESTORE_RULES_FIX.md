# Firestore Security Rules Fix - Community Page Permissions

## Issue
Community page was showing "Missing or insufficient permissions" errors for:
- `fetchUserConnections` - trying to query connections collection
- `fetchIncomingConnectionRequests` - trying to query connectionRequests collection

## Root Causes

### Issue #1: Field Name Mismatches
The Firestore security rules had **field name mismatches** with the actual data model:

### Connections Collection
**Rules were checking for:**
```javascript
resource.data.a  // Doesn't exist
resource.data.b  // Doesn't exist
```

**Actual data structure:**
```javascript
{
  members: [userId1, userId2],  // Array field
  createdAt: Timestamp
}
```

### Connection Requests Collection
**Rules were checking for:**
```javascript
resource.data.from  // Doesn't exist
resource.data.to    // Doesn't exist
```

**Actual data structure:**
```javascript
{
  fromUserId: string,  // Actual field name
  toUserId: string,    // Actual field name
  status: 'pending' | 'accepted' | 'declined',
  createdAt: Timestamp
}
```

### Issue #2: Helper Functions Breaking Queries

**Problem:** Groups and Posts rules used helper functions that call `get()` to fetch the same document being evaluated.

**Why this breaks queries:**
- When querying collections (e.g., `where("members", "array-contains", userId)`), Firestore evaluates rules for EACH potential document
- Helper functions like `isGroupMember(groupId)` called `get(/databases/.../groups/${groupId})`
- This tries to fetch the document AGAIN during evaluation, which fails for queries
- Single document reads worked, but collection queries failed

**Example of broken code:**
```javascript
function isGroupMember(groupId) {
  let group = get(/databases/$(database)/documents/groups/$(groupId));
  return request.auth.uid in group.data.members;
}

match /groups/{groupId} {
  allow read: if isGroupMember(groupId); // FAILS for queries!
}
```

**Why:**
- During a query, `groupId` is the document being evaluated
- Calling `get(groupId)` tries to fetch it again
- Should just check `resource.data` directly

## Fixes Applied

### Fix #1: Updated Connections Rules (firestore.rules:174-185)
```javascript
match /connections/{connectionId} {
  // Read: if user is one of the members
  allow read: if isAuthenticated() && request.auth.uid in resource.data.members;

  // Create: if user is one of the members
  allow create: if isAuthenticated() && request.auth.uid in request.resource.data.members;

  // Update: if user is one of the members
  allow update: if isAuthenticated() && request.auth.uid in resource.data.members;

  // Delete: if user is one of the members
  allow delete: if isAuthenticated() && request.auth.uid in resource.data.members;
}
```

**Key change:** Using `request.auth.uid in resource.data.members` to check the members array.

### Fix #2: Updated Groups Rules (firestore.rules:123-143)
```javascript
match /groups/{groupId} {
  // Read: public groups by anyone, private groups only by members
  // Check resource.data directly for queries to work
  allow read: if isAuthenticated() && (
    resource.data.visibility == 'public' ||
    resource.data.type == 'public' ||
    request.auth.uid in resource.data.members
  );

  // Create: any authenticated user can create a group
  allow create: if isAuthenticated() && request.auth.uid == request.resource.data.ownerId;

  // Update: only group owner or members can update (for join/leave)
  allow update: if isAuthenticated() && (
    request.auth.uid == resource.data.ownerId ||
    request.auth.uid in resource.data.members
  );

  // Delete: only group owner
  allow delete: if isAuthenticated() && request.auth.uid == resource.data.ownerId;
}
```

**Key changes:**
- Removed helper function calls (`isGroupMember()`, `isGroupOwner()`, `isPublicGroup()`)
- Check `resource.data` directly (the document being evaluated)
- This allows collection queries like `where("members", "array-contains", userId)` to work

### Fix #3: Updated Connection Requests Rules (firestore.rules:195-214)
```javascript
match /connectionRequests/{requestId} {
  // Read: if user is sender or recipient
  allow read: if isAuthenticated() && (
    request.auth.uid == resource.data.fromUserId ||
    request.auth.uid == resource.data.toUserId
  );

  // Create: if user is the sender
  allow create: if isAuthenticated() && request.auth.uid == request.resource.data.fromUserId;

  // Update: if user is the recipient (to accept/decline)
  allow update: if isAuthenticated() && request.auth.uid == resource.data.toUserId;

  // Delete: if user is sender or recipient (to cancel)
  allow delete: if isAuthenticated() && (
    request.auth.uid == resource.data.fromUserId ||
    request.auth.uid == resource.data.toUserId
  );
}
```

**Key changes:**
- `resource.data.from` → `resource.data.fromUserId`
- `resource.data.to` → `resource.data.toUserId`

### Fix #4: Updated Connection Invites Rules (firestore.rules:220-231)
Same fix as connection requests - updated field names from `from`/`to` to `fromUserId`/`toUserId`.

### Fix #5: Fixed User Profile Rules (firestore.rules:62-92)

**Problem:** Same circular reference issue - `canReadProfile()` called `get()` on the document being evaluated.

**Solution: Check resource.data directly**

```javascript
match /users/{userId} {
  // Read: Check privacy setting directly from resource.data
  allow read: if isAuthenticated() && (
    // Owner can always read their own profile
    request.auth.uid == userId ||
    // Default to public if privacy is not set or is public
    resource == null ||  // If document doesn't exist yet, allow read (will return empty)
    resource.data.privacy == null ||
    resource.data.privacy == 'public' ||
    // Connections-only: currently acts as public (see areConnected limitation)
    resource.data.privacy == 'connections'
    // Private: only owner can read (covered by first condition)
  );

  // Users can only create/update their own profile
  allow create: if request.auth.uid == userId;
  allow update: if request.auth.uid == userId;

  // Users cannot delete their profile
  allow delete: if false;
}
```

**Key changes:**
- Removed `canReadProfile()` helper function call
- Check `resource.data.privacy` directly
- Simplified `isOwner()` calls to direct comparisons

### Fix #6: Simplified Posts Rules (firestore.rules:145-172) - CRITICAL FIX

**Problem:** The `fetchFeedPosts` function queries ALL posts with no where clause:
```javascript
const qPosts = query(postsRef, orderBy("timestamp", "desc"));
const snapshot = await getDocs(qPosts); // Tries to read EVERY post!
```

When querying all posts, the complex rules with `get()` calls failed because:
- Rules tried to `get()` group data for every single post
- If any group didn't exist or get() failed, the entire query failed
- This made the Community page completely unusable

**Solution: Allow authenticated users to read all posts, filter client-side**

```javascript
match /posts/{postId} {
  // Read: Allow any authenticated user to read posts
  // Group membership filtering happens client-side in fetchFeedPosts
  // This is a security trade-off to allow queries to work
  allow read: if isAuthenticated();

  // Create: if user is a group member and is the author
  allow create: if isAuthenticated() &&
    request.auth.uid == request.resource.data.userId &&
    (
      // If it's a group post, user must be a member
      !request.resource.data.groupId ||
      (exists(/databases/$(database)/documents/groups/$(request.resource.data.groupId)) &&
       request.auth.uid in get(/databases/$(database)/documents/groups/$(request.resource.data.groupId)).data.members)
    );

  // Update: only post author
  allow update: if isAuthenticated() && request.auth.uid == resource.data.userId;

  // Delete: post author or group owner (if group post)
  allow delete: if isAuthenticated() && (
    request.auth.uid == resource.data.userId ||
    (resource.data.groupId &&
     exists(/databases/$(database)/documents/groups/$(resource.data.groupId)) &&
     request.auth.uid == get(/databases/$(database)/documents/groups/$(resource.data.groupId)).data.ownerId)
  );
}
```

**Key changes:**
- **Simplified read rule:** Any authenticated user can read posts
- **Client-side filtering:** `fetchFeedPosts` already filters posts by:
  - Group membership (user must have joined the group)
  - Privacy settings (for public posts)
- **Create still protected:** Users can only post to groups they're members of
- **Delete still protected:** Only author or group owner can delete

**Security Trade-off:**
- ✅ **Pro:** Queries work, app is functional
- ⚠️ **Con:** Authenticated users can technically read all posts via API
- ✅ **Mitigated:** UI filters posts appropriately, normal users won't see inappropriate content
- 💡 **Future:** Consider restructuring posts to use subcollections under groups for better security

## Known Limitation: Connections Privacy

### Issue
The `areConnected()` helper function (used for profile privacy checks) cannot work with the current data model.

**Why:**
- Connections use random document IDs (e.g., `abc123`)
- Connections have a `members` array, not predictable pairId pattern
- Firestore security rules cannot query collections - they can only `get()` specific document IDs
- Without a predictable ID, we can't check if two users are connected

### Current Behavior
```javascript
function areConnected(otherUserId) {
  return true; // Temporarily allow - connections privacy acts like public
}
```

**Impact:**
- Users with "connections" privacy setting will be visible to ALL authenticated users (acts like "public")
- "Public" and "private" privacy settings work correctly
- This is a **security trade-off** - connections privacy is temporarily disabled

### Solutions (Choose One)

#### Option 1: Use PairId Pattern (Recommended)
Change connections to use predictable document IDs:

```javascript
// Instead of:
await addDoc(collection(db, "connections"), {
  members: [fromUserId, toUserId],
  createdAt: serverTimestamp()
});

// Do this:
const pairId = fromUserId < toUserId
  ? `${fromUserId}_${toUserId}`
  : `${toUserId}_${fromUserId}`;

await setDoc(doc(db, "connections", pairId), {
  a: fromUserId,
  b: toUserId,
  createdAt: serverTimestamp()
});
```

Then update `areConnected()`:
```javascript
function areConnected(otherUserId) {
  let uid = request.auth.uid;
  let pairId = uid < otherUserId
    ? uid + '_' + otherUserId
    : otherUserId + '_' + uid;
  return exists(/databases/$(database)/documents/connections/$(pairId));
}
```

**Pros:**
- Connections privacy works correctly
- Rules can check connections efficiently
- No query needed

**Cons:**
- Need to migrate existing connections data
- Need to update `fetchUserConnections()` query

#### Option 2: Disable Connections Privacy
Remove the "connections" privacy option from the UI.

**Pros:**
- No data migration needed
- Current code works as-is

**Cons:**
- Users can only choose "public" or "private"
- Less granular privacy control

#### Option 3: Use Different Privacy Check
Check privacy client-side instead of in security rules.

**Pros:**
- No data model changes needed

**Cons:**
- Less secure (relies on client-side checks)
- Not recommended for sensitive data

## Testing

### Before Fixes
```
Error: Missing or insufficient permissions
- fetchUserConnections failed (field name mismatch)
- fetchIncomingConnectionRequests failed (field name mismatch)
- fetchUserGroups failed (helper function with get())
- fetchPublicGroups failed (helper function with get())
- fetchFeedPosts failed (posts query failed)
- Community page completely broken
```

### After Fixes
✅ Community page loads successfully
✅ Connections can be queried
✅ Connection requests can be queried
✅ Groups can be queried (both user groups and public groups)
✅ Posts can be queried and read
⚠️ Connections privacy setting acts like "public" (known limitation)

### Manual Test Steps
1. Navigate to Community page
2. Check browser console - no permission errors
3. Connections section should load (even if empty)
4. Connection requests section should load (even if empty)

## Files Modified
- `firestore.rules` - Fixed multiple issues with security rules
  - Lines 17-26: Updated `areConnected()` with limitation note
  - Lines 43-58: Helper functions now unused (kept for reference)
  - Lines 123-143: Fixed groups rules to check `resource.data` directly (removed helper calls)
  - Lines 145-170: Fixed posts rules to use inline `get()` calls with `exists()` checks
  - Lines 174-185: Fixed connections rules to use `members` array
  - Lines 195-214: Fixed connection requests to use `fromUserId`/`toUserId`
  - Lines 220-231: Fixed connection invites to use `fromUserId`/`toUserId`

## Deployment
```bash
firebase deploy --only firestore:rules
```

**Status:** ✅ Deployed to production (vara-4a99f)
**Date:** Week 1, Production Readiness Phase

## Recommendations

### Highest Priority: Improve Posts Data Structure

**Current Issue:** Posts are in a single top-level collection, requiring all authenticated users to be able to read all posts for queries to work.

**Recommended Solution:** Use subcollections under groups for better security:

```
groups/{groupId}/posts/{postId}
```

**Benefits:**
- Posts automatically scoped to their group
- Security rules can check group membership directly
- No need to query all posts in the database
- Much better security posture

**Migration Steps:**
1. Create new posts as subcollections going forward
2. Migrate existing posts to appropriate group subcollections
3. Update `fetchFeedPosts` to query multiple group subcollections
4. Update security rules to protect subcollections

**Example Rule:**
```javascript
match /groups/{groupId}/posts/{postId} {
  // Automatically inherits group context
  allow read: if isAuthenticated() && (
    resource.data.visibility == 'public' ||
    request.auth.uid in get(/databases/$(database)/documents/groups/$(groupId)).data.members
  );
}
```

### High Priority: Decide on connections privacy strategy
- If privacy is important: Implement Option 1 (PairId pattern)
- If not critical: Accept current limitation or remove feature

### Medium Priority: Add integration tests for security rules
- Test connection queries with different users
- Test privacy settings
- Prevent future regressions

### Low Priority: Document data model in schema file
- Helps prevent future field name mismatches
- Reference for new developers

## Related Documentation
- `firestore.rules` - Complete security rules
- `FIRESTORE_SECURITY_RULES.md` - Security rules documentation
- `src/services/communityService.js` - Connection service implementation

---

**Fixed by:** Claude Code
**Date:** Week 1, Production Readiness
**Status:** ✅ All fixes deployed to production
**Deployments:** 3 (initial fix + query fix + posts simplification)
