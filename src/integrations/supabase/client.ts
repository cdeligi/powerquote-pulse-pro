import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string
const supabaseAdminKey = import.meta.env.VITE_SUPABASE_ADMIN_KEY as string

// Log environment variable status
console.log('Supabase environment variables:', {
  url: supabaseUrl ? 'configured' : 'missing',
  anonKey: supabaseAnonKey ? 'configured' : 'missing',
  adminKey: supabaseAdminKey ? 'configured' : 'missing'
});

// Validate required environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  const error = new Error('Missing required Supabase environment variables');
  console.error(error.message, {
    VITE_SUPABASE_URL: !!supabaseUrl,
    VITE_SUPABASE_ANON_KEY: !!supabaseAnonKey,
    VITE_SUPABASE_ADMIN_KEY: !!supabaseAdminKey
  });
  throw error;
}

// Singleton instances
let supabaseInstance: SupabaseClient | null = null;
let supabaseAdminInstance: SupabaseClient | null = null;

/**
 * Get the Supabase client instance (singleton pattern)
 */
export function getSupabaseClient() {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: localStorage,
        persistSession: true,
        autoRefreshToken: true,
      }
    });
  }
  return supabaseInstance;
}

/**
 * Get the Supabase admin client instance (singleton pattern)
 */
export function getSupabaseAdminClient() {
  if (!supabaseAdminKey) {
    console.warn('Supabase admin key not configured');
    return null;
  }
  
  if (!supabaseAdminInstance) {
    supabaseAdminInstance = createClient(supabaseUrl, supabaseAdminKey, {
      auth: {
        storage: localStorage,
        persistSession: true,
        autoRefreshToken: true,
      }
    });
  }
  
  return supabaseAdminInstance;
}

// Export the default client for backward compatibility
export const supabase = getSupabaseClient();
export const supabaseAdmin = getSupabaseAdminClient();

export const isAdminAvailable = () => !!supabaseAdmin;
