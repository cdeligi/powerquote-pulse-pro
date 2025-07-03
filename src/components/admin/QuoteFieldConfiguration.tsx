
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Edit, Trash2, Save, X, Settings, List, ArrowUp, ArrowDown } from 'lucide-react';

interface QuoteField {
  id: string;
  label: string;
  type: string;
  required: boolean;
  enabled: boolean;
  options?: string[];
  display_order?: number;
  created_at: string;
  updated_at: string;
}

const QuoteFieldConfiguration = () => {
  const [fields, setFields] = useState<QuoteField[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingField, setEditingField] = useState<QuoteField | null>(null);
  const [showNewField, setShowNewField] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const [newField, setNewField] = useState({
    id: '',
    label: '',
    type: 'text',
    required: false,
    enabled: true,
    options: [] as string[],
    display_order: 0
  });

  useEffect(() => {
    fetchFields();
  }, []);

  const fetchFields = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('quote_fields')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) {
        console.error('Error fetching quote fields:', error);
        toast({
          title: "Error",
          description: "Failed to fetch quote fields",
          variant: "destructive",
        });
        return;
      }

      setFields(data || []);
    } catch (error) {
      console.error('Unexpected error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveField = async (field: Partial<QuoteField>, isNew: boolean = false) => {
    try {
      if (isNew) {
        const fieldId = `field-${Date.now()}`;
        const { error } = await supabase
          .from('quote_fields')
          .insert({
            id: fieldId,
            label: field.label,
            type: field.type,
            required: field.required || false,
            enabled: field.enabled || true,
            options: field.options || null,
            display_order: fields.length
          });

        if (error) throw error;
        
        setShowNewField(false);
        setNewField({
          id: '',
          label: '',
          type: 'text',
          required: false,
          enabled: true,
          options: [],
          display_order: 0
        });
      } else {
        const { error } = await supabase
          .from('quote_fields')
          .update({
            label: field.label,
            type: field.type,
            required: field.required,
            enabled: field.enabled,
            options: field.options || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', field.id);

        if (error) throw error;
        setEditingField(null);
      }

      toast({
        title: "Success",
        description: `Quote field ${isNew ? 'created' : 'updated'} successfully`,
      });

      fetchFields();
    } catch (error: any) {
      console.error('Save error:', error);
      toast({
        title: "Error",
        description: error.message || `Failed to ${isNew ? 'create' : 'update'} quote field`,
        variant: "destructive",
      });
    }
  };

  const handleDeleteField = async (fieldId: string) => {
    if (!confirm('Are you sure you want to delete this field?')) return;

    try {
      const { error } = await supabase
        .from('quote_fields')
        .delete()
        .eq('id', fieldId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Quote field deleted successfully",
      });

      fetchFields();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete quote field",
        variant: "destructive",
      });
    }
  };

  const handleMoveField = async (fieldId: string, direction: 'up' | 'down') => {
    const currentIndex = fields.findIndex(f => f.id === fieldId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= fields.length) return;

    const updatedFields = [...fields];
    [updatedFields[currentIndex], updatedFields[newIndex]] = [updatedFields[newIndex], updatedFields[currentIndex]];

    try {
      const updates = updatedFields.map((field, index) => ({
        id: field.id,
        display_order: index
      }));

      for (const update of updates) {
        await supabase
          .from('quote_fields')
          .update({ display_order: update.display_order })
          .eq('id', update.id);
      }

      fetchFields();
    } catch (error: any) {
      console.error('Reorder error:', error);
      toast({
        title: "Error",
        description: "Failed to reorder fields",
        variant: "destructive",
      });
    }
  };

  const FieldEditor = ({ field, isNew = false }: { field: any, isNew?: boolean }) => {
    const [localField, setLocalField] = useState(field);
    const [optionsText, setOptionsText] = useState(
      field.options ? field.options.join('\n') : ''
    );

    const handleSave = () => {
      const options = field.type === 'select' && optionsText.trim() 
        ? optionsText.split('\n').filter(opt => opt.trim()) 
        : [];
      
      handleSaveField({ ...localField, options }, isNew);
    };

    return (
      <div className="space-y-4 p-4 bg-gray-800 rounded border border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-white">Field Label *</Label>
            <Input
              value={localField.label}
              onChange={(e) => setLocalField(prev => ({ ...prev, label: e.target.value }))}
              className="bg-gray-700 border-gray-600 text-white"
              placeholder="Enter field label"
            />
          </div>
          <div>
            <Label className="text-white">Field Type</Label>
            <Select 
              value={localField.type} 
              onValueChange={(value) => setLocalField(prev => ({ ...prev, type: value }))}
            >
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="textarea">Textarea</SelectItem>
                <SelectItem value="select">Select</SelectItem>
                <SelectItem value="number">Number</SelectItem>
                <SelectItem value="checkbox">Checkbox</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {localField.type === 'select' && (
          <div>
            <Label className="text-white">Options (one per line)</Label>
            <textarea
              value={optionsText}
              onChange={(e) => setOptionsText(e.target.value)}
              className="w-full h-24 p-2 bg-gray-700 border border-gray-600 text-white rounded"
              placeholder="Option 1&#10;Option 2&#10;Option 3"
            />
          </div>
        )}

        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={localField.required}
              onCheckedChange={(checked) => setLocalField(prev => ({ ...prev, required: !!checked }))}
            />
            <Label className="text-white">Required</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={localField.enabled}
              onCheckedChange={(checked) => setLocalField(prev => ({ ...prev, enabled: !!checked }))}
            />
            <Label className="text-white">Enabled</Label>
          </div>
        </div>

        <div className="flex space-x-2">
          <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700 text-white">
            <Save className="mr-2 h-4 w-4" />
            {isNew ? 'Create Field' : 'Save Changes'}
          </Button>
          <Button 
            onClick={() => {
              if (isNew) {
                setShowNewField(false);
              } else {
                setEditingField(null);
              }
            }}
            variant="outline"
            className="border-gray-600 text-gray-300 hover:bg-gray-800"
          >
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-none p-6 space-y-6 bg-gray-950 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold text-white mb-2">Quote Field Configuration</h1>
          <p className="text-gray-400">Configure custom fields for quote requests</p>
        </div>
        <Button onClick={fetchFields} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Settings className="mr-2 h-4 w-4" />
          {loading ? "Loading..." : "Refresh"}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start bg-gray-800 border-gray-700">
          <TabsTrigger value="overview" className="text-white data-[state=active]:bg-blue-600">
            <List className="mr-2 h-4 w-4" />
            Field Overview ({fields.length})
          </TabsTrigger>
          <TabsTrigger value="manage" className="text-white data-[state=active]:bg-blue-600">
            <Settings className="mr-2 h-4 w-4" />
            Manage Fields
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {loading ? (
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-8 text-center">
                <div className="text-white">Loading fields...</div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Quick Field Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left text-gray-400 pb-2 text-sm">#</th>
                        <th className="text-left text-gray-400 pb-2 text-sm">Label</th>
                        <th className="text-left text-gray-400 pb-2 text-sm">Type</th>
                        <th className="text-left text-gray-400 pb-2 text-sm">Status</th>
                        <th className="text-left text-gray-400 pb-2 text-sm">Required</th>
                        <th className="text-left text-gray-400 pb-2 text-sm">Options</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fields.map((field, index) => (
                        <tr key={field.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                          <td className="py-2 text-gray-300 text-sm">{index + 1}</td>
                          <td className="py-2 text-white text-sm font-medium">{field.label}</td>
                          <td className="py-2 text-gray-300 text-sm">
                            <Badge variant="outline" className="text-xs">
                              {field.type}
                            </Badge>
                          </td>
                          <td className="py-2 text-sm">
                            <Badge className={field.enabled ? 'bg-green-600' : 'bg-red-600'}>
                              {field.enabled ? 'Enabled' : 'Disabled'}
                            </Badge>
                          </td>
                          <td className="py-2 text-sm">
                            {field.required ? (
                              <Badge className="bg-orange-600">Required</Badge>
                            ) : (
                              <span className="text-gray-400">Optional</span>
                            )}
                          </td>
                          <td className="py-2 text-gray-300 text-sm">
                            {field.options ? `${field.options.length} options` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="manage" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl text-white">Manage Fields</h2>
            <Button
              onClick={() => setShowNewField(true)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add New Field
            </Button>
          </div>

          {showNewField && (
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">Create New Field</CardTitle>
              </CardHeader>
              <CardContent>
                <FieldEditor field={newField} isNew={true} />
              </CardContent>
            </Card>
          )}

          <div className="space-y-3">
            {fields.map((field, index) => (
              <Card key={field.id} className="bg-gray-900 border-gray-800">
                <CardContent className="p-4">
                  {editingField?.id === field.id ? (
                    <FieldEditor field={editingField} />
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="text-gray-400 text-sm w-8">#{index + 1}</div>
                        <div>
                          <h3 className="text-white font-medium">{field.label}</h3>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {field.type}
                            </Badge>
                            <Badge className={field.enabled ? 'bg-green-600' : 'bg-red-600'}>
                              {field.enabled ? 'Enabled' : 'Disabled'}
                            </Badge>
                            {field.required && (
                              <Badge className="bg-orange-600">Required</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          onClick={() => handleMoveField(field.id, 'up')}
                          disabled={index === 0}
                          size="sm"
                          variant="ghost"
                          className="text-gray-400 hover:text-white"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => handleMoveField(field.id, 'down')}
                          disabled={index === fields.length - 1}
                          size="sm"
                          variant="ghost"
                          className="text-gray-400 hover:text-white"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => setEditingField(field)}
                          size="sm"
                          variant="ghost"
                          className="text-blue-400 hover:text-blue-300"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => handleDeleteField(field.id)}
                          size="sm"
                          variant="ghost"
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default QuoteFieldConfiguration;
