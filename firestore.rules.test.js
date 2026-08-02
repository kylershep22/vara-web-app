/**
 * Firestore Security Rules Test Suite
 *
 * Tests comprehensive security rules for the Vara wellness app
 *
 * Run with: npm run test:rules
 * Or manually: firebase emulators:exec --only firestore "npm test -- firestore.rules.test.js"
 */

const {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} = require('@firebase/rules-unit-testing');
const { setDoc, getDoc, doc, updateDoc, deleteDoc, collection, addDoc, query, where, getDocs } = require('firebase/firestore');
const fs = require('fs');

let testEnv;

// Test user IDs
const ALICE_UID = 'alice123';
const BOB_UID = 'bob456';
const CHARLIE_UID = 'charlie789';

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'vara-test-project',
    firestore: {
      rules: fs.readFileSync('firestore.rules', 'utf8'),
      host: 'localhost',
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

// ============================================
// HELPER FUNCTIONS
// ============================================

function getAuthContext(uid) {
  return testEnv.authenticatedContext(uid);
}

function getUnauthContext() {
  return testEnv.unauthenticatedContext();
}

/**
 * Seed data with security rules bypassed.
 *
 * Replaces the removed `testEnv.firestore()`. @firebase/rules-unit-testing v5
 * dropped that accessor; the supported way to write fixture data that the rules
 * would otherwise reject is `testEnv.withSecurityRulesDisabled(ctx => ...)`.
 *
 * This wrapper exists so the v5 API appears in exactly ONE place rather than at
 * every seed site, and so callers keep the old ergonomics — `withSecurityRulesDisabled`
 * resolves to undefined, which would otherwise force every test that needs the
 * created ref (for `ref.id`) to hoist a `let` above the callback. Returning the
 * callback's value keeps those sites a one-line change and leaves every
 * assertion untouched.
 *
 *   const ref = await withAdminDb((adminDb) => addDoc(collection(adminDb, 'goals'), {...}));
 *
 * Seeding is deliberately rules-bypassed: these documents are preconditions for
 * the assertion, not the thing under test. Tests that mean to exercise a write
 * rule use an authenticated context and assertSucceeds/assertFails instead.
 */
async function withAdminDb(fn) {
  let result;
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    result = await fn(ctx.firestore());
  });
  return result;
}

async function setupUserProfile(uid, data = {}) {
  await withAdminDb((adminDb) =>
    setDoc(doc(adminDb, 'users', uid), {
      displayName: data.displayName || `User ${uid}`,
      email: data.email || `${uid}@test.com`,
      privacy: data.privacy || 'public',
      createdAt: new Date(),
      ...data,
    })
  );
}

async function setupConnection(uidA, uidB, status = 'accepted') {
  const pairId = [uidA, uidB].sort().join('_');
  await withAdminDb((adminDb) =>
    setDoc(doc(adminDb, 'connections', pairId), {
      a: [uidA, uidB].sort()[0],
      b: [uidA, uidB].sort()[1],
      status,
      createdAt: new Date(),
    })
  );
}

async function setupGroup(groupId, ownerId, members = [], visibility = 'public') {
  await withAdminDb((adminDb) =>
    setDoc(doc(adminDb, 'groups', groupId), {
      ownerId,
      name: `Test Group ${groupId}`,
      visibility,
      members,
      memberCount: members.length,
      createdAt: new Date(),
    })
  );
}

/**
 * Seed a conversation with a known ID and participant list.
 *
 * Required by every directMessages test: both the read and the create rule
 * resolve `conversationId` against this collection and check membership of
 * `participants`. A message fixture without a conversation to point at makes
 * the rule error on an undefined property and deny unconditionally — which
 * silently turns any assertFails test into a vacuous pass.
 */
async function setupConversation(conversationId, participants) {
  await withAdminDb((adminDb) =>
    setDoc(doc(adminDb, 'conversations', conversationId), {
      participants,
      createdAt: new Date(),
    })
  );
}

// ============================================
// TEST SUITE: AUTHENTICATION
// ============================================

describe('Authentication', () => {
  test('unauthenticated users cannot read any data', async () => {
    const context = getUnauthContext();
    const db = context.firestore();

    await assertFails(getDoc(doc(db, 'users', ALICE_UID)));
    await assertFails(getDoc(doc(db, 'goals', 'goal123')));
    await assertFails(getDoc(doc(db, 'groups', 'group123')));
  });

  test('unauthenticated users cannot write any data', async () => {
    const context = getUnauthContext();
    const db = context.firestore();

    await assertFails(setDoc(doc(db, 'users', ALICE_UID), { name: 'Alice' }));
    await assertFails(setDoc(doc(db, 'goals', 'goal123'), { title: 'Test' }));
  });
});

// ============================================
// TEST SUITE: USER PROFILES
// ============================================

