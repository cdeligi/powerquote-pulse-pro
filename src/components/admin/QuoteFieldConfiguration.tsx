
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Settings,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import { User } from "@/types/auth";
import { useToast } from "@/hooks/use-toast";

interface QuoteField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'date' | 'email' | 'tel';
  required: boolean;
  enabled: boolean;
  placeholder?: string;
  helpText?: string;
  options?: string[]; // For select fields
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  section: 'customer' | 'project' | 'technical' | 'commercial' | 'delivery';
  order: number;
}

interface QuoteFieldConfigurationProps {
  user: User;
}

const QuoteFieldConfiguration = ({ user }: QuoteFieldConfigurationProps) => {
  const [quoteFields, setQuoteFields] = useState<QuoteField[]>([
    {
      id: 'customer-name',
      name: 'customerName',
      label: 'Customer Name',
      type: 'text',
      required: true,
      enabled: true,
      placeholder: 'Enter customer name',
      section: 'customer',
      order: 1
    },
    {
      id: 'oracle-customer-id',
      name: 'oracleCustomerId',
      label: 'Oracle Customer ID',
      type: 'text',
      required: true,
      enabled: true,
      placeholder: 'Enter Oracle Customer ID',
      section: 'customer',
      order: 2
    },
    {
      id: 'sfdc-opportunity',
      name: 'sfdcOpportunity',
      label: 'SFDC Opportunity ID',
      type: 'text',
      required: true,
      enabled: true,
      placeholder: 'Enter SFDC Opportunity ID',
      helpText: 'Mandatory field for all quotes',
      section: 'customer',
      order: 3
    },
    {
      id: 'priority',
      name: 'priority',
      label: 'Priority',
      type: 'select',
      required: true,
      enabled: true,
      options: ['High', 'Medium', 'Low', 'Urgent'],
      section: 'commercial',
      order: 4
    },
    {
      id: 'shipping-terms',
      name: 'shippingTerms',
      label: 'Shipping Terms',
      type: 'text',
      required: false,
      enabled: true,
      placeholder: 'Enter shipping terms',
      section: 'delivery',
      order: 5
    },
    {
      id: 'payment-terms',
      name: 'paymentTerms',
      label: 'Payment Terms',
      type: 'text',
      required: false,
      enabled: true,
      placeholder: 'Enter payment terms',
      section: 'commercial',
      order: 6
    },
    {
      id: 'quote-currency',
      name: 'quoteCurrency',
      label: 'Quote Currency',
      type: 'select',
      required: true,
      enabled: true,
      options: ['USD', 'EURO', 'GBP', 'CAD'],
      section: 'commercial',
      order: 7
    },
    {
      id: 'is-rep-involved',
      name: 'isRepInvolved',
      label: 'Rep Involved',
      type: 'select',
      required: false,
      enabled: true,
      options: ['Yes', 'No'],
      section: 'commercial',
      order: 8
    }
  ]);

  const [editingField, setEditingField] = useState<QuoteField | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('all');
  const { toast } = useToast();

  const sections = [
    { id: 'all', label: 'All Fields', color: 'bg-gray-600' },
    { id: 'customer', label: 'Customer Info', color: 'bg-blue-600' },
    { id: 'project', label: 'Project Details', color: 'bg-green-600' },
    { id: 'technical', label: 'Technical Specs', color: 'bg-purple-600' },
    { id: 'commercial', label: 'Commercial', color: 'bg-orange-600' },
    { id: 'delivery', label: 'Delivery', color: 'bg-teal-600' }
  ];

  const getFilteredFields = () => {
    if (activeSection === 'all') return quoteFields;
    return quoteFields.filter(field => field.section === activeSection);
  };

  const handleCreateField = (fieldData: Omit<QuoteField, 'id'>) => {
    const newField: QuoteField = {
      ...fieldData,
      id: `field-${Date.now()}`
    };
    setQuoteFields(prev => [...prev, newField].sort((a, b) => a.order - b.order));
    setDialogOpen(false);
    setEditingField(null);
    toast({
      title: "Success",
      description: "Quote field created successfully"
    });
  };

  const handleUpdateField = (fieldData: Omit<QuoteField, 'id'>) => {
    if (!editingField) return;
    setQuoteFields(prev => prev.map(f => 
      f.id === editingField.id ? { ...fieldData, id: editingField.id } : f
    ).sort((a, b) => a.order - b.order));
    setDialogOpen(false);
    setEditingField(null);
    toast({
      title: "Success",
      description: "Quote field updated successfully"
    });
  };

  const handleDeleteField = (fieldId: string) => {
    setQuoteFields(prev => prev.filter(f => f.id !== fieldId));
    toast({
      title: "Success",
      description: "Quote field deleted successfully"
    });
  };

  const toggleFieldEnabled = (fieldId: string) => {
    setQuoteFields(prev => prev.map(f => 
      f.id === fieldId ? { ...f, enabled: !f.enabled } : f
    ));
  };

  const openEditDialog = (field: QuoteField) => {
    setEditingField(field);
    setDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingField(null);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Quote Field Configuration</h2>
          <p className="text-gray-400">Configure and manage quote request form fields</p>
        </div>
        <Button 
          className="bg-red-600 hover:bg-red-700"
          onClick={openCreateDialog}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Field
        </Button>
      </div>

      {/* Section Filter */}
      <div className="flex flex-wrap gap-2">
        {sections.map((section) => (
          <Button
            key={section.id}
            variant={activeSection === section.id ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveSection(section.id)}
            className={activeSection === section.id ? `${section.color} hover:opacity-80` : "border-gray-600 text-gray-300 hover:bg-gray-800"}
          >
            {section.label}
            {section.id !== 'all' && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {quoteFields.filter(f => f.section === section.id).length}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Fields Grid */}
      <div className="grid gap-4">
        {getFilteredFields().map((field) => (
          <Card key={field.id} className="bg-gray-900 border-gray-800">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <CardTitle className="text-white">{field.label}</CardTitle>
                    <Badge 
                      variant="outline" 
                      className={`text-xs capitalize ${
                        sections.find(s => s.id === field.section)?.color || 'bg-gray-600'
                      } border-none text-white`}
                    >
                      {field.section}
                    </Badge>
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
                    Field Name: <code className="text-xs bg-gray-800 px-1 rounded">{field.name}</code>
                    {field.helpText && (
                      <span className="block mt-1">{field.helpText}</span>
                    )}
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
                  <p className="text-white font-medium">{field.order}</p>
                </div>
                <div>
                  <p className="text-gray-400">Placeholder</p>
                  <p className="text-white font-medium">{field.placeholder || 'None'}</p>
                </div>
                {field.options && (
                  <div className="col-span-2">
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
    name: initialData?.name || '',
    label: initialData?.label || '',
    type: initialData?.type || 'text',
    required: initialData?.required ?? false,
    enabled: initialData?.enabled ?? true,
    placeholder: initialData?.placeholder || '',
    helpText: initialData?.helpText || '',
    options: initialData?.options || [],
    section: initialData?.section || 'customer',
    order: initialData?.order || 1
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
          <Label htmlFor="name" className="text-white">Field Name (Code)</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="bg-gray-800 border-gray-700 text-white"
            placeholder="camelCase field name"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
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
        <div>
          <Label htmlFor="section" className="text-white">Section</Label>
          <Select
            value={formData.section}
            onValueChange={(value: QuoteField['section']) => setFormData({ ...formData, section: value })}
          >
            <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="customer" className="text-white">Customer Info</SelectItem>
              <SelectItem value="project" className="text-white">Project Details</SelectItem>
              <SelectItem value="technical" className="text-white">Technical Specs</SelectItem>
              <SelectItem value="commercial" className="text-white">Commercial</SelectItem>
              <SelectItem value="delivery" className="text-white">Delivery</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="placeholder" className="text-white">Placeholder Text</Label>
          <Input
            id="placeholder"
            value={formData.placeholder}
            onChange={(e) => setFormData({ ...formData, placeholder: e.target.value })}
            className="bg-gray-800 border-gray-700 text-white"
          />
        </div>
        <div>
          <Label htmlFor="order" className="text-white">Display Order</Label>
          <Input
            id="order"
            type="number"
            value={formData.order}
            onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
            className="bg-gray-800 border-gray-700 text-white"
            min="1"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="helpText" className="text-white">Help Text</Label>
        <Textarea
          id="helpText"
          value={formData.helpText}
          onChange={(e) => setFormData({ ...formData, helpText: e.target.value })}
          className="bg-gray-800 border-gray-700 text-white"
          rows={2}
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
