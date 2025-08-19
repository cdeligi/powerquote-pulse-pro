import { supabase } from '@/integrations/supabase/client';
import { Level1Product, Level2Product, Level3Product, Level4Product, ChassisConfiguration } from '@/types/product';

export class ProductDataService {
  // Level 1 Product methods
  async getLevel1Products(): Promise<Level1Product[]> {
    try {
      const { data, error } = await supabase
        .from('level1_products')
        .select('*')
        .eq('enabled', true)
        .order('name');

      if (error) {
        console.error('Error fetching Level 1 products:', error);
        throw error;
      }

      return (data || []).map(item => ({
        id: item.id,
        name: item.name,
        type: item.type || 'QTMS', // Ensure type is always present
        description: item.description || '',
        price: Number(item.price) || 0,
        cost: Number(item.cost) || 0,
        enabled: item.enabled
      }));
    } catch (error) {
      console.error('Error in getLevel1Products:', error);
      return [];
    }
  }

  async createLevel1Product(productData: Omit<Level1Product, 'id'>): Promise<Level1Product> {
    try {
      const { data, error } = await supabase
        .from('level1_products')
        .insert([productData])
        .select('*')
        .single();

      if (error) {
        console.error('Error creating Level 1 product:', error);
        throw error;
      }

      return {
        id: data.id,
        name: data.name,
        type: data.type || 'QTMS',
        description: data.description || '',
        price: Number(data.price) || 0,
        cost: Number(data.cost) || 0,
        enabled: data.enabled
      };
    } catch (error) {
      console.error('Error in createLevel1Product:', error);
      throw error;
    }
  }

