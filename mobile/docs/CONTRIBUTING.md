# Contributing to Vara Mobile

Guidelines for contributing to the Vara Wellness mobile app.

## Adding a New Screen

1. Create the screen in `src/screens/YourScreen.tsx`
2. Add the route in `src/navigation/AppNavigator.tsx`
3. Keep file size under 300 lines -- extract components into `src/components/`. This is the `max-lines` rule in `.eslintrc.js`; it reports as a warning, so it will not fail `npm run lint` for you.
4. Import design tokens from `src/constants` (never hardcode colors, sizes, or spacing)
5. Add accessibility labels to all interactive elements

### Screen Template

```tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography } from '../constants';

const YourScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Screen Title</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.mistWhite,
  },
  content: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.lg,
  },
  heading: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.evergreenTeal,
  },
});

export default YourScreen;
```

## Adding a New Component

1. Place in the appropriate `src/components/{category}/` directory
2. Use design tokens from `src/constants` for all visual values
3. Add `accessibilityLabel` and `accessibilityRole` to interactive elements
4. Respect `useReducedMotion` if the component has animations
5. Ensure touch targets are at least 44x44 points

### Accessibility Checklist

- [ ] All `TouchableOpacity` / `Pressable` elements have `accessibilityRole="button"` and `accessibilityLabel`
- [ ] Checkboxes have `accessibilityRole="checkbox"` and `accessibilityState={{ checked }}`
- [ ] Images have `accessibilityLabel` or `accessible={false}` if decorative
- [ ] Progress indicators have `accessibilityRole="progressbar"` with value
- [ ] Use helpers from `src/utils/accessibility.ts` for new pressables -- they are the intended pattern going forward. Adoption across existing screens is not done and is tracked as a separate accessibility remediation slice.

## Running Tests

```bash
npm test                # Run all tests
npm run test:watch      # Watch mode during development
npm run test:coverage   # Generate coverage report
```

### Writing Tests

Place test files next to the source file or in a `__tests__/` directory:

```
src/services/subscription.service.ts
src/services/subscription.service.test.ts

src/components/celebrations/
src/components/celebrations/__tests__/QuietFinish.test.tsx
```

Key test areas:
- Service layer: unit test all exported functions
- Screens: render tests verifying key UI elements are present
- Brand compliance: brand compliance tests in `src/__tests__/brandCompliance.test.ts` catch prohibited copy

### Brand Compliance

The brand compliance test suite checks screen source files for prohibited patterns. If you add a new screen, add its path to `SCREEN_FILES` in `src/__tests__/brandCompliance.test.ts`.

Prohibited patterns: "streak" (in user-visible strings), "confetti", "Unlock Your", "Subscribe Now", "Don't break", "Limited time", "Act now".

## Pre-Commit Checklist

Before submitting a PR:

- [ ] `npm run lint` passes with no errors
- [ ] `npm test` passes with no failures
- [ ] No hardcoded colors, font sizes, or spacing values (use tokens)
- [ ] All new interactive elements have accessibility labels
- [ ] Animations respect `useReducedMotion`
- [ ] No new `console.log` calls (use `logger` from `src/utils/logger.ts`)
- [ ] No secrets or API keys in committed code
- [ ] File size under 300 lines (extract if larger) -- matches `max-lines` in `.eslintrc.js`
- [ ] Brand compliance: no prohibited copy patterns
- [ ] If new user-facing strings were added as drafts, the copyDraftSentinel count is updated in the same commit and named in the commit message

## Code Style

- **Components:** PascalCase (`GoalCard.tsx`)
- **Services:** camelCase with `.service.ts` suffix
- **Hooks:** `use` prefix (`useSubscription.ts`)
- **Types:** PascalCase in `src/types/`
- **Constants:** UPPER_SNAKE_CASE for config arrays, PascalCase for token objects

ESLint and Prettier are configured. Run `npm run lint:fix && npm run format` to auto-fix.
