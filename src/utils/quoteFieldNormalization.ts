import { QuoteFieldConditionalRule } from '@/types/quote-field';

export const normalizeQuoteFieldOptions = (raw: unknown): string[] => {
  if (!raw) {
    return [];
  }

  if (Array.isArray(raw)) {
    return raw.map((option) => String(option));
  }

  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((option) => String(option));
      }
    } catch (error) {
      console.warn('Failed to parse quote field options JSON, falling back to newline split', error);
    }

    return raw
      .split(/\r?\n/)
      .map((option) => option.trim())
      .filter((option) => option.length > 0);
  }

  return [];
};

export const normalizeQuoteFieldConditionalRules = (raw: unknown): QuoteFieldConditionalRule[] => {
  if (!raw) {
    return [];
  }

  if (Array.isArray(raw)) {
    return raw as QuoteFieldConditionalRule[];
  }

  if (typeof raw === 'object') {
    return raw as QuoteFieldConditionalRule[];
  }

  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed as QuoteFieldConditionalRule[];
      }
    } catch (error) {
      console.warn('Failed to parse conditional logic JSON', error);
    }
  }

  return [];
};
