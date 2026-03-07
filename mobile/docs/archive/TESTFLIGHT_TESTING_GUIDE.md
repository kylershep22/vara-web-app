# TestFlight Testing Guide - Vara Wellness v1.0.0 (Build 1.0.10)

**Date:** January 6, 2026
**Status:** Submitted to TestFlight
**Platform:** iOS (iPhone & iPad)

---

## 🎯 What's New in This Build

### Critical Fixes from App Store Rejection

**Previous Issue:** App crashed immediately on launch on iPad Air 11-inch (M3) running iPadOS 26.2

**Root Cause:** App was using web Firebase credentials instead of iOS-specific credentials

**Fixes Applied:**

1. ✅ **Corrected Firebase Configuration**
   - Now using proper iOS Firebase App ID and API Key
   - Matches GoogleService-Info.plist configuration
   - Firebase initialization properly validated

2. ✅ **Enhanced Error Handling**
   - Global error handler for uncaught exceptions
   - Comprehensive error boundaries
   - All services fail gracefully without crashing
   - Detailed logging for debugging

3. ✅ **Code Quality Improvements**
   - Fixed undefined field value bug in 4-3-2-1 feature
   - Safe navigation hooks with fallbacks
   - Hardened crash reporting service
   - Analytics service with null checks

4. ✅ **Stability Enhancements**
   - Services initialize safely at app startup
   - Firebase config validation before initialization
   - All async operations properly handled
   - Better offline functionality

---

## 📱 Testing Requirements

### Recommended Devices

**Priority:**
- ✅ **iPad Air 11-inch (M3)** - Same device Apple rejected on
- ✅ Any iPad running iPadOS 26.2 or later
- ✅ iPhone 12 or newer

**Also Test:**
- iPhone SE (smaller screen)
- Any iPad model (iPad Pro, iPad mini, etc.)
- Different iOS versions (25.x, 26.x)

---

## 🧪 Critical Test Scenarios

### Test 1: Fresh Install & Launch ⚠️ CRITICAL

**Why:** This is what Apple tested and failed on the previous build.

**Steps:**
1. Delete any existing Vara Wellness app
2. Install fresh from TestFlight
3. Launch the app
4. **Expected:** App launches to welcome screen (no crash)

**Pass Criteria:**
- ✅ App launches without crash
- ✅ No error screens appear
- ✅ Welcome/login screen displays correctly
- ✅ No red error boxes

**If Failed:**
- 🚨 DO NOT SUBMIT TO APP STORE
- Screenshot the error
- Check console logs in Xcode Console app

---

### Test 2: Account Creation & Authentication

**Steps:**
1. Tap "Sign Up"
2. Enter email: `testuser+[random]@example.com`
3. Enter password: `TestPassword123!`
4. Enter display name: `Test User`
5. Submit

**Expected:**
- ✅ Account created successfully
- ✅ Email verification prompt appears
- ✅ User redirected to email verification screen

**Then:**
1. Go to email and verify (or skip if testing without)
2. Return to app
3. Navigate through onboarding

**Pass Criteria:**
- ✅ No crashes during signup
- ✅ Firebase authentication works
- ✅ User document created in Firestore
- ✅ Onboarding screens load

---

### Test 3: Main App Navigation

**Steps:**
1. Log in with verified account
2. Navigate through all bottom tabs:
   - Home (Dashboard)
   - Track (Goals/Habits)
   - Focus (Timer)
   - Community
   - More

**Expected:**
- ✅ All tabs load without crashing
- ✅ No error screens
- ✅ Content renders properly
- ✅ Smooth transitions between tabs

**Pass Criteria:**
- ✅ Can access all main sections
- ✅ No crashes when switching tabs
- ✅ Data loads correctly

---

### Test 4: 4-3-2-1 Daily Practice ⚠️ RECENTLY FIXED

**Why:** We fixed a critical bug here that could cause crashes.

