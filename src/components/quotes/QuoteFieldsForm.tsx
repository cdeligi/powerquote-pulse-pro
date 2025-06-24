
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabaseQuoteFieldsService, QuoteField } from '@/services/supabaseQuoteFieldsService';
import { AlertCircle } from 'lucide-react';

interface QuoteFieldsFormProps {
  values: Record<string, string>;
  onChange: (values: Record<string, string>) => void;
  className?: string;
}

const QuoteFieldsForm = ({ values, onChange, className }: QuoteFieldsFormProps) => {
  const [fields, setFields] = useState<QuoteField[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFields = async () => {
      try {
        const enabledFields = await supabaseQuoteFieldsService.getEnabledFields();
        setFields(enabledFields);
      } catch (error) {
        console.error('Error loading quote fields:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFields();

    // Listen for field changes
    const handleFieldsChange = () => {
      loadFields();
    };

    supabaseQuoteFieldsService.addListener(handleFieldsChange);

    return () => {
      supabaseQuoteFieldsService.removeListener(handleFieldsChange);
    };
  }, []);

  const handleFieldChange = (fieldId: string, value: string) => {
    onChange({
      ...values,
      [fieldId]: value
    });
  };

  const renderField = (field: QuoteField) => {
    const value = values[field.id] || '';

    switch (field.type) {
      case 'select':
        return (
          <div key={field.id} className="space-y-2">
            <Label className="text-white flex items-center">
              {field.label}
              {field.required && <AlertCircle className="ml-1 h-3 w-3 text-red-400" />}
            </Label>
            <Select value={value} onValueChange={(val) => handleFieldChange(field.id, val)}>
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                <SelectValue placeholder={`Select ${field.label}`} />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                {field.options?.map((option) => (
                  <SelectItem key={option} value={option} className="text-white hover:bg-gray-700">
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'textarea':
        return (
          <div key={field.id} className="space-y-2">
            <Label className="text-white flex items-center">
              {field.label}
              {field.required && <AlertCircle className="ml-1 h-3 w-3 text-red-400" />}
            </Label>
            <Textarea
              value={value}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              placeholder={field.label}
              className="bg-gray-800 border-gray-700 text-white"
              rows={3}
            />
          </div>
        );

      case 'date':
        return (
          <div key={field.id} className="space-y-2">
            <Label className="text-white flex items-center">
              {field.label}
              {field.required && <AlertCircle className="ml-1 h-3 w-3 text-red-400" />}
            </Label>
            <Input
              type="date"
              value={value}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>
        );

      case 'number':
        return (
          <div key={field.id} className="space-y-2">
            <Label className="text-white flex items-center">
              {field.label}
              {field.required && <AlertCircle className="ml-1 h-3 w-3 text-red-400" />}
            </Label>
            <Input
              type="number"
              value={value}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              placeholder={field.label}
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>
        );

      default: // text
        return (
          <div key={field.id} className="space-y-2">
            <Label className="text-white flex items-center">
              {field.label}
              {field.required && <AlertCircle className="ml-1 h-3 w-3 text-red-400" />}
            </Label>
            <Input
              type="text"
              value={value}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              placeholder={field.label}
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>
        );
    }
  };

  if (loading) {
    return (
      <Card className={`bg-gray-900 border-gray-800 ${className}`}>
        <CardHeader>
          <CardTitle className="text-white">Quote Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-gray-400 text-center py-4">Loading quote fields...</div>
        </CardContent>
      </Card>
    );
  }

  if (fields.length === 0) {
    return (
      <Card className={`bg-gray-900 border-gray-800 ${className}`}>
        <CardHeader>
          <CardTitle className="text-white">Quote Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-gray-400 text-center py-4">
            No quote fields configured. Contact your administrator.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`bg-gray-900 border-gray-800 ${className}`}>
      <CardHeader>
        <CardTitle className="text-white">Quote Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {fields.map(renderField)}
      </CardContent>
    </Card>
  );
};

export default QuoteFieldsForm;
