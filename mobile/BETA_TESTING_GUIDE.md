# Beta Testing Guide - Vara Mobile App

## 🎯 Overview

This guide will help you get your Vara mobile app into the hands of test users for feedback before launching to the App Store and Google Play.

---

## 📱 iOS Beta Testing (TestFlight)

TestFlight is Apple's official beta testing platform. It's FREE and allows up to **10,000 external testers**.

### **Prerequisites**

1. ✅ Apple Developer Account ($99/year) - [developer.apple.com](https://developer.apple.com)
2. ✅ EAS Build configured (already done in your `eas.json`)
3. ✅ App Store Connect account set up

### **Step 1: Create App in App Store Connect**

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Click **"My Apps"** → **"+"** → **"New App"**
3. Fill in details:
   - **Platform**: iOS
   - **Name**: Vara Wellness (or your app name)
   - **Primary Language**: English
   - **Bundle ID**: Select from dropdown (will be auto-created by EAS)
   - **SKU**: `vara-wellness-ios` (your choice, internal identifier)
4. Click **"Create"**

### **Step 2: Build for TestFlight**

```bash
cd mobile

# Build for TestFlight (first time setup)
eas build --profile preview --platform ios

# You'll be prompted to:
# 1. Log in to your Expo account
# 2. Connect to Apple Developer account
# 3. Generate certificates automatically (recommended)
```

**What happens:**
- EAS creates iOS build
- Generates certificates & provisioning profiles
- Build takes ~15-20 minutes
- You'll get a download link when done

### **Step 3: Submit to TestFlight**

```bash
# Submit the build to App Store Connect
eas submit --platform ios

# OR manually:
# 1. Download the .ipa file from EAS dashboard
# 2. Use Transporter app (Mac App Store) to upload
```

**After submission:**
- Build appears in App Store Connect → TestFlight (takes ~5-10 minutes)
- Apple reviews it (~24-48 hours for first build, faster after)
- Once approved, you can add testers

### **Step 4: Add Test Users**

**Option A: Internal Testing (Up to 100 users)**
- These are users with access to your App Store Connect account
- **Instant access** - no review needed

1. Go to App Store Connect → TestFlight → **Internal Testing**
2. Click **"+"** next to Testers
3. Add users by email (they must have Apple ID)
4. They receive email invitation immediately

**Option B: External Testing (Up to 10,000 users)**
- Anyone with an Apple ID
- Requires Apple review (but same day for most apps)

1. Go to TestFlight → **External Testing**
2. Create a test group (e.g., "Early Adopters")
3. Add build to the group
4. Add testers by email OR share a **public link**
5. Enable **"Public Link"** to generate shareable URL
6. Share link with testers - they can self-register!

### **Step 5: Testers Install App**

**Testers need to:**
1. Install **TestFlight app** from App Store (free)
2. Open invitation email and tap **"View in TestFlight"**
   - OR tap your public link
3. Tap **"Accept"** → **"Install"**
4. App appears on home screen!

**TestFlight Features:**
- Testers can send feedback directly in TestFlight app
- You see crash reports automatically
- Builds expire after 90 days
- You can push new builds anytime

---

## 🤖 Android Beta Testing (Google Play)

Google Play offers internal, closed, and open testing tracks. **Internal testing** is fastest for getting to testers.

### **Prerequisites**

1. ✅ Google Play Developer Account ($25 one-time fee) - [play.google.com/console](https://play.google.com/console)
2. ✅ EAS Build configured

### **Step 1: Create App in Google Play Console**

1. Go to [Google Play Console](https://play.google.com/console)
2. Click **"Create app"**
3. Fill in details:
   - **App name**: Vara Wellness
   - **Default language**: English
   - **App or game**: App
   - **Free or paid**: Free
4. Complete declarations (privacy policy, content rating, etc.)

### **Step 2: Build for Google Play**

```bash
cd mobile

# Build AAB (Android App Bundle) for Play Store
eas build --profile preview --platform android

# This creates an .aab file optimized for Google Play
```

### **Step 3: Upload to Google Play**

```bash
# Submit the build
eas submit --platform android

# OR manually:
# 1. Download the .aab file from EAS
# 2. Upload via Google Play Console
```

### **Step 4: Set Up Testing Track**

**Option A: Internal Testing (Up to 100 testers, instant)**
1. Go to **Testing** → **Internal testing**
2. Click **"Create new release"**
3. Upload your .aab file
4. Add release notes
5. Click **"Review release"** → **"Start rollout to Internal testing"**

**Option B: Closed Testing (Unlimited testers, slight review)**
1. Go to **Testing** → **Closed testing**
2. Create a testing track (e.g., "Beta Testers")
3. Upload build
4. Add testers or create shareable link

### **Step 5: Add Test Users**

**For Internal/Closed Testing:**

1. Create an **email list** in Play Console
2. Add tester emails (one per line)
3. OR enable **"Feedback URL"** for shareable link
4. Share opt-in URL with testers

**Testers need to:**
1. Open opt-in link on Android device
2. Tap **"Become a tester"**
3. Open Google Play Store
4. Search for "Vara Wellness"
5. Tap **"Install"**

---

## 🚀 Quick Start: Get to Testers ASAP

### **Fastest Path to iOS Testers:**

```bash
# 1. Build (20 min)
cd mobile && eas build --profile preview --platform ios

# 2. Submit (5 min)
eas submit --platform ios

# 3. Wait for Apple review (24-48 hours first time)

# 4. Enable public link in TestFlight
# Go to App Store Connect → TestFlight → External Testing → Enable Public Link

# 5. Share link with testers!
# Example: https://testflight.apple.com/join/ABC123XYZ
```

**Timeline:**
- Build: 20 minutes
- Submit: 5 minutes
- Apple review: 24-48 hours (first build)
- **Testers can install immediately** after approval

### **Fastest Path to Android Testers:**

```bash
# 1. Build (15 min)
cd mobile && eas build --profile preview --platform android

# 2. Submit (5 min)
eas submit --platform android

# 3. Set up Internal Testing in Play Console (10 min)
# Testing → Internal testing → Create release → Upload .aab

# 4. Add testers and share opt-in link
```

**Timeline:**
- Build: 15 minutes
- Submit: 5 minutes
- Setup: 10 minutes
- **Testers can install within 1 hour** (Google reviews faster than Apple)

---

## 📋 What to Tell Your Testers

### **Email Template**

```
Subject: Help Test the Vara Wellness App! 🌱

Hi [Name],

I'm inviting you to be one of the first to test the new Vara Wellness mobile app!

📱 iOS Users (iPhone):
1. Install TestFlight: https://apps.apple.com/app/testflight/id899247664
2. Join the beta: [YOUR_TESTFLIGHT_LINK]
3. Open TestFlight and tap "Install"

🤖 Android Users:
1. Join the beta: [YOUR_PLAY_STORE_LINK]
2. Open Google Play Store and install Vara Wellness

What to test:
✅ Sign up / Login flow
✅ Goal and habit tracking
✅ AI wellness coach (Discover tab → brain icon)
✅ Journal with voice input
✅ Sleep sounds and breathwork
✅ Community features

Please report:
🐛 Bugs or crashes
💡 Feature requests
🤔 Confusing UI/UX
❤️ What you love!

You can send feedback directly in TestFlight (iOS) or email me.

Thanks for helping make Vara better!

Best,
[Your Name]
```

---

## 🎨 Before Launching Beta

### **Checklist:**

- [ ] **App icon** - 1024x1024 PNG
- [ ] **Splash screen** - Designed and configured
- [ ] **Privacy Policy** - Required by both stores
  - Host at: `https://your-website.com/privacy`
  - Add to app config
- [ ] **Terms of Service** - Optional but recommended
- [ ] **Support Email** - For user questions
- [ ] **Test Accounts** - Create 2-3 test accounts with sample data
- [ ] **Push Notifications** - Configured and tested
- [ ] **In-App Purchases** - If using subscriptions, test in sandbox
- [ ] **Analytics** - Set up Firebase Analytics or similar

---

## 📊 Collecting Feedback

### **Built-in Feedback Channels:**

**iOS (TestFlight):**
- Testers can screenshot and send feedback directly in TestFlight
- You see feedback in App Store Connect → TestFlight → Feedback
- Crash reports appear automatically

**Android (Google Play):**
- Testers can leave reviews on the testing track
- Crash reports in Play Console → Quality → Crashes
- Set up Firebase Crashlytics for better crash reporting

### **Additional Tools:**

1. **Google Form** - Simple feedback survey
   ```
   Questions to ask:
   - What's your overall impression? (1-5 stars)
   - What feature did you use most?
   - What was confusing?
   - What's missing?
   - Would you pay for this? How much?
   ```

2. **Discord/Slack** - Create a beta testers channel
3. **Weekly Check-ins** - Email testers asking for updates
4. **Analytics** - Track which features are used most

---

## 🔄 Releasing Updates

### **Pushing New Builds:**

```bash
# Make changes to code
git add . && git commit -m "Fix: Login button styling"

# Build new version (update version in app.json first!)
eas build --profile preview --platform ios

# Submit to TestFlight
eas submit --platform ios

# Testers get notified automatically!
```

**Best Practices:**
- **Version bumps**: Update `version` in `app.json` (e.g., 1.0.1 → 1.0.2)
- **Release notes**: Describe what changed
- **Frequent updates**: Weekly builds keep testers engaged
- **Breaking changes**: Warn testers if they need to reinstall

---

## 💰 Cost Summary

| Service | Cost | Notes |
|---------|------|-------|
| **Apple Developer** | $99/year | Required for iOS (TestFlight + App Store) |
| **Google Play** | $25 one-time | Required for Android testing & publishing |
| **EAS Build** | Free tier: 30 builds/month | Upgrade to $29/mo for unlimited |
| **Firebase** | Free (Spark plan) | Backend already deployed |
| **Hosting (optional)** | Free-$10/mo | For privacy policy/website |

**Total to Start:** $124 (Apple + Google)

---

## 🆘 Troubleshooting

### **"Build failed" error**

```bash
# Check build logs
eas build:list

# Common fixes:
# 1. Update dependencies
cd mobile && npm install

# 2. Clear cache
eas build --clear-cache --profile preview --platform ios
```

### **"Testers can't install"**

**iOS:**
- Verify build is approved in TestFlight
- Check tester's email matches their Apple ID
- Tester needs to accept invitation first

**Android:**
- Verify testers joined via opt-in link
- Build must be in Internal/Closed testing track
- Check email was added to tester list

### **"App crashes immediately"**

- Check EAS build logs for errors
- Test in Expo Go first if possible
- Check Firebase config is correct
- Verify API_URL is accessible

---

## 📞 Next Steps

**After collecting feedback for 2-4 weeks:**

1. **Fix critical bugs** reported by testers
2. **Improve confusing UX** based on feedback
3. **Add most-requested features** if feasible
4. **Prepare for production launch**:
   - Complete App Store listing (screenshots, description)
   - Get app reviewed by Apple/Google
   - Set launch date
   - Prepare marketing materials

**Production launch guide:**
```bash
# Build for production
eas build --profile production --platform ios
eas build --profile production --platform android

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

See `DEPLOYMENT_GUIDE.md` for full production deployment instructions.

---

## 🎉 Success Metrics

**Good beta testing includes:**
- ✅ 10-50 active testers
- ✅ At least 3 feedback sessions per tester
- ✅ Testing all major features
- ✅ Testing on various devices (old/new, iOS/Android)
- ✅ 2-3 build iterations with improvements
- ✅ Less than 1% crash rate
- ✅ Positive overall sentiment

**You're ready to launch when:**
- No critical bugs
- Core features work smoothly
- Testers would recommend to friends
- You're confident in the user experience

---

**Good luck with your beta! 🚀**

Questions? Check the EAS docs: https://docs.expo.dev/build/introduction/
