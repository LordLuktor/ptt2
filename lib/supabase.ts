import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type UserRole = 'user' | 'supervisor' | 'dispatcher' | 'admin';

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
};

export type Talkgroup = {
  id: string;
  name: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
};

export type Channel = {
  id: string;
  name: string;
  talkgroup_id: string;
  created_at: string;
};