describe('User Profiles', () => {
  test('users can read their own profile', async () => {
    await setupUserProfile(ALICE_UID, { privacy: 'private' });

    const context = getAuthContext(ALICE_UID);
    const db = context.firestore();

    await assertSucceeds(getDoc(doc(db, 'users', ALICE_UID)));
  });

  test('users can read public profiles', async () => {
    await setupUserProfile(ALICE_UID, { privacy: 'public' });

    const context = getAuthContext(BOB_UID);
    const db = context.firestore();

    await assertSucceeds(getDoc(doc(db, 'users', ALICE_UID)));
  });

  // PENDING — the `privacy` field is NOT enforced at the rules layer.
  // `match /users/{userId}` allows read to any authenticated account and defers
  // privacy filtering to the application layer, so this assertion cannot hold
  // today. Kept (not deleted) because it states the intended contract that the
  // privacy field implies. Deferred to the Community privacy work; see
  // reconciled spec Section 21 item 9. Do NOT make this pass by weakening the
  // assertion — it passes when the rule enforces privacy.
  test.skip('users cannot read private profiles of others', async () => {
    await setupUserProfile(ALICE_UID, { privacy: 'private' });

    const context = getAuthContext(BOB_UID);
    const db = context.firestore();

    await assertFails(getDoc(doc(db, 'users', ALICE_UID)));
  });

  test('connected users can read connections-only profiles', async () => {
    await setupUserProfile(ALICE_UID, { privacy: 'connections' });
    await setupConnection(ALICE_UID, BOB_UID, 'accepted');

    const context = getAuthContext(BOB_UID);
    const db = context.firestore();

    await assertSucceeds(getDoc(doc(db, 'users', ALICE_UID)));
  });

  // PENDING — same cause as the private-profile test above: `privacy:
  // 'connections'` is not enforced at the rules layer, so a non-connected
  // authenticated account can still read the profile. Deferred to the Community
  // privacy work; see reconciled spec Section 21 item 9.
  //
  // NOTE for whoever picks that up: the two POSITIVE tests in this block
  // ('users can read public profiles', 'connected users can read
  // connections-only profiles') currently pass vacuously — the blanket read
  // rule makes them green regardless of the privacy logic. They only become
  // meaningful once these two skips are unskipped.
  test.skip('non-connected users cannot read connections-only profiles', async () => {
    await setupUserProfile(ALICE_UID, { privacy: 'connections' });

    const context = getAuthContext(BOB_UID);
    const db = context.firestore();

    await assertFails(getDoc(doc(db, 'users', ALICE_UID)));
  });

  test('users can create their own profile', async () => {
    const context = getAuthContext(ALICE_UID);
    const db = context.firestore();

    await assertSucceeds(setDoc(doc(db, 'users', ALICE_UID), {
      displayName: 'Alice',
      email: 'alice@test.com',
      privacy: 'public',
    }));
  });

  test('users cannot create profiles for others', async () => {
    const context = getAuthContext(ALICE_UID);
    const db = context.firestore();

    await assertFails(setDoc(doc(db, 'users', BOB_UID), {
      displayName: 'Bob',
      email: 'bob@test.com',
    }));
  });

  test('users can update their own profile', async () => {
    await setupUserProfile(ALICE_UID);

    const context = getAuthContext(ALICE_UID);
    const db = context.firestore();

    await assertSucceeds(updateDoc(doc(db, 'users', ALICE_UID), {
      displayName: 'Alice Updated',
    }));
  });

  test('users cannot update other profiles', async () => {
    await setupUserProfile(ALICE_UID);

    const context = getAuthContext(BOB_UID);
    const db = context.firestore();

    await assertFails(updateDoc(doc(db, 'users', ALICE_UID), {
      displayName: 'Hacked',
    }));
  });

  test('users cannot delete profiles', async () => {
    await setupUserProfile(ALICE_UID);

    const context = getAuthContext(ALICE_UID);
    const db = context.firestore();

    await assertFails(deleteDoc(doc(db, 'users', ALICE_UID)));
  });
});

// ============================================
// TEST SUITE: GOALS
// ============================================

describe('Goals (Personal Data)', () => {
  test('users can create their own goals', async () => {
    const context = getAuthContext(ALICE_UID);
    const db = context.firestore();

    await assertSucceeds(addDoc(collection(db, 'goals'), {
      userId: ALICE_UID,
      title: 'Exercise more',
      primaryFocus: 'fitness',
    }));
  });

  test('users cannot create goals for others', async () => {
    const context = getAuthContext(ALICE_UID);
    const db = context.firestore();

    await assertFails(addDoc(collection(db, 'goals'), {
      userId: BOB_UID,
      title: 'Exercise more',
    }));
  });

  test('users can read their own goals', async () => {
    const goalRef = await withAdminDb((adminDb) => addDoc(collection(adminDb, 'goals'), {
      userId: ALICE_UID,
      title: 'Exercise more',
    }));

    const context = getAuthContext(ALICE_UID);
    const db = context.firestore();

    await assertSucceeds(getDoc(doc(db, 'goals', goalRef.id)));
  });

  test('users cannot read other users goals', async () => {
    const goalRef = await withAdminDb((adminDb) => addDoc(collection(adminDb, 'goals'), {
      userId: ALICE_UID,
      title: 'Exercise more',
    }));

    const context = getAuthContext(BOB_UID);
    const db = context.firestore();

    await assertFails(getDoc(doc(db, 'goals', goalRef.id)));
  });

  test('users can update their own goals', async () => {
    const goalRef = await withAdminDb((adminDb) => addDoc(collection(adminDb, 'goals'), {
      userId: ALICE_UID,
      title: 'Exercise more',
    }));

    const context = getAuthContext(ALICE_UID);
    const db = context.firestore();

    await assertSucceeds(updateDoc(doc(db, 'goals', goalRef.id), {
      title: 'Exercise daily',
    }));
  });

  test('users cannot update other users goals', async () => {
    const goalRef = await withAdminDb((adminDb) => addDoc(collection(adminDb, 'goals'), {
      userId: ALICE_UID,
      title: 'Exercise more',
    }));

    const context = getAuthContext(BOB_UID);
    const db = context.firestore();

    await assertFails(updateDoc(doc(db, 'goals', goalRef.id), {
      title: 'Hacked',
    }));
  });

  test('users can delete their own goals', async () => {
    const goalRef = await withAdminDb((adminDb) => addDoc(collection(adminDb, 'goals'), {
      userId: ALICE_UID,
      title: 'Exercise more',
    }));

    const context = getAuthContext(ALICE_UID);
    const db = context.firestore();

    await assertSucceeds(deleteDoc(doc(db, 'goals', goalRef.id)));
  });
});

// ============================================
// TEST SUITE: HABITS (same pattern as goals)
// ============================================

