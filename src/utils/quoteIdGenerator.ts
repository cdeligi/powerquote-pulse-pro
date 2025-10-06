import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from "@/integrations/supabase/client";
import type { Database } from '@/integrations/supabase/types';

export function normalizeQuoteId(rawId: string | null | undefined): string {
  if (!rawId) {
    return "";
  }

  const trimmed = rawId.trim();

  if (!trimmed) {
    return "";
  }

  const sanitized = trimmed.replace(/\s*-\s*/g, '-');

  const structuredMatch = sanitized.match(
    /^(?<user>[^-]+)-(?<prefix>[A-Za-z0-9]+)-(?<counter>\d+)(?<draft>-Draft)?$/
  );

  if (structuredMatch?.groups?.prefix && structuredMatch.groups.counter) {
    const { user, prefix, counter, draft } = structuredMatch.groups;
    const normalizedUser = user.trim();
    const normalizedPrefix = prefix.trim();
    const numericCounter = Number.parseInt(counter, 10);
    const safeCounter = Number.isFinite(numericCounter)
      ? String(numericCounter)
      : counter.trim();

    if (normalizedUser) {
      return `${normalizedUser}-${normalizedPrefix}-${safeCounter}${draft ?? ""}`;
    }

    return `${normalizedPrefix}-${safeCounter}${draft ?? ""}`;
  }

  return sanitized;
}

export async function persistNormalizedQuoteId(
  originalId: string | null | undefined,
  normalizedId: string | null | undefined,
  client: SupabaseClient<Database> = supabase
): Promise<void> {
  const oldId = typeof originalId === 'string' ? originalId.trim() : '';
  const newId = typeof normalizedId === 'string' ? normalizedId.trim() : '';

  if (!oldId || !newId || oldId === newId) {
    return;
  }

  const { error: quoteUpdateError } = await client
    .from('quotes')
    .update({ id: newId })
    .eq('id', oldId);

  if (quoteUpdateError) {
    throw quoteUpdateError;
  }

  const referenceUpdates = [
    client.from('bom_items').update({ quote_id: newId }).eq('quote_id', oldId),
    client.from('quote_shares').update({ quote_id: newId }).eq('quote_id', oldId),
    client.from('admin_notifications').update({ quote_id: newId }).eq('quote_id', oldId)
  ];

  for (const updatePromise of referenceUpdates) {
    const { error } = await updatePromise;

    if (error) {
      throw error;
    }
  }
}

/**
 * Generate a formatted quote ID for submitted quotes only
 * Format: {email_prefix}-{quote_prefix}-{sequence}
 * Example: cdeligi-QLT-1
 */
export const generateSubmittedQuoteId = async (
  userEmail: string,
  userId: string
): Promise<string> => {
  try {
    // Extract email prefix (part before @)
    const emailPrefix = userEmail.split('@')[0] ?? '';
    const normalizedEmailPrefix = emailPrefix
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]/gi, '');
    const safeEmailPrefix = normalizedEmailPrefix || userId?.slice(0, 8) || 'user';

    // Get quote prefix from admin settings
    const { data: settingData, error: settingError } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'quote_id_prefix')
      .single();

    if (settingError) {
      console.warn('Could not load quote prefix setting, using default:', settingError);
    }

    const rawQuotePrefix = typeof settingData?.value === 'string' ? settingData.value : 'QLT';
    const normalizedQuotePrefix = (rawQuotePrefix.trim() || 'QLT').toUpperCase();

    const quotePrefixPattern = normalizedQuotePrefix.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const userPattern = safeEmailPrefix.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

    let sequence = 1;

    try {
      const { data: existingQuotes, error: existingError } = await supabase
        .from('quotes')
        .select('id, created_at')
        .ilike('id', `${safeEmailPrefix}-${normalizedQuotePrefix}-%`)
        .order('created_at', { ascending: false })
        .limit(200);

      if (existingError) {
        console.warn('Could not inspect existing quotes for sequence calculation:', existingError);
      }

      if (existingQuotes && existingQuotes.length > 0) {
        const sequenceRegex = new RegExp(
          `^${userPattern}-${quotePrefixPattern}-(\\d+)(?:-Draft)?$`,
          'i'
        );

        const highest = existingQuotes.reduce((max, quote) => {
          const match = typeof quote.id === 'string' ? quote.id.match(sequenceRegex) : null;

          if (!match?.[1]) {
            return max;
          }

          const value = Number.parseInt(match[1], 10);
          return Number.isFinite(value) && value > max ? value : max;
        }, 0);

        if (highest >= 1) {
          sequence = highest + 1;
        }
      }
    } catch (lookupError) {
      console.error('Error calculating next quote sequence from existing quotes:', lookupError);
    }

    try {
      await supabase
        .from('user_quote_counters')
        .upsert(
          {
            user_id: userId,
            current_counter: sequence,
            last_finalized_counter: sequence,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );
    } catch (counterError) {
      const message = counterError instanceof Error ? counterError.message : String(counterError);

      if (!message.includes('PGRST116')) {
        console.warn('Unable to update user quote counter:', counterError);
      }
    }

    const compositeId = `${safeEmailPrefix}-${normalizedQuotePrefix}-${sequence}`;
    return normalizeQuoteId(compositeId);
  } catch (error) {
    console.error('Error generating submitted quote ID:', error);
    // Fallback to simple format
    const emailPrefix = userEmail.split('@')[0] ?? 'quote';
    const sanitizedEmailPrefix = emailPrefix
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]/gi, '') || 'quote';
    const timestamp = Math.floor(Date.now() / 1000) % 10000;
    return normalizeQuoteId(`${sanitizedEmailPrefix}-QLT-${timestamp}`);
  }
};

/**
 * Create a table for user quote counters if it doesn't exist
 * This function should be called during app initialization
 */
export const ensureUserQuoteCountersTable = async (): Promise<void> => {
  try {
    // Check if the table exists by trying to select from it
    const { error } = await supabase
      .from('user_quote_counters')
      .select('*')
      .limit(1);
    
    if (error && error.code === 'PGRST116') {
      // Table doesn't exist, we would need a migration to create it
      console.log('user_quote_counters table does not exist, will need database migration');
    }
  } catch (error) {
    console.error('Error checking user_quote_counters table:', error);
  }
};