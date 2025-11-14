# Vara Wellness - Cross-Platform Architecture Guide

## Overview

This document explains how Vara Wellness uses a **single backend** to serve web, iOS, and Android apps seamlessly.

---

## 🏗️ Architecture Principles

### **Principle 1: Single Source of Truth**

```
                    ┌──────────────────────┐
                    │  Firebase Firestore  │
                    │  (Cloud Database)    │
                    └──────────┬───────────┘
                               │
                ┌──────────────┼──────────────┐
                │              │              │
                ▼              ▼              ▼
         ┌──────────┐   ┌──────────┐   ┌──────────┐
         │  Web App │   │ iOS App  │   │ Android  │
         └──────────┘   └──────────┘   └──────────┘
```

**What this means:**
- All user data lives in Firestore (goals, habits, journal entries, etc.)
- All platforms read/write to the **same database**
- Changes sync instantly across all devices
- User doesn't have to "refresh" - updates are real-time

---

## 📊 Data Flow Examples

### **Example 1: Creating a Journal Entry**

#### On Web App:
```javascript
// src/pages/Journal.jsx
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const saveEntry = async () => {
  await addDoc(collection(db, 'journalEntries'), {
    userId: user.uid,
    text: newEntry,
    mood: mood,
    tags: tags,
    createdAt: serverTimestamp()
  });
};
```

#### On Mobile App (SAME CODE!):
```javascript
// mobile/src/services/journalService.js
import firestore from '@react-native-firebase/firestore';

export const saveEntry = async (userId, entry) => {
  await firestore().collection('journalEntries').add({
    userId: userId,
    text: entry.text,
    mood: entry.mood,
    tags: entry.tags,
    createdAt: firestore.FieldValue.serverTimestamp()
  });
};
```

**Result:**
- Same database operation
- Entry appears on all platforms instantly
- No backend API needed for this!

---

### **Example 2: AI Journal Summary (Uses Backend)**

#### Web App:
```javascript
// src/pages/Journal.jsx
const fetchWeeklySummary = async (entries) => {
  const response = await axios.post('/api/journal-summary', {
    entries: entries.join('\n'),
    type: 'journal',
    guardrails: true
  });

  return response.data.text;
};
```

#### Mobile App:
```javascript
// mobile/src/services/aiService.js
const API_URL = 'https://app.varawellness.co';

export const fetchWeeklySummary = async (entries, authToken) => {
  const response = await fetch(`${API_URL}/api/journal-summary`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      entries: entries.join('\n'),
      type: 'journal',
      guardrails: true
    })
  });

  const data = await response.json();
  return data.text;
};
```

**Flow:**
```
Mobile App → Cloud Functions → OpenAI API → Response → Mobile App
Web App   → Cloud Functions → OpenAI API → Response → Web App

SAME Cloud Function serves both!
```

---

## 🔄 Real-Time Sync Architecture

### **How Firestore Real-Time Sync Works**

```
1. USER CREATES HABIT ON WEB APP
   ↓
   addDoc(collection(db, 'habits'), {...})
   ↓

2. FIRESTORE WRITES TO DATABASE
   /habits/habitId123
   {
     userId: "abc",
     name: "Meditate",
     frequency: "daily",
     streak: 0
   }
   ↓

3. FIRESTORE NOTIFIES ALL LISTENERS
   (Apps that are subscribed to this data)
   ↓

4. ALL APPS UPDATE INSTANTLY
   ┌─────────────────────────────────────┐
   │ Web App (onSnapshot listener)       │ ✅ Updated
   │ iOS App (snapshot listener)         │ ✅ Updated
   │ Android App (snapshot listener)     │ ✅ Updated
   └─────────────────────────────────────┘
```

### **Code: Real-Time Listener (Web)**

```javascript
// src/pages/GoalsHabits.jsx
useEffect(() => {
  if (!user) return;

  // Subscribe to real-time updates
  const q = query(
    collection(db, 'habits'),
    where('userId', '==', user.uid)
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const habitsData = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setHabits(habitsData); // UI updates automatically!
  });

  return () => unsubscribe(); // Cleanup
}, [user]);
```

### **Code: Real-Time Listener (Mobile - ALMOST IDENTICAL!)**

