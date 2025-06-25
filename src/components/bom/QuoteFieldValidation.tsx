
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface QuoteField {
  id: string;
  label: string;
  type: string;
  required: boolean;
  enabled: boolean;
}

interface QuoteFieldValidationProps {
  quoteFields: Record<string, any>;
  requiredFields: QuoteField[];
}

export const QuoteFieldValidation = ({ quoteFields, requiredFields }: QuoteFieldValidationProps) => {
  const validateRequiredFields = () => {
    const missingFields: string[] = [];
    
    requiredFields.forEach(field => {
      if (field.required && field.enabled) {
        const value = quoteFields[field.id];
        if (!value || value === '' || value === null || value === undefined) {
          missingFields.push(field.label);
        }
      }
    });
    
    return missingFields;
  };

  const missingFields = validateRequiredFields();

  if (missingFields.length === 0) {
    return null;
  }

  return (
    <Alert className="bg-red-900/20 border-red-600 mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="text-red-400">
        <div className="font-medium mb-2">Required fields missing:</div>
        <ul className="list-disc list-inside space-y-1">
          {missingFields.map((field, index) => (
            <li key={index} className="text-sm">{field}</li>
          ))}
        </ul>
        <div className="mt-2 text-sm">
          Please fill in all required fields before submitting the quote.
        </div>
      </AlertDescription>
    </Alert>
  );
};

export const validateQuoteFields = (quoteFields: Record<string, any>, requiredFields: QuoteField[]): boolean => {
  const missingFields = requiredFields.filter(field => {
    if (!field.required || !field.enabled) return false;
    
    const value = quoteFields[field.id];
    return !value || value === '' || value === null || value === undefined;
  });
  
  return missingFields.length === 0;
};
