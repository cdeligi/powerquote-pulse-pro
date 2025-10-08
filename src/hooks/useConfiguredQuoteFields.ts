import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ConfiguredQuoteField {
  id: string;
  label: string;
  type: string;
  required: boolean;
  enabled: boolean;
  display_order?: number;
  include_in_pdf?: boolean;
}

export interface FormattedQuoteField extends ConfiguredQuoteField {
  formattedValue: string;
}

export interface UnmappedQuoteField {
  key: string;
  value: unknown;
}

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
          .select("id,label,type,required,enabled,display_order,include_in_pdf")
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
              include_in_pdf: Boolean(field.include_in_pdf),
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

  const formattedFields: FormattedQuoteField[] = useMemo(() => {
    if (!filteredConfiguredFields.length) return [];

    const fieldValues = quoteFields || {};
    return filteredConfiguredFields.map((field) => ({
      ...field,
      formattedValue: formatQuoteFieldValue(fieldValues[field.id], field.type),
    }));
  }, [filteredConfiguredFields, quoteFields]);

  const unmappedFields: UnmappedQuoteField[] = useMemo(() => {
    if (!quoteFields) return [];
    const mappedIds = new Set(filteredConfiguredFields.map((field) => field.id));

    return Object.entries(quoteFields)
      .filter(([key]) => !mappedIds.has(key))
      .map(([key, value]) => ({ key, value }));
  }, [filteredConfiguredFields, quoteFields]);

  return { configuredFields: filteredConfiguredFields, formattedFields, unmappedFields };
};

