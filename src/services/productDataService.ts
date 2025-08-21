import {
  Level1Product,
  Level2Product,
  Level3Product,
  AssetType,
  AnalogSensorOption,
  BushingTapModelOption,
  Level4Configuration,
  Level4ConfigurationField,
  Level4DropdownOption,
  Level4SharedOption
} from "@/types/product";
import { ChassisType, ChassisTypeFormData } from "@/types/product/chassis-types";
import { supabase } from "@/integrations/supabase/client";

export class ProductDataService {
  private initialized: boolean = false;

  constructor() {
    this.initialized = true;
  }

  async initialize(): Promise<void> {
    this.initialized = true;
  }

  // Transform database rows to Level1Product interface
  private transformDbToLevel1(row: any): Level1Product {
    return {
      id: row.id,
      name: row.name,
      type: row.asset_type_id || row.subcategory || 'power-transformer',
      asset_type_id: row.asset_type_id,
      category: row.category,
      description: row.description || '',
      price: parseFloat(row.price) || 0,
      cost: parseFloat(row.cost) || 0,
      enabled: row.enabled !== false,
      partNumber: row.part_number,
      image: row.image_url,
      productInfoUrl: row.product_info_url,
      hasQuantitySelection: false,
      rackConfigurable: row.rack_configurable || false
    };
  }

  // Transform database rows to Level2Product interface
  private transformDbToLevel2(row: any): Level2Product {
    const rawChassisType = typeof row.chassis_type === 'string'
      ? row.chassis_type
      : (typeof row.type === 'string' ? row.type : (typeof row.subcategory === 'string' ? row.subcategory : 'N/A'));

    const normalized = String(rawChassisType).trim().toLowerCase();
    let mappedChassisType: string;
    switch (normalized) {
      case 'ltx':
      case '14-card':
      case '14card':
      case '14':
        mappedChassisType = 'LTX';
        break;
      case 'mtx':
      case '7-card':
      case '7card':
      case '7':
        mappedChassisType = 'MTX';
        break;
      case 'stx':
      case '4-card':
      case '4card':
      case '4':
        mappedChassisType = 'STX';
        break;
      default:
        mappedChassisType = rawChassisType ? String(rawChassisType).toUpperCase() : 'N/A';
    }

    const rawSpecs = (row.specifications && typeof row.specifications === 'object') ? row.specifications : {};
    const computedSlots = typeof rawSpecs.slots === 'number'
      ? rawSpecs.slots
      : (mappedChassisType === 'LTX' ? 14 : mappedChassisType === 'MTX' ? 7 : mappedChassisType === 'STX' ? 4 : 0);

    const transformed: Level2Product = {
      id: row.id,
      name: row.name,
      type: mappedChassisType,
      parentProductId: row.parent_product_id,
      description: row.description || '',
      price: parseFloat(row.price) || 0,
      cost: parseFloat(row.cost) || 0,
      enabled: row.enabled !== undefined ? row.enabled : true,
      chassisType: mappedChassisType,
      specifications: {
        ...rawSpecs,
        slots: computedSlots,
        capacity: mappedChassisType === 'LTX' ? 'High Capacity' : mappedChassisType === 'MTX' ? 'Medium Capacity' : 'Compact'
      },
      partNumber: row.part_number,
      image: row.image_url,
      productInfoUrl: row.product_info_url
    };

    return transformed;
  }

  // Transform database rows to Level3Product interface  
  private transformDbToLevel3(row: any): Level3Product {
    const rawSpecs = (row.specifications && typeof row.specifications === 'object') ? row.specifications : {};
    const subcategory = typeof row.subcategory === 'string' ? row.subcategory : '';
    const requires_level4_config = rawSpecs.requires_level4_config === true || Boolean(row.requires_level4_config);
    
    return {
      id: row.id,
      name: row.name,
      parentProductId: row.parent_product_id || '',
      parent_product_id: row.parent_product_id || '',
      type: subcategory || 'card',
      description: row.description || '',
      price: parseFloat(row.price) || 0,
      cost: parseFloat(row.cost) || 0,
      enabled: row.enabled !== false,
      product_level: 3 as const,
      requires_level4_config: requires_level4_config,
      specifications: {
        ...rawSpecs,
        slotRequirement: row.slot_requirement || rawSpecs.slotRequirement || 1
      },
      partNumber: row.part_number,
      image: row.image_url,
      productInfoUrl: row.product_info_url,
    };
  }

