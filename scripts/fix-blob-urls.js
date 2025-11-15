// Script to fix posts with blob URLs in Firestore
// Run with: node scripts/fix-blob-urls.js

const admin = require('firebase-admin');
const serviceAccount = require('../backend/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fixBlobUrls() {
  console.log('🔍 Searching for posts with blob URLs...\n');

  const collections = ['posts', 'groupPosts'];
  let totalFixed = 0;

  for (const collectionName of collections) {
    console.log(`\nChecking ${collectionName} collection...`);

    const snapshot = await db.collection(collectionName).get();
    console.log(`Found ${snapshot.size} documents`);

    for (const doc of snapshot.docs) {
      const data = doc.data();

      if (data.images && Array.isArray(data.images)) {
        const hasBlobUrls = data.images.some(url =>
          typeof url === 'string' && url.startsWith('blob:')
        );

        if (hasBlobUrls) {
          console.log(`\n⚠️  Found blob URLs in ${collectionName}/${doc.id}`);
          console.log(`   Author: ${data.authorId}`);
          console.log(`   Content: ${data.content?.substring(0, 50)}...`);
          console.log(`   Images: ${data.images.join(', ')}`);

          // Remove blob URLs from the images array
          const validImages = data.images.filter(url =>
            typeof url === 'string' && !url.startsWith('blob:')
          );

          console.log(`   → Updating to ${validImages.length} valid images`);

          await doc.ref.update({
            images: validImages
          });

          totalFixed++;
        }
      }
    }
  }

  console.log(`\n✅ Fixed ${totalFixed} documents with blob URLs`);
  console.log('Done!');
}

fixBlobUrls()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
