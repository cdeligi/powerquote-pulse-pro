import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useQuoteValidation } from './QuoteFieldValidation';

interface QuoteField {
  id: string;
  label: string;
  type: string;
  required: boolean;
  enabled: boolean;
  options?: any[];
}

interface QuoteFieldsSectionProps {
  quoteFields: Record<string, any>;
  onFieldChange: (fieldId: string, value: any) => void;
}

const QuoteFieldsSection = ({ quoteFields, onFieldChange }: QuoteFieldsSectionProps) => {
  const [configuredFields, setConfiguredFields] = useState<QuoteField[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuoteFields();
  }, []);

  const fetchQuoteFields = async () => {
    console.log('Fetching quote field configurations...');
    try {
      const { data, error } = await supabase
        .from('quote_fields')
        .select('*')
        .eq('enabled', true)
        .order('display_order', { ascending: true });

      if (error) {
        console.error('Error fetching quote fields:', error);
        return;
      }

      console.log('Fetched quote fields:', data);
      setConfiguredFields(data || []);
    } catch (error) {
      console.error('Failed to fetch quote fields:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderField = (field: QuoteField) => {
    const value = quoteFields[field.id] || '';
    const isRequired = field.required;

    const commonProps = {
      className: `bg-gray-700 border-gray-600 text-white ${isRequired ? 'border-red-500' : ''}`,
      value,
      onChange: (e: any) => onFieldChange(field.id, e.target?.value || e)
    };

    switch (field.type) {
      case 'text':
        return (
          <Input
            {...commonProps}
            placeholder={`Enter ${field.label.toLowerCase()}...`}
          />
        );

      case 'textarea':
        return (
          <Textarea
            {...commonProps}
            rows={3}
            placeholder={`Enter ${field.label.toLowerCase()}...`}
          />
        );

      case 'select':
        return (
          <Select value={value} onValueChange={(newValue) => onFieldChange(field.id, newValue)}>
            <SelectTrigger className={`bg-gray-700 border-gray-600 text-white ${isRequired ? 'border-red-500' : ''}`}>
              <SelectValue placeholder={`Select ${field.label.toLowerCase()}...`} />
            </SelectTrigger>
            <SelectContent className="bg-gray-700 border-gray-600">
              {field.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={field.id}
              checked={value === true || value === 'true'}
              onCheckedChange={(checked) => onFieldChange(field.id, checked)}
              className="border-gray-600"
            />
            <Label htmlFor={field.id} className="text-white text-sm">
              {field.label}
            </Label>
          </div>
        );

      case 'number':
        return (
          <Input
            {...commonProps}
            type="number"
            placeholder={`Enter ${field.label.toLowerCase()}...`}
          />
        );

      default:
        return (
          <Input
            {...commonProps}
            placeholder={`Enter ${field.label.toLowerCase()}...`}
          />
        );
    }
  };

  if (loading) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-6">
          <div className="text-white">Loading quote fields...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white">Quote Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Show validation errors */}
        <useQuoteValidation 
          quoteFields={quoteFields} 
          requiredFields={configuredFields} 
        />

        {configuredFields.length === 0 ? (
          <div className="text-gray-400 text-center py-4">
            No quote fields have been configured. Please contact your administrator to set up quote fields.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {configuredFields.map((field) => (
              <div key={field.id} className="space-y-2">
                <Label htmlFor={field.id} className="text-white flex items-center space-x-2">
                  <span>{field.label}</span>
                  {field.required && (
                    <Badge variant="outline" className="text-xs text-red-400 border-red-400">
                      Required
                    </Badge>
                  )}
                </Label>
                {field.type === 'checkbox' ? (
                  renderField(field)
                ) : (
                  <div>
                    {renderField(field)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default QuoteFieldsSection;
