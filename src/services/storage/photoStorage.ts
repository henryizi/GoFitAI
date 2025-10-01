import { supabase } from '../supabase/client';
import { BodyPhoto } from '../../types/analysis';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { 
  LocalPhotoStorageService, 
  LocalPhotoUploadResult, 
  LocalBodyPhoto,
  ProgressPhotoSession 
} from './localPhotoStorage';

export interface PhotoUploadResult {
  success: boolean;
  photo?: BodyPhoto | LocalBodyPhoto;
  error?: string;
}

export class PhotoStorageService {
  private static BUCKET_NAME = 'body-photos';
  private static PLAN_BUCKET_NAME = 'plan-images';

  /**
   * Request camera and photo library permissions
   */
  static async requestPermissions(): Promise<boolean> {
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    const libraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    return cameraPermission.status === 'granted' && libraryPermission.status === 'granted';
  }

  /**
   * Pick an image from the camera or photo library
   */
  static async pickImage(source: 'camera' | 'library'): Promise<string | null> {
    try {
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images, // reverted to safe fallback for compatibility
        allowsEditing: false, // Disable editing to preserve original dimensions
        quality: 1.0, // Maximum quality - no compression
        // Removed aspect ratio constraint to preserve original photo dimensions
      };

      let result;
      if (source === 'camera') {
        result = await ImagePicker.launchCameraAsync(options);
      } else {
        result = await ImagePicker.launchImageLibraryAsync(options);
      }

      if (!result.canceled && result.assets[0]) {
        return result.assets[0].uri;
      }
      return null;
    } catch (error) {
      console.error('Error picking image:', error);
      return null;
    }
  }

  /**
   * Save a photo locally on the device (replaces server upload)
   */
  static async uploadPhoto(
    userId: string,
    photoType: 'front' | 'back',
    imageUri: string,
    date?: string
  ): Promise<PhotoUploadResult> {
    // Use current date if not provided
    const photoDate = date || new Date().toISOString().split('T')[0];
    
    // Delegate to local storage service
    return await LocalPhotoStorageService.savePhoto(userId, photoType, imageUri, photoDate);
  }

  /**
   * Upload a generic plan cover image to Supabase storage (no DB insert)
   */
  static async uploadPlanImage(
    userId: string,
    imageUri: string
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      if (!('storage' in supabase) || !('from' in supabase)) {
        throw new Error('Supabase storage is not configured');
      }

      const timestamp = new Date().toISOString();
      const filename = `${userId}/plan_${timestamp}.jpg`;

      const base64 = await FileSystem.readAsStringAsync(imageUri, { encoding: 'base64' });
      const arrayBuffer = decode(base64);

      try {
        const { data: buckets } = await supabase.storage.listBuckets();
        const exists = buckets?.some(b => b.name === this.PLAN_BUCKET_NAME);
        if (!exists) {
          console.warn(`Storage bucket '${this.PLAN_BUCKET_NAME}' not found. Please create it in Supabase.`);
        }
      } catch {
        // Non-fatal; continue
      }

      const { error: uploadError } = await supabase.storage
        .from(this.PLAN_BUCKET_NAME)
        .upload(filename, arrayBuffer, { contentType: 'image/jpeg', cacheControl: '3600' });
      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      const { data: urlData } = supabase.storage
        .from(this.PLAN_BUCKET_NAME)
        .getPublicUrl(filename);
      return { success: true, url: urlData.publicUrl };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Upload failed' };
    }
  }

  /**
   * Get user's photos (from local storage)
   */
  static async getUserPhotos(userId: string): Promise<LocalBodyPhoto[]> {
    return await LocalPhotoStorageService.getUserPhotos(userId);
  }

  /**
   * Get the latest photo session (front and back photos)
   */
  static async getLatestPhotoSession(userId: string): Promise<{
    frontPhoto?: LocalBodyPhoto;
    backPhoto?: LocalBodyPhoto;
  }> {
    try {
      const photos = await this.getUserPhotos(userId);
      
      const frontPhoto = photos.find(p => p.photo_type === 'front');
      const backPhoto = photos.find(p => p.photo_type === 'back');

      return { frontPhoto, backPhoto };
    } catch (error) {
      console.error('Error fetching latest photo session:', error);
      return {};
    }
  }

  /**
   * Delete a photo from local storage
   */
  static async deletePhoto(userId: string, photoId: string): Promise<boolean> {
    return await LocalPhotoStorageService.deletePhoto(userId, photoId);
  }

  /**
   * Get progress photo sessions grouped by date
   */
  static async getProgressPhotoSessions(userId: string): Promise<ProgressPhotoSession[]> {
    return await LocalPhotoStorageService.getProgressPhotoSessions(userId);
  }

  /**
   * Get photos for a specific date
   */
  static async getPhotosForDate(userId: string, date: string): Promise<{
    front_photo?: LocalBodyPhoto;
    back_photo?: LocalBodyPhoto;
  }> {
    return await LocalPhotoStorageService.getPhotosForDate(userId, date);
  }

  /**
   * Delete all photos for a user (for account deletion)
   */
  static async deleteAllUserPhotos(userId: string): Promise<boolean> {
    return await LocalPhotoStorageService.deleteAllUserPhotos(userId);
  }

  /**
   * Get storage usage information
   */
  static async getStorageInfo(userId: string): Promise<{
    photoCount: number;
    totalSizeBytes: number;
    totalSizeMB: number;
  }> {
    return await LocalPhotoStorageService.getStorageInfo(userId);
  }
} 