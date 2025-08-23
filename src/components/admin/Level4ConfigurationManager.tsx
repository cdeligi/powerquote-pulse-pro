import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Loader2 } from 'lucide-react';
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { productDataService } from "@/services/productDataService";
import { Level4ConfigEditor } from "./level4/Level4ConfigEditor";
import { TypeSelectionDialog } from './level4/TypeSelectionDialog';
import { PreviewDialog } from './level4/PreviewDialog';
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

interface Level4ConfigurationManagerProps {
  level3ProductId?: string;
  onClose?: () => void;
}

export const Level4ConfigurationManager: React.FC<Level4ConfigurationManagerProps> = ({ 
  level3ProductId,
  onClose 
}) => {
  const { toast } = useToast();
  const [level3Products, setLevel3Products] = useState<any[]>([]);
  const [level4Products, setLevel4Products] = useState<any[]>([]);
  const [selectedLevel3, setSelectedLevel3] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showTypeDialog, setShowTypeDialog] = useState(false);
  const [isChangingType, setIsChangingType] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [showConfigPicker, setShowConfigPicker] = useState(false);

  const isOverlayOpen = isEditorOpen || showTypeDialog || showPreview || showConfigPicker;

  // Auto-select the product if level3ProductId is provided
  useEffect(() => {
    if (level3ProductId && level3Products.length > 0) {
      const product = level3Products.find(p => p.id === level3ProductId);
      if (product) {
        setSelectedLevel3(level3ProductId);
      }
    }
  }, [level3ProductId, level3Products]);

  // If no explicit selection, auto-select the first Level 3 product
  useEffect(() => {
    if (!level3ProductId && !selectedLevel3 && level3Products.length > 0) {
      setSelectedLevel3(level3Products[0].id);
    }
  }, [level3ProductId, selectedLevel3, level3Products]);

  // After level4Products load for selected level 3, handle routing without list
  useEffect(() => {
    if (!selectedLevel3) return;
    if (!level4Products) return;
    if (level4Products.length === 0) {
      // no configs yet -> ask for type to create
      setSelectedProduct({
        id: 'new',
        name: 'Configuration',
        product_level: 4,
      } as any);
      setIsChangingType(false);
      setShowTypeDialog(true);
    } else if (level4Products.length === 1) {
      // exactly one -> open editor directly
      setSelectedProduct(level4Products[0] as any);
      setIsEditorOpen(true);
    } else {
      // multiple -> show picker dialog
      setShowConfigPicker(true);
    }
  }, [selectedLevel3, level4Products]);

  // Load Level 3 products on initialization
  useEffect(() => {
    const initialize = async () => {
      try {
        setIsLoading(true);
        
        // Load Level 3 products that require Level 4 configuration
        const products = await productDataService.getLevel3Products();
        const filteredProducts = products.filter(p => Boolean(p.requires_level4_config));
        setLevel3Products(filteredProducts);
        
        // If we have a level3ProductId, select it
        if (level3ProductId && filteredProducts.some(p => p.id === level3ProductId)) {
          setSelectedLevel3(level3ProductId);
        }
        
      } catch (error) {
        console.error('Error initializing Level 4 Configuration Manager:', error);
        toast({
          title: "Error",
          description: "Failed to load configuration data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, [level3ProductId]);

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

  // Map internal types to display names
  const getTypeDisplayName = (type?: string) => {
    if (!type) return 'Unknown';
    return type === 'bushing' ? 'Option 1' : type === 'analog' ? 'Option 2' : type;
  };

  // Handle creating a new configuration
  const handleAddConfiguration = () => {
    setIsChangingType(false);
    setShowTypeDialog(true);
  };

  // Handle type selection from dialog
  const handleTypeSelect = (type: 'bushing' | 'analog') => {
    setShowTypeDialog(false);
    
    // If we're changing type for an existing selection, update in place
    if (isChangingType && selectedProduct) {
      const updated = {
        ...selectedProduct,
        type,
        configurationType: type,
        // reset options for the newly selected type
        options: type === 'bushing'
          ? { maxInputs: 6, bushingTapModels: [], inputs: [] }
          : { inputTypes: [], inputs: [] },
      } as any;
      setSelectedProduct(updated);
      setIsEditorOpen(true);
      setIsChangingType(false);
      return;
    }

    // Otherwise, we're adding a new configuration
    setSelectedProduct({
      id: 'new',
      name: `${getTypeDisplayName(type)} Configuration`,
      sku: '',
      product_level: 4,
      requires_level4_config: false,
      type,
      configurationType: type,
      price: 0,
      cost: 0,
      options: type === 'bushing'
        ? { maxInputs: 6, bushingTapModels: [], inputs: [] }
        : { inputTypes: [], inputs: [] }
    } as any);
    setIsEditorOpen(true);
  };

  // Show preview of the configuration
  const handlePreview = (product: Product) => {
    setPreviewData({
      ...product,
      displayName: getTypeDisplayName(product.type),
      description: product.name || 'Configuration',
    });
    setShowPreview(true);
  };

  // Handle opening the editor for a product
  const handleConfigureProduct = (product: Product) => {
    // If the product has no type yet, force a type selection first
    const needsType = !product.type || !product.configurationType;
    if (needsType) {
      setSelectedProduct({ ...product, name: product.name || 'Configuration' });
      setIsChangingType(false);
      setShowTypeDialog(true);
      return;
    }
    // Open editor directly when a single type already exists
    setSelectedProduct(product);
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
      
      // Save the Level 4 product first
      if (isNewProduct) {
        const level4ProductData = {
          name: selectedProduct.name,
          parentProductId: selectedLevel3,
          description: `Configuration for ${selectedProduct.name}`,
          configurationType: (selectedProduct.type === 'bushing' ? 'bushing' : 'analog') as any,
          enabled: true,
          price: selectedProduct.price || 0,
          cost: 0,
          options: configData
        };
        savedProduct = await productDataService.createLevel4Product(level4ProductData);
        
        // Relationship is now created inside createLevel4Product
      } else {
        const updateData = {
          name: selectedProduct.name,
          parentProductId: selectedLevel3,
          configurationType: (selectedProduct.type === 'bushing' ? 'bushing' : 'analog') as any,
          enabled: true,
          price: selectedProduct.price || 0,
          options: configData
        };
        savedProduct = await productDataService.updateLevel4Product(selectedProduct.id, updateData);
      }
      
      // Force-persist options to guarantee config is saved
      if (savedProduct?.id) {
        const ok = await productDataService.saveLevel4Options(savedProduct.id, configData);
        console.log('[Level4ConfigurationManager] saveLevel4Options result:', ok);
      }
      
      console.log('Saved Level 4 product:', savedProduct);
      
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
                {getTypeDisplayName(product.type)}
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
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleConfigureProduct(row.original)}
          >
            Configure
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handlePreview(row.original)}
          >
            Preview
          </Button>
        </div>
      ),
    },
  ];

  // Add debug effect to log state changes
  useEffect(() => {
    console.log('Selected Level 3:', selectedLevel3);
    console.log('Level 3 Products:', level3Products);
    console.log('Level 4 Products:', level4Products);
    console.log('Filtered Level 4 Products:', filteredLevel4Products);
  }, [selectedLevel3, level3Products, level4Products, filteredLevel4Products]);

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
      const requiredProducts = [
        'option-1-card', 
        'option-1-card-mtx', 
        'option-1-card-stx',
        'option-2-card-multi', 
        'option-2-card-multi-mtx', 
        'option-2-card-multi-stx'
      ];
      
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
      {/* Type Selection Dialog */}
      <TypeSelectionDialog 
        isOpen={showTypeDialog}
        onClose={() => setShowTypeDialog(false)}
        onSelect={handleTypeSelect}
      />
      
      {/* Preview Dialog */}
      <PreviewDialog 
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        data={previewData}
      />
      
      {/* Configuration Picker Dialog (shown when multiple L4 exist) */}
      <Dialog open={showConfigPicker} onOpenChange={setShowConfigPicker}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select a Configuration</DialogTitle>
            <DialogDescription>
              Choose which configuration to edit or preview.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-2 px-2 py-1 text-sm text-muted-foreground">
              <span className="font-medium">Name</span>
              <span className="font-medium">Parent Product ID</span>
              <span className="font-medium">Type</span>
              <span className="font-medium text-right">Actions</span>
            </div>
            <div className="divide-y rounded border">
              {filteredLevel4Products.map((p) => (
                <div key={p.id} className="grid grid-cols-4 gap-2 items-center px-3 py-2">
                  <div className="truncate font-medium">{p.name}</div>
                  <div className="text-sm text-muted-foreground truncate">{selectedLevel3}</div>
                  <div>
                    {p.type ? (
                      <Badge variant={p.type === 'bushing' ? 'default' : 'secondary'} className="text-xs">
                        {getTypeDisplayName(p.type)}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">Unknown</Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handlePreview(p)}>
                      Preview
                    </Button>
                    <Button size="sm" onClick={() => { setSelectedProduct(p); setIsEditorOpen(true); setShowConfigPicker(false); }}>
                      Configure
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end pt-4">
            <Button onClick={handleAddConfiguration} disabled={!selectedLevel3}>Add Configuration</Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Configuration Editor Dialog */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedProduct?.id === 'new' ? 'Create New' : 'Edit'} Configuration
            </DialogTitle>
            <DialogDescription>
              Configure the settings for this configuration
            </DialogDescription>
          </DialogHeader>

          {selectedProduct && (
            <Level4ConfigEditor
              productId={selectedProduct.id}
              productType={(selectedProduct.type as 'bushing' | 'analog') || 'bushing'}
              name={selectedProduct.name || 'Configuration'}
              onNameChange={(n) => setSelectedProduct(prev => prev ? { ...prev, name: n } : prev)}
              onPreview={(cfg) => handlePreview({ ...selectedProduct, options: cfg } as any)}
              initialData={(selectedProduct as any).options}
              onSave={handleSaveConfiguration}
              onCancel={() => setIsEditorOpen(false)}
              onRequestChangeType={() => {
                setIsChangingType(true);
                setShowTypeDialog(true);
              }}
              onRequestChangeConfig={() => setShowConfigPicker(true) as any}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Level4ConfigurationManager;
