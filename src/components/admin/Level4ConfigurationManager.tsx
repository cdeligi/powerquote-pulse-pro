import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Loader2 } from 'lucide-react';
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { productDataService } from "@/services/productDataService";
import { Level4ConfigEditor } from "./level4/Level4ConfigEditor";
import { supabase } from "@/integrations/supabase/client";

interface Product {
  id: string;
  name: string;
  sku?: string;
  product_level: number;
  requires_level4_config?: boolean;
  type?: 'bushing' | 'analog';
  partNumber?: string;
  configurationType?: 'dropdown' | 'multiline' | 'bushing' | 'analog';
  price?: number;
}

export const Level4ConfigurationManager: React.FC = () => {
  const { toast } = useToast();
  const [level3Products, setLevel3Products] = useState<any[]>([]);
  const [level4Products, setLevel4Products] = useState<any[]>([]);
  const [selectedLevel3, setSelectedLevel3] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load Level 3 products on initialization
  useEffect(() => {
    const initialize = async () => {
      try {
        setIsLoading(true);
        
        // Load Level 3 products that require Level 4 configuration
        const products = await productDataService.getLevel3Products();
        const filteredProducts = products.filter(p => Boolean(p.requires_level4_config));
        console.log('Filtered Level 3 products:', filteredProducts);
        
        setLevel3Products(filteredProducts);
        
        if (filteredProducts.length === 1) {
          setSelectedLevel3(filteredProducts[0].id);
        }
        
      } catch (error) {
        console.error('Initialization error:', error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : 'Failed to load Level 3 products',
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, [toast]);

  // Load level 4 products when a level 3 product is selected
  useEffect(() => {
    const loadLevel4Products = async () => {
      if (!selectedLevel3) {
        console.log('No level 3 product selected');
        setLevel4Products([]);
        return;
      }
      
      try {
        console.log('Loading level 4 products for parent ID:', selectedLevel3);
        setIsLoading(true);
        
        // Get the parent product details
        const parentProduct = level3Products.find(p => p.id === selectedLevel3);
        if (!parentProduct) {
          console.error('Parent product not found:', selectedLevel3);
          toast({
            title: "Error",
            description: "Parent product not found. Please try selecting again.",
            variant: "destructive",
          });
          return;
        }
        
        console.log('Fetching level 4 products for:', parentProduct.name);
        
        // Fetch level 4 products with their configurations
        const products = await productDataService.getChildProducts(selectedLevel3);
        
        if (!Array.isArray(products)) {
          throw new Error('Invalid response format: expected an array of products');
        }
        
        console.log('Loaded level 4 products:', products);
        
        // Set the level 4 products
        setLevel4Products(products);
        
      } catch (error) {
        console.error('Error loading level 4 products:', error);
        toast({
          title: "Error",
          description: "Failed to load level 4 products. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadLevel4Products();
  }, [selectedLevel3, level3Products, toast]);

  // Filter level 4 products based on search term
  const filteredLevel4Products = level4Products.filter(product => {
    const matchesSearch = product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       product.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Add debug effect to log state changes
  useEffect(() => {
    console.log('Selected Level 3:', selectedLevel3);
    console.log('Level 3 Products:', level3Products);
    console.log('Level 4 Products:', level4Products);
    console.log('Filtered Level 4 Products:', filteredLevel4Products);
  }, [selectedLevel3, level3Products, level4Products, filteredLevel4Products]);

  // Handle opening the editor for a product
  const handleConfigureProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsEditorOpen(true);
  };

  // Handle creating a new configuration
  const handleAddConfiguration = () => {
    // Determine the type based on the selected level 3 product name or other criteria
    const level3Product = level3Products.find(p => p.id === selectedLevel3);
    const productType = level3Product?.name.toLowerCase().includes('bushing') ? 'bushing' : 'analog';
    
    setSelectedProduct({
      id: 'new',
      name: `New ${level3Product?.name || 'Configuration'}`,
      sku: '',
      product_level: 4,
      requires_level4_config: false,
      type: productType
    });
    setIsEditorOpen(true);
  };

  // Handle saving the configuration
  const handleSaveConfiguration = async (configData: any) => {
    if (!selectedProduct) return;
    
    try {
      setIsSaving(true);
      
      // Determine if this is a new product or an update
      const isNewProduct = selectedProduct.id === 'new';
      
      // Prepare the product data
      const productData = {
        name: selectedProduct.name,
        sku: selectedProduct.sku || `L4-${Date.now()}`,
        product_level: 4,
        parent_product_id: selectedLevel3,
        type: selectedProduct.type || 'analog',
        requires_level4_config: true,
        // Add other product fields as needed
      };
      
      let savedProduct;
      
      // Save the product first
      if (isNewProduct) {
        savedProduct = await productDataService.createProduct(productData);
      } else {
        savedProduct = await productDataService.updateProduct(selectedProduct.id, productData);
      }
      
      // Save the configuration data if we have it
      if (configData && savedProduct) {
        await productDataService.saveLevel4Config(savedProduct.id, configData);
      }
      
      // Close the editor
      setIsEditorOpen(false);
      
      // Refresh the products list
      if (selectedLevel3) {
        const products = await productDataService.getChildProducts(selectedLevel3);
        setLevel4Products(products);
      }
      
      // Show success message
      toast({
        title: "Success",
        description: `Configuration ${isNewProduct ? 'created' : 'updated'} successfully.`,
      });
      
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : `Failed to ${selectedProduct.id === 'new' ? 'create' : 'update'} configuration. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Define columns for the data table
  const columns: ColumnDef<Product>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => {
        const product = row.original;
        return (
          <div className="font-medium flex items-center gap-2">
            <span>{product.name}</span>
            {product.type && (
              <Badge variant={product.type === 'bushing' ? 'default' : 'secondary'} className="text-xs">
                {product.type.charAt(0).toUpperCase() + product.type.slice(1)}
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "partNumber",
      header: "Part Number",
      cell: ({ row }) => (
        <div className="text-muted-foreground">
          {row.original.partNumber || 'N/A'}
        </div>
      ),
    },
    {
      accessorKey: "price",
      header: "Price",
      cell: ({ row }) => {
        const price = parseFloat(row.getValue("price")) || 0;
        const formatted = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(price);
        
        return <div className="font-medium">{formatted}</div>;
      },
    },
    {
      accessorKey: "configurationType",
      header: "Type",
      cell: ({ row }) => (
        <Badge variant="outline" className="capitalize">
          {row.original.configurationType || 'dropdown'}
        </Badge>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSelectedProduct(row.original);
            setIsEditorOpen(true);
          }}
        >
          Configure
        </Button>
      ),
    },
  ];

  const debugDatabaseState = async () => {
    try {
      console.log('=== DEBUGGING LEVEL 4 CONFIGURATION ===');
      
      // 1. Check Level 3 products that should have Level 4 config - check specifications JSON
      const { data: allLevel3Products, error: l3Error } = await supabase
        .from('products')
        .select('id, name, specifications, product_level')
        .eq('product_level', 3);
      
      if (l3Error) throw l3Error;
      
      // Filter client-side for requires_level4_config in specifications
      const level3ProductsWithL4Config = allLevel3Products?.filter(product => {
        const specs = product.specifications || {};
        return specs.requires_level4_config === true;
      }) || [];
      
      console.log('Level 3 products requiring Level 4 config:', level3ProductsWithL4Config);
      
      // 2. Check all Level 4 products
      const { data: allLevel4Products, error: l4Error } = await supabase
        .from('level4_products')
        .select('*');
      
      if (l4Error) throw l4Error;
      console.log('All Level 4 products:', allLevel4Products);
      
      // 3. Check relationships between Level 3 and Level 4
      const { data: relationships, error: relError } = await supabase
        .from('level3_level4_relationships')
        .select(`
          *,
          level3_product:level3_product_id (id, name),
          level4_product:level4_product_id (id, name)
        `);
      
      if (relError) throw relError;
      console.log('Level 3 to Level 4 relationships:', relationships);
      
      // 4. Check if the required Level 4 products exist
      const requiredProducts = ['bushing-card', 'bushing-card-mtx', 'bushing-card-stx', 
                              'analog-card-multi', 'analog-card-multi-mtx', 'analog-card-multi-stx'];
      
      const { data: requiredProductsData, error: reqError } = await supabase
        .from('products')
        .select('id, name, specifications')
        .in('id', requiredProducts);
      
      if (reqError) throw reqError;
      console.log('Required Level 4 products status:', requiredProductsData);
      
    } catch (error) {
      console.error('Debug error:', error);
    }
  };

  useEffect(() => {
    debugDatabaseState();
  }, []);

  const handleDebugLevel4 = async () => {
    try {
      setIsLoading(true);
      const result = await productDataService.debugLevel4Products();
      
      if (result.success) {
        toast({
          title: "Debug Information",
          description: "Check the browser console for detailed debug information about Level 4 products.",
        });
      } else {
        throw new Error(result.error || 'Unknown error occurred during debug');
      }
    } catch (error) {
      console.error('Debug error:', error);
      toast({
        title: "Debug Error",
        description: error instanceof Error ? error.message : 'Failed to get debug information',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Level 4 Product Configurations</h2>
        <Button 
          variant="outline" 
          onClick={handleDebugLevel4}
          disabled={isLoading}
        >
          {isLoading ? 'Debugging...' : 'Debug Level 4'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Manage Configurations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="level3">Level 3 Product</Label>
              <select
                id="level3"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={selectedLevel3}
                onChange={(e) => setSelectedLevel3(e.target.value)}
                disabled={isLoading}
              >
                <option value="">Select a product</option>
                {level3Products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="search">Search Configurations</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name or SKU..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  disabled={isLoading || !selectedLevel3}
                />
              </div>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">
                Configurations
                {selectedLevel3 && (
                  <span className="text-sm text-muted-foreground ml-2">
                    ({filteredLevel4Products.length} found)
                  </span>
                )}
              </h3>
              <Button 
                onClick={handleAddConfiguration}
                disabled={!selectedLevel3 || isLoading}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Configuration
              </Button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading configurations...</span>
              </div>
            ) : selectedLevel3 ? (
              <div className="rounded-md border">
                <DataTable
                  columns={columns}
                  data={filteredLevel4Products}
                  emptyMessage="No configurations found. Click 'Add Configuration' to create one."
                />
              </div>
            ) : (
              <div className="text-center py-12 bg-muted/50 rounded-md">
                <p className="text-muted-foreground">
                  Please select a Level 3 product to view or create configurations.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Configuration Editor Dialog */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedProduct && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {selectedProduct.id === 'new' ? 'Add New Configuration' : `Configure ${selectedProduct.name}`}
                </DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <Level4ConfigEditor
                  productId={selectedProduct.id}
                  productType={selectedProduct.type || 'analog'}
                  onSave={(configData) => handleSaveConfiguration(configData)}
                  onCancel={() => setIsEditorOpen(false)}
                />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Level4ConfigurationManager;