  // Level 1 Product Methods
  async getLevel1Products(): Promise<Level1Product[]> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('product_level', 1)
        .eq('enabled', true);
      
      if (error) throw error;
      return data.map(this.transformDbToLevel1);
    } catch (error) {
      console.error('Error fetching Level 1 products:', error);
      return [];
    }
  }

  async createLevel1Product(product: Omit<Level1Product, 'id'>): Promise<Level1Product | null> {
    try {
      const { data, error } = await supabase
        .from('products')
        .insert({
          name: product.name,
          description: product.description,
          price: product.price,
          cost: product.cost,
          enabled: product.enabled,
          part_number: product.partNumber,
          image_url: product.image,
          product_info_url: product.productInfoUrl,
          product_level: 1,
          asset_type_id: product.asset_type_id,
          rack_configurable: product.rackConfigurable
        })
        .select()
        .single();

      if (error) throw error;
      return this.transformDbToLevel1(data);
    } catch (error) {
      console.error('Error creating Level 1 product:', error);
      return null;
    }
  }

  // Level 2 Product Methods
  async getLevel2Products(parentId?: string): Promise<Level2Product[]> {
    try {
      let query = supabase
        .from('products')
        .select('*')
        .eq('product_level', 2)
        .eq('enabled', true);

      if (parentId) {
        query = query.eq('parent_product_id', parentId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data.map(this.transformDbToLevel2);
    } catch (error) {
      console.error('Error fetching Level 2 products:', error);
      return [];
    }
  }

  // Level 3 Product Methods
  async getLevel3Products(parentId?: string): Promise<Level3Product[]> {
    try {
      let query = supabase
        .from('products')
        .select('*')
        .eq('product_level', 3)
        .eq('enabled', true);

      if (parentId) {
        query = query.eq('parent_product_id', parentId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data.map(this.transformDbToLevel3);
    } catch (error) {
      console.error('Error fetching Level 3 products:', error);
      return [];
    }
  }

  async createLevel3Product(product: Omit<Level3Product, 'id'>): Promise<Level3Product | null> {
    try {
      const { data, error } = await supabase
        .from('products')
        .insert({
          name: product.name,
          parent_product_id: product.parent_product_id,
          description: product.description,
          price: product.price,
          cost: product.cost,
          enabled: product.enabled,
          product_level: 3,
          part_number: product.partNumber,
          requires_level4_config: product.requires_level4_config,
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
      return null;
    }
  }

  // Level 4 Configuration Methods
  async getLevel4Configuration(level3ProductId: string): Promise<Level4Configuration | null> {
    try {
      const { data: config, error: configError } = await supabase
        .from('level4_configurations')
        .select('*')
        .eq('level3_product_id', level3ProductId)
        .single();

      if (configError || !config) {
        return null;
      }

      const { data: fields, error: fieldsError } = await supabase
        .from('level4_configuration_fields')
        .select('*')
        .eq('level4_configuration_id', config.id)
        .order('display_order');

      if (fieldsError) {
        console.error('Error loading fields:', fieldsError);
        return null;
      }

      const { data: sharedOptions, error: optionsError } = await supabase
        .from('level4_shared_options')
        .select('*')
        .eq('level4_configuration_id', config.id)
        .order('display_order');

      if (optionsError) {
        console.error('Error loading shared options:', optionsError);
        return null;
      }

      return {
        id: config.id,
        level3_product_id: config.level3_product_id,
        name: config.name,
        fields: fields || [],
        shared_options: sharedOptions || [],
        default_option_id: config.default_option_id
      };
    } catch (error) {
      console.error('Error fetching Level 4 configuration:', error);
      return null;
    }
  }

  async addSharedOption(configurationId: string, optionData: Omit<Level4SharedOption, 'id' | 'created_at'>): Promise<Level4SharedOption | null> {
    try {
      const { data, error } = await supabase
        .from('level4_shared_options')
        .insert({
          level4_configuration_id: configurationId,
          ...optionData
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding shared option:', error);
      return null;
    }
  }

  async addDropdownOptionToField(optionData: Omit<Level4DropdownOption, 'id' | 'created_at'>): Promise<Level4DropdownOption | null> {
    try {
      const { data, error } = await supabase
        .from('level4_dropdown_options')
        .insert(optionData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding dropdown option:', error);
      return null;
    }
  }

  async updateSharedOption(optionId: string, updates: Partial<Level4SharedOption>): Promise<Level4SharedOption | null> {
    try {
      const { data, error } = await supabase
        .from('level4_shared_options')
        .update(updates)
        .eq('id', optionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating shared option:', error);
      return null;
    }
  }

  async updateDropdownOption(optionId: string, updates: Partial<Level4DropdownOption>): Promise<Level4DropdownOption | null> {
    try {
      const { data, error } = await supabase
        .from('level4_dropdown_options')
        .update(updates)
        .eq('id', optionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating dropdown option:', error);
      return null;
    }
  }

  async deleteSharedOption(optionId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('level4_shared_options')
        .delete()
        .eq('id', optionId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting shared option:', error);
      return false;
    }
  }

  async deleteDropdownOption(optionId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('level4_dropdown_options')
        .delete()
        .eq('id', optionId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting dropdown option:', error);
      return false;
    }
  }

  // Additional Level 4 service methods for compatibility
  async getChildProducts(parentProductId: string): Promise<Level3Product[]> {
    return this.getLevel3Products(parentProductId);
  }

  async createLevel4Product(productData: any): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('level4_products')
        .insert(productData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating Level 4 product:', error);
      throw error;
    }
  }

  async createLevel3Level4Relationship(level3Id: string, level4Id: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('level3_level4_relationships')
        .insert({
          level3_product_id: level3Id,
          level4_product_id: level4Id
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating Level 3-4 relationship:', error);
      throw error;
    }
  }

  async updateLevel4Product(productId: string, updates: any): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('level4_products')
        .update(updates)
        .eq('id', productId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating Level 4 product:', error);
      throw error;
    }
  }

  debugLevel4Products(): { success: boolean; error?: string } {
    console.log('Level 4 products debug - check database directly via Supabase dashboard');
    return { success: true };
  }

  async getLevel4Config(productId: string): Promise<any> {
    return this.getLevel4Configuration(productId);
  }

  getDebugInfo(): any {
    return {
      initialized: this.initialized,
      timestamp: new Date().toISOString()
    };
  }

  // Compatibility stubs for missing methods
  getLevel1ProductsSync(): Level1Product[] { return []; }
  getLevel2ProductsSync(): Level2Product[] { return []; }  
  getLevel3ProductsSync(): Level3Product[] { return []; }
  async getAssetTypes(): Promise<AssetType[]> { return []; }
  getAssetTypesSync(): AssetType[] { return []; }
  async getChassisTypes(): Promise<any[]> { return []; }
  async createChassisType(data: any): Promise<any> { return null; }
  async updateChassisType(id: string, data: any): Promise<any> { return null; }
  async deleteChassisType(id: string): Promise<boolean> { return false; }
  async getLevel3ProductsRequiringConfig(): Promise<Level3Product[]> { return []; }
  async getPartNumberConfig(id: string): Promise<any> { return null; }
  async getLevel3ProductsForLevel2(id: string): Promise<Level3Product[]> { return this.getLevel3Products(id); }
  async getPartNumberCodesForLevel2(id: string): Promise<any[]> { return []; }
  async upsertPartNumberConfig(data: any): Promise<any> { return null; }
  async upsertPartNumberCodes(data: any): Promise<any> { return null; }
  async updateLevel1Product(id: string, data: any): Promise<any> { return null; }
  async createLevel2Product(data: any): Promise<any> { return null; }
  async updateLevel2Product(id: string, data: any): Promise<any> { return null; }
  async updateLevel3Product(id: string, data: any): Promise<any> { return null; }
  async deleteLevel1Product(id: string): Promise<boolean> { return false; }
  async deleteLevel2Product(id: string): Promise<boolean> { return false; }
  async deleteLevel3Product(id: string): Promise<boolean> { return false; }
  async getLevel2ProductsByCategory(category: string): Promise<Level2Product[]> { return []; }
  async getLevel2ProductsForLevel1(id: string): Promise<Level2Product[]> { return this.getLevel2Products(id); }
  static getAnalogSensorTypes(): any[] { return []; }
  static getBushingTapModels(): any[] { return []; }
}

// Export singleton instance
export const productDataService = new ProductDataService();

// Expose debug info for development
if (typeof window !== 'undefined') {
  (window as any).productDataService = productDataService;
  (window as any).getProductDebugInfo = () => productDataService.getDebugInfo();
}