import { supabase } from '@/integrations/supabase/client';

async function testSupabaseConnection() {
  try {
    console.log('=== Supabase Connection Test ===');
    console.log('Environment Variables:', {
      VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
      mode: import.meta.env.MODE
    });
    
    // Try a simple ping to test the connection
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    if (error) {
      console.error('Supabase connection test failed:', {
        error: error.message,
        details: error,
        data: data
      });
      return false;
    }

    console.log('Supabase connection test successful!', { 
      hasData: !!data?.length,
      dataSample: data?.[0]
    });
    return true;
  } catch (error) {
    console.error('Supabase connection test failed with error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    });
    return false;
  }
}

// Run the test when this module is imported
export default testSupabaseConnection();
