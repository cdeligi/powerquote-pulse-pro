import { supabase } from '@/integrations/supabase/client';

export const useSafeSupabase = () => {
  const safeRequest = async <T>(
    request: () => Promise<{ data: T | null; error: any }>,
    fallbackData: T,
    isDevelopment = import.meta.env.MODE === 'development'
  ) => {
    try {
      if (isDevelopment) {
        console.log('[useSafeSupabase] Skipping request in development mode');
        return fallbackData;
      }

      const { data, error } = await request();

      if (error) {
        console.error('[useSafeSupabase] Error:', error);
        if (error.message.includes('404')) {
          console.warn('[useSafeSupabase] 404 error caught - returning fallback data');
          return fallbackData;
        }
        throw error;
      }

      return data || fallbackData;
    } catch (error) {
      console.error('[useSafeSupabase] Unexpected error:', error);
      return fallbackData;
    }
  };

  return {
    safeRequest
  };
};