describe('Habits (Personal Data)', () => {
  test('users can create their own habits', async () => {
    const context = getAuthContext(ALICE_UID);
    const db = context.firestore();

    await assertSucceeds(addDoc(collection(db, 'habits'), {
      userId: ALICE_UID,
      name: 'Meditate daily',
      frequency: 'daily',
    }));
  });

  test('users cannot read other users habits', async () => {
    const habitRef = await withAdminDb((adminDb) => addDoc(collection(adminDb, 'habits'), {
      userId: ALICE_UID,
      name: 'Meditate',
    }));

    const context = getAuthContext(BOB_UID);
    const db = context.firestore();

    await assertFails(getDoc(doc(db, 'habits', habitRef.id)));
  });
});

// ============================================
// TEST SUITE: TASKS (same pattern)
// ============================================

describe('Tasks (Personal Data)', () => {
  test('users can create their own tasks', async () => {
    const context = getAuthContext(ALICE_UID);
    const db = context.firestore();

    await assertSucceeds(addDoc(collection(db, 'tasks'), {
      userId: ALICE_UID,
      title: 'Complete workout',
    }));
  });

  test('users cannot read other users tasks', async () => {
    const taskRef = await withAdminDb((adminDb) => addDoc(collection(adminDb, 'tasks'), {
      userId: ALICE_UID,
      title: 'Task',
    }));

    const context = getAuthContext(BOB_UID);
    const db = context.firestore();

    await assertFails(getDoc(doc(db, 'tasks', taskRef.id)));
  });
});

// ============================================
// TEST SUITE: JOURNAL ENTRIES
// ============================================

describe('Journal Entries (Personal Data)', () => {
  test('users can create their own journal entries', async () => {
    const context = getAuthContext(ALICE_UID);
    const db = context.firestore();

    await assertSucceeds(addDoc(collection(db, 'journalEntries'), {
      userId: ALICE_UID,
      content: 'Today was a good day',
    }));
  });

  test('users cannot read other users journal entries', async () => {
    const entryRef = await withAdminDb((adminDb) => addDoc(collection(adminDb, 'journalEntries'), {
      userId: ALICE_UID,
      content: 'Private thoughts',
    }));

    const context = getAuthContext(BOB_UID);
    const db = context.firestore();

    await assertFails(getDoc(doc(db, 'journalEntries', entryRef.id)));
  });
});

// ============================================
// TEST SUITE: GROUPS
// ============================================

describe('Groups (Community)', () => {
  test('authenticated users can read public groups', async () => {
    await setupGroup('group1', ALICE_UID, [ALICE_UID], 'public');

    const context = getAuthContext(BOB_UID);
    const db = context.firestore();

    await assertSucceeds(getDoc(doc(db, 'groups', 'group1')));
  });

  test('non-members cannot read private groups', async () => {
    await setupGroup('group1', ALICE_UID, [ALICE_UID], 'private');

    const context = getAuthContext(BOB_UID);
    const db = context.firestore();

    await assertFails(getDoc(doc(db, 'groups', 'group1')));
  });

  test('members can read private groups', async () => {
    await setupGroup('group1', ALICE_UID, [ALICE_UID, BOB_UID], 'private');

    const context = getAuthContext(BOB_UID);
    const db = context.firestore();

    await assertSucceeds(getDoc(doc(db, 'groups', 'group1')));
  });

  test('users can create groups', async () => {
    const context = getAuthContext(ALICE_UID);
    const db = context.firestore();

    await assertSucceeds(addDoc(collection(db, 'groups'), {
      ownerId: ALICE_UID,
      name: 'My Group',
      visibility: 'public',
      members: [ALICE_UID],
    }));
  });

  test('group owner can delete group', async () => {
    await setupGroup('group1', ALICE_UID, [ALICE_UID], 'public');

    const context = getAuthContext(ALICE_UID);
    const db = context.firestore();

    await assertSucceeds(deleteDoc(doc(db, 'groups', 'group1')));
  });

  test('non-owner cannot delete group', async () => {
    await setupGroup('group1', ALICE_UID, [ALICE_UID, BOB_UID], 'public');

    const context = getAuthContext(BOB_UID);
    const db = context.firestore();

    await assertFails(deleteDoc(doc(db, 'groups', 'group1')));
  });
});

// ============================================
// TEST SUITE: POSTS
// ============================================

describe('Posts (Group Forum)', () => {
  test('members can create posts in their group', async () => {
    await setupGroup('group1', ALICE_UID, [ALICE_UID, BOB_UID], 'public');

    const context = getAuthContext(BOB_UID);
    const db = context.firestore();

    await assertSucceeds(addDoc(collection(db, 'posts'), {
      userId: BOB_UID,
      groupId: 'group1',
      content: 'Hello group!',
    }));
  });

  test('non-members cannot create posts in private groups', async () => {
    await setupGroup('group1', ALICE_UID, [ALICE_UID], 'private');

    const context = getAuthContext(BOB_UID);
    const db = context.firestore();

    await assertFails(addDoc(collection(db, 'posts'), {
      userId: BOB_UID,
      groupId: 'group1',
      content: 'Hello!',
    }));
  });

  test('members can read posts in public groups', async () => {
    await setupGroup('group1', ALICE_UID, [ALICE_UID], 'public');

    const postRef = await withAdminDb((adminDb) => addDoc(collection(adminDb, 'posts'), {
      userId: ALICE_UID,
      groupId: 'group1',
      content: 'Test post',
    }));

    const context = getAuthContext(BOB_UID);
    const db = context.firestore();

    await assertSucceeds(getDoc(doc(db, 'posts', postRef.id)));
  });

  test('post author can delete their post', async () => {
    await setupGroup('group1', ALICE_UID, [ALICE_UID], 'public');

    const postRef = await withAdminDb((adminDb) => addDoc(collection(adminDb, 'posts'), {
      userId: ALICE_UID,
      groupId: 'group1',
      content: 'Test post',
    }));

    const context = getAuthContext(ALICE_UID);
    const db = context.firestore();

    await assertSucceeds(deleteDoc(doc(db, 'posts', postRef.id)));
  });
});

// ============================================
// TEST SUITE: CONNECTIONS
// ============================================

