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
  const rawPrefix = userEmail?.split('@')[0]?.trim() || 'User';
  const sanitizedPrefix = rawPrefix.replace(/[^A-Za-z0-9._-]/g, '') || 'User';

  if (!userId) {
    return `${sanitizedPrefix} Draft ${fallbackSuffix}`;
  }

  try {
    const { data, error } = await supabase
      .from('quotes')
      .select('id')
      .eq('user_id', userId)
      .ilike('id', `${sanitizedPrefix} Draft%`);

    if (error) {
      console.error('Error fetching drafts for unique name generation:', error);
      return `${sanitizedPrefix} Draft ${fallbackSuffix}`;
    }

    const prefixPattern = sanitizedPrefix.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const draftPattern = new RegExp(`^${prefixPattern}\\s+Draft\\s+(\\d+)$`, 'i');

    const usedNumbers = new Set<number>();

    for (const row of data || []) {
      const candidateId = typeof row.id === 'string' ? row.id.trim() : '';
      if (!candidateId) continue;

      const match = candidateId.match(draftPattern);
      if (match?.[1]) {
        const numericValue = Number.parseInt(match[1], 10);
        if (Number.isFinite(numericValue)) {
          usedNumbers.add(numericValue);
        }
      }
    }

    let counter = 1;
    while (usedNumbers.has(counter)) {
      counter += 1;
    }

    return `${sanitizedPrefix} Draft ${counter}`;
  } catch (error) {
    console.error('Unexpected error generating unique draft name:', error);
    return `${sanitizedPrefix} Draft ${fallbackSuffix}`;
  }
}
