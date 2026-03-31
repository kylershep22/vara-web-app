# Pre-Launch Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all must-fix and should-fix issues identified in the pre-launch UX review so the app is ready for public release.

**Architecture:** All changes are isolated fixes to existing screens. No new services, no new data models. Most tasks are copy changes, style adjustments, or small component refactors. The largest change is converting the SignupScreen snackbar to match the error banner pattern used in LoginScreen/ForgotPasswordScreen.

**Tech Stack:** React Native/TypeScript, Expo, react-native-safe-area-context

---

## File Structure

### Modified Files

| File | Change |
|------|--------|
| `mobile/src/screens/auth/SignupScreen.tsx` | Open legal URLs in browser, replace snackbar with error banner |
| `mobile/src/screens/onboarding/OnboardingQuickStartScreen.tsx` | Remove console.log statements |
| `mobile/src/screens/SettingsScreen.tsx` | Remove em dash from reflection info |
| `mobile/src/screens/discover/SleepScreen.tsx` | Reframe "Volume 2 coming soon" |
| `mobile/src/screens/JournalScreen.tsx` | Remove voice input button |
| `mobile/src/screens/auth/EmailVerificationScreen.tsx` | Improve error messages |
| `mobile/src/screens/onboarding/OnboardingValuesScreen.tsx` | Fix disabled opacity |
| `mobile/App.tsx` | Coordinate splash screen with font/auth readiness |
| `mobile/src/navigation/AppNavigator.tsx` | Standardize header configuration |

---

## Task 1: Signup Screen - Link Terms of Service and Privacy Policy

**Files:**
- Modify: `mobile/src/screens/auth/SignupScreen.tsx`

- [ ] **Step 1: Read the current file to confirm imports and structure**

Read `mobile/src/screens/auth/SignupScreen.tsx` in full.

- [ ] **Step 2: Add Linking import and replace alert handlers**

Add to imports:
```typescript
import { Linking } from 'react-native';
```

Replace the `handleOpenTerms` and `handleOpenPrivacy` functions (approximately lines 112-129) with:

```typescript
const handleOpenTerms = () => {
  Linking.openURL('https://www.varawellness.co/terms-of-service');
};

const handleOpenPrivacy = () => {
  Linking.openURL('https://www.varawellness.co/privacy-policy');
};
```

Remove the `Alert` import if it's no longer used elsewhere in the file. Check first - if `Alert` is used in error handling (e.g., `Alert.alert('Error', ...)`), keep the import.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/screens/auth/SignupScreen.tsx
git commit -m "fix: link Terms of Service and Privacy Policy to live URLs"
```

---

## Task 2: Signup Screen - Replace Bottom Snackbar with Error Banner

**Files:**
- Modify: `mobile/src/screens/auth/SignupScreen.tsx`

- [ ] **Step 1: Read the current file to identify all snackbar usage**

Read `mobile/src/screens/auth/SignupScreen.tsx` and identify:
- The snackbar state variables (snackbarVisible, snackbarMessage, snackbarType)
- All places that set snackbar state (error catch blocks, success messages)
- The snackbar JSX at the bottom of the component
- Whether the success snackbar ("Account created!") needs different treatment

- [ ] **Step 2: Add Animated import and refactor state**

Add `Animated` and `useRef` to the React Native imports if not already present. Add a ScrollView ref.

Replace the snackbar state variables:
```typescript
// Remove these:
// const [snackbarVisible, setSnackbarVisible] = useState(false);
// const [snackbarMessage, setSnackbarMessage] = useState('');
// const [snackbarType, setSnackbarType] = useState<'error' | 'success'>('error');

// Add these:
const scrollRef = useRef<ScrollView>(null);
const [errorMessage, setErrorMessage] = useState('');
const errorOpacity = useRef(new Animated.Value(0)).current;
const [successMessage, setSuccessMessage] = useState('');
const successOpacity = useRef(new Animated.Value(0)).current;
```

Add helper functions:
```typescript
const showError = (message: string) => {
  setSuccessMessage('');
  setErrorMessage(message);
  errorOpacity.setValue(0);
  Animated.timing(errorOpacity, {
    toValue: 1,
    duration: 250,
    useNativeDriver: true,
  }).start();
  scrollRef.current?.scrollTo({ y: 0, animated: true });
};

const dismissError = () => {
  Animated.timing(errorOpacity, {
    toValue: 0,
    duration: 200,
    useNativeDriver: true,
  }).start(() => setErrorMessage(''));
};

