# TestFlight Setup Checklist - Vara Mobile App

## ✅ Phase 1: Verify Prerequisites (10 minutes)

### 1. Apple Developer Account
- [x] Enrolled in Apple Developer Program ($99/year)
- [ ] Verified email confirmation from Apple
- [ ] Can log into [developer.apple.com](https://developer.apple.com)
- [ ] Can access [App Store Connect](https://appstoreconnect.apple.com)

### 2. Local Development Environment
```bash
# Verify you're in the mobile directory
cd C:\Users\kyler\wellness-app\mobile

# Check Node version (should be 18+)
node --version

# Check npm packages are installed
npm list expo

# Verify EAS CLI is installed globally
npm install -g eas-cli

# Login to Expo account
eas login
```

### 3. Backend Deployment Status
- [ ] Firebase Functions deployed and accessible
- [ ] Test backend API: https://us-central1-vara-4a99f.cloudfunctions.net/api/health
- [ ] OpenAI API key configured in Firebase Functions

---

## 📱 Phase 2: App Store Connect Setup (15 minutes)

### Step 1: Create App Record

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Click **"My Apps"** → **"+"** → **"New App"**
3. Fill in the form:

   | Field | Value |
   |-------|-------|
   | Platform | iOS |
   | Name | **Vara Wellness** |
   | Primary Language | English (U.S.) |
   | Bundle ID | **com.vara.wellness** *(select from dropdown)* |
   | SKU | `vara-wellness-ios` |
   | User Access | Full Access |

4. Click **"Create"**

> **Note**: The Bundle ID `com.vara.wellness` will be automatically created by EAS during your first build if it doesn't exist yet.

### Step 2: Complete Required Information

**App Information** (My Apps → Vara Wellness → App Information):
- [ ] Privacy Policy URL: `https://yourdomain.com/privacy` *(you'll need to create this)*
- [ ] Category: **Health & Fitness** (Primary), **Lifestyle** (Secondary)
- [ ] Content Rights: Select appropriate option
- [ ] Age Rating: Complete questionnaire (likely 4+)

**Pricing and Availability**:
- [ ] Price: **Free**
- [ ] Availability: All countries or select specific ones

---

## 🔨 Phase 3: First Build & Submit (30-40 minutes)

### Step 1: Environment Variables Setup

Create production environment file:

```bash
# In mobile directory
cp .env.production.example .env.production
```

Edit `.env.production` with your production values:
```env
EXPO_PUBLIC_API_URL=https://us-central1-vara-4a99f.cloudfunctions.net
EXPO_PUBLIC_ENV=production
EXPO_PUBLIC_FIREBASE_API_KEY=your_key_here
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=vara-4a99f.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=vara-4a99f
# ... add all Firebase config values
```

### Step 2: Build for TestFlight

```bash
cd C:\Users\kyler\wellness-app\mobile

# Configure build for iOS
eas build:configure

# Create preview build (optimized for TestFlight)
eas build --profile preview --platform ios
```

**What happens during build:**
1. EAS will ask to log in to your Apple Developer account
2. It will generate certificates & provisioning profiles automatically
3. Build process takes ~15-20 minutes
4. You'll receive an email when complete

**Expected output:**
```
✔ Build finished
🔗 https://expo.dev/accounts/kylershep/projects/vara-wellness/builds/abc123
```

### Step 3: Submit to TestFlight

```bash
# Submit the build to App Store Connect
eas submit --platform ios

# Follow prompts:
# - Select the build you just created
# - Confirm submission
```

**What happens:**
- Build is uploaded to App Store Connect
- Appears in TestFlight section within 5-10 minutes
- Apple reviews it (24-48 hours for first build, ~1 hour for subsequent builds)

---

## 👥 Phase 4: Add Beta Testers (10 minutes)

### Option A: Internal Testing (Fastest - No Review)

**Who can test**: Up to 100 people with access to your App Store Connect account

**Setup:**
1. App Store Connect → **TestFlight** → **Internal Testing**
2. Click **"+"** next to "Internal Group"
3. Add tester emails (they need an Apple ID)
4. Testers receive invitation immediately
5. They install TestFlight app and accept invite

**Pros**: Instant access, no Apple review needed
**Cons**: Limited to 100 users, requires App Store Connect access

### Option B: External Testing (Recommended for Beta)

**Who can test**: Up to 10,000 people with any Apple ID

**Setup:**
1. App Store Connect → **TestFlight** → **External Testing**
2. Click **"+"** to create a new group (name it "Beta Testers")
3. Add your build to the group
4. **Enable Public Link**:
   - Go to group settings
   - Turn on **"Enable Public Link"**
   - Copy the link (e.g., `https://testflight.apple.com/join/ABC123XYZ`)
5. Share link with testers - they can self-register!

**Submit for Review:**
- Click **"Submit for Review"**
- Provide beta app description and test notes
- Wait for approval (~24 hours first time, same day after)

**Pros**: 10,000 tester limit, shareable public link, no App Store Connect access needed
**Cons**: Requires Apple review (but much faster than full App Store review)

---

## 📧 Phase 5: Invite Testers (5 minutes)

### Email Template for Testers

```
Subject: 🌱 You're Invited to Test Vara Wellness!

Hi [Name],

I'm excited to invite you to be one of the first to test the Vara Wellness mobile app!

**How to Install:**

1. Install TestFlight from the App Store:
   https://apps.apple.com/app/testflight/id899247664

2. Join the beta using this link:
   [YOUR_TESTFLIGHT_PUBLIC_LINK]

3. Open TestFlight and tap "Install"

**What is Vara?**
A comprehensive wellness app with brain health focus, featuring:
- AI-powered wellness coaching
- Brain health tracking & insights
- Goal, habit, and task management
- Journaling with voice input
- Mindfulness & breathwork exercises
- Community features

**What to Test:**
✅ Sign up / login flow
✅ Complete the daily brain health check-in
✅ Try the AI wellness coach
✅ Create a goal or habit
✅ Explore the Discover library
✅ Record a journal entry with voice input

**Feedback:**
You can send feedback directly in TestFlight by taking a screenshot and tapping "Beta Feedback" - I'll see all your comments!

Or email me at: [your-email@domain.com]

Thanks for helping make Vara better!

Best,
[Your Name]
```

---

## 🔄 Phase 6: Iterate on Feedback (Ongoing)

### Pushing Updates to Testers

When you fix bugs or add features:

```bash
# 1. Update version in app.json
# Change "version": "1.0.0" → "1.0.1"

# 2. Build new version
eas build --profile preview --platform ios

# 3. Submit to TestFlight
eas submit --platform ios

# Testers get automatic update notification!
```

**Best Practices:**
- **Weekly builds** during active beta testing
- **Release notes**: Describe what changed in each build
- **Version bumps**: Increment version number each time (1.0.0 → 1.0.1 → 1.0.2)

### Monitoring Feedback

**In App Store Connect → TestFlight:**
- **Crashes**: See crash reports automatically
- **Feedback**: Testers can send screenshots with comments
- **Sessions**: See how many people are testing

---

## 📋 Pre-Launch Requirements

### Required Assets

- [x] **App Icon**: 1024x1024 PNG (already configured: `mobile/assets/icon.png`)
- [x] **Splash Screen**: (already configured: `mobile/assets/splash-icon.png`)
- [ ] **Privacy Policy**: Required by Apple
  - Create at: `PRIVACY_POLICY.md` (template exists in mobile folder)
  - Host online: `https://yourdomain.com/privacy`
  - Add URL to App Store Connect
- [ ] **Terms of Service**: Optional but recommended
  - Host at: `https://yourdomain.com/terms`
- [ ] **Support Email**: For user questions
  - Add to App Store Connect
  - Example: support@varawellness.com

### Firebase Configuration for iOS

Verify Firebase is set up for iOS production:

```bash
# Check if GoogleService-Info.plist exists
# Location: mobile/GoogleService-Info.plist

# If missing, download from Firebase Console:
# 1. Go to Firebase Console → Project Settings
# 2. Select iOS app (com.vara.wellness)
# 3. Download GoogleService-Info.plist
# 4. Place in mobile/ directory
```

### Push Notifications Setup

**In Firebase Console:**
1. Go to **Project Settings** → **Cloud Messaging**
2. Under **Apple app configuration**, upload your APNs auth key
3. EAS will generate this during build if you select "Yes" for push notifications

**In App Store Connect:**
1. Go to **Certificates, Identifiers & Profiles**
2. Enable Push Notifications for `com.vara.wellness`

---

## 🚨 Troubleshooting

### Build Failed

```bash
# View detailed logs
eas build:list

# Try clearing cache
eas build --clear-cache --profile preview --platform ios

# Update dependencies
cd mobile && npm install
```

### "Bundle ID not found"

**Solution**: EAS creates it automatically on first build. If it fails:
1. Go to developer.apple.com → Certificates, IDs & Profiles
2. Create App ID manually: `com.vara.wellness`

### "Submission rejected"

**Common reasons:**
- Missing privacy policy URL
- Incomplete app information
- Missing required metadata

**Fix**: Complete all fields in App Store Connect → App Information

### Testers Can't Install

**iOS:**
- Verify build is approved in TestFlight
- Check tester's email matches their Apple ID
- Ensure they accepted the invitation
- Verify they have TestFlight app installed

---

## 📊 Success Metrics

**You're ready for beta when:**
- ✅ Build successfully submitted to TestFlight
- ✅ At least 5-10 testers invited
- ✅ Testers can install and launch app
- ✅ Core features working (login, goals, habits, AI chat)
- ✅ No immediate crashes on launch

**After 2-4 weeks of testing:**
- ✅ 10-50 active testers
- ✅ Crash rate < 1%
- ✅ Core bugs fixed
- ✅ Positive feedback from testers
- ✅ Ready for production App Store launch

---

## 🎯 Next Steps After Beta

Once beta testing is complete (2-4 weeks):

1. **Fix critical bugs** reported by testers
2. **Prepare for production**:
   ```bash
   # Build for production (App Store)
   eas build --profile production --platform ios
   eas submit --platform ios
   ```
3. **Complete App Store listing**:
   - Screenshots (6.7" and 5.5" displays)
   - App preview video (optional)
   - Description and keywords
   - Promotional text
4. **Submit for App Store review**
5. **Set release date**

---

## 📞 Resources

- **Expo Documentation**: https://docs.expo.dev/build/introduction/
- **App Store Connect**: https://appstoreconnect.apple.com
- **TestFlight Guide**: https://developer.apple.com/testflight/
- **Your BETA_TESTING_GUIDE.md**: More detailed info
- **Your DEPLOYMENT_GUIDE.md**: Full deployment reference

---

## ⏱️ Timeline Estimate

| Phase | Time | Wait Time |
|-------|------|-----------|
| Prerequisites verification | 10 min | - |
| App Store Connect setup | 15 min | - |
| First build | 10 min | 15-20 min (build time) |
| Submit to TestFlight | 5 min | - |
| Apple review | - | 24-48 hours (first build) |
| Add testers | 10 min | - |
| **Total active time** | **50 min** | **1-2 days** |

After Apple approves (1-2 days), testers can install immediately!

---

**Ready to start?** Follow Phase 1 checklist above! 🚀
