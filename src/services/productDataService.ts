import { supabase } from '@/integrations/supabase/client';
import { Level1Product, Level2Product, Level3Product, ChassisType } from '@/types/product';


export const productDataService = {
  // Initialize method (placeholder for compatibility)
  async initialize() {
    // No-op for compatibility with existing components
  },

  // Level 1 Products
  async getLevel1Products(): Promise<Level1Product[]> {
    const { data, error } = await supabase
      .from('level1_products')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching level 1 products:', error);
      throw error;
    }

    return data || [];
  },

  // Sync versions for compatibility
  getLevel1ProductsSync(): Level1Product[] {
    // Return empty array for sync compatibility - components should use async versions
    return [];
  },

  async createLevel1Product(product: Omit<Level1Product, 'id'>): Promise<Level1Product> {
    const { data, error } = await supabase
      .from('level1_products')
      .insert([product])
      .select()
      .single();

    if (error) {
      console.error('Error creating level 1 product:', error);
      throw error;
    }

    return data;
  },

  async updateLevel1Product(id: string, updates: Partial<Level1Product>): Promise<Level1Product> {
    const { data, error } = await supabase
      .from('level1_products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating level 1 product:', error);
      throw error;
    }

    return data;
  },

  async deleteLevel1Product(id: string): Promise<void> {
    const { error } = await supabase
      .from('level1_products')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting level 1 product:', error);
      throw error;
    }
  },

  // Level 2 Products
  async getLevel2Products(): Promise<Level2Product[]> {
    const { data, error } = await supabase
      .from('level2_products')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching level 2 products:', error);
      throw error;
    }

    return data || [];
  },

  // Sync versions for compatibility
  getLevel2ProductsSync(): Level2Product[] {
    return [];
  },

  async getLevel2ProductsForLevel1(level1ProductId: string): Promise<Level2Product[]> {
    const { data, error } = await supabase
      .from('level2_products')
      .select('*')
      .eq('level1_product_id', level1ProductId)
      .order('name', { ascending: true });

    if (error) {
      console.error(`Error fetching level 2 products for level 1 product ${level1ProductId}:`, error);
      throw error;
    }

    return data || [];
  },

  async getLevel2ProductsByCategory(category: 'dga' | 'pd' | 'qtms'): Promise<Level2Product[]> {
    const { data, error } = await supabase
      .from('level2_products')
      .select('*')
      .eq('category', category)
      .order('name', { ascending: true });

    if (error) {
      console.error(`Error fetching level 2 products for category ${category}:`, error);
      throw error;
    }

    return data || [];
  },

  async createLevel2Product(product: Omit<Level2Product, 'id'>): Promise<Level2Product> {
    const { data, error } = await supabase
      .from('level2_products')
      .insert([product])
      .select()
      .single();

    if (error) {
      console.error('Error creating level 2 product:', error);
      throw error;
    }

    return data;
  },

  async updateLevel2Product(id: string, updates: Partial<Level2Product>): Promise<Level2Product> {
    const { data, error } = await supabase
      .from('level2_products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating level 2 product:', error);
      throw error;
    }

    return data;
  },

  async deleteLevel2Product(id: string): Promise<void> {
    const { error } = await supabase
      .from('level2_products')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting level 2 product:', error);
      throw error;
    }
  },

  // Level 3 Products
  async getLevel3Products(): Promise<Level3Product[]> {
    const { data, error } = await supabase
      .from('level3_products')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching level 3 products:', error);
      throw error;
    }

    return data || [];
  },

  // Sync versions for compatibility
  getLevel3ProductsSync(): Level3Product[] {
    return [];
  },

  async getLevel3ProductsForLevel2(level2ProductId: string): Promise<Level3Product[]> {
    const { data, error } = await supabase
      .from('level3_products')
      .select('*')
      .eq('level2_product_id', level2ProductId)
      .order('name', { ascending: true });

    if (error) {
      console.error(`Error fetching level 3 products for level 2 product ${level2ProductId}:`, error);
      throw error;
    }

    return data || [];
  },

  async createLevel3Product(product: Omit<Level3Product, 'id'>): Promise<Level3Product> {
    const { data, error } = await supabase
      .from('level3_products')
      .insert([product])
      .select()
      .single();

    if (error) {
      console.error('Error creating level 3 product:', error);
      throw error;
    }

    return data;
  },

  async updateLevel3Product(id: string, updates: Partial<Level3Product>): Promise<Level3Product> {
    const { data, error } = await supabase
      .from('level3_products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating level 3 product:', error);
      throw error;
    }

    return data;
  },

  async deleteLevel3Product(id: string): Promise<void> {
    const { error } = await supabase
      .from('level3_products')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting level 3 product:', error);
      throw error;
    }
  },

  // DGA Products
  async getDGAProducts(): Promise<any[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('category', 'DGA')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching DGA products:', error);
      throw error;
    }

    return data || [];
  },

   // PD Products
  async getPDProducts(): Promise<any[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('category', 'PD')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching PD products:', error);
      throw error;
    }

    return data || [];
  },

  // Level 4 Products (placeholder methods for compatibility)
  async getLevel4Products(): Promise<any[]> {
    return [];
  },

  getLevel4ProductsSync(): any[] {
    return [];
  },

  async createLevel4Product(product: any): Promise<any> {
    console.warn('Level 4 products not yet implemented');
    return product;
  },

  async updateLevel4Product(id: string, updates: any): Promise<any> {
    console.warn('Level 4 products not yet implemented');
    return updates;
  },

  async deleteLevel4Product(id: string): Promise<void> {
    console.warn('Level 4 products not yet implemented');
  },

  // Asset Types (placeholder methods for compatibility)
  async getAssetTypes(): Promise<any[]> {
    const { data, error } = await supabase
      .from('asset_types')
      .select('*')
      .eq('enabled', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching asset types:', error);
      return [];
    }

    return data || [];
  },

  getAssetTypesSync(): any[] {
    return [];
  },

  // Chassis Types
  async getChassisTypes(): Promise<ChassisType[]> {
    const { data, error } = await supabase
      .from('chassis_types')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching chassis types:', error);
      throw error;
    }

    return data || [];
  },

  async createChassisType(chassisType: any): Promise<ChassisType> {
    const { data, error } = await supabase
      .from('chassis_types')
      .insert([chassisType])
      .select()
      .single();

    if (error) {
      console.error('Error creating chassis type:', error);
      throw error;
    }

    return data;
  },

  async updateChassisType(id: string, updates: Partial<ChassisType>): Promise<ChassisType> {
    const { data, error } = await supabase
      .from('chassis_types')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating chassis type:', error);
      throw error;
    }

    return data;
  },

  async deleteChassisType(id: string): Promise<void> {
    const { error } = await supabase
      .from('chassis_types')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting chassis type:', error);
      throw error;
    }
  },

  // Sensor Configuration Methods (placeholder for compatibility)
  async updateAnalogSensorType(id: string, updates: any): Promise<any> {
    console.warn('Analog sensor types not yet implemented');
    return updates;
  },

  async createAnalogSensorType(sensorType: any): Promise<any> {
    console.warn('Analog sensor types not yet implemented');
    return sensorType;
  },

  async deleteAnalogSensorType(id: string): Promise<void> {
    console.warn('Analog sensor types not yet implemented');
  },

  async getAnalogSensorTypes(): Promise<any[]> {
    console.warn('Analog sensor types not yet implemented');
    return [];
  },

  async updateBushingTapModel(id: string, updates: any): Promise<any> {
    console.warn('Bushing tap models not yet implemented');
    return updates;
  },

  async createBushingTapModel(model: any): Promise<any> {
    console.warn('Bushing tap models not yet implemented');
    return model;
  },

  async deleteBushingTapModel(id: string): Promise<void> {
    console.warn('Bushing tap models not yet implemented');
  },

  async getBushingTapModels(): Promise<any[]> {
    console.warn('Bushing tap models not yet implemented');
    return [];
  },

  // Part Number Codes
  async getPartNumberCodesForLevel2(level2ProductId: string): Promise<Record<string, any>> {
    const { data, error } = await supabase
      .from('part_number_codes')
      .select('*')
      .eq('level2_product_id', level2ProductId);

    if (error) {
      console.error('Error fetching part number codes:', error);
      return {};
    }

    // Convert the array of codes into a dictionary keyed by level3_product_id
    const codes: Record<string, any> = {};
    data.forEach(code => {
      codes[code.level3_product_id] = code;
    });

    return codes;
  },

  async upsertPartNumberCodes(codes: any[]): Promise<any> {
    const { data, error } = await supabase
      .from('part_number_codes')
      .upsert(codes)
      .select();

    if (error) {
      console.error('Error upserting part number codes:', error);
      throw error;
    }

    return data;
  },

  // Part Number Configuration
  async getPartNumberConfig(level2ProductId: string) {
    const { data, error } = await supabase
      .from('part_number_configs')
      .select('*')
      .eq('level2_product_id', level2ProductId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching part number config:', error);
      throw error;
    }
    
    return data;
  },

  async upsertPartNumberConfig(config: {
    level2_product_id: string;
    prefix: string;
    slot_placeholder: string;
    slot_count: number;
  }) {
    const { data, error } = await supabase
      .from('part_number_configs')
      .upsert(config)
      .select()
      .single();
    
    if (error) {
      console.error('Error upserting part number config:', error);
      throw error;
    }
    
    return data;
  },
};

// Export for backwards compatibility
export { productDataService as ProductDataService };
