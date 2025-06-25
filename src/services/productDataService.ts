
import { supabase } from "@/integrations/supabase/client";
import {
  Product,
  Level1Product,
  Level2Product,
  Level3Product,
  Level3Customization,
  Chassis,
  Card,
  AssetType
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
        type: product.subcategory || '',
        category: product.category,
        description: product.description || '',
        price: product.price || 0,
        cost: product.cost || 0,
        productInfoUrl: product.product_info_url || '',
        enabled: product.is_active || true,
        image: product.image_url || '',
        partNumber: product.part_number || '',
        customizations: [],
        hasQuantitySelection: false
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
        parentProductId: product.parent_product_id || '',
        type: product.subcategory || '',
        description: product.description || '',
        price: product.price || 0,
        cost: product.cost || 0,
        enabled: product.is_active || true,
        specifications: product.specifications || {},
        partNumber: product.part_number || '',
        image: product.image_url || '',
        productInfoUrl: product.product_info_url || ''
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
        parentProductId: product.parent_product_id || '',
        type: product.subcategory || '',
        description: product.description || '',
        price: product.price || 0,
        cost: product.cost || 0,
        enabled: product.is_active || true,
        specifications: product.specifications || {},
        partNumber: product.part_number || '',
        image: product.image_url || ''
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
        type: product.subcategory || '',
        category: category,
        description: product.description || '',
        price: product.price || 0,
        cost: product.cost || 0,
        productInfoUrl: product.product_info_url || '',
        enabled: product.is_active || true,
        image: product.image_url || '',
        partNumber: product.part_number || '',
        customizations: [],
        hasQuantitySelection: false
      })) || [];
    } catch (error) {
      console.error(`Error fetching ${category} products:`, error);
      return [];
    }
  }

  async getChassisOptions(): Promise<Chassis[]> {
    // Mock data - replace with actual database query when needed
    return [
      {
        id: 'chassis1',
        name: 'LTX Chassis',
        parentProductId: '',
        type: 'LTX',
        description: '4U Chassis with 14 slots',
        price: 2500,
        cost: 1250,
        enabled: true,
        height: '4U',
        slots: 14,
        productInfoUrl: ''
      },
      {
        id: 'chassis2',
        name: 'MTX Chassis',
        parentProductId: '',
        type: 'MTX',
        description: '2U Chassis with 8 slots',
        price: 1800,
        cost: 900,
        enabled: true,
        height: '2U',
        slots: 8,
        productInfoUrl: ''
      },
      {
        id: 'chassis3',
        name: 'STX Chassis',
        parentProductId: '',
        type: 'STX',
        description: '1U Chassis with 5 slots',
        price: 1200,
        cost: 600,
        enabled: true,
        height: '1U',
        slots: 5,
        productInfoUrl: ''
      }
    ];
  }

  async getAssetTypes(): Promise<AssetType[]> {
    return [
      { id: 'hardware', name: 'Hardware', enabled: true },
      { id: 'software', name: 'Software', enabled: true },
      { id: 'service', name: 'Service', enabled: true },
      { id: 'accessory', name: 'Accessory', enabled: true }
    ];
  }

  async createLevel1Product(product: Omit<Level1Product, 'id'>): Promise<Level1Product | null> {
    const productData = {
      name: product.name,
      description: product.description,
      price: product.price,
      cost: product.cost || 0,
      category: 'level1',
      subcategory: product.type || ''
    };
    const result = await this.createProduct(productData);
    if (!result) return null;
    
    return {
      ...product,
      id: result.id,
      enabled: true
    };
  }

  async createLevel2Product(product: Omit<Level2Product, 'id'>): Promise<Level2Product | null> {
    const productData = {
      name: product.name,
      description: product.description,
      price: product.price,
      cost: product.cost || 0,
      category: 'level2',
      subcategory: product.type
    };
    const result = await this.createProduct(productData);
    if (!result) return null;
    
    return {
      ...product,
      id: result.id,
      enabled: true
    };
  }

  async createLevel3Product(product: Omit<Level3Product, 'id'>): Promise<Level3Product | null> {
    const productData = {
      name: product.name,
      description: product.description,
      price: product.price,
      cost: product.cost || 0,
      category: 'level3',
      subcategory: product.type
    };
    const result = await this.createProduct(productData);
    if (!result) return null;
    
    return {
      ...product,
      id: result.id,
      enabled: true
    };
  }

  async updateLevel1Product(id: string, updates: Partial<Level1Product>): Promise<Level1Product | null> {
    const productUpdates = {
      name: updates.name,
      description: updates.description,
      price: updates.price,
      cost: updates.cost,
      subcategory: updates.type
    };
    const result = await this.updateProduct(id, productUpdates);
    if (!result) return null;
    
    return {
      id: result.id,
      name: result.name,
      type: result.subcategory,
      category: result.category,
      description: result.description,
      price: result.price,
      cost: result.cost,
      enabled: true,
      productInfoUrl: '',
      image: '',
      partNumber: '',
      customizations: [],
      hasQuantitySelection: false
    };
  }

  async updateLevel2Product(id: string, updates: Partial<Level2Product>): Promise<Level2Product | null> {
    const productUpdates = {
      name: updates.name,
      description: updates.description,
      price: updates.price,
      cost: updates.cost,
      subcategory: updates.type
    };
    const result = await this.updateProduct(id, productUpdates);
    if (!result) return null;
    
    return {
      id: result.id,
      name: result.name,
      parentProductId: updates.parentProductId || '',
      type: result.subcategory,
      description: result.description,
      price: result.price,
      cost: result.cost,
      enabled: true,
      specifications: updates.specifications || {},
      partNumber: updates.partNumber || '',
      image: updates.image || '',
      productInfoUrl: updates.productInfoUrl || ''
    };
  }

  async updateLevel3Product(id: string, updates: Partial<Level3Product>): Promise<Level3Product | null> {
    const productUpdates = {
      name: updates.name,
      description: updates.description,
      price: updates.price,
      cost: updates.cost,
      subcategory: updates.type
    };
    const result = await this.updateProduct(id, productUpdates);
    if (!result) return null;
    
    return {
      id: result.id,
      name: result.name,
      parentProductId: updates.parentProductId || '',
      type: result.subcategory,
      description: result.description,
      price: result.price,
      cost: result.cost,
      enabled: true,
      specifications: updates.specifications || {},
      partNumber: updates.partNumber || '',
      image: updates.image || ''
    };
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
      { 
        id: 'custom1', 
        name: 'Color', 
        parentOptionId: level3ProductId,
        type: 'sensor_type',
        options: ['Red', 'Blue', 'Green'],
        price: 0,
        cost: 0,
        enabled: true
      },
      { 
        id: 'custom2', 
        name: 'Size', 
        parentOptionId: level3ProductId,
        type: 'channel_config',
        options: ['Small', 'Medium', 'Large'],
        price: 0,
        cost: 0,
        enabled: true
      }
    ];
  }

  async getAllChassis(): Promise<Chassis[]> {
    return this.getChassisOptions();
  }

  async getCardsForChassis(chassisType: string): Promise<Card[]> {
    // Mock data - replace with actual database query when needed
    const cards: Card[] = [
      { 
        id: 'card1', 
        name: 'Relay Card', 
        parentProductId: '',
        type: 'relay', 
        description: 'High-density relay card', 
        price: 550, 
        cost: 275,
        enabled: true,
        slotRequirement: 1,
        compatibleChassis: [chassisType],
        specifications: {
          slotRequirement: 1,
          inputs: 8,
          outputs: 8
        }
      },
      { 
        id: 'card2', 
        name: 'Analog Input Card', 
        parentProductId: '',
        type: 'analog', 
        description: '8-channel analog input', 
        price: 720, 
        cost: 360,
        enabled: true,
        slotRequirement: 1,
        compatibleChassis: [chassisType],
        specifications: {
          slotRequirement: 1,
          inputs: 8,
          channels: 8
        }
      },
      { 
        id: 'card3', 
        name: 'Bushing Monitor Card', 
        parentProductId: '',
        type: 'bushing', 
        description: 'Advanced bushing monitoring', 
        price: 980, 
        cost: 490,
        enabled: true,
        slotRequirement: 2,
        compatibleChassis: [chassisType],
        specifications: {
          slotRequirement: 2,
          channels: 4
        }
      },
      { 
        id: 'card4', 
        name: 'Fiber Optic Card', 
        parentProductId: '',
        type: 'fiber', 
        description: 'High-speed fiber interface', 
        price: 610, 
        cost: 305,
        enabled: true,
        slotRequirement: 1,
        compatibleChassis: [chassisType],
        specifications: {
          slotRequirement: 1,
          protocols: ['Ethernet', 'Fiber']
        }
      },
      { 
        id: 'card5', 
        name: 'Display Card', 
        parentProductId: '',
        type: 'display', 
        description: 'Remote display interface', 
        price: 480, 
        cost: 240,
        enabled: true,
        slotRequirement: 1,
        compatibleChassis: [chassisType],
        specifications: {
          slotRequirement: 1,
          outputs: 1
        }
      },
      { 
        id: 'card6', 
        name: 'Communication Card', 
        parentProductId: '',
        type: 'communication', 
        description: 'Serial communication interface', 
        price: 590, 
        cost: 295,
        enabled: true,
        slotRequirement: 1,
        compatibleChassis: [chassisType],
        specifications: {
          slotRequirement: 1,
          protocols: ['Serial', 'RS485']
        }
      },
      { 
        id: 'card7', 
        name: 'Digital I/O Card', 
        parentProductId: '',
        type: 'digital', 
        description: '32-channel digital I/O', 
        price: 650, 
        cost: 325,
        enabled: true,
        slotRequirement: 1,
        compatibleChassis: [chassisType],
        specifications: {
          slotRequirement: 1,
          inputs: 16,
          outputs: 16,
          channels: 32
        }
      }
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
        parentProductId: level1ProductId,
        type: product.subcategory || '',
        description: product.description || '',
        price: product.price || 0,
        cost: product.cost || 0,
        enabled: product.is_active || true,
        specifications: product.specifications || {},
        partNumber: product.part_number || '',
        image: product.image_url || '',
        productInfoUrl: product.product_info_url || ''
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
        parentProductId: level2ProductId,
        type: product.subcategory || '',
        description: product.description || '',
        price: product.price || 0,
        cost: product.cost || 0,
        enabled: product.is_active || true,
        specifications: product.specifications || {},
        partNumber: product.part_number || '',
        image: product.image_url || ''
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
        type: product.subcategory || '',
        category: product.category,
        description: product.description || '',
        price: product.price || 0,
        cost: product.cost || 0,
        productInfoUrl: product.product_info_url || '',
        enabled: product.is_active || true,
        image: product.image_url || '',
        partNumber: product.part_number || '',
        customizations: [],
        hasQuantitySelection: false
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
        parentProductId: product.parent_product_id || '',
        type: product.subcategory || '',
        description: product.description || '',
        price: product.price || 0,
        cost: product.cost || 0,
        enabled: product.is_active || true,
        specifications: product.specifications || {},
        partNumber: product.part_number || '',
        image: product.image_url || '',
        productInfoUrl: product.product_info_url || ''
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
