import { supabase } from '@/integrations/supabase/client';
import { generateUniqueDraftName } from '@/utils/draftName';
import { normalizeQuoteId, persistNormalizedQuoteId } from '@/utils/quoteIdGenerator';
import type { Database } from '@/integrations/supabase/types';

type QuoteRow = Database['public']['Tables']['quotes']['Row'];
type BomItemRow = Database['public']['Tables']['bom_items']['Row'];
type BomLevel4Row = Database['public']['Tables']['bom_level4_values']['Row'];
type ProfileRow = Database['public']['Tables']['profiles']['Row'];

const SCHEMA_CACHE_ERROR_FRAGMENT = 'schema cache';
const LEGACY_NOT_FOUND_FRAGMENT = 'Could not find the function public.clone_quote(';
const AMBIGUOUS_COLUMN_FRAGMENT = 'column reference "source_quote_id" is ambiguous';

interface CloneQuoteOptions {
  newUserEmail?: string;
  newUserName?: string;
}

export async function cloneQuoteWithFallback(
  sourceQuoteId: string,
  newUserId: string,
  options?: CloneQuoteOptions
): Promise<string> {
  const firstAttempt = await supabase.rpc('clone_quote', {
    p_source_quote_id: sourceQuoteId,
    p_new_user_id: newUserId,
  });

  if (!firstAttempt.error) {
    const normalizedId = ensureQuoteId(firstAttempt.data);
    const rawId = typeof firstAttempt.data === 'string' ? firstAttempt.data : normalizedId;

    await persistNormalizedQuoteId(rawId, normalizedId);

    return normalizedId;
  }

  const firstMessage = firstAttempt.error.message || '';
  const needsLegacyRetry =
    firstMessage.includes(SCHEMA_CACHE_ERROR_FRAGMENT) ||
    firstMessage.includes(LEGACY_NOT_FOUND_FRAGMENT);

  if (needsLegacyRetry) {
    const legacyAttempt = await supabase.rpc('clone_quote', {
      source_quote_id: sourceQuoteId,
      new_user_id: newUserId,
    });

    if (!legacyAttempt.error) {
      const normalizedId = ensureQuoteId(legacyAttempt.data);
      const rawId = typeof legacyAttempt.data === 'string' ? legacyAttempt.data : normalizedId;

      await persistNormalizedQuoteId(rawId, normalizedId);

      return normalizedId;
    }

    const legacyMessage = legacyAttempt.error.message || '';
    if (!shouldFallbackToClientClone(legacyMessage)) {
      throw new Error(legacyMessage || 'Failed to clone quote');
    }

    return cloneQuoteClientSide(sourceQuoteId, newUserId, options);
  }

  if (shouldFallbackToClientClone(firstMessage)) {
    return cloneQuoteClientSide(sourceQuoteId, newUserId, options);
  }

  throw new Error(firstMessage || 'Failed to clone quote');
}

function ensureQuoteId(result: unknown): string {
  if (typeof result === 'string' && result.length > 0) {
    const normalized = normalizeQuoteId(result);

    if (normalized) {
      return normalized;
    }
  }

  throw new Error('Clone operation did not return a new quote ID.');
}

function shouldFallbackToClientClone(message: string): boolean {
  if (!message) return false;
  return (
    message.includes(AMBIGUOUS_COLUMN_FRAGMENT) ||
    message.includes(LEGACY_NOT_FOUND_FRAGMENT)
  );
}

async function resolveUserIdentity(
  newUserId: string,
  options?: CloneQuoteOptions
): Promise<{ email: string; name: string }> {
  const resolved: { email?: string; name?: string } = {
    email: options?.newUserEmail,
    name: options?.newUserName,
  };

  if (resolved.email && resolved.name) {
    return { email: resolved.email, name: resolved.name };
  }

  const { data: profileData, error } = await supabase
    .from('profiles')
    .select('email, first_name, last_name')
    .eq('id', newUserId)
    .maybeSingle();

  if (error) {
    throw new Error('Failed to load user information for the clone operation.');
  }

  const profile = profileData as (Pick<ProfileRow, 'email'> & {
    first_name: string | null;
    last_name: string | null;
  }) | null;

  if (profile) {
    if (!resolved.email) {
      resolved.email = profile.email ?? undefined;
    }

    if (!resolved.name) {
      const first = profile.first_name?.trim() ?? '';
      const last = profile.last_name?.trim() ?? '';
      const combined = `${first} ${last}`.trim();
      resolved.name = combined || profile.email || undefined;
    }
  }

  if (!resolved.email) {
    throw new Error('Unable to determine the user email required to clone the quote.');
  }

  const finalName = resolved.name ?? resolved.email;

  return { email: resolved.email, name: finalName };
}

