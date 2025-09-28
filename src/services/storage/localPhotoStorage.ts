import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface LocalPhotoUploadResult {
  success: boolean;
  photo?: LocalBodyPhoto;
  error?: string;
}

export interface LocalBodyPhoto {
  id: string;
  user_id: string;
  photo_type: 'front' | 'back';
  local_uri: string;
  uploaded_at: string;
  date: string; // The date this photo represents progress for
  is_analyzed: boolean;
  analysis_status: 'pending' | 'completed' | 'failed';
}

export interface ProgressPhotoSession {
  date: string;
  front_photo?: LocalBodyPhoto;
  back_photo?: LocalBodyPhoto;
}

export class LocalPhotoStorageService {
  private static PHOTO_DIRECTORY = `${FileSystem.documentDirectory}progress_photos/`;
  private static STORAGE_KEY_PREFIX = 'progress_photos_';

  /**
   * Initialize the photo storage directory
   */
  private static async initializeDirectory(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.PHOTO_DIRECTORY);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.PHOTO_DIRECTORY, { intermediates: true });
        console.log('📁 Created progress photos directory');
      }
    } catch (error) {
      console.error('Error initializing photo directory:', error);
    }
  }

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
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4], // Portrait aspect ratio for body photos
        quality: 0.8,
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
   * Store a photo locally on the device
   */
  static async savePhoto(
    userId: string,
    photoType: 'front' | 'back',
    imageUri: string,
    date: string
  ): Promise<LocalPhotoUploadResult> {
    try {
      console.log('📱 Saving photo locally:', { userId, photoType, date });
      
      // Initialize directory
      await this.initializeDirectory();

      // Generate unique filename
      const timestamp = new Date().toISOString();
      const photoId = `${userId}_${photoType}_${date}_${timestamp}`;
      const filename = `${photoId}.jpg`;
      const localPath = `${this.PHOTO_DIRECTORY}${filename}`;

      // Copy the image to our app's document directory
      await FileSystem.copyAsync({
        from: imageUri,
        to: localPath,
      });

      console.log('✅ Photo copied to:', localPath);

      // Create photo metadata
      const photo: LocalBodyPhoto = {
        id: photoId,
        user_id: userId,
        photo_type: photoType,
        local_uri: localPath,
        uploaded_at: timestamp,
        date: date,
        is_analyzed: false,
        analysis_status: 'pending',
      };

      // Save metadata to AsyncStorage
      await this.savePhotoMetadata(userId, photo);

      console.log('✅ Photo metadata saved locally');

      return {
        success: true,
        photo: photo,
      };
    } catch (error) {
      console.error('Error saving photo locally:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save photo',
      };
    }
  }

  /**
   * Save photo metadata to AsyncStorage
   */
  private static async savePhotoMetadata(userId: string, photo: LocalBodyPhoto): Promise<void> {
    try {
      const storageKey = `${this.STORAGE_KEY_PREFIX}${userId}`;
      const existingPhotosJson = await AsyncStorage.getItem(storageKey);
      const existingPhotos: LocalBodyPhoto[] = existingPhotosJson ? JSON.parse(existingPhotosJson) : [];

      // Remove any existing photo for the same date and type
      const filteredPhotos = existingPhotos.filter(
        p => !(p.date === photo.date && p.photo_type === photo.photo_type)
      );

      // Add the new photo
      filteredPhotos.push(photo);

      // Sort by date descending
      filteredPhotos.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      await AsyncStorage.setItem(storageKey, JSON.stringify(filteredPhotos));
    } catch (error) {
      console.error('Error saving photo metadata:', error);
      throw error;
    }
  }

  /**
   * Get all photos for a user
   */
  static async getUserPhotos(userId: string): Promise<LocalBodyPhoto[]> {
    try {
      const storageKey = `${this.STORAGE_KEY_PREFIX}${userId}`;
      const photosJson = await AsyncStorage.getItem(storageKey);
      
      if (!photosJson) {
        return [];
      }

      const photos: LocalBodyPhoto[] = JSON.parse(photosJson);
      
      // Filter out photos where the file no longer exists
      const validPhotos: LocalBodyPhoto[] = [];
      for (const photo of photos) {
        const fileInfo = await FileSystem.getInfoAsync(photo.local_uri);
        if (fileInfo.exists) {
          validPhotos.push(photo);
        } else {
          console.warn(`Photo file no longer exists: ${photo.local_uri}`);
        }
      }

      // Update storage if we removed any invalid photos
      if (validPhotos.length !== photos.length) {
        await AsyncStorage.setItem(storageKey, JSON.stringify(validPhotos));
      }

      return validPhotos;
    } catch (error) {
      console.error('Error fetching user photos:', error);
      return [];
    }
  }

  /**
   * Get progress photos grouped by date
   */
  static async getProgressPhotoSessions(userId: string): Promise<ProgressPhotoSession[]> {
    try {
      const photos = await this.getUserPhotos(userId);
      
      // Group photos by date
      const sessionMap = new Map<string, ProgressPhotoSession>();
      
      for (const photo of photos) {
        if (!sessionMap.has(photo.date)) {
          sessionMap.set(photo.date, { date: photo.date });
        }
        
        const session = sessionMap.get(photo.date)!;
        if (photo.photo_type === 'front') {
          session.front_photo = photo;
        } else if (photo.photo_type === 'back') {
          session.back_photo = photo;
        }
      }

      // Convert to array and sort by date descending
      return Array.from(sessionMap.values())
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
      console.error('Error fetching progress photo sessions:', error);
      return [];
    }
  }

  /**
   * Get photos for a specific date
   */
  static async getPhotosForDate(userId: string, date: string): Promise<{
    front_photo?: LocalBodyPhoto;
    back_photo?: LocalBodyPhoto;
  }> {
    try {
      const photos = await this.getUserPhotos(userId);
      
      const frontPhoto = photos.find(p => p.date === date && p.photo_type === 'front');
      const backPhoto = photos.find(p => p.date === date && p.photo_type === 'back');

      return { front_photo: frontPhoto, back_photo: backPhoto };
    } catch (error) {
      console.error('Error fetching photos for date:', error);
      return {};
    }
  }

  /**
   * Delete a photo from local storage
   */
  static async deletePhoto(userId: string, photoId: string): Promise<boolean> {
    try {
      const photos = await this.getUserPhotos(userId);
      const photoToDelete = photos.find(p => p.id === photoId);
      
      if (!photoToDelete) {
        console.warn('Photo not found for deletion:', photoId);
        return false;
      }

      // Delete the physical file
      try {
        await FileSystem.deleteAsync(photoToDelete.local_uri);
        console.log('🗑️ Deleted photo file:', photoToDelete.local_uri);
      } catch (fileError) {
        console.warn('Failed to delete photo file (may not exist):', fileError);
      }

      // Remove from metadata
      const remainingPhotos = photos.filter(p => p.id !== photoId);
      const storageKey = `${this.STORAGE_KEY_PREFIX}${userId}`;
      await AsyncStorage.setItem(storageKey, JSON.stringify(remainingPhotos));

      console.log('✅ Photo deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting photo:', error);
      return false;
    }
  }

  /**
   * Delete all photos for a specific date
   */
  static async deletePhotosForDate(userId: string, date: string): Promise<boolean> {
    try {
      const photos = await this.getUserPhotos(userId);
      const photosToDelete = photos.filter(p => p.date === date);
      
      // Delete physical files
      for (const photo of photosToDelete) {
        try {
          await FileSystem.deleteAsync(photo.local_uri);
          console.log('🗑️ Deleted photo file:', photo.local_uri);
        } catch (fileError) {
          console.warn('Failed to delete photo file:', fileError);
        }
      }

      // Update metadata
      const remainingPhotos = photos.filter(p => p.date !== date);
      const storageKey = `${this.STORAGE_KEY_PREFIX}${userId}`;
      await AsyncStorage.setItem(storageKey, JSON.stringify(remainingPhotos));

      console.log('✅ All photos for date deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting photos for date:', error);
      return false;
    }
  }

  /**
   * Delete all photos for a user (for account deletion)
   */
  static async deleteAllUserPhotos(userId: string): Promise<boolean> {
    try {
      const photos = await this.getUserPhotos(userId);
      
      // Delete all physical files
      for (const photo of photos) {
        try {
          await FileSystem.deleteAsync(photo.local_uri);
          console.log('🗑️ Deleted photo file:', photo.local_uri);
        } catch (fileError) {
          console.warn('Failed to delete photo file:', fileError);
        }
      }

      // Clear metadata
      const storageKey = `${this.STORAGE_KEY_PREFIX}${userId}`;
      await AsyncStorage.removeItem(storageKey);

      console.log('✅ All user photos deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting all user photos:', error);
      return false;
    }
  }

  /**
   * Get storage usage information
   */
  static async getStorageInfo(userId: string): Promise<{
    photoCount: number;
    totalSizeBytes: number;
    totalSizeMB: number;
  }> {
    try {
      const photos = await this.getUserPhotos(userId);
      let totalSize = 0;

      for (const photo of photos) {
        try {
          const fileInfo = await FileSystem.getInfoAsync(photo.local_uri);
          if (fileInfo.exists && 'size' in fileInfo) {
            totalSize += fileInfo.size || 0;
          }
        } catch (error) {
          console.warn('Could not get size for photo:', photo.local_uri);
        }
      }

      return {
        photoCount: photos.length,
        totalSizeBytes: totalSize,
        totalSizeMB: Math.round(totalSize / (1024 * 1024) * 100) / 100,
      };
    } catch (error) {
      console.error('Error getting storage info:', error);
      return { photoCount: 0, totalSizeBytes: 0, totalSizeMB: 0 };
    }
  }
}