```javascript
// mobile/src/screens/HabitsScreen.js
import firestore from '@react-native-firebase/firestore';

useEffect(() => {
  if (!user) return;

  const unsubscribe = firestore()
    .collection('habits')
    .where('userId', '==', user.uid)
    .onSnapshot(querySnapshot => {
      const habitsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setHabits(habitsData); // UI updates automatically!
    });

  return () => unsubscribe(); // Cleanup
}, [user]);
```

**Notice**: The code is almost identical! This is why React Native is powerful.

---

## 🔐 Authentication Flow

### **Single Authentication System**

```
USER SIGNS UP ON WEB
    ↓
Firebase Auth creates user
    ↓
User ID: "abc123"
    ↓
┌────────────────────────────────────────┐
│ Firebase Authentication               │
│ (Single user account across platforms)│
└────────────────────────────────────────┘
    ↓
    └─────┬─────────┬─────────┐
          │         │         │
          ▼         ▼         ▼
    ┌─────────┬─────────┬─────────┐
    │  Web    │  iOS    │ Android │
    │  App    │  App    │  App    │
    └─────────┴─────────┴─────────┘

USER LOGS IN ON MOBILE
    ↓
Firebase Auth recognizes user
    ↓
All user data appears (goals, habits, journal)
    ↓
Same account, all platforms!
```

### **Authentication Code (Web)**

```javascript
// src/context/AuthContext.jsx
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';

const login = async (email, password) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
};
```

### **Authentication Code (Mobile - SAME!)**

```javascript
// mobile/src/services/authService.js
import auth from '@react-native-firebase/auth';

export const login = async (email, password) => {
  const userCredential = await auth().signInWithEmailAndPassword(email, password);
  return userCredential.user;
};
```

**Result:**
- User signs up on web → Can log in on mobile immediately
- User signs up on mobile → Can log in on web immediately
- Same account, same data, all platforms

---

## 🎯 Backend API Usage Patterns

### **When to Use Firestore Directly**

Use direct Firestore operations for:
- ✅ Creating/reading/updating/deleting user data (CRUD operations)
- ✅ Real-time updates (habits, goals, tasks)
- ✅ User profiles
- ✅ Community posts and comments
- ✅ Direct messages

**Example: Checking in a habit**
```javascript
// Mobile app can do this directly, no API needed!
await firestore()
  .collection('habits')
  .doc(habitId)
  .update({
    streak: increment(1),
    lastCompletedAt: serverTimestamp()
  });
```

---

### **When to Use Cloud Functions (Backend API)**

Use Cloud Functions for:
- ✅ AI features (OpenAI API calls)
- ✅ Complex calculations
- ✅ Email sending
- ✅ Payment processing (if you add subscriptions)
- ✅ Scheduled tasks (daily summaries, reminders)

**Example: AI journal summary**
```javascript
// This MUST go through Cloud Functions
// because it needs the OpenAI API key (secret!)
const response = await fetch('https://app.varawellness.co/api/journal-summary', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ entries })
});
```

---

## 📱 Platform-Specific Considerations

### **Web App**

**Advantages:**
- Easiest to deploy (just `firebase deploy`)
- Updates are instant (no app store approval)
- Works on any device with a browser

**URL Access:**
- Production: `https://app.varawellness.co`
- API calls: `/api/journal-summary` (relative path)
- Firebase Hosting rewrites to Cloud Functions automatically

---

### **Mobile Apps (iOS & Android)**

**Advantages:**
- Native performance
- Push notifications
- Offline-first (better caching)
- Home screen icon
- Platform-specific features (Face ID, widgets, etc.)

**URL Access:**
- API calls: `https://app.varawellness.co/api/journal-summary` (full URL)
- Firestore: Direct SDK access (no URL needed!)
- Authentication: Direct SDK access

**Deployment:**
- iOS: App Store (2-7 day review)
- Android: Google Play (1-3 day review)

---

## 🔄 Code Sharing Strategy

### **What Can Be Shared (60-80% of code)**

