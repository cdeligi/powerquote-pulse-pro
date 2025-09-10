import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye, Settings } from 'lucide-react';
import { Level4Service } from '@/services/level4Service';
import type { Level4Config } from '@/components/level4/Level4ConfigTypes';
import { productDataService } from '@/services/productDataService';
import { toast } from "sonner";

interface Level3ProductWithConfig {
  id: string;
  name: string;
  parent_product_id: string | null;
  parentChain?: string;
  configuration?: Level4Config;
  hasConfiguration: boolean;
  enabled: boolean;
}

export const Level4AdminPage: React.FC = () => {
  const [products, setProducts] = useState<Level3ProductWithConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dbSchemaError, setDbSchemaError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadLevel3Products();
  }, []);

  const loadLevel3Products = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch all data in parallel for efficiency
      const [level3Products, level2Products, level1Products] = await Promise.all([
        Level4Service.getLevel3ProductsWithLevel4(),
        productDataService.getLevel2Products(),
        productDataService.getLevel1Products(),
      ]);
      
      // 2. Create lookup maps for fast access, avoiding nested loops
      const level1Map = new Map(level1Products.map(p => [p.id, p]));
      const level2Map = new Map(level2Products.map(p => [p.id, p]));

      // 3. Fetch all configurations in parallel
      const configPromises = level3Products.map(p => 
        // The service returns null for "not found" and throws for other errors.
        // This allows Promise.all to fail correctly on critical errors like 406.
        Level4Service.getLevel4Configuration(p.id).then(config => ({ productId: p.id, config }))
      );
      const configResults = await Promise.all(configPromises);
      const configMap = new Map(configResults.map(r => [r.productId, r.config]));

      // 4. Process all products with the fetched data
      const productsWithConfig = level3Products.map(product => {
        // Build parent chain using maps
        let parentChain = product.name;
        if (product.parent_product_id) {
          const parentLevel2 = level2Map.get(product.parent_product_id);
          if (parentLevel2) {
            // Check if parentProductId exists and is a valid key in level1Map
            if (parentLevel2.parentProductId && level1Map.has(parentLevel2.parentProductId)) {
              const parentLevel1 = level1Map.get(parentLevel2.parentProductId);
              parentChain = `${parentLevel1?.name || 'Unknown'} → ${parentLevel2.name} → ${product.name}`;
            } else {
              // If no valid parentProductId, just show the direct parent
              parentChain = `${parentLevel2.name} → ${product.name}`;
            }
          } else {
            // If parent level 2 not found, just show the product name with unknown parent
            parentChain = `Unknown → ${product.name}`;
          }
        }

        // Get configuration from map
        const config = configMap.get(product.id) || undefined;
        
        return {
          ...product,
          parentChain,
          configuration: config,
          hasConfiguration: !!config
        };
      });

      setProducts(productsWithConfig);
    } catch (error) {
      console.error('Error loading Level 3 products:', error);
      let description = "Failed to load Level 4 products. Please try again.";
      // Check for a specific Supabase error code for a missing table
      if (error && typeof error === 'object' && 'code' in error && error.code === '42P01') {
        description = "The 'level4_configurations' table is missing from your database. Please apply the latest database migrations to resolve this issue.";
        setDbSchemaError(description);
      } else if (error && typeof error === 'object' && 'status' in error && error.status === 406) {
          description = "The API schema appears to be out of date. This can happen after database migrations. Restarting your Supabase services (or project on the cloud) will force the schema to reload.";
        setDbSchemaError(description);
      } else if (error instanceof Error) {
        description = error.message;
      }

      toast.error(description);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfigure = (product: Level3ProductWithConfig) => {
    navigate(`/admin/level4-config/${product.id}`);
    toast.success(`Opening Level 4 configuration for ${product.name}`);
  };

  const handlePreview = (product: Level3ProductWithConfig) => {
    // The new admin page serves as the preview as well
    navigate(`/admin/level4-config/${product.id}`);
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

  if (dbSchemaError) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Database Schema Mismatch</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">{dbSchemaError}</p>
            <p className="text-sm text-muted-foreground">
              This error indicates that your application code is ahead of your database schema. Run the following command in your project's terminal and then refresh this page.
            </p>
            <div className="mt-4 p-4 bg-muted rounded font-mono text-sm">
              <pre><code>supabase db push</code></pre>
            </div>
            <Button onClick={() => window.location.reload()} className="mt-4">
              Refresh Page
            </Button>
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
                          {product.configuration.mode === 'variable'
                            ? `Variable (max ${product.configuration.variable?.maxInputs})`
                            : `Fixed (${product.configuration.fixed?.numberOfInputs})`
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
    </div>
  );
};