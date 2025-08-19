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
import { ChassisType, ChassisTypeFormData } from "@/types/product/chassis-types";
import { supabase } from "@/integrations/supabase/client";

export class ProductDataService {
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
    console.group(`[transformDbToLevel2] Transforming product: ${row.name} (${row.id})`);
    
    // Log the raw row data for debugging
    console.log('Raw row data:', JSON.stringify(row, null, 2));

    // Determine chassis type safely
    const rawChassisType = typeof row.chassis_type === 'string'
      ? row.chassis_type
      : (typeof row.type === 'string' ? row.type : (typeof row.subcategory === 'string' ? row.subcategory : 'N/A'));

    // Normalize and map to standard chassis types
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

    // Ensure specifications is an object and inject safe defaults
    const rawSpecs = (row.specifications && typeof row.specifications === 'object') ? row.specifications : {};
    const computedSlots = typeof rawSpecs.slots === 'number'
      ? rawSpecs.slots
      : (mappedChassisType === 'LTX' ? 14 : mappedChassisType === 'MTX' ? 7 : mappedChassisType === 'STX' ? 4 : 0);

    const transformed: Level2Product = {
      id: row.id,
      name: row.name,
      // Back-compat: many components check .type for LTX/MTX/STX
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
        height: rawSpecs.height || '3U'
      },
      partNumber: row.part_number || '',
      image: row.image_url || '',
      productInfoUrl: row.product_info_url || ''
    };

    console.log('Transformed product:', JSON.stringify(transformed, null, 2));
    console.groupEnd();
    
    return transformed;
  }

  // Transform database rows to Level3Product interface
  private transformDbToLevel3(row: any): Level3Product {
    const rawSpecs = (row.specifications && typeof row.specifications === 'object') ? row.specifications : {};
    const subcategory = typeof row.subcategory === 'string' ? row.subcategory : '';
    // Get requires_level4_config from specifications JSON field
    const requires_level4_config = rawSpecs.requires_level4_config === true || Boolean(row.requires_level4_config);
    
    return {
      id: row.id,
      name: row.name,
      parentProductId: row.parent_product_id || '',
      type: subcategory || 'card',
      description: row.description || '',
      price: parseFloat(row.price) || 0,
      cost: parseFloat(row.cost) || 0,
      enabled: row.enabled !== false,
      requires_level4_config: requires_level4_config,
      specifications: {
        ...rawSpecs,
        slotRequirement: row.slot_requirement || rawSpecs.slotRequirement || 1
      },
      partNumber: row.part_number,
      image: row.image_url,
      productInfoUrl: row.product_info_url
    };
  }

  // Level 1 Products (Optimized with RPC)
  async getLevel1Products(): Promise<Level1Product[]> {
    try {
      const { data, error } = await supabase.rpc('get_products_by_level', { level_filter: 1 });
      if (error) throw error;
      return (data || []).map(row => this.transformDbToLevel1(row));
    } catch (error) {
      console.error('Error fetching Level 1 products:', error);
      return [];
    }
  }

  // DGA Products (Optimized with RPC)
  async getDGAProducts(): Promise<Level1Product[]> {
    try {
      const { data, error } = await supabase.rpc('get_dga_products');
      if (error) throw error;
      return (data || []).map(row => this.transformDbToLevel1(row));
    } catch (error) {
      console.error('Error fetching DGA products:', error);
      return [];
    }
  }

  // PD Products (Optimized with RPC)
  async getPDProducts(): Promise<Level1Product[]> {
    try {
      const { data, error } = await supabase.rpc('get_pd_products');
      if (error) throw error;
      return (data || []).map(row => this.transformDbToLevel1(row));
    } catch (error) {
      console.error('Error fetching PD products:', error);
      return [];
    }
  }

  // Level 2 Products (Optimized with RPC)
  async getLevel2Products(): Promise<Level2Product[]> {
    try {
      const { data, error } = await supabase.rpc('get_products_by_level', { level_filter: 2 });
      if (error) throw error;
      return (data || []).map(row => this.transformDbToLevel2(row));
    } catch (error) {
      console.error('Error fetching Level 2 products:', error);
      return [];
    }
  }

  // Level 3 Products (Real-time Supabase fetch)
  async getLevel3Products(requireLevel4Config: boolean = false): Promise<Level3Product[]> {
    try {
      let query = supabase
        .from('products')
        .select('*')
        .eq('product_level', 3)
        .eq('enabled', true);

      query = query.order('name');

      const { data, error } = await query;
      if (error) throw error;
      
      const transformedProducts = (data || []).map(row => this.transformDbToLevel3(row));
      
      // Filter client-side for requires_level4_config if needed
      if (requireLevel4Config) {
        return transformedProducts.filter(product => product.requires_level4_config);
      }
      
      return transformedProducts;
    } catch (error) {
      console.error('Error fetching Level 3 products:', error);
      return [];
    }
  }

  // Level 4 Products (Real-time Supabase fetch)
  async getLevel4Products(level3ProductId?: string): Promise<Level4Product[]> {
    try {
      console.log('getLevel4Products called with level3ProductId:', level3ProductId);
      
      let query = supabase
        .from('level4_products')
        .select(`
          *,
          options:level4_configuration_options(*)
        `)
        .eq('enabled', true);

      // If a specific Level 3 product ID is provided, filter for its configurations
      if (level3ProductId) {
        console.log('Fetching relationships for level3ProductId:', level3ProductId);
        
        // First, get the Level 4 product IDs that are related to this Level 3 product
        const { data: relationships, error: relError, count } = await supabase
          .from('level3_level4_relationships')
          .select('level4_product_id', { count: 'exact' })
          .eq('level3_product_id', level3ProductId);

        if (relError) {
          console.error('Error fetching relationships:', relError);
          throw relError;
        }
        
        console.log(`Found ${relationships?.length || 0} relationships for level3ProductId ${level3ProductId}`);
        
        // Extract just the level4_product_id values
        const level4ProductIds = relationships?.map(r => r.level4_product_id) || [];
        
        if (level4ProductIds.length > 0) {
          console.log('Filtering Level 4 products with IDs:', level4ProductIds);
          // Filter to only include these Level 4 products
          query = query.in('id', level4ProductIds);
        } else {
          console.log('No Level 4 products found for this Level 3 product');
          return [];
        }
      } else {
        console.log('No level3ProductId provided, fetching all Level 4 products');
      }

      const { data, error, count } = await query.order('name');

      if (error) {
        console.error('Error fetching Level 4 products:', error);
        throw error;
      }

      console.log(`Fetched ${data?.length || 0} Level 4 products`);
      if (data && data.length > 0) {
        console.log('First Level 4 product sample:', JSON.stringify(data[0], null, 2));
      }

      return data || [];
    } catch (error) {
      console.error('Error in getLevel4Products:', error);
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

  // Asset types from Supabase
  async getAssetTypes(): Promise<AssetType[]> {
    try {
      const { data, error } = await supabase
        .from('asset_types')
        .select('*')
        .eq('enabled', true)
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching asset types:', error);
      // Fallback to hardcoded values if database fails
      return [
        { id: 'power-transformer', name: 'Power Transformer', enabled: true },
        { id: 'gas-insulated-switchgear', name: 'Gas Insulated Switchgear', enabled: true },
        { id: 'breaker', name: 'Breaker', enabled: true }
      ];
    }
  }

  getAssetTypesSync(): AssetType[] {
    console.warn('Sync asset types deprecated - use async getAssetTypes()');
    return [
      { id: 'power-transformer', name: 'Power Transformer', enabled: true },
      { id: 'gas-insulated-switchgear', name: 'Gas Insulated Switchgear', enabled: true },
      { id: 'breaker', name: 'Breaker', enabled: true }
    ];
  }

  // Relationship methods using parent_product_id
  async getLevel2ProductsForLevel1(level1Id: string): Promise<Level2Product[]> {
    try {
      console.log(`Fetching Level 2 products for Level 1 ID: ${level1Id}`);
      
      const { data, error } = await supabase.rpc('get_level2_products_by_parent', {
        parent_id: level1Id
      });

      if (error) {
        console.error(`Error fetching Level 2 products for ${level1Id}:`, error);
        throw error;
      }

      console.log(`Found ${data?.length || 0} Level 2 products for ${level1Id}`);
      return (data || []).map(row => this.transformDbToLevel2(row));
    } catch (error) {
      console.error('Error in getLevel2ProductsForLevel1:', error);
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

  // Get Level 2 products by category using the new database function
  async getLevel2ProductsByCategory(category: 'dga' | 'pd' | 'qtms'): Promise<Level2Product[]> {
    try {
      console.group(`[ProductDataService] Fetching Level 2 products for category: ${category}`);
      
      // Try the category-based RPC first
      console.log(`Calling RPC: get_level2_products_for_category with category: ${category.toUpperCase()}`);
      const { data, error } = await supabase.rpc('get_level2_products_for_category', {
        category_filter: category.toUpperCase()
      });

      if (error) {
        console.error(`RPC Error (get_level2_products_for_category):`, error);
        console.log('Falling back to parent-based method...');
        
        // Fallback to parent-based method if category-based fails
        try {
          // Map category to parent ID
          const parentIdMap = {
            'dga': 'dga',
            'pd': 'pd',
            'qtms': 'qtms'
          };
          
          const parentId = parentIdMap[category];
          if (!parentId) {
            throw new Error(`No parent ID mapping for category: ${category}`);
          }
          
          console.log(`Fetching Level 2 products for parent ID: ${parentId}`);
          const parentBasedProducts = await this.getLevel2ProductsForLevel1(parentId);
          console.log(`Found ${parentBasedProducts.length} products using parent-based method`);
          
          // Ensure we have the category set correctly
          const productsWithCategory = parentBasedProducts.map(product => ({
            ...product,
            category: category.toLowerCase()
          }));
          
          console.groupEnd();
          return productsWithCategory;
        } catch (fallbackError) {
          console.error('Fallback method also failed:', fallbackError);
          throw new Error(`Both category-based and parent-based methods failed for ${category}`);
        }
      }

      // If we got here, the category-based method worked
      console.log(`RPC Response: Found ${data?.length || 0} products`);
      
      const level2Products = (data || []).map(row => {
        const transformed = this.transformDbToLevel2(row);
        console.log('Transformed product:', {
          id: transformed.id,
          name: transformed.name,
          enabled: transformed.enabled,
          chassisType: transformed.chassisType
        });
        return transformed;
      });

      console.log(`Returning ${level2Products.length} Level 2 products for ${category}`);
      console.groupEnd();
      return level2Products;
    } catch (error) {
      console.error(`Error in getLevel2ProductsByCategory for ${category}:`, error);
      console.groupEnd();
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
          asset_type_id: (product as any).asset_type_id,
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
          asset_type_id: (updates as any).asset_type_id,
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
          chassis_type: product.chassisType || 'N/A',
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
          chassis_type: updates.chassisType || 'N/A',
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
      
      // Merge requires_level4_config into specifications
      const specifications = {
        ...product.specifications,
        requires_level4_config: product.requires_level4_config || false
      };
      
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
          specifications: specifications,
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
      console.log('updateLevel3Product called with:', { id, updates });
      
      // First get the current product to merge specifications properly
      const { data: currentData, error: fetchError } = await supabase
        .from('products')
        .select('specifications')
        .eq('id', id)
        .single();
      
      if (fetchError) {
        console.error('Error fetching current product data:', fetchError);
        throw fetchError;
      }
      
      // Merge specifications properly
      const currentSpecs = (currentData?.specifications && typeof currentData.specifications === 'object') 
        ? currentData.specifications 
        : {};
      
      const newSpecs = updates.specifications || {};
      
      // Always include requires_level4_config in specifications
      const specifications = {
        ...currentSpecs,
        ...newSpecs,
        requires_level4_config: updates.requires_level4_config !== undefined 
          ? updates.requires_level4_config 
          : (newSpecs.requires_level4_config !== undefined 
            ? newSpecs.requires_level4_config 
            : currentSpecs.requires_level4_config || false)
      };
      
      console.log('Final specifications for update:', specifications);
      
      // Build update object with only non-undefined values
      const updateData: any = {};
      if (updates.partNumber !== undefined) updateData.code = updates.partNumber;
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.price !== undefined) updateData.price = updates.price;
      if (updates.cost !== undefined) updateData.cost = updates.cost;
      if (updates.type !== undefined) updateData.subcategory = updates.type;
      if (updates.enabled !== undefined) updateData.enabled = updates.enabled;
      if (updates.parentProductId !== undefined) updateData.parent_product_id = updates.parentProductId;
      if (updates.partNumber !== undefined) updateData.part_number = updates.partNumber;
      if (specifications.slotRequirement !== undefined) updateData.slot_requirement = specifications.slotRequirement;
      if (updates.image !== undefined) updateData.image_url = updates.image;
      if (updates.productInfoUrl !== undefined) updateData.product_info_url = updates.productInfoUrl;
      
      // Always update specifications since we computed it above
      updateData.specifications = specifications;
      
      console.log('Updating product with data:', updateData);

      const { data, error } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      console.log('Product updated successfully:', data);
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

  // Create relationship between Level 3 and Level 4 products
  async createLevel3Level4Relationship(level3ProductId: string, level4ProductId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('level3_level4_relationships')
        .insert({
          level3_product_id: level3ProductId,
          level4_product_id: level4ProductId
        });

      if (error) throw error;
      console.log(`Created relationship: ${level3ProductId} -> ${level4ProductId}`);
    } catch (error) {
      console.error('Error creating Level 3-4 relationship:', error);
      throw error;
    }
  }


  // Chassis Types CRUD operations
  async getChassisTypes(): Promise<ChassisType[]> {
    const { data, error } = await supabase
      .from('chassis_types')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching chassis types:', error);
      throw new Error(`Failed to fetch chassis types: ${error.message}`);
    }

    return (data || []).map(row => ({
      id: row.id,
      code: row.code,
      name: row.name,
      totalSlots: row.total_slots,
      layoutRows: row.layout_rows,
      visualLayout: row.visual_layout, // Map visual_layout from DB
      enabled: row.enabled,
      metadata: row.metadata || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  async createChassisType(data: ChassisTypeFormData): Promise<ChassisType> {
    const { data: result, error } = await supabase
      .from('chassis_types')
      .insert({
        code: data.code,
        name: data.name,
        total_slots: data.totalSlots,
        layout_rows: data.layoutRows,
        visual_layout: data.visualLayout,
        enabled: data.enabled,
        metadata: data.metadata || {}
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating chassis type:', error);
      throw new Error(`Failed to create chassis type: ${error.message}`);
    }

    return {
      id: result.id,
      code: result.code,
      name: result.name,
      totalSlots: result.total_slots,
      layoutRows: result.layout_rows,
      visualLayout: result.visual_layout,
      enabled: result.enabled,
      metadata: result.metadata || {},
      createdAt: result.created_at,
      updatedAt: result.updated_at
    };
  }

  async updateChassisType(id: string, updates: Partial<ChassisType>): Promise<ChassisType> {
    const updateData: any = {};
    if (updates.code !== undefined) updateData.code = updates.code;
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.totalSlots !== undefined) updateData.total_slots = updates.totalSlots;
    if (updates.layoutRows !== undefined) updateData.layout_rows = updates.layoutRows;
    if (updates.visualLayout !== undefined) updateData.visual_layout = updates.visualLayout;
    if (updates.enabled !== undefined) updateData.enabled = updates.enabled;
    if (updates.metadata !== undefined) updateData.metadata = updates.metadata;

    const { data, error } = await supabase
      .from('chassis_types')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating chassis type:', error);
      throw new Error(`Failed to update chassis type: ${error.message}`);
    }

    return {
      id: data.id,
      code: data.code,
      name: data.name,
      totalSlots: data.total_slots,
      layoutRows: data.layout_rows,
      visualLayout: data.visual_layout,
      enabled: data.enabled,
      metadata: data.metadata || {},
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  async deleteChassisType(id: string): Promise<void> {
    const { error } = await supabase
      .from('chassis_types')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting chassis type:', error);
      throw new Error(`Failed to delete chassis type: ${error.message}`);
    }
  }

  // Get allowed Level-3 products for a specific slot
  async getAllowedLevel3ProductsForSlot(
    chassisTypeId: string,
    slotNumber: number
  ): Promise<Level3Product[]> {
    try {
      const { data: links, error: e1 } = await supabase
        .from('chassis_slot_options')
        .select('level3_product_id')
        .eq('chassis_type_id', chassisTypeId)
        .eq('slot_number', slotNumber);
      
      if (e1) throw e1;

      const ids = (links || []).map(l => l.level3_product_id);
      if (!ids.length) return [];

      const { data: prods, error: e2 } = await supabase
        .from('products')
        .select('*')
        .in('id', ids)
        .eq('enabled', true);
      
      if (e2) throw e2;

      return (prods || []).map(row => this.transformDbToLevel3(row));
    } catch (error) {
      console.error('Error fetching allowed Level 3 products for slot:', error);
      return [];
    }
  }

  // Save slot options for a chassis type
  async saveSlotOptions(
    chassisTypeId: string,
    slotNumber: number,
    level3ProductIds: string[]
  ): Promise<void> {
    try {
      // First, delete existing options for this slot
      const { error: deleteError } = await supabase
        .from('chassis_slot_options')
        .delete()
        .eq('chassis_type_id', chassisTypeId)
        .eq('slot_number', slotNumber);

      if (deleteError) throw deleteError;

      // Then insert new options if any
      if (level3ProductIds.length > 0) {
        const insertData = level3ProductIds.map(productId => ({
          chassis_type_id: chassisTypeId,
          slot_number: slotNumber,
          level3_product_id: productId
        }));

        const { error: insertError } = await supabase
          .from('chassis_slot_options')
          .insert(insertData);

        if (insertError) throw insertError;
      }
    } catch (error) {
      console.error('Error saving slot options:', error);
      throw error;
    }
  }

  // Static sensor/bushing methods (can be enhanced to use Supabase later)
  static getAnalogSensorTypes(): AnalogSensorOption[] {
    return [
      { id: 'temp', name: 'Temperature', description: 'Temperature sensor input' },
      { id: 'pressure', name: 'Pressure', description: 'Pressure sensor input' },
      { id: 'current', name: 'Current', description: 'Current measurement input' },
      { id: 'voltage', name: 'Voltage', description: 'Voltage measurement input' }
    ];
  }

  static getBushingTapModels(): BushingTapModelOption[] {
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

  // Part Number Config - data-driven
  async getPartNumberConfig(level2Id: string): Promise<any | null> {
    try {
      const { data, error } = await supabase
        .from('part_number_configs')
        .select('*')
        .eq('level2_product_id', level2Id)
        .single();
      if (error) return null;
      return data;
    } catch (e) {
      console.error('getPartNumberConfig error:', e);
      return null;
    }
  }

  async upsertPartNumberConfig(config: {
    level2_product_id: string;
    prefix: string;
    slot_placeholder: string;
    slot_count: number;
    suffix_separator?: string;
    remote_off_code?: string;
    remote_on_code?: string;
  }): Promise<any | null> {
    try {
      const { data, error } = await supabase
        .from('part_number_configs')
        .upsert(config, { onConflict: 'level2_product_id' })
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (e) {
      console.error('upsertPartNumberConfig error:', e);
      return null;
    }
  }

  async getPartNumberCodesForLevel2(level2Id: string): Promise<Record<string, { template: string; slot_span: number; is_standard?: boolean; standard_position?: number | null; designated_only?: boolean; designated_positions?: number[]; outside_chassis?: boolean; notes?: string | null; exclusive_in_slots?: boolean; color?: string | null }>> {
    try {
      // Get all Level 3 under this Level 2
      const level3 = await this.getLevel3ProductsForLevel2(level2Id);
      const ids = level3.map(l => l.id);
      if (ids.length === 0) return {};
      const { data, error } = await supabase
        .from('part_number_codes')
        .select('*')
        .in('level3_product_id', ids);

      if (error) throw error;
      const map: Record<string, { template: string; slot_span: number; is_standard?: boolean; standard_position?: number | null; designated_only?: boolean; designated_positions?: number[]; outside_chassis?: boolean; notes?: string | null; exclusive_in_slots?: boolean; color?: string | null }> = {};
      (data || []).forEach((row: any) => {
        // Prefer overrides for this level2 if present
        const shouldOverride = row.level2_product_id === level2Id || !map[row.level3_product_id];
        if (shouldOverride) {
          map[row.level3_product_id] = {
            template: row.template,
            slot_span: row.slot_span || 1,
            is_standard: row.is_standard ?? false,
            standard_position: row.standard_position ?? null,
            designated_only: row.designated_only ?? false,
            designated_positions: row.designated_positions ?? [],
            outside_chassis: row.outside_chassis ?? false,
            notes: row.notes ?? null,
            exclusive_in_slots: row.exclusive_in_slots ?? false,
            color: row.color ?? null,
          };
        }
      });
      return map;
    } catch (e) {
      console.error('getPartNumberCodesForLevel2 error:', e);
      return {};
    }
  }

  async upsertPartNumberCodes(codes: Array<{ level3_product_id: string; level2_product_id?: string | null; template: string; slot_span?: number; is_standard?: boolean; standard_position?: number | null; designated_only?: boolean; designated_positions?: number[]; outside_chassis?: boolean; notes?: string | null; exclusive_in_slots?: boolean; color?: string | null }>): Promise<boolean> {
    try {
      if (!codes || codes.length === 0) return true;
      const payload = codes.map(c => ({
        level3_product_id: c.level3_product_id,
        level2_product_id: c.level2_product_id ?? null,
        template: c.template,
        slot_span: c.slot_span ?? 1,
        is_standard: c.is_standard ?? false,
        standard_position: c.standard_position ?? null,
        designated_only: c.designated_only ?? false,
        designated_positions: c.designated_positions ?? [],
        outside_chassis: c.outside_chassis ?? false,
        notes: c.notes ?? null,
        exclusive_in_slots: c.exclusive_in_slots ?? false,
        color: c.color ?? null,
      }));
      const { error } = await supabase.from('part_number_codes').upsert(payload, { onConflict: 'level3_product_id,level2_product_id' });
      if (error) throw error;
      return true;
    } catch (e) {
      console.error('upsertPartNumberCodes error:', e);
      return false;
    }
  }

  // Save Level 4 configuration
  async saveLevel4Config(productId: string, config: any): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('level4_product_configs')
        .upsert(
          {
            product_id: productId,
            config_data: config,
            updated_at: new Date().toISOString()
          },
          { 
            onConflict: 'product_id'
          }
        )
        .select()
        .single();

      if (error) throw error;
      
      // Return the saved configuration
      return data?.config_data || null;
    } catch (error) {
      console.error('Error saving Level 4 config:', error);
      throw error;
    }
  }

  // Get Level 4 configuration
  async getLevel4Config(productId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('level4_product_configs')
        .select('*')
        .eq('product_id', productId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "No rows returned"
        throw error;
      }

      return data?.config_data || null;
    } catch (error) {
      console.error('Error fetching Level 4 config:', error);
      throw error;
    }
  }

  // Get all Level 4 configurations for a product type
  async getLevel4ConfigsByType(productType: 'analog' | 'bushing'): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('level4_product_configs')
        .select('*, products!inner(*)')
        .eq('products.type', productType);

      if (error) throw error;
      return data.map(item => ({
        ...item.config_data,
        productId: item.product_id,
        product: item.products
      }));
    } catch (error) {
      console.error(`Error fetching ${productType} configs:`, error);
      throw error;
    }
  }

  async getChildProducts(parentId: string): Promise<Level4Product[]> {
    try {
      console.log(`Fetching Level 4 products for parent ID: ${parentId}`);
      
      // 1. Get all Level 4 products that are children of this parent
      const { data: level4Products, error: productsError } = await supabase
        .from('level4_products')
        .select(`
          *,
          options:level4_configuration_options(*)
        `)
        .eq('parent_product_id', parentId)
        .eq('enabled', true)
        .order('name');

      if (productsError) {
        console.error('Error fetching Level 4 products:', productsError);
        throw productsError;
      }

      console.log(`Found ${level4Products?.length || 0} Level 4 products`);

      // 2. Get any existing configurations for these products
      const productIds = level4Products?.map(p => p.id) || [];
      let configurations = {};
      
      if (productIds.length > 0) {
        const { data: configs, error: configError } = await supabase
          .from('level4_product_configs')
          .select('*')
          .in('product_id', productIds);
          
        if (configError) {
          console.error('Error fetching Level 4 configs:', configError);
        } else {
          // Create a map of product_id -> config
          configurations = configs?.reduce((acc, curr) => ({
            ...acc,
            [curr.product_id]: curr.config_data
          }), {}) || {};
        }
      }

      // 3. Map to Level4Product format
      return (level4Products || []).map(product => ({
        id: product.id,
        name: product.name,
        description: product.description || '',
        type: product.type || 'dropdown',
        configurationType: product.configuration_type || 'dropdown',
        price: parseFloat(product.price) || 0,
        cost: parseFloat(product.cost) || 0,
        enabled: product.enabled !== false,
        options: product.options || [],
        configuration: configurations[product.id] || null,
        parentProductId: parentId,
        product_level: 4,
        requires_level4_config: true
      }));
      
    } catch (error) {
      console.error('Error in getChildProducts:', error);
      throw error;
    }
  }

  // Create a new product
  async createProduct(productData: any): Promise<any> {
    try {
      // First, create the product in the products table
      const { data: product, error: productError } = await supabase
        .from('products')
        .insert([
          {
            name: productData.name,
            sku: productData.sku,
            product_level: productData.product_level,
            parent_product_id: productData.parent_product_id,
            type: productData.type,
            requires_level4_config: productData.requires_level4_config,
            enabled: true,
            description: productData.description || '',
            price: productData.price || 0,
            cost: productData.cost || 0,
            part_number: productData.partNumber || ''
          }
        ])
        .select()
        .single();

      if (productError) throw productError;

      // If this is a Level 4 product, create a relationship with its parent
      if (productData.product_level === 4 && productData.parent_product_id) {
        const { error: relError } = await supabase
          .from('level3_level4_relationships')
          .insert([
            {
              level3_product_id: productData.parent_product_id,
              level4_product_id: product.id
            }
          ]);

        if (relError) {
          console.error('Error creating relationship:', relError);
          // Don't throw here, as the product was created successfully
        }
      }

      return product;
    } catch (error) {
      console.error('Error in createProduct:', error);
      throw error;
    }
  }

  // Update an existing product
  async updateProduct(id: string, updates: any): Promise<any> {
    try {
      const { data: product, error } = await supabase
        .from('products')
        .update({
          name: updates.name,
          sku: updates.sku,
          type: updates.type,
          description: updates.description,
          price: updates.price,
          cost: updates.cost,
          part_number: updates.partNumber,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return product;
    } catch (error) {
      console.error('Error in updateProduct:', error);
      throw error;
    }
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

  // Get relationships between Level 3 and Level 4 products
  async getLevel3Level4Relationships(level3ProductId: string) {
    try {
      const { data, error } = await supabase
        .from('level3_level4_relationships')
        .select('*')
        .eq('level3_product_id', level3ProductId);

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error getting Level 3-4 relationships:', error);
      return { data: null, error };
    }
  }

  // Get Level 4 products by IDs
  async getLevel4ProductsByIds(ids: string[]) {
    try {
      if (!ids || ids.length === 0) {
        return { data: [], error: null };
      }

      const { data, error } = await supabase
        .from('level4_products')
        .select('*')
        .in('id', ids);

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error getting Level 4 products by IDs:', error);
      return { data: null, error };
    }
  }

  async debugLevel4Products() {
    try {
      console.log('=== DEBUGGING LEVEL 4 PRODUCTS ===');
      
      // 1. Get all Level 4 products
      const { data: level4Products, error: l4Error } = await supabase
        .from('level4_products')
        .select('*');
      
      if (l4Error) throw l4Error;
      console.log('All Level 4 products:', level4Products);
      
      // 2. Get all relationships
      const { data: relationships, error: relError } = await supabase
        .from('level3_level4_relationships')
        .select('*');
      
      if (relError) throw relError;
      console.log('All Level 3 to Level 4 relationships:', relationships);
      
      // 3. Get Level 3 products that should have Level 4 config
      const { data: level3Products, error: l3Error } = await supabase
        .from('products')
        .select('id, name, requires_level4_config, product_level')
        .eq('requires_level4_config', true);
      
      if (l3Error) throw l3Error;
      console.log('Level 3 products requiring Level 4 config:', level3Products);
      
      // 4. Get Level 4 options
      const { data: options, error: optError } = await supabase
        .from('level4_configuration_options')
        .select('*');
      
      if (optError) throw optError;
      console.log('All Level 4 configuration options:', options);
      
      return {
        success: true,
        level4Products,
        relationships,
        level3Products,
        options
      };
      
    } catch (error) {
      console.error('Error debugging Level 4 products:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Ensure required Level 4 products
  async ensureRequiredLevel4Products() {
    try {
      const requiredProducts = [
        {
          id: 'bushing-card',
          name: 'Bushing Monitoring Card',
          description: 'Bushing monitoring and diagnostics card',
          configuration_type: 'dropdown',
          type: 'bushing',
          price: 0,
          cost: 0,
          enabled: true
        },
        {
          id: 'bushing-card-mtx',
          name: 'Bushing Card (MTX)',
          description: 'Bushing monitoring card for MTX',
          configuration_type: 'dropdown',
          type: 'bushing',
          price: 0,
          cost: 0,
          enabled: true
        },
        {
          id: 'bushing-card-stx',
          name: 'Bushing Card (STX)',
          description: 'Bushing monitoring card for STX',
          configuration_type: 'dropdown',
          type: 'bushing',
          price: 0,
          cost: 0,
          enabled: true
        },
        {
          id: 'analog-card-multi',
          name: 'Multi-Input Analog Card',
          description: 'Multi-input analog monitoring card',
          configuration_type: 'multiline',
          type: 'analog',
          price: 0,
          cost: 0,
          enabled: true
        },
        {
          id: 'analog-card-multi-mtx',
          name: 'Multi-Input Analog Card (MTX)',
          description: 'Multi-input analog card for MTX',
          configuration_type: 'multiline',
          type: 'analog',
          price: 0,
          cost: 0,
          enabled: true
        },
        {
          id: 'analog-card-multi-stx',
          name: 'Multi-Input Analog Card (STX)',
          description: 'Multi-input analog card for STX',
          configuration_type: 'multiline',
          type: 'analog',
          price: 0,
          cost: 0,
          enabled: true
        }
      ];

      for (const product of requiredProducts) {
        const { error } = await supabase
          .from('level4_products')
          .upsert(
            {
              ...product,
              updated_at: new Date().toISOString()
            },
            { onConflict: 'id' }
          );
        
        if (error) {
          console.error(`Error ensuring Level 4 product ${product.id}:`, error);
        }
      }
      
      console.log('Verified required Level 4 products');
      
    } catch (error) {
      console.error('Error in ensureRequiredLevel4Products:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const productDataService = new ProductDataService();

// Expose debug info for development
if (typeof window !== 'undefined') {
  (window as any).productDataService = productDataService;
  (window as any).getProductDebugInfo = () => productDataService.getDebugInfo();
}