import { supabase } from '@/integrations/supabase/client';

/**
 * Generates a unique draft quote name for a specific user. Falls back to a timestamp-based
 * identifier if we cannot reliably count the existing drafts.
 */
export async function generateUniqueDraftName(
  userId: string | null | undefined,
  userEmail: string | null | undefined
): Promise<string> {
  const fallbackSuffix = Date.now().toString().slice(-6);
  const emailPrefix = userEmail?.split('@')[0] || 'User';

  if (!userId) {
    return `${emailPrefix} Draft ${fallbackSuffix}`;
  }

  try {
    const { count, error } = await supabase
      .from('quotes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'draft')
      .not('id', 'like', 'TEMP-%');

    if (error) {
      console.error('Error counting drafts for unique name generation:', error);
      return `${emailPrefix} Draft ${fallbackSuffix}`;
    }

    const draftNumber = (count || 0) + 1;
    return `${emailPrefix} Draft ${draftNumber}`;
  } catch (error) {
    console.error('Unexpected error generating unique draft name:', error);
    return `${emailPrefix} Draft ${fallbackSuffix}`;
  }
}
