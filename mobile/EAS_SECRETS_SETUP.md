# EAS Secrets Setup Guide

This guide explains how to configure sensitive environment variables for EAS builds.

## Why EAS Secrets?

Firebase configuration values and other sensitive credentials should not be committed to git or stored in local `.env.production` files. Use EAS Secrets to inject them securely at build time.

Production builds reference secrets automatically -- no `.env.production` file needs to be on disk.

## Required Secrets

Run these commands to set up secrets for your EAS project:

```bash
# Firebase Configuration
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_API_KEY --value "YOUR_API_KEY"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN --value "your-project-id.firebaseapp.com"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_PROJECT_ID --value "your-project-id"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET --value "your-project-id.firebasestorage.app"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID --value "YOUR_SENDER_ID"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_APP_ID --value "YOUR_APP_ID"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_IOS_APP_ID --value "YOUR_IOS_APP_ID"
eas secret:create --scope project --name EXPO_PUBLIC_API_URL --value "https://[your-cloud-functions-url]"

# Subscription pricing (optional -- defaults exist in code)
eas secret:create --scope project --name EXPO_PUBLIC_MONTHLY_PRICE --value "8.99"
eas secret:create --scope project --name EXPO_PUBLIC_ANNUAL_PRICE --value "79.99"
```

## Subscription Product IDs

When you are ready to launch, create subscription products in both stores with these IDs:

| Product ID | Platform | Type |
|---|---|---|
| `com.vara.wellness.monthly` | iOS + Android | Auto-renewing monthly |
| `com.vara.wellness.annual` | iOS + Android | Auto-renewing annual |

**Trial period:** 7 days (configure in App Store Connect and Google Play Console)

### App Store Connect Setup

1. Go to App Store Connect > Your App > Subscriptions
2. Create a Subscription Group (e.g., "Vara Premium")
3. Add two subscription products with the IDs above
4. Set 7-day free trial for each
5. Configure pricing in all territories

### Google Play Console Setup

1. Go to Google Play Console > Your App > Monetize > Products > Subscriptions
2. Create two subscription products with the IDs above
3. Add a 7-day free trial base plan for each
4. Configure pricing

## Verify Secrets

List all configured secrets:

```bash
eas secret:list
```

## Local Development

For local development, create a `.env` file (never commit this):

```bash
cp .env.example .env
# Edit .env with your actual values
```

## App Store Metadata

When submitting to app stores:

- **Category:** Health & Fitness (primary), Lifestyle (secondary)
- **Age rating:** 4+ (no restricted content)
- **Subtitle (iOS, 30 chars):** Brain health, built for you
- **Description:** Do not include "free" language if the app is paid after trial

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
   - Go to Firebase Console > Project Settings > General
   - Under "Your apps", select the iOS app
   - You can regenerate the API key from Google Cloud Console

## Files That Should NOT Be in Git

These files are gitignored and must be created locally or via EAS Secrets:

- `mobile/.env` - Local development config
- `mobile/.env.production` - Production config (use EAS Secrets instead)
- `mobile/GoogleService-Info.plist` - iOS Firebase config
- `mobile/google-services.json` - Android Firebase config (if applicable)
