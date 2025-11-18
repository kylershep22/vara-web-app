// Script to check post data in Firestore
// Run with: node scripts/check-posts.js

const admin = require('firebase-admin');
const serviceAccount = require('../backend/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkPosts() {
  console.log('🔍 Checking all posts...\n');

  const postsSnapshot = await db.collection('posts').get();

  console.log(`Found ${postsSnapshot.size} posts:\n`);

  postsSnapshot.forEach(doc => {
    const data = doc.data();
    console.log(`Post ID: ${doc.id}`);
    console.log(`  Author: ${data.authorId}`);
    console.log(`  Content: ${data.content?.substring(0, 50) || '(empty)'}...`);
    console.log(`  Images array: ${JSON.stringify(data.images)}`);
    console.log(`  Images length: ${data.images?.length || 0}`);
    console.log('');
  });
}

checkPosts()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
