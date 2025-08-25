import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Database } from '../../types/database';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 Supabase Client Initialization:');
console.log('- URL:', supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'MISSING');
console.log('- Key:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'MISSING');

if (!supabaseUrl || !supabaseAnonKey) {
	console.error('❌ CRITICAL: Supabase URL or Anon Key is missing!');
	console.error('- EXPO_PUBLIC_SUPABASE_URL:', supabaseUrl || 'undefined');
	console.error('- EXPO_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey || 'undefined');
	console.error('This will cause authentication bypass and mock data fallback!');
}

export const supabase = (supabaseUrl && supabaseAnonKey)
	? createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
      db: {
        schema: 'public'
      },
      global: {
        headers: {
          'x-my-custom-header': 'my-app-name',
        },
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
		})
	: null as unknown as ReturnType<typeof createClient<Database>>;

export default supabase; 