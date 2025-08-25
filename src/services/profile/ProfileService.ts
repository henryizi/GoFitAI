import { supabase } from '../supabase/client';
import { Database } from '../../types/database';

export type UserProfile = Database['public']['Tables']['profiles']['Row'];
export type UserProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export const fetchUserProfile = async (
  userId: string,
): Promise<UserProfile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return (data as UserProfile) ?? null;
};

export const saveUserProfile = async (
  userId: string,
  email: string,
  updates: UserProfileUpdate,
): Promise<UserProfile> => {
  const payload = {
    ...updates,
    updated_at: new Date().toISOString(),
  } as UserProfileUpdate;

  // Attempt update
  const { error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', userId);

  if (error) throw error;

  // Fetch the updated profile (may be null if RLS blocks select)
  const refreshed = await fetchUserProfile(userId);
  return (
    refreshed ?? {
      id: userId,
      email,
      ...payload,
    }
  ) as UserProfile;
}; 