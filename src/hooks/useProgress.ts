import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { ProgressService } from '../services/progressService';
import { Database } from '../types/database';
import { supabase } from '../services/supabase/client';

type ProgressEntry = Database['public']['Tables']['progress_entries']['Row'];
type BodyPhoto = Database['public']['Tables']['body_photos']['Row'];

type ProgressEntryWithPhotos = ProgressEntry & {
  front_photo: BodyPhoto | null;
  back_photo: BodyPhoto | null;
  front_photo_url?: string;
  back_photo_url?: string;
};

export const useProgress = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<ProgressEntryWithPhotos[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEntries = useCallback(async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const data = await ProgressService.getProgressEntries(user.id);
      
      const entriesWithUrls = (data as ProgressEntryWithPhotos[]).map(entry => {
        const front_photo_url = (entry.front_photo && supabase)
          ? supabase.storage.from('body-photos').getPublicUrl(entry.front_photo.storage_path).data.publicUrl
          : undefined;
        const back_photo_url = (entry.back_photo && supabase)
          ? supabase.storage.from('body-photos').getPublicUrl(entry.back_photo.storage_path).data.publicUrl
          : undefined;
        return { ...entry, front_photo_url, back_photo_url };
      });

      setEntries(entriesWithUrls);
    } catch (error) {
      console.error('Error fetching progress entries:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  return { entries, isLoading, refresh: fetchEntries };
}; 