describe('Connections', () => {
  test('users can create connection requests', async () => {
    const context = getAuthContext(ALICE_UID);
    const db = context.firestore();
    const pairId = [ALICE_UID, BOB_UID].sort().join('_');

    await assertSucceeds(setDoc(doc(db, 'connections', pairId), {
      a: [ALICE_UID, BOB_UID].sort()[0],
      b: [ALICE_UID, BOB_UID].sort()[1],
      status: 'pending',
    }));
  });

  test('users can read their connections', async () => {
    await setupConnection(ALICE_UID, BOB_UID, 'accepted');
    const pairId = [ALICE_UID, BOB_UID].sort().join('_');

    const context = getAuthContext(ALICE_UID);
    const db = context.firestore();

    await assertSucceeds(getDoc(doc(db, 'connections', pairId)));
  });

  test('users cannot read unrelated connections', async () => {
    await setupConnection(ALICE_UID, BOB_UID, 'accepted');
    const pairId = [ALICE_UID, BOB_UID].sort().join('_');

    const context = getAuthContext(CHARLIE_UID);
    const db = context.firestore();

    await assertFails(getDoc(doc(db, 'connections', pairId)));
  });

  test('users can update their connection status', async () => {
    await setupConnection(ALICE_UID, BOB_UID, 'pending');
    const pairId = [ALICE_UID, BOB_UID].sort().join('_');

    const context = getAuthContext(BOB_UID);
    const db = context.firestore();

    await assertSucceeds(updateDoc(doc(db, 'connections', pairId), {
      status: 'accepted',
    }));
  });
});

// ============================================
// TEST SUITE: MESSAGING
// ============================================

describe('Messaging', () => {
  test('participants can create conversations', async () => {
    const context = getAuthContext(ALICE_UID);
    const db = context.firestore();

    await assertSucceeds(addDoc(collection(db, 'conversations'), {
      participants: [ALICE_UID, BOB_UID],
      createdAt: new Date(),
    }));
  });

  test('non-participants cannot create conversations with others', async () => {
    const context = getAuthContext(CHARLIE_UID);
    const db = context.firestore();

    await assertFails(addDoc(collection(db, 'conversations'), {
      participants: [ALICE_UID, BOB_UID],
      createdAt: new Date(),
    }));
  });

  test('participants can read their conversations', async () => {
    const convRef = await withAdminDb((adminDb) => addDoc(collection(adminDb, 'conversations'), {
      participants: [ALICE_UID, BOB_UID],
    }));

    const context = getAuthContext(ALICE_UID);
    const db = context.firestore();

    await assertSucceeds(getDoc(doc(db, 'conversations', convRef.id)));
  });

  test('non-participants cannot read conversations', async () => {
    const convRef = await withAdminDb((adminDb) => addDoc(collection(adminDb, 'conversations'), {
      participants: [ALICE_UID, BOB_UID],
    }));

    const context = getAuthContext(CHARLIE_UID);
    const db = context.firestore();

    await assertFails(getDoc(doc(db, 'conversations', convRef.id)));
  });

  test('users cannot delete conversations', async () => {
    const convRef = await withAdminDb((adminDb) => addDoc(collection(adminDb, 'conversations'), {
      participants: [ALICE_UID, BOB_UID],
    }));

    const context = getAuthContext(ALICE_UID);
    const db = context.firestore();

    await assertFails(deleteDoc(doc(db, 'conversations', convRef.id)));
  });

  test('users can send direct messages', async () => {
    // The create rule binds a message to its conversation: it requires
    // conversationId and checks the sender is a participant of THAT
    // conversation. Without a seeded conversation the rule errors on the
    // undefined property and denies, so this fixture is what lets the test
    // reach the check it means to exercise.
    await setupConversation('conv1', [ALICE_UID, BOB_UID]);

    const context = getAuthContext(ALICE_UID);
    const db = context.firestore();

    await assertSucceeds(addDoc(collection(db, 'directMessages'), {
      conversationId: 'conv1',
      senderId: ALICE_UID,
      receiverId: BOB_UID,
      text: 'Hello!',
    }));
  });

  test('users cannot send messages as someone else', async () => {
    const context = getAuthContext(ALICE_UID);
    const db = context.firestore();

    await assertFails(addDoc(collection(db, 'directMessages'), {
      senderId: BOB_UID,
      receiverId: CHARLIE_UID,
      text: 'Fake message',
    }));
  });

  test('receivers can read messages', async () => {
    // Bob IS a participant, so this pins the positive direction of the read
    // rule's participant check.
    await setupConversation('conv1', [ALICE_UID, BOB_UID]);
    const msgRef = await withAdminDb((adminDb) => addDoc(collection(adminDb, 'directMessages'), {
      conversationId: 'conv1',
      senderId: ALICE_UID,
      receiverId: BOB_UID,
      text: 'Hello!',
    }));

    const context = getAuthContext(BOB_UID);
    const db = context.firestore();

    await assertSucceeds(getDoc(doc(db, 'directMessages', msgRef.id)));
  });

  test('others cannot read private messages', async () => {
    // Charlie is deliberately NOT in the participant list, so the denial comes
    // from the participant check itself.
    //
    // This test used to pass VACUOUSLY: with no conversationId on the message,
    // the read rule errored on the undefined property and denied everyone. The
    // proof is that its positive counterpart above was RED at the same time —
    // Bob, an actual participant, was denied by the identical fixture shape. A
    // rule that denies all comers trivially satisfies "non-participant is
    // denied", so the green said nothing about the participant check.
    //
    // With the conversation seeded the pair is load-bearing in both directions:
    // invert the clause to !(uid in participants) and Charlie's read succeeds
    // (this test goes red) while Bob's is denied (the test above goes red).
    // The old fixture caught neither.
    await setupConversation('conv1', [ALICE_UID, BOB_UID]);
    const msgRef = await withAdminDb((adminDb) => addDoc(collection(adminDb, 'directMessages'), {
      conversationId: 'conv1',
      senderId: ALICE_UID,
      receiverId: BOB_UID,
      text: 'Private message',
    }));

    const context = getAuthContext(CHARLIE_UID);
    const db = context.firestore();

    await assertFails(getDoc(doc(db, 'directMessages', msgRef.id)));
  });

  test('messages are immutable - cannot update', async () => {
    const msgRef = await withAdminDb((adminDb) => addDoc(collection(adminDb, 'directMessages'), {
      senderId: ALICE_UID,
      receiverId: BOB_UID,
      text: 'Hello!',
    }));

    const context = getAuthContext(ALICE_UID);
    const db = context.firestore();

    await assertFails(updateDoc(doc(db, 'directMessages', msgRef.id), {
      text: 'Modified',
    }));
  });

  test('messages are immutable - cannot delete', async () => {
    const msgRef = await withAdminDb((adminDb) => addDoc(collection(adminDb, 'directMessages'), {
      senderId: ALICE_UID,
      receiverId: BOB_UID,
      text: 'Hello!',
    }));

    const context = getAuthContext(ALICE_UID);
    const db = context.firestore();

    await assertFails(deleteDoc(doc(db, 'directMessages', msgRef.id)));
  });
});

