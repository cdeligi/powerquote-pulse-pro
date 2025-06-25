
import { useState, useEffect } from 'react';

export interface ValidationResult {
  isValid: boolean;
  missingFields: string[];
}

export interface QuoteField {
  id: string;
  label: string;
  type: string;
  required: boolean;
  enabled: boolean;
  options?: string[];
}

export const useQuoteValidation = (
  quoteFields: Record<string, any>,
  availableFields: QuoteField[]
) => {
  const [validation, setValidation] = useState<ValidationResult>({
    isValid: true,
    missingFields: []
  });

  const validateFields = () => {
    const enabledRequiredFields = availableFields.filter(field => field.enabled && field.required);
    const missingFields: string[] = [];

    enabledRequiredFields.forEach(field => {
      const value = quoteFields[field.id];
      
      // Check if field is empty or undefined
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        missingFields.push(field.label);
      }
    });

    const isValid = missingFields.length === 0;
    
    setValidation({
      isValid,
      missingFields
    });

    return { isValid, missingFields };
  };

  useEffect(() => {
    validateFields();
  }, [quoteFields, availableFields]);

  return {
    validation,
    validateFields
  };
};

// Individual field validation helper
export const validateQuoteField = (
  field: QuoteField,
  value: any
): { isValid: boolean; errorMessage?: string } => {
  if (!field.enabled) {
    return { isValid: true };
  }

  if (field.required) {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return {
        isValid: false,
        errorMessage: `${field.label} is required`
      };
    }
  }

  // Type-specific validation
  switch (field.type) {
    case 'email':
      if (value && typeof value === 'string') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return {
            isValid: false,
            errorMessage: 'Please enter a valid email address'
          };
        }
      }
      break;
    
    case 'number':
      if (value && isNaN(Number(value))) {
        return {
          isValid: false,
          errorMessage: 'Please enter a valid number'
        };
      }
      break;
  }

  return { isValid: true };
};
