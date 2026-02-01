# EAS Secrets Setup Guide

This guide explains how to configure sensitive environment variables for EAS builds.

## Why EAS Secrets?

Firebase configuration values should not be committed to git. Instead, use EAS Secrets to inject them at build time.

## Required Secrets

Run these commands to set up secrets for your EAS project:

```bash
# Firebase Configuration
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_API_KEY --value "YOUR_API_KEY"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN --value "vara-4a99f.firebaseapp.com"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_PROJECT_ID --value "vara-4a99f"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET --value "vara-4a99f.firebasestorage.app"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID --value "YOUR_SENDER_ID"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_APP_ID --value "YOUR_APP_ID"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_IOS_APP_ID --value "YOUR_IOS_APP_ID"
eas secret:create --scope project --name EXPO_PUBLIC_API_URL --value "https://us-central1-vara-4a99f.cloudfunctions.net"
```

## Verify Secrets

List all configured secrets:

```bash
eas secret:list
```

## Local Development

For local development, create a `.env` file (never commit this):

```bash
cp .env.local.example .env
# Edit .env with your actual values
```

## Important Notes

1. **Never commit secrets to git** - Use `.gitignore` to exclude:
   - `.env`
   - `.env.production`
   - `GoogleService-Info.plist`
   - `google-services.json`

2. **API Key Restrictions** - For additional security, restrict your Firebase API key in Google Cloud Console:
   - Go to: https://console.cloud.google.com/apis/credentials
   - Select your API key
   - Under "Application restrictions", select "iOS apps"
   - Add your bundle ID: `com.vara.wellness`

3. **Rotating Keys** - If you believe a key was compromised:
   - Go to Firebase Console → Project Settings → General
   - Under "Your apps", select the iOS app
   - You can regenerate the API key from Google Cloud Console

## Files That Should NOT Be in Git

These files are gitignored and must be created locally or via EAS Secrets:

- `mobile/.env` - Local development config
- `mobile/.env.production` - Production config (use EAS Secrets instead)
- `mobile/GoogleService-Info.plist` - iOS Firebase config
- `mobile/google-services.json` - Android Firebase config (if applicable)
