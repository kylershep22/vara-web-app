# Beta Launch - Next Steps

## Week 1 Status: COMPLETE ✅

**Completed:**
- ✅ Firebase Crashlytics installed and configured (FREE crash reporting)
- ✅ Firebase Analytics installed and configured (FREE analytics)
- ✅ Production `.env` file configured with Firebase credentials
- ✅ Privacy Policy created (`PRIVACY_POLICY.md`)
- ✅ Terms of Service created (`TERMS_OF_SERVICE.md`)
- ✅ Backend verified (Firebase Cloud Functions deployed at `https://[your-api-url]`)

---

## Week 2: Final Setup & Launch (Your Action Required)

### Step 1: EAS (Expo Application Services) Setup

**What is EAS?**
- Build service for creating iOS and Android app binaries
- Free tier: 30 builds/month
- Handles code signing and certificates automatically

**Setup Steps:**

1. **Create Expo Account**
   ```bash
   # If you don't have an account, sign up at https://expo.dev
   # Then log in from the command line:
   cd mobile
   npx eas login
   ```

2. **Initialize EAS Project**
   ```bash
   # This will create an EAS project and update app.json automatically
   npx eas build:configure

   # Follow prompts:
   # - Select both iOS and Android
   # - It will auto-populate app.json with project ID and owner
   ```

3. **Verify Configuration**
   - Open `mobile/app.json`
   - Verify `extra.eas.projectId` and `owner` are set
   - These were auto-populated by the `eas build:configure` command

---

### Step 2: Firebase iOS & Android App Registration

Your Firebase project (your-project-id) currently only has a web app. You need to register iOS and Android apps for push notifications and mobile-specific features.

**Register iOS App:**

