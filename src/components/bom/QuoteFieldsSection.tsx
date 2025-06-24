
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface QuoteField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'date' | 'email' | 'tel';
  required: boolean;
  enabled: boolean;
  options?: string[];
  display_order: number;
}

interface QuoteFieldsSectionProps {
  onFieldsChange: (fields: Record<string, any>) => void;
  initialValues?: Record<string, any>;
}

const QuoteFieldsSection = ({ onFieldsChange, initialValues = {} }: QuoteFieldsSectionProps) => {
  const [quoteFields, setQuoteFields] = useState<QuoteField[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, any>>(initialValues);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuoteFields();
  }, []);

  const fetchQuoteFields = async () => {
    try {
      const { data, error } = await supabase
        .from('quote_fields')
        .select('*')
        .eq('enabled', true)
        .order('display_order');

      if (error) throw error;
      
      const fields = data?.map(field => ({
        id: field.id,
        label: field.label,
        type: field.type as QuoteField['type'],
        required: field.required,
        enabled: field.enabled,
        options: field.options ? JSON.parse(field.options) : undefined,
        display_order: field.display_order
      })) || [];

      setQuoteFields(fields);
      console.log('Fetched quote fields:', fields);
    } catch (error) {
      console.error('Error fetching quote fields:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    const updatedValues = { ...fieldValues, [fieldId]: value };
    setFieldValues(updatedValues);
    onFieldsChange(updatedValues);
  };

  const renderField = (field: QuoteField) => {
    const value = fieldValues[field.id] || '';

    switch (field.type) {
      case 'textarea':
        return (
          <Textarea
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className="bg-gray-800 border-gray-700 text-white text-sm"
            required={field.required}
            rows={2}
          />
        );

      case 'select':
        return (
          <Select
            value={value}
            onValueChange={(val) => handleFieldChange(field.id, val)}
          >
            <SelectTrigger className="bg-gray-800 border-gray-700 text-white text-sm h-9">
              <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              {field.options?.map((option) => (
                <SelectItem key={option} value={option} className="text-white text-sm">
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'number':
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className="bg-gray-800 border-gray-700 text-white text-sm h-9"
            required={field.required}
          />
        );

      case 'email':
        return (
          <Input
            type="email"
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className="bg-gray-800 border-gray-700 text-white text-sm h-9"
            required={field.required}
          />
        );

      case 'tel':
        return (
          <Input
            type="tel"
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className="bg-gray-800 border-gray-700 text-white text-sm h-9"
            required={field.required}
          />
        );

      case 'date':
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className="bg-gray-800 border-gray-700 text-white text-sm h-9"
            required={field.required}
          />
        );

      default:
        return (
          <Input
            type="text"
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className="bg-gray-800 border-gray-700 text-white text-sm h-9"
            required={field.required}
          />
        );
    }
  };

  if (loading) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="py-4">
          <div className="text-center text-gray-400 text-sm">Loading quote fields...</div>
        </CardContent>
      </Card>
    );
  }

  if (quoteFields.length === 0) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-lg">Quote Information</CardTitle>
          <CardDescription className="text-gray-400 text-sm">
            No quote fields configured. Configure fields in the admin panel.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-lg flex items-center justify-between">
          Quote Information
          <Badge variant="outline" className="text-xs text-gray-300 border-gray-600">
            {quoteFields.length} fields
          </Badge>
        </CardTitle>
        <CardDescription className="text-gray-400 text-sm">
          Complete the required fields for your quote request
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-3">
          {quoteFields.map((field) => (
            <div key={field.id} className="space-y-1.5">
              <Label htmlFor={field.id} className="text-white text-xs flex items-center gap-1.5">
                {field.label}
                {field.required && (
                  <Badge variant="outline" className="text-xs px-1 py-0 h-4 border-red-500 text-red-400">
                    *
                  </Badge>
                )}
              </Label>
              {renderField(field)}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuoteFieldsSection;