**Steps:**
1. Go to Home/Dashboard
2. Find "4-3-2-1 Daily Practice" section
3. Interact with all 4 components:
   - Toggle "4 Minutes to Yourself"
   - Add "3 Wins" (try adding and removing wins)
   - Select "2 Ways You Fueled Your Body"
   - Mark "1 Connection"
4. Complete all items

**Expected:**
- ✅ All toggles work smoothly
- ✅ Can add/edit wins without errors
- ✅ Fuel options can be selected
- ✅ Progress updates correctly
- ✅ Completion checkmark appears when all done

**Pass Criteria:**
- ✅ No "undefined field value" errors
- ✅ Streak counter updates (may be 0 initially)
- ✅ Data persists after closing/reopening app

---

### Test 5: Journal Feature

**Steps:**
1. Tap "More" tab → "Journal"
2. Create a new journal entry
3. Add text content
4. Save entry
5. View entry in list

**Expected:**
- ✅ Journal screen loads
- ✅ Can create entry
- ✅ Entry saves successfully
- ✅ Entry appears in list

**Pass Criteria:**
- ✅ No crashes during journal operations
- ✅ Text input works smoothly
- ✅ Entries persist

---

### Test 6: Community Features

**Steps:**
1. Go to "Community" tab
2. Browse groups (if any)
3. Try searching for people
4. View community posts

**Expected:**
- ✅ Community features load
- ✅ Can browse without errors
- ✅ Search functions work

**Note:** May show "No content" for new users - this is normal.

**Pass Criteria:**
- ✅ No crashes
- ✅ Empty states display properly
- ✅ Navigation works

---

### Test 7: Offline Functionality

**Steps:**
1. Use app while connected to internet
2. Navigate to several screens
3. **Enable Airplane Mode**
4. Try to navigate app
5. Try to view cached content

**Expected:**
- ✅ App doesn't crash in offline mode
- ✅ Previously loaded content still visible
- ✅ Appropriate "offline" messages show for network operations
- ✅ App handles network errors gracefully

**Pass Criteria:**
- ✅ No crashes when offline
- ✅ Can still view cached data
- ✅ Clear messaging about connectivity

---

### Test 8: Background & Resume

**Steps:**
1. Open the app
2. Press home button (background the app)
3. Wait 30 seconds
4. Reopen the app
5. Navigate to different tabs

**Expected:**
- ✅ App resumes without crash
- ✅ No data loss
- ✅ Authentication state preserved

**Then:**
1. Background app again
2. Wait 5+ minutes
3. Reopen

**Pass Criteria:**
- ✅ App resumes correctly after long background
- ✅ Re-authentication if needed works smoothly

---

### Test 9: Device Rotation (iPad)

**Steps:**
1. Use app in portrait mode
2. Rotate device to landscape
3. Navigate through app
4. Rotate back to portrait

**Expected:**
- ✅ App handles rotation gracefully
- ✅ Layout adjusts appropriately
- ✅ No crashes during rotation

**Pass Criteria:**
- ✅ Smooth rotation transitions
- ✅ Content remains accessible in both orientations

---

### Test 10: Permissions Flow

**Steps:**
1. Fresh install
2. Complete onboarding
3. Try to:
   - Upload profile picture (Camera/Photos)
   - Use voice input in journal (Microphone)

**Expected:**
- ✅ Permission prompts appear with clear descriptions
- ✅ Permissions can be granted/denied
- ✅ App handles both grant and denial gracefully

**Permission Descriptions Should Say:**
- Camera: "Vara needs access to your camera to upload profile pictures and content."
- Photos: "Vara needs access to your photo library to upload images."
- Microphone: "Vara needs access to your microphone for voice notes and recordings."

**Pass Criteria:**
- ✅ Prompts display correctly
- ✅ Features work when granted
- ✅ Appropriate messages when denied

---

## 🔍 What to Look For

### ✅ Good Signs (App is Ready)

