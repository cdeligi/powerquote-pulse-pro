import { supabase } from '@/integrations/supabase/client';

export const safeSupabaseRequest = async <T>(
  request: () => Promise<{ data: T | null; error: any }>,
  fallbackData: T,
  isDevelopment = import.meta.env.MODE === 'development'
) => {
  try {
    if (isDevelopment) {
      console.log('[safeSupabaseRequest] Skipping request in development mode');
      return fallbackData;
    }

    const { data, error } = await request();

    if (error) {
      console.error('[safeSupabaseRequest] Error:', error);
      if (error.message.includes('404')) {
        console.warn('[safeSupabaseRequest] 404 error caught - returning fallback data');
        return fallbackData;
      }
      throw error;
    }

    return data || fallbackData;
  } catch (error) {
    console.error('[safeSupabaseRequest] Unexpected error:', error);
    return fallbackData;
  }
};

// Example usage:
// const quoteFields = await safeSupabaseRequest(
//   () => supabase.from('quote_fields').select('*'),
//   [
//     { id: 'customer_name', label: 'Customer Name', required: true },
//     { id: 'project_name', label: 'Project Name', required: true },
//     { id: 'delivery_date', label: 'Delivery Date', required: true }
//   ]
// );
