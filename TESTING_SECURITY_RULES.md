# Testing Firestore Security Rules

This guide will help you test the new security rules before deploying them to production.

## 🎯 Testing Methods

There are 3 ways to test the security rules:

1. **Manual Testing with Emulator UI** (Recommended for quick testing)
2. **Automated Jest Tests** (Comprehensive test suite)
3. **Manual Testing in Browser** (Real-world testing)

---

## Method 1: Manual Testing with Firebase Emulator UI (QUICKEST)

### Step 1: Start the Emulator

```bash
npm run emulators
# Or: firebase emulators:start
```

This will start:
- Firestore Emulator on `localhost:8080`
- Auth Emulator on `localhost:9099`
- Emulator UI on `http://localhost:4000`

### Step 2: Open Emulator UI

Open your browser to: **http://localhost:4000**

### Step 3: Test Security Rules Manually

1. **Go to Firestore tab** in the Emulator UI
2. **Click "Rules" tab** at the top
3. **Click "Rules Playground"** button

#### Test Scenarios to Try:

**Test 1: Read a User Profile**
```javascript
// Location: /users/alice123
// Auth: Authenticated as alice123
// Operation: Read

// Should SUCCEED (reading own profile)
```

**Test 2: Read Another User's Private Profile**
```javascript
// Location: /users/bob456
// Auth: Authenticated as alice123
// Operation: Read

// Should FAIL if bob's privacy is "private"
// Add bob's profile first with privacy: "private"
```

**Test 3: Read Own Goals**
```javascript
// Location: /goals/goal123
// Auth: Authenticated as alice123
// Operation: Read

// Should SUCCEED if goal.userId === "alice123"
// Should FAIL if goal.userId !== "alice123"
```

**Test 4: Create a Goal**
```javascript
// Location: /goals/goal456
// Auth: Authenticated as alice123
// Operation: Create
// Data:
{
  "userId": "alice123",
  "title": "Exercise more",
  "primaryFocus": "fitness"
}

// Should SUCCEED (creating own goal)
```

**Test 5: Create a Goal for Someone Else**
```javascript
// Location: /goals/goal789
// Auth: Authenticated as alice123
// Operation: Create
// Data:
{
  "userId": "bob456",
  "title": "Exercise more"
}

// Should FAIL (cannot create goals for others)
```

---

## Method 2: Automated Jest Tests

### Prerequisites

Install dependencies (already done if you followed setup):
```bash
npm install --save-dev @firebase/rules-unit-testing --legacy-peer-deps
```

### Run All Tests

```bash
npm run test:rules
```

This will:
1. Start the Firestore emulator automatically
2. Run all 50+ security rule tests
3. Show pass/fail results
4. Stop the emulator when done

### Expected Output

```
✓ Authentication › unauthenticated users cannot read any data
✓ Authentication › unauthenticated users cannot write any data
✓ User Profiles › users can read their own profile
✓ User Profiles › users can read public profiles
✓ User Profiles › users cannot read private profiles of others
✓ User Profiles › connected users can read connections-only profiles
... (50+ more tests)

Test Suites: 1 passed, 1 total
Tests:       50+ passed, 50+ total
```

### Run Specific Test Suite

```bash
# Only test user profiles
npx jest firestore.rules.test.js -t "User Profiles" --testEnvironment=node

# Only test messaging
npx jest firestore.rules.test.js -t "Messaging" --testEnvironment=node

# Only test goals
npx jest firestore.rules.test.js -t "Goals" --testEnvironment=node
```

---

## Method 3: Manual Testing in Browser

### Step 1: Update Firebase Config to Use Emulator

Edit `src/firebase.js` temporarily:

```javascript
import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';

const firebaseConfig = {
  // ... your config
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// 🔥 ADD THESE LINES FOR TESTING
if (window.location.hostname === 'localhost') {
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectAuthEmulator(auth, 'http://localhost:9099');
}

export { db, auth };
```

### Step 2: Start Everything

```bash
# Terminal 1: Start emulators
npm run emulators

# Terminal 2: Start your app
npm run dev
```

### Step 3: Test Real User Flows

1. **Sign Up** a new user (creates in emulator auth)
2. **Create a goal** - Should work
3. **Try to view another user's profile** (if you have test data)
4. **Send a message** to another user
5. **Check notifications**
6. **Join/create a group**

### Step 4: Check Emulator UI for Data

- Open http://localhost:4000
- Check Firestore tab to see created documents
- Check Auth tab to see test users
- Verify data is being written correctly

---

## 🧪 Key Test Cases to Verify

### Personal Data Isolation ✓
- [ ] User can read their own goals
- [ ] User CANNOT read another user's goals
- [ ] User can create their own habits
- [ ] User CANNOT create habits for others
- [ ] User can update their own tasks
- [ ] User CANNOT update other's tasks
- [ ] User can read their own journal entries
- [ ] User CANNOT read other's journal entries

