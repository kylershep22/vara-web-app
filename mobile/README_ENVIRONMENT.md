# Environment Configuration - Quick Guide

## 🎯 How It Works

The app **automatically** selects the correct API URL based on your environment:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  📱 EXPO_PUBLIC_ENV determines API URL:                        │
│                                                                 │
│  ├─ development  → http://localhost:5001                       │
│  ├─ staging      → https://staging-api.yourdomain.com          │
│  └─ production   → https://us-central1-your-project-id.cloudfun...  │
│                                                                 │
│  ⚙️  You can override by setting EXPO_PUBLIC_API_URL in .env   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### For iOS Simulator (Default)

Just works! The `.env` file is already configured:

```bash
npm start      # Start Expo
# Press 'i' for iOS simulator
```

### For Physical Device (iPhone/Android)

1. **Get your computer's IP address:**
   ```bash
   ipconfig    # Windows
   ifconfig    # Mac/Linux
   ```
   Look for IPv4 address like `192.168.1.100`

2. **Edit `mobile/.env` file:**
   ```env
   # Uncomment and update this line:
   EXPO_PUBLIC_API_URL=http://192.168.1.100:5001
   ```

3. **Restart Expo:**
   ```bash
   npm start
   # Press 'r' to reload
   ```

4. **Ensure devices are on the same Wi-Fi**

### For Android Emulator

Android emulator needs a special IP:

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:5001
```

## 📦 Building for Production

When you build the app for App Store / Google Play:

```bash
# The app will automatically use production API
eas build --profile production --platform ios
```

No need to change anything - the production URL is automatically selected!

## 🔍 Debugging

Check which API URL is being used - look for this log when the app starts:

```
🔧 App Configuration:
  📍 Environment: development
  🌐 API URL: http://localhost:5001/api
  🔥 Firebase Project: your-project-id
```

## 📚 Files Overview

| File | Purpose |
|------|---------|
| `.env` | Main configuration (committed to git) |
| `.env.local.example` | Template for physical device testing |
| `.env.production.example` | Template for production builds |
| `src/config/env.ts` | Smart environment detection logic |
| `eas.json` | Build profiles with environment settings |
| `DEPLOYMENT_GUIDE.md` | Complete deployment instructions |

## 🆘 Troubleshooting

**"Network Error" when using AI chat?**

1. ✅ Is backend running? Run: `npm run server` from root
2. ✅ Check API URL in console logs (see Debugging section above)
3. ✅ Did you restart Expo after changing .env? Press `r` or restart
4. ✅ Are devices on same Wi-Fi?
5. ✅ Test backend: Open `http://localhost:5001/api/health` in browser

**Still not working with physical device?**

Try creating `.env.local`:
```bash
cp .env.local.example .env.local
# Edit .env.local with your IP
# Restart Expo
```

## 🎓 Learn More

See `DEPLOYMENT_GUIDE.md` for:
- Production deployment
- Backend hosting options (Firebase Functions, Railway, etc.)
- App Store submission
- EAS Build configuration
- Security best practices

---

**Quick Commands:**

```bash
# Development
npm run server                    # Start backend (from root)
npm start                         # Start Expo (from mobile/)

# Check which API URL is active
# Look for "🌐 API URL:" in console logs

# Production builds
eas build --profile production --platform ios
```
