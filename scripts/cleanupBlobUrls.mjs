// scripts/cleanupBlobUrls.js
// Script to clean up posts with blob URLs from the database
// Run this script once to remove blob URLs from existing posts

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function cleanupBlobUrls() {
  console.log('🔍 Scanning for posts with blob URLs...\n');

  try {
    // Check posts collection
    const postsSnapshot = await getDocs(collection(db, 'posts'));
    let postsWithBlobs = 0;
    let postsFixed = 0;
    let postsDeleted = 0;

    for (const postDoc of postsSnapshot.docs) {
      const post = postDoc.data();

      if (post.images && post.images.length > 0) {
        const hasBlobUrls = post.images.some(url => url && url.startsWith('blob:'));

        if (hasBlobUrls) {
          postsWithBlobs++;
          console.log(`📌 Found post with blob URLs: ${postDoc.id}`);
          console.log(`   Author: ${post.authorId}`);
          console.log(`   Content: ${post.content?.substring(0, 50)}...`);
          console.log(`   Images: ${post.images.length} (${post.images.filter(url => url.startsWith('blob:')).length} blob URLs)`);

          // Option 1: Remove just the blob URLs, keep other valid images
          const validImages = post.images.filter(url => url && !url.startsWith('blob:'));

          if (validImages.length > 0) {
            // Keep post but remove blob URLs
            await updateDoc(doc(db, 'posts', postDoc.id), {
              images: validImages
            });
            console.log(`   ✅ Updated: Removed blob URLs, kept ${validImages.length} valid image(s)\n`);
            postsFixed++;
          } else {
            // Option 2: Delete entire post if it only has blob URLs and no content
            if (!post.content || post.content.trim().length === 0) {
              await deleteDoc(doc(db, 'posts', postDoc.id));
              console.log(`   🗑️  Deleted: Post had only blob URLs and no content\n`);
              postsDeleted++;
            } else {
              // Keep post but remove all images
              await updateDoc(doc(db, 'posts', postDoc.id), {
                images: []
              });
              console.log(`   ✅ Updated: Removed all blob URLs, kept content\n`);
              postsFixed++;
            }
          }
        }
      }
    }

    // Check groupPosts collection
    const groupPostsSnapshot = await getDocs(collection(db, 'groupPosts'));
    let groupPostsWithBlobs = 0;
    let groupPostsFixed = 0;
    let groupPostsDeleted = 0;

    for (const postDoc of groupPostsSnapshot.docs) {
      const post = postDoc.data();

      if (post.images && post.images.length > 0) {
        const hasBlobUrls = post.images.some(url => url && url.startsWith('blob:'));

        if (hasBlobUrls) {
          groupPostsWithBlobs++;
          console.log(`📌 Found group post with blob URLs: ${postDoc.id}`);
          console.log(`   Group: ${post.groupId}`);
          console.log(`   Author: ${post.authorId}`);
          console.log(`   Content: ${post.content?.substring(0, 50)}...`);
          console.log(`   Images: ${post.images.length} (${post.images.filter(url => url.startsWith('blob:')).length} blob URLs)`);

          const validImages = post.images.filter(url => url && !url.startsWith('blob:'));

          if (validImages.length > 0) {
            await updateDoc(doc(db, 'groupPosts', postDoc.id), {
              images: validImages
            });
            console.log(`   ✅ Updated: Removed blob URLs, kept ${validImages.length} valid image(s)\n`);
            groupPostsFixed++;
          } else {
            if (!post.content || post.content.trim().length === 0) {
              await deleteDoc(doc(db, 'groupPosts', postDoc.id));
              console.log(`   🗑️  Deleted: Post had only blob URLs and no content\n`);
              groupPostsDeleted++;
            } else {
              await updateDoc(doc(db, 'groupPosts', postDoc.id), {
                images: []
              });
              console.log(`   ✅ Updated: Removed all blob URLs, kept content\n`);
              groupPostsFixed++;
            }
          }
        }
      }
    }

    console.log('\n📊 Summary:');
    console.log('─────────────────────────────────────');
    console.log(`Posts Collection:`);
    console.log(`  - Found with blob URLs: ${postsWithBlobs}`);
    console.log(`  - Fixed: ${postsFixed}`);
    console.log(`  - Deleted: ${postsDeleted}`);
    console.log(`\nGroup Posts Collection:`);
    console.log(`  - Found with blob URLs: ${groupPostsWithBlobs}`);
    console.log(`  - Fixed: ${groupPostsFixed}`);
    console.log(`  - Deleted: ${groupPostsDeleted}`);
    console.log(`\n✅ Cleanup complete!`);

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Run the cleanup
cleanupBlobUrls();
