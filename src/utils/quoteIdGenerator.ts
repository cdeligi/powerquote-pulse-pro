import { supabase } from "@/integrations/supabase/client";

/**
 * Generate a formatted quote ID for submitted quotes only
 * Format: {email_prefix}-{quote_prefix}-{sequence}
 * Example: cdeligi-QLT-1
 */
export const generateSubmittedQuoteId = async (userEmail: string): Promise<string> => {
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
    
    // Get user's current counter from profiles or create one
    const { data: userData, error: userError } = await supabase
      .from('user_quote_counters')
      .select('current_counter')
      .eq('user_email', userEmail)
      .single();
    
    let sequence = 1;
    
    if (userError) {
      // Create new counter record for user
      const { error: insertError } = await supabase
        .from('user_quote_counters')
        .insert({
          user_email: userEmail,
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
        .eq('user_email', userEmail);
        
      if (updateError) {
        console.error('Error updating user counter:', updateError);
      }
    }
    
    return `${emailPrefix}-${quotePrefix}-${sequence}`;
  } catch (error) {
    console.error('Error generating submitted quote ID:', error);
    // Fallback to simple format
    const emailPrefix = userEmail.split('@')[0];
    const timestamp = Math.floor(Date.now() / 1000) % 10000;
    return `${emailPrefix}-QLT-${timestamp}`;
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