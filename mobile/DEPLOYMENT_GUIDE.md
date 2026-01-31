# Vara Mobile App - Deployment Guide

## 📋 Table of Contents

1. [Environment Configuration](#environment-configuration)
2. [Development Setup](#development-setup)
3. [Backend Deployment Options](#backend-deployment-options)
4. [Mobile App Builds](#mobile-app-builds)
5. [App Store Submission](#app-store-submission)

---

## 🔧 Environment Configuration

The app uses different API URLs based on the environment:

| Environment | API URL | Use Case |
|------------|---------|----------|
| **Development** | `http://localhost:5001` | Expo Go on iOS simulator |
| **Development (Device)** | `http://192.168.x.x:5001` | Physical device testing |
| **Staging** | `https://staging-api.yourdomain.com` | Preview builds |
| **Production** | `https://us-central1-vara-4a99f.cloudfunctions.net` | App Store / Google Play |

### How It Works

The app automatically selects the correct API URL based on:

1. **Explicit .env variable**: If `EXPO_PUBLIC_API_URL` is set in `.env`, it uses that
2. **Environment auto-detection**: Otherwise, it uses the `EXPO_PUBLIC_ENV` value:
   - `development` → `http://localhost:5001`
   - `staging` → staging server URL
   - `production` → production server URL

**Configuration file**: `mobile/src/config/env.ts`

---

## 🛠️ Development Setup

### Option 1: iOS Simulator (Easiest)

The default `.env` configuration works out of the box:

```bash
# .env
EXPO_PUBLIC_API_URL=http://localhost:5001
EXPO_PUBLIC_ENV=development
```

**Steps:**
1. Start backend: `npm run server` (from root)
2. Start Expo: `cd mobile && npm start`
3. Press `i` for iOS simulator

### Option 2: Physical Device (iPhone/Android)

**Steps:**

1. **Get your computer's local IP address:**

   ```bash
   # Windows
   ipconfig

   # Mac/Linux
   ifconfig
   ```

   Look for your Wi-Fi adapter's IPv4 address (e.g., `192.168.1.100`)

2. **Create `.env.local` file:**

   ```bash
   cd mobile
   cp .env.local.example .env.local
   ```

3. **Update `.env.local` with your IP:**

   ```env
   EXPO_PUBLIC_API_URL=http://192.168.1.100:5001
   EXPO_PUBLIC_ENV=development
   ```

4. **Restart Expo:**

   ```bash
   npm start
   ```

   Press `r` to reload, or stop and restart the server

5. **Ensure both devices are on the same Wi-Fi network**

### Option 3: Android Emulator

Android emulator requires a special IP address:

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:5001
EXPO_PUBLIC_ENV=development
```

### Troubleshooting Development

**AI Chat not working?**

1. ✅ Backend running? Check: `http://localhost:5001/api/health`
2. ✅ Correct API URL in `.env`?
3. ✅ Restarted Expo after changing `.env`?
4. ✅ Phone and computer on same Wi-Fi?
5. ✅ Windows Firewall not blocking port 5001?

---

## 🚀 Backend Deployment Options

Before deploying the mobile app, you need to deploy the backend API.

### Option 1: Firebase Functions (Recommended)

**Pros:**
- Seamless integration with Firebase
- Auto-scaling
- No server management
- Free tier available

**Steps:**

1. **Prepare Functions directory:**

   ```bash
   cd backend
   # Move all files to a new 'functions' directory
   mkdir -p ../functions
   cp -r * ../functions/
   ```

2. **Initialize Firebase Functions:**

   ```bash
   cd ..
   firebase init functions
   # Select JavaScript/TypeScript
   # Use existing project: vara-4a99f
   ```

3. **Update function code:**

   ```javascript
   // functions/index.js
   const functions = require('firebase-functions');
   const app = require('./server'); // Your Express app

   exports.api = functions.https.onRequest(app);
   ```

4. **Deploy:**

   ```bash
   firebase deploy --only functions
   ```

5. **Your API URL will be:**
   ```
   https://us-central1-vara-4a99f.cloudfunctions.net/api
   ```

6. **Update production config:**

   The production API URL in `mobile/src/config/env.ts` is already set to this!

### Option 2: Railway (Alternative)

**Pros:**
- Easy deployment
- Free tier available
- Simple GitHub integration

**Steps:**

1. Sign up at [railway.app](https://railway.app)
2. Create new project from GitHub repo
3. Set environment variables in Railway dashboard
4. Railway will provide a URL like: `https://vara-backend.railway.app`
5. Update production API URL in code

### Option 3: Heroku / DigitalOcean / AWS

Similar process - deploy the Express backend and get a public URL.

---

## 📱 Mobile App Builds

### Development Build (Internal Testing)

For internal testing with TestFlight (iOS) or internal testing (Android):

```bash
cd mobile

# iOS
eas build --profile development --platform ios

# Android
eas build --profile development --platform android
```

### Preview Build (Beta Testing)

For beta testers:

```bash
# iOS - will create a build for TestFlight
eas build --profile preview --platform ios

# Android - will create an APK for distribution
eas build --profile preview --platform android
```

### Production Build (App Store / Google Play)

**Prerequisites:**
1. ✅ Backend deployed to production URL
2. ✅ Production API URL configured in `env.ts`
3. ✅ App icons and splash screens configured
4. ✅ App Store Connect / Google Play Console accounts set up

**Build Commands:**

```bash
cd mobile

# iOS Production Build
eas build --profile production --platform ios

# Android Production Build
eas build --profile production --platform android
```

### Managing Environment Variables for Builds

For security, don't commit production credentials. Use EAS Secrets:

```bash
# Set production API URL as a secret
eas secret:create --scope project --name EXPO_PUBLIC_API_URL --value https://your-production-api.com

# Set other secrets
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_API_KEY --value your_key
```

---

## 📲 App Store Submission

### iOS (App Store Connect)

1. **Create app in App Store Connect**
2. **Build with EAS:**
   ```bash
   eas build --profile production --platform ios
   ```
3. **Submit to App Store:**
   ```bash
   eas submit --platform ios
   ```
4. **Complete App Store listing** (screenshots, description, etc.)
5. **Submit for review**

### Android (Google Play Console)

1. **Create app in Google Play Console**
2. **Build with EAS:**
   ```bash
   eas build --profile production --platform android
   ```
3. **Submit to Google Play:**
   ```bash
   eas submit --platform android
   ```
4. **Complete Play Store listing**
5. **Submit for review**

---

## 🔐 Security Checklist

Before production deployment:

- [ ] Backend deployed with HTTPS
- [ ] Environment variables not committed to git
- [ ] Firebase security rules tested and deployed
- [ ] API rate limiting configured
- [ ] Error logging set up (Sentry, etc.)
- [ ] Analytics configured (if desired)
- [ ] In-app purchases tested (if applicable)
- [ ] Push notifications configured
- [ ] Privacy policy and terms of service added

---

## 📊 Monitoring Production

After deployment:

1. **Firebase Console**: Monitor Firestore usage, Auth, Storage
2. **Cloud Functions Logs**: Check for backend errors
3. **EAS Dashboard**: Monitor app builds and crashes
4. **App Store Connect / Google Play Console**: Track downloads, reviews, crashes

---

## 🆘 Common Issues

### "Network Error" in production app

**Cause**: App can't reach backend API

**Solutions:**
1. Verify backend is deployed and accessible
2. Check API URL in production build is correct
3. Ensure HTTPS is used (not HTTP)
4. Check CORS settings on backend

### Build fails with environment variable errors

**Cause**: Missing environment variables in EAS build

**Solutions:**
1. Add secrets to EAS: `eas secret:create`
2. Verify `eas.json` has correct env variables
3. Check `app.json` / `app.config.js` for required variables

### App crashes on launch in production

**Cause**: Various reasons

**Solutions:**
1. Check EAS build logs for errors
2. Test with preview build first
3. Enable crash reporting (Sentry)
4. Check Firebase configuration is correct

---

## 📞 Support

For deployment issues:
- **EAS Build**: https://docs.expo.dev/build/introduction/
- **Firebase Functions**: https://firebase.google.com/docs/functions
- **App Store**: https://developer.apple.com/app-store/
- **Google Play**: https://play.google.com/console

---

## 🎯 Quick Reference Commands

```bash
# Development
npm run server                              # Start backend (from root)
cd mobile && npm start                      # Start Expo

# Builds
eas build --profile development --platform ios    # Dev build
eas build --profile preview --platform ios        # Preview build
eas build --profile production --platform ios     # Production build

# Deployment
firebase deploy --only functions            # Deploy backend to Firebase
eas submit --platform ios                   # Submit to App Store
eas submit --platform android               # Submit to Google Play

# Secrets
eas secret:create --scope project --name KEY --value VALUE
eas secret:list                             # List all secrets
```

---

**Last Updated**: December 2024
**App Version**: 1.0.0
**Expo SDK**: 54
