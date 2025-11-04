# Environment Variables Setup Guide

## Overview

This guide explains how to set up environment variables for the Vara wellness app. Environment variables are used to store sensitive configuration (like API keys) securely without committing them to version control.

---

## 🔐 Why Environment Variables?

### Security Benefits

**Before** (INSECURE):
```javascript
// Hardcoded in src/firebase.js
const firebaseConfig = {
  apiKey: "AIzaSyB_RQJh0cMU3ruEm3vAY1uSKIk7vPlY6lc", // ❌ Public in Git
  authDomain: "vara-4a99f.firebaseapp.com",
  // ...
};
```

**After** (SECURE):
```javascript
// Using environment variables
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY, // ✅ Not in Git
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  // ...
};
```

### Advantages

1. ✅ **Secrets not in version control** - API keys stay private
2. ✅ **Different configs per environment** - Dev, staging, production can have different keys
3. ✅ **Easy to rotate keys** - Change in .env file, not in code
4. ✅ **Team collaboration** - Each developer has their own .env file
5. ✅ **Production security** - Deploy with environment-specific values

---

## 📁 File Structure

```
wellness-app/
├── .env                    # ⚠️ NOT committed to Git (your actual secrets)
├── .env.example            # ✅ Committed to Git (template)
├── backend/
│   ├── .env                # ⚠️ NOT committed to Git (backend secrets)
│   └── .env.example        # ✅ Committed to Git (backend template)
└── .gitignore              # Ensures .env files are not committed
```

---

## 🚀 Quick Setup

### For Team Members / New Developers

If you're setting up the project for the first time:

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd wellness-app

# 2. Install dependencies
npm install

# 3. Copy environment templates
cp .env.example .env
cp backend/.env.example backend/.env

# 4. Get the real values from:
#    - Firebase Console (for frontend)
#    - OpenAI Dashboard (for backend)
#    - Or ask a team member

# 5. Fill in .env and backend/.env with real values

# 6. Start development
npm run dev
```

---

## 🔧 Frontend Environment Variables

### Location: `.env` (root directory)

### Required Variables

```bash
# Firebase Configuration (Frontend)
REACT_APP_FIREBASE_API_KEY=your_api_key_here
REACT_APP_FIREBASE_AUTH_DOMAIN=vara-4a99f.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=vara-4a99f
REACT_APP_FIREBASE_STORAGE_BUCKET=vara-4a99f.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id_here
REACT_APP_FIREBASE_APP_ID=your_app_id_here
```

### How to Get These Values

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **vara-4a99f**
3. Click ⚙️ (Settings) → **Project settings**
4. Scroll to "Your apps" section
5. Select your web app
6. Copy the config values

### Important Notes

- **All React environment variables MUST start with `REACT_APP_`**
- After changing `.env`, you **must restart** the development server
- Variables are embedded at **build time**, not runtime
- Never commit `.env` to version control

---

## 🖥️ Backend Environment Variables

### Location: `backend/.env`

### Required Variables

```bash
# OpenAI API Key (for AI features)
OPENAI_API_KEY=sk-your-openai-api-key-here

# Server Port (optional, defaults to 5001)
PORT=5001
```

### Optional Variables

```bash
# SendGrid API Key (for email notifications)
SENDGRID_API_KEY=your-sendgrid-api-key-here
```

### How to Get These Values

**OpenAI API Key:**
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Click "Create new secret key"
3. Copy the key (you won't see it again!)
4. Paste into `backend/.env`

**SendGrid API Key** (optional):
1. Go to [SendGrid Dashboard](https://app.sendgrid.com/settings/api_keys)
2. Create API key
3. Copy and paste into `backend/.env`

---

## ✅ Verification

### Check Frontend Environment Variables

```bash
# Start the app
npm start

# Open browser console (F12)
# You should NOT see any errors about missing environment variables
# If configured correctly, the app will load normally
```

If you see this error:
```
❌ Missing required environment variables:
   - REACT_APP_FIREBASE_API_KEY
   - REACT_APP_FIREBASE_PROJECT_ID
```

**Solution**: Check that `.env` exists and has all required variables.

### Check Backend Environment Variables

```bash
# Start the backend
npm run server

# Check console output
# You should see:
✓ Server running on port 5001

