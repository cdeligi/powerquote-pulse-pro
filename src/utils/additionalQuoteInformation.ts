import type { SupabaseClient, PostgrestError } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

export const SYSTEM_ADDITIONAL_QUOTE_INFO_KEY = '__system_additional_quote_information';

type QuoteFieldsRecord = Record<string, any>;

type QuoteLike = {
  quote_fields?: unknown;
  additional_quote_information?: unknown;
};

let additionalInfoColumnSupported: boolean | null = null;

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
};

export const parseQuoteFieldsValue = (rawFields: unknown): QuoteFieldsRecord | null => {
  if (!rawFields) {
    return null;
  }

  if (isPlainObject(rawFields)) {
    return rawFields as QuoteFieldsRecord;
  }

  if (typeof rawFields === 'string') {
    try {
      const parsed = JSON.parse(rawFields);
      return isPlainObject(parsed) ? (parsed as QuoteFieldsRecord) : null;
    } catch (error) {
      console.warn('Unable to parse quote_fields JSON string', error);
      return null;
    }
  }

  return null;
};

export const sanitizeAdditionalQuoteInformation = (
  value: unknown
): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const extractAdditionalQuoteInformation = (
  quote: QuoteLike,
  normalizedFields?: QuoteFieldsRecord | null
): string | undefined => {
  const direct = sanitizeAdditionalQuoteInformation(
    quote?.additional_quote_information
  );

  if (direct) {
    return direct;
  }

  const fields = normalizedFields ?? parseQuoteFieldsValue(quote?.quote_fields);
  if (!fields) {
    return undefined;
  }

  const systemValue = sanitizeAdditionalQuoteInformation(
    fields[SYSTEM_ADDITIONAL_QUOTE_INFO_KEY]
  );
  if (systemValue) {
    return systemValue;
  }

  const snakeCaseValue = sanitizeAdditionalQuoteInformation(
    fields['additional_quote_information']
  );
  if (snakeCaseValue) {
    return snakeCaseValue;
  }

  const camelCaseValue = sanitizeAdditionalQuoteInformation(
    fields['additionalQuoteInformation']
  );
  if (camelCaseValue) {
    return camelCaseValue;
  }

  return undefined;
};

export const mergeAdditionalQuoteInformationIntoFields = (
  existingFields: QuoteFieldsRecord | null | undefined,
  sanitizedInfo: string | undefined
): { changed: boolean; nextFields: QuoteFieldsRecord | null } => {
  const base = existingFields ? { ...existingFields } : {};
  const hadSystemKey = Object.prototype.hasOwnProperty.call(
    base,
    SYSTEM_ADDITIONAL_QUOTE_INFO_KEY
  );
  const previousValue = sanitizeAdditionalQuoteInformation(
    base[SYSTEM_ADDITIONAL_QUOTE_INFO_KEY]
  );

  if (sanitizedInfo) {
    if (previousValue === sanitizedInfo) {
      return { changed: false, nextFields: existingFields ?? null };
    }

    base[SYSTEM_ADDITIONAL_QUOTE_INFO_KEY] = sanitizedInfo;
    return { changed: true, nextFields: base };
  }

  if (!sanitizedInfo && hadSystemKey) {
    delete base[SYSTEM_ADDITIONAL_QUOTE_INFO_KEY];

    if (Object.keys(base).length === 0) {
      return { changed: true, nextFields: null };
    }

    return { changed: true, nextFields: base };
  }

  return { changed: false, nextFields: existingFields ?? null };
};

export const isMissingAdditionalQuoteInfoColumnError = (
  error: PostgrestError | null | undefined
): boolean => {
  if (!error) {
    return false;
  }

  if (error.code === '42703') {
    return true;
  }

  return typeof error.message === 'string'
    ? error.message.toLowerCase().includes('additional_quote_information') &&
        error.message.toLowerCase().includes('column')
    : false;
};

export const ensureAdditionalQuoteInfoColumnSupport = async (
  client: SupabaseClient<Database>
): Promise<boolean> => {
  if (additionalInfoColumnSupported !== null) {
    return additionalInfoColumnSupported;
  }

  try {
    const { error } = await client
      .from('quotes')
      .select('additional_quote_information')
      .limit(1);

    if (isMissingAdditionalQuoteInfoColumnError(error)) {
      console.warn(
        'Supabase quotes table is missing additional_quote_information column; falling back to quote_fields storage.'
      );
      additionalInfoColumnSupported = false;
      return false;
    }

    if (error) {
      console.warn(
        'Unable to verify additional_quote_information column support; assuming present.',
        error
      );
    }

    additionalInfoColumnSupported = true;
    return true;
  } catch (error) {
    console.warn(
      'Unexpected error while checking additional_quote_information support; assuming present.',
      error
    );
    additionalInfoColumnSupported = true;
    return true;
  }
};