- App launches immediately without errors
- All screens load smoothly
- Firebase connection established (you can create accounts)
- Navigation flows work
- Data persists between sessions
- No red error boxes or crash screens
- Performance feels smooth

### 🚨 Red Flags (DO NOT SUBMIT)

- App crashes on launch
- "Initialization Error" screen appears
- Constant error messages in logs
- Firebase errors about invalid credentials
- Features completely broken (can't create account, etc.)
- Persistent crashes in core flows

### ⚠️ Minor Issues (OK to Submit)

- Slow loading on first launch (Firebase initializing)
- "Index required" errors (we created the index, may still be building)
- Empty states for new users (normal - no data yet)
- Sentry warnings in console (expected - not configured for production)
- UI polish issues (layout, styling - not crashes)

---

## 📊 Test Results Template

Copy this and fill out after testing:

```
## TestFlight Testing Results - Build 1.0.10

**Tester:** [Your Name]
**Device:** [e.g., iPad Air 11-inch (M3)]
**iOS Version:** [e.g., iPadOS 26.2]
**Test Date:** [Date]

### Critical Tests
- [ ] ✅ Fresh Install & Launch - PASSED / ❌ FAILED
- [ ] ✅ Account Creation - PASSED / ❌ FAILED
- [ ] ✅ Main Navigation - PASSED / ❌ FAILED
- [ ] ✅ 4-3-2-1 Practice - PASSED / ❌ FAILED
- [ ] ✅ Journal - PASSED / ❌ FAILED

### Additional Tests
- [ ] ✅ Community - PASSED / ❌ FAILED
- [ ] ✅ Offline Mode - PASSED / ❌ FAILED
- [ ] ✅ Background/Resume - PASSED / ❌ FAILED
- [ ] ✅ Device Rotation - PASSED / ❌ FAILED
- [ ] ✅ Permissions - PASSED / ❌ FAILED

### Issues Found
[List any issues, crashes, or unexpected behavior]

### Recommendation
[ ] ✅ READY FOR APP STORE SUBMISSION
[ ] ⚠️ MINOR ISSUES - Discuss before submitting
[ ] ❌ NOT READY - Critical issues found

### Notes
[Any additional observations]
```

---

## 🎯 Success Criteria for App Store Submission

The build is **READY FOR APP STORE SUBMISSION** if:

✅ **Critical Tests Pass:**
- App launches without crash on iPad
- Account creation works
- Main navigation works
- 4-3-2-1 feature works
- Journal works

✅ **No Critical Bugs:**
- No crashes in core flows
- No data loss
- Authentication works
- Firebase connectivity works

✅ **Performance:**
- App feels responsive
- No major lag or freezing
- Smooth transitions

✅ **Polish:**
- No major UI glitches
- Text is readable
- Buttons work as expected

---

## 📝 Known Issues (Expected/Acceptable)

These are **OK** and won't cause rejection:

1. **Firebase Index Building**
   - Streak counter in 4-3-2-1 may show "Building index..." initially
   - Should resolve within 15 minutes of first use
   - App handles gracefully (shows 0 for streak)

2. **First Launch Slowness**
   - Firebase initialization takes 2-3 seconds on first launch
   - Normal behavior
   - Subsequent launches are fast

3. **Console Warnings**
   - Sentry warnings about "Native Client not available"
   - Expected - Sentry not configured
   - Doesn't affect app functionality

4. **Empty States**
   - New users see "No content" in many sections
   - Normal - they haven't created any data yet
   - Test by creating content

---

## 🆘 If You Find Critical Issues

### If App Crashes on Launch (iPad):

1. **Get the crash log:**
   - Connect iPad to Mac
   - Open Xcode → Window → Devices and Simulators
   - Select device → View Device Logs
   - Find Vara Wellness crash
   - Copy entire crash log

2. **Report with:**
   - Device model
   - iOS version
   - Exact steps to reproduce
   - Full crash log
   - Screenshots

3. **DO NOT submit to App Store yet**

### If Features Don't Work:

1. **Try these first:**
   - Delete and reinstall
   - Check internet connection
   - Restart device
   - Try different account

2. **If still broken:**
   - Document exact steps to reproduce
   - Screenshot the error
   - Note what you expected vs. what happened
   - Check if it's a data issue or code issue

---

## 👥 Test Account Credentials

For faster testing, you can use these:

**Option 1: Create Your Own**
- Email: `testuser+[anything]@gmail.com`
- Password: `TestPassword123!`
- Name: Whatever you want

**Option 2: Request Pre-made Account**
- Contact the developer for a pre-populated test account
- Useful for testing with existing data

---

## 🎬 TestFlight Beta Information

**What to Include in TestFlight Description:**

```
# Vara Wellness - Beta Test

Thank you for testing Vara Wellness!

## What's New in This Build (1.0.10)

This build includes critical fixes from the App Store rejection:
- ✅ Fixed crash on iPad launch
- ✅ Improved error handling and stability
- ✅ Enhanced Firebase configuration
- ✅ Bug fixes in daily practice tracking

## What We Need You to Test

**Critical (Please test these!):**
1. App launch on iPad (does it crash?)
2. Account creation and login
3. 4-3-2-1 Daily Practice feature
4. Journal creation
5. Navigation between all tabs

**Also Helpful:**
- Community features
- Offline mode
- Background/resume behavior
- Any crashes or errors you encounter

## How to Report Issues

1. In TestFlight app, tap "Send Beta Feedback"
2. Include:
   - What you were doing
   - What happened vs. what you expected
   - Screenshots if possible
   - Your device model

## Known Issues
- First launch may be slow (normal)
- Streak counter may show 0 initially (building database index)
- Empty states for new users (expected)

## Questions?
Contact: [Your support email]

Thank you for helping make Vara better! 🙏
```

---

## 📈 Testing Timeline Recommendation

**Day 1-2:** Internal testing on your own devices
- Focus on critical tests
- Document any issues
- Fix if needed

**Day 3-4:** External beta testers (if you have them)
- Wider device coverage
- Real-world usage patterns

**Day 5:** Review feedback and make decision
- If all critical tests pass → Submit to App Store
- If issues found → Fix and rebuild

---

## ✅ Final Pre-Submission Checklist

Before clicking "Submit for Review" in App Store Connect:

- [ ] All critical TestFlight tests passed
- [ ] Tested on iPad (especially iPad Air if possible)
- [ ] No crashes in core flows
- [ ] Privacy Policy URL added to App Store Connect
- [ ] App description written
- [ ] Screenshots uploaded (required)
- [ ] Test account credentials prepared for Apple reviewers
- [ ] Review notes written (see below)

---

## 📝 Suggested Review Notes for Apple

```
# Review Notes for Apple

## Test Account
Email: [test account email]
Password: [test account password]

## About This Update
This is a resubmission after fixing the crash issue reported in the previous review.

**Previous Issue:** App crashed on launch on iPad Air 11-inch (M3)
**Root Cause:** Firebase configuration error
**Fix Applied:** Corrected iOS Firebase credentials and enhanced error handling

## Key Improvements
- Fixed initialization crash on iPad
- Enhanced error handling throughout the app
- Improved offline functionality
- Better logging for debugging

## Testing Instructions
1. Launch app (should no longer crash on iPad)
2. Create account or use test credentials above
3. Complete onboarding
4. Test main features:
   - Daily 4-3-2-1 practice
   - Journal entries
   - Community browsing
   - Navigation between tabs

## Notes
- App requires internet for initial setup, but core features work offline
- First launch may take 2-3 seconds to initialize Firebase
- Some features may show empty states for new users (normal)

## Support
For questions: [your email]

Thank you for reviewing Vara Wellness!
```

---

**Happy Testing! 🚀**

The app is significantly more stable than the previous build. All critical crash issues have been addressed with comprehensive error handling and the correct Firebase configuration.