const showSuccess = (message: string) => {
  setErrorMessage('');
  setSuccessMessage(message);
  successOpacity.setValue(0);
  Animated.timing(successOpacity, {
    toValue: 1,
    duration: 250,
    useNativeDriver: true,
  }).start();
  scrollRef.current?.scrollTo({ y: 0, animated: true });
};
```

- [ ] **Step 3: Update all snackbar callers**

Find every `setSnackbarMessage` / `setSnackbarVisible` / `setSnackbarType` call and replace:

For error cases (in catch blocks):
```typescript
// Old:
// setSnackbarMessage(errorMessage);
// setSnackbarType('error');
// setSnackbarVisible(true);

// New:
showError(errorMessage);
```

For success case (after account creation):
```typescript
// Old:
// setSnackbarMessage('Account created! Please check your email to verify your account.');
// setSnackbarType('success');
// setSnackbarVisible(true);

// New:
showSuccess('Account created! Please check your email to verify your account.');
```

- [ ] **Step 4: Replace snackbar JSX with inline banners**

Add `ref={scrollRef}` to the ScrollView.

Remove the old snackbar JSX block (the `{snackbarVisible && (` block at the bottom).

Add the error and success banners inside the ScrollView, between the AuthHeader and the form:

```tsx
{/* Error Banner */}
{!!errorMessage && (
  <Animated.View style={[styles.errorBanner, { opacity: errorOpacity }]}>
    <Icon name="alert-circle-outline" size={20} color={Colors.error} style={styles.bannerIcon} />
    <Text style={styles.bannerText}>{errorMessage}</Text>
    <TouchableOpacity onPress={dismissError} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <Icon name="close" size={18} color={Colors.textSecondary} />
    </TouchableOpacity>
  </Animated.View>
)}

{/* Success Banner */}
{!!successMessage && (
  <Animated.View style={[styles.successBanner, { opacity: successOpacity }]}>
    <Icon name="check-circle-outline" size={20} color={Colors.evergreenTeal} style={styles.bannerIcon} />
    <Text style={styles.bannerText}>{successMessage}</Text>
  </Animated.View>
)}
```

- [ ] **Step 5: Add banner styles and remove old snackbar styles**

Remove the old `snackbar` and `snackbarSuccess` styles. Add:

```typescript
errorBanner: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#FDF2F0',
  borderWidth: 1,
  borderColor: 'rgba(217, 122, 110, 0.3)',
  borderRadius: 12,
  paddingVertical: 12,
  paddingHorizontal: 14,
  marginBottom: Spacing.lg,
},
successBanner: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#F0F7F0',
  borderWidth: 1,
  borderColor: 'rgba(27, 94, 87, 0.2)',
  borderRadius: 12,
  paddingVertical: 12,
  paddingHorizontal: 14,
  marginBottom: Spacing.lg,
},
bannerIcon: {
  marginRight: 10,
},
bannerText: {
  flex: 1,
  color: Colors.textPrimary,
  fontSize: 14,
  lineHeight: 20,
},
```

- [ ] **Step 6: Commit**

```bash
git add mobile/src/screens/auth/SignupScreen.tsx
git commit -m "fix: replace signup snackbar with inline error/success banners"
```

---

## Task 3: Remove Console.log from Onboarding

**Files:**
- Modify: `mobile/src/screens/onboarding/OnboardingQuickStartScreen.tsx`

- [ ] **Step 1: Read the file and locate all console.log/console.error statements**

Read `mobile/src/screens/onboarding/OnboardingQuickStartScreen.tsx`. The statements to remove or gate:

| Line | Statement |
|------|-----------|
| ~218 | `console.log('🎯 Creating template:', ...)` |
| ~219 | `console.log('📝 Template data:', ...)` |
| ~227 | `console.log('✅ Goal created successfully! ID:', ...)` |
| ~234 | `console.log('📝 Creating habit with data:', ...)` |
| ~236 | `console.log('✅ Habit created successfully! ID:', ...)` |
| ~239 | `console.log('🚀 Navigating to tour...')` |

Note: `console.error` calls (lines ~247, ~285) should be kept - those log actual errors.

- [ ] **Step 2: Remove or gate the console.log statements**

Delete all 6 `console.log` lines listed above. Keep `console.error` lines intact.

If the project uses a `__DEV__` gating pattern elsewhere, check if there's a logger utility. If not, simply delete the lines.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/screens/onboarding/OnboardingQuickStartScreen.tsx
git commit -m "fix: remove debug console.log statements from onboarding"
```

---

## Task 4: Remove Em Dashes from Settings Screen

