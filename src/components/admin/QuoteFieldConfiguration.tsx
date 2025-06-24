
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Eye,
  EyeOff,
  AlertCircle,
  Loader2
} from "lucide-react";
import { User } from "@/types/auth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface QuoteField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'date' | 'email' | 'tel';
  required: boolean;
  enabled: boolean;
  options?: string[];
  display_order: number;
}

interface QuoteFieldConfigurationProps {
  user: User;
}

const QuoteFieldConfiguration = ({ user }: QuoteFieldConfigurationProps) => {
  const [quoteFields, setQuoteFields] = useState<QuoteField[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingField, setEditingField] = useState<QuoteField | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchQuoteFields();
  }, []);

  const fetchQuoteFields = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('quote_fields')
        .select('*')
        .order('display_order');

      if (error) throw error;

      const fields = data.map(field => ({
        id: field.id,
        label: field.label,
        type: field.type as QuoteField['type'],
        required: field.required || false,
        enabled: field.enabled || true,
        options: field.options ? (Array.isArray(field.options) ? field.options : JSON.parse(field.options)) : undefined,
        display_order: field.display_order || 0
      }));

      setQuoteFields(fields);
    } catch (error) {
      console.error('Error fetching quote fields:', error);
      toast({
        title: "Error",
        description: "Failed to load quote fields",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createQuoteField = async (fieldData: Omit<QuoteField, 'id'>) => {
    try {
      const { error } = await supabase
        .from('quote_fields')
        .insert({
          id: `field-${Date.now()}`,
          label: fieldData.label,
          type: fieldData.type,
          required: fieldData.required,
          enabled: fieldData.enabled,
          options: fieldData.options ? JSON.stringify(fieldData.options) : null,
          display_order: fieldData.display_order
        });

      if (error) throw error;

      await fetchQuoteFields();
      toast({
        title: "Success",
        description: "Quote field created successfully"
      });
    } catch (error) {
      console.error('Error creating quote field:', error);
      toast({
        title: "Error",
        description: "Failed to create quote field",
        variant: "destructive"
      });
    }
  };

  const updateQuoteField = async (fieldId: string, fieldData: Omit<QuoteField, 'id'>) => {
    try {
      const { error } = await supabase
        .from('quote_fields')
        .update({
          label: fieldData.label,
          type: fieldData.type,
          required: fieldData.required,
          enabled: fieldData.enabled,
          options: fieldData.options ? JSON.stringify(fieldData.options) : null,
          display_order: fieldData.display_order
        })
        .eq('id', fieldId);

      if (error) throw error;

      await fetchQuoteFields();
      toast({
        title: "Success",
        description: "Quote field updated successfully"
      });
    } catch (error) {
      console.error('Error updating quote field:', error);
      toast({
        title: "Error",
        description: "Failed to update quote field",
        variant: "destructive"
      });
    }
  };

  const deleteQuoteField = async (fieldId: string) => {
    try {
      const { error } = await supabase
        .from('quote_fields')
        .delete()
        .eq('id', fieldId);

      if (error) throw error;

      await fetchQuoteFields();
      toast({
        title: "Success",
        description: "Quote field deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting quote field:', error);
      toast({
        title: "Error",
        description: "Failed to delete quote field",
        variant: "destructive"
      });
    }
  };

  const toggleFieldEnabled = async (fieldId: string) => {
    const field = quoteFields.find(f => f.id === fieldId);
    if (!field) return;

    try {
      const { error } = await supabase
        .from('quote_fields')
        .update({ enabled: !field.enabled })
        .eq('id', fieldId);

      if (error) throw error;

      await fetchQuoteFields();
    } catch (error) {
      console.error('Error toggling field:', error);
      toast({
        title: "Error",
        description: "Failed to toggle field status",
        variant: "destructive"
      });
    }
  };

  const handleCreateField = async (fieldData: Omit<QuoteField, 'id'>) => {
    await createQuoteField(fieldData);
    setDialogOpen(false);
    setEditingField(null);
  };

  const handleUpdateField = async (fieldData: Omit<QuoteField, 'id'>) => {
    if (!editingField) return;
    await updateQuoteField(editingField.id, fieldData);
    setDialogOpen(false);
    setEditingField(null);
  };

  const handleDeleteField = async (fieldId: string) => {
    await deleteQuoteField(fieldId);
  };

  const openEditDialog = (field: QuoteField) => {
    setEditingField(field);
    setDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingField(null);
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
        <span className="ml-2 text-white">Loading quote fields...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Quote Field Configuration</h2>
          <p className="text-gray-400">Configure and manage quote request form fields for the BOM Builder</p>
        </div>
        <Button 
          className="bg-red-600 hover:bg-red-700"
          onClick={openCreateDialog}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Field
        </Button>
      </div>

      {/* Fields Grid */}
      <div className="grid gap-4">
        {quoteFields.map((field) => (
          <Card key={field.id} className="bg-gray-900 border-gray-800">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <CardTitle className="text-white">{field.label}</CardTitle>
                    <Badge variant="outline" className="text-xs capitalize">
                      {field.type}
                    </Badge>
                    {field.required && (
                      <Badge variant="outline" className="text-xs border-red-500 text-red-400">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Required
                      </Badge>
                    )}
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        field.enabled 
                          ? "border-green-500 text-green-400" 
                          : "border-gray-500 text-gray-400"
                      }`}
                    >
                      {field.enabled ? (
                        <>
                          <Eye className="h-3 w-3 mr-1" />
                          Enabled
                        </>
                      ) : (
                        <>
                          <EyeOff className="h-3 w-3 mr-1" />
                          Disabled
                        </>
                      )}
                    </Badge>
                  </div>
                  <CardDescription className="text-gray-400 mt-2">
                    Field ID: <code className="text-xs bg-gray-800 px-1 rounded">{field.id}</code>
                  </CardDescription>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleFieldEnabled(field.id)}
                    className={field.enabled ? "text-orange-400 hover:text-orange-300" : "text-green-400 hover:text-green-300"}
                  >
                    {field.enabled ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-blue-400 hover:text-blue-300"
                    onClick={() => openEditDialog(field)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-red-400 hover:text-red-300"
                    onClick={() => handleDeleteField(field.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">Order</p>
                  <p className="text-white font-medium">{field.display_order}</p>
                </div>
                {field.options && (
                  <div className="col-span-3">
                    <p className="text-gray-400">Options</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {field.options.map((option, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {option}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-800 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingField ? 'Edit' : 'Create'} Quote Field
            </DialogTitle>
          </DialogHeader>
          
          <QuoteFieldForm
            onSubmit={editingField ? handleUpdateField : handleCreateField}
            initialData={editingField}
            onCancel={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

interface QuoteFieldFormProps {
  onSubmit: (fieldData: Omit<QuoteField, 'id'>) => void;
  initialData?: QuoteField | null;
  onCancel: () => void;
}

const QuoteFieldForm = ({ onSubmit, initialData, onCancel }: QuoteFieldFormProps) => {
  const [formData, setFormData] = useState<Omit<QuoteField, 'id'>>({
    label: initialData?.label || '',
    type: initialData?.type || 'text',
    required: initialData?.required ?? false,
    enabled: initialData?.enabled ?? true,
    options: initialData?.options || [],
    display_order: initialData?.display_order || 1
  });

  const [optionsText, setOptionsText] = useState(
    initialData?.options?.join('\n') || ''
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalData = {
      ...formData,
      options: formData.type === 'select' ? optionsText.split('\n').filter(o => o.trim()) : undefined
    };
    onSubmit(finalData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="label" className="text-white">Field Label</Label>
          <Input
            id="label"
            value={formData.label}
            onChange={(e) => setFormData({ ...formData, label: e.target.value })}
            className="bg-gray-800 border-gray-700 text-white"
            required
          />
        </div>
        <div>
          <Label htmlFor="type" className="text-white">Field Type</Label>
          <Select
            value={formData.type}
            onValueChange={(value: QuoteField['type']) => setFormData({ ...formData, type: value })}
          >
            <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="text" className="text-white">Text</SelectItem>
              <SelectItem value="textarea" className="text-white">Textarea</SelectItem>
              <SelectItem value="number" className="text-white">Number</SelectItem>
              <SelectItem value="select" className="text-white">Select</SelectItem>
              <SelectItem value="date" className="text-white">Date</SelectItem>
              <SelectItem value="email" className="text-white">Email</SelectItem>
              <SelectItem value="tel" className="text-white">Phone</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="order" className="text-white">Display Order</Label>
        <Input
          id="order"
          type="number"
          value={formData.display_order}
          onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
          className="bg-gray-800 border-gray-700 text-white"
          min="1"
        />
      </div>

      {formData.type === 'select' && (
        <div>
          <Label htmlFor="options" className="text-white">Options (one per line)</Label>
          <Textarea
            id="options"
            value={optionsText}
            onChange={(e) => setOptionsText(e.target.value)}
            className="bg-gray-800 border-gray-700 text-white"
            rows={4}
            placeholder="Option 1&#10;Option 2&#10;Option 3"
          />
        </div>
      )}

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="required"
            checked={formData.required}
            onCheckedChange={(required) => setFormData({ ...formData, required })}
          />
          <Label htmlFor="required" className="text-white">Required Field</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="enabled"
            checked={formData.enabled}
            onCheckedChange={(enabled) => setFormData({ ...formData, enabled })}
          />
          <Label htmlFor="enabled" className="text-white">Enabled</Label>
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          className="border-gray-600 text-gray-300 hover:bg-gray-800"
        >
          Cancel
        </Button>
        <Button type="submit" className="bg-red-600 hover:bg-red-700">
          {initialData ? 'Update' : 'Create'} Field
        </Button>
      </div>
    </form>
  );
};

export default QuoteFieldConfiguration;
