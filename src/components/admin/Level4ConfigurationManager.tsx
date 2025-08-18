import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { productDataService } from '@/services/productDataService';
import { Level4ConfigEditor } from './level4/Level4ConfigEditor';
import { ColumnDef } from '@tanstack/react-table';
import { Level4Product, Level3Product, Level2Product } from '@/types/product';
import { Plus, Edit, Eye } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  product_level?: number;
  requires_level4_config?: boolean;
  configurationType?: string;
  parentProductId?: string;
  parent_product_id?: string;
  specifications?: any;
  price?: number;
}

export const Level4ConfigurationManager: React.FC = () => {
  const { toast } = useToast();
  const [level3Products, setLevel3Products] = useState<Product[]>([]);
  const [selectedLevel3Product, setSelectedLevel3Product] = useState<string>('');
  const [level4Products, setLevel4Products] = useState<Level4Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Level4Product | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [level2Product, setLevel2Product] = useState<Product | null>(null);

  // Load Level 3 products on component mount
  useEffect(() => {
    const loadLevel3Products = async () => {
      try {
        setIsLoading(true);
        const products = await productDataService.getLevel3Products();
        setLevel3Products(products);
      } catch (error) {
        console.error('Error loading Level 3 products:', error);
        toast({
          title: 'Error',
          description: 'Failed to load Level 3 products',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadLevel3Products();
  }, []);

  // Load Level 4 products and Level 2 parent when Level 3 product changes
  useEffect(() => {
    const loadLevel4Products = async () => {
      if (!selectedLevel3Product) {
        setLevel4Products([]);
        setLevel2Product(null);
        return;
      }

      setIsLoading(true);
      try {
        const products = await productDataService.getLevel4Products(selectedLevel3Product);
        setLevel4Products(products);

        // Find Level 2 parent
        const selectedLevel3 = level3Products.find(p => p.id === selectedLevel3Product);
        if (selectedLevel3?.parent_product_id || selectedLevel3?.parentProductId) {
          const parentId = selectedLevel3.parent_product_id || selectedLevel3.parentProductId;
          const level2Parent = await productDataService.getLevel2ProductById(parentId);
          setLevel2Product(level2Parent);
        }
      } catch (error) {
        console.error('Error loading Level 4 products:', error);
        toast({
          title: 'Error',
          description: 'Failed to load Level 4 products',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadLevel4Products();
  }, [selectedLevel3Product, level3Products]);

  // Filter Level 4 products based on search term
  const filteredLevel4Products = level4Products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleConfigureProduct = (product: Level4Product) => {
    setSelectedProduct(product);
    setIsCreating(false);
    setIsEditorOpen(true);
  };

  const handleAddConfiguration = () => {
    if (!selectedLevel3Product) {
      toast({
        title: 'Error',
        description: 'Please select a Level 3 product first',
        variant: 'destructive',
      });
      return;
    }
    
    setSelectedProduct(null);
    setIsCreating(true);
    setIsEditorOpen(true);
  };

  const handleSaveConfiguration = async (productData: Omit<Level4Product, 'id'> | Level4Product) => {
    try {
      setIsLoading(true);
      
      if (isCreating) {
        // Creating new Level 4 product
        const newProduct = await productDataService.createLevel4Product(productData as Omit<Level4Product, 'id'>);
        
        // Create relationship with Level 3 product
        if (selectedLevel3Product) {
          await productDataService.createLevel3Level4Relationship(selectedLevel3Product, newProduct.id);
          
          // Auto-enable requires_level4_config on the Level 3 product
          const selectedLevel3 = level3Products.find(p => p.id === selectedLevel3Product);
          if (selectedLevel3) {
            await productDataService.updateLevel3Product(selectedLevel3Product, {
              specifications: {
                ...selectedLevel3.specifications,
                requires_level4_config: true
              }
            });
          }
        }

        toast({
          title: 'Success',
          description: 'Level 4 configuration created successfully',
        });
      } else {
        // Updating existing Level 4 product
        const updatedProduct = await productDataService.updateLevel4Product(
          (productData as Level4Product).id, 
          productData
        );
        toast({
          title: 'Success',
          description: 'Level 4 configuration updated successfully',
        });
      }

      // Reload Level 4 products and Level 3 products
      if (selectedLevel3Product) {
        const products = await productDataService.getLevel4Products(selectedLevel3Product);
        setLevel4Products(products);
        
        // Reload Level 3 products to reflect any changes
        const level3s = await productDataService.getLevel3Products();
        setLevel3Products(level3s);
      }

      setIsEditorOpen(false);
      setSelectedProduct(null);
      setIsCreating(false);
    } catch (error) {
      console.error('Error saving Level 4 configuration:', error);
      toast({
        title: 'Error',
        description: 'Failed to save Level 4 configuration',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelConfiguration = () => {
    setIsEditorOpen(false);
    setSelectedProduct(null);
    setIsCreating(false);
  };

  // Define columns for the data table
  const columns: ColumnDef<Level4Product>[] = [
    {
      accessorKey: 'name',
      header: 'Configuration Name',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.name}</span>
          {selectedLevel3Product && level2Product && (
            <span className="text-sm text-muted-foreground">
              Level 3: {level3Products.find(p => p.id === selectedLevel3Product)?.name}
              {level2Product && ` | Level 2: ${level2Product.name}`}
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'configuration_type',
      header: 'Type',
      cell: ({ row }) => {
        const type = row.original.configurationType;
        return (
          <Badge variant="secondary">
            {type || 'Unknown'}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.description || 'No description'}
        </span>
      ),
    },
    {
      accessorKey: 'price',
      header: 'Price',
      cell: ({ row }) => (
        <span className="font-mono">
          ${(row.original.price || 0).toFixed(2)}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleConfigureProduct(row.original)}
          >
            <Edit className="h-4 w-4" />
            Edit
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Level 4 Configuration Management</CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Level 3 Product Selection */}
          <div className="space-y-2">
            <Label htmlFor="level3-select">Select Level 3 Product</Label>
            <Select value={selectedLevel3Product} onValueChange={setSelectedLevel3Product}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a Level 3 product..." />
              </SelectTrigger>
              <SelectContent>
                {level3Products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedLevel3Product && level2Product && (
              <div className="text-sm text-muted-foreground mt-2">
                Parent: {level2Product.name}
              </div>
            )}
          </div>

          {/* Search and Add Configuration */}
          {selectedLevel3Product && (
            <div className="flex justify-between items-center gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search Level 4 configurations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button onClick={handleAddConfiguration}>
                <Plus className="h-4 w-4 mr-2" />
                Add Configuration
              </Button>
            </div>
          )}

          {/* Level 4 Products Table */}
          {selectedLevel3Product && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Level 4 Configurations</h3>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-muted-foreground mt-2">Loading configurations...</p>
                </div>
              ) : filteredLevel4Products.length > 0 ? (
                <DataTable
                  columns={columns}
                  data={filteredLevel4Products}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm ? 'No configurations match your search.' : 'No Level 4 configurations found for this product.'}
                </div>
              )}
            </div>
          )}

          {!selectedLevel3Product && (
            <div className="text-center py-8 text-muted-foreground">
              Select a Level 3 product to view and manage its Level 4 configurations.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Level 4 Configuration Editor Dialog */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {isCreating ? 'Create New Level 4 Configuration' : 'Edit Level 4 Configuration'}
            </DialogTitle>
          </DialogHeader>
          
          <Level4ConfigEditor
            productId={selectedProduct?.id || ''}
            productType={selectedProduct?.configurationType === 'analog' ? 'analog' : 'bushing'}
            onSave={handleSaveConfiguration}
            onCancel={handleCancelConfiguration}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};