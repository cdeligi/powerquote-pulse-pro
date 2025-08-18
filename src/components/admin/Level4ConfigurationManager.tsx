
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit, Plus, Save, X } from 'lucide-react';
import { Level3Product, Level4Product, Level2Product } from '@/types/product';
import { productDataService } from '@/services/productDataService';
import { Level4ConfigEditor } from './level4/Level4ConfigEditor';
import { toast } from 'sonner';

const Level4ConfigurationManager = () => {
  const [level3Products, setLevel3Products] = useState<Level3Product[]>([]);
  const [level4Products, setLevel4Products] = useState<Level4Product[]>([]);
  const [level2Products, setLevel2Products] = useState<Level2Product[]>([]);
  const [selectedLevel3, setSelectedLevel3] = useState<string>('');
  const [isAddingConfiguration, setIsAddingConfiguration] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Level4Product | null>(null);
  const [newConfiguration, setNewConfiguration] = useState({
    name: '',
    description: '',
    configurationType: 'bushing' as 'bushing' | 'analog'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [level3Data, level4Data, level2Data] = await Promise.all([
        productDataService.getLevel3Products(),
        productDataService.getLevel4Products(),
        productDataService.getLevel2Products()
      ]);
      
      setLevel3Products(level3Data);
      setLevel4Products(level4Data);
      setLevel2Products(level2Data);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load configuration data');
    } finally {
      setLoading(false);
    }
  };

  const getLevel2Parent = (level3Product: Level3Product): Level2Product | null => {
    return level2Products.find(l2 => l2.id === level3Product.parentProductId) || null;
  };

  const filteredLevel4Products = selectedLevel3 
    ? level4Products.filter(p => p.parentProductId === selectedLevel3)
    : level4Products;

  const handleAddConfiguration = async () => {
    if (!selectedLevel3 || !newConfiguration.name.trim()) {
      toast.error('Please select a Level 3 product and provide a configuration name');
      return;
    }

    try {
      setLoading(true);

      // Create the Level 4 product with minimal required fields
      const level4ProductData = {
        name: `${newConfiguration.name} Configuration`,
        description: newConfiguration.description,
        parentProductId: selectedLevel3,
        configurationType: newConfiguration.configurationType,
        price: 0,
        cost: 0,
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        configuration: null,
        configurationOptions: []
      };

      const savedProduct = await productDataService.saveLevel4Product(level4ProductData);
      
      // Update the Level 3 product to require Level 4 config
      const level3Product = level3Products.find(p => p.id === selectedLevel3);
      if (level3Product) {
        await productDataService.saveLevel3Product({
          ...level3Product,
          requiresLevel4Config: true
        });
      }

      // Reload data and open editor
      await loadData();
      const newProduct = level4Products.find(p => p.id === savedProduct.id);
      if (newProduct) {
        setSelectedProduct(newProduct);
      }

      setIsAddingConfiguration(false);
      setNewConfiguration({ name: '', description: '', configurationType: 'bushing' });
      toast.success('Configuration created successfully');
    } catch (error) {
      console.error('Error creating configuration:', error);
      toast.error('Failed to create configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleEditConfiguration = (product: Level4Product) => {
    setSelectedProduct(product);
  };

  const handleSaveConfiguration = async (productData: Level4Product | Omit<Level4Product, 'id'>) => {
    try {
      if ('id' in productData) {
        await productDataService.saveLevel4Product(productData);
      } else {
        await productDataService.saveLevel4Product(productData);
      }
      await loadData();
      setSelectedProduct(null);
      toast.success('Configuration saved successfully');
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast.error('Failed to save configuration');
    }
  };

  const handleCancelConfiguration = () => {
    setSelectedProduct(null);
  };

  const handleDeleteConfiguration = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this configuration?')) return;

    try {
      await productDataService.deleteLevel4Product(productId);
      await loadData();
      toast.success('Configuration deleted successfully');
    } catch (error) {
      console.error('Error deleting configuration:', error);
      toast.error('Failed to delete configuration');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Level 4 Configuration Management</h2>
        <Button
          onClick={() => setIsAddingConfiguration(true)}
          disabled={!selectedLevel3}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Configuration
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Level 3 Product</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedLevel3} onValueChange={setSelectedLevel3}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a Level 3 product..." />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {level3Products.map((product) => {
                const level2Parent = getLevel2Parent(product);
                return (
                  <SelectItem key={product.id} value={product.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{product.name}</span>
                      {level2Parent && (
                        <span className="text-sm text-muted-foreground">
                          Parent: {level2Parent.name}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedLevel3 && (
        <Card>
          <CardHeader>
            <CardTitle>Level 4 Configurations</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-4">
                {filteredLevel4Products.length === 0 ? (
                  <p className="text-muted-foreground">No configurations found for this Level 3 product.</p>
                ) : (
                  filteredLevel4Products.map((product) => (
                    <div key={product.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{product.name}</h3>
                          <Badge variant={product.configurationType === 'analog' ? 'default' : 'secondary'}>
                            {product.configurationType}
                          </Badge>
                        </div>
                        {product.description && (
                          <p className="text-sm text-muted-foreground mt-1">{product.description}</p>
                        )}
                        <div className="flex gap-4 text-sm text-muted-foreground mt-2">
                          <span>Price: ${product.price}</span>
                          <span>Cost: ${product.cost}</span>
                          <span>Has Config: {product.configuration ? 'Yes' : 'No'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditConfiguration(product)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteConfiguration(product.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Add Configuration Dialog */}
      <Dialog open={isAddingConfiguration} onOpenChange={setIsAddingConfiguration}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Level 4 Configuration</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="configType">Configuration Type</Label>
              <Select
                value={newConfiguration.configurationType}
                onValueChange={(value: 'bushing' | 'analog') => 
                  setNewConfiguration(prev => ({ ...prev, configurationType: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bushing">Bushing Card</SelectItem>
                  <SelectItem value="analog">Analog Card</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="configName">Configuration Name</Label>
              <Input
                id="configName"
                value={newConfiguration.name}
                onChange={(e) => setNewConfiguration(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter configuration name"
              />
            </div>

            <div>
              <Label htmlFor="configDescription">Description (Optional)</Label>
              <Textarea
                id="configDescription"
                value={newConfiguration.description}
                onChange={(e) => setNewConfiguration(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter configuration description"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsAddingConfiguration(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddConfiguration}
                disabled={loading || !newConfiguration.name.trim()}
              >
                {loading ? 'Creating...' : 'Create Configuration'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Configuration Dialog */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Edit Configuration: {selectedProduct?.name}
            </DialogTitle>
          </DialogHeader>
          
          {selectedProduct && (
            <Level4ConfigEditor
              productId={selectedProduct.id}
              productType={selectedProduct.configurationType === 'analog' ? 'analog' : 'bushing'}
              onSave={handleSaveConfiguration}
              onCancel={handleCancelConfiguration}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Level4ConfigurationManager;
