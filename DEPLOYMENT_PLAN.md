# Vara Wellness - Multi-Platform Deployment Plan

## Overview
This document outlines the deployment strategy for Vara Wellness across web, iOS, and Android platforms.

---

## Platform URLs

| Platform | URL | Status |
|----------|-----|--------|
| Marketing Site | `https://varawellness.co` | 🟡 In Progress |
| Web App | `https://app.varawellness.co` | 🟢 Ready to Deploy |
| API Endpoint | `https://app.varawellness.co/api` | 🔴 Needs Migration |
| iOS App | App Store | 🔵 Planned |
| Android App | Google Play | 🔵 Planned |

---

## Architecture Components

### 1. Marketing Website (`varawellness.co`)
- **Purpose**: Public-facing landing page
- **Tech Stack**: [Your choice - Webflow/React/Next.js]
- **Features**:
  - Hero section with product demo
  - Features showcase
  - Pricing information
  - User testimonials
  - Blog (optional)
  - Contact form → Cloud Function
  - CTA buttons → `app.varawellness.co/signup`

### 2. Web Application (`app.varawellness.co`)
- **Purpose**: Full-featured web app
- **Tech Stack**: React 19, Firebase
- **Current Status**: ✅ Built and functional locally
- **Deployment Target**: Firebase Hosting
- **Authentication**: Firebase Auth
- **Database**: Firestore (real-time sync)
- **Storage**: Firebase Storage
- **Backend**: Cloud Functions

### 3. Mobile Applications (Future)
- **iOS App**: React Native → App Store
- **Android App**: React Native → Google Play
- **Shared Codebase**: 60-80% code reuse with web app
- **Same Backend**: Firebase (seamless data sync)

---

## Backend API Strategy

### Current State
- ✅ Development: Express server (`backend/server.js`) on `localhost:5001`
- 🔴 Production: Cloud Functions (`functions/index.js`) - needs migration

### Migration Required
The following Express routes need to be added to Cloud Functions:

**From `backend/server.js`:**
```javascript
POST /api/journal-summary
POST /api/journal-prompt
POST /api/ai-chat
POST /api/openai
POST /api/generate-daily-plan (exists in functions)
```

**Current Cloud Functions:**
```javascript
generateHabitSuggestions (callable)
generateDailyPlan (callable)
```

### Production API Access

**Web App:**
- Uses relative paths: `/api/journal-summary`
- Firebase Hosting rewrites to Cloud Functions (configured in `firebase.json`)

**Mobile Apps:**
- Use full URL: `https://app.varawellness.co/api/journal-summary`
- Same Cloud Functions, different access pattern

---

## Firebase Configuration

### Current Project
- **Project ID**: `vara-4a99f`
- **Region**: `us-central1` (Cloud Functions)
- **Database Location**: `nam5` (Firestore)

### Services Used
- ✅ Firebase Authentication
- ✅ Cloud Firestore
- ✅ Cloud Functions (Gen 2)
- ✅ Firebase Hosting
- ✅ Firebase Storage
- ✅ Cloud Functions Secrets (OPENAI_API_KEY)

---

## Deployment Checklist

### Pre-Deployment (Complete These First)

- [ ] Migrate Express routes to Cloud Functions
  - [ ] `/api/journal-summary`
  - [ ] `/api/journal-prompt`
  - [ ] `/api/ai-chat`
  - [ ] `/api/openai`

- [ ] Set up Cloud Functions secret for OpenAI API key
  ```bash
  firebase functions:secrets:set OPENAI_API_KEY
  ```

- [ ] Update environment variables in `.env.production`

- [ ] Test all API endpoints locally with Firebase Emulators

- [ ] Build and test production build locally
  ```bash
  npm run build
  firebase serve
  ```

### Domain Configuration

- [ ] Purchase domain: `varawellness.co` ✅ (DONE)
- [ ] Add custom domain in Firebase Console
  - [ ] `app.varawellness.co`
- [ ] Configure DNS records with domain registrar
  - [ ] A records for `app` subdomain
  - [ ] Wait 24-48 hours for DNS propagation
- [ ] Verify SSL certificate is active (Firebase auto-provisions)

### Initial Production Deployment

```bash
# 1. Build frontend
npm run build

# 2. Deploy everything
firebase deploy

# 3. Verify deployment
# - Visit https://app.varawellness.co
# - Test authentication
# - Test all major features
# - Check Cloud Functions logs
```

### Post-Deployment

- [ ] Set up Firebase Performance Monitoring
- [ ] Configure Firebase Analytics
- [ ] Set up error tracking (Sentry/Crashlytics)
- [ ] Monitor Cloud Functions usage and costs
- [ ] Set up uptime monitoring
- [ ] Create backup strategy for Firestore data

