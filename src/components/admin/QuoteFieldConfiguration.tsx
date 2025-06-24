import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from "@/hooks/use-toast"
import { supabaseQuoteFieldsService, QuoteField } from '@/services/supabaseQuoteFieldsService';

interface QuoteField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'textarea' | 'date';
  required: boolean;
  options?: string[];
  enabled: boolean;
  display_order?: number;
}

const QuoteFieldConfiguration = () => {
  const [fields, setFields] = useState<QuoteField[]>([]);
  const [loading, setLoading] = useState(true);
  const [newField, setNewField] = useState<QuoteField>({
    id: '',
    label: '',
    type: 'text',
    required: false,
    enabled: true,
    options: []
  });
  const [showAddField, setShowAddField] = useState(false);
  const [editingField, setEditingField] = useState<QuoteField | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadFields();
  }, []);

  const loadFields = async () => {
    try {
      setLoading(true);
      // Import the Supabase service
      const allFields = await supabaseQuoteFieldsService.getAllFields();
      setFields(allFields);
    } catch (error) {
      console.error('Error loading fields:', error);
      toast({
        title: "Error",
        description: "Failed to load quote fields.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveFields = async () => {
    try {
      await supabaseQuoteFieldsService.updateFields(fields);
      toast({
        title: "Success",
        description: "Quote fields updated successfully.",
      });
    } catch (error) {
      console.error('Error saving fields:', error);
      toast({
        title: "Error",
        description: "Failed to save quote fields.",
        variant: "destructive"
      });
    }
  };

  const handleAddField = () => {
    if (!newField.id || !newField.label) {
      toast({
        title: "Error",
        description: "ID and Label are required.",
        variant: "destructive"
      });
      return;
    }

    if (fields.find(field => field.id === newField.id)) {
      toast({
        title: "Error",
        description: "A field with this ID already exists.",
        variant: "destructive"
      });
      return;
    }

    setFields([...fields, newField]);
    setNewField({ id: '', label: '', type: 'text', required: false, enabled: true, options: [] });
    setShowAddField(false);
  };

  const handleUpdateField = () => {
    if (!editingField) return;

    const updatedFields = fields.map(field =>
      field.id === editingField.id ? editingField : field
    );
    setFields(updatedFields);
    setEditingField(null);
  };

  const handleRemoveField = (id: string) => {
    setFields(fields.filter(field => field.id !== id));
  };

  const handleOptionChange = (index: number, value: string) => {
    setNewField({
      ...newField,
      options: [...(newField.options || []), value]
    });
  };

  const handleFieldChange = (id: string, field: Partial<QuoteField>) => {
    setFields(fields.map(f => f.id === id ? { ...f, ...field } : f));
  };

  if (loading) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Quote Field Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-gray-400 text-center py-8">Loading quote fields...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Quote Field Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Required</TableHead>
                <TableHead>Enabled</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.map((field) => (
                <TableRow key={field.id}>
                  <TableCell className="font-medium">{field.id}</TableCell>
                  <TableCell>
                    <Input
                      type="text"
                      value={field.label}
                      onChange={(e) => handleFieldChange(field.id, { label: e.target.value })}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={field.type}
                      onValueChange={(value) => handleFieldChange(field.id, { type: value as QuoteField['type'] })}
                    >
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                        <SelectValue placeholder={field.type} />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        <SelectItem value="text" className="text-white hover:bg-gray-700">Text</SelectItem>
                        <SelectItem value="number" className="text-white hover:bg-gray-700">Number</SelectItem>
                        <SelectItem value="select" className="text-white hover:bg-gray-700">Select</SelectItem>
                        <SelectItem value="textarea" className="text-white hover:bg-gray-700">Textarea</SelectItem>
                        <SelectItem value="date" className="text-white hover:bg-gray-700">Date</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Checkbox
                      checked={field.required}
                      onCheckedChange={(checked) => handleFieldChange(field.id, { required: !!checked })}
                    />
                  </TableCell>
                  <TableCell>
                    <Checkbox
                      checked={field.enabled}
                      onCheckedChange={(checked) => handleFieldChange(field.id, { enabled: !!checked })}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveField(field.id)}
                        className="text-red-500 hover:bg-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Add New Field</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-white">ID</Label>
            <Input
              type="text"
              value={newField.id}
              onChange={(e) => setNewField({ ...newField, id: e.target.value })}
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>
          <div>
            <Label className="text-white">Label</Label>
            <Input
              type="text"
              value={newField.label}
              onChange={(e) => setNewField({ ...newField, label: e.target.value })}
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>
          <div>
            <Label className="text-white">Type</Label>
            <Select onValueChange={(value) => setNewField({ ...newField, type: value as QuoteField['type'] })}>
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                <SelectValue placeholder="Select a type" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="text" className="text-white hover:bg-gray-700">Text</SelectItem>
                <SelectItem value="number" className="text-white hover:bg-gray-700">Number</SelectItem>
                <SelectItem value="select" className="text-white hover:bg-gray-700">Select</SelectItem>
                <SelectItem value="textarea" className="text-white hover:bg-gray-700">Textarea</SelectItem>
                <SelectItem value="date" className="text-white hover:bg-gray-700">Date</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-white">Required</Label>
            <Checkbox
              checked={newField.required}
              onCheckedChange={(checked) => setNewField({ ...newField, required: !!checked })}
            />
          </div>
          <div>
            <Label className="text-white">Enabled</Label>
            <Checkbox
              checked={newField.enabled}
              onCheckedChange={(checked) => setNewField({ ...newField, enabled: !!checked })}
            />
          </div>
          {newField.type === 'select' && (
            <div>
              <Label className="text-white">Options (comma-separated)</Label>
              <Input
                type="text"
                placeholder="Option 1, Option 2, Option 3"
                className="bg-gray-800 border-gray-700 text-white"
                onChange={(e) => setNewField({ ...newField, options: e.target.value.split(',').map(s => s.trim()) })}
              />
            </div>
          )}
          <Button onClick={handleAddField} className="bg-green-600 hover:bg-green-700 text-white">
            Add Field
          </Button>
        </CardContent>
      </Card>

      <Button onClick={saveFields} className="bg-blue-600 hover:bg-blue-700 text-white">
        Save Changes
      </Button>
    </div>
  );
};

export default QuoteFieldConfiguration;