**Files:**
- Modify: `mobile/src/screens/SettingsScreen.tsx`

- [ ] **Step 1: Read the file and find all em dashes**

Read `mobile/src/screens/SettingsScreen.tsx`. The em dash is in the `REFLECTION_INFO_BULLETS` constant (approximately line 39):

```typescript
{ emoji: '\u{1F4C8}', text: 'Tracks your consistency quality over time \u2014 not just whether you did the habit' },
```

Also search the entire file for any other `\u2014` or `—` characters.

- [ ] **Step 2: Replace the em dash**

Change:
```typescript
{ emoji: '\u{1F4C8}', text: 'Tracks your consistency quality over time \u2014 not just whether you did the habit' },
```

To:
```typescript
{ emoji: '\u{1F4C8}', text: 'Tracks your consistency quality over time, not just whether you did the habit' },
```

Fix any other em dashes found in the file with the same pattern (replace with comma, period, or rewrite).

- [ ] **Step 3: Commit**

```bash
git add mobile/src/screens/SettingsScreen.tsx
git commit -m "fix: remove em dashes from settings screen copy"
```

---

## Task 5: Reframe Sleep Screen Placeholder

**Files:**
- Modify: `mobile/src/screens/discover/SleepScreen.tsx`

- [ ] **Step 1: Read the file and find the "Volume 2" text**

Read `mobile/src/screens/discover/SleepScreen.tsx`. The placeholder is approximately at lines 167-173:

```tsx
{/* Volume 2 Nudge */}
<View style={styles.nudgeCard}>
  <Text style={styles.nudgeText}>
    More stories are on the way. Volume 2 coming soon.
  </Text>
</View>
```

- [ ] **Step 2: Reframe the copy**

Replace the nudge card content:

```tsx
{/* More Content Nudge */}
<View style={styles.nudgeCard}>
  <Text style={styles.nudgeText}>
    New sleep content is added regularly. Check back for more.
  </Text>
</View>
```

This reads as a living library rather than an unfinished product.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/screens/discover/SleepScreen.tsx
git commit -m "fix: reframe sleep library placeholder copy"
```

---

## Task 6: Remove Voice Input Button from Journal

**Files:**
- Modify: `mobile/src/screens/JournalScreen.tsx`

- [ ] **Step 1: Read the file and locate the voice input code**

Read `mobile/src/screens/JournalScreen.tsx`. Find:
1. The `handleVoiceInput` function (approximately line 138-144)
2. The voice button JSX (approximately lines 284-293)
3. The `voiceButton` style in StyleSheet
4. Any `Ionicons` import used only for the mic icon

- [ ] **Step 2: Remove the voice input function**

Delete the `handleVoiceInput` function entirely.

- [ ] **Step 3: Remove the voice button JSX**

Delete the `<TouchableOpacity style={styles.voiceButton} onPress={handleVoiceInput}>` block and its contents.

- [ ] **Step 4: Remove the voiceButton style**

Delete the `voiceButton` style from the StyleSheet.create block.

- [ ] **Step 5: Clean up imports**

Check if `Ionicons` is used anywhere else in the file. If this was the only usage, remove the `Ionicons` import. If it's used elsewhere, keep it.

- [ ] **Step 6: Commit**

```bash
git add mobile/src/screens/JournalScreen.tsx
git commit -m "fix: remove non-functional voice input button from journal"
```

---

## Task 7: Improve Email Verification Error Messages

**Files:**
- Modify: `mobile/src/screens/auth/EmailVerificationScreen.tsx`

- [ ] **Step 1: Read the file and find the error messages**

Read `mobile/src/screens/auth/EmailVerificationScreen.tsx`. Find the error handling block (approximately lines 104-111):

```typescript
} catch (error: any) {
  setResendState('idle');
  if (error.code === 'auth/too-many-requests') {
    setFeedbackMessage('Too many attempts. Please wait a few minutes.');
  } else {
    setFeedbackMessage('Something went wrong. Try again when ready.');
  }
}
```

- [ ] **Step 2: Replace with more specific messages**

```typescript
} catch (error: any) {
  setResendState('idle');
  if (error.code === 'auth/too-many-requests') {
    setFeedbackMessage('Too many attempts. Please wait a few minutes before trying again.');
  } else if (error.code === 'auth/network-request-failed') {
    setFeedbackMessage('No internet connection. Check your network and try again.');
  } else {
    setFeedbackMessage('We couldn\'t send the email right now. Please try again in a moment.');
  }
}
```

- [ ] **Step 3: Also fix the cooldown text formatting if present**

Look for the cooldown timer text. If it shows `${cooldownSeconds}s`, change to:

```typescript
`Resend available in ${cooldownSeconds} seconds`
```

- [ ] **Step 4: Commit**

```bash
git add mobile/src/screens/auth/EmailVerificationScreen.tsx
git commit -m "fix: improve email verification error messages"
```

---

## Task 8: Fix Disabled Card Opacity in Onboarding Values

**Files:**
- Modify: `mobile/src/screens/onboarding/OnboardingValuesScreen.tsx`

- [ ] **Step 1: Read the file and find the opacity value**

Read `mobile/src/screens/onboarding/OnboardingValuesScreen.tsx`. Find the `cardDisabled` style (approximately line 292):

```typescript
cardDisabled: {
  opacity: 0.35,
},
```

- [ ] **Step 2: Increase opacity to meet accessibility guidelines**

Change to:
```typescript
cardDisabled: {
  opacity: 0.55,
},
```

0.55 provides sufficient contrast while still visually distinguishing disabled from enabled cards.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/screens/onboarding/OnboardingValuesScreen.tsx
git commit -m "fix: increase disabled card opacity for accessibility"
```

