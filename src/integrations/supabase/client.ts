import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// Log environment variable status (only log what we actually use)
console.log('Supabase environment variables:', {
  url: supabaseUrl ? 'configured' : 'missing',
  anonKey: supabaseAnonKey ? 'configured' : 'missing'
});

// Validate required environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  const error = new Error('Missing required Supabase environment variables');
  console.error(error.message, {
    VITE_SUPABASE_URL: !!supabaseUrl,
    VITE_SUPABASE_ANON_KEY: !!supabaseAnonKey
  });
  throw error;
}

// Singleton instance
let supabaseInstance: SupabaseClient | null = null;

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
 * @deprecated Admin operations should be done via edge functions.
 * This function now returns the regular client for backward compatibility.
 * Admin-privileged operations should call the admin-users edge function instead.
 */
export function getSupabaseAdminClient() {
  console.warn('getSupabaseAdminClient is deprecated. Use edge functions for admin operations.');
  return getSupabaseClient();
}

// Export the default client for backward compatibility
export const supabase = getSupabaseClient();

/**
 * @deprecated Use edge functions for admin operations
 */
export const supabaseAdmin = supabase;

/**
 * @deprecated Admin client is no longer available client-side for security reasons.
 * Use edge functions for admin operations.
 */
export const isAdminAvailable = () => false;
