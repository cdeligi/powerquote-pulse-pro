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

  let rules: any[];
  
  if (Array.isArray(raw)) {
    rules = raw;
  } else if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        rules = parsed;
      } else {
        return [];
      }
    } catch (error) {
      console.warn('Failed to parse conditional logic JSON', error);
      return [];
    }
  } else if (typeof raw === 'object') {
    rules = [raw];
  } else {
    return [];
  }

  // Deep normalize each rule and its fields
  return rules.map((rule) => ({
    ...rule,
    id: rule.id || '',
    triggerValues: Array.isArray(rule.triggerValues) ? rule.triggerValues : [],
    displayMode: rule.displayMode || 'inline',
    title: rule.title || '',
    description: rule.description || '',
    fields: Array.isArray(rule.fields) 
      ? rule.fields.map((field: any) => ({
          ...field,
          id: field.id || '',
          label: field.label || '',
          type: field.type || 'text',
          required: Boolean(field.required),
          enabled: field.enabled !== false, // Default to true if undefined
          include_in_pdf: Boolean(field.include_in_pdf), // Ensure boolean
          options: field.options ? normalizeQuoteFieldOptions(field.options) : undefined,
          helperText: field.helperText || '',
        }))
      : [],
  }));
};
