import {
  Level1Product,
  Level2Product,
  Level3Product,
  Level4Product,
  Level4ConfigurationOption,
  AssetType,
  AnalogSensorOption,
  BushingTapModelOption,
} from "@/types/product";
import { supabase } from "@/integrations/supabase/client";

class ProductDataService {
  private initialized: boolean = false;

  constructor() {
    this.initialized = true;
  }

  async initialize(): Promise<void> {
    // No initialization needed - we always fetch fresh data from Supabase
    this.initialized = true;
  }

  // Transform database rows to Level1Product interface
  private transformDbToLevel1(row: any): Level1Product {
    return {
      id: row.id,
      name: row.name,
      type: row.subcategory || 'QTMS',
      category: row.category,
      description: row.description || '',
      price: parseFloat(row.price) || 0,
      cost: parseFloat(row.cost) || 0,
      enabled: row.enabled !== false,
      partNumber: row.part_number,
      image: row.image_url,
      productInfoUrl: row.product_info_url,
      hasQuantitySelection: false // Can be enhanced later
    };
  }

  // Transform database rows to Level2Product interface
  private transformDbToLevel2(row: any): Level2Product {
    return {
      id: row.id,
      name: row.name,
      parentProductId: row.parent_product_id || '',
      type: row.subcategory || 'LTX',
      description: row.description || '',
      price: parseFloat(row.price) || 0,
      cost: parseFloat(row.cost) || 0,
      enabled: row.enabled !== false,
      specifications: row.specifications || {},
      partNumber: row.part_number,
      image: row.image_url,
      productInfoUrl: row.product_info_url
    };
  }

  // Transform database rows to Level3Product interface
  private transformDbToLevel3(row: any): Level3Product {
    return {
      id: row.id,
      name: row.name,
      parentProductId: row.parent_product_id || '',
      type: row.subcategory || 'card',
      description: row.description || '',
      price: parseFloat(row.price) || 0,
      cost: parseFloat(row.cost) || 0,
      enabled: row.enabled !== false,
      specifications: {
        ...row.specifications,
        slotRequirement: row.slot_requirement || 1
      },
      partNumber: row.part_number,
      image: row.image_url,
      productInfoUrl: row.product_info_url
    };
  }

  // Level 1 Products (Real-time Supabase fetch)
  async getLevel1Products(): Promise<Level1Product[]> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('product_level', 1)
        .eq('enabled', true)
        .order('name');

