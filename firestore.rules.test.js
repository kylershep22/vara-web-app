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

async function setupUserProfile(uid, data = {}) {
  const adminDb = testEnv.firestore();
  await setDoc(doc(adminDb, 'users', uid), {
    displayName: data.displayName || `User ${uid}`,
    email: data.email || `${uid}@test.com`,
    privacy: data.privacy || 'public',
    createdAt: new Date(),
    ...data,
  });
}

async function setupConnection(uidA, uidB, status = 'accepted') {
  const adminDb = testEnv.firestore();
  const pairId = [uidA, uidB].sort().join('_');
  await setDoc(doc(adminDb, 'connections', pairId), {
    a: [uidA, uidB].sort()[0],
    b: [uidA, uidB].sort()[1],
    status,
    createdAt: new Date(),
  });
}

async function setupGroup(groupId, ownerId, members = [], visibility = 'public') {
  const adminDb = testEnv.firestore();
  await setDoc(doc(adminDb, 'groups', groupId), {
    ownerId,
    name: `Test Group ${groupId}`,
    visibility,
    members,
    memberCount: members.length,
    createdAt: new Date(),
  });
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

  test('users cannot read private profiles of others', async () => {
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

  test('non-connected users cannot read connections-only profiles', async () => {
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
    const adminDb = testEnv.firestore();
    const goalRef = await addDoc(collection(adminDb, 'goals'), {
      userId: ALICE_UID,
      title: 'Exercise more',
    });

    const context = getAuthContext(ALICE_UID);
    const db = context.firestore();

    await assertSucceeds(getDoc(doc(db, 'goals', goalRef.id)));
  });

  test('users cannot read other users goals', async () => {
    const adminDb = testEnv.firestore();
    const goalRef = await addDoc(collection(adminDb, 'goals'), {
      userId: ALICE_UID,
      title: 'Exercise more',
    });

    const context = getAuthContext(BOB_UID);
    const db = context.firestore();

    await assertFails(getDoc(doc(db, 'goals', goalRef.id)));
  });

  test('users can update their own goals', async () => {
    const adminDb = testEnv.firestore();
    const goalRef = await addDoc(collection(adminDb, 'goals'), {
      userId: ALICE_UID,
      title: 'Exercise more',
    });

    const context = getAuthContext(ALICE_UID);
    const db = context.firestore();

    await assertSucceeds(updateDoc(doc(db, 'goals', goalRef.id), {
      title: 'Exercise daily',
    }));
  });

  test('users cannot update other users goals', async () => {
    const adminDb = testEnv.firestore();
    const goalRef = await addDoc(collection(adminDb, 'goals'), {
      userId: ALICE_UID,
      title: 'Exercise more',
    });

    const context = getAuthContext(BOB_UID);
    const db = context.firestore();

    await assertFails(updateDoc(doc(db, 'goals', goalRef.id), {
      title: 'Hacked',
    }));
  });

  test('users can delete their own goals', async () => {
    const adminDb = testEnv.firestore();
    const goalRef = await addDoc(collection(adminDb, 'goals'), {
      userId: ALICE_UID,
      title: 'Exercise more',
    });

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
    const adminDb = testEnv.firestore();
    const habitRef = await addDoc(collection(adminDb, 'habits'), {
      userId: ALICE_UID,
      name: 'Meditate',
    });

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
    const adminDb = testEnv.firestore();
    const taskRef = await addDoc(collection(adminDb, 'tasks'), {
      userId: ALICE_UID,
      title: 'Task',
    });

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
    const adminDb = testEnv.firestore();
    const entryRef = await addDoc(collection(adminDb, 'journalEntries'), {
      userId: ALICE_UID,
      content: 'Private thoughts',
    });

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

    const adminDb = testEnv.firestore();
    const postRef = await addDoc(collection(adminDb, 'posts'), {
      userId: ALICE_UID,
      groupId: 'group1',
      content: 'Test post',
    });

    const context = getAuthContext(BOB_UID);
    const db = context.firestore();

    await assertSucceeds(getDoc(doc(db, 'posts', postRef.id)));
  });

  test('post author can delete their post', async () => {
    await setupGroup('group1', ALICE_UID, [ALICE_UID], 'public');

    const adminDb = testEnv.firestore();
    const postRef = await addDoc(collection(adminDb, 'posts'), {
      userId: ALICE_UID,
      groupId: 'group1',
      content: 'Test post',
    });

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
    const adminDb = testEnv.firestore();
    const convRef = await addDoc(collection(adminDb, 'conversations'), {
      participants: [ALICE_UID, BOB_UID],
    });

    const context = getAuthContext(ALICE_UID);
    const db = context.firestore();

    await assertSucceeds(getDoc(doc(db, 'conversations', convRef.id)));
  });

  test('non-participants cannot read conversations', async () => {
    const adminDb = testEnv.firestore();
    const convRef = await addDoc(collection(adminDb, 'conversations'), {
      participants: [ALICE_UID, BOB_UID],
    });

    const context = getAuthContext(CHARLIE_UID);
    const db = context.firestore();

    await assertFails(getDoc(doc(db, 'conversations', convRef.id)));
  });

  test('users cannot delete conversations', async () => {
    const adminDb = testEnv.firestore();
    const convRef = await addDoc(collection(adminDb, 'conversations'), {
      participants: [ALICE_UID, BOB_UID],
    });

    const context = getAuthContext(ALICE_UID);
    const db = context.firestore();

    await assertFails(deleteDoc(doc(db, 'conversations', convRef.id)));
  });

  test('users can send direct messages', async () => {
    const context = getAuthContext(ALICE_UID);
    const db = context.firestore();

    await assertSucceeds(addDoc(collection(db, 'directMessages'), {
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
    const adminDb = testEnv.firestore();
    const msgRef = await addDoc(collection(adminDb, 'directMessages'), {
      senderId: ALICE_UID,
      receiverId: BOB_UID,
      text: 'Hello!',
    });

    const context = getAuthContext(BOB_UID);
    const db = context.firestore();

    await assertSucceeds(getDoc(doc(db, 'directMessages', msgRef.id)));
  });

  test('others cannot read private messages', async () => {
    const adminDb = testEnv.firestore();
    const msgRef = await addDoc(collection(adminDb, 'directMessages'), {
      senderId: ALICE_UID,
      receiverId: BOB_UID,
      text: 'Private message',
    });

    const context = getAuthContext(CHARLIE_UID);
    const db = context.firestore();

    await assertFails(getDoc(doc(db, 'directMessages', msgRef.id)));
  });

  test('messages are immutable - cannot update', async () => {
    const adminDb = testEnv.firestore();
    const msgRef = await addDoc(collection(adminDb, 'directMessages'), {
      senderId: ALICE_UID,
      receiverId: BOB_UID,
      text: 'Hello!',
    });

    const context = getAuthContext(ALICE_UID);
    const db = context.firestore();

    await assertFails(updateDoc(doc(db, 'directMessages', msgRef.id), {
      text: 'Modified',
    }));
  });

  test('messages are immutable - cannot delete', async () => {
    const adminDb = testEnv.firestore();
    const msgRef = await addDoc(collection(adminDb, 'directMessages'), {
      senderId: ALICE_UID,
      receiverId: BOB_UID,
      text: 'Hello!',
    });

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
    const adminDb = testEnv.firestore();
    const notifRef = await addDoc(collection(adminDb, 'notifications'), {
      userId: ALICE_UID,
      type: 'message',
      title: 'New message',
      read: false,
    });

    const context = getAuthContext(ALICE_UID);
    const db = context.firestore();

    await assertSucceeds(getDoc(doc(db, 'notifications', notifRef.id)));
  });

  test('users cannot read other users notifications', async () => {
    const adminDb = testEnv.firestore();
    const notifRef = await addDoc(collection(adminDb, 'notifications'), {
      userId: ALICE_UID,
      type: 'message',
      title: 'New message',
    });

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
    const adminDb = testEnv.firestore();
    const notifRef = await addDoc(collection(adminDb, 'notifications'), {
      userId: ALICE_UID,
      type: 'message',
      read: false,
    });

    const context = getAuthContext(ALICE_UID);
    const db = context.firestore();

    await assertSucceeds(updateDoc(doc(db, 'notifications', notifRef.id), {
      read: true,
    }));
  });

  test('users can delete their own notifications', async () => {
    const adminDb = testEnv.firestore();
    const notifRef = await addDoc(collection(adminDb, 'notifications'), {
      userId: ALICE_UID,
      type: 'message',
    });

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

console.log('✅ All security rules tests defined. Run with: npm run test:rules');
