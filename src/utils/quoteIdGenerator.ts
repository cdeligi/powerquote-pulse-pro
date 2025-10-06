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

  const structuredMatch = trimmed.match(/^(?<user>[^-]+)-(?<prefix>[A-Za-z0-9]+)-(?<counter>\d+)(?<draft>-Draft)?$/);

  if (structuredMatch?.groups?.prefix && structuredMatch.groups.counter) {
    const { prefix, counter, draft } = structuredMatch.groups;
    return `${prefix}-${counter}${draft ?? ""}`;
  }

  return trimmed;
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
export const generateSubmittedQuoteId = async (userEmail: string, userId: string): Promise<string> => {
  try {
    // Extract email prefix (part before @)
    const emailPrefix = userEmail.split('@')[0];
    
    // Get quote prefix from admin settings
    const { data: settingData, error: settingError } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'quote_id_prefix')
      .single();
    
    if (settingError) {
      console.warn('Could not load quote prefix setting, using default:', settingError);
    }
    
    const quotePrefix = settingData?.value || 'QLT';
    
    // Get user's current counter from user_quote_counters table
    const { data: userData, error: userError } = await supabase
      .from('user_quote_counters')
      .select('current_counter')
      .eq('user_id', userId)
      .single();
    
    let sequence = 1;
    
    if (userError) {
      // Create new counter record for user
      const { error: insertError } = await supabase
        .from('user_quote_counters')
        .insert({
          user_id: userId,
          current_counter: 1,
          last_finalized_counter: 1
        });
        
      if (insertError) {
        console.error('Error creating user counter:', insertError);
        // Fall back to timestamp-based sequence
        sequence = Math.floor(Date.now() / 1000) % 10000;
      }
    } else {
      sequence = (userData.current_counter || 0) + 1;
      
      // Update the counter
      const { error: updateError } = await supabase
        .from('user_quote_counters')
        .update({ 
          current_counter: sequence,
          last_finalized_counter: sequence,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);
        
      if (updateError) {
        console.error('Error updating user counter:', updateError);
      }
    }
    
    return normalizeQuoteId(`${emailPrefix}-${quotePrefix}-${sequence}`);
  } catch (error) {
    console.error('Error generating submitted quote ID:', error);
    // Fallback to simple format
    const emailPrefix = userEmail.split('@')[0];
    const timestamp = Math.floor(Date.now() / 1000) % 10000;
    return normalizeQuoteId(`${emailPrefix}-QLT-${timestamp}`);
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