---

## Mobile App Development Plan (Future)

### Phase 1: Setup (1-2 weeks)
- [ ] Initialize React Native project
- [ ] Set up Firebase SDK for React Native
- [ ] Configure iOS and Android projects
- [ ] Set up shared code repository structure

### Phase 2: Core Features (4-6 weeks)
- [ ] Authentication screens (Login/Signup)
- [ ] Dashboard
- [ ] Goals & Habits tracking
- [ ] Journal with rich text editor
- [ ] Tasks management
- [ ] Profile management

### Phase 3: Social Features (3-4 weeks)
- [ ] Community/Groups
- [ ] Direct messaging
- [ ] Notifications (push notifications)
- [ ] User connections

### Phase 4: Content Library (2-3 weeks)
- [ ] Wellness library (breathwork, meditation, movement)
- [ ] Audio/video playback
- [ ] Offline content caching

### Phase 5: Testing & Launch (2-3 weeks)
- [ ] Beta testing (TestFlight for iOS, Internal testing for Android)
- [ ] Bug fixes and polish
- [ ] App Store submission (iOS)
- [ ] Google Play submission (Android)
- [ ] Marketing and launch

**Estimated Timeline**: 3-4 months from start to launch

---

## Cross-Platform Data Sync

### How It Works

All platforms use the same Firebase project:

```
User creates a goal on Web App
         ↓
Firestore: /goals/{goalId}
         ↓
Real-time sync (onSnapshot)
         ↓
Appears instantly on iOS/Android apps
```

### Offline Support

Firestore provides automatic offline caching:
- ✅ Users can work offline
- ✅ Changes queue automatically
- ✅ Sync when connection restored
- ✅ Works identically on web and mobile

---

## Security Considerations

### Firestore Security Rules
- ✅ Already configured (`firestore.rules`)
- ✅ User data isolated by `userId`
- ✅ Privacy settings enforced
- ✅ Same rules apply to web and mobile

### API Authentication
- All API endpoints validate Firebase Auth tokens
- Cloud Functions use Firebase Admin SDK
- No additional API key needed for authenticated users

### Mobile-Specific
- [ ] Certificate pinning (optional, for extra security)
- [ ] Secure credential storage (Keychain/Keystore)
- [ ] Biometric authentication (Face ID/Fingerprint)

---

## Cost Estimates (Monthly)

### Firebase (Spark Plan - Free Tier)
- ✅ Authentication: Unlimited
- ✅ Firestore: 50K reads, 20K writes, 20K deletes/day
- ✅ Hosting: 10 GB storage, 360 MB/day transfer
- ✅ Cloud Functions: 2M invocations

### Upgrade to Blaze (Pay-as-you-go)
Estimated for 1,000 active users:
- Firestore: ~$5-15/month
- Cloud Functions: ~$5-10/month
- Hosting: Free (within limits)
- **Total**: ~$10-25/month

### OpenAI API
Using `gpt-4o-mini`:
- Very cost-effective
- Estimate: $20-50/month for 1,000 users
- Can optimize with caching strategies

---

## Success Metrics

### Web App Launch
- [ ] 100+ user signups (first month)
- [ ] <3s page load time
- [ ] >95% uptime
- [ ] <1% error rate

### Mobile App Launch
- [ ] App Store approval
- [ ] Google Play approval
- [ ] 4.0+ star rating
- [ ] 500+ downloads (first month)

---

## Support & Maintenance

### Monitoring
- Firebase Console for real-time metrics
- Cloud Functions logs
- Firestore usage
- Authentication metrics
- Performance monitoring

### Backups
- Firestore automatic backups (configure in console)
- User data export functionality
- Code version control (Git)

### Updates
- Web app: Deploy anytime (instant)
- Mobile apps: Review process (2-7 days)
- Backend: Rolling updates (zero downtime)

---

## Next Steps

1. **Immediate** (This Week):
   - [ ] Migrate Express backend to Cloud Functions
   - [ ] Set up custom domain in Firebase Console
   - [ ] Configure DNS records

2. **Short Term** (Next 2 Weeks):
   - [ ] Deploy to production
   - [ ] Test all features on live domain
   - [ ] Set up monitoring

3. **Medium Term** (Next 1-2 Months):
   - [ ] Launch marketing website
   - [ ] Gather user feedback
   - [ ] Plan mobile app features

4. **Long Term** (Next 3-6 Months):
   - [ ] Start mobile app development
   - [ ] Beta testing
   - [ ] App Store launches

---

**Last Updated**: November 7, 2025
**Project**: Vara Wellness
**Tech Lead**: [Your Name]