// ============================================
// TEST SUITE: NOTIFICATIONS
// ============================================

describe('Notifications', () => {
  test('users can read their own notifications', async () => {
    const notifRef = await withAdminDb((adminDb) => addDoc(collection(adminDb, 'notifications'), {
      userId: ALICE_UID,
      type: 'message',
      title: 'New message',
      read: false,
    }));

    const context = getAuthContext(ALICE_UID);
    const db = context.firestore();

    await assertSucceeds(getDoc(doc(db, 'notifications', notifRef.id)));
  });

  test('users cannot read other users notifications', async () => {
    const notifRef = await withAdminDb((adminDb) => addDoc(collection(adminDb, 'notifications'), {
      userId: ALICE_UID,
      type: 'message',
      title: 'New message',
    }));

    const context = getAuthContext(BOB_UID);
    const db = context.firestore();

    await assertFails(getDoc(doc(db, 'notifications', notifRef.id)));
  });

  test('users cannot create notifications directly', async () => {
    const context = getAuthContext(ALICE_UID);
    const db = context.firestore();

    await assertFails(addDoc(collection(db, 'notifications'), {
      userId: ALICE_UID,
      type: 'message',
      title: 'Fake notification',
    }));
  });

  test('users can update their notifications (mark as read)', async () => {
    const notifRef = await withAdminDb((adminDb) => addDoc(collection(adminDb, 'notifications'), {
      userId: ALICE_UID,
      type: 'message',
      read: false,
    }));

    const context = getAuthContext(ALICE_UID);
    const db = context.firestore();

    await assertSucceeds(updateDoc(doc(db, 'notifications', notifRef.id), {
      read: true,
    }));
  });

  test('users can delete their own notifications', async () => {
    const notifRef = await withAdminDb((adminDb) => addDoc(collection(adminDb, 'notifications'), {
      userId: ALICE_UID,
      type: 'message',
    }));

    const context = getAuthContext(ALICE_UID);
    const db = context.firestore();

    await assertSucceeds(deleteDoc(doc(db, 'notifications', notifRef.id)));
  });
});

// ============================================
// TEST SUITE: SUBSCRIPTION STATE LOCKDOWN
// Subscription fields are gated by Cloud Functions only.
// Clients must not be able to grant themselves premium/event access.
//
// Trial bootstrap (initial subscription block on signup) is owned by the
// onUserCreate auth trigger — functions/src/auth/onUserCreate.js — NOT by
// the client. The CREATE-path tests below verify the client cannot smuggle
// subscription state into the initial user-doc creation.
// ============================================

