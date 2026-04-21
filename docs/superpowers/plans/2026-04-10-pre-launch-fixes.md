# Pre-Launch Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Address all blocker and should-fix issues identified in the app store readiness audit before submitting the Vara Wellness mobile app.

**Architecture:** These are independent, surgical fixes across config files, components, and the auth context. No new features — just hardening existing code for production safety.

**Tech Stack:** React Native/Expo, TypeScript, Firebase Auth, Babel

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `mobile/app.json` | Modify | Add missing iOS permission, sync build numbers |
| `mobile/babel.config.js` | Modify | Ensure console stripping covers `console.error` and `console.warn` in production |
| `mobile/src/screens/ChatScreen.tsx` | Modify | Add route params null guard |
| `mobile/src/screens/community/ReportReasonScreen.tsx` | Modify | Add route params null guard |
| `mobile/src/screens/community/ReportDetailScreen.tsx` | Modify | Add route params null guard |
| `mobile/src/components/community/ChallengeActivityItems.tsx` | Modify | Add .catch() to unhandled promise |
| `mobile/src/context/AuthContext.tsx` | Modify | Fix auth timeout race condition |

---

### Task 1: Add Missing iOS Permission and Sync Build Numbers

**Files:**
- Modify: `mobile/app.json`

- [ ] **Step 1: Add NSPhotoLibraryAddUsageDescription to iOS infoPlist**

In `mobile/app.json`, find the `infoPlist` block (around line 27):

```json
      "infoPlist": {
        "NSCameraUsageDescription": "Vara needs access to your camera to upload profile pictures and content.",
        "NSPhotoLibraryUsageDescription": "Vara needs access to your photo library to upload images."
      }
```

Replace with:

```json
      "infoPlist": {
        "NSCameraUsageDescription": "Vara needs access to your camera to upload profile pictures and content.",
        "NSPhotoLibraryUsageDescription": "Vara needs access to your photo library to upload images.",
        "NSPhotoLibraryAddUsageDescription": "Vara needs access to save images to your photo library."
      }
```

- [ ] **Step 2: Sync Android versionCode with iOS buildNumber**

In `mobile/app.json`, find Android `versionCode` (line 34):

```json
      "versionCode": 1,
```

Replace with:

```json
      "versionCode": 2,
```

This syncs with the iOS `buildNumber` of `"2"`. Note: since `eas.json` has `appVersionSource: "remote"` and `autoIncrement: true` for production, EAS will manage build numbers going forward. These are just the seed values.

- [ ] **Step 3: Commit**

```bash
git add mobile/app.json
git commit -m "fix(mobile): add NSPhotoLibraryAddUsageDescription and sync Android versionCode"
```

---

### Task 2: Configure Console Stripping for Production Builds

**Files:**
- Modify: `mobile/babel.config.js`

- [ ] **Step 1: Update babel config to strip ALL console methods in production**

The current config at `mobile/babel.config.js` excludes `error` and `warn`:

```javascript
...(!process.env.EXPO_PUBLIC_DEBUG && process.env.NODE_ENV === 'production'
  ? [['transform-remove-console', { exclude: ['error', 'warn'] }]]
  : []),
```

The problem: `console.error` and `console.warn` calls in 50+ files will still ship to production, leaking technical details. The app already has a proper `logger` utility gated behind `__DEV__`. Production errors should go to crash reporting, not the console.

