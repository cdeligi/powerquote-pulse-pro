import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SYSTEM_ADDITIONAL_QUOTE_INFO_KEY } from '@/utils/additionalQuoteInformation';
import {
  QuoteFieldConfiguration as QuoteFieldConfig,
  QuoteFieldConditionalRule,
  QuoteFieldType,
} from "@/types/quote-field";
import {
  normalizeQuoteFieldConditionalRules,
  normalizeQuoteFieldOptions,
} from "@/utils/quoteFieldNormalization";

export interface ConfiguredQuoteField extends QuoteFieldConfig {}

export interface FormattedQuoteField {
  id: string;
  label: string;
  type: string;
  required: boolean;
  enabled: boolean;
  include_in_pdf?: boolean;
  display_order?: number;
  formattedValue: string;
  isConditional?: boolean;
  parentFieldId?: string;
}

export interface UnmappedQuoteField {
  key: string;
  value: unknown;
}

const normalizeTriggerValue = (value: string) => {
  const normalized = value.trim().toLowerCase();
  if (normalized === "yes") return "true";
  if (normalized === "no") return "false";
  return normalized;
};

const normalizeValueList = (value: unknown): string[] => {
  if (value === null || value === undefined) {
    return [];
  }

  const list = Array.isArray(value) ? value : [value];
  return list
    .map((item) => {
      if (typeof item === "boolean") {
        return item ? "true" : "false";
      }
      return normalizeTriggerValue(String(item));
    })
    .filter((item) => item.length > 0);
};

const getActiveConditionalRules = (
  field: ConfiguredQuoteField,
  value: unknown,
): QuoteFieldConditionalRule[] => {
  if (!field.conditional_logic || field.conditional_logic.length === 0) {
    return [];
  }

  const currentValues = normalizeValueList(value);
  if (!currentValues.length) {
    return [];
  }

  const valueSet = new Set(currentValues);
  return field.conditional_logic.filter((rule) => {
    const triggers = (rule.triggerValues || []).map(normalizeTriggerValue);
    return triggers.some((trigger) => valueSet.has(trigger));
  });
};

const formatQuoteFieldValue = (value: unknown, type: string): string => {
  if (value === null || value === undefined) {
    return "—";
  }

  if (typeof value === "string" && value.trim() === "") {
    return "—";
  }

  if (type === "checkbox") {
    if (typeof value === "boolean") {
      return value ? "Yes" : "No";
    }

    if (typeof value === "string") {
      return value.toLowerCase() === "true" ? "Yes" : "No";
    }
  }

  if (type === "date") {
    try {
      const dateValue = value instanceof Date ? value : new Date(value as string);
      if (Number.isNaN(dateValue.getTime())) {
        return String(value);
      }
      return dateValue.toLocaleDateString();
    } catch (error) {
      console.warn("Unable to format date field value", value, error);
      return String(value);
    }
  }

  if (Array.isArray(value)) {
    return value.join(", ");
  }

  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch (error) {
      console.warn("Unable to stringify quote field value", value, error);
      return String(value);
    }
  }

  return String(value);
};

export interface UseConfiguredQuoteFieldsOptions {
  includeInQuoteOnly?: boolean;
}

export const useConfiguredQuoteFields = (
  quoteFields: Record<string, unknown> | undefined,
  options: UseConfiguredQuoteFieldsOptions = {}
) => {
  const { includeInQuoteOnly = false } = options;
  const [configuredFields, setConfiguredFields] = useState<ConfiguredQuoteField[]>([]);

  useEffect(() => {
    let isMounted = true;

    const fetchConfiguredFields = async () => {
      try {
        const { data, error } = await supabase
          .from("quote_fields")
          .select("id,label,type,required,enabled,display_order,include_in_pdf,options,conditional_logic")
          .eq("enabled", true)
          .order("display_order", { ascending: true });

        if (error) {
          console.error("Failed to fetch quote field configuration for admin view:", error);
          return;
        }

        if (isMounted) {
          setConfiguredFields(
            (data || []).map((field) => ({
              ...field,
              type: (field.type as QuoteFieldType) ?? "text",
              include_in_pdf: Boolean(field.include_in_pdf),
              options: normalizeQuoteFieldOptions(field.options),
              conditional_logic: normalizeQuoteFieldConditionalRules(field.conditional_logic),
            }))
          );
        }
      } catch (fetchError) {
        console.error("Unexpected error loading quote field configuration:", fetchError);
      }
    };

    fetchConfiguredFields();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredConfiguredFields = useMemo<ConfiguredQuoteField[]>(() => {
    if (!configuredFields.length) {
      return [];
    }

    if (!includeInQuoteOnly) {
      return configuredFields;
    }

    return configuredFields.filter((field) => field.include_in_pdf);
  }, [configuredFields, includeInQuoteOnly]);

  const { formattedFields, handledFieldIds } = useMemo(() => {
    if (!filteredConfiguredFields.length) {
      return { formattedFields: [] as FormattedQuoteField[], handledFieldIds: new Set<string>() };
    }

    const fieldValues = quoteFields || {};
    const formatted: FormattedQuoteField[] = [];
    const handledIds = new Set<string>();

    filteredConfiguredFields.forEach((field) => {
      formatted.push({
        id: field.id,
        label: field.label,
        type: field.type,
        required: field.required,
        enabled: field.enabled,
        include_in_pdf: field.include_in_pdf,
        display_order: field.display_order,
        formattedValue: formatQuoteFieldValue(fieldValues[field.id], field.type),
      });
      handledIds.add(field.id);

      const activeRules = getActiveConditionalRules(field, fieldValues[field.id]);
      activeRules.forEach((rule) => {
        rule.fields.forEach((conditionalField) => {
          // Use explicit Boolean check for include_in_pdf
          const shouldIncludeInPdf = Boolean(conditionalField.include_in_pdf);
          
          // Skip if we only want quote fields and this isn't marked for PDF inclusion
          if (includeInQuoteOnly && !shouldIncludeInPdf) {
            return;
          }

          const formattedConditional: FormattedQuoteField = {
            id: conditionalField.id,
            label: conditionalField.label,
            type: conditionalField.type,
            required: conditionalField.required,
            enabled: conditionalField.enabled ?? true,
            include_in_pdf: shouldIncludeInPdf,
            formattedValue: formatQuoteFieldValue(fieldValues[conditionalField.id], conditionalField.type),
            isConditional: true,
            parentFieldId: field.id,
          };

          formatted.push(formattedConditional);
          handledIds.add(conditionalField.id);
        });
      });
    });

    return { formattedFields: formatted, handledFieldIds: handledIds };
  }, [filteredConfiguredFields, quoteFields]);

  const unmappedFields: UnmappedQuoteField[] = useMemo(() => {
    if (!quoteFields) return [];
    const mappedIds = handledFieldIds;

    return Object.entries(quoteFields)
      .filter(([key]) => !mappedIds.has(key) && key !== SYSTEM_ADDITIONAL_QUOTE_INFO_KEY)
      .map(([key, value]) => ({ key, value }));
  }, [handledFieldIds, quoteFields]);

  return { configuredFields: filteredConfiguredFields, formattedFields, unmappedFields };
};

