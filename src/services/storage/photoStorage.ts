import { supabase } from '../supabase/client';
import { BodyPhoto } from '../../types/analysis';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';

export interface PhotoUploadResult {
  success: boolean;
  photo?: BodyPhoto;
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
   * Upload a photo to Supabase storage and save metadata to database
   */
  static async uploadPhoto(
    userId: string,
    photoType: 'front' | 'back',
    imageUri: string
  ): Promise<PhotoUploadResult> {
    try {
      console.log('Uploading photo:', { userId, photoType, imageUri });
      
      // Check if Supabase is properly configured
      if (!('storage' in supabase) || !('from' in supabase)) {
        console.error('❌ Supabase not configured properly');
        throw new Error('Supabase storage is not configured');
      }

      // Generate unique filename
      const timestamp = new Date().toISOString();
      const filename = `${userId}/${photoType}_${timestamp}.jpg`;
      const storagePath = `${this.BUCKET_NAME}/${filename}`;
      
      console.log('📝 Generated filename:', filename);

      // Convert image URI to ArrayBuffer using expo-file-system and base64-arraybuffer
      console.log('🔄 Reading image as base64...');
      const base64 = await FileSystem.readAsStringAsync(imageUri, { encoding: FileSystem.EncodingType.Base64 });
      const arrayBuffer = decode(base64);
      console.log('✅ ArrayBuffer created, byteLength:', arrayBuffer.byteLength);

      // Check if storage bucket exists
      console.log('🔍 Checking storage bucket...');
      try {
        const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
        if (bucketError) {
          console.error('❌ Error listing buckets:', bucketError);
          throw new Error(`Storage error: ${bucketError.message}`);
        }
        
        const bucketExists = buckets?.some(bucket => bucket.name === this.BUCKET_NAME);
        console.log('📦 Bucket exists:', bucketExists, 'Available buckets:', buckets?.map(b => b.name));

        if (!bucketExists) {
          throw new Error(`Storage bucket '${this.BUCKET_NAME}' does not exist. Please create it in your Supabase dashboard.`);
        }
      } catch (bucketCheckError) {
        console.warn('⚠️ Could not check bucket existence, proceeding with upload...');
      }

      // Upload to Supabase storage
      console.log('📤 Uploading to Supabase storage...');
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(filename, arrayBuffer, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
        });

      if (uploadError) {
        console.error('❌ Upload error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      console.log('✅ Upload successful:', uploadData);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(filename);
      console.log('Public URL generated:', urlData.publicUrl);

      // Check if body_photos table exists
      console.log('🗄️ Checking database table...');
      try {
        const { data: tableCheck, error: tableError } = await supabase
          .from('body_photos')
          .select('id')
          .limit(1);

        if (tableError) {
          console.error('❌ Table check error:', tableError);
          throw new Error(`Database table 'body_photos' does not exist. Please create it in your Supabase database.`);
        }
        console.log('✅ Database table exists');
      } catch (tableCheckError) {
        console.warn('⚠️ Could not check table existence, proceeding with insert...');
      }

      // Save photo metadata to database
      console.log('Debug: userId value:', userId);
      console.log('Debug: typeof userId:', typeof userId);
      console.log('Debug: Insert object:', {
        user_id: userId,
        photo_type: photoType,
        photo_url: urlData.publicUrl,
        storage_path: storagePath,
        is_analyzed: false,
        analysis_status: 'pending',
      });
      const { data: photoData, error: dbError } = await supabase
        .from('body_photos')
        .insert({
          user_id: userId,
          photo_type: photoType,
          photo_url: urlData.publicUrl,
          storage_path: filename,
          is_analyzed: false,
          analysis_status: 'pending',
        })
        .select()
        .single();

      if (dbError) {
        console.error('❌ Database error:', dbError);
        // Clean up uploaded file if database insert fails
        try {
          await supabase.storage.from(this.BUCKET_NAME).remove([filename]);
          console.log('🧹 Cleaned up uploaded file after database error');
        } catch (cleanupError) {
          console.error('❌ Failed to cleanup file:', cleanupError);
        }
        throw new Error(`Database error: ${dbError.message}`);
      }

      console.log('✅ Photo saved to database:', photoData);

      return {
        success: true,
        photo: photoData,
      };
    } catch (error) {
      console.error('Error in uploadPhoto:', error);
      let errorMessage = 'Upload failed';
      if (error instanceof Error) {
        errorMessage = error.message;
        if (errorMessage.includes('JSON Parse error')) {
          errorMessage = 'Received an invalid response from the server (likely an HTML error page instead of JSON). Please check your Supabase project status and configuration.';
        }
      }
      return {
        success: false,
        error: errorMessage,
      };
    }
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

      const base64 = await FileSystem.readAsStringAsync(imageUri, { encoding: FileSystem.EncodingType.Base64 });
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
   * Get user's photos
   */
  static async getUserPhotos(userId: string): Promise<BodyPhoto[]> {
    try {
      const { data, error } = await supabase
        .from('body_photos')
        .select('*')
        .eq('user_id', userId)
        .order('uploaded_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch photos: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching user photos:', error);
      return [];
    }
  }

  /**
   * Get the latest photo session (front and back photos)
   */
  static async getLatestPhotoSession(userId: string): Promise<{
    frontPhoto?: BodyPhoto;
    backPhoto?: BodyPhoto;
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
   * Delete a photo from storage and database
   */
  static async deletePhoto(photoId: string): Promise<boolean> {
    try {
      // Safety check: prevent accidental mass deletion
      if (!photoId) {
        throw new Error('No photoId provided for deletion');
      }
      // Get photo details first
      const { data: photo, error: fetchError } = await supabase
        .from('body_photos')
        .select('*')
        .eq('id', photoId)
        .single();

      if (fetchError || !photo) {
        throw new Error('Photo not found');
      }

      // Delete from storage
      const filename = photo.storage_path.replace(`${this.BUCKET_NAME}/`, '');
      const { error: storageError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([filename]);

      if (storageError) {
        console.warn('Failed to delete from storage:', storageError);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('body_photos')
        .delete()
        .eq('id', photoId);

      if (dbError) {
        throw new Error(`Database error: ${dbError.message}`);
      }

      return true;
    } catch (error) {
      console.error('Error deleting photo:', error);
      return false;
    }
  }
} 