Replace the entire `mobile/babel.config.js` with:

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Strip ALL console statements from production builds.
      // The app uses a logger utility (gated behind __DEV__) for dev logging
      // and Sentry/crash reporting for production error tracking.
      ...(!process.env.EXPO_PUBLIC_DEBUG && process.env.NODE_ENV === 'production'
        ? [['transform-remove-console']]
        : []),
    ],
  };
};
```

By removing the `{ exclude: ['error', 'warn'] }` option, all `console.*` calls are stripped in production.

- [ ] **Step 2: Commit**

```bash
git add mobile/babel.config.js
git commit -m "fix(mobile): strip all console statements from production builds"
```

---

### Task 3: Run npm audit fix

**Files:**
- Modify: `mobile/package-lock.json` (auto-updated by npm)

- [ ] **Step 1: Run npm audit to see current vulnerabilities**

```bash
cd mobile && npm audit
```

Review the output. Expected: high-severity `@xmldom/xmldom`, moderate `@sentry/browser`, moderate `ajv`.

- [ ] **Step 2: Run npm audit fix**

```bash
cd mobile && npm audit fix
```

If any vulnerabilities require `--force` (breaking changes), do NOT use `--force`. Only fix what resolves cleanly. Document any remaining vulnerabilities.

- [ ] **Step 3: Verify the app still builds**

```bash
cd mobile && npx expo export --platform ios 2>&1 | head -5
```

Expected: Export completes without errors.

- [ ] **Step 4: Commit**

```bash
git add mobile/package.json mobile/package-lock.json
git commit -m "fix(mobile): resolve npm audit vulnerabilities"
```

---

### Task 4: Add Route Params Null Guards

**Files:**
- Modify: `mobile/src/screens/ChatScreen.tsx`
- Modify: `mobile/src/screens/community/ReportReasonScreen.tsx`
- Modify: `mobile/src/screens/community/ReportDetailScreen.tsx`

- [ ] **Step 1: Guard ChatScreen route params**

In `mobile/src/screens/ChatScreen.tsx`, find line 56:

```typescript
  const { conversationId, otherUserId } = route.params;
```

Replace with:

```typescript
  const { conversationId, otherUserId } = route.params ?? {};

  if (!conversationId || !otherUserId) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Unable to load conversation.</Text>
      </SafeAreaView>
    );
  }
```

Make sure `SafeAreaView` and `Text` are already imported (they should be — check the existing imports at the top of the file). If `SafeAreaView` is not imported, use `View` instead since it's already imported.

- [ ] **Step 2: Guard ReportReasonScreen route params**

In `mobile/src/screens/community/ReportReasonScreen.tsx`, find line 20:

```typescript
  const { postId, reportedUserId } = route.params;
```

Replace with:

```typescript
  const { postId, reportedUserId } = route.params ?? {};

  if (!postId || !reportedUserId) {
    navigation.goBack();
    return null;
  }
```

- [ ] **Step 3: Guard ReportDetailScreen route params**

In `mobile/src/screens/community/ReportDetailScreen.tsx`, find line 28:

```typescript
  const { postId, reportedUserId, reason } = route.params as {
    postId: string;
    reportedUserId: string;
    reason: PostReportReason;
  };
```

Replace with:

```typescript
  const { postId, reportedUserId, reason } = (route.params ?? {}) as {
    postId?: string;
    reportedUserId?: string;
    reason?: PostReportReason;
  };

  if (!postId || !reportedUserId || !reason) {
    navigation.goBack();
    return null;
  }
```

- [ ] **Step 4: Commit**

```bash
git add mobile/src/screens/ChatScreen.tsx mobile/src/screens/community/ReportReasonScreen.tsx mobile/src/screens/community/ReportDetailScreen.tsx
git commit -m "fix(mobile): add null guards to route params on ChatScreen, ReportReason, ReportDetail"
```

---

### Task 5: Fix Unhandled Promise in ChallengeActivityItems

**Files:**
- Modify: `mobile/src/components/community/ChallengeActivityItems.tsx`

- [ ] **Step 1: Add .catch() to the getUserById promise**

In `mobile/src/components/community/ChallengeActivityItems.tsx`, find the useEffect at line 17-19:

```typescript
  useEffect(() => {
    getUserById(checkIn.userId).then(setUserProfile);
  }, [checkIn.userId]);
