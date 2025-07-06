
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

console.log('Supabase client initialization:', {
  url: supabaseUrl ? 'configured' : 'missing',
  key: supabaseAnonKey ? 'configured' : 'missing',
  timestamp: new Date().toISOString()
});

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables:', {
    VITE_SUPABASE_URL: !!supabaseUrl,
    VITE_SUPABASE_ANON_KEY: !!supabaseAnonKey
  });
  
  // Provide helpful error message for development
  const errorMessage = `
    Missing Supabase configuration. Please check your .env file:
    - VITE_SUPABASE_URL=${supabaseUrl || 'missing'}
    - VITE_SUPABASE_ANON_KEY=${supabaseAnonKey ? 'configured' : 'missing'}
  `;
  console.error(errorMessage);
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder-key', 
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    },
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        'X-Client-Info': 'powerquotepro-web'
      }
    }
  }
);

// Add connection health check
supabase.from('profiles').select('count', { count: 'exact', head: true })
  .then(({ error }) => {
    if (error) {
      console.error('❌ Supabase connection test failed:', error.message);
    } else {
      console.log('✅ Supabase connection established successfully');
    }
  })
  .catch((err) => {
    console.error('❌ Supabase connection error:', err);
  });