async function cloneQuoteClientSide(
  sourceQuoteId: string,
  newUserId: string,
  options?: CloneQuoteOptions
): Promise<string> {
  const identity = await resolveUserIdentity(newUserId, options);

  const { data: sourceQuoteData, error: sourceQuoteError } = await supabase
    .from('quotes')
    .select('*')
    .eq('id', sourceQuoteId)
    .maybeSingle();

  if (sourceQuoteError) {
    throw new Error(sourceQuoteError.message || 'Failed to load the source quote.');
  }

  const sourceQuote = sourceQuoteData as QuoteRow | null;

  if (!sourceQuote) {
    throw new Error('Source quote not found.');
  }

  const generatedDraftId = await generateUniqueDraftName(newUserId, identity.email);
  const normalizedDraftId = normalizeQuoteId(generatedDraftId);

  if (!normalizedDraftId) {
    throw new Error('Failed to normalize the generated draft quote ID.');
  }

  const fieldsCustomerName = (() => {
    const fields = sourceQuote.quote_fields;
    if (fields && typeof fields === 'object' && !Array.isArray(fields)) {
      const raw = (fields as Record<string, unknown>).customer_name;
      if (typeof raw === 'string') {
        const trimmed = raw.trim();
        if (trimmed.length > 0) {
          return trimmed;
        }
      }
    }
    return undefined;
  })();

  const baseCustomerName = typeof sourceQuote.customer_name === 'string'
    ? sourceQuote.customer_name.trim()
    : '';

  const draftPlaceholderPattern = /\sDraft\s\d+$/i;
  const resolvedCustomerName =
    (baseCustomerName && !draftPlaceholderPattern.test(baseCustomerName) ? baseCustomerName : undefined) ||
    fieldsCustomerName ||
    'Pending Customer';

  const clonedQuoteFields = (() => {
    const original = sourceQuote.quote_fields;
    if (!original || typeof original !== 'object') {
      return original;
    }

    return {
      ...(original as Record<string, unknown>),
      customer_name: resolvedCustomerName,
    } as QuoteRow['quote_fields'];
  })();

  const clonedDraftBom = (() => {
    const original = sourceQuote.draft_bom;
    if (!original || typeof original !== 'object') {
      return original;
    }

    const cloned = {
      ...(original as Record<string, unknown>),
    } as Record<string, unknown>;

    const existingQuoteFields = cloned.quoteFields;
    if (existingQuoteFields && typeof existingQuoteFields === 'object') {
      cloned.quoteFields = {
        ...(existingQuoteFields as Record<string, unknown>),
        customer_name: resolvedCustomerName,
      };
    } else {
      cloned.quoteFields = { customer_name: resolvedCustomerName };
    }

    cloned.draftName = normalizedDraftId;

    return cloned as QuoteRow['draft_bom'];
  })();

  const newQuotePayload: Database['public']['Tables']['quotes']['Insert'] = {
    id: normalizedDraftId,
    user_id: newUserId,
    customer_name: resolvedCustomerName,
    oracle_customer_id: sourceQuote.oracle_customer_id,
    sfdc_opportunity: sourceQuote.sfdc_opportunity,
    priority: sourceQuote.priority ?? 'Medium',
    shipping_terms: sourceQuote.shipping_terms ?? 'TBD',
    payment_terms: sourceQuote.payment_terms ?? 'TBD',
    currency: sourceQuote.currency ?? 'USD',
    is_rep_involved: sourceQuote.is_rep_involved,
    status: 'draft',
    quote_fields: clonedQuoteFields,
    draft_bom: (clonedDraftBom ?? null) as QuoteRow['draft_bom'],
    source_quote_id: sourceQuoteId,
    app_version: sourceQuote.app_version ?? '1.0.0',
    original_quote_value: sourceQuote.original_quote_value ?? 0,
    discounted_value: sourceQuote.discounted_value ?? 0,
    total_cost: sourceQuote.total_cost ?? 0,
    requested_discount: sourceQuote.requested_discount ?? 0,
    original_margin: sourceQuote.original_margin ?? 0,
    discounted_margin: sourceQuote.discounted_margin ?? 0,
    gross_profit: sourceQuote.gross_profit ?? 0,
    submitted_by_email: identity.email,
    submitted_by_name: identity.name,
    discount_justification: sourceQuote.discount_justification ?? null,
    requires_finance_approval: sourceQuote.requires_finance_approval ?? null,
    updated_at: new Date().toISOString(),
  };

  let insertedBomItems: { id: string }[] = [];

  try {
    const { error: insertQuoteError } = await supabase
      .from('quotes')
      .insert(newQuotePayload);

    if (insertQuoteError) {
      throw new Error(insertQuoteError.message || 'Failed to create the cloned quote.');
    }

    const { data: sourceBomItemsData, error: sourceBomError } = await supabase
      .from('bom_items')
      .select('*')
      .eq('quote_id', sourceQuoteId);

    if (sourceBomError) {
      throw new Error(sourceBomError.message || 'Failed to load BOM items from the source quote.');
    }

    const sourceBomItems = (sourceBomItemsData ?? []) as BomItemRow[];

    if (sourceBomItems && sourceBomItems.length > 0) {
      const bomInsertPayload = sourceBomItems.map((item) => ({
        quote_id: normalizedDraftId,
        product_id: item.product_id,
        name: item.name,
        description: item.description ?? null,
        part_number: item.part_number ?? null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        unit_cost: item.unit_cost,
        total_price: item.total_price,
        total_cost: item.total_cost,
        margin: item.margin,
        product_type: item.product_type ?? null,
        configuration_data: item.configuration_data ?? null,
        approved_unit_price: item.approved_unit_price ?? null,
        original_unit_price: item.original_unit_price ?? null,
        price_adjustment_history: item.price_adjustment_history ?? null,
        parent_quote_item_id: item.parent_quote_item_id ?? null,
      })) satisfies Database['public']['Tables']['bom_items']['Insert'][];

      const { data: insertedBomRows, error: insertBomError } = await supabase
        .from('bom_items')
        .insert(bomInsertPayload)
        .select('id');

      if (insertBomError) {
        throw new Error(insertBomError.message || 'Failed to clone BOM items.');
      }

      insertedBomItems = insertedBomRows ?? [];
      
      // Verify items were actually inserted
      if (insertedBomItems.length !== sourceBomItems.length) {
        console.warn(
          `⚠️ BOM item count mismatch: expected ${sourceBomItems.length}, got ${insertedBomItems.length}`
        );
      } else {
        console.log(`✓ Successfully cloned ${insertedBomItems.length} BOM items`);
      }

      const oldToNewMap = new Map<string, string>();
      sourceBomItems.forEach((item, index) => {
        const inserted = insertedBomRows?.[index];
        if (inserted?.id) {
          oldToNewMap.set(item.id, inserted.id);
        }
      });

      const sourceBomIds = sourceBomItems.map((item) => item.id);
      const { data: level4RowsData, error: level4Error } = await supabase
        .from('bom_level4_values')
        .select('*')
        .in('bom_item_id', sourceBomIds);

      if (level4Error) {
        throw new Error(level4Error.message || 'Failed to load Level 4 configuration values.');
      }

      const level4Rows = (level4RowsData ?? []) as BomLevel4Row[];

      const level4InsertPayload = level4Rows
        .map((row) => {
          const targetId = oldToNewMap.get(row.bom_item_id);
          if (!targetId) return null;
          return {
            bom_item_id: targetId,
            level4_config_id: row.level4_config_id,
            entries: row.entries,
          } as Database['public']['Tables']['bom_level4_values']['Insert'];
        })
        .filter((value): value is Database['public']['Tables']['bom_level4_values']['Insert'] => value !== null);

      if (level4InsertPayload.length > 0) {
        const { error: insertLevel4Error } = await supabase
          .from('bom_level4_values')
          .insert(level4InsertPayload);

        if (insertLevel4Error) {
          throw new Error(insertLevel4Error.message || 'Failed to clone Level 4 configuration values.');
        }
      }
    }

    return normalizedDraftId;
  } catch (error) {
    await cleanupFailedClone(normalizedDraftId, insertedBomItems);
    throw error instanceof Error ? error : new Error('Failed to clone quote');
  }
}

async function cleanupFailedClone(
  newQuoteId: string,
  insertedBomItems: { id: string }[]
) {
  try {
    const bomItemIds = insertedBomItems.map((item) => item.id).filter(Boolean);

    if (bomItemIds.length > 0) {
      await supabase
        .from('bom_level4_values')
        .delete()
        .in('bom_item_id', bomItemIds);

      await supabase
        .from('bom_items')
        .delete()
        .in('id', bomItemIds);
    }

    await supabase
      .from('quotes')
      .delete()
      .eq('id', newQuoteId);
  } catch (cleanupError) {
    console.error('Failed to clean up after unsuccessful clone:', cleanupError);
  }
}
