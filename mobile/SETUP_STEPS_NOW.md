# Your Next Steps - Beta Launch Setup

## ✅ What's Complete

I've successfully set up:
1. **Sentry for crash reporting** (FREE) - Better than Firebase Crashlytics for Expo
2. **Firebase Analytics** (JS SDK) - Fully functional analytics tracking
3. **Fixed package conflicts** - Removed incompatible @react-native-firebase packages
4. **Updated all service files** - Everything now works with Expo managed workflow

---

## 📋 Step 1: Initialize EAS Project (5 minutes)

**Run this command:**
```bash
cd mobile
npx eas init
```

**What will happen:**
- It will ask: "Would you like to create a project for @kylershep/vara-wellness?"
- Press **Y** (yes)
- EAS will create a project ID and update your `app.json` automatically
- You'll see: "Created @kylershep/vara-wellness (project ID: abc-123-xyz)"

**That's it!** Your EAS project is now configured.

---

## 📋 Step 2: Sign up for Sentry (Optional but Recommended - 5 minutes)

Sentry gives you FREE crash reporting (up to 5,000 errors/month).

**Steps:**
1. Go to [https://sentry.io/signup/](https://sentry.io/signup/)
2. Sign up (free tier)
3. Create a new project:
   - Platform: **React Native**
   - Project name: **vara-wellness**
4. Copy your DSN (looks like: `https://abc123@o123456.ingest.sentry.io/7891011`)
5. Add to `mobile/.env`:
   ```env
   EXPO_PUBLIC_SENTRY_DSN=https://abc123@o123456.ingest.sentry.io/7891011
   ```

**If you skip this:** App will still work, but crashes won't be reported. You can add this later before launching to beta testers.

---

## 📋 Step 3: Register Firebase iOS & Android Apps (10 minutes)

Your Firebase project needs iOS and Android app registrations for push notifications to work.

### Register iOS App

1. Go to [Firebase Console](https://console.firebase.google.com/project/vara-4a99f/settings/general)
2. Click **"Add app"** → **iOS**
3. Enter iOS Bundle ID: `com.vara.wellness`
4. (Optional) App nickname: "Vara Wellness iOS"
5. Click **"Register app"**
6. Download `GoogleService-Info.plist` (save it somewhere, you'll need it if you switch to native builds later)
7. Click **"Continue"** → **"Finish"**
8. **Copy the iOS App ID** from the Firebase Console (looks like: `1:621980275569:ios:abc123xyz`)
9. Update `mobile/.env`:
   ```env
   EXPO_PUBLIC_FIREBASE_IOS_APP_ID=1:621980275569:ios:abc123xyz
   ```

### Register Android App

1. In Firebase Console, click **"Add app"** → **Android**
2. Enter Android Package Name: `com.vara.wellness`
3. (Optional) App nickname: "Vara Wellness Android"
4. Click **"Register app"**
5. Download `google-services.json` (save it somewhere)
6. Click **"Continue"** → **"Finish"**
7. **Copy the Android App ID** from the Firebase Console (looks like: `1:621980275569:android:def456uvw`)
8. Update `mobile/.env`:
   ```env
   EXPO_PUBLIC_FIREBASE_ANDROID_APP_ID=1:621980275569:android:def456uvw
   ```

---

## 📋 Step 4: Host Privacy Policy & Terms (15 minutes)

Apple and Google require publicly accessible URLs for your legal documents.

### Option A: Firebase Hosting (Recommended - FREE)

**Create simple HTML pages:**

1. Create directory:
   ```bash
   mkdir -p public/legal
   ```

2. Create `public/legal/privacy.html`:
   ```html
   <!DOCTYPE html>
   <html>
   <head>
       <title>Vara Wellness - Privacy Policy</title>
       <meta charset="UTF-8">
       <meta name="viewport" content="width=device-width, initial-scale=1.0">
       <style>
           body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; line-height: 1.6; }
           h1 { color: #1B5E57; }
           h2 { color: #333; margin-top: 30px; }
       </style>
   </head>
   <body>
       <!-- Copy content from mobile/PRIVACY_POLICY.md and convert to HTML -->
       <!-- Or use a markdown-to-HTML converter -->
   </body>
   </html>
   ```

3. Create `public/legal/terms.html` (same structure, copy from TERMS_OF_SERVICE.md)

4. Deploy:
   ```bash
   firebase deploy --only hosting
   ```

5. Your URLs will be:
   - Privacy: `https://vara-4a99f.web.app/legal/privacy.html`
   - Terms: `https://vara-4a99f.web.app/legal/terms.html`

### Option B: GitHub Pages (FREE, Easier)

1. Create a new GitHub repository: `vara-legal-docs`
2. Upload `PRIVACY_POLICY.md` and `TERMS_OF_SERVICE.md`
3. Go to repo **Settings** → **Pages**
4. Enable GitHub Pages with **main branch**
5. Your URLs will be:
   - `https://yourusername.github.io/vara-legal-docs/PRIVACY_POLICY`
   - `https://yourusername.github.io/vara-legal-docs/TERMS_OF_SERVICE`

### Option C: Google Docs (Quickest)

1. Create two Google Docs
2. Copy privacy policy and terms content
3. Click **Share** → **Anyone with the link can view**
4. Use those public URLs

**⚠️ Important:** You'll add these URLs to your App Store Connect and Google Play Console accounts when you create your app listings (we'll do that next).

---

## 📋 Step 5: Get Developer Accounts (If You Haven't Already)

### Apple Developer Account ($99/year)
- Sign up: [developer.apple.com](https://developer.apple.com/programs/enroll/)
- Takes 24-48 hours for approval
- Required for TestFlight and App Store

### Google Play Console ($25 one-time)
- Sign up: [play.google.com/console](https://play.google.com/console/signup)
- Takes a few hours for approval
- Required for testing and Google Play

**Total cost:** $124

---

## 🎯 After You Complete These Steps

Once you've done Steps 1-5 above, let me know and I'll guide you through:

**Next Steps:**
- Creating your first build (`eas build`)
- Submitting to TestFlight (iOS)
- Setting up Google Play Internal Testing (Android)
- Recruiting beta testers
- Monitoring crashes and analytics

---

## 📊 Current Status

✅ **Week 1 Complete:**
- Crash reporting (Sentry) configured
- Analytics (Firebase) configured
- Legal documents created
- Backend deployed and verified
- App fully functional

⏳ **Week 2 In Progress:**
- Step 1: Initialize EAS ← **DO THIS NOW**
- Step 2: Sign up for Sentry (optional)
- Step 3: Register Firebase apps
- Step 4: Host privacy policy & terms
- Step 5: Get developer accounts

🚀 **Week 2 Next (after above):**
- First build
- Submit to TestFlight & Google Play
- Recruit beta testers

---

## 💡 Questions or Issues?

If you run into any problems with these steps, just let me know and I'll help you troubleshoot!

**Ready to continue?** Start with Step 1 above (run `npx eas init` in the mobile directory).