describe('Subscription State Lockdown', () => {
  async function seedUserWithTrial(uid) {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const adminDb = ctx.firestore();
      await setDoc(doc(adminDb, 'users', uid), {
        displayName: `User ${uid}`,
        email: `${uid}@test.com`,
        privacy: 'public',
        subscription: {
          type: 'trial',
          trialExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        subscriptionType: 'trial',
        hasActiveSubscription: true,
      });
    });
  }

  // ---------- CREATE-path tests ----------

  test('client can create their own user doc without subscription fields', async () => {
    const db = getAuthContext(ALICE_UID).firestore();
    await assertSucceeds(setDoc(doc(db, 'users', ALICE_UID), {
      uid: ALICE_UID,
      email: 'alice@test.com',
      displayName: 'Alice',
      hasCompletedOnboarding: false,
    }));
  });

  test('client cannot include subscription block on CREATE', async () => {
    const db = getAuthContext(ALICE_UID).firestore();
    await assertFails(setDoc(doc(db, 'users', ALICE_UID), {
      email: 'alice@test.com',
      displayName: 'Alice',
      subscription: {
        type: 'premium',
        premiumExpiresAt: new Date('2099-01-01'),
      },
    }));
  });

  test('client cannot include eventData on CREATE', async () => {
    const db = getAuthContext(ALICE_UID).firestore();
    await assertFails(setDoc(doc(db, 'users', ALICE_UID), {
      email: 'alice@test.com',
      displayName: 'Alice',
      eventData: { eventId: 'fake', eventCode: 'HACK', eventName: 'Hacked' },
    }));
  });

  test('client cannot include subscriptionType on CREATE', async () => {
    const db = getAuthContext(ALICE_UID).firestore();
    await assertFails(setDoc(doc(db, 'users', ALICE_UID), {
      email: 'alice@test.com',
      displayName: 'Alice',
      subscriptionType: 'premium',
    }));
  });

  test('client cannot include hasActiveSubscription on CREATE', async () => {
    const db = getAuthContext(ALICE_UID).firestore();
    await assertFails(setDoc(doc(db, 'users', ALICE_UID), {
      email: 'alice@test.com',
      displayName: 'Alice',
      hasActiveSubscription: true,
    }));
  });

  // ---------- UPDATE-path tests ----------

  test('client cannot upgrade subscription.type to premium', async () => {
    await seedUserWithTrial(ALICE_UID);
    const db = getAuthContext(ALICE_UID).firestore();
    await assertFails(updateDoc(doc(db, 'users', ALICE_UID), {
      'subscription.type': 'premium',
    }));
  });

  test('client cannot replace the subscription object', async () => {
    await seedUserWithTrial(ALICE_UID);
    const db = getAuthContext(ALICE_UID).firestore();
    await assertFails(updateDoc(doc(db, 'users', ALICE_UID), {
      subscription: { type: 'premium', premiumExpiresAt: new Date('2099-01-01') },
    }));
  });

  test('client cannot extend trialExpiresAt via nested write', async () => {
    await seedUserWithTrial(ALICE_UID);
    const db = getAuthContext(ALICE_UID).firestore();
    await assertFails(updateDoc(doc(db, 'users', ALICE_UID), {
      'subscription.trialExpiresAt': new Date('2099-01-01'),
    }));
  });

  test('client cannot write eventData directly', async () => {
    await seedUserWithTrial(ALICE_UID);
    const db = getAuthContext(ALICE_UID).firestore();
    await assertFails(updateDoc(doc(db, 'users', ALICE_UID), {
      eventData: { eventId: 'fake', eventCode: 'HACK', eventName: 'Hacked' },
    }));
  });

  test('client cannot flip top-level subscriptionType convenience field', async () => {
    await seedUserWithTrial(ALICE_UID);
    const db = getAuthContext(ALICE_UID).firestore();
    await assertFails(updateDoc(doc(db, 'users', ALICE_UID), {
      subscriptionType: 'premium',
    }));
  });

  test('client cannot flip top-level hasActiveSubscription convenience field', async () => {
    await seedUserWithTrial(ALICE_UID);
    const db = getAuthContext(ALICE_UID).firestore();
    await assertFails(updateDoc(doc(db, 'users', ALICE_UID), {
      hasActiveSubscription: false,
    }));
  });

  test('client can still update displayName', async () => {
    await seedUserWithTrial(ALICE_UID);
    const db = getAuthContext(ALICE_UID).firestore();
    await assertSucceeds(updateDoc(doc(db, 'users', ALICE_UID), {
      displayName: 'Alice Renamed',
    }));
  });

  test('client can still update non-subscription fields like hasCompletedOnboarding', async () => {
    await seedUserWithTrial(ALICE_UID);
    const db = getAuthContext(ALICE_UID).firestore();
    await assertSucceeds(updateDoc(doc(db, 'users', ALICE_UID), {
      hasCompletedOnboarding: true,
    }));
  });

  test('client cannot smuggle subscription change inside a multi-field update', async () => {
    await seedUserWithTrial(ALICE_UID);
    const db = getAuthContext(ALICE_UID).firestore();
    await assertFails(updateDoc(doc(db, 'users', ALICE_UID), {
      displayName: 'Alice',
      'subscription.type': 'coaching',
    }));
  });
});

// ============================================
// TEST SUITE: PRIVATE USER STORE (userPrivate/{uid})
//
// This collection exists ONLY to give per-user singleton fields a read
// restriction that users/{uid} cannot provide — that document is readable by
// any authenticated account, and Firestore read rules are document-level.
//
// The load-bearing assertion in this block is therefore the cross-user READ
// denial. If that ever passes to a non-owner, the collection has no reason to
// exist and any field moved into it has been silently un-privatized.
//
// Ownership is by document ID (like notificationPreferences/{userId}), so
// these tests address documents by uid rather than filtering on a userId field.
//
// HARNESS NOTE: this block seeds via testEnv.withSecurityRulesDisabled(), the
// @firebase/rules-unit-testing v5 API, NOT the file's older shared helpers
// (setupUserProfile / setupGroup / ...) which call the removed
// testEnv.firestore(). Those helpers are why ~40 tests in the earlier blocks of
// this file fail on main today — a pre-existing harness-migration debt, not a
// rules problem, and deliberately left untouched by this slice.
// ============================================

