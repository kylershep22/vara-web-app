# Connection Migration Guide

This guide will help you migrate all connection data to the new standardized format.

## Prerequisites

1. **Firebase Admin SDK Service Account Key**
   - Go to Firebase Console → Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Save the JSON file as `serviceAccountKey.json` in the project root
   - **DO NOT commit this file to git** (it's in .gitignore)

2. **Install dependencies** (if not already installed)
   ```bash
   npm install firebase-admin
   ```

## What This Migration Does

1. **Consolidates 3 collections → 1 collection**
   - `connections` (kept, standardized)
   - `connectionRequests` (migrated to `connections`)
   - `connectionInvites` (migrated to `connections`)

2. **Standardizes data format**
   - All connections use: `requesterId`, `addresseeId`, `participants`, `status`
   - Removes field inconsistencies (`a`/`b`, `from`/`to`, etc.)

3. **Fixes user search**
   - Sets `searchable: true` on all user documents
   - Enables users to appear in search results

4. **Prevents duplicates**
   - Tracks migrated connections
   - Skips duplicate requests between same users

## Running the Migration

### Step 1: Dry Run (Recommended)
```bash
node scripts/migrate-connections.js
```

This will:
- Show what will be migrated
- NOT delete old collections (commented out by default)
- Create a summary report

### Step 2: Verify in Firestore Console
- Check the `connections` collection
- Verify data looks correct
- Check that all your connections are there

### Step 3: Test in the App
- Test sending connection requests
- Test accepting/declining requests
- Test user search
- Test messaging connections

### Step 4: Clean Up (Optional)
Once you've verified everything works:

1. Edit `scripts/migrate-connections.js`
2. Uncomment the `await doc.ref.delete();` lines
3. Run migration again to delete old collection documents

## Expected Output

```
🎯 WELLNESS APP - CONNECTION MIGRATION TOOL

🚀 Starting connection migration...

📦 Migrating from "connections" collection...
  ✓ Migrated: abc123
  ✓ Already migrated: def456
  ⚠️  Skipping duplicate: user1_user2

📦 Migrating from "connectionRequests" collection...
  ✓ Migrated: ghi789 → connections

📦 Migrating from "connectionInvites" collection...
  ✓ Migrated: jkl012 → connections

==================================================
✅ MIGRATION COMPLETE

connections collection:
  Found: 5
  Migrated: 3
  Skipped: 2

connectionRequests collection:
  Found: 2
  Migrated: 2
  Skipped: 0

connectionInvites collection:
  Found: 1
  Migrated: 1
  Skipped: 0

Duplicates found: 0
Errors: 0
==================================================

🔍 Fixing user searchable field...

  ✓ Updated user: user123 (John Doe)
  ✓ Updated user: user456 (Jane Smith)

✅ User searchable fix complete:
  Updated: 2
  Already searchable: 0

✨ All done! Exiting...
```

## Troubleshooting

### Error: Cannot find module '../serviceAccountKey.json'
**Solution:** Download your Firebase Admin SDK key and save it as `serviceAccountKey.json` in the project root.

### Error: Permission denied
**Solution:** Make sure your service account has Firestore permissions.

### No connections found
**Solution:** Check that you're running against the correct Firebase project.

### Duplicates detected
**Solution:** This is normal! The script automatically skips duplicates.

## Rollback Plan

If something goes wrong:

1. **Don't panic** - Old collections are NOT deleted by default
2. Check Firestore console - old data is still there
3. Delete the new `connections` documents
4. Fix the script and re-run

## After Migration

Update your Firestore security rules to remove unused collections:
1. Remove rules for `connectionRequests`
2. Remove rules for `connectionInvites`
3. Keep only `connections` rules

See `firestore.rules` for the updated rules.
