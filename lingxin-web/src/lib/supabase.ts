import { createClient } from '@supabase/supabase-js';

// Get the Supabase URL and anon key from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://wwpbkwsedszrtqedkcvi.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3cGJrd3NlZHN6cnRxZWRrY3ZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNTA0MjAsImV4cCI6MjA3MjYyNjQyMH0.FA9ZRiq8eJDAPUsSfbwM6ZgiZHWj-jCkoWb23DvDNas';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase configuration. Please check your environment variables.');
}

// Create Supabase client instance
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Helper function to get current user
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.error('Error getting user:', error);
    return null;
  }
  return user;
}

// Helper function to sign out
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Error signing out:', error);
    throw error;
  }
}

// Types
export interface UserProfile {
  id: string;
  user_id: string;
  full_name?: string;
  avatar_url?: string;
  timezone?: string;
  language?: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  user_id: string;
  conversation_id?: string;
  role: 'user' | 'assistant';
  content: string;
  content_type?: string;
  tokens_used?: number;
  model_used?: string;
  persona_id?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface Commitment {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  intent_type: string;
  what_action: string;
  when_time?: string;
  when_rrule?: string;
  where_location?: string;
  notes?: string;
  status: 'draft' | 'scheduled' | 'completed' | 'cancelled';
  version: number;
  dnd_respect: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface StartPhrase {
  id: string;
  phrase: string;
  context_pattern?: string;
  trigger_probability: number;
  action_chips: any[];
  category?: string;
  is_active: boolean;
  usage_count: number;
  success_rate: number;
  created_at: string;
  updated_at: string;
}