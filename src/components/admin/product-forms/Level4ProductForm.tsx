import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus } from "lucide-react";
import { Level3Product } from "@/types/product";
import { Level4Configuration } from "@/types/level4";
import { productDataService } from "@/services/productDataService";

interface Level4ProductFormProps {
  configuration?: Level4Configuration;
  onSave: (configuration: Omit<Level4Configuration, 'id'> | Level4Configuration) => void;
  onCancel: () => void;
}

export const Level4ProductForm: React.FC<Level4ProductFormProps> = ({
  configuration,
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState<Partial<Level4Configuration>>({
    level3_product_id: '',
    template_type: 'OPTION_1',
    field_label: '',
    info_url: null,
    max_inputs: 1,
    fixed_inputs: null,
    options: [],
    ...configuration
  });

  const [level3Products, setLevel3Products] = useState<Level3Product[]>([]);
  const [newOption, setNewOption] = useState({ label: '', value: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadLevel3Products = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log('Loading Level 3 products for Level 4 form...');
        const products = await productDataService.getLevel3Products();
        // Filter to products with has_level4 or requires_level4_config enabled
        const level4Products = products.filter(p => p.has_level4 || p.requires_level4_config);
        console.log('Loaded Level 3 products with Level 4:', level4Products.length);
        
        setLevel3Products(level4Products);
        
      } catch (error) {
        console.error('Error loading Level 3 products:', error);
        setError('Failed to load Level 3 products');
        setLevel3Products([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadLevel3Products();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.field_label?.trim()) {
      alert('Please enter a field label');
      return;
    }
    
    if (!formData.level3_product_id) {
      alert('Please select a Level 3 product');
      return;
    }
    
    if (!formData.options || formData.options.length === 0) {
      alert('Please add at least one option');
      return;
    }

    if (formData.template_type === 'OPTION_1' && (!formData.max_inputs || formData.max_inputs < 1)) {
      alert('Please set max inputs to at least 1 for Option 1');
      return;
    }

    if (formData.template_type === 'OPTION_2' && (!formData.fixed_inputs || formData.fixed_inputs < 1)) {
      alert('Please set fixed inputs to at least 1 for Option 2');
      return;
    }
    
    const configurationToSave: Omit<Level4Configuration, 'id'> = {
      level3_product_id: formData.level3_product_id!,
      template_type: formData.template_type as 'OPTION_1' | 'OPTION_2',
      field_label: formData.field_label!.trim(),
      info_url: formData.info_url || null,
      max_inputs: formData.template_type === 'OPTION_1' ? formData.max_inputs! : null,
      fixed_inputs: formData.template_type === 'OPTION_2' ? formData.fixed_inputs! : null,
      options: formData.options || []
    };
    
    onSave(configurationToSave);
  };

  const addOption = () => {
    if (!newOption.label?.trim() || !newOption.value?.trim()) {
      alert('Please enter both label and value');
      return;
    }
    
    const option = {
      id: `option-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      level4_configuration_id: 'temp-id', // Will be set properly when saved
      label: newOption.label.trim(),
      value: newOption.value.trim(),
      display_order: (formData.options?.length || 0),
      is_default: (formData.options?.length || 0) === 0 // First option is default
    };
    
    setFormData(prev => ({
      ...prev,
      options: [...(prev.options || []), option]
    }));
    
    setNewOption({ label: '', value: '' });
  };

  const removeOption = (optionId: string) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options?.filter(opt => opt.id !== optionId) || []
    }));
  };

  const selectedLevel3 = level3Products.find(p => p.id === formData.level3_product_id);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <p className="text-gray-600">Loading Level 3 products...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8 text-red-600">
          <p>{error}</p>
          <Button onClick={onCancel} variant="outline" className="mt-4">
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  if (level3Products.length === 0) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Level 3 Products with Level 4 Available</h3>
          <p className="text-gray-600 mb-4">
            You need Level 3 products with Level 4 enabled before you can create configurations.
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Go to the Level 3 Products tab and enable "Has Level 4" for products you want to configure.
          </p>
          <Button onClick={onCancel} variant="outline">
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="level3Product">Level 3 Product *</Label>
          <Select
            value={formData.level3_product_id || ''}
            onValueChange={(value) => setFormData(prev => ({ ...prev, level3_product_id: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Level 3 Product" />
            </SelectTrigger>
            <SelectContent>
              {level3Products.map((product) => (
                <SelectItem key={product.id} value={product.id}>
                  {product.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="templateType">Template Type *</Label>
          <Select
            value={formData.template_type || 'OPTION_1'}
            onValueChange={(value: 'OPTION_1' | 'OPTION_2') => 
              setFormData(prev => ({ 
                ...prev, 
                template_type: value,
                max_inputs: value === 'OPTION_1' ? (prev.max_inputs || 1) : null,
                fixed_inputs: value === 'OPTION_2' ? (prev.fixed_inputs || 1) : null
              }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="OPTION_1">Option 1 (Variable Inputs)</SelectItem>
              <SelectItem value="OPTION_2">Option 2 (Fixed Inputs)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="fieldLabel">Field Label *</Label>
        <Input
          id="fieldLabel"
          value={formData.field_label || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, field_label: e.target.value }))}
          placeholder="Enter field label (e.g., Select model)"
          required
        />
      </div>

      <div>
        <Label htmlFor="infoUrl">Info URL (optional)</Label>
        <Input
          id="infoUrl"
          value={formData.info_url || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, info_url: e.target.value }))}
          placeholder="Enter help URL"
        />
      </div>

      {formData.template_type === 'OPTION_1' && (
        <div>
          <Label htmlFor="maxInputs">Max Inputs *</Label>
          <Input
            id="maxInputs"
            type="number"
            min="1"
            value={formData.max_inputs || 1}
            onChange={(e) => setFormData(prev => ({ ...prev, max_inputs: parseInt(e.target.value) || 1 }))}
            required
          />
        </div>
      )}

      {formData.template_type === 'OPTION_2' && (
        <div>
          <Label htmlFor="fixedInputs">Fixed Inputs *</Label>
          <Input
            id="fixedInputs"
            type="number"
            min="1"
            value={formData.fixed_inputs || 1}
            onChange={(e) => setFormData(prev => ({ ...prev, fixed_inputs: parseInt(e.target.value) || 1 }))}
            required
          />
        </div>
      )}

      {selectedLevel3 && (
        <div className="p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700">
            This configuration will be available for: <strong>{selectedLevel3.name}</strong>
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Dropdown Options</CardTitle>
          <p className="text-sm text-gray-600">
            Add options that users can select from
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Option Label</Label>
              <Input
                value={newOption.label}
                onChange={(e) => setNewOption(prev => ({ ...prev, label: e.target.value }))}
                placeholder="e.g., Basic Model"
              />
            </div>
            <div>
              <Label>Option Value</Label>
              <Input
                value={newOption.value}
                onChange={(e) => setNewOption(prev => ({ ...prev, value: e.target.value }))}
                placeholder="e.g., basic"
              />
            </div>
          </div>
          
          <Button 
            type="button" 
            onClick={addOption} 
            className="w-full" 
            variant="outline"
            disabled={!newOption.label.trim() || !newOption.value.trim()}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Option
          </Button>

          {formData.options && formData.options.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Current Options:</Label>
              {formData.options.map((option) => (
                <div key={option.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={option.is_default ? "default" : "secondary"}>
                        {option.label}
                      </Badge>
                      <span className="text-sm text-gray-600">({option.value})</span>
                      {option.is_default && <span className="text-xs text-blue-600">Default</span>}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeOption(option.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {configuration ? 'Update' : 'Create'} Level 4 Configuration
        </Button>
      </div>
    </form>
  );
};