describe('Private User Store (userPrivate)', () => {
  async function seedUserPrivate(uid, data = {}) {
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const adminDb = ctx.firestore();
      await setDoc(doc(adminDb, 'userPrivate', uid), {
        uid,
        weekStartDay: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      });
    });
  }

  // ---- Owner access ----

  test('owner can read their own private doc', async () => {
    await seedUserPrivate(ALICE_UID);
    const db = getAuthContext(ALICE_UID).firestore();

    await assertSucceeds(getDoc(doc(db, 'userPrivate', ALICE_UID)));
  });

  test('owner can read their own private doc before it exists (absent is a normal state)', async () => {
    const db = getAuthContext(ALICE_UID).firestore();

    await assertSucceeds(getDoc(doc(db, 'userPrivate', ALICE_UID)));
  });

  test('owner can create their own private doc', async () => {
    const db = getAuthContext(ALICE_UID).firestore();

    await assertSucceeds(setDoc(doc(db, 'userPrivate', ALICE_UID), {
      uid: ALICE_UID,
      floorCommitment: 'ten minutes',
      weekStartDay: 1,
    }));
  });

  test('owner can update their own private doc', async () => {
    await seedUserPrivate(ALICE_UID);
    const db = getAuthContext(ALICE_UID).firestore();

    await assertSucceeds(updateDoc(doc(db, 'userPrivate', ALICE_UID), {
      activeOutcome: 'steadier-weeks',
    }));
  });

  test('owner can delete their own private doc', async () => {
    await seedUserPrivate(ALICE_UID);
    const db = getAuthContext(ALICE_UID).firestore();

    await assertSucceeds(deleteDoc(doc(db, 'userPrivate', ALICE_UID)));
  });

  // ---- Cross-user denial (the reason this collection exists) ----

  test('a different authenticated user CANNOT read the owner private doc', async () => {
    await seedUserPrivate(ALICE_UID, { floorCommitment: 'ten minutes' });
    const db = getAuthContext(BOB_UID).firestore();

    await assertFails(getDoc(doc(db, 'userPrivate', ALICE_UID)));
  });

  test('a different authenticated user CANNOT create a doc under the owner uid', async () => {
    const db = getAuthContext(BOB_UID).firestore();

    await assertFails(setDoc(doc(db, 'userPrivate', ALICE_UID), {
      uid: ALICE_UID,
      activeOutcome: 'planted-by-bob',
    }));
  });

  test('a different authenticated user CANNOT update the owner private doc', async () => {
    await seedUserPrivate(ALICE_UID);
    const db = getAuthContext(BOB_UID).firestore();

    await assertFails(updateDoc(doc(db, 'userPrivate', ALICE_UID), {
      activeOutcome: 'planted-by-bob',
    }));
  });

  test('a different authenticated user CANNOT delete the owner private doc', async () => {
    await seedUserPrivate(ALICE_UID);
    const db = getAuthContext(BOB_UID).firestore();

    await assertFails(deleteDoc(doc(db, 'userPrivate', ALICE_UID)));
  });

  test('writing a matching uid FIELD does not buy access to another uid document', async () => {
    // Ownership is the document ID, not a field. A caller cannot self-authorize
    // by claiming their own uid inside a document addressed to someone else.
    const db = getAuthContext(BOB_UID).firestore();

    await assertFails(setDoc(doc(db, 'userPrivate', ALICE_UID), {
      uid: BOB_UID,
    }));
  });

  // ---- Unauthenticated ----

  test('unauthenticated users cannot read a private doc', async () => {
    await seedUserPrivate(ALICE_UID);
    const db = getUnauthContext().firestore();

    await assertFails(getDoc(doc(db, 'userPrivate', ALICE_UID)));
  });

  test('unauthenticated users cannot write a private doc', async () => {
    const db = getUnauthContext().firestore();

    await assertFails(setDoc(doc(db, 'userPrivate', ALICE_UID), {
      uid: ALICE_UID,
    }));
  });

  // ---- Isolation from the public profile doc ----

  test('the public users doc stays broadly readable — this block did not change it', async () => {
    // Guards the additive claim: userPrivate exists BESIDE users/{uid}, it does
    // not tighten it. If this ever fails, the slice stopped being additive.
    //
    // Seeds inline rather than via the shared setupUserProfile helper, which
    // calls testEnv.firestore() — an API removed in @firebase/rules-unit-testing
    // v5. That helper is why most of the older blocks in this file currently
    // fail; see the note at the top of this describe.
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', ALICE_UID), {
        displayName: `User ${ALICE_UID}`,
        email: `${ALICE_UID}@test.com`,
        privacy: 'public',
        createdAt: new Date(),
      });
    });
    const db = getAuthContext(BOB_UID).firestore();

    await assertSucceeds(getDoc(doc(db, 'users', ALICE_UID)));
  });
});

// ============================================
// TEST SUITE: ORG / ROSTER (organizations + memberships)
//
// The org data model (Reconciled Product Spec S17.1–17.2). Both collections are
// provisioned server-side, so every client write must be refused and reads must
// be scoped: an organization to its members, a membership to its owner.
//
// The load-bearing assertions are the two cross-user DENIALS. Everything else in
// this block can pass while the model is still wide open; those two are what
// prove the boundary exists. They are seeded so the denial comes from the rule
// under test and not from an evaluation error — see the vacuous-green failure
// mode documented in the Messaging block.
// ============================================