interface PrepareAdditionalQuoteInfoOptions {
  client: SupabaseClient<Database>;
  quote: QuoteLike;
  updates: Record<string, any>;
  additionalInfo?: string | null;
  forceDisableColumn?: boolean;
}

export const prepareAdditionalQuoteInfoUpdates = async ({
  client,
  quote,
  updates,
  additionalInfo,
  forceDisableColumn,
}: PrepareAdditionalQuoteInfoOptions): Promise<{
  updates: Record<string, any>;
  sanitizedInfo: string | undefined;
  mergedFields: QuoteFieldsRecord | null;
}> => {
  const sanitizedInfo = sanitizeAdditionalQuoteInformation(additionalInfo);
  const supportsColumn = forceDisableColumn
    ? false
    : await ensureAdditionalQuoteInfoColumnSupport(client);
  const parsedFields = parseQuoteFieldsValue(quote?.quote_fields);
  const { changed, nextFields } = mergeAdditionalQuoteInformationIntoFields(
    parsedFields,
    sanitizedInfo
  );

  const resultUpdates: Record<string, any> = { ...updates };

  if (supportsColumn) {
    resultUpdates.additional_quote_information = sanitizedInfo ?? null;
  } else {
    delete resultUpdates.additional_quote_information;
  }

  if (changed) {
    resultUpdates.quote_fields = nextFields;
  }

  return {
    updates: resultUpdates,
    sanitizedInfo,
    mergedFields: nextFields ?? parsedFields ?? null,
  };
};

export const resetAdditionalQuoteInfoSupportCache = () => {
  additionalInfoColumnSupported = null;
};

interface PreparedAdditionalQuoteInfoUpdates {
  updates: Record<string, any>;
  sanitizedInfo: string | undefined;
  mergedFields: QuoteFieldsRecord | null;
}

interface UpdateQuoteWithAdditionalInfoOptions {
  client: SupabaseClient<Database>;
  quote: QuoteLike;
  quoteId: string;
  updates: Record<string, any>;
  additionalInfo?: string | null;
}

export const updateQuoteWithAdditionalInfo = async ({
  client,
  quote,
  quoteId,
  updates,
  additionalInfo,
}: UpdateQuoteWithAdditionalInfoOptions): Promise<{
  error: PostgrestError | null;
  preparedUpdates: Record<string, any>;
  sanitizedInfo: string | undefined;
  mergedFields: QuoteFieldsRecord | null;
}> => {
  const baseUpdates: Record<string, any> = { ...updates };
  delete baseUpdates.additional_quote_information;

  const buildPreparedUpdates = async (
    forceDisableColumn?: boolean
  ): Promise<PreparedAdditionalQuoteInfoUpdates> => {
    if (additionalInfo === undefined) {
      return {
        updates: { ...baseUpdates },
        sanitizedInfo: undefined,
        mergedFields: parseQuoteFieldsValue(quote?.quote_fields) ?? null,
      };
    }

    return prepareAdditionalQuoteInfoUpdates({
      client,
      quote,
      updates: baseUpdates,
      additionalInfo,
      forceDisableColumn,
    });
  };

  const attemptUpdate = async (
    forceDisableColumn?: boolean
  ): Promise<{
    error: PostgrestError | null;
    prepared: PreparedAdditionalQuoteInfoUpdates;
  }> => {
    const prepared = await buildPreparedUpdates(forceDisableColumn);
    const { error } = await client
      .from('quotes')
      .update(prepared.updates)
      .eq('id', quoteId);

    return { error, prepared };
  };

  let { error, prepared } = await attemptUpdate();

  if (
    error &&
    isMissingAdditionalQuoteInfoColumnError(error) &&
    additionalInfo !== undefined
  ) {
    resetAdditionalQuoteInfoSupportCache();
    ({ error, prepared } = await attemptUpdate(true));
  }

  return {
    error,
    preparedUpdates: prepared.updates,
    sanitizedInfo: prepared.sanitizedInfo,
    mergedFields: prepared.mergedFields,
  };
};

