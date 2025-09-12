import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Database } from '../../types/database';

const supabaseUrl = Constants?.expoConfig?.extra?.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://dummy.supabase.co';
const supabaseAnonKey = Constants?.expoConfig?.extra?.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'dummy-key';

console.log('🔍 Supabase Client Initialization:');
console.log('- URL:', supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'MISSING');
console.log('- Key:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'MISSING');

if (supabaseUrl === 'https://dummy.supabase.co' || supabaseAnonKey === 'dummy-key') {
	console.warn('⚠️  Using dummy Supabase credentials - app will work but without database connectivity');
}

if (!supabaseUrl || !supabaseAnonKey) {
	console.error('❌ CRITICAL: Supabase URL or Anon Key is missing!');
	console.error('- EXPO_PUBLIC_SUPABASE_URL:', supabaseUrl || 'undefined');
	console.error('- EXPO_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey || 'undefined');
	console.error('This will cause authentication bypass and mock data fallback!');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
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
});

export default supabase; 