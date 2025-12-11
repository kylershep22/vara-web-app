# Vara Wellness Mobile App

React Native mobile application for Vara Wellness platform, built with Expo and TypeScript.

## Tech Stack

- **Framework**: React Native 0.81.5
- **Platform**: Expo SDK 54
- **Language**: TypeScript
- **Navigation**: React Navigation v7
- **UI Library**: React Native Paper (Material Design 3)
- **State Management**: React Query (TanStack Query)
- **Backend**: Firebase (Auth, Firestore, Storage)
- **Forms**: React Hook Form
- **Subscriptions**: React Native IAP

## Project Structure

```
mobile/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   └── LoadingSpinner.tsx
│   ├── screens/             # Screen components
│   │   └── WelcomeScreen.tsx
│   ├── navigation/          # Navigation configuration (TBD)
│   ├── context/             # React Context providers (TBD)
│   ├── services/            # API & Firebase services (TBD)
│   ├── hooks/               # Custom React hooks (TBD)
│   ├── utils/               # Utility functions (TBD)
│   ├── constants/           # Design system & configuration
│   │   ├── colors.ts
│   │   ├── typography.ts
│   │   ├── spacing.ts
│   │   ├── theme.ts
│   │   └── index.ts
│   ├── config/              # Environment & Firebase config
│   │   ├── env.ts
│   │   ├── firebase.ts
│   │   └── index.ts
│   └── types/               # TypeScript type definitions (TBD)
├── assets/                  # Images, fonts, icons
├── .env.example            # Environment variables template
├── .gitignore
├── app.json                # Expo configuration
├── App.tsx                 # Root component
├── package.json
└── tsconfig.json
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Expo CLI (`npm install -g expo-cli`)
- iOS: Xcode (for iOS simulator) or Expo Go app
- Android: Android Studio (for emulator) or Expo Go app

### Installation

1. **Install dependencies:**
   ```bash
   cd mobile
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```

   Then edit `.env` and add your Firebase credentials:
   - Get values from [Firebase Console](https://console.firebase.google.com/project/vara-4a99f/settings/general)
   - Add iOS and Android apps to Firebase project first
   - Copy the config values to `.env`

3. **Start the development server:**
   ```bash
   npm start
   ```

4. **Run on your device/emulator:**
   - **iOS**: Press `i` in the terminal or scan QR code with Camera app
   - **Android**: Press `a` in the terminal or scan QR code with Expo Go
   - **Web**: Press `w` (for testing only, not production-ready)

## Available Scripts

- `npm start` - Start Expo development server
- `npm run android` - Run on Android emulator/device
- `npm run ios` - Run on iOS simulator/device
- `npm run web` - Run in web browser (testing only)

## Design System

The app uses a custom design system based on the Vara brand:

### Colors
- **Primary**: Evergreen Teal (#1B5E57)
- **Secondary**: Sunrise Amber (#F4C542)
- **Accent**: Silver Sage (#B8CDBA), Golden Apricot (#F5B971)
- **Background**: Mist White (#FAFAF6)
- **Text**: Soft Charcoal (#3E3E3E)

### Typography
- System fonts (iOS: San Francisco, Android: Roboto)
- Sizes: xs (12px) → 5xl (48px)
- Weights: light, regular, medium, semibold, bold

### Spacing
- xs: 4px → 4xl: 64px
- Screen padding: 16px horizontal, 24px vertical
- Border radius: 8-20px

## Configuration

### Firebase Setup

1. **Add iOS App** (in Firebase Console):
   - Bundle ID: `com.vara.wellness`
   - Download `GoogleService-Info.plist` (not needed for Expo, just get config values)
   - Copy iOS App ID to `.env`

2. **Add Android App** (in Firebase Console):
   - Package name: `com.vara.wellness`
   - Download `google-services.json` (not needed for Expo, just get config values)
   - Copy Android App ID to `.env`

3. **Enable Firebase services**:
   - Authentication (Email/Password)
   - Firestore Database
   - Storage
   - App Check (for bot prevention)

### App Configuration

Edit `app.json` to update:
- App name and slug
- Bundle identifiers (iOS/Android)
- Expo project ID (after creating EAS project)
- Owner username

## Building for App Stores

### Setup EAS (Expo Application Services)

1. **Install EAS CLI:**
   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo:**
   ```bash
   eas login
   ```

3. **Configure EAS:**
   ```bash
   eas build:configure
   ```

4. **Create development build:**
   ```bash
   eas build --profile development --platform ios
   eas build --profile development --platform android
   ```

5. **Create production build:**
   ```bash
   eas build --profile production --platform all
   ```

### Submit to App Stores

1. **iOS (App Store):**
   ```bash
   eas submit --platform ios
   ```
   - Requires Apple Developer account
   - App Store Connect credentials

2. **Android (Google Play):**
   ```bash
   eas submit --platform android
   ```
   - Requires Google Play Developer account
   - Service account key JSON

## Development Workflow

### Phase 2 ✅ COMPLETE
- [x] Project initialization
- [x] Dependencies installed
- [x] Design system configured
- [x] Firebase setup ready
- [x] Environment variables configured
- [x] Basic component library

### Phase 3 ✅ COMPLETE
- [x] Authentication screens (Login, Signup, Forgot Password)
- [x] Firebase Auth integration
- [x] Email verification flow
- [x] Auth Context with useAuth hook
- [x] Form validation utilities
- [x] Navigation (Auth stack + App stack)
- [x] Protected routes
- [x] Secure token storage
- [ ] Firebase App Check (requires developer accounts - Phase 1)

### Phase 4 ✅ COMPLETE
- [x] TypeScript types for all data models
- [x] Firestore service layer (goals, habits, tasks, journal)
- [x] API client for Express backend with retry logic
- [x] Real-time subscription hooks (useGoals, useHabits, etc.)
- [x] AI service integration (daily plan, chat, prompts)
- [x] Error handling throughout

### Phase 5 - Next
- [ ] React Native IAP setup
- [ ] Trial period tracking
- [ ] Subscription status management
- [ ] Paywall screens
- [ ] Receipt validation (Firebase Functions)

### Upcoming Phases
- Phase 6: Onboarding flow
- Phase 7: Core features (Dashboard, Journal, Community, etc.)
- Phase 8: Navigation & UX polish
- Phase 9: Scalability & performance
- Phase 10: Testing & App Store submission

## Environment Variables

See `.env.example` for all required variables. Key variables:

- `EXPO_PUBLIC_FIREBASE_*` - Firebase configuration
- `EXPO_PUBLIC_API_URL` - Backend API URL
- `EXPO_PUBLIC_IOS_PRODUCT_*` - iOS IAP product IDs
- `EXPO_PUBLIC_ANDROID_PRODUCT_*` - Android IAP product IDs

## Troubleshooting

### App won't start
- Clear cache: `npx expo start -c`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Check `.env` file exists and has valid values

### Firebase errors
- Verify Firebase config in `.env`
- Check Firebase Console for iOS/Android app registration
- Ensure Firebase services are enabled

### Build errors
- Check `app.json` for correct bundle identifiers
- Verify EAS project is configured
- Check credentials are set up in EAS

## Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Paper](https://callstack.github.io/react-native-paper/)
- [React Navigation](https://reactnavigation.org/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [EAS Build & Submit](https://docs.expo.dev/build/introduction/)

## Support

For issues or questions, contact the development team or file an issue in the project repository.