describe('Org / Roster (organizations + memberships)', () => {
  const ORG_ID = 'org1';

  async function seedOrg(orgId = ORG_ID, data = {}) {
    await withAdminDb((adminDb) =>
      setDoc(doc(adminDb, 'organizations', orgId), {
        name: `Test Org ${orgId}`,
        type: 'corporate',
        seatLimit: 25,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      })
    );
  }

  // Mirrors membershipDocId() in mobile/src/services/firebase/org.service.ts and
  // the isOrgMember() concatenation in firestore.rules. All three must agree.
  async function seedMembership(orgId, userId, role = 'member') {
    await withAdminDb((adminDb) =>
      setDoc(doc(adminDb, 'memberships', `${orgId}_${userId}`), {
        orgId,
        userId,
        role,
        joinedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    );
  }

  // ---- Organization reads ----

  test('a member can read their organization', async () => {
    await seedOrg();
    await seedMembership(ORG_ID, ALICE_UID);
    const db = getAuthContext(ALICE_UID).firestore();

    await assertSucceeds(getDoc(doc(db, 'organizations', ORG_ID)));
  });

  test('a non-member authenticated user CANNOT read the organization', async () => {
    // Load-bearing. Bob is authenticated and the org exists; the ONLY thing
    // standing between him and it is the isOrgMember() exists() check. Alice's
    // membership is seeded so the org genuinely has a member — a rule that
    // denied everyone would still pass this test on its own, which is why the
    // positive test above shares the same fixture shape.
    await seedOrg();
    await seedMembership(ORG_ID, ALICE_UID);
    const db = getAuthContext(BOB_UID).firestore();

    await assertFails(getDoc(doc(db, 'organizations', ORG_ID)));
  });

  test('membership in one org does not grant read on another', async () => {
    await seedOrg('org1');
    await seedOrg('org2');
    await seedMembership('org1', ALICE_UID);
    const db = getAuthContext(ALICE_UID).firestore();

    await assertFails(getDoc(doc(db, 'organizations', 'org2')));
  });

  test('unauthenticated users cannot read an organization', async () => {
    await seedOrg();
    await seedMembership(ORG_ID, ALICE_UID);
    const db = getUnauthContext().firestore();

    await assertFails(getDoc(doc(db, 'organizations', ORG_ID)));
  });

  // ---- Membership reads ----

  test('a user can read their own membership', async () => {
    await seedMembership(ORG_ID, ALICE_UID);
    const db = getAuthContext(ALICE_UID).firestore();

    await assertSucceeds(getDoc(doc(db, 'memberships', `${ORG_ID}_${ALICE_UID}`)));
  });

  test('a different authenticated user CANNOT read that membership', async () => {
    // Load-bearing. This is the roster-privacy boundary in miniature: Bob must
    // not be able to enumerate who belongs to an org, even one he is in.
    await seedMembership(ORG_ID, ALICE_UID);
    await seedMembership(ORG_ID, BOB_UID);
    const db = getAuthContext(BOB_UID).firestore();

    await assertFails(getDoc(doc(db, 'memberships', `${ORG_ID}_${ALICE_UID}`)));
  });

  test('a coach cannot read another members membership row', async () => {
    // Role does not widen reads in this slice. Coach/admin roster access is a
    // later slice with its own rules; until then a coach is just another member.
    await seedMembership(ORG_ID, ALICE_UID, 'member');
    await seedMembership(ORG_ID, BOB_UID, 'coach');
    const db = getAuthContext(BOB_UID).firestore();

    await assertFails(getDoc(doc(db, 'memberships', `${ORG_ID}_${ALICE_UID}`)));
  });

  test('unauthenticated users cannot read a membership', async () => {
    await seedMembership(ORG_ID, ALICE_UID);
    const db = getUnauthContext().firestore();

    await assertFails(getDoc(doc(db, 'memberships', `${ORG_ID}_${ALICE_UID}`)));
  });

  // ---- Client writes are refused outright (server-side provisioning only) ----

  test('no authenticated client can create an organization', async () => {
    const db = getAuthContext(ALICE_UID).firestore();

    await assertFails(setDoc(doc(db, 'organizations', 'org-new'), {
      name: 'Self-provisioned',
      type: 'corporate',
      seatLimit: 999,
    }));
  });

  test('no authenticated client can update an organization — even as a member', async () => {
    await seedOrg();
    await seedMembership(ORG_ID, ALICE_UID, 'admin');
    const db = getAuthContext(ALICE_UID).firestore();

    // Being an org admin grants READ, never write. Seat counts are billing state.
    await assertFails(updateDoc(doc(db, 'organizations', ORG_ID), { seatLimit: 999 }));
  });

  test('no authenticated client can delete an organization', async () => {
    await seedOrg();
    await seedMembership(ORG_ID, ALICE_UID, 'admin');
    const db = getAuthContext(ALICE_UID).firestore();

    await assertFails(deleteDoc(doc(db, 'organizations', ORG_ID)));
  });

  test('no authenticated client can create a membership — no self-joining an org', async () => {
    // The whole seat model depends on this: if a client could write its own
    // membership row it could grant itself org access and, via isOrgMember(),
    // read the organization too.
    await seedOrg();
    const db = getAuthContext(ALICE_UID).firestore();

    await assertFails(setDoc(doc(db, 'memberships', `${ORG_ID}_${ALICE_UID}`), {
      orgId: ORG_ID,
      userId: ALICE_UID,
      role: 'member',
    }));
  });

  test('no authenticated client can escalate their own role', async () => {
    await seedMembership(ORG_ID, ALICE_UID, 'member');
    const db = getAuthContext(ALICE_UID).firestore();

    await assertFails(updateDoc(doc(db, 'memberships', `${ORG_ID}_${ALICE_UID}`), {
      role: 'admin',
    }));
  });

  test('no authenticated client can delete their own membership', async () => {
    await seedMembership(ORG_ID, ALICE_UID);
    const db = getAuthContext(ALICE_UID).firestore();

    await assertFails(deleteDoc(doc(db, 'memberships', `${ORG_ID}_${ALICE_UID}`)));
  });

  test('forging a matching userId FIELD in a membership you do not own grants nothing', async () => {
    // Mirrors the slice-1 userPrivate forge test. Bob cannot write a membership
    // row claiming to be Alice's, nor one addressed to Alice's document ID that
    // names himself — the collection is not client-writable at all, so the read
    // rule's userId check is never even reached.
    await seedMembership(ORG_ID, ALICE_UID);
    const db = getAuthContext(BOB_UID).firestore();

    await assertFails(setDoc(doc(db, 'memberships', `${ORG_ID}_${ALICE_UID}`), {
      orgId: ORG_ID,
      userId: BOB_UID,
      role: 'admin',
    }));
  });

  // ---- Member privacy: the org grants nothing over member data ----

  test('org membership does not grant read access to another members personal data', async () => {
    // The S17.1 precondition, asserted directly: a coach in the same org is no
    // closer to Alice's habits than a stranger is. If a later slice widens a
    // per-user collection for roster or rollup purposes, this goes red.
    await seedMembership(ORG_ID, ALICE_UID, 'member');
    await seedMembership(ORG_ID, BOB_UID, 'coach');
    const habitRef = await withAdminDb((adminDb) => addDoc(collection(adminDb, 'habits'), {
      userId: ALICE_UID,
      name: 'Meditate',
    }));

    const db = getAuthContext(BOB_UID).firestore();

    await assertFails(getDoc(doc(db, 'habits', habitRef.id)));
  });

  test('org membership does not grant read access to another members private store', async () => {
    await seedMembership(ORG_ID, ALICE_UID, 'member');
    await seedMembership(ORG_ID, BOB_UID, 'coach');
    await withAdminDb((adminDb) =>
      setDoc(doc(adminDb, 'userPrivate', ALICE_UID), {
        uid: ALICE_UID,
        floorCommitment: 'ten minutes',
      })
    );

    const db = getAuthContext(BOB_UID).firestore();

    await assertFails(getDoc(doc(db, 'userPrivate', ALICE_UID)));
  });
});

console.log('✅ All security rules tests defined. Run with: npm run test:rules');
