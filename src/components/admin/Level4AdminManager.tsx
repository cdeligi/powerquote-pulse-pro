import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { productDataService } from '@/services/productDataService';
import { Level3Product } from '@/types/product';
import { Level4ConfigurationManager } from './Level4ConfigurationManager';

export const Level4AdminManager: React.FC = () => {
  const [configurableProducts, setConfigurableProducts] = useState<Level3Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Level3Product | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      try {
        const products = await productDataService.getLevel3ProductsRequiringConfig();
        setConfigurableProducts(products);
        
        // If there's only one product, automatically select it
        if (products.length === 1) {
          setSelectedProduct(products[0]);
        }
      } catch (err) {
        setError('Failed to fetch products for configuration.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    if (!selectedProduct) {
      fetchProducts();
    }
  }, [selectedProduct]);

  if (selectedProduct) {
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => setSelectedProduct(null)} className="mb-4">
          &larr; Back to Products
        </Button>
        <Level4ConfigurationManager 
          level3ProductId={selectedProduct.id}
          onClose={() => setSelectedProduct(null)}
        />
      </div>
    );
  }

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Level 4 Configuration</CardTitle>
        <CardDescription>
          Select a product below to configure its dynamic options for the BOM builder.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product Name</TableHead>
              <TableHead>Parent Product ID</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {configurableProducts.map((product) => (
              <TableRow key={product.id}>
                <TableCell>{product.name}</TableCell>
                <TableCell>{product.parent_product_id}</TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" onClick={() => setSelectedProduct(product)}>
                    Configure
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {configurableProducts.length === 0 && (
          <p className="text-center text-muted-foreground mt-4">
            No Level 3 products are marked as requiring Level 4 configuration.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