```
shared/
├── services/
│   ├── db/
│   │   ├── goals.service.js         ✅ SHARED
│   │   ├── habits.service.js        ✅ SHARED
│   │   ├── profiles.service.js      ✅ SHARED
│   │   └── journal.service.js       ✅ SHARED
│   ├── ai/
│   │   ├── journalAI.js             ✅ SHARED
│   │   └── dailyPlan.js             ✅ SHARED
│   └── utils/
│       ├── dateHelpers.js           ✅ SHARED
│       ├── validators.js            ✅ SHARED
│       └── formatters.js            ✅ SHARED
├── constants/
│   ├── moods.js                     ✅ SHARED
│   ├── categories.js                ✅ SHARED
│   └── config.js                    ✅ SHARED
└── contexts/
    └── AuthContext.js               ✅ SHARED (with small platform tweaks)
```

### **What Must Be Platform-Specific**

```
web/
└── src/
    ├── components/                  ❌ WEB ONLY (React components)
    └── pages/                       ❌ WEB ONLY (React Router)

mobile/
└── src/
    ├── screens/                     ❌ MOBILE ONLY (React Native components)
    └── navigation/                  ❌ MOBILE ONLY (React Navigation)
```

---

## 🚀 Deployment & Updates

### **Web App**

```bash
# Build and deploy
npm run build
firebase deploy

# Results:
# - New code live in ~2 minutes
# - Users see updates immediately on refresh
# - No approval process
```

---

### **Mobile Apps**

```bash
# iOS
cd ios && pod install && cd ..
npx react-native run-ios --configuration Release
# Upload to App Store Connect
# Submit for review (2-7 days)

# Android
cd android && ./gradlew assembleRelease
# Upload to Google Play Console
# Submit for review (1-3 days)
```

**Update Strategy:**
- Critical bugs: Emergency update (expedited review)
- Features: Regular updates (every 2-4 weeks)
- Backend changes: Don't require app updates!

---

## 💰 Cost Breakdown

### **Firebase Services (Pay-as-you-go)**

| Service | Free Tier | Estimated Cost (1000 users) |
|---------|-----------|----------------------------|
| Firestore | 50K reads/day | $5-15/month |
| Cloud Functions | 2M invocations/month | $5-10/month |
| Hosting | 10GB storage, 360MB/day | Free |
| Authentication | Unlimited | Free |
| Storage | 5GB | Free to $5/month |
| **Total** | | **$10-30/month** |

### **OpenAI API**

| Usage | Cost |
|-------|------|
| 100K tokens (gpt-4o-mini) | $0.015 |
| Estimated (1000 users) | $20-50/month |

### **App Stores**

| Platform | Cost |
|----------|------|
| Apple Developer | $99/year |
| Google Play | $25 one-time |

---

## 🔒 Security Architecture

### **Firestore Security Rules**

```javascript
// Same rules apply to web AND mobile!
match /goals/{goalId} {
  allow read: if request.auth != null &&
                 resource.data.userId == request.auth.uid;
  allow create: if request.auth != null &&
                   request.resource.data.userId == request.auth.uid;
}
```

**How it works:**
- User authenticates on any platform
- Gets a Firebase Auth token
- Token is sent with every request
- Firestore validates token before allowing access
- Same security on web and mobile!

---

## 📊 Monitoring & Analytics

### **Firebase Console Dashboard**

View real-time metrics:
- Active users (web + mobile combined)
- API usage (Cloud Functions)
- Database operations
- Error logs
- Performance metrics

**URL:** https://console.firebase.google.com/project/vara-4a99f

---

## ✅ Summary: Why This Architecture Rocks

1. **Single Codebase (Mostly)**
   - Write business logic once
   - Share 60-80% of code between web and mobile
   - Reduce bugs and maintenance

2. **Real-Time Sync**
   - Changes appear instantly on all devices
   - No "refresh" needed
   - Feels magical to users

3. **Unified Backend**
   - One set of Cloud Functions
   - One database
   - One authentication system
   - Easier to maintain

4. **Scalability**
   - Firebase auto-scales
   - No server management
   - Handle 10 users or 10 million

5. **Cost-Effective**
   - Pay only for usage
   - Free tier is generous
   - Predictable costs

6. **Developer Experience**
   - Fast development
   - Great debugging tools
   - Excellent documentation

---

**Questions? Let me know!**

---

**Last Updated**: November 7, 2025
**Project**: Vara Wellness Cross-Platform Guide
