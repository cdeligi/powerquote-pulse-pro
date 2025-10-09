import type { SupabaseClient, PostgrestError } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

export const SYSTEM_ADDITIONAL_QUOTE_INFO_KEY = '__system_additional_quote_information';

type QuoteFieldsRecord = Record<string, any>;

type QuoteLike = {
  status?: string | null;
  quote_fields?: unknown;
  price_adjustments?: unknown;
  additional_quote_information?: unknown;
};

const ADDITIONAL_INFO_SUPPORT_STORAGE_KEY =
  'powerquote_additional_quote_info_supported';

const readStoredAdditionalInfoSupport = (): boolean | null => {
  if (typeof window === 'undefined' || !window?.localStorage) {
    return null;
  }

  const stored = window.localStorage.getItem(
    ADDITIONAL_INFO_SUPPORT_STORAGE_KEY
  );

  if (stored === 'true') {
    return true;
  }

  if (stored === 'false') {
    return false;
  }

  return null;
};

const persistAdditionalInfoSupport = (value: boolean | null) => {
  if (typeof window === 'undefined' || !window?.localStorage) {
    return;
  }

  if (value === null) {
    window.localStorage.removeItem(ADDITIONAL_INFO_SUPPORT_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(
    ADDITIONAL_INFO_SUPPORT_STORAGE_KEY,
    value ? 'true' : 'false'
  );
};

let additionalInfoColumnSupported: boolean | null = readStoredAdditionalInfoSupport();

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

const parseJsonRecord = (value: unknown): QuoteFieldsRecord | null => {
  if (!value) {
    return null;
  }

  if (isPlainObject(value)) {
    return value as QuoteFieldsRecord;
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return isPlainObject(parsed) ? (parsed as QuoteFieldsRecord) : null;
    } catch (error) {
      console.warn('Unable to parse JSON string', error);
      return null;
    }
  }

  return null;
};

export const extractAdditionalQuoteInformation = (
  quote: QuoteLike,
  normalizedFields?: QuoteFieldsRecord | null
): string | undefined => {
  const priceAdjustments = parseJsonRecord(quote?.price_adjustments);

  const direct = sanitizeAdditionalQuoteInformation(
    quote?.additional_quote_information
  );

  if (direct) {
    return direct;
  }

  const fields = normalizedFields ?? parseQuoteFieldsValue(quote?.quote_fields);
  if (!fields) {
    if (priceAdjustments) {
      const systemMeta = isPlainObject(priceAdjustments.__system_meta)
        ? (priceAdjustments.__system_meta as QuoteFieldsRecord)
        : null;
      if (systemMeta) {
        const metaValue = sanitizeAdditionalQuoteInformation(
          systemMeta.additional_quote_information
        );
        if (metaValue) {
          return metaValue;
        }
      }
    }
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

  if (priceAdjustments) {
    const systemMeta = isPlainObject(priceAdjustments.__system_meta)
      ? (priceAdjustments.__system_meta as QuoteFieldsRecord)
      : null;
    if (systemMeta) {
      const metaValue = sanitizeAdditionalQuoteInformation(
        systemMeta.additional_quote_information
      );
      if (metaValue) {
        return metaValue;
      }
    }
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

const mergeAdditionalQuoteInformationIntoPriceAdjustments = (
  existing: QuoteFieldsRecord | null,
  sanitizedInfo: string | undefined
): { changed: boolean; nextAdjustments: QuoteFieldsRecord | null } => {
  const base = existing ? { ...existing } : {};
  const meta = isPlainObject(base.__system_meta)
    ? { ...(base.__system_meta as QuoteFieldsRecord) }
    : {};
  const hadMetaKey = Object.prototype.hasOwnProperty.call(
    meta,
    'additional_quote_information'
  );
  const previousValue = sanitizeAdditionalQuoteInformation(
    meta.additional_quote_information
  );

  if (sanitizedInfo) {
    if (previousValue === sanitizedInfo) {
      return { changed: false, nextAdjustments: existing ?? null };
    }

    meta.additional_quote_information = sanitizedInfo;
    base.__system_meta = meta;
    return { changed: true, nextAdjustments: base };
  }

  if (!sanitizedInfo && (hadMetaKey || Object.keys(meta).length > 0)) {
    delete meta.additional_quote_information;

    if (Object.keys(meta).length === 0) {
      delete base.__system_meta;
    } else {
      base.__system_meta = meta;
    }

    if (Object.keys(base).length === 0) {
      return { changed: true, nextAdjustments: null };
    }

    return { changed: true, nextAdjustments: base };
  }

  return { changed: false, nextAdjustments: existing ?? null };
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
      additionalInfoColumnSupported = false;
      persistAdditionalInfoSupport(false);
      return false;
    }

    if (error) {
      console.warn(
        'Unable to verify additional_quote_information column support; assuming present.',
        error
      );
    }

    additionalInfoColumnSupported = true;
    persistAdditionalInfoSupport(true);
    return true;
  } catch (error) {
    console.warn(
      'Unexpected error while checking additional_quote_information support; assuming present.',
      error
    );
    additionalInfoColumnSupported = true;
    persistAdditionalInfoSupport(true);
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
  mergedPriceAdjustments: QuoteFieldsRecord | null;
}> => {
  const sanitizedInfo = sanitizeAdditionalQuoteInformation(additionalInfo);
  const supportsColumn = forceDisableColumn
    ? false
    : await ensureAdditionalQuoteInfoColumnSupport(client);
  const parsedFields = parseQuoteFieldsValue(quote?.quote_fields);
  const parsedAdjustments = parseJsonRecord(quote?.price_adjustments);

  const originalStatus = typeof quote?.status === 'string' ? quote.status : null;
  const targetStatus = typeof updates.status === 'string'
    ? updates.status
    : originalStatus;
  const allowQuoteFieldsFallback =
    originalStatus === 'draft' && targetStatus === 'draft';

  const resultUpdates: Record<string, any> = { ...updates };

  if (supportsColumn) {
    resultUpdates.additional_quote_information = sanitizedInfo ?? null;
  } else {
    delete resultUpdates.additional_quote_information;
  }

  let mergedFields: QuoteFieldsRecord | null = parsedFields ?? null;
  let mergedPriceAdjustments: QuoteFieldsRecord | null = parsedAdjustments ?? null;

  if (!supportsColumn && allowQuoteFieldsFallback) {
    const { changed, nextFields } = mergeAdditionalQuoteInformationIntoFields(
      parsedFields,
      sanitizedInfo
    );

    mergedFields = nextFields ?? parsedFields ?? null;

    if (changed) {
      resultUpdates.quote_fields = nextFields;
    }
  } else if (!supportsColumn) {
    const { changed, nextAdjustments } = mergeAdditionalQuoteInformationIntoPriceAdjustments(
      parsedAdjustments,
      sanitizedInfo
    );

    mergedPriceAdjustments = nextAdjustments ?? parsedAdjustments ?? null;

    if (changed) {
      resultUpdates.price_adjustments = nextAdjustments;
    }
  }

  return {
    updates: resultUpdates,
    sanitizedInfo,
    mergedFields,
    mergedPriceAdjustments,
  };
};

export const resetAdditionalQuoteInfoSupportCache = () => {
  additionalInfoColumnSupported = null;
  persistAdditionalInfoSupport(null);
};

const columnPresenceFromRow = (
  row: Record<string, any> | null | undefined
): boolean | null => {
  if (!row || typeof row !== 'object') {
    return null;
  }

  if (Object.prototype.hasOwnProperty.call(row, 'additional_quote_information')) {
    return true;
  }

  return false;
};

export const noteAdditionalQuoteInfoColumnFromRow = (
  row: Record<string, any> | null | undefined
) => {
  const detected = columnPresenceFromRow(row);

  if (detected === null) {
    return;
  }

  if (detected) {
    if (additionalInfoColumnSupported !== true) {
      additionalInfoColumnSupported = true;
      persistAdditionalInfoSupport(true);
    }
    return;
  }

  if (additionalInfoColumnSupported !== false) {
    additionalInfoColumnSupported = false;
    persistAdditionalInfoSupport(false);
  }
};

interface PreparedAdditionalQuoteInfoUpdates {
  updates: Record<string, any>;
  sanitizedInfo: string | undefined;
  mergedFields: QuoteFieldsRecord | null;
  mergedPriceAdjustments: QuoteFieldsRecord | null;
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
  mergedPriceAdjustments: QuoteFieldsRecord | null;
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
        mergedPriceAdjustments: parseJsonRecord(quote?.price_adjustments) ?? null,
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
    mergedPriceAdjustments: prepared.mergedPriceAdjustments,
  };
};

