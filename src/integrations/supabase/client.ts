import { createClient } from '@supabase/supabase-js'

<<<<<<< HEAD
// Log the actual values of the environment variables
console.log('Supabase environment variables:', {
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY
});

=======
// Get environment variables
>>>>>>> abc0e592a4f6533549aa5a0fd7bef19dc6c05a98
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string
const supabaseAdminKey = import.meta.env.VITE_SUPABASE_ADMIN_KEY as string

<<<<<<< HEAD
// Add detailed initialization check
=======
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
>>>>>>> abc0e592a4f6533549aa5a0fd7bef19dc6c05a98
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing required Supabase environment variables:', {
    VITE_SUPABASE_URL: !!supabaseUrl,
    VITE_SUPABASE_ANON_KEY: !!supabaseAnonKey,
<<<<<<< HEAD
    urlValue: supabaseUrl,
    keyValue: supabaseAnonKey
=======
    VITE_SUPABASE_ADMIN_KEY: !!supabaseAdminKey
>>>>>>> abc0e592a4f6533549aa5a0fd7bef19dc6c05a98
  });
  throw new Error('Missing required Supabase environment variables');
}

<<<<<<< HEAD
// Retry logic configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Create a wrapped client that handles errors gracefully
=======
// Create base client with anon key (for auth operations)
>>>>>>> abc0e592a4f6533549aa5a0fd7bef19dc6c05a98
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'X-Client-Info': 'powerquotepro-web',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': 'true'
    },
    fetch: async (...args) => {
      const request = async (retryCount = 0) => {
        try {
          if (import.meta.env.MODE === 'development') {
            // Skip RPC calls in development mode
            if (typeof args[0] === 'string' && args[0].includes('/rpc/')) {
              console.log('[supabase] Skipping RPC call in development mode:', args[0]);
              return new Response(JSON.stringify({ data: null, error: null }), {
                status: 200,
                headers: { 
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': '*',
                  'Access-Control-Allow-Credentials': 'true'
                }
              });
            }
            
            // Skip security event logging in development mode
            if (typeof args[0] === 'string' && args[0].includes('/rest/v1/security_events')) {
              console.log('[supabase] Skipping security event logging in development mode:', args[0]);
              return new Response(JSON.stringify({ data: null, error: null }), {
                status: 200,
                headers: { 
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': '*',
                  'Access-Control-Allow-Credentials': 'true'
                }
              });
            }
            
            // Allow auth-related endpoints
            if (typeof args[0] === 'string' && 
                (args[0].includes('/auth/v1/token') || 
                 args[0].includes('/auth/v1/user'))) {
              console.log('[supabase] Allowing auth endpoint in development mode:', args[0]);
              return fetch(...args);
            }
            
            // Skip other API calls in development mode
            console.log('[supabase] Skipping API call in development mode:', args[0]);
            return new Response(JSON.stringify({ data: null, error: null }), {
              status: 200,
              headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': 'true'
              }
            });
          }
          
          const response = await fetch(...args);
          const data = await response.json();
          
          if (!response.ok) {
            console.error('[supabase] API error:', {
              status: response.status,
              statusText: response.statusText,
              error: data.error,
              retryCount,
              url: args[0]
            });

            // For development mode, skip errors for RPC calls
            if (import.meta.env.MODE === 'development' && 
                typeof args[0] === 'string' && 
                (args[0].includes('/rpc/') || args[0].includes('/rest/v1/security_events'))) {
              console.warn('[supabase] Skipping RPC error in development:', args[0]);
              return new Response(JSON.stringify({ data: null, error: null }), {
                status: 200,
                headers: { 
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': '*',
                  'Access-Control-Allow-Credentials': 'true'
                }
              });
            }

            // For other 404 errors, skip in development
            if (import.meta.env.MODE === 'development' && response.status === 404) {
              console.warn('[supabase] Skipping 404 error in development:', args[0]);
              return new Response(JSON.stringify({ data: null, error: null }), {
                status: 200,
                headers: { 
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': '*',
                  'Access-Control-Allow-Credentials': 'true'
                }
              });
            }

            // Handle other errors with retries
            if (retryCount < MAX_RETRIES && 
                (response.status === 0 || 
                 response.status === 503 || 
                 response.status === 504)) {
              console.log('[supabase] Retrying request...', { retryCount, totalRetries: MAX_RETRIES });
              await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
              return request(retryCount + 1);
            }
            throw new Error(`API error: ${data.error?.message || 'Unknown error'} (URL: ${args[0]})`);
          }
          return response;
        } catch (error) {
          console.error('[supabase] Request error:', {
            error,
            retryCount,
            url: args[0]
          });
          
          // Handle network errors with retries
          if (retryCount < MAX_RETRIES && 
              (error instanceof TypeError || 
               error.message.includes('network error'))) {
            console.log('[supabase] Retrying request...', { retryCount, totalRetries: MAX_RETRIES });
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
            return request(retryCount + 1);
          }
          throw error;
        }
      };
      return request();
    }
  }
});

<<<<<<< HEAD
// Test endpoint to verify Supabase connection
export const testSupabaseConnection = async () => {
  try {
    console.log('[Supabase] Testing connection...');
    
    // Test auth
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error('[Supabase] Auth test failed:', sessionError);
      return { success: false, error: sessionError };
    }
    console.log('[Supabase] Auth test successful');

    // Test database access
    const { data: testResult, error: testError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    if (testError) {
      console.error('[Supabase] Database test failed:', testError);
      return { success: false, error: testError };
    }

    console.log('[Supabase] Database test successful');
    return { success: true, data: testResult };
  } catch (error) {
    console.error('[Supabase] Connection test failed:', error);
    return { success: false, error };
  }
};

// Run connection test on initialization
if (import.meta.env.MODE !== 'development') {
  testSupabaseConnection().then(result => {
    if (!result.success) {
      console.error('[Supabase] Failed to initialize:', result.error);
    }
  });
}

export default supabase;
=======
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
>>>>>>> abc0e592a4f6533549aa5a0fd7bef19dc6c05a98
