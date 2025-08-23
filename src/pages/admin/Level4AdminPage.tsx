import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye, Settings, Plus } from 'lucide-react';
import { Level4Service } from '@/services/level4Service';
import { Level4Editor } from '@/components/level4/Level4Editor';
import { Level4PreviewModal } from '@/components/level4/Level4PreviewModal';
import { Level4Configuration } from '@/types/level4';
import { productDataService } from '@/services/productDataService';
import { toast } from '@/components/ui/use-toast';

interface Level3ProductWithConfig {
  id: string;
  name: string;
  parent_product_id: string;
  parentChain?: string;
  configuration?: Level4Configuration;
  hasConfiguration: boolean;
}

export const Level4AdminPage: React.FC = () => {
  const [products, setProducts] = useState<Level3ProductWithConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Level3ProductWithConfig | null>(null);
  const [editorMode, setEditorMode] = useState<'edit' | 'preview' | null>(null);

  useEffect(() => {
    loadLevel3Products();
  }, []);

  const loadLevel3Products = async () => {
    setIsLoading(true);
    try {
      // Get all Level 3 products with Level 4 enabled
      const level3Products = await Level4Service.getLevel3ProductsWithLevel4();
      
      // Build parent chain and check for configurations
      const productsWithConfig: Level3ProductWithConfig[] = [];
      
      for (const product of level3Products) {
        // Get parent chain
        let parentChain = 'Unknown';
        try {
          const level2Products = await productDataService.getLevel2Products();
          const parentLevel2 = level2Products.find(p => p.id === product.parent_product_id);
          
          if (parentLevel2) {
            const level1Products = await productDataService.getLevel1Products();
            const parentLevel1 = level1Products.find(p => p.id === parentLevel2.parentProductId);
            
            if (parentLevel1) {
              parentChain = `${parentLevel1.name} → ${parentLevel2.name} → ${product.name}`;
            } else {
              parentChain = `${parentLevel2.name} → ${product.name}`;
            }
          }
        } catch (error) {
          console.error('Error building parent chain:', error);
        }

        // Check for existing configuration
        const config = await Level4Service.getLevel4Configuration(product.id);
        
        productsWithConfig.push({
          ...product,
          parentChain,
          configuration: config || undefined,
          hasConfiguration: !!config
        });
      }

      setProducts(productsWithConfig);
    } catch (error) {
      console.error('Error loading Level 3 products:', error);
      toast({
        title: "Error",
        description: "Failed to load Level 4 products. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfigure = (product: Level3ProductWithConfig) => {
    setSelectedProduct(product);
    setEditorMode('edit');
  };

  const handlePreview = (product: Level3ProductWithConfig) => {
    if (!product.configuration) {
      toast({
        title: "No Configuration",
        description: "This product has not been configured yet.",
        variant: "destructive"
      });
      return;
    }
    setSelectedProduct(product);
    setEditorMode('preview');
  };

  const handleEditorSave = async () => {
    // Refresh the products list to reflect changes
    await loadLevel3Products();
    setSelectedProduct(null);
    setEditorMode(null);
    
    toast({
      title: "Success",
      description: "Level 4 configuration saved successfully.",
    });
  };

  const handleEditorCancel = () => {
    setSelectedProduct(null);
    setEditorMode(null);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Level 4 Configurations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2">Loading Level 4 configurations...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Level 4 Configurations</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Manage Level 4 configurations for Level 3 products with hasLevel4 enabled
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {products.length} products with Level 4
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-muted-foreground mb-4">
                No Level 3 products found with Level 4 enabled.
              </div>
              <p className="text-sm text-muted-foreground">
                To add products to this list, go to the Level 3 Products admin page and enable "hasLevel4" for the products you want to configure.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Level 3 Product</TableHead>
                  <TableHead>Parent Product Path</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {product.parentChain}
                    </TableCell>
                    <TableCell>
                      {product.configuration ? (
                        <Badge variant="secondary">
                          {product.configuration.template_type === 'OPTION_1' 
                            ? `Option 1 (max ${product.configuration.max_inputs})`
                            : `Option 2 (${product.configuration.fixed_inputs} fixed)`
                          }
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={product.hasConfiguration ? "default" : "secondary"}
                      >
                        {product.hasConfiguration ? "Configured" : "Not configured"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {product.hasConfiguration && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePreview(product)}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Preview
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleConfigure(product)}
                        >
                          <Settings className="h-3 w-3 mr-1" />
                          {product.hasConfiguration ? "Edit" : "Configure"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Editor Modal */}
      {selectedProduct && editorMode === 'edit' && (
        <Level4Editor
          level3ProductId={selectedProduct.id}
          level3ProductName={selectedProduct.name}
          existingConfiguration={selectedProduct.configuration}
          onSave={handleEditorSave}
          onCancel={handleEditorCancel}
        />
      )}

      {/* Preview Modal */}
      {selectedProduct && editorMode === 'preview' && selectedProduct.configuration && (
        <Level4PreviewModal
          configuration={selectedProduct.configuration}
          onClose={handleEditorCancel}
        />
      )}
    </div>
  );
};