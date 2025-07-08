
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Level2Product {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  cost: number | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
  parent_product_id: string;
}

export const useLevel2Products = () => {
  const [products, setProducts] = useState<Level2Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('level4_products')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching level 2 products:', error);
        toast({
          title: "Error",
          description: "Failed to load level 2 products",
          variant: "destructive"
        });
        return;
      }

      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching level 2 products:', error);
      toast({
        title: "Error",
        description: "Failed to load level 2 products",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createProduct = async (product: Omit<Level2Product, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('level4_products')
        .insert([product])
        .select()
        .single();

      if (error) {
        console.error('Error creating product:', error);
        toast({
          title: "Error",
          description: "Failed to create product",
          variant: "destructive"
        });
        return null;
      }

      toast({
        title: "Success",
        description: "Product created successfully",
      });

      await fetchProducts();
      return data;
    } catch (error) {
      console.error('Error creating product:', error);
      toast({
        title: "Error",
        description: "Failed to create product",
        variant: "destructive"
      });
      return null;
    }
  };

  const updateProduct = async (id: string, updates: Partial<Level2Product>) => {
    try {
      const { data, error } = await supabase
        .from('level4_products')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating product:', error);
        toast({
          title: "Error",
          description: "Failed to update product",
          variant: "destructive"
        });
        return null;
      }

      toast({
        title: "Success",
        description: "Product updated successfully",
      });

      await fetchProducts();
      return data;
    } catch (error) {
      console.error('Error updating product:', error);
      toast({
        title: "Error",
        description: "Failed to update product",
        variant: "destructive"
      });
      return null;
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      const { error } = await supabase
        .from('level4_products')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting product:', error);
        toast({
          title: "Error",
          description: "Failed to delete product",
          variant: "destructive"
        });
        return false;
      }

      toast({
        title: "Success",
        description: "Product deleted successfully",
      });

      await fetchProducts();
      return true;
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        title: "Error",
        description: "Failed to delete product",
        variant: "destructive"
      });
      return false;
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  return {
    products,
    loading,
    createProduct,
    updateProduct,
    deleteProduct,
    refetch: fetchProducts
  };
};
