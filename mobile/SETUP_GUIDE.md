# Vara Mobile App - Setup Guide

This guide will help you set up and run the Vara mobile app for the first time.

## Prerequisites Checklist

Before you begin, make sure you have:

- [ ] Node.js 18+ installed (`node --version`)
- [ ] npm installed (`npm --version`)
- [ ] Git installed
- [ ] A smartphone OR an emulator/simulator

## Step 1: Install Dependencies

Navigate to the mobile directory and install all packages:

```bash
cd mobile
npm install
```

This may take a few minutes. You should see "added XXX packages" when complete.

## Step 2: Configure Environment Variables

1. **Copy the example file:**
   ```bash
   cp .env.example .env
   ```

2. **Get Firebase configuration:**
   - Go to [Firebase Console](https://console.firebase.google.com/project/your-project-id/settings/general)
   - **IMPORTANT**: Add iOS and Android apps to your Firebase project first!

   **For iOS:**
   - Click "Add app" → iOS
   - Bundle ID: `com.vara.wellness`
   - Download the config (or just copy the values)
   - Copy the iOS App ID

   **For Android:**
   - Click "Add app" → Android
   - Package name: `com.vara.wellness`
   - Download the config (or just copy the values)
   - Copy the Android App ID

3. **Edit `.env` file:**
   Open the `.env` file and fill in your Firebase values:
   ```
   EXPO_PUBLIC_FIREBASE_API_KEY=your_actual_api_key_here
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
   EXPO_PUBLIC_FIREBASE_IOS_APP_ID=your_ios_app_id
   EXPO_PUBLIC_FIREBASE_ANDROID_APP_ID=your_android_app_id
   ```

   The other values should already be correct (your-project-id project).

4. **Set backend API URL (optional for now):**
   If your backend is running locally:
   ```
   EXPO_PUBLIC_API_URL=http://localhost:5001
   ```

## Step 3: Start the Development Server

```bash
npm start
```

You should see a QR code and options to press `i` (iOS), `a` (Android), or `w` (web).

## Step 4: Run the App

You have three options:

### Option A: Use Expo Go (Easiest)

1. **Install Expo Go:**
   - iOS: [App Store](https://apps.apple.com/app/expo-go/id982107779)
   - Android: [Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. **Scan the QR code:**
   - iOS: Use Camera app
   - Android: Use Expo Go app

3. The app should load on your device!

### Option B: iOS Simulator (Mac only)

1. **Install Xcode** from the Mac App Store
2. **Open Simulator**: Xcode → Open Developer Tool → Simulator
3. **In terminal, press `i`** or run:
   ```bash
   npm run ios
   ```

### Option C: Android Emulator

1. **Install Android Studio**
2. **Set up an emulator:**
   - Tools → AVD Manager → Create Virtual Device
   - Choose a device (e.g., Pixel 5)
   - Download a system image (e.g., Android 13)
   - Start the emulator

3. **In terminal, press `a`** or run:
   ```bash
   npm run android
   ```

## Step 5: Verify It's Working

You should see a welcome screen that says:

> **Vara Wellness**
>
> Mobile App Foundation Setup Complete! ✓

If you see this, congratulations! Phase 2 is complete.

## Troubleshooting

### Issue: "Missing environment variables" warning

**Solution:** Make sure you created the `.env` file and added your Firebase credentials.

### Issue: App won't load / White screen

**Solution:**
1. Stop the server (Ctrl+C)
2. Clear cache: `npm run clear`
3. Try again: `npm start`

### Issue: "Firebase not configured" error

**Solution:**
1. Verify `.env` file exists in `mobile/` directory
2. Check that all `EXPO_PUBLIC_FIREBASE_*` variables are filled in
3. Restart the dev server

### Issue: Network error / Can't connect to backend

**Solution:**
- If testing locally, make sure your backend is running (`npm run server` in the main project)
- On a physical device, update `EXPO_PUBLIC_API_URL` to your computer's IP address instead of `localhost`
  ```
  EXPO_PUBLIC_API_URL=http://192.168.1.XXX:5001
  ```

### Issue: Expo Go says "Something went wrong"

**Solution:**
1. Make sure you're on the same Wi-Fi network as your computer
2. Try opening the URL manually in Expo Go
3. Restart Expo Go app
4. Clear cache: `npm run clear`

## Next Steps

Once you have the app running, you're ready for **Phase 3: Authentication & Security**.

During Phase 1, you should:
1. Register for Apple Developer account ($99/year)
2. Register for Google Play Developer account ($25 one-time)
3. Finalize pricing strategy
4. Prepare legal docs (Privacy Policy, Terms of Service)

While you're working on Phase 1, I can continue building Phase 3-10.

## Useful Commands

```bash
# Start dev server
npm start

# Clear cache and restart
npm run clear

# Run on specific platform
npm run ios
npm run android
npm run web

# Check for issues
npx expo-doctor
```

## Getting Help

If you run into issues:

1. Check this troubleshooting section
2. Check `README.md` for more details
3. Run `npx expo-doctor` to diagnose problems
4. Check Expo documentation: https://docs.expo.dev/
5. Ask me for help!

## What's Next?

See the main roadmap document for the complete plan. Here's a quick overview:

- **Phase 1** (YOU): Register developer accounts
- **Phase 2** (DONE): Project foundation ✓
- **Phase 3**: Authentication & security
- **Phase 4**: Firebase services & API integration
- **Phase 5**: Subscription & monetization
- **Phase 6-8**: Feature development
- **Phase 9**: Performance optimization
- **Phase 10**: App store submission

Happy coding!