---

## Task 9: Coordinate Splash Screen with Font and Auth Loading

**Files:**
- Modify: `mobile/App.tsx`

- [ ] **Step 1: Read the current App.tsx**

Read `mobile/App.tsx` in full. The current splash logic (approximately lines 48-53):

```typescript
useEffect(() => {
  SplashScreen.hideAsync().catch((e) =>
    console.warn('SplashScreen.hideAsync failed (non-fatal):', e)
  );
}, []);
```

Also find the `fontsLoaded` variable from the `useFonts` hook and the `isAuthReady` value if available at this level.

- [ ] **Step 2: Replace immediate hide with coordinated hide**

Replace the splash screen useEffect with one that waits for fonts:

```typescript
useEffect(() => {
  if (fontsLoaded) {
    SplashScreen.hideAsync().catch((e) =>
      console.warn('SplashScreen.hideAsync failed (non-fatal):', e)
    );
  }
}, [fontsLoaded]);
```

Note: Auth readiness is handled inside AppNavigator (which shows its own loading spinner), so we only need to wait for fonts at this level. This prevents the white flash between splash screen and first render.

If `fontsLoaded` isn't directly available (check how `useFonts` works in the file), the pattern may be:
```typescript
const [fontsLoaded] = useFonts({ ... });

useEffect(() => {
  if (fontsLoaded) {
    SplashScreen.hideAsync().catch(() => {});
  }
}, [fontsLoaded]);

if (!fontsLoaded) return null;
```

- [ ] **Step 3: Commit**

```bash
git add mobile/App.tsx
git commit -m "fix: keep splash screen visible until fonts are loaded"
```

---

## Task 10: Standardize Header Configuration

**Files:**
- Modify: `mobile/src/navigation/AppNavigator.tsx`

- [ ] **Step 1: Read the file to understand all header patterns**

Read `mobile/src/navigation/AppNavigator.tsx` in full. Identify:
1. All places where `headerStyle`, `headerTintColor`, `headerTitleStyle` are set
2. Which screens use `headerShown: false` with custom in-component headers
3. The most common header pattern (white background + teal back arrow)

- [ ] **Step 2: Create a shared header options object**

Near the top of the file (after imports, before component definitions), add:

```typescript
/** Standard header styling used across all navigators */
const standardHeaderOptions = {
  headerStyle: { backgroundColor: Colors.mistWhite, elevation: 0, shadowOpacity: 0 },
  headerTintColor: Colors.evergreenTeal,
  headerTitleStyle: { fontWeight: '600' as const, color: Colors.softCharcoal },
  headerBackTitleVisible: false,
};
```

- [ ] **Step 3: Apply to all stack navigators that use inline header config**

Replace all inline header configurations in `screenOptions` with the shared object. For each stack navigator that currently has:

```typescript
screenOptions={{
  headerStyle: { backgroundColor: Colors.mistWhite },
  headerTintColor: Colors.evergreenTeal,
  headerTitleStyle: { fontWeight: '600', color: Colors.softCharcoal },
}}
```

Replace with:
```typescript
screenOptions={standardHeaderOptions}
```

For individual screens that override headers (e.g., teal background on Profile), keep the override but spread the standard options first:

```typescript
options={{
  ...standardHeaderOptions,
  headerStyle: { backgroundColor: Colors.evergreenTeal },
  headerTintColor: '#FFFFFF',
}}
```

