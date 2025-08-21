
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
import { Level4Product, Level4ConfigurationOption, Level3Product } from "@/types/product";
import { productDataService } from "@/services/productDataService";

interface Level4ProductFormProps {
  product?: Level4Product;
  onSave: (product: Omit<Level4Product, 'id'> | Level4Product) => void;
  onCancel: () => void;
}

export const Level4ProductForm: React.FC<Level4ProductFormProps> = ({
  product,
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState<Partial<Level4Product>>({
    name: '',
    parentProductId: '',
    description: '',
    configurationType: 'dropdown',
    price: 0,
    cost: 0,
    enabled: true,
    options: [],
    ...product
  });

  const [level3Products, setLevel3Products] = useState<Level3Product[]>([]);
  const [newOption, setNewOption] = useState({ optionKey: '', optionValue: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadLevel3Products = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log('Loading Level 3 products for Level 4 form...');
        const products = await productDataService.getLevel3Products();
        console.log('Loaded Level 3 products:', products.length);
        
        setLevel3Products(products);
        
      } catch (error) {
        console.error('Error loading Level 3 products:', error);
        setError('Failed to load Level 3 products');
        // Fallback to sync method
        try {
          const syncProducts = productDataService.getLevel3ProductsSync();
          setLevel3Products(syncProducts);
          setError(null);
        } catch (syncError) {
          console.error('Sync fallback also failed:', syncError);
          setLevel3Products([]);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadLevel3Products();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name?.trim()) {
      alert('Please enter a configuration name');
      return;
    }
    
    if (!formData.parentProductId) {
      alert('Please select a parent Level 3 product');
      return;
    }
    
    if (!formData.configurationType) {
      alert('Please select a configuration type');
      return;
    }
    
    const productToSave = {
      ...formData,
      name: formData.name.trim(),
      configurationType: formData.configurationType as 'dropdown' | 'multiline',
      options: formData.options || [],
      price: formData.price || 0,
      cost: formData.cost || 0,
      enabled: formData.enabled ?? true
    } as Level4Product;
    
    onSave(productToSave);
  };

  const addOption = () => {
    if (!newOption.optionKey?.trim() || !newOption.optionValue?.trim()) {
      alert('Please enter both option key and value');
      return;
    }
    
    const option: Level4ConfigurationOption = {
      id: `option-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      level4ProductId: formData.id || '',
      optionKey: newOption.optionKey.trim(),
      optionValue: newOption.optionValue.trim(),
      displayOrder: (formData.options?.length || 0) + 1,
      enabled: true
    };
    
    setFormData(prev => ({
      ...prev,
      options: [...(prev.options || []), option]
    }));
    
    setNewOption({ optionKey: '', optionValue: '' });
  };

  const removeOption = (optionId: string) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options?.filter(opt => opt.id !== optionId) || []
    }));
  };

  const selectedLevel3 = level3Products.find(p => p.id === formData.parentProductId);

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
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Level 3 Products Available</h3>
          <p className="text-gray-600 mb-4">
            You need to create Level 3 products before you can add Level 4 configurations.
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Go to the Level 3 Products tab to create cards, components, or options first.
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
          <Label htmlFor="name">Configuration Name *</Label>
          <Input
            id="name"
            value={formData.name || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Enter configuration name"
            required
          />
        </div>

        <div>
          <Label htmlFor="parentProduct">Parent Level 3 Product *</Label>
          <Select
            value={formData.parentProductId || ''}
            onValueChange={(value) => setFormData(prev => ({ ...prev, parentProductId: value }))}
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
          <Label htmlFor="configurationType">Configuration Type</Label>
          <Select
            value={formData.configurationType || 'dropdown'}
            onValueChange={(value: 'dropdown' | 'multiline') => 
              setFormData(prev => ({ ...prev, configurationType: value }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dropdown">Dropdown Selection</SelectItem>
              <SelectItem value="multiline">Multi-line Configuration</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="enabled"
            checked={formData.enabled || false}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, enabled: checked }))}
          />
          <Label htmlFor="enabled">Enabled</Label>
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Enter configuration description"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="price">Price ($)</Label>
          <Input
            id="price"
            type="number"
            step="0.01"
            min="0"
            value={formData.price || 0}
            onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
          />
        </div>

        <div>
          <Label htmlFor="cost">Cost ($)</Label>
          <Input
            id="cost"
            type="number"
            step="0.01"
            min="0"
            value={formData.cost || 0}
            onChange={(e) => setFormData(prev => ({ ...prev, cost: parseFloat(e.target.value) || 0 }))}
          />
        </div>
      </div>

      {selectedLevel3 && (
        <div className="p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700">
            This configuration will be available for: <strong>{selectedLevel3.name}</strong>
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Configuration Options</CardTitle>
          <p className="text-sm text-gray-600">
            {formData.configurationType === 'dropdown' 
              ? 'Add options that users can select from a dropdown menu'
              : 'Add configuration fields with names and descriptions'
            }
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>
                {formData.configurationType === 'dropdown' ? 'Option Value' : 'Field Name'}
              </Label>
              <Input
                value={newOption.optionKey}
                onChange={(e) => setNewOption(prev => ({ ...prev, optionKey: e.target.value }))}
                placeholder={formData.configurationType === 'dropdown' ? 'e.g., option1' : 'e.g., Temperature Range'}
              />
            </div>
            <div>
              <Label>
                {formData.configurationType === 'dropdown' ? 'Display Name' : 'Description'}
              </Label>
              <Input
                value={newOption.optionValue}
                onChange={(e) => setNewOption(prev => ({ ...prev, optionValue: e.target.value }))}
                placeholder={formData.configurationType === 'dropdown' ? 'e.g., Option 1' : 'e.g., Operating temperature range'}
              />
            </div>
          </div>
          
          <Button 
            type="button" 
            onClick={addOption} 
            className="w-full" 
            variant="outline"
            disabled={!newOption.optionKey.trim() || !newOption.optionValue.trim()}
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
                      <Badge variant="secondary">{option.optionKey}</Badge>
                      <span className="text-sm">{option.optionValue}</span>
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
          {product ? 'Update' : 'Create'} Level 4 Configuration
        </Button>
      </div>
    </form>
  );
};
