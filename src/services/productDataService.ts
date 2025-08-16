import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import { Level1Product, Level2Product, Level3Product, DGAProduct, PDProduct, ChassisType } from '@/types/product';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient<Database>(supabaseUrl, supabaseKey);

export const productDataService = {
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
  async getDGAProducts(): Promise<DGAProduct[]> {
    const { data, error } = await supabase
      .from('dga_products')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching DGA products:', error);
      throw error;
    }

    return data || [];
  },

   // PD Products
  async getPDProducts(): Promise<PDProduct[]> {
    const { data, error } = await supabase
      .from('pd_products')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching PD products:', error);
      throw error;
    }

    return data || [];
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