Do NOT change screens that use `headerShown: false` with custom in-component headers (most Community screens). Those are intentionally custom.

- [ ] **Step 4: Verify Discover screens use the shared config**

The Discover stack currently sets header config individually for each detail screen. Replace individual screen header options with the shared config, keeping screen-specific titles:

```typescript
<Stack.Screen
  name="BreathworkDetail"
  component={BreathworkDetailScreen}
  options={{ ...standardHeaderOptions, title: 'Breathwork' }}
/>
```

- [ ] **Step 5: Commit**

```bash
git add mobile/src/navigation/AppNavigator.tsx
git commit -m "refactor: standardize header configuration across navigators"
```

---

## Task 11: Add Retry Buttons to Error States

**Files:**
- Modify: `mobile/src/screens/HabitsScreen.tsx`
- Modify: `mobile/src/screens/GoalsScreen.tsx`

These are the two most-visited screens with error states that lack retry buttons. Other screens can be updated later.

- [ ] **Step 1: Read both files and find their error state JSX**

Read the error state rendering in both files. They likely show an alert icon, error message text, and a suggestion to check connectivity. They do NOT have a retry button.

- [ ] **Step 2: Add retry button to HabitsScreen error state**

Find the error state JSX in HabitsScreen.tsx. After the error message text, add:

```tsx
<Button
  variant="outline"
  onPress={() => {
    setError(null);
    loadHabits();
  }}
  style={{ marginTop: Spacing.base }}
>
  Try again
</Button>
```

Check what the reload/refresh function is called in the habits hook or screen. It may be `refetch()`, `loadHabits()`, or a setter that triggers re-render. Use whatever exists. If there's a `refreshing` state with a pull-to-refresh handler, call that same handler.

- [ ] **Step 3: Add retry button to GoalsScreen error state**

Same pattern as HabitsScreen. Find the error state, add:

```tsx
<Button
  variant="outline"
  onPress={() => {
    setError(null);
    loadGoals();
  }}
  style={{ marginTop: Spacing.base }}
>
  Try again
</Button>
```

Ensure `Button` is imported from the components. It likely already is.

- [ ] **Step 4: Commit**

```bash
git add mobile/src/screens/HabitsScreen.tsx mobile/src/screens/GoalsScreen.tsx
git commit -m "fix: add retry buttons to habits and goals error states"
```

---

## Task 12: Final Em Dash Scan and Verification

- [ ] **Step 1: Scan all modified files for em dashes**

Run:
```bash
cd C:/Users/kyler/wellness-app && grep -r '—\|\\u2014\|\\u{2014}' mobile/src/screens/auth/SignupScreen.tsx mobile/src/screens/onboarding/OnboardingQuickStartScreen.tsx mobile/src/screens/SettingsScreen.tsx mobile/src/screens/discover/SleepScreen.tsx mobile/src/screens/JournalScreen.tsx mobile/src/screens/auth/EmailVerificationScreen.tsx mobile/src/screens/onboarding/OnboardingValuesScreen.tsx mobile/src/navigation/AppNavigator.tsx mobile/src/screens/HabitsScreen.tsx mobile/src/screens/GoalsScreen.tsx
```

Expected: No matches. If any found, fix them.

- [ ] **Step 2: Run existing tests to check for regressions**

```bash
cd mobile && npx jest --forceExit 2>&1 | tail -20
```

Expected: All tests pass.

- [ ] **Step 3: Commit any final fixes**

```bash
git add -A
git commit -m "chore: final em-dash scan and verification for pre-launch polish"
```

---

## Execution Summary

| Task | What It Fixes | Priority | Files |
|------|--------------|----------|-------|
| 1 | Terms/Privacy links to real URLs | Must fix | SignupScreen |
| 2 | Signup snackbar to error banner | Should fix | SignupScreen |
| 3 | Remove console.log from onboarding | Must fix | OnboardingQuickStartScreen |
| 4 | Em dashes in settings | Must fix | SettingsScreen |
| 5 | Sleep screen placeholder copy | Must fix | SleepScreen |
| 6 | Remove voice input button | Must fix | JournalScreen |
| 7 | Email verification error messages | Should fix | EmailVerificationScreen |
| 8 | Disabled card opacity | Should fix | OnboardingValuesScreen |
| 9 | Splash screen timing | Should fix | App.tsx |
| 10 | Header consistency | Should fix | AppNavigator |
| 11 | Error state retry buttons | Should fix | HabitsScreen, GoalsScreen |
| 12 | Final verification | Cleanup | All modified files |
