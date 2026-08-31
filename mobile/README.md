# Vara Wellness Mobile App

A comprehensive wellness app that helps users build healthy habits, track goals, journal, and receive AI-powered coaching. Built with React Native and Expo, backed by Firebase.

## Tech Stack

- **Framework:** React Native 0.79.6
- **Platform:** Expo SDK 53
- **Language:** TypeScript 5.8.3
- **Navigation:** React Navigation v7
- **Backend:** Firebase (Auth, Firestore, Storage)
- **AI:** OpenAI GPT-4o-mini via Express backend
- **UI:** Custom design token system (`src/constants/`), React Native Paper
- **Testing:** Jest with React Native Testing Library
- **Forms:** React Hook Form
- **Animations:** React Native Reanimated

## Project Structure

```
mobile/
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── ai/              # AI chat widget
│   │   ├── brain/           # Brain health dashboard widgets
│   │   ├── celebrations/    # Completion acknowledgments (QuietFinish, etc.)
│   │   ├── community/       # Community features (groups, posts, people)
│   │   ├── dashboard/       # Dashboard cards and widgets
│   │   ├── discovery/       # Progressive feature discovery
│   │   ├── goals/           # Goal tracking components
│   │   ├── habits/          # Habit tracking and wizard
│   │   ├── insights/        # Analytics and charts
│   │   ├── journal/         # Journal entries and filters
│   │   ├── library/         # Breathwork, movement, sleep content
│   │   ├── onboarding/      # Onboarding flow components
│   │   ├── paywall/         # Subscription pricing UI
│   │   ├── profile/         # User profile components
│   │   ├── routines/        # Focus routines
│   │   └── shared/          # BaseCard, Badge, ErrorBoundary, etc.
│   ├── screens/              # Screen components (one per route)
│   │   ├── auth/            # Login, Signup, ForgotPassword
│   │   ├── community/       # Community hub, groups, people
│   │   ├── discover/        # Breathwork, movement, sleep, masterclass
│   │   ├── Focus/           # Pomodoro timer and routines
│   │   └── onboarding/      # Onboarding flow screens
│   ├── navigation/           # React Navigation config (AppNavigator)
│   ├── context/              # React Context providers (Auth, Audio, Toast)
│   ├── services/             # Firebase services and API client
│   │   └── firebase/        # Firestore CRUD (habits, goals, community, etc.)
│   ├── hooks/                # Custom hooks (useSubscription, useCelebrations, etc.)
│   ├── utils/                # Utilities (accessibility, logger, subscription)
│   ├── constants/            # Design token system (colors, typography, spacing)
│   ├── config/               # Environment and Firebase configuration
│   └── types/                # TypeScript type definitions
├── assets/                   # Images, fonts, icons
├── __mocks__/                # Jest file mocks
├── docs/                     # Additional documentation
├── jest.config.js            # Jest configuration
├── jest.setup.js             # Test setup (matchers)
├── app.json                  # Expo configuration
├── eas.json                  # EAS Build configuration
├── babel.config.js           # Babel configuration
├── tsconfig.json             # TypeScript configuration
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Expo CLI: `npm install -g eas-cli`
- iOS: Xcode 15+ (for simulator) or physical device
- Android: Android Studio (for emulator) or physical device

### Installation

```bash
cd mobile
npm install
```

### Environment Setup

```bash
cp .env.example .env
# Edit .env with your Firebase credentials
```

See `.env.example` for all required variables. Key variables:

- `EXPO_PUBLIC_FIREBASE_*` - Firebase configuration
- `EXPO_PUBLIC_API_URL` - Backend API URL
- `EXPO_PUBLIC_ENV` - Environment (development/staging/production)

### Running Locally

```bash
npx expo start          # Start dev server
npx expo start --ios    # Open in iOS simulator
npx expo start --android # Open in Android emulator
npx expo start --clear  # Start with cleared cache
```

### Running Tests

```bash
npm test                # Run all tests
npm run test:watch      # Watch mode
npm run test:coverage   # With coverage report
```

### Building

```bash
eas build --platform ios --profile development   # Dev build
eas build --platform ios --profile preview        # TestFlight build
eas build --platform ios --profile production      # Production build
```

Production builds pull sensitive values from EAS Secrets (see `EAS_SECRETS_SETUP.md`).

## Architecture

### Key Decisions

- **State management:** Context API for auth, notifications, and audio state. Direct Firestore `onSnapshot()` subscriptions for real-time data.
- **Design tokens:** Custom token system in `src/constants/` (colors, typography, spacing). All UI components reference tokens rather than hardcoded values.
- **Auth:** Firebase Authentication with tokens stored in `expo-secure-store` (chunking for large tokens). Periodic token refresh every 30 minutes.
- **Navigation:** React Navigation v7 with bottom tabs + native stack. Deep linking configured in `src/navigation/linking.ts`.
- **Subscriptions:** 7-day free trial on signup. Stub service layer (`subscription.service.ts`) ready for RevenueCat or StoreKit integration.

### Design Token System

Colors, typography, and spacing are defined in `src/constants/`:

- **Colors** (`colors.ts`): Evergreen Teal (#1B5E57), Silver Sage (#B8CDBA), Mist White (#FAFAF6), Soft Charcoal (#3E3E3E), plus functional and brain pillar colors.
- **Typography** (`typography.ts`): Inter font family, sizes from xs (12px) to 3xl (32px), with preset text styles (h1, h2, body, caption, etc.).
- **Spacing** (`spacing.ts`): Scale from 2xs (2px) to 3xl (64px), plus Layout constants for border radius, shadows, button heights, and avatar sizes.

See `../Vara_Mobile_UI_Standards.md` Section 3.3 for the token-to-code mapping, and the rest of that document for the design system of record.

## Linting and Formatting

```bash
npm run lint            # Check for lint errors
npm run lint:fix        # Auto-fix lint errors
npm run format          # Format with Prettier
```

## Documentation

- `EAS_SECRETS_SETUP.md` - EAS Secrets and store submission setup
- `DEPLOYMENT_GUIDE.md` - Deployment procedures
- `../Vara_Mobile_UI_Standards.md` - Design system of record; Section 3.3 is the token-to-code mapping
- `docs/CONTRIBUTING.md` - Contribution guidelines
