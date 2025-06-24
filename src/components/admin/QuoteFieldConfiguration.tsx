import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, GripVertical } from 'lucide-react';
import { supabaseQuoteFieldsService } from '@/services/supabaseQuoteFieldsService';
import type { QuoteField as QuoteFieldType } from '@/services/supabaseQuoteFieldsService';
import { useToast } from '@/hooks/use-toast';

const QuoteFieldConfiguration = () => {
  const [fields, setFields] = useState<QuoteFieldType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadFields();
  }, []);

  const loadFields = async () => {
    try {
      setIsLoading(true);
      const loadedFields = await supabaseQuoteFieldsService.getAllFields();
      setFields(loadedFields);
    } catch (error) {
      console.error('Error loading fields:', error);
      toast({
        title: "Error",
        description: "Failed to load quote fields",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveFields = async () => {
    try {
      setIsSaving(true);
      await supabaseQuoteFieldsService.updateFields(fields);
      toast({
        title: "Success",
        description: "Quote fields updated successfully"
      });
    } catch (error) {
      console.error('Error saving fields:', error);
      toast({
        title: "Error",
        description: "Failed to save quote fields",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const addNewField = () => {
    const newField: QuoteFieldType = {
      id: `field-${Date.now()}`,
      label: 'New Field',
      type: 'text',
      required: false,
      enabled: true,
      display_order: fields.length
    };
    setFields([...fields, newField]);
  };

  const removeField = (fieldId: string) => {
    setFields(fields.filter(field => field.id !== fieldId));
  };

  const updateField = (fieldId: string, updates: Partial<QuoteFieldType>) => {
    setFields(fields.map(field => 
      field.id === fieldId ? { ...field, ...updates } : field
    ));
  };

  const moveField = (fieldId: string, direction: 'up' | 'down') => {
    const fieldIndex = fields.findIndex(f => f.id === fieldId);
    if (fieldIndex === -1) return;

    const newFields = [...fields];
    if (direction === 'up' && fieldIndex > 0) {
      [newFields[fieldIndex], newFields[fieldIndex - 1]] = [newFields[fieldIndex - 1], newFields[fieldIndex]];
    } else if (direction === 'down' && fieldIndex < fields.length - 1) {
      [newFields[fieldIndex], newFields[fieldIndex + 1]] = [newFields[fieldIndex + 1], newFields[fieldIndex]];
    }

    // Update display_order
    newFields.forEach((field, index) => {
      field.display_order = index;
    });

    setFields(newFields);
  };

  if (isLoading) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-6">
          <div className="text-white text-center">Loading quote fields...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Quote Field Configuration</h2>
          <p className="text-gray-400">Customize the fields available in quote requests</p>
        </div>
        <div className="space-x-2">
          <Button onClick={addNewField} className="bg-green-600 hover:bg-green-700">
            <Plus className="mr-2 h-4 w-4" />
            Add Field
          </Button>
          <Button 
            onClick={saveFields} 
            disabled={isSaving}
            className="bg-red-600 hover:bg-red-700"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {fields.map((field, index) => (
          <Card key={field.id} className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <GripVertical className="h-4 w-4 text-gray-400" />
                  <Badge variant={field.enabled ? "default" : "secondary"}>
                    {field.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                  {field.required && (
                    <Badge variant="destructive">Required</Badge>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => moveField(field.id, 'up')}
                    disabled={index === 0}
                    className="text-gray-400 hover:text-white"
                  >
                    ↑
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => moveField(field.id, 'down')}
                    disabled={index === fields.length - 1}
                    className="text-gray-400 hover:text-white"
                  >
                    ↓
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeField(field.id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label className="text-white">Field Label</Label>
                  <Input
                    value={field.label}
                    onChange={(e) => updateField(field.id, { label: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>

                <div>
                  <Label className="text-white">Field Type</Label>
                  <Select
                    value={field.type}
                    onValueChange={(value: QuoteFieldType['type']) => updateField(field.id, { type: value })}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="select">Select</SelectItem>
                      <SelectItem value="textarea">Textarea</SelectItem>
                      <SelectItem value="date">Date</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={field.required}
                    onCheckedChange={(checked) => updateField(field.id, { required: checked })}
                  />
                  <Label className="text-white">Required</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={field.enabled}
                    onCheckedChange={(checked) => updateField(field.id, { enabled: checked })}
                  />
                  <Label className="text-white">Enabled</Label>
                </div>
              </div>

              {field.type === 'select' && (
                <div className="mt-4">
                  <Label className="text-white">Options (one per line)</Label>
                  <Textarea
                    value={field.options?.join('\n') || ''}
                    onChange={(e) => updateField(field.id, { 
                      options: e.target.value.split('\n').filter(Boolean) 
                    })}
                    placeholder="Option 1&#10;Option 2&#10;Option 3"
                    className="bg-gray-800 border-gray-700 text-white"
                    rows={3}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {fields.length === 0 && (
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-8 text-center">
            <p className="text-gray-400 mb-4">No quote fields configured yet.</p>
            <Button onClick={addNewField} className="bg-green-600 hover:bg-green-700">
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Field
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default QuoteFieldConfiguration;
