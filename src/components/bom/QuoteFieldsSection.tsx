
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
            className="bg-gray-800 border-gray-700 text-white"
            required={field.required}
          />
        );

      case 'select':
        return (
          <Select
            value={value}
            onValueChange={(val) => handleFieldChange(field.id, val)}
          >
            <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
              <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              {field.options?.map((option) => (
                <SelectItem key={option} value={option} className="text-white">
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
            className="bg-gray-800 border-gray-700 text-white"
            required={field.required}
          />
        );

      case 'email':
        return (
          <Input
            type="email"
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className="bg-gray-800 border-gray-700 text-white"
            required={field.required}
          />
        );

      case 'tel':
        return (
          <Input
            type="tel"
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className="bg-gray-800 border-gray-700 text-white"
            required={field.required}
          />
        );

      case 'date':
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className="bg-gray-800 border-gray-700 text-white"
            required={field.required}
          />
        );

      default:
        return (
          <Input
            type="text"
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className="bg-gray-800 border-gray-700 text-white"
            required={field.required}
          />
        );
    }
  };

  if (loading) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="pt-6">
          <div className="text-center text-gray-400">Loading quote fields...</div>
        </CardContent>
      </Card>
    );
  }

  if (quoteFields.length === 0) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Quote Information</CardTitle>
          <CardDescription className="text-gray-400">
            No quote fields configured. Configure fields in the admin panel.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white">Quote Information</CardTitle>
        <CardDescription className="text-gray-400">
          Complete the required fields for your quote request
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quoteFields.map((field) => (
            <div key={field.id} className="space-y-2">
              <Label htmlFor={field.id} className="text-white flex items-center gap-2">
                {field.label}
                {field.required && (
                  <Badge variant="outline" className="text-xs border-red-500 text-red-400">
                    Required
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
