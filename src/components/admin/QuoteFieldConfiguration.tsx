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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Shield,
  GripVertical
} from "lucide-react";
import { User } from "@/types/auth";
import { useToast } from "@/hooks/use-toast";
import { getSupabaseClient, getSupabaseAdminClient, isAdminAvailable } from "@/integrations/supabase/client";

const supabase = getSupabaseClient();
const supabaseAdmin = getSupabaseAdminClient();;

interface QuoteField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'date' | 'email' | 'tel';
  required: boolean;
  enabled: boolean;
  options?: string[];
  display_order: number;
  include_in_pdf?: boolean;
}

interface QuoteFieldConfigurationProps {
  user: User;
}

const QuoteFieldConfiguration = ({ user }: QuoteFieldConfigurationProps) => {
  const [quoteFields, setQuoteFields] = useState<QuoteField[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingField, setEditingField] = useState<QuoteField | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [draggedFieldId, setDraggedFieldId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleDragStart = (e: React.DragEvent, field: QuoteField) => {
    e.dataTransfer.setData('text/plain', field.id);
    setDraggedFieldId(field.id);
  };

  const handleDragOver = (e: React.DragEvent, targetField: QuoteField) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent, targetField: QuoteField) => {
    e.preventDefault();
    e.stopPropagation();

    const draggedId = draggedFieldId;
    if (!draggedId) return;

    const sourceIndex = quoteFields.findIndex(field => field.id === draggedId);
    const targetIndex = quoteFields.findIndex(field => field.id === targetField.id);
    
    if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) return;

    // Swap the fields
    const updatedFields = [...quoteFields];
    const [movedField] = updatedFields.splice(sourceIndex, 1);
    updatedFields.splice(targetIndex, 0, movedField);
    
    // Update display orders
    updatedFields.forEach((field, index) => {
      field.display_order = index + 1;
    });

    setQuoteFields(updatedFields);
    
    // Save new orders to database
    Promise.all(updatedFields.map(field => 
      supabase
        .from('quote_fields')
        .update({ display_order: field.display_order })
        .eq('id', field.id)
    )).then(() => {
      toast({
        title: "Success",
        description: "Field order updated successfully"
      });
    }).catch(error => {
      console.error('Error updating field order:', error);
      toast({
        title: "Error",
        description: "Failed to update field order",
        variant: "destructive"
      });
    });

    setDraggedFieldId(null);
  };

  const DragHandle = ({ field }: { field: QuoteField }) => (
    <div 
      className="flex items-center cursor-move hover:bg-gray-700 rounded-sm p-1 transition-colors"
    >
      <GripVertical className="h-4 w-4 mr-1" />
      <span className="text-xs text-gray-400">#{field.display_order}</span>
    </div>
  );

  useEffect(() => {
    checkAuthAndRole();
    fetchQuoteFields();
  }, []);

  const checkAuthAndRole = async () => {
    try {
      setAuthLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setIsAuthenticated(true);
        
        // Check if user is admin
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        
        setIsAdmin(profile?.role === 'admin');
      }
    } catch (error) {
      console.error('Error checking auth:', error);
    } finally {
      setAuthLoading(false);
    }
  };

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
        display_order: field.display_order || 0,
        include_in_pdf: field.include_in_pdf || false
      }));

      // Sort fields by display_order and then by label
      fields.sort((a, b) => {
        if (a.display_order === b.display_order) {
          return a.label.localeCompare(b.label);
        }
        return a.display_order - b.display_order;
      });

      // Fix duplicate display orders by reassigning them
      const uniqueFields = [...fields];
      let currentOrder = 1;
      
      // Group fields by display_order
      const groups = uniqueFields.reduce((acc, field) => {
        const key = field.display_order;
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(field);
        return acc;
      }, {} as Record<number, QuoteField[]>);

      // Reassign display orders for fields with duplicates
      Object.values(groups).forEach(group => {
        if (group.length > 1) {
          // If there are duplicates, assign sequential orders
          group.forEach((field, index) => {
            field.display_order = currentOrder + index;
          });
          currentOrder += group.length;
        } else {
          // For single fields, use their current order if valid
          if (group[0].display_order > 0) {
            currentOrder = Math.max(currentOrder, group[0].display_order + 1);
          } else {
            group[0].display_order = currentOrder;
            currentOrder++;
          }
        }
      });

      // Sort again with new display orders
      uniqueFields.sort((a, b) => a.display_order - b.display_order);

      setQuoteFields(uniqueFields);
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
          display_order: fieldData.display_order,
          include_in_pdf: fieldData.include_in_pdf || false
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
        description: error.message || "Failed to create quote field",
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
          display_order: fieldData.display_order,
          include_in_pdf: fieldData.include_in_pdf || false
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
        description: error.message || "Failed to update quote field",
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
        description: error.message || "Failed to delete quote field",
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
        description: error.message || "Failed to toggle field status",
        variant: "destructive"
      });
    }
  };

  const toggleIncludeInQuote = async (fieldId: string) => {
    const field = quoteFields.find(f => f.id === fieldId);
    if (!field) return;

    try {
      const { error } = await supabase
        .from('quote_fields')
        .update({ include_in_pdf: !field.include_in_pdf })
        .eq('id', fieldId);

      if (error) throw error;

      await fetchQuoteFields();
      toast({
        title: "Success",
        description: `Field ${!field.include_in_pdf ? 'added to' : 'removed from'} quote`,
      });
    } catch (error) {
      console.error('Error toggling include in quote:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to toggle include in quote",
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

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
        <span className="ml-2 text-white">Loading...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="space-y-6">
        <Alert className="bg-red-900/20 border-red-600">
          <Shield className="h-4 w-4" />
          <AlertDescription className="text-red-400">
            You must be logged in to manage quote fields. Please sign in to continue.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <Alert className="bg-orange-900/20 border-orange-600">
          <Shield className="h-4 w-4" />
          <AlertDescription className="text-orange-400">
            You need administrator privileges to manage quote fields. Contact your system administrator for access.
          </AlertDescription>
        </Alert>
        
        {/* Show read-only view for non-admins */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Current Quote Fields (Read-Only)</CardTitle>
            <CardDescription className="text-gray-400">
              These are the fields currently configured for quote requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {quoteFields.map((field) => (
                <div 
                  key={field.id} 
                  className="flex items-center justify-between p-2 bg-gray-800 rounded-md border border-gray-700 hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">
                        {field.label}
                      </div>
                      <div className="text-xs text-gray-400">
                        {field.type.toUpperCase()}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id={`enabled-${field.id}`}
                        checked={field.enabled}
                        onCheckedChange={() => toggleFieldEnabled(field.id)}
                        className={`
                          data-[state=checked]:bg-green-500
                          data-[state=unchecked]:bg-red-500
                          hover:bg-gray-700
                        `}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-medium text-white">Quote Field Configuration</h2>
          <p className="text-gray-400 text-sm">Configure and manage quote request form fields</p>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {quoteFields.map((field, index) => (
          <Card 
            key={field.id} 
            draggable={true}
            onDragStart={(e) => handleDragStart(e, field)}
            onDragOver={(e) => handleDragOver(e, field)}
            onDrop={(e) => handleDrop(e, field)}
            className={`bg-gray-900 border-gray-800 hover:bg-gray-800 transition-colors ${
              field.id === draggedFieldId ? 'opacity-50' : ''
            }`}
          >
            <CardHeader className="p-3">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <DragHandle field={field} />
                        <CardTitle className={`${field.required ? 'text-red-400' : 'text-white'} text-sm font-medium truncate`}>
                          {field.label}
                        </CardTitle>
                      </div>
                       <div className="flex gap-1 mt-1">
                        <Badge 
                          variant="outline" 
                          className="text-xs capitalize border-gray-600 text-gray-400"
                        >
                          {field.type.toUpperCase()}
                        </Badge>
                        {field.include_in_pdf && (
                          <Badge 
                            variant="outline" 
                            className="text-xs bg-blue-900/30 text-blue-400 border-blue-600"
                          >
                            QUOTE
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Label htmlFor={`include-quote-${field.id}`} className="text-xs text-gray-400 cursor-pointer">
                          Include in the Quote
                        </Label>
                        <Switch
                          id={`include-quote-${field.id}`}
                          checked={field.include_in_pdf || false}
                          onCheckedChange={() => toggleIncludeInQuote(field.id)}
                          className="data-[state=checked]:bg-blue-500"
                        />
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <Switch
                        id={`enabled-${field.id}`}
                        checked={field.enabled}
                        onCheckedChange={() => toggleFieldEnabled(field.id)}
                        className={`
                          data-[state=checked]:bg-green-500
                          data-[state=unchecked]:bg-red-500
                          hover:bg-gray-700
                        `}
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 mt-1 text-xs text-gray-400">
                    <code className="bg-gray-800 px-1 rounded">{field.id}</code>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditDialog(field)}
                    className="text-blue-400 hover:text-blue-300"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteField(field.id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
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
    display_order: initialData?.display_order || 1,
    include_in_pdf: initialData?.include_in_pdf ?? false
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

      <div className="grid grid-cols-3 gap-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="required"
            checked={formData.required}
            onCheckedChange={(required) => setFormData({ ...formData, required })}
            className={`
              data-[state=checked]:bg-red-500
              data-[state=unchecked]:bg-gray-500
              hover:bg-gray-700
            `}
          />
          <Label htmlFor="required" className={`${formData.required ? 'text-red-400' : 'text-white'} text-sm font-medium`}>Required</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="enabled"
            checked={formData.enabled}
            onCheckedChange={(enabled) => setFormData({ ...formData, enabled })}
            className={`
              data-[state=checked]:bg-green-500
              data-[state=unchecked]:bg-red-500
              hover:bg-gray-700
            `}
          />
          <Label htmlFor="enabled" className="text-white">Enabled</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="include_in_pdf"
            checked={formData.include_in_pdf}
            onCheckedChange={(include_in_pdf) => setFormData({ ...formData, include_in_pdf })}
            className={`
              data-[state=checked]:bg-blue-500
              data-[state=unchecked]:bg-gray-500
              hover:bg-gray-700
            `}
          />
          <Label htmlFor="include_in_pdf" className="text-white">Include in the Quote</Label>
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          className="border-gray-600 bg-gray-800 text-gray-200 hover:bg-gray-700 hover:text-white focus:ring-2 focus:ring-gray-500"
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          className="bg-red-600 hover:bg-red-700 text-white focus:ring-2 focus:ring-red-500"
        >
          {initialData ? 'Update' : 'Create'} Field
        </Button>
      </div>
    </form>
  );
};

export default QuoteFieldConfiguration;
