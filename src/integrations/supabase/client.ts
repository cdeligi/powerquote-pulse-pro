import { createClient } from '@supabase/supabase-js'

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string
const supabaseAdminKey = import.meta.env.VITE_SUPABASE_ADMIN_KEY as string

// Log raw environment variables
console.log('Raw environment variables:', {
  url: supabaseUrl,
  anonKey: supabaseAnonKey,
  adminKey: supabaseAdminKey
});

// Log environment variable status with type information
console.log('Environment variable types:', {
  urlType: typeof supabaseUrl,
  anonKeyType: typeof supabaseAnonKey,
  adminKeyType: typeof supabaseAdminKey
});

// Validate required environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing required Supabase environment variables:', {
    VITE_SUPABASE_URL: !!supabaseUrl,
    VITE_SUPABASE_ANON_KEY: !!supabaseAnonKey,
    VITE_SUPABASE_ADMIN_KEY: !!supabaseAdminKey
  });
  throw new Error('Missing required Supabase environment variables');
}

// Create base client with anon key (for auth operations)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});

// Create admin client if admin key is available (for admin operations)
export const supabaseAdmin = supabaseAdminKey 
  ? createClient(supabaseUrl, supabaseAdminKey, {
      auth: {
        storage: localStorage,
        persistSession: true,
        autoRefreshToken: true,
      }
    })
  : null;

// Helper function to check if admin operations are available
export const isAdminAvailable = () => !!supabaseAdmin;

// Log client initialization status
console.log('Supabase client initialization:', {
  url: supabaseUrl ? 'configured' : 'missing',
  anonKey: supabaseAnonKey ? 'configured' : 'missing',
  adminKey: supabaseAdminKey ? 'configured' : 'missing',
  adminClientAvailable: !!supabaseAdmin
});
