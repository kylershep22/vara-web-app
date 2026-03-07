/**
 * SecureStore-backed persistence adapter for Firebase Auth
 *
 * Uses expo-secure-store for encrypted token storage instead of AsyncStorage.
 * Includes chunking support since SecureStore has a 2048-byte value limit
 * on some platforms, and Firebase auth tokens can exceed this.
 *
 * Key sanitization is required because SecureStore on iOS only allows
 * alphanumeric characters, underscores, dots, and hyphens in keys,
 * while Firebase uses keys that may contain other characters.
 */

import * as SecureStore from 'expo-secure-store';
import { getReactNativePersistence } from 'firebase/auth';

const CHUNK_SIZE = 1800; // Leave margin below 2048 limit
const CHUNK_COUNT_SUFFIX = '_chunkcount';

/**
 * Sanitize a key for SecureStore compatibility.
 * SecureStore keys must match /^[A-Za-z0-9._-]+$/
 */
function sanitizeKey(key: string): string {
  return key.replace(/[^A-Za-z0-9._-]/g, '_');
}

/**
 * Store a value, chunking it if it exceeds SecureStore's size limit
 */
async function setItem(key: string, value: string): Promise<void> {
  const safeKey = sanitizeKey(key);
  try {
    if (value.length <= CHUNK_SIZE) {
      await SecureStore.setItemAsync(safeKey, value);
      // Clean up any previous chunks
      await removeChunks(safeKey);
      return;
    }

    // Split into chunks
    const chunkCount = Math.ceil(value.length / CHUNK_SIZE);
    const promises: Promise<void>[] = [];

    for (let i = 0; i < chunkCount; i++) {
      const chunk = value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      promises.push(SecureStore.setItemAsync(`${safeKey}_chunk${i}`, chunk));
    }

    promises.push(SecureStore.setItemAsync(`${safeKey}${CHUNK_COUNT_SUFFIX}`, String(chunkCount)));
    await Promise.all(promises);

    // Remove the non-chunked key if it existed
    try {
      await SecureStore.deleteItemAsync(safeKey);
    } catch {
      // Ignore - key may not exist
    }
  } catch (error) {
    if (__DEV__) console.warn('SecureStore setItem error:', error);
  }
}

/**
 * Retrieve a value, reassembling chunks if necessary
 */
async function getItem(key: string): Promise<string | null> {
  const safeKey = sanitizeKey(key);
  try {
    // Check if value is chunked
    const chunkCountStr = await SecureStore.getItemAsync(`${safeKey}${CHUNK_COUNT_SUFFIX}`);

    if (chunkCountStr) {
      const chunkCount = parseInt(chunkCountStr, 10);
      if (isNaN(chunkCount) || chunkCount <= 0) {
        await removeItem(key);
        return null;
      }

      const chunks: (string | null)[] = await Promise.all(
        Array.from({ length: chunkCount }, (_, i) =>
          SecureStore.getItemAsync(`${safeKey}_chunk${i}`)
        )
      );

      // If any chunk is missing, the data is corrupted
      if (chunks.some(chunk => chunk === null)) {
        await removeItem(key);
        return null;
      }

      return chunks.join('');
    }

    // Not chunked - read directly
    return await SecureStore.getItemAsync(safeKey);
  } catch (error) {
    if (__DEV__) console.warn('SecureStore getItem error:', error);
    return null;
  }
}

/**
 * Remove a value and any associated chunks
 */
async function removeItem(key: string): Promise<void> {
  const safeKey = sanitizeKey(key);
  try {
    await removeChunks(safeKey);
    await SecureStore.deleteItemAsync(safeKey);
  } catch {
    // Ignore - key may not exist
  }
}

/**
 * Clean up chunk keys for a given base key (expects already-sanitized key)
 */
async function removeChunks(safeKey: string): Promise<void> {
  try {
    const chunkCountStr = await SecureStore.getItemAsync(`${safeKey}${CHUNK_COUNT_SUFFIX}`);
    if (!chunkCountStr) return;

    const chunkCount = parseInt(chunkCountStr, 10);
    if (isNaN(chunkCount) || chunkCount <= 0) return;

    const promises: Promise<void>[] = [];

    for (let i = 0; i < chunkCount; i++) {
      promises.push(
        SecureStore.deleteItemAsync(`${safeKey}_chunk${i}`).catch(() => {})
      );
    }
    promises.push(
      SecureStore.deleteItemAsync(`${safeKey}${CHUNK_COUNT_SUFFIX}`).catch(() => {})
    );

    await Promise.all(promises);
  } catch {
    // Ignore cleanup errors
  }
}

// Adapter that satisfies Firebase's persistence interface
const secureStorageAdapter = {
  getItem,
  setItem,
  removeItem,
};

export const secureStorePersistence = getReactNativePersistence(secureStorageAdapter);
