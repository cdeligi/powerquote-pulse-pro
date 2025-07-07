import { createClient } from '@supabase/supabase-js'

// Direct configuration
const supabaseUrl = 'https://cwhmxpitwblqxgrvaigg.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3aG14cGl0d2JscXhncnZhaWdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3MTc3MTIsImV4cCI6MjA2NjI5MzcxMn0.NaAtGg1Fpx1obdHK5rBGM5IzSWJea7lniuimr5ZyFGU'

// Flag indicating whether Supabase configuration is present
export const supabaseConfigValid = Boolean(supabaseUrl && supabaseAnonKey)

console.log('=== Supabase Client Initialization ===');
console.log('Using direct configuration:', {
  url: supabaseUrl,
  key: supabaseAnonKey,
  timestamp: new Date().toISOString()
});

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(`Supabase configuration missing:
    URL: ${supabaseUrl || 'undefined'}
    Key: ${supabaseAnonKey || 'undefined'}
    
    Please check your configuration and ensure it contains:
    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_ANON_KEY=your_supabase_key`);
}

// Create client with configuration
const client = createClient(
  supabaseUrl,
  supabaseAnonKey,
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

// Test the connection before exposing the client
async function testConnection(): Promise<boolean> {
  try {
    console.log('Attempting Supabase connection test...');
    
    // Try a simple ping to test the connection
    const { data, error } = await client
      .from('profiles')
      .select('id')
      .limit(1);

    if (error) {
      console.error('Connection test failed:', {
        error: error.message,
        details: error,
        data: data
      });
      return false;
    }

    console.log('Connection test successful!', { 
      hasData: !!data?.length,
      dataSample: data?.[0]
    });
    return true;
  } catch (error) {
    console.error('Connection test failed with error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    });
    return false;
  }
}

// Export the client with a ready state
export const supabase = {
  client: client,
  isReady: false,
  init: async () => {
    const isConnected = await testConnection();
    if (isConnected) {
      console.log('Supabase client initialized successfully');
      return client;
    } else {
      throw new Error('Failed to initialize Supabase client');
    }
  },
  get: () => client
};