  async updateLevel1Product(id: string, productData: Partial<Level1Product>): Promise<Level1Product> {
    try {
      const { data, error } = await supabase
        .from('level1_products')
        .update(productData)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        console.error('Error updating Level 1 product:', error);
        throw error;
      }

      return {
        id: data.id,
        name: data.name,
        type: data.type || 'QTMS',
        description: data.description || '',
        price: Number(data.price) || 0,
        cost: Number(data.cost) || 0,
        enabled: data.enabled
      };
    } catch (error) {
      console.error('Error in updateLevel1Product:', error);
      throw error;
    }
  }

  async deleteLevel1Product(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('level1_products')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting Level 1 product:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in deleteLevel1Product:', error);
      throw error;
    }
  }

  async saveLevel1Product(productData: Level1Product): Promise<Level1Product> {
    try {
      const { data, error } = await supabase
        .from('level1_products')
        .upsert([productData], { onConflict: 'id' })
        .select('*')
        .single();

      if (error) {
        console.error('Error saving Level 1 product:', error);
        throw error;
      }

      return {
        id: data.id,
        name: data.name,
        type: data.type || 'QTMS',
        description: data.description || '',
        price: Number(data.price) || 0,
        cost: Number(data.cost) || 0,
        enabled: data.enabled
      };
    } catch (error) {
      console.error('Error in saveLevel1Product:', error);
      throw error;
    }
  }

  // Level 2 Product methods
  async getLevel2Products(): Promise<Level2Product[]> {
    try {
      const { data, error } = await supabase
        .from('level2_products')
        .select('*')
        .eq('enabled', true)
        .order('name');

      if (error) {
        console.error('Error fetching Level 2 products:', error);
        throw error;
      }

      return (data || []).map(item => ({
        id: item.id,
        name: item.name,
        description: item.description || '',
        price: Number(item.price) || 0,
        cost: Number(item.cost) || 0,
        enabled: item.enabled,
        parentProductId: item.parent_product_id
      }));
    } catch (error) {
      console.error('Error in getLevel2Products:', error);
      return [];
    }
  }

  async createLevel2Product(productData: Omit<Level2Product, 'id'>): Promise<Level2Product> {
    try {
      const { data, error } = await supabase
        .from('level2_products')
        .insert([{
          name: productData.name,
          description: productData.description,
          price: productData.price,
          cost: productData.cost,
          enabled: productData.enabled,
          parent_product_id: productData.parentProductId
        }])
        .select('*')
        .single();

      if (error) {
        console.error('Error creating Level 2 product:', error);
        throw error;
      }

      return {
        id: data.id,
        name: data.name,
        description: data.description || '',
        price: Number(data.price) || 0,
        cost: Number(data.cost) || 0,
        enabled: data.enabled,
        parentProductId: data.parent_product_id
      };
    } catch (error) {
      console.error('Error in createLevel2Product:', error);
      throw error;
    }
  }

  async updateLevel2Product(id: string, productData: Partial<Level2Product>): Promise<Level2Product> {
    try {
      const updateData: any = {};
      if (productData.name !== undefined) updateData.name = productData.name;
      if (productData.description !== undefined) updateData.description = productData.description;
      if (productData.price !== undefined) updateData.price = productData.price;
      if (productData.cost !== undefined) updateData.cost = productData.cost;
      if (productData.enabled !== undefined) updateData.enabled = productData.enabled;
      if (productData.parentProductId !== undefined) updateData.parent_product_id = productData.parentProductId;

      const { data, error } = await supabase
        .from('level2_products')
        .update(updateData)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        console.error('Error updating Level 2 product:', error);
        throw error;
      }

      return {
        id: data.id,
        name: data.name,
        description: data.description || '',
        price: Number(data.price) || 0,
        cost: Number(data.cost) || 0,
        enabled: data.enabled,
        parentProductId: data.parent_product_id
      };
    } catch (error) {
      console.error('Error in updateLevel2Product:', error);
      throw error;
    }
  }

  async deleteLevel2Product(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('level2_products')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting Level 2 product:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in deleteLevel2Product:', error);
      throw error;
    }
  }

  async saveLevel2Product(productData: Level2Product): Promise<Level2Product> {
    try {
      const { data, error } = await supabase
        .from('level2_products')
        .upsert([{
          id: productData.id,
          name: productData.name,
          description: productData.description,
          price: productData.price,
          cost: productData.cost,
          enabled: productData.enabled,
          parent_product_id: productData.parentProductId
        }], { onConflict: 'id' })
        .select('*')
        .single();

      if (error) {
        console.error('Error saving Level 2 product:', error);
        throw error;
      }

      return {
        id: data.id,
        name: data.name,
        description: data.description || '',
        price: Number(data.price) || 0,
        cost: Number(data.cost) || 0,
        enabled: data.enabled,
        parentProductId: data.parent_product_id
      };
    } catch (error) {
      console.error('Error in saveLevel2Product:', error);
      throw error;
    }
  }

  // Level 3 Product methods
  async getLevel3Products(): Promise<Level3Product[]> {
    try {
      const { data, error } = await supabase
        .from('level3_products')
        .select('*')
        .eq('enabled', true)
        .order('name');

      if (error) {
        console.error('Error fetching Level 3 products:', error);
        throw error;
      }

      return (data || []).map(item => ({
        id: item.id,
        name: item.name,
        type: item.type || 'card',
        description: item.description || '',
        price: Number(item.price) || 0,
        cost: Number(item.cost) || 0,
        enabled: item.enabled,
        parentProductId: item.parent_product_id,
        requires_level4_config: item.requires_level4_config || false
      }));
    } catch (error) {
      console.error('Error in getLevel3Products:', error);
      return [];
    }
  }

  async createLevel3Product(productData: Omit<Level3Product, 'id'>): Promise<Level3Product> {
    try {
      const { data, error } = await supabase
        .from('level3_products')
        .insert([{
          name: productData.name,
          type: productData.type,
          description: productData.description,
          price: productData.price,
          cost: productData.cost,
          enabled: productData.enabled,
          parent_product_id: productData.parentProductId,
          requires_level4_config: productData.requires_level4_config || false
        }])
        .select('*')
        .single();

      if (error) {
        console.error('Error creating Level 3 product:', error);
        throw error;
      }

      return {
        id: data.id,
        name: data.name,
        type: data.type || 'card',
        description: data.description || '',
        price: Number(data.price) || 0,
        cost: Number(data.cost) || 0,
        enabled: data.enabled,
        parentProductId: data.parent_product_id,
        requires_level4_config: data.requires_level4_config || false
      };
    } catch (error) {
      console.error('Error in createLevel3Product:', error);
      throw error;
    }
  }

  async updateLevel3Product(id: string, productData: Partial<Level3Product>): Promise<Level3Product> {
    try {
      const updateData: any = {};
      if (productData.name !== undefined) updateData.name = productData.name;
      if (productData.type !== undefined) updateData.type = productData.type;
      if (productData.description !== undefined) updateData.description = productData.description;
      if (productData.price !== undefined) updateData.price = productData.price;
      if (productData.cost !== undefined) updateData.cost = productData.cost;
      if (productData.enabled !== undefined) updateData.enabled = productData.enabled;
      if (productData.parentProductId !== undefined) updateData.parent_product_id = productData.parentProductId;
      if (productData.requires_level4_config !== undefined) updateData.requires_level4_config = productData.requires_level4_config;

      const { data, error } = await supabase
        .from('level3_products')
        .update(updateData)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        console.error('Error updating Level 3 product:', error);
        throw error;
      }

      return {
        id: data.id,
        name: data.name,
        type: data.type || 'card',
        description: data.description || '',
        price: Number(data.price) || 0,
        cost: Number(data.cost) || 0,
        enabled: data.enabled,
        parentProductId: data.parent_product_id,
        requires_level4_config: data.requires_level4_config || false
      };
    } catch (error) {
      console.error('Error in updateLevel3Product:', error);
      throw error;
    }
  }

  async saveLevel3Product(productData: Level3Product): Promise<Level3Product> {
    try {
      const { data, error } = await supabase
        .from('level3_products')
        .upsert([{
          id: productData.id,
          name: productData.name,
          type: productData.type,
          description: productData.description,
          price: productData.price,
          cost: productData.cost,
          enabled: productData.enabled,
          parent_product_id: productData.parentProductId,
          requires_level4_config: productData.requires_level4_config
        }], { onConflict: 'id' })
        .select('*')
        .single();

      if (error) {
        console.error('Error saving Level 3 product:', error);
        throw error;
      }

      return {
        id: data.id,
        name: data.name,
        type: data.type || 'card',
        description: data.description || '',
        price: Number(data.price) || 0,
        cost: Number(data.cost) || 0,
        enabled: data.enabled,
        parentProductId: data.parent_product_id,
        requires_level4_config: data.requires_level4_config || false
      };
    } catch (error) {
      console.error('Error in saveLevel3Product:', error);
      throw error;
    }
  }

  // Level 4 Product methods  
  async getLevel4Products(): Promise<Level4Product[]> {
    try {
      const { data, error } = await supabase
        .from('level4_products')
        .select(`
          *,
          level4_product_configs!level4_product_configs_level4_product_id_fkey(
            id,
            config_data
          ),
          level4_configuration_options!level4_configuration_options_level4_product_id_fkey(
            id,
            option_key,
            option_value,
            enabled,
            display_order
          )
        `)
        .eq('enabled', true)
        .order('name');

      if (error) {
        console.error('Error fetching Level 4 products:', error);
        throw error;
      }

      return (data || []).map(item => ({
        id: item.id,
        name: item.name,
        description: item.description || '',
        price: Number(item.price) || 0,
        cost: Number(item.cost) || 0,
        enabled: item.enabled,
        parentProductId: item.parent_product_id,
        configurationType: item.configuration_type,
        options: (item.level4_configuration_options || []).map((opt: any) => ({
          id: opt.id,
          level4ProductId: item.id,
          optionKey: opt.option_key,
          optionValue: opt.option_value,
          displayOrder: opt.display_order || 0,
          enabled: opt.enabled
        })),
        configuration: item.level4_product_configs?.[0]?.config_data || null
      }));
    } catch (error) {
      console.error('Error in getLevel4Products:', error);
      return [];
    }
  }

  async saveLevel4Product(productData: Level4Product | Omit<Level4Product, 'id'>): Promise<{ id: string }> {
    try {
      const { options, configuration, ...rest } = productData as Level4Product;
      const isUpdate = 'id' in productData && !!productData.id;

      const { data, error } = await supabase
        .from('level4_products')
        .upsert([{
          id: isUpdate ? (productData as Level4Product).id : undefined,
          name: rest.name,
          description: rest.description,
          price: rest.price,
          cost: rest.cost,
          enabled: rest.enabled,
          parent_product_id: rest.parentProductId,
          configuration_type: rest.configurationType
        }], { onConflict: 'id' })
        .select('id')
        .single();

      if (error) {
        console.error('Error saving Level 4 product:', error);
        throw error;
      }

      return { id: data.id };
    } catch (error) {
      console.error('Error in saveLevel4Product:', error);
      throw error;
    }
  }

  async deleteLevel4Product(productId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('level4_products')
        .delete()
        .eq('id', productId);

      if (error) {
        console.error('Error deleting Level 4 product:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in deleteLevel4Product:', error);
      throw error;
    }
  }

  async saveLevel4Config(productId: string, configData: any): Promise<void> {
    try {
      const { error } = await supabase
        .from('level4_product_configs')
        .upsert({
          level4_product_id: productId,
          config_data: configData
        }, {
          onConflict: 'level4_product_id'
        });

      if (error) {
        console.error('Error saving Level 4 config:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in saveLevel4Config:', error);
      throw error;
    }
  }

  async getLevel4Config(productId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('level4_product_configs')
        .select('config_data')
        .eq('level4_product_id', productId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        console.error('Error fetching Level 4 config:', error);
        throw error;
      }

      return data?.config_data || null;
    } catch (error) {
      console.error('Error in getLevel4Config:', error);
      return null;
    }
  }

  async getChassisConfigurations(): Promise<ChassisConfiguration[]> {
    try {
      const { data, error } = await supabase
        .from('chassis_configurations')
        .select('*');

      if (error) {
        console.error('Error fetching chassis configurations:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getChassisConfigurations:', error);
      return [];
    }
  }

  async saveChassisConfiguration(config: ChassisConfiguration): Promise<ChassisConfiguration> {
    try {
      const { data, error } = await supabase
        .from('chassis_configurations')
        .upsert([config], { onConflict: 'id' })
        .select('*')
        .single();

      if (error) {
        console.error('Error saving chassis configuration:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in saveChassisConfiguration:', error);
      throw error;
    }
  }

  // Chassis Type methods
  async getChassisTypes(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('chassis_types')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching chassis types:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getChassisTypes:', error);
      return [];
    }
  }

  async createChassisType(chassisTypeData: any): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('chassis_types')
        .insert([chassisTypeData])
        .select('*')
        .single();

      if (error) {
        console.error('Error creating chassis type:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in createChassisType:', error);
      throw error;
    }
  }

  async updateChassisType(id: string, chassisTypeData: any): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('chassis_types')
        .update(chassisTypeData)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        console.error('Error updating chassis type:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in updateChassisType:', error);
      throw error;
    }
  }

  async deleteChassisType(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('chassis_types')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting chassis type:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error in deleteChassisType:', error);
      throw error;
    }
  }

  // Asset Type methods
  async getAssetTypes(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('asset_types')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching asset types:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAssetTypes:', error);
      return [];
    }
  }

  getAssetTypesSync(): any[] {
    // Return empty array as fallback for sync method
    return [];
  }

  // Part Number methods
  async getPartNumberConfig(level2Id: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('part_number_configs')
        .select('*')
        .eq('level2_product_id', level2Id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No config exists
        }
        console.error('Error fetching part number config:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getPartNumberConfig:', error);
      return null;
    }
  }

  async getLevel3ProductsForLevel2(level2Id: string): Promise<Level3Product[]> {
    try {
      const { data, error } = await supabase
        .from('level3_products')
        .select('*')
        .eq('parent_product_id', level2Id)
        .eq('enabled', true)
        .order('name');

      if (error) {
        console.error('Error fetching Level 3 products for Level 2:', error);
        throw error;
      }

      return (data || []).map(item => ({
        id: item.id,
        name: item.name,
        type: item.type || 'card',
        description: item.description || '',
        price: Number(item.price) || 0,
        cost: Number(item.cost) || 0,
        enabled: item.enabled,
        parentProductId: item.parent_product_id,
        requires_level4_config: item.requires_level4_config || false
      }));
    } catch (error) {
      console.error('Error in getLevel3ProductsForLevel2:', error);
      return [];
    }
  }

  async getPartNumberCodesForLevel2(level2Id: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('part_number_codes')
        .select('*')
        .eq('level2_product_id', level2Id)
        .order('position');

      if (error) {
        console.error('Error fetching part number codes for Level 2:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getPartNumberCodesForLevel2:', error);
      return [];
    }
  }

  async upsertPartNumberConfig(config: any): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('part_number_configs')
        .upsert([config], { onConflict: 'level2_product_id' })
        .select('*')
        .single();

      if (error) {
        console.error('Error upserting part number config:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in upsertPartNumberConfig:', error);
      throw error;
    }
  }

  async upsertPartNumberCodes(codes: any[]): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('part_number_codes')
        .upsert(codes, { onConflict: 'id' })
        .select('*');

      if (error) {
        console.error('Error upserting part number codes:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in upsertPartNumberCodes:', error);
      throw error;
    }
  }

  async getAnalogSensorTypes(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('analog_sensor_types')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching analog sensor types:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAnalogSensorTypes:', error);
      return [];
    }
  }

  async getBushingTapModels(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('bushing_tap_models')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching bushing tap models:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getBushingTapModels:', error);
      return [];
    }
  }

  static async getAnalogSensorTypes(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('analog_sensor_types')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching analog sensor types:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAnalogSensorTypes:', error);
      return [];
    }
  }

  static async getBushingTapModels(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('bushing_tap_models')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching bushing tap models:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getBushingTapModels:', error);
      return [];
    }
  }

  // Product category methods
  async getDGAProducts(): Promise<Level1Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('product_level', 1)
      .eq('enabled', true)
      .ilike('category', '%DGA%');
    
    if (error) throw error;
    return (data || []).map(item => ({
      id: item.id,
      name: item.name,
      type: item.type || 'DGA',
      description: item.description || '',
      price: Number(item.price) || 0,
      cost: Number(item.cost) || 0,
      enabled: item.enabled
    }));
  }

  async getPDProducts(): Promise<Level1Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('product_level', 1)
      .eq('enabled', true)
      .ilike('category', '%PD%');
    
    if (error) throw error;
    return (data || []).map(item => ({
      id: item.id,
      name: item.name,
      type: item.type || 'PD',
      description: item.description || '',
      price: Number(item.price) || 0,
      cost: Number(item.cost) || 0,
      enabled: item.enabled
    }));
  }

  async getLevel2ProductsByCategory(category: string): Promise<Level2Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('product_level', 2)
      .eq('enabled', true)
      .eq('category', category);
    
    if (error) throw error;
    return (data || []).map(item => ({
      id: item.id,
      name: item.name,
      description: item.description || '',
      price: Number(item.price) || 0,
      cost: Number(item.cost) || 0,
      enabled: item.enabled,
      parentProductId: item.parent_product_id
    }));
  }

  async getLevel2ProductsForLevel1(parentId: string): Promise<Level2Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('product_level', 2)
      .eq('enabled', true)
      .eq('parent_product_id', parentId);
    
    if (error) throw error;
    return (data || []).map(item => ({
      id: item.id,
      name: item.name,
      description: item.description || '',
      price: Number(item.price) || 0,
      cost: Number(item.cost) || 0,
      enabled: item.enabled,
      parentProductId: item.parent_product_id
    }));
  }

  async deleteLevel3Product(id: string): Promise<void> {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }

  async getLevel4ProductsByIds(ids: string[]): Promise<Level4Product[]> {
    if (!ids.length) return [];
    
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('product_level', 4)
      .in('id', ids);
    
    if (error) throw error;
    return (data || []).map(item => ({
      id: item.id,
      name: item.name,
      description: item.description || '',
      price: Number(item.price) || 0,
      cost: Number(item.cost) || 0,
      enabled: item.enabled,
      parentProductId: item.parent_product_id,
      configurationType: item.configuration_type || 'dropdown',
      options: []
    }));
  }

  async getChassisOptions(): Promise<Level2Product[]> {
    return this.getLevel2ProductsByCategory('QTMS');
  }

  async saveChassis(chassis: Partial<Level2Product>): Promise<Level2Product> {
    const { data, error } = await supabase
      .from('products')
      .upsert({
        ...chassis,
        product_level: 2,
        category: 'QTMS'
      })
      .select()
      .single();
    
    if (error) throw error;
    return {
      id: data.id,
      name: data.name,
      description: data.description || '',
      price: Number(data.price) || 0,
      cost: Number(data.cost) || 0,
      enabled: data.enabled,
      parentProductId: data.parent_product_id
    };
  }

  getLevel1ProductsSync(): Level1Product[] {
    return [];
  }

  getLevel2ProductsSync(): Level2Product[] {
    return [];
  }

  getLevel3ProductsSync(): Level3Product[] {
    return [];
  }

  async initialize(): Promise<void> {
    console.log('ProductDataService initialized');
  }

  async transformDbLevel1(dbProduct: any): Promise<Level1Product> {
    return {
      id: dbProduct.id,
      name: dbProduct.name,
      type: dbProduct.type || 'QTMS',
      description: dbProduct.description || '',
      price: Number(dbProduct.price) || 0,
      cost: Number(dbProduct.cost) || 0,
      enabled: dbProduct.enabled
    };
  }

  async transformDbLevel2(dbProduct: any): Promise<Level2Product> {
    return {
      id: dbProduct.id,
      name: dbProduct.name,
      description: dbProduct.description || '',
      price: Number(dbProduct.price) || 0,
      cost: Number(dbProduct.cost) || 0,
      enabled: dbProduct.enabled,
      parentProductId: dbProduct.parent_product_id
    };
  }

  async transformDbLevel3(dbProduct: any): Promise<Level3Product> {
    return {
      id: dbProduct.id,
      name: dbProduct.name,
      type: dbProduct.type || 'card',
      description: dbProduct.description || '',
      price: Number(dbProduct.price) || 0,
      cost: Number(dbProduct.cost) || 0,
      enabled: dbProduct.enabled,
      parentProductId: dbProduct.parent_product_id,
      requires_level4_config: dbProduct.requires_level4_config || false
    };
  }
}

export const productDataService = new ProductDataService();