1. Go to [Firebase Console](https://console.firebase.google.com/project/your-project-id/settings/general)
2. Click "Add app" → iOS
3. Enter iOS Bundle ID: `com.vara.wellness`
4. Download `GoogleService-Info.plist` (you'll need this later if using native Firebase)
5. Copy the iOS App ID from Firebase Console
6. Update `mobile/.env`:
   ```env
   EXPO_PUBLIC_FIREBASE_IOS_APP_ID=1:621980275569:ios:xxxxxxxxxxxxx
   ```

**Register Android App:**

1. In Firebase Console, click "Add app" → Android
2. Enter Android Package Name: `com.vara.wellness`
3. Download `google-services.json` (you'll need this later if using native Firebase)
4. Copy the Android App ID from Firebase Console
5. Update `mobile/.env`:
   ```env
   EXPO_PUBLIC_FIREBASE_ANDROID_APP_ID=1:621980275569:android:xxxxxxxxxxxxx
   ```

---

### Step 3: Host Privacy Policy & Terms of Service

Apple and Google require publicly accessible URLs for your privacy policy and terms.

**Option A: Host on Firebase Hosting (Recommended - FREE)**

1. Create a simple HTML page:
   ```bash
   # Create public folder
   mkdir -p public/legal

   # Convert MD to HTML (or create simple HTML files)
   # You can use any markdown-to-HTML converter
   ```

2. Deploy to Firebase Hosting:
   ```bash
   firebase deploy --only hosting
   ```

3. Your URLs will be:
   - Privacy: `https://your-project-id.web.app/legal/privacy.html`
   - Terms: `https://your-project-id.web.app/legal/terms.html`

**Option B: Use GitHub Pages (FREE)**

1. Create a new repository: `vara-legal-docs`
2. Add `PRIVACY_POLICY.md` and `TERMS_OF_SERVICE.md`
3. Enable GitHub Pages in repo settings
4. Your URLs will be:
   - `https://yourusername.github.io/vara-legal-docs/PRIVACY_POLICY.html`
   - `https://yourusername.github.io/vara-legal-docs/TERMS_OF_SERVICE.html`

**Option C: Use Notion/Google Docs (Quick & Easy)**

1. Create public Notion pages or Google Docs
2. Copy the privacy policy and terms into them
3. Use the public share links

**IMPORTANT:** Update `app.json` with these URLs once hosted.

---

### Step 4: Apple Developer Account Setup

**Cost:** $99/year (required for TestFlight and App Store)

1. **Sign Up**
   - Go to [developer.apple.com](https://developer.apple.com)
   - Enroll in Apple Developer Program ($99/year)
   - Wait 24-48 hours for approval

2. **App Store Connect**
   - Once approved, go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
   - Click "My Apps" → "+" → "New App"
   - Fill in:
     - Platform: iOS
     - Name: Vara Wellness
     - Primary Language: English
     - Bundle ID: com.vara.wellness (select from dropdown after first build)
     - SKU: vara-wellness-ios (internal identifier)
   - Click "Create"

3. **Complete App Information**
   - Privacy Policy URL: (from Step 3)
   - Terms of Service URL: (from Step 3)
   - App Category: Health & Fitness
   - Content Rating: 4+ (or appropriate rating)
   - Copyright: Your Name/Company
   - Support URL: (your website or support email)

---

### Step 5: Google Play Console Setup

**Cost:** $25 one-time fee (required for testing and Google Play)

1. **Sign Up**
   - Go to [play.google.com/console](https://play.google.com/console)
   - Pay $25 one-time registration fee
   - Wait a few hours for approval

2. **Create App**
   - Click "Create app"
   - Fill in:
     - App name: Vara Wellness
     - Default language: English
     - App or game: App
     - Free or paid: Free
   - Accept declarations

3. **Complete App Information**
   - Privacy Policy URL: (from Step 3)
   - App Category: Health & Fitness
   - Content Rating: Complete the questionnaire
   - Target audience: 13+ (or appropriate)
   - Data safety: Answer questions about data collection

---

### Step 6: First Build (iOS & Android)

**Important:** Before building, ensure:
- ✅ Privacy policy and terms are hosted
- ✅ Apple Developer and Google Play accounts are set up
- ✅ Firebase iOS and Android apps registered
- ✅ `.env` file updated with all credentials

**Build Commands:**

```bash
cd mobile

# iOS Build (for TestFlight)
npx eas build --profile preview --platform ios

# Android Build (for Google Play Internal Testing)
npx eas build --profile preview --platform android

# Or build both in parallel:
npx eas build --profile preview --platform all
```

**What Happens:**
- EAS will ask you to set up iOS credentials (Apple ID)
- EAS will generate certificates and provisioning profiles automatically
- Build takes 15-25 minutes
- You'll get download links when done

**First Build Tips:**
- Use `preview` profile for beta testing (already configured in `eas.json`)
- EAS will handle all code signing automatically
- Save your Apple ID credentials when prompted
- Android builds are faster than iOS builds

---

### Step 7: Submit to TestFlight (iOS)

After iOS build completes:

```bash
# Submit to App Store Connect
npx eas submit --platform ios

# Follow prompts:
# - Select the build you just created
# - Enter your Apple ID credentials
# - Build will be uploaded to App Store Connect
```

**What Happens Next:**
1. Build appears in App Store Connect (5-10 minutes)
2. Apple reviews the build (24-48 hours for first submission)
3. Once approved, you can add testers

**Adding Testers:**

**Option A: Internal Testing (Up to 100 testers, instant)**
1. Go to App Store Connect → TestFlight → Internal Testing
2. Add testers by email
3. They receive invitation immediately

**Option B: External Testing (Up to 10,000 testers)**
1. Go to TestFlight → External Testing
2. Create a test group
3. Enable "Public Link"
4. Share link: `https://testflight.apple.com/join/ABC123XYZ`
5. Anyone with link can join!

---

### Step 8: Submit to Google Play Internal Testing (Android)

After Android build completes:

```bash
# Submit to Google Play Console
npx eas submit --platform android

# Follow prompts:
# - Select the build you just created
# - EAS will upload the .aab file to Google Play
```

**What Happens Next:**
1. Build appears in Google Play Console (instant)
2. Set up Internal Testing track (10 minutes)
3. Add testers or create opt-in link

**Setting Up Internal Testing:**

1. Go to Google Play Console → Testing → Internal testing
2. Click "Create new release"
3. Upload the .aab file (already done via `eas submit`)
4. Add release notes:
   ```
   Beta v1.0.0 - Initial release for testing

   Features to test:
   - Sign up / Login
   - Goal and habit tracking
   - Journal with AI prompts
   - Community features
   - Library content (breathwork, sleep, movement)
   ```
5. Click "Review release" → "Start rollout to Internal testing"

**Adding Testers:**

1. Create an email list (one email per line)
2. OR create a shareable opt-in link
3. Testers click link → "Become a tester" → Install from Play Store

---

### Step 9: Recruit Beta Testers

**How Many Testers?**
- Start with 20-50 testers
- Mix of iOS and Android users
- Diverse devices (old and new phones)
- Engaged users who will provide feedback

**Where to Find Testers:**

1. **Friends and Family** - Most reliable, will give honest feedback
2. **Social Media** - Post on Twitter, LinkedIn, Instagram
3. **Reddit** - r/betatests, r/androidapps, r/iOSBeta, wellness subreddits
4. **BetaList** - [betalist.com](https://betalist.com)
5. **Product Hunt** - Ship page for early access
6. **Discord/Slack Communities** - Wellness, productivity, app dev groups
7. **Email List** - If you have one
8. **Online Forums** - Health & wellness forums

**Beta Tester Email Template:**

```
Subject: Help Test Vara Wellness - New Mindfulness & Habit Tracking App 🌱

Hi [Name],

I'm launching Vara Wellness, a mobile app for goal tracking, habit building,
journaling, and community support.

I'm looking for beta testers to try the app and provide feedback before the
public launch. As a thank-you, you'll get:

- Early access to all features
- Direct line to the developer (me!)
- Chance to shape the product

📱 iOS (iPhone):
1. Install TestFlight: apps.apple.com/app/testflight/id899247664
2. Join beta: [YOUR_TESTFLIGHT_LINK]

🤖 Android:
1. Join beta: [YOUR_PLAY_STORE_LINK]
2. Install from Google Play Store

What to test:
✅ Sign up / Login
✅ Create goals and habits
✅ Journal with AI prompts
✅ Explore sleep sounds and breathwork
✅ Join community groups

Please report bugs, confusing UX, or feature requests!

Thanks for your help! 🙏

[Your Name]
```

---

### Step 10: Monitoring & Analytics

Once testers are using the app, monitor:

**Firebase Crashlytics** (FREE)
- Go to [Firebase Console → Crashlytics](https://console.firebase.google.com/project/your-project-id/crashlytics)
- Monitor crash-free rate (target: >99%)
- Fix critical crashes immediately

**Firebase Analytics** (FREE)
- Go to [Firebase Console → Analytics](https://console.firebase.google.com/project/your-project-id/analytics)
- Track:
  - Daily Active Users (DAU)
  - Sign-ups vs logins
  - Feature usage (AI chat, journal, habits)
  - Screen views
  - User retention

**TestFlight / Play Console**
- iOS: App Store Connect → TestFlight → Feedback
- Android: Google Play Console → Testing → Internal testing → Feedback

**Key Metrics:**
- Crash-free rate: >99%
- DAU: Track growth
- Retention: % of users who return after 1 day, 7 days
- Feature adoption: % using AI, journal, community
- Feedback sentiment: Positive, neutral, negative

---

### Step 11: Iterate Based on Feedback

**Beta Testing Timeline (2-4 weeks):**

**Week 1:** Initial testing
- Focus on critical bugs and crashes
- Test all major features
- Gather initial feedback

**Week 2-3:** Fix and iterate
- Fix critical bugs
- Improve confusing UX
- Add small improvements
- Push updated builds (version 1.0.1, 1.0.2)

**Week 4:** Polish and prepare for launch
- Fix remaining issues
- Finalize App Store/Play Store listings
- Prepare marketing materials
- Get ready for public launch!

**How to Push Updates:**

```bash
# Update version in app.json (e.g., 1.0.0 → 1.0.1)
# Then rebuild and resubmit

npx eas build --profile preview --platform all
npx eas submit --platform ios
npx eas submit --platform android

# Testers get notified automatically!
```

---

## Week 3: Production Launch Preparation

### Step 12: Prepare App Store Listings

**App Store (iOS):**

1. **Screenshots** (required)
   - 6.5" iPhone: 5-10 screenshots
   - 5.5" iPhone: 5-10 screenshots
   - iPad (optional): 5-10 screenshots
   - Use real app screens with compelling copy overlays

2. **App Preview Video** (optional but recommended)
   - 15-30 second video showing key features

3. **Description**
   - Focus on benefits, not features
   - Include keywords for ASO (App Store Optimization)
   - Clear call-to-action

4. **Keywords**
   - 100 characters max
   - Examples: wellness, mindfulness, habits, journal, meditation, goals

**Google Play (Android):**

Similar requirements:
- Screenshots (phone and tablet)
- Feature graphic (1024x500)
- App icon (512x512)
- Short description (80 chars)
- Full description (4000 chars)

### Step 13: Production Build

When ready for public launch:

```bash
# Build for production
npx eas build --profile production --platform all

# Submit to stores
npx eas submit --platform ios
npx eas submit --platform android
```

**App Store Review:**
- Takes 24-48 hours (sometimes longer)
- Be ready to respond to reviewer questions
- Common rejection reasons: crashes, incomplete features, misleading screenshots

**Google Play Review:**
- Usually faster (hours to 1 day)
- Less strict than Apple

---

## Cost Summary

| Service | Cost | When |
|---------|------|------|
| **Apple Developer** | $99/year | Required for TestFlight & App Store |
| **Google Play** | $25 one-time | Required for Google Play |
| **EAS Build** | FREE (30 builds/mo) | Upgrade to $29/mo if needed |
| **Firebase** | FREE | Crashlytics, Analytics, Firestore |
| **Domain (optional)** | $12/year | For privacy policy hosting |

**Total to Start:** $124 (Apple + Google)

---

## Quick Reference Checklist

Before your first build:
- [ ] EAS account created and project initialized
- [ ] Firebase iOS app registered
- [ ] Firebase Android app registered
- [ ] iOS/Android app IDs added to `.env`
- [ ] Privacy policy hosted and URL added to app config
- [ ] Terms of service hosted and URL added to app config
- [ ] Apple Developer account active ($99)
- [ ] Google Play Console account active ($25)
- [ ] App Store Connect app created
- [ ] Google Play Console app created
- [ ] Test on physical iOS device
- [ ] Test on physical Android device

---

## Support & Resources

**EAS Documentation:** https://docs.expo.dev/build/introduction/
**Firebase Console:** https://console.firebase.google.com/project/your-project-id
**App Store Connect:** https://appstoreconnect.apple.com
**Google Play Console:** https://play.google.com/console

**Need Help?**
- EAS Discord: https://chat.expo.dev
- Firebase Support: https://firebase.google.com/support
- Stack Overflow: expo, firebase, react-native tags

---

**You're almost there! The hard technical work is done. Now it's about execution and getting users!** 🚀