### Privacy Settings ✓
- [ ] Public profiles can be read by anyone
- [ ] Private profiles can only be read by owner
- [ ] Connections-only profiles can be read by connected users
- [ ] Non-connected users CANNOT read connections-only profiles

### Community Features ✓
- [ ] Anyone can read public groups
- [ ] Only members can read private groups
- [ ] Only group members can post
- [ ] Non-members CANNOT post in private groups
- [ ] Post author can delete their post
- [ ] Group owner can delete any post

### Messaging ✓
- [ ] Users can create conversations with others
- [ ] Only participants can read conversations
- [ ] Users can send messages
- [ ] Users CANNOT send messages as someone else
- [ ] Only sender/receiver can read messages
- [ ] Third parties CANNOT read messages
- [ ] Messages are immutable (cannot edit/delete)

### Notifications ✓
- [ ] Users can read their own notifications
- [ ] Users CANNOT read others' notifications
- [ ] Users CANNOT create notifications (only Cloud Functions)
- [ ] Users can mark notifications as read
- [ ] Users can delete their own notifications

---

## 🚨 Common Issues & Troubleshooting

### Issue: "Cannot connect to emulator"

**Solution:**
```bash
# Kill any existing emulator processes
taskkill /F /IM java.exe /T

# Restart emulators
firebase emulators:start
```

### Issue: "Missing or insufficient permissions"

This is **expected** - it means the rules are working!

Check:
1. Are you authenticated?
2. Are you trying to access someone else's data?
3. Is the privacy setting blocking you?
4. Are you a member of the group?

### Issue: Rules not updating in emulator

**Solution:**
1. Stop the emulator (Ctrl+C)
2. Restart: `npm run emulators`
3. Rules are reloaded automatically

### Issue: Tests are failing

**Check:**
1. Is the emulator running? (Should auto-start with `npm run test:rules`)
2. Are there syntax errors in `firestore.rules`?
3. Run `firebase emulators:start` manually to see errors

---

## 📊 Test Coverage

The test suite covers:

| Collection | Tests |
|------------|-------|
| Authentication | 2 tests |
| User Profiles | 10 tests |
| Goals | 7 tests |
| Habits | 2 tests |
| Tasks | 2 tests |
| Journal Entries | 2 tests |
| Groups | 6 tests |
| Posts | 4 tests |
| Connections | 4 tests |
| Messaging | 12 tests |
| Notifications | 6 tests |

**Total: 57+ comprehensive security tests**

---

## ✅ Before Deploying to Production

Run through this checklist:

- [ ] All automated tests pass (`npm run test:rules`)
- [ ] Manual testing in Emulator UI passes key scenarios
- [ ] Privacy settings work correctly (public/connections/private)
- [ ] Group membership is enforced
- [ ] Messaging is private to participants
- [ ] Personal data (goals, habits, tasks, journal) is isolated
- [ ] Notifications work correctly
- [ ] Connection requests work properly
- [ ] No unexpected permission errors in console

---

## 🚀 Deploying Rules

Once all tests pass:

```bash
# Dry run (see what would be deployed)
firebase deploy --only firestore:rules --dry-run

# Deploy to production
firebase deploy --only firestore:rules
```

**IMPORTANT**: Test in emulator first! Deploying bad rules can break your production app.

---

## 📝 Adding New Tests

To add tests for new features:

1. Open `firestore.rules.test.js`
2. Add a new `describe()` block
3. Write test cases using `assertSucceeds()` and `assertFails()`
4. Run tests to verify

Example:
```javascript
describe('My New Feature', () => {
  test('users can do X', async () => {
    const context = getAuthContext(ALICE_UID);
    const db = context.firestore();

    await assertSucceeds(/* your operation */);
  });

  test('users cannot do Y', async () => {
    const context = getAuthContext(BOB_UID);
    const db = context.firestore();

    await assertFails(/* your operation */);
  });
});
```

---

## 🔗 Useful Commands

```bash
# Start all emulators with UI
npm run emulators

# Start just Firestore + Auth for testing
npm run test:rules:ui

# Run automated tests
npm run test:rules

# Check rules syntax
firebase firestore:rules

# Deploy rules to production
firebase deploy --only firestore:rules

# View current rules in Firebase Console
# https://console.firebase.google.com/project/vara-4a99f/firestore/rules
```

---

## 📚 Resources

- [Firestore Security Rules Documentation](https://firebase.google.com/docs/firestore/security/get-started)
- [Rules Unit Testing Guide](https://firebase.google.com/docs/firestore/security/test-rules-emulator)
- [Emulator Suite Documentation](https://firebase.google.com/docs/emulator-suite)
- [Common Security Rules Patterns](https://firebase.google.com/docs/firestore/security/rules-conditions)

---

**Questions?** See `FIRESTORE_SECURITY_RULES.md` for detailed rule documentation.
