import { supabase } from '@/integrations/supabase/client';
import { Level1Product, Level2Product, Level3Product, Level4Product, ChassisConfiguration } from '@/types/product';

export class ProductDataService {
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
        description: item.description || '',
        price: Number(item.price) || 0,
        cost: Number(item.cost) || 0,
        enabled: item.enabled,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }));
    } catch (error) {
      console.error('Error in getLevel1Products:', error);
      return [];
    }
  }

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
        parentProductId: item.parent_product_id,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }));
    } catch (error) {
      console.error('Error in getLevel2Products:', error);
      return [];
    }
  }

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
        description: item.description || '',
        price: Number(item.price) || 0,
        cost: Number(item.cost) || 0,
        enabled: item.enabled,
        parentProductId: item.parent_product_id,
        requiresChassis: item.requires_chassis || false,
        requiresLevel4Config: item.requires_level4_config || false,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }));
    } catch (error) {
      console.error('Error in getLevel3Products:', error);
      return [];
    }
  }

  async getLevel3ProductsByIds(ids: string[]): Promise<Level3Product[]> {
    try {
      const { data, error } = await supabase
        .from('level3_products')
        .select('*')
        .in('id', ids);

      if (error) {
        console.error('Error fetching Level 3 products by IDs:', error);
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
        requiresChassis: item.requires_chassis || false,
        requiresLevel4Config: item.requires_level4_config || false,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }));
    } catch (error) {
      console.error('Error in getLevel3ProductsByIds:', error);
      return [];
    }
  }

  async getLevel4ProductsByParent(parentProductId: string): Promise<Level4Product[]> {
    try {
      const { data, error } = await supabase
        .from('level4_products')
        .select(`
          *,
          level4_product_configs!level4_product_configs_level4_product_id_fkey(
            id,
            config_data,
            created_at,
            updated_at
          ),
          level4_configuration_options!level4_configuration_options_level4_product_id_fkey(
            id,
            option_key,
            option_value,
            part_number,
            info_url,
            metadata,
            enabled,
            display_order
          )
        `)
        .eq('parent_product_id', parentProductId)
        .eq('enabled', true)
        .order('name');

      if (error) {
        console.error('Error fetching Level 4 products by parent ID:', error);
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
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        configuration: item.level4_product_configs?.[0]?.config_data || null,
        configurationOptions: (item.level4_configuration_options || []).map((opt: any) => ({
          id: opt.id,
          optionKey: opt.option_key,
          optionValue: opt.option_value,
          partNumber: opt.part_number,
          infoUrl: opt.info_url,
          metadata: opt.metadata || {},
          enabled: opt.enabled,
          displayOrder: opt.display_order || 0
        }))
      }));
    } catch (error) {
      console.error('Error in getLevel4ProductsByParent:', error);
      return [];
    }
  }

  async getLevel4Products(): Promise<Level4Product[]> {
    try {
      const { data, error } = await supabase
        .from('level4_products')
        .select(`
          *,
          level4_product_configs!level4_product_configs_level4_product_id_fkey(
            id,
            config_data,
            created_at,
            updated_at
          ),
          level4_configuration_options!level4_configuration_options_level4_product_id_fkey(
            id,
            option_key,
            option_value,
            part_number,
            info_url,
            metadata,
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
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        configuration: item.level4_product_configs?.[0]?.config_data || null,
        configurationOptions: (item.level4_configuration_options || []).map((opt: any) => ({
          id: opt.id,
          optionKey: opt.option_key,
          optionValue: opt.option_value,
          partNumber: opt.part_number,
          infoUrl: opt.info_url,
          metadata: opt.metadata || {},
          enabled: opt.enabled,
          displayOrder: opt.display_order || 0
        }))
      }));
    } catch (error) {
      console.error('Error in getLevel4Products:', error);
      return [];
    }
  }

  async getLevel4ProductsByIds(ids: string[]): Promise<Level4Product[]> {
    if (ids.length === 0) return [];

    try {
      const { data, error } = await supabase
        .from('level4_products')
        .select(`
          *,
          level4_product_configs!level4_product_configs_level4_product_id_fkey(
            id,
            config_data,
            created_at,
            updated_at
          ),
          level4_configuration_options!level4_configuration_options_level4_product_id_fkey(
            id,
            option_key,
            option_value,
            part_number,
            info_url,
            metadata,
            enabled,
            display_order
          )
        `)
        .in('id', ids);

      if (error) {
        console.error('Error fetching Level 4 products by IDs:', error);
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
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        configuration: item.level4_product_configs?.[0]?.config_data || null,
        configurationOptions: (item.level4_configuration_options || []).map((opt: any) => ({
          id: opt.id,
          optionKey: opt.option_key,
          optionValue: opt.option_value,
          partNumber: opt.part_number,
          infoUrl: opt.info_url,
          metadata: opt.metadata || {},
          enabled: opt.enabled,
          displayOrder: opt.display_order || 0
        }))
      }));
    } catch (error) {
      console.error('Error in getLevel4ProductsByIds:', error);
      return [];
    }
  }

  async saveLevel4Config(productId: string, configData: any): Promise<void> {
    try {
      const { error } = await supabase
        .from('level4_product_configs')
        .upsert({
          level4_product_id: productId,
          config_data: configData,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'level4_product_id'
        });

      if (error) {
        console.error('Error saving Level 4 config:', error);
        throw error;
      }

      console.log('Level 4 configuration saved successfully for product:', productId);
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
          return null; // No config exists
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
        description: data.description || '',
        price: Number(data.price) || 0,
        cost: Number(data.cost) || 0,
        enabled: data.enabled,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      console.error('Error in saveLevel1Product:', error);
      throw error;
    }
  }

  async saveLevel2Product(productData: Level2Product): Promise<Level2Product> {
    try {
      const { data, error } = await supabase
        .from('level2_products')
        .upsert([productData], { onConflict: 'id' })
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
        parentProductId: data.parent_product_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      console.error('Error in saveLevel2Product:', error);
      throw error;
    }
  }

  async saveLevel3Product(productData: Level3Product): Promise<Level3Product> {
    try {
      const { data, error } = await supabase
        .from('level3_products')
        .upsert([
          {
            id: productData.id,
            name: productData.name,
            description: productData.description,
            price: productData.price,
            cost: productData.cost,
            enabled: productData.enabled,
            parent_product_id: productData.parentProductId,
            requires_chassis: productData.requiresChassis,
            requires_level4_config: productData.requiresLevel4Config
          }
        ], { onConflict: 'id' })
        .select('*')
        .single();

      if (error) {
        console.error('Error saving Level 3 product:', error);
        throw error;
      }

      return {
        id: data.id,
        name: data.name,
        description: data.description || '',
        price: Number(data.price) || 0,
        cost: Number(data.cost) || 0,
        enabled: data.enabled,
        parentProductId: data.parent_product_id,
        requiresChassis: data.requires_chassis || false,
        requiresLevel4Config: data.requires_level4_config || false,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      console.error('Error in saveLevel3Product:', error);
      throw error;
    }
  }

  async saveLevel4Product(productData: Level4Product | Omit<Level4Product, 'id'>): Promise<{ id: string }> {
    try {
      const { id, ...rest } = productData as Level4Product;
      const isUpdate = !!id;

      const query = supabase
        .from('level4_products')
        .upsert([
          {
            id: isUpdate ? id : undefined,
            name: rest.name,
            description: rest.description,
            price: rest.price,
            cost: rest.cost,
            enabled: rest.enabled,
            parent_product_id: rest.parentProductId,
            configuration_type: rest.configurationType
          }
        ], { onConflict: 'id' })
        .select('id')
        .single();

      const { data, error } = await query;

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

  async transformDbLevel1(dbProduct: any): Promise<Level1Product> {
    return {
      id: dbProduct.id,
      name: dbProduct.name,
      description: dbProduct.description || '',
      price: Number(dbProduct.price) || 0,
      cost: Number(dbProduct.cost) || 0,
      enabled: dbProduct.enabled,
      createdAt: dbProduct.created_at,
      updatedAt: dbProduct.updated_at
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
      parentProductId: dbProduct.parent_product_id,
      createdAt: dbProduct.created_at,
      updatedAt: dbProduct.updated_at
    };
  }

  async transformDbLevel3(dbProduct: any): Promise<Level3Product> {
    return {
      id: dbProduct.id,
      name: dbProduct.name,
      description: dbProduct.description || '',
      price: Number(dbProduct.price) || 0,
      cost: Number(dbProduct.cost) || 0,
      enabled: dbProduct.enabled,
      parentProductId: dbProduct.parent_product_id,
      requiresChassis: dbProduct.requires_chassis || false,
      requiresLevel4Config: dbProduct.requires_level4_config || false,
      createdAt: dbProduct.created_at,
      updatedAt: dbProduct.updated_at
    };
  }
}

export const productDataService = new ProductDataService();
