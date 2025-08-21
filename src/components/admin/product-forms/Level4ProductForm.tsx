import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Level3Product } from "@/types/product";
import { Level4Configuration } from "@/types/level4";
import { productDataService } from "@/services/productDataService";

interface Level4ProductFormProps {
  product?: Level4Configuration;
  onSave: (product: Omit<Level4Configuration, 'id' | 'fields'>) => void;
  onCancel: () => void;
}

export const Level4ProductForm: React.FC<Level4ProductFormProps> = ({
  product,
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    name: '',
    level3_product_id: '',
    ...product
  });

  const [level3Products, setLevel3Products] = useState<Level3Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadLevel3Products = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const products = await productDataService.getLevel3Products();
        setLevel3Products(products);
        
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
    
    if (!formData.name?.trim()) {
      alert('Please enter a configuration name');
      return;
    }
    
    if (!formData.level3_product_id) {
      alert('Please select a parent Level 3 product');
      return;
    }
    
    const productToSave = {
      name: formData.name.trim(),
      level3_product_id: formData.level3_product_id,
    };
    
    onSave(productToSave);
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
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Level 3 Products Available</h3>
          <p className="text-gray-600 mb-4">
            You need to create Level 3 products before you can add Level 4 configurations.
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
          <CardTitle>Level 4 Configuration</CardTitle>
          <p className="text-sm text-gray-600">
            Create a new Level 4 configuration for the selected Level 3 product.
            Fields and options can be configured after creation.
          </p>
        </CardHeader>
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