      if (error) throw error;
      return (data || []).map(row => this.transformDbToLevel1(row));
    } catch (error) {
      console.error('Error fetching Level 1 products:', error);
      return [];
    }
  }

  // Level 2 Products (Real-time Supabase fetch)
  async getLevel2Products(): Promise<Level2Product[]> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('product_level', 2)
        .eq('enabled', true)
        .order('name');

      if (error) throw error;
      return (data || []).map(row => this.transformDbToLevel2(row));
    } catch (error) {
      console.error('Error fetching Level 2 products:', error);
      return [];
    }
  }

  // Level 3 Products (Real-time Supabase fetch)
  async getLevel3Products(): Promise<Level3Product[]> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('product_level', 3)
        .eq('enabled', true)
        .order('name');

      if (error) throw error;
      return (data || []).map(row => this.transformDbToLevel3(row));
    } catch (error) {
      console.error('Error fetching Level 3 products:', error);
      return [];
    }
  }

  // Level 4 Products (Real-time Supabase fetch)
  async getLevel4Products(): Promise<Level4Product[]> {
    try {
      const { data, error } = await supabase
        .from('level4_products')
        .select(`
          *,
          options:level4_configuration_options(*)
        `)
        .eq('enabled', true)
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching Level 4 products:', error);
      return [];
    }
  }

  // Get products with rack configuration enabled
  async getRackConfigurableProducts(): Promise<Level1Product[]> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('product_level', 1)
        .eq('enabled', true)
        .eq('rack_configurable', true)
        .order('name');

      if (error) throw error;
      return (data || []).map(row => this.transformDbToLevel1(row));
    } catch (error) {
      console.error('Error fetching rack configurable products:', error);
      return [];
    }
  }

  // Synchronous methods for backward compatibility (return empty arrays - force async usage)
  getLevel1ProductsSync(): Level1Product[] {
    console.warn('Sync methods deprecated - use async versions');
    return [];
  }

  getLevel2ProductsSync(): Level2Product[] {
    console.warn('Sync methods deprecated - use async versions');
    return [];
  }

  getLevel3ProductsSync(): Level3Product[] {
    console.warn('Sync methods deprecated - use async versions');
    return [];
  }

  getLevel4ProductsSync(): Level4Product[] {
    console.warn('Sync methods deprecated - use async versions');
    return [];
  }

  // Asset types (static for now)
  async getAssetTypes(): Promise<AssetType[]> {
    return [
      { id: 'power-transformer', name: 'Power Transformer', enabled: true },
      { id: 'gas-insulated-switchgear', name: 'Gas Insulated Switchgear', enabled: true },
      { id: 'breaker', name: 'Breaker', enabled: true }
    ];
  }

  getAssetTypesSync(): AssetType[] {
    return [
      { id: 'power-transformer', name: 'Power Transformer', enabled: true },
      { id: 'gas-insulated-switchgear', name: 'Gas Insulated Switchgear', enabled: true },
      { id: 'breaker', name: 'Breaker', enabled: true }
    ];
  }

  // Relationship methods using parent_product_id
  async getLevel2ProductsForLevel1(level1Id: string): Promise<Level2Product[]> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('product_level', 2)
        .eq('parent_product_id', level1Id)
        .eq('enabled', true)
        .order('name');

      if (error) throw error;
      return (data || []).map(row => this.transformDbToLevel2(row));
    } catch (error) {
      console.error('Error fetching Level 2 products for Level 1:', error);
      return [];
    }
  }

  async getLevel3ProductsForLevel2(level2Id: string): Promise<Level3Product[]> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('product_level', 3)
        .eq('parent_product_id', level2Id)
        .eq('enabled', true)
        .order('name');

      if (error) throw error;
      return (data || []).map(row => this.transformDbToLevel3(row));
    } catch (error) {
      console.error('Error fetching Level 3 products for Level 2:', error);
      return [];
    }
  }

  // CRUD Operations for Level 1 Products
  async createLevel1Product(product: Omit<Level1Product, 'id'>): Promise<Level1Product> {
    try {
      const id = `level1-${Date.now()}`;
      const { data, error } = await supabase
        .from('products')
        .insert({
          id,
          code: product.partNumber,
          name: product.name,
          description: product.description,
          price: product.price,
          cost: product.cost,
          category: product.category || 'monitoring-systems',
          subcategory: product.type,
          enabled: product.enabled,
          rack_configurable: (product as any).rackConfigurable || false,
          product_level: 1,
          part_number: product.partNumber,
          image_url: product.image,
          product_info_url: product.productInfoUrl
        })
        .select()
        .single();

      if (error) throw error;
      return this.transformDbToLevel1(data);
    } catch (error) {
      console.error('Error creating Level 1 product:', error);
      throw error;
    }
  }

  async updateLevel1Product(id: string, updates: Partial<Level1Product>): Promise<Level1Product | null> {
    try {
      const { data, error } = await supabase
        .from('products')
        .update({
          code: updates.partNumber,
          name: updates.name,
          description: updates.description,
          price: updates.price,
          cost: updates.cost,
          category: updates.category,
          subcategory: updates.type,
          enabled: updates.enabled,
          rack_configurable: (updates as any).rackConfigurable,
          part_number: updates.partNumber,
          image_url: updates.image,
          product_info_url: updates.productInfoUrl
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return this.transformDbToLevel1(data);
    } catch (error) {
      console.error('Error updating Level 1 product:', error);
      return null;
    }
  }

  async deleteLevel1Product(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting Level 1 product:', error);
      throw error;
    }
  }

  // CRUD Operations for Level 2 Products
  async createLevel2Product(product: Omit<Level2Product, 'id'>): Promise<Level2Product> {
    try {
      const id = `level2-${Date.now()}`;
      const { data, error } = await supabase
        .from('products')
        .insert({
          id,
          code: product.partNumber,
          name: product.name,
          description: product.description,
          price: product.price,
          cost: product.cost,
          category: 'chassis',
          subcategory: product.type,
          enabled: product.enabled,
          parent_product_id: product.parentProductId,
          product_level: 2,
          part_number: product.partNumber,
          specifications: product.specifications,
          image_url: product.image,
          product_info_url: product.productInfoUrl
        })
        .select()
        .single();

      if (error) throw error;
      return this.transformDbToLevel2(data);
    } catch (error) {
      console.error('Error creating Level 2 product:', error);
      throw error;
    }
  }

  async updateLevel2Product(id: string, updates: Partial<Level2Product>): Promise<Level2Product | null> {
    try {
      const { data, error } = await supabase
        .from('products')
        .update({
          code: updates.partNumber,
          name: updates.name,
          description: updates.description,
          price: updates.price,
          cost: updates.cost,
          subcategory: updates.type,
          enabled: updates.enabled,
          parent_product_id: updates.parentProductId,
          part_number: updates.partNumber,
          specifications: updates.specifications,
          image_url: updates.image,
          product_info_url: updates.productInfoUrl
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return this.transformDbToLevel2(data);
    } catch (error) {
      console.error('Error updating Level 2 product:', error);
      return null;
    }
  }

  async deleteLevel2Product(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting Level 2 product:', error);
      throw error;
    }
  }

  // CRUD Operations for Level 3 Products
  async createLevel3Product(product: Omit<Level3Product, 'id'>): Promise<Level3Product> {
    try {
      const id = `level3-${Date.now()}`;
      const { data, error } = await supabase
        .from('products')
        .insert({
          id,
          code: product.partNumber,
          name: product.name,
          description: product.description,
          price: product.price,
          cost: product.cost,
          category: 'card',
          subcategory: product.type,
          enabled: product.enabled,
          parent_product_id: product.parentProductId,
          product_level: 3,
          part_number: product.partNumber,
          slot_requirement: product.specifications?.slotRequirement || 1,
          specifications: product.specifications,
          image_url: product.image,
          product_info_url: product.productInfoUrl
        })
        .select()
        .single();

      if (error) throw error;
      return this.transformDbToLevel3(data);
    } catch (error) {
      console.error('Error creating Level 3 product:', error);
      throw error;
    }
  }

  async updateLevel3Product(id: string, updates: Partial<Level3Product>): Promise<Level3Product | null> {
    try {
      const { data, error } = await supabase
        .from('products')
        .update({
          code: updates.partNumber,
          name: updates.name,
          description: updates.description,
          price: updates.price,
          cost: updates.cost,
          subcategory: updates.type,
          enabled: updates.enabled,
          parent_product_id: updates.parentProductId,
          part_number: updates.partNumber,
          slot_requirement: updates.specifications?.slotRequirement,
          specifications: updates.specifications,
          image_url: updates.image,
          product_info_url: updates.productInfoUrl
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return this.transformDbToLevel3(data);
    } catch (error) {
      console.error('Error updating Level 3 product:', error);
      return null;
    }
  }

  async deleteLevel3Product(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting Level 3 product:', error);
      throw error;
    }
  }

  // CRUD Operations for Level 4 Products
  async createLevel4Product(product: Omit<Level4Product, 'id'>): Promise<Level4Product> {
    try {
      const id = `level4-${Date.now()}`;
      const { data, error } = await supabase
        .from('level4_products')
        .insert({
          id,
          name: product.name,
          parent_product_id: product.parentProductId,
          description: product.description,
          configuration_type: product.configurationType,
          price: product.price,
          cost: product.cost,
          enabled: product.enabled,
          part_number: (product as any).partNumber
        })
        .select()
        .single();

      if (error) throw error;
      return { ...data, options: [] };
    } catch (error) {
      console.error('Error creating Level 4 product:', error);
      throw error;
    }
  }

  async updateLevel4Product(id: string, updates: Partial<Level4Product>): Promise<Level4Product | null> {
    try {
      const { data, error } = await supabase
        .from('level4_products')
        .update({
          name: updates.name,
          parent_product_id: updates.parentProductId,
          description: updates.description,
          configuration_type: updates.configurationType,
          price: updates.price,
          cost: updates.cost,
          enabled: updates.enabled,
          part_number: (updates as any).partNumber
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { ...data, options: [] };
    } catch (error) {
      console.error('Error updating Level 4 product:', error);
      return null;
    }
  }

  async deleteLevel4Product(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('level4_products')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting Level 4 product:', error);
      throw error;
    }
  }

  // Static sensor/bushing methods (can be enhanced to use Supabase later)
  getAnalogSensorTypes(): AnalogSensorOption[] {
    return [
      { id: 'temp', name: 'Temperature', description: 'Temperature sensor input' },
      { id: 'pressure', name: 'Pressure', description: 'Pressure sensor input' },
      { id: 'current', name: 'Current', description: 'Current measurement input' },
      { id: 'voltage', name: 'Voltage', description: 'Voltage measurement input' }
    ];
  }

  getBushingTapModels(): BushingTapModelOption[] {
    return [
      { id: 'model-a', name: 'Model A' },
      { id: 'model-b', name: 'Model B' }
    ];
  }

  async createAnalogSensorType(data: Omit<AnalogSensorOption, 'id'>): Promise<AnalogSensorOption> {
    // Implement when needed
    throw new Error('Not implemented - use Supabase table');
  }

  async updateAnalogSensorType(id: string, data: Partial<Omit<AnalogSensorOption, 'id'>>): Promise<AnalogSensorOption | null> {
    // Implement when needed
    throw new Error('Not implemented - use Supabase table');
  }

  async deleteAnalogSensorType(id: string): Promise<void> {
    // Implement when needed
    throw new Error('Not implemented - use Supabase table');
  }

  async createBushingTapModel(data: Omit<BushingTapModelOption, 'id'>): Promise<BushingTapModelOption> {
    // Implement when needed
    throw new Error('Not implemented - use Supabase table');
  }

  async updateBushingTapModel(id: string, data: Partial<Omit<BushingTapModelOption, 'id'>>): Promise<BushingTapModelOption | null> {
    // Implement when needed
    throw new Error('Not implemented - use Supabase table');
  }

  async deleteBushingTapModel(id: string): Promise<void> {
    // Implement when needed
    throw new Error('Not implemented - use Supabase table');
  }

  // Debug and utility methods
  async resetAndReload(): Promise<void> {
    console.log('Reset not needed - always fetching fresh data from Supabase');
  }

  clearCorruptedData(): void {
    console.log('Clear not needed - using Supabase as source of truth');
  }

  getDebugInfo(): any {
    return {
      service: 'Real Supabase ProductDataService',
      initialized: this.initialized,
      note: 'All data fetched real-time from Supabase'
    };
  }
}

// Export singleton instance
export const productDataService = new ProductDataService();

// Expose debug info for development
if (typeof window !== 'undefined') {
  (window as any).productDataService = productDataService;
  (window as any).getProductDebugInfo = () => productDataService.getDebugInfo();
}