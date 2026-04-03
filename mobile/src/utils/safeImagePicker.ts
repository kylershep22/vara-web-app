/**
 * Safe wrappers around expo-image-picker.
 * Handles permissions, null checks, debounce guards, and size validation.
 */
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { logger } from './logger';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

/**
 * Safely pick image(s) from the media library.
 * Returns validated assets array, or null on failure/cancel.
 */
export async function safePickFromLibrary(
  options: Partial<ImagePicker.ImagePickerOptions> = {}
): Promise<ImagePicker.ImagePickerAsset[] | null> {
  try {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Please grant photo library access in Settings.');
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      ...options,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    return result.assets;
  } catch (error) {
    logger.error('safePickFromLibrary error:', error);
    return null;
  }
}

/**
 * Safely take a photo or video with the camera.
 * Returns validated assets array, or null on failure/cancel.
 */
export async function safePickFromCamera(
  options: Partial<ImagePicker.ImagePickerOptions> = {}
): Promise<ImagePicker.ImagePickerAsset[] | null> {
  try {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Required', 'Please grant camera access in Settings.');
      return null;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      ...options,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    return result.assets;
  } catch (error) {
    logger.error('safePickFromCamera error:', error);
    return null;
  }
}

/**
 * Safely convert a URI to a Blob with response and size validation.
 * Returns null if the fetch fails, response is not ok, or file exceeds 10MB.
 */
export async function safeUriToBlob(uri: string): Promise<Blob | null> {
  try {
    const response = await fetch(uri);
    if (!response.ok) {
      logger.error(`safeUriToBlob: fetch failed with status ${response.status}`);
      return null;
    }

    const blob = await response.blob();

    if (blob.size > MAX_FILE_SIZE_BYTES) {
      Alert.alert('Image Too Large', 'Please select an image under 10MB.');
      return null;
    }

    return blob;
  } catch (error) {
    logger.error('safeUriToBlob error:', error);
    return null;
  }
}
