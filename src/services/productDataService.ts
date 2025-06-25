import { supabase } from "@/integrations/supabase/client";
import {
  Product,
  Level1Product,
  Level2Product,
  Level3Product,
  Level3Customization,
  Chassis,
  Card
} from "@/types/product";

interface PaginatedProducts {
  data: Product[];
  total: number;
}

class ProductDataService {
  async getProducts(page: number, pageSize: number, category?: string, subcategory?: string, searchTerm?: string): Promise<PaginatedProducts> {
    let query = supabase
      .from('products')
      .select('*', { count: 'exact' })
      .eq('is_active', true)
      .order('name')
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (category) {
      query = query.eq('category', category);
    }

    if (subcategory) {
      query = query.eq('subcategory', subcategory);
    }

    if (searchTerm) {
      query = query.ilike('name', `%${searchTerm}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching products:', error);
      return { data: [], total: 0 };
    }

    return {
      data: data?.map(product => ({
        id: product.id,
        name: product.name,
        description: product.description || '',
        price: product.price || 0,
        cost: product.cost || 0,
        category: product.category || '',
        subcategory: product.subcategory || ''
      })) || [],
      total: count || 0
    };
  }

  async getProductById(id: string): Promise<Product | null> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching product by ID:', error);
      return null;
    }

    return data ? {
      id: data.id,
      name: data.name,
      description: data.description || '',
      price: data.price || 0,
      cost: data.cost || 0,
      category: data.category || '',
      subcategory: data.subcategory || ''
    } : null;
  }

  async createProduct(product: Omit<Product, 'id'>): Promise<Product | null> {
    const productId = `PROD-${Date.now().toString().slice(-6)}`;
    const { data, error } = await supabase
      .from('products')
      .insert([
        {
          id: productId,
          name: product.name,
          description: product.description,
          price: product.price,
          cost: product.cost,
          category: product.category,
          subcategory: product.subcategory,
          is_active: true
        }
      ])
      .select('*')
      .single();

    if (error) {
      console.error('Error creating product:', error);
      return null;
    }

    return data ? {
      id: data.id,
      name: data.name,
      description: data.description || '',
      price: data.price || 0,
      cost: data.cost || 0,
      category: data.category || '',
      subcategory: data.subcategory || ''
    } : null;
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product | null> {
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating product:', error);
      return null;
    }

    return data ? {
      id: data.id,
      name: data.name,
      description: data.description || '',
      price: data.price || 0,
      cost: data.cost || 0,
      category: data.category || '',
      subcategory: data.subcategory || ''
    } : null;
  }

  async deleteProduct(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting product:', error);
      return false;
    }

    return true;
  }

  async toggleProductStatus(id: string, isActive: boolean): Promise<boolean> {
    const { error } = await supabase
      .from('products')
      .update({ is_active: isActive })
      .eq('id', id);

    if (error) {
      console.error('Error toggling product status:', error);
      return false;
    }

    return true;
  }

  async getAllLevel1Products(): Promise<Level1Product[]> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('category', 'level1')
        .eq('is_active', true);

      if (error) throw error;

      return data?.map(product => ({
        id: product.id,
        name: product.name,
        description: product.description || '',
        price: product.price || 0,
        cost: product.cost || 0,
        category: 'level1',
        subcategory: product.subcategory || '',
        enabled: true
      })) || [];
    } catch (error) {
      console.error('Error fetching Level 1 products:', error);
      return [];
    }
  }

  async getLevel1Products(): Promise<Level1Product[]> {
    return this.getAllLevel1Products();
  }

  async getAllLevel2Products(): Promise<Level2Product[]> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('category', 'level2')
        .eq('is_active', true);

      if (error) throw error;

      return data?.map(product => ({
        id: product.id,
        name: product.name,
        description: product.description || '',
        price: product.price || 0,
        cost: product.cost || 0,
        category: 'level2',
        subcategory: product.subcategory || '',
        enabled: true
      })) || [];
    } catch (error) {
      console.error('Error fetching Level 2 products:', error);
      return [];
    }
  }

  async getLevel2Products(): Promise<Level2Product[]> {
    return this.getAllLevel2Products();
  }

  async getAllLevel3Products(): Promise<Level3Product[]> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('category', 'level3')
        .eq('is_active', true);

      if (error) throw error;

      return data?.map(product => ({
        id: product.id,
        name: product.name,
        description: product.description || '',
        price: product.price || 0,
        cost: product.cost || 0,
        category: 'level3',
        subcategory: product.subcategory || '',
        enabled: true
      })) || [];
    } catch (error) {
      console.error('Error fetching Level 3 products:', error);
      return [];
    }
  }

  async getLevel3Products(): Promise<Level3Product[]> {
    return this.getAllLevel3Products();
  }

  async getProductsByCategory(category: string): Promise<Level1Product[]> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('category', category)
        .eq('is_active', true);

      if (error) throw error;

      return data?.map(product => ({
        id: product.id,
        name: product.name,
        description: product.description || '',
        price: product.price || 0,
        cost: product.cost || 0,
        category: category as any,
        subcategory: product.subcategory || '',
        enabled: true
      })) || [];
    } catch (error) {
      console.error(`Error fetching ${category} products:`, error);
      return [];
    }
  }

  async getChassisOptions(): Promise<Chassis[]> {
    // Mock data - replace with actual database query when needed
    return [
      { id: 'chassis1', name: 'LTX Chassis', type: 'LTX', height: '4U', slots: 14 },
      { id: 'chassis2', name: 'MTX Chassis', type: 'MTX', height: '2U', slots: 8 },
      { id: 'chassis3', name: 'STX Chassis', type: 'STX', height: '1U', slots: 5 }
    ];
  }

  async getAssetTypes(): Promise<string[]> {
    return ['Hardware', 'Software', 'Service', 'Accessory'];
  }

  async createLevel1Product(product: Omit<Level1Product, 'id'>): Promise<Level1Product | null> {
    return this.createProduct(product);
  }

  async createLevel2Product(product: Omit<Level2Product, 'id'>): Promise<Level2Product | null> {
    return this.createProduct(product);
  }

  async createLevel3Product(product: Omit<Level3Product, 'id'>): Promise<Level3Product | null> {
    return this.createProduct(product);
  }

  async updateLevel1Product(id: string, updates: Partial<Level1Product>): Promise<Level1Product | null> {
    return this.updateProduct(id, updates);
  }

  async updateLevel2Product(id: string, updates: Partial<Level2Product>): Promise<Level2Product | null> {
    return this.updateProduct(id, updates);
  }

  async updateLevel3Product(id: string, updates: Partial<Level3Product>): Promise<Level3Product | null> {
    return this.updateProduct(id, updates);
  }

  async deleteLevel1Product(id: string): Promise<boolean> {
    return this.deleteProduct(id);
  }

  async deleteLevel2Product(id: string): Promise<boolean> {
    return this.deleteProduct(id);
  }

  async deleteLevel3Product(id: string): Promise<boolean> {
    return this.deleteProduct(id);
  }

  async getLevel3Customizations(level3ProductId: string): Promise<Level3Customization[]> {
    // Mock data - replace with actual database query when needed
    return [
      { id: 'custom1', name: 'Color', options: ['Red', 'Blue', 'Green'] },
      { id: 'custom2', name: 'Size', options: ['Small', 'Medium', 'Large'] }
    ];
  }

  async getAllChassis(): Promise<Chassis[]> {
    // Mock data - replace with actual database query when needed
    return [
      { id: 'chassis1', name: 'LTX Chassis', type: 'LTX', height: '4U', slots: 14 },
      { id: 'chassis2', name: 'MTX Chassis', type: 'MTX', height: '2U', slots: 8 },
      { id: 'chassis3', name: 'STX Chassis', type: 'STX', height: '1U', slots: 5 }
    ];
  }

  async getCardsForChassis(chassisType: string): Promise<Card[]> {
    // Mock data - replace with actual database query when needed
    const cards: Card[] = [
      { id: 'card1', name: 'Relay Card', type: 'relay', description: 'High-density relay card', price: 550, cost: 275 },
      { id: 'card2', name: 'Analog Input Card', type: 'analog', description: '8-channel analog input', price: 720, cost: 360 },
      { id: 'card3', name: 'Bushing Monitor Card', type: 'bushing', description: 'Advanced bushing monitoring', price: 980, cost: 490 },
      { id: 'card4', name: 'Fiber Optic Card', type: 'fiber', description: 'High-speed fiber interface', price: 610, cost: 305 },
      { id: 'card5', name: 'Display Card', type: 'display', description: 'Remote display interface', price: 480, cost: 240 },
      { id: 'card6', name: 'Communication Card', type: 'communication', description: 'Serial communication interface', price: 590, cost: 295 },
      { id: 'card7', name: 'Digital I/O Card', type: 'digital', description: '32-channel digital I/O', price: 650, cost: 325 }
    ];

    // Filter cards based on chassis type, if needed
    return cards;
  }

  // Enhanced methods for multi-selection support
  async getLevel2ProductsByLevel1(level1ProductId: string): Promise<Level2Product[]> {
    try {
      // Get relationships from junction table
      const { data: relationships, error: relationError } = await supabase
        .from('level1_level2_relationships')
        .select('level2_product_id')
        .eq('level1_product_id', level1ProductId);

      if (relationError) throw relationError;

      if (!relationships || relationships.length === 0) {
        return [];
      }

      const level2ProductIds = relationships.map(r => r.level2_product_id);

      // Get the actual products
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*')
        .in('id', level2ProductIds)
        .eq('is_active', true);

      if (productsError) throw productsError;

      return products?.map(product => ({
        id: product.id,
        name: product.name,
        description: product.description || '',
        price: product.price || 0,
        cost: product.cost || 0,
        category: 'level2',
        subcategory: product.subcategory || '',
        enabled: true
      })) || [];
    } catch (error) {
      console.error('Error fetching Level 2 products:', error);
      return [];
    }
  }

  async getLevel3ProductsByLevel2(level2ProductId: string): Promise<Level3Product[]> {
    try {
      // Get relationships from junction table
      const { data: relationships, error: relationError } = await supabase
        .from('level2_level3_relationships')
        .select('level3_product_id')
        .eq('level2_product_id', level2ProductId);

      if (relationError) throw relationError;

      if (!relationships || relationships.length === 0) {
        return [];
      }

      const level3ProductIds = relationships.map(r => r.level3_product_id);

      // Get the actual products
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*')
        .in('id', level3ProductIds)
        .eq('is_active', true);

      if (productsError) throw productsError;

      return products?.map(product => ({
        id: product.id,
        name: product.name,
        description: product.description || '',
        price: product.price || 0,
        cost: product.cost || 0,
        category: 'level3',
        subcategory: product.subcategory || '',
        enabled: true
      })) || [];
    } catch (error) {
      console.error('Error fetching Level 3 products:', error);
      return [];
    }
  }

  // Admin methods for managing relationships
  async addLevel1Level2Relationship(level1ProductId: string, level2ProductId: string): Promise<void> {
    const { error } = await supabase
      .from('level1_level2_relationships')
      .insert({
        level1_product_id: level1ProductId,
        level2_product_id: level2ProductId
      });

    if (error) throw error;
  }

  async removeLevel1Level2Relationship(level1ProductId: string, level2ProductId: string): Promise<void> {
    const { error } = await supabase
      .from('level1_level2_relationships')
      .delete()
      .eq('level1_product_id', level1ProductId)
      .eq('level2_product_id', level2ProductId);

    if (error) throw error;
  }

  async addLevel2Level3Relationship(level2ProductId: string, level3ProductId: string): Promise<void> {
    const { error } = await supabase
      .from('level2_level3_relationships')
      .insert({
        level2_product_id: level2ProductId,
        level3_product_id: level3ProductId
      });

    if (error) throw error;
  }

  async removeLevel2Level3Relationship(level2ProductId: string, level3ProductId: string): Promise<void> {
    const { error } = await supabase
      .from('level2_level3_relationships')
      .delete()
      .eq('level2_product_id', level2ProductId)
      .eq('level3_product_id', level3ProductId);

    if (error) throw error;
  }

  async getLevel1ProductsForLevel2(level2ProductId: string): Promise<Level1Product[]> {
    try {
      const { data: relationships, error: relationError } = await supabase
        .from('level1_level2_relationships')
        .select('level1_product_id')
        .eq('level2_product_id', level2ProductId);

      if (relationError) throw relationError;

      if (!relationships || relationships.length === 0) {
        return [];
      }

      const level1ProductIds = relationships.map(r => r.level1_product_id);

      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*')
        .in('id', level1ProductIds)
        .eq('is_active', true);

      if (productsError) throw productsError;

      return products?.map(product => ({
        id: product.id,
        name: product.name,
        description: product.description || '',
        price: product.price || 0,
        cost: product.cost || 0,
        category: 'level1',
        subcategory: product.subcategory || '',
        enabled: true
      })) || [];
    } catch (error) {
      console.error('Error fetching Level 1 products for Level 2:', error);
      return [];
    }
  }

  async getLevel2ProductsForLevel3(level3ProductId: string): Promise<Level2Product[]> {
    try {
      const { data: relationships, error: relationError } = await supabase
        .from('level2_level3_relationships')
        .select('level2_product_id')
        .eq('level3_product_id', level3ProductId);

      if (relationError) throw relationError;

      if (!relationships || relationships.length === 0) {
        return [];
      }

      const level2ProductIds = relationships.map(r => r.level2_product_id);

      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*')
        .in('id', level2ProductIds)
        .eq('is_active', true);

      if (productsError) throw productsError;

      return products?.map(product => ({
        id: product.id,
        name: product.name,
        description: product.description || '',
        price: product.price || 0,
        cost: product.cost || 0,
        category: 'level2',
        subcategory: product.subcategory || '',
        enabled: true
      })) || [];
    } catch (error) {
      console.error('Error fetching Level 2 products for Level 3:', error);
      return [];
    }
  }

  async getQuoteFields(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('quote_fields')
        .select('*')
        .order('display_order');

      if (error) {
        console.error('Error fetching quote fields:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching quote fields:', error);
      return [];
    }
  }

  async updateQuoteField(id: string, updates: any): Promise<any | null> {
    try {
      const { data, error } = await supabase
        .from('quote_fields')
        .update(updates)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        console.error('Error updating quote field:', error);
        return null;
      }

      return data || null;
    } catch (error) {
      console.error('Error updating quote field:', error);
      return null;
    }
  }
}

export const productDataService = new ProductDataService();
