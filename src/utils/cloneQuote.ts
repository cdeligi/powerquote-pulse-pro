import { supabase } from '@/integrations/supabase/client';

const SCHEMA_CACHE_ERROR_FRAGMENT = 'schema cache';

export async function cloneQuoteWithFallback(
  sourceQuoteId: string,
  newUserId: string
): Promise<string> {
  const firstAttempt = await supabase.rpc('clone_quote', {
    p_source_quote_id: sourceQuoteId,
    p_new_user_id: newUserId,
  });

  if (!firstAttempt.error) {
    if (typeof firstAttempt.data === 'string' && firstAttempt.data.length > 0) {
      return firstAttempt.data;
    }

    throw new Error('Clone operation did not return a new quote ID.');
  }

  const message = firstAttempt.error.message || '';
  const shouldRetryWithLegacyParams = message.includes(SCHEMA_CACHE_ERROR_FRAGMENT);

  if (!shouldRetryWithLegacyParams) {
    throw new Error(message || 'Failed to clone quote');
  }

  const fallbackAttempt = await supabase.rpc('clone_quote', {
    source_quote_id: sourceQuoteId,
    new_user_id: newUserId,
  });

  if (fallbackAttempt.error) {
    throw new Error(fallbackAttempt.error.message || 'Failed to clone quote');
  }

  if (typeof fallbackAttempt.data === 'string' && fallbackAttempt.data.length > 0) {
    return fallbackAttempt.data;
  }

  throw new Error('Clone operation did not return a new quote ID.');
}
