import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { PhotoStorageService, PhotoUploadResult } from '../services/storage/photoStorage';
import { BodyPhoto } from '../types/analysis';

export interface PhotoUploadState {
  frontPhoto: BodyPhoto | null;
  backPhoto: BodyPhoto | null;
  isLoading: boolean;
  error: string | null;
  uploadProgress: {
    front: boolean;
    back: boolean;
  };
  photosByDate: { [date: string]: BodyPhoto[] };
}

export const usePhotoUpload = () => {
  const { user } = useAuth();
  const [state, setState] = useState<PhotoUploadState>({
    frontPhoto: null,
    backPhoto: null,
    isLoading: false,
    error: null,
    uploadProgress: {
      front: false,
      back: false,
    },
    photosByDate: {},
  });

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      const hasPermissions = await PhotoStorageService.requestPermissions();
      if (!hasPermissions) {
        setState(prev => ({
          ...prev,
          error: 'Camera and photo library permissions are required to upload photos',
        }));
      }
      return hasPermissions;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to request permissions',
      }));
      return false;
    }
  }, []);

  const pickImage = useCallback(async (source: 'camera' | 'library'): Promise<string | null> => {
    try {
      console.log('📸 usePhotoUpload: Picking image from', source);
      const imageUri = await PhotoStorageService.pickImage(source);
      console.log('📸 usePhotoUpload: Image URI received:', imageUri ? 'Yes' : 'No');
      return imageUri;
    } catch (error) {
      console.error('❌ usePhotoUpload: Error picking image:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to pick image',
      }));
      return null;
    }
  }, []);

  const uploadPhoto = useCallback(async (
    photoType: 'front' | 'back',
    imageUri: string
  ): Promise<PhotoUploadResult> => {
    console.log('🔐 usePhotoUpload: Checking authentication...');
    console.log('🔐 usePhotoUpload: User:', user ? { id: user.id, email: user.email } : 'null');
    
    if (!user?.id) {
      console.log('❌ usePhotoUpload: User not authenticated');
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    try {
      console.log('🟢 CURRENT USER ID =', user?.id);
      console.log('📸 Starting photo upload in hook for:', photoType);
      
      setState(prev => ({
        ...prev,
        isLoading: true,
        error: null,
        uploadProgress: {
          ...prev.uploadProgress,
          [photoType]: true,
        },
      }));

      const result = await PhotoStorageService.uploadPhoto(user.id, photoType, imageUri);
      console.log('📸 Upload result:', result);

      if (result.success && result.photo) {
        console.log('✅ Photo uploaded successfully:', result.photo);
        setState(prev => ({
          ...prev,
          [photoType === 'front' ? 'frontPhoto' : 'backPhoto']: result.photo,
          uploadProgress: {
            ...prev.uploadProgress,
            [photoType]: false,
          },
        }));
      } else {
        console.error('❌ Upload failed:', result.error);
        setState(prev => ({
          ...prev,
          error: result.error || 'Upload failed',
          uploadProgress: {
            ...prev.uploadProgress,
            [photoType]: false,
          },
        }));
      }

      return result;
    } catch (error) {
      console.error('❌ Upload error in hook:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Upload failed',
        uploadProgress: {
          ...prev.uploadProgress,
          [photoType]: false,
        },
      }));
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    } finally {
      setState(prev => ({
        ...prev,
        isLoading: false,
      }));
    }
  }, [user?.id]);

  const loadExistingPhotos = useCallback(async () => {
    if (!user?.id) return;

    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      const { frontPhoto, backPhoto } = await PhotoStorageService.getLatestPhotoSession(user.id);
      
      setState(prev => ({
        ...prev,
        frontPhoto: frontPhoto || null,
        backPhoto: backPhoto || null,
        isLoading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to load existing photos',
        isLoading: false,
      }));
    }
  }, [user?.id]);

  const loadAllUserPhotos = useCallback(async () => {
    if (!user?.id) return;

    try {
      setState(prev => ({ ...prev, isLoading: true }));
      const allPhotos = await PhotoStorageService.getUserPhotos(user.id);
      
      const photosByDate = allPhotos.reduce((acc, photo) => {
        const date = photo.uploaded_at.split('T')[0];
        if (!acc[date]) {
          acc[date] = [];
        }
        acc[date].push(photo);
        return acc;
      }, {} as { [date: string]: BodyPhoto[] });

      setState(prev => ({
        ...prev,
        photosByDate,
        isLoading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to load photos',
        isLoading: false,
      }));
    }
  }, [user?.id]);


  const deletePhoto = useCallback(async (photoId: string, photoType: 'front' | 'back') => {
    try {
      const success = await PhotoStorageService.deletePhoto(photoId);
      
      if (success) {
        setState(prev => ({
          ...prev,
          [photoType === 'front' ? 'frontPhoto' : 'backPhoto']: null,
        }));
      } else {
        setState(prev => ({
          ...prev,
          error: 'Failed to delete photo',
        }));
      }
      
      return success;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to delete photo',
      }));
      return false;
    }
  }, []);

  const resetState = useCallback(() => {
    setState({
      frontPhoto: null,
      backPhoto: null,
      isLoading: false,
      error: null,
      uploadProgress: {
        front: false,
        back: false,
      },
      photosByDate: {},
    });
  }, []);

  return {
    ...state,
    requestPermissions,
    pickImage,
    uploadPhoto,
    loadExistingPhotos,
    loadAllUserPhotos,
    deletePhoto,
    clearError,
    resetState,
    hasBothPhotos: !!(state.frontPhoto && state.backPhoto),
  };
}; 