# If OPENAI_API_KEY is missing, you'll see:
⚠️ OPENAI_API_KEY is not set. AI routes will fail until this is configured.
```

**Solution**: Check that `backend/.env` exists and has OPENAI_API_KEY.

---

## 🚀 Deployment

### Local Development

`.env` and `backend/.env` files are used automatically.

### Production (Firebase Hosting / Cloud Functions)

Environment variables need to be set in the hosting platform:

#### Option 1: Firebase Hosting Config

For the React app (frontend):

```bash
# Set environment variables in firebase.json or hosting config
# Or use Firebase's environment config feature
```

#### Option 2: Cloud Run / App Engine

Set environment variables in the deployment config:

```bash
# Example for Cloud Run
gcloud run deploy vara-web-app \
  --set-env-vars "REACT_APP_FIREBASE_API_KEY=xxx,REACT_APP_FIREBASE_PROJECT_ID=xxx"
```

#### Option 3: CI/CD Pipeline

Set secrets in your CI/CD platform:
- GitHub Actions: Repository Secrets
- GitLab CI: CI/CD Variables
- CircleCI: Environment Variables

**IMPORTANT**: Never hardcode secrets in CI/CD config files!

---

## 🔒 Security Best Practices

### ✅ DO

- ✅ Use `.env` files for local development
- ✅ Keep `.env.example` updated (but with placeholder values)
- ✅ Add `.env` to `.gitignore`
- ✅ Rotate API keys periodically
- ✅ Use different API keys for dev/staging/production
- ✅ Limit API key permissions (if possible)
- ✅ Share secrets securely (1Password, encrypted channels)

### ❌ DON'T

- ❌ Commit `.env` to version control
- ❌ Share `.env` files publicly (Slack, email, etc.)
- ❌ Use production keys in development
- ❌ Hardcode secrets in source code
- ❌ Push secrets to public repositories
- ❌ Include secrets in error messages or logs

---

## 🔄 Rotating API Keys

If an API key is compromised, rotate it immediately:

### Firebase API Key

1. Go to Firebase Console → Project Settings
2. Under "Web API Key", click "Regenerate"
3. Update `.env` with new key
4. Restart development server
5. Update production environment variables

### OpenAI API Key

1. Go to OpenAI Platform → API Keys
2. Revoke old key
3. Create new key
4. Update `backend/.env` with new key
5. Restart backend server
6. Update production environment variables

---

## 🐛 Troubleshooting

### Error: "Missing required environment variables"

**Cause**: `.env` file doesn't exist or variables are not set

**Solution**:
```bash
# Check if .env exists
ls -la .env

# If not, create from example
cp .env.example .env

# Edit .env and fill in real values
```

### Error: "process.env.REACT_APP_FIREBASE_API_KEY is undefined"

**Cause**: React can't read the environment variable

**Solutions**:
1. Ensure variable name starts with `REACT_APP_`
2. Restart development server (`npm start`)
3. Check there are no typos in variable name
4. Ensure `.env` is in the root directory (not in `src/`)

### Backend: "OPENAI_API_KEY is not set"

**Cause**: `backend/.env` doesn't exist or doesn't have the key

**Solution**:
```bash
# Check if backend/.env exists
ls -la backend/.env

# If not, create from example
cp backend/.env.example backend/.env

# Edit backend/.env and add your OpenAI API key
```

### Changes to .env not taking effect

**Solution**:
1. **Stop** the development server (Ctrl+C)
2. **Restart** the server (`npm start` or `npm run dev`)
3. Environment variables are loaded at startup, not hot-reloaded

### Git is tracking my .env file

**Solution**:
```bash
# Stop tracking .env
git rm --cached .env
git rm --cached backend/.env

# Ensure .gitignore has .env
echo ".env" >> .gitignore
echo "backend/.env" >> .gitignore

# Commit the changes
git add .gitignore
git commit -m "Stop tracking .env files"
```

---

## 📚 Additional Resources

- [Create React App - Environment Variables](https://create-react-app.dev/docs/adding-custom-environment-variables/)
- [dotenv Documentation](https://github.com/motdotla/dotenv)
- [Firebase Security Best Practices](https://firebase.google.com/support/guides/security-checklist)
- [OWASP - Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)

---

## ✅ Checklist

Use this checklist when setting up environment variables:

- [ ] `.env.example` created with template values
- [ ] `backend/.env.example` created with template values
- [ ] `.env` added to `.gitignore`
- [ ] `backend/.env` added to `.gitignore`
- [ ] `.env` file created locally with real values
- [ ] `backend/.env` file created locally with real values
- [ ] All required frontend variables set (REACT_APP_*)
- [ ] All required backend variables set (OPENAI_API_KEY)
- [ ] Development server starts without errors
- [ ] Backend server starts without errors
- [ ] Firebase connection works
- [ ] AI features work (OpenAI integration)
- [ ] Production environment variables configured
- [ ] Team members have access to secrets (securely)
- [ ] `.env` files are NOT in version control

---

**Status**: ✅ Environment variables configured securely

**Last Updated**: 2025-11-02
