/**
 * Storage Service
 * Handles all Firebase Storage operations for media uploads
 */

import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../../config/firebase';

// Types
export interface MediaUploadResult {
  url: string;
  type: 'image' | 'video';
  path: string;
}

export interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  percentage: number;
}

/**
 * Convert local URI to Blob for upload
 */
async function uriToBlob(uri: string): Promise<Blob> {
  const response = await fetch(uri);
  const blob = await response.blob();
  return blob;
}

/**
 * Generate unique filename for media
 */
function generateMediaFilename(userId: string, type: 'image' | 'video'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  const extension = type === 'image' ? 'jpg' : 'mp4';
  const prefix = type === 'image' ? 'img' : 'vid';

  return `posts/${userId}/${prefix}_${timestamp}_${random}.${extension}`;
}

/**
 * Upload single image to Firebase Storage
 */
export async function uploadPostImage(
  userId: string,
  imageUri: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<MediaUploadResult> {
  if (!storage) throw new Error('Firebase Storage is not initialized');
  try {
    // Convert URI to blob
    const blob = await uriToBlob(imageUri);

    // Generate filename and create storage reference
    const filename = generateMediaFilename(userId, 'image');
    const storageRef = ref(storage, filename);

    // Upload blob
    await uploadBytes(storageRef, blob);

    // Get download URL
    const downloadURL = await getDownloadURL(storageRef);

    return {
      url: downloadURL,
      type: 'image',
      path: filename,
    };
  } catch (error) {
    console.error('Error uploading image:', error);
    throw new Error('Failed to upload image. Please try again.');
  }
}

/**
 * Upload single video to Firebase Storage
 */
export async function uploadPostVideo(
  userId: string,
  videoUri: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<MediaUploadResult> {
  if (!storage) throw new Error('Firebase Storage is not initialized');
  try {
    // Convert URI to blob
    const blob = await uriToBlob(videoUri);

    // Generate filename and create storage reference
    const filename = generateMediaFilename(userId, 'video');
    const storageRef = ref(storage, filename);

    // Upload blob
    await uploadBytes(storageRef, blob);

    // Get download URL
    const downloadURL = await getDownloadURL(storageRef);

    return {
      url: downloadURL,
      type: 'video',
      path: filename,
    };
  } catch (error) {
    console.error('Error uploading video:', error);
    throw new Error('Failed to upload video. Please try again.');
  }
}

/**
 * Upload multiple media items (images and/or videos)
 * Uploads in parallel for better performance
 */
export async function uploadPostMedia(
  userId: string,
  mediaItems: Array<{ uri: string; type: 'image' | 'video' }>,
  onProgress?: (overall: UploadProgress) => void
): Promise<MediaUploadResult[]> {
  if (!storage) throw new Error('Firebase Storage is not initialized');
  try {
    // Upload all media items in parallel
    const uploadPromises = mediaItems.map((media) =>
      media.type === 'image'
        ? uploadPostImage(userId, media.uri)
        : uploadPostVideo(userId, media.uri)
    );

    const results = await Promise.all(uploadPromises);
    return results;
  } catch (error) {
    console.error('Error uploading media:', error);
    throw new Error('Failed to upload media. Please try again.');
  }
}

/**
 * Delete media file from Firebase Storage
 */
export async function deletePostMedia(path: string): Promise<void> {
  if (!storage) throw new Error('Firebase Storage is not initialized');
  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  } catch (error) {
    console.error('Error deleting media:', error);
    throw new Error('Failed to delete media.');
  }
}