```

Replace with:

```typescript
  useEffect(() => {
    getUserById(checkIn.userId)
      .then(setUserProfile)
      .catch(() => {});
  }, [checkIn.userId]);
```

The component already falls back to `'U'` for the avatar name and handles null profile gracefully, so swallowing the error is safe here — the UI degrades to "Someone" display.

- [ ] **Step 2: Commit**

```bash
git add mobile/src/components/community/ChallengeActivityItems.tsx
git commit -m "fix(mobile): add catch handler to getUserById promise in ChallengeActivityItems"
```

---

### Task 6: Fix Auth Timeout Race Condition

**Files:**
- Modify: `mobile/src/context/AuthContext.tsx`

- [ ] **Step 1: Replace setTimeout with a flag that prevents stale timeout from firing**

The issue: the 5-second timeout at line 62-69 can fire simultaneously with `onAuthStateChanged`, causing a race. The timeout sets `isAuthReady(true)` while `onAuthStateChanged` also sets it. If the timeout fires first with no user, the app shows login. Then `onAuthStateChanged` fires with a user, but the user briefly sees the login screen.

In `mobile/src/context/AuthContext.tsx`, find the auth state effect (around line 59-120). The current timeout code is:

```typescript
    const authTimeout = setTimeout(() => {
      setIsAuthReady((prev) => {
        if (!prev) {
          logger.warn('⚠️ Auth state timeout - unblocking app after 5s');
        }
        return true;
      });
    }, 5000);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      clearTimeout(authTimeout);
      setUser(user);
      setIsAuthReady(true);
```

Replace the timeout block and the first two lines of the `onAuthStateChanged` callback with:

```typescript
    let authResolved = false;

    const authTimeout = setTimeout(() => {
      if (!authResolved) {
        authResolved = true;
        logger.warn('⚠️ Auth state timeout - unblocking app after 5s');
        setIsAuthReady(true);
      }
    }, 5000);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      authResolved = true;
      clearTimeout(authTimeout);
      setUser(user);
      setIsAuthReady(true);
```

The `authResolved` flag ensures:
- If `onAuthStateChanged` fires first (normal case): timeout is cleared and flag prevents it from firing
- If timeout fires first (Firebase stall): flag prevents `onAuthStateChanged` from re-setting state if it arrives late — actually it still will set state which is fine, because at that point we *want* the real auth state to take over

The key improvement: the timeout no longer calls `setIsAuthReady` via the functional updater which could interleave with the real auth callback. It only fires if auth hasn't resolved yet.

- [ ] **Step 2: Commit**

```bash
git add mobile/src/context/AuthContext.tsx
git commit -m "fix(mobile): prevent auth timeout race condition with resolved flag"
```

---

### Task 7: Verify All Changes

**Files:**
- No file changes — verification only

- [ ] **Step 1: Verify app.json changes**

```bash
cd mobile && cat app.json | grep -A1 NSPhotoLibrary
```

Expected: Both `NSPhotoLibraryUsageDescription` and `NSPhotoLibraryAddUsageDescription` present.

```bash
cd mobile && cat app.json | grep versionCode
```

Expected: `"versionCode": 2`

- [ ] **Step 2: Verify babel config**

```bash
cd mobile && cat babel.config.js
```

Expected: `transform-remove-console` plugin with NO `exclude` option.

- [ ] **Step 3: Verify route param guards compile**

```bash
cd mobile && npx tsc --noEmit 2>&1 | head -20
```

Expected: No new TypeScript errors from the changes. (Pre-existing errors may appear — only check for errors in files we modified.)

- [ ] **Step 4: Check npm audit status**

```bash
cd mobile && npm audit 2>&1 | tail -5
```

Expected: Fewer vulnerabilities than before. Ideally 0 high-severity.

- [ ] **Step 5: Commit any fixes**

If any issues were found during verification:

```bash
git add -A
git commit -m "fix(mobile): address issues found during pre-launch verification"
```
