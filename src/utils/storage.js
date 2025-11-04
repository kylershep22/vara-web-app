// src/utils/storage.js
import { ref, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

/**
 * Converts a Firebase Storage path to a download URL
 * @param {string} storagePath - The path to the file in Firebase Storage (e.g., 'audio/sleep/rain.mp3')
 * @returns {Promise<string>} The download URL for the file
 */
export async function urlFromStoragePath(storagePath) {
  if (!storagePath || typeof storagePath !== 'string') {
    return null;
  }

  try {
    const storageRef = ref(storage, storagePath);
    const url = await getDownloadURL(storageRef);
    return url;
  } catch (error) {
    console.error('Error getting download URL for storage path:', storagePath, error);
    return null;
  }
}
