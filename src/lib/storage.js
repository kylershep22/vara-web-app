// src/lib/storage.js
import { getStorage, ref, getDownloadURL } from "firebase/storage";

const _cache = new Map();
export function urlFromStoragePath(storagePath) {
  if (!storagePath) return Promise.resolve("");
  if (!_cache.has(storagePath)) {
    const storage = getStorage();
    _cache.set(storagePath, getDownloadURL(ref(storage, storagePath)));
  }
  return _cache.get(storagePath);
}
