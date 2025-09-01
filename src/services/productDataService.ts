import {
  Level1Product,
  Level2Product,
  Level3Product,
  AssetType,
  AnalogSensorOption,
  BushingTapModelOption
} from "@/types/product";
import { ChassisType, ChassisTypeFormData } from "@/types/product/chassis-types";
import { supabase } from "@/integrations/supabase/client";

// Private instance to ensure singleton pattern
class ProductDataService {
  private static instance: ProductDataService | null = null;
  private level1Products: Level1Product[] = [];
  private level2Products: Level2Product[] = [];
  private level3Products: Level3Product[] = [];
  private chassisTypes: ChassisType[] = [];
  private templateMapping: Record<string, Record<string, any>> = {};
  private level1Initialized = false;
  private level2Initialized = false;
  private level3Initialized = false;
  
  private constructor() {}

  // Singleton instance getter
  static getInstance(): ProductDataService {
    if (!ProductDataService.instance) {
      ProductDataService.instance = new ProductDataService();
    }
    return ProductDataService.instance;
  }

  // Initialize all data
  async initialize(): Promise<void> {
    try {
      console.log('ProductDataService: Starting initialization...');
      
      await Promise.all([
        this.loadLevel1ProductsFromDB(),
        this.loadLevel2ProductsFromDB(),
        this.loadLevel3ProductsFromDB(),
        this.loadChassisTypesFromDB()
      ]);

      console.log('ProductDataService: Initialization complete');
    } catch (error) {
      console.error('ProductDataService: Initialization failed:', error);
      throw error;
    }
  }

  // Load products from Supabase database
  private async loadLevel1ProductsFromDB(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('product_level', 1)
        .eq('enabled', true)
        .order('name');

      if (error) throw error;

      this.level1Products = (data || []).map(product => ({
        id: product.id,
        name: product.name,
        displayName: product.display_name || product.name, // Add this line
        type: product.category || 'standard',
        description: product.description || '',
        price: product.price || 0,
        cost: product.cost || 0,
        enabled: product.enabled,
        partNumber: product.part_number,
        image: product.image_url,
        productInfoUrl: product.product_info_url,
        asset_type_id: product.asset_type_id,
        category: product.category,
        rackConfigurable: product.rack_configurable || false,
        specifications: product.specifications || {}
      }));

      this.level1Initialized = true;
    } catch (error) {
      console.error('Error loading Level 1 products:', error);
      this.level1Products = [];
      this.level1Initialized = true;
    }
  }

  private async loadLevel2ProductsFromDB(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('product_level', 2)
        .eq('enabled', true)
        .order('name');

      if (error) throw error;

      this.level2Products = (data || []).map(product => ({
        id: product.id,
        name: product.name,
        parentProductId: product.parent_product_id || '',
        description: product.description || '',
        price: product.price || 0,
        cost: product.cost || 0,
        enabled: product.enabled,
        partNumber: product.part_number,
        chassisType: product.chassis_type || 'N/A',
        image: product.image_url,
        productInfoUrl: product.product_info_url,
        specifications: product.specifications || {}
      }));

      this.level2Initialized = true;
    } catch (error) {
      console.error('Error loading Level 2 products:', error);
      this.level2Products = [];
      this.level2Initialized = true;
    }
  }

  private async loadLevel3ProductsFromDB(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('product_level', 3)
        .eq('enabled', true)
        .order('name');

      if (error) throw error;

      this.level3Products = (data || []).map(product => ({
        id: product.id,
        name: product.name,
        displayName: product.display_name || product.name,
        parent_product_id: product.parent_product_id,
        parentProductId: product.parent_product_id,
        product_level: 3,
        type: product.type || 'standard',
        description: product.description || '',
        price: product.price || 0,
        cost: product.cost || 0,
        enabled: product.enabled !== false,
        partNumber: product.part_number,
        image: product.image_url,
        productInfoUrl: product.product_info_url,
        requires_level4_config: product.requires_level4_config || false,
        specifications: product.specifications || {}
      }));

      this.level3Initialized = true;
    } catch (error) {
      console.error('Error loading Level 3 products:', error);
      this.level3Products = [];
      this.level3Initialized = true;
    }
  }

  private async loadChassisTypesFromDB(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('chassis_types')
        .select('*')
        .eq('enabled', true)
        .order('name');

      if (error) throw error;

      this.chassisTypes = (data || []).map(chassis => ({
        id: chassis.id,
        code: chassis.code,
        name: chassis.name,
        totalSlots: chassis.total_slots,
        layoutRows: chassis.layout_rows,
        visualLayout: chassis.visual_layout,
        enabled: chassis.enabled,
        metadata: chassis.metadata || {},
        createdAt: chassis.created_at,
        updatedAt: chassis.updated_at
      }));
    } catch (error) {
      console.error('Error loading chassis types:', error);
      this.chassisTypes = [];
    }
  }

  async getLevel1Products(): Promise<Level1Product[]> {
    return [...this.level1Products];
  }

  getLevel1ProductsSync(): Level1Product[] {
    return [...this.level1Products];
  }

  async getLevel2Products(): Promise<Level2Product[]> {
    return [...this.level2Products];
  }

  getLevel2ProductsSync(): Level2Product[] {
    return [...this.level2Products];
  }

  async getLevel3Products(): Promise<Level3Product[]> {
    return [...this.level3Products];
  }

  getLevel3ProductsSync(): Level3Product[] {
    return [...this.level3Products];
  }

  async createLevel1Product(productData: Omit<Level1Product, 'id'>): Promise<Level1Product> {
    const newProduct = { id: 'temp', ...productData };
    return newProduct;
  }

  async updateLevel1Product(id: string, productData: Partial<Level1Product>): Promise<Level1Product> {
    return { id, ...productData } as Level1Product;
  }

  async createLevel2Product(productData: Omit<Level2Product, 'id'>): Promise<Level2Product> {
    const newProduct = { id: 'temp', ...productData };
    return newProduct;
  }

  async createLevel3Product(productData: Omit<Level3Product, 'id'>): Promise<Level3Product> {
    try {
      const { data, error } = await supabase
        .from('products')
        .insert([
          {
            name: productData.name,
            display_name: (productData as any).displayName || productData.name,
            description: productData.description || '',
            price: productData.price || 0,
            cost: productData.cost || 0,
            enabled: productData.enabled !== false,
            product_level: 3,
            parent_product_id: productData.parentProductId,
            type: productData.type || 'standard',
            requires_level4_config: (productData as any).requires_level4_config || false,
            specifications: productData.specifications || {}
          }
        ])
        .select()
        .single();

      if (error) throw error;

      const newProduct: Level3Product = {
        id: data.id,
        name: data.name,
        displayName: data.display_name || data.name,
        parent_product_id: data.parent_product_id,
        parentProductId: data.parent_product_id,
        product_level: 3,
        type: data.type,
        description: data.description || '',
        price: data.price || 0,
        cost: data.cost || 0,
        enabled: data.enabled !== false,
        requires_level4_config: data.requires_level4_config || false,
        specifications: data.specifications || {}
      };

      // Add to local cache
      this.level3Products = [...this.level3Products, newProduct];

      return newProduct;
    } catch (error) {
      console.error('Error creating Level 3 product:', error);
      throw error;
    }
  }

  async updateLevel3Product(id: string, productData: Partial<Level3Product>): Promise<Level3Product> {
    try {
      console.log('Updating Level 3 product with ID:', id);
      console.log('Update data:', JSON.stringify(productData, null, 2));

      // First, get the current product to preserve the display_name
      const { data: currentProduct, error: fetchError } = await supabase
        .from('products')
        .select('display_name')
        .eq('id', id)
        .single();

      if (fetchError) {
        console.error('Error fetching current product:', fetchError);
        throw fetchError;
      }

      // Prepare the update data
      const updateData: any = {
        ...productData,
        updated_at: new Date().toISOString(),
        // Preserve the existing display_name
        display_name: currentProduct?.display_name || productData.name
      };

      console.log('Sending update to Supabase:', JSON.stringify(updateData, null, 2));

      const { data, error } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating Level 3 product:', error);
        throw error;
      }

      console.log('Update successful, response:', data);

      // Update the local cache
      const index = this.level3Products.findIndex(p => p.id === id);
      if (index !== -1) {
        this.level3Products[index] = { ...this.level3Products[index], ...updateData };
      }

      return data as Level3Product;
    } catch (error) {
      console.error('Error in updateLevel3Product:', {
        error,
        errorString: JSON.stringify(error, Object.getOwnPropertyNames(error)),
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  async getChassisTypes(): Promise<ChassisType[]> {
    return [...this.chassisTypes];
  }

  async createChassisType(chassisData: ChassisTypeFormData): Promise<ChassisType> {
    return { 
      id: 'temp', 
      code: chassisData.code,
      name: chassisData.name,
      totalSlots: chassisData.totalSlots,
      layoutRows: chassisData.layoutRows,
      visualLayout: chassisData.visualLayout,
      enabled: chassisData.enabled,
      metadata: chassisData.metadata || {},
      createdAt: '', 
      updatedAt: '' 
    };
  }

  async updateChassisType(id: string, chassisData: Partial<ChassisTypeFormData>): Promise<ChassisType> {
    return { 
      id, 
      code: chassisData.code || '',
      name: chassisData.name || '',
      totalSlots: chassisData.totalSlots || 0,
      layoutRows: chassisData.layoutRows,
      visualLayout: chassisData.visualLayout,
      enabled: chassisData.enabled ?? true,
      metadata: chassisData.metadata || {},
      createdAt: '', 
      updatedAt: '' 
    };
  }

  async deleteChassisType(id: string): Promise<void> {
    // Implementation
  }

  // Real implementations for part number configuration
  getAssetTypes = async (): Promise<AssetType[]> => {
    try {
      const { data, error } = await supabase
        .from('asset_types')
        .select('*')
        .eq('enabled', true)
        .order('name');
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error loading asset types:', error);
      return [];
    }
  };

  getAssetTypesSync = (): AssetType[] => [];
  
  getPartNumberConfig = async (level2Id: string) => {
    try {
      const { data, error } = await supabase
        .from('part_number_configs')
        .select('*')
        .eq('level2_product_id', level2Id)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error loading part number config:', error);
        throw error;
      }
      
      return data || {
        prefix: '',
        slot_placeholder: '0',
        slot_count: 0,
        slot_span: 1,
        standard_position: null,
        designated_only: false,
        designated_positions: [],
        outside_chassis: false,
        exclusive_in_slots: false,
        color: null,
        notes: null
      };
    } catch (error) {
      console.error('Error loading part number config:', error);
      return {
        prefix: '',
        slot_placeholder: '0',
        slot_count: 0,
        slot_span: 1,
        standard_position: null,
        designated_only: false,
        designated_positions: [],
        outside_chassis: false,
        exclusive_in_slots: false,
        color: null,
        notes: null
      };
    }
  };
  
  getLevel3ProductsForLevel2 = async (level2Id: string): Promise<Level3Product[]> => {
    return this.level3Products.filter(p => p.parent_product_id === level2Id || p.parentProductId === level2Id);
  };

  getPartNumberCodesForLevel2 = async (level2Id: string) => {
    try {
      const { data, error } = await supabase
        .from('part_number_codes')
        .select('*')
        .eq('level2_product_id', level2Id);
      
      if (error) throw error;
      
      const codesMap: Record<string, any> = {};
      (data || []).forEach(code => {
        codesMap[code.level3_product_id] = {
          template: code.template,
          slot_span: code.slot_span,
          is_standard: code.is_standard,
          standard_position: code.standard_position,
          designated_only: code.designated_only,
          designated_positions: code.designated_positions || [],
          outside_chassis: code.outside_chassis,
          exclusive_in_slots: code.exclusive_in_slots,
          color: code.color,
          notes: code.notes
        };
      });
      
      return codesMap;
    } catch (error) {
      console.error('Error loading part number codes:', error);
      return {};
    }
  };
  
  upsertPartNumberConfig = async (config: any) => {
    try {
      const { data, error } = await supabase
        .from('part_number_configs')
        .upsert({
          level2_product_id: config.level2_product_id,
          prefix: config.prefix,
          slot_placeholder: config.slot_placeholder,
          slot_count: config.slot_count,
          slot_span: config.slot_span || 1,
          standard_position: config.standard_position,
          designated_only: config.designated_only || false,
          designated_positions: config.designated_positions || [],
          outside_chassis: config.outside_chassis || false,
          exclusive_in_slots: config.exclusive_in_slots || false,
          color: config.color,
          notes: config.notes
        }, {
          onConflict: 'level2_product_id'
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving part number config:', error);
      throw error;
    }
  };
  
  upsertPartNumberCodes = async (codes: any[]) => {
    try {
      const { data, error } = await supabase
        .from('part_number_codes')
        .upsert(codes, {
          onConflict: 'level3_product_id,level2_product_id'
        })
        .select();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving part number codes:', error);
      throw error;
    }
  };
  
  deleteLevel1Product = async (id: string) => {};
  
  updateLevel2Product = async (id: string, data: any): Promise<Level2Product> => ({
    id,
    name: '',
    parentProductId: '',
    type: '',
    description: '',
    price: 0,
    cost: 0,
    enabled: true,
    partNumber: '',
    specifications: {}
  });
  
  deleteLevel2Product = async (id: string) => {};
  deleteLevel3Product = async (id: string) => {};
  
  getLevel2ProductsByCategory = async (category: string): Promise<Level2Product[]> => {
    return this.level2Products.filter(p => 
      p.specifications?.category === category || 
      (p as any).category === category ||
      (p as any).subcategory === category
    );
  };

  getLevel2ProductsForLevel1 = async (level1Id: string): Promise<Level2Product[]> => {
    return this.level2Products.filter(p => p.parentProductId === level1Id);
  };

  // Sensor configuration methods
  getAnalogSensorTypes = () => [
    { id: 'temp', name: 'Temperature', description: 'Temperature sensor' },
    { id: 'pressure', name: 'Pressure', description: 'Pressure sensor' },
    { id: 'voltage', name: 'Voltage', description: 'Voltage sensor' }
  ];
  
  getBushingTapModels = () => [
    { id: 'standard', name: 'Standard' },
    { id: 'enhanced', name: 'Enhanced' },
    { id: 'premium', name: 'Premium' }
  ];
  getChildProducts = async () => [];
  getDGAProducts = async (): Promise<Level2Product[]> => {
    return this.level2Products.filter(p => 
      p.specifications?.category === 'DGA' || 
      (p as any).category === 'DGA' ||
      (p as any).subcategory === 'DGA'
    );
  };
  getPDProducts = async (): Promise<Level2Product[]> => {
    return this.level2Products.filter(p => 
      p.specifications?.category === 'PD' || 
      (p as any).category === 'PD' ||
      (p as any).subcategory === 'PD'
    );
  };
  findProductById = () => null;
  getProductPath = () => '';
  getTemplateMapping = () => ({});
  resetToDefaults = async () => {};

  async testUpdateOperation(id: string) {
    try {
      console.log('Testing update operation for product ID:', id);
      
      // 1. First, get the current product data
      const { data: currentProduct, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      
      console.log('Current product data:', JSON.stringify(currentProduct, null, 2));
      
      // 2. Try a minimal update
      const testUpdate = {
        name: currentProduct.name,
        updated_at: new Date().toISOString()
      };
      
      console.log('Sending minimal update:', JSON.stringify(testUpdate, null, 2));
      
      const { data: updatedData, error: updateError } = await supabase
        .from('products')
        .update(testUpdate)
        .eq('id', id)
        .select()
        .single();
        
      if (updateError) throw updateError;
      
      console.log('Minimal update successful:', updatedData);
      
      // 3. Now try with display_name
      const updateWithDisplayName = {
        ...testUpdate,
        display_name: 'Test Display Name',
        updated_at: new Date().toISOString()
      };
      
      console.log('Sending update with display_name:', JSON.stringify(updateWithDisplayName, null, 2));
      
      const { data: displayNameData, error: displayNameError } = await supabase
        .from('products')
        .update(updateWithDisplayName)
        .eq('id', id)
        .select()
        .single();
        
      if (displayNameError) throw displayNameError;
      
      console.log('Update with display_name successful:', displayNameData);
      
      return { success: true };
      
    } catch (error) {
      console.error('Test update failed:', {
        error,
        errorString: JSON.stringify(error, Object.getOwnPropertyNames(error)),
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  async inspectDatabaseSchema() {
    try {
      console.log('Inspecting database schema...');
      
      // 1. Get table columns information
      const { data: columns, error: columnsError } = await supabase
        .from('information_schema.columns')
        .select('*')
        .eq('table_name', 'products');
      
      if (columnsError) throw columnsError;
      
      console.log('Table columns:', columns);
      
      // 2. Get table constraints
      const { data: constraints, error: constraintsError } = await supabase
        .from('information_schema.table_constraints')
        .select('*')
        .eq('table_name', 'products');
      
      if (constraintsError) throw constraintsError;
      
      console.log('Table constraints:', constraints);
      
      // 3. Get column constraints
      const { data: columnConstraints, error: columnConstraintsError } = await supabase
        .from('information_schema.constraint_column_usage')
        .select('*')
        .eq('table_name', 'products');
      
      if (columnConstraintsError) throw columnConstraintsError;
      
      console.log('Column constraints:', columnConstraints);
      
      // 4. Get RLS policies
      try {
        const { data: policies, error: policiesError } = await supabase
          .rpc('get_table_info', { table_name: 'products' });
        
        if (!policiesError && policies) {
          console.log('Products table schema:', policies);
        }
      } catch (schemaError) {
        console.error('Error fetching table schema:', schemaError);
      }
      
      return { columns, constraints, columnConstraints };
      
    } catch (error) {
      console.error('Error inspecting database schema:', {
        error,
        errorString: JSON.stringify(error, Object.getOwnPropertyNames(error)),
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  async setupDisplayNameUpdateFunction() {
    try {
      console.log('Setting up update_product_display_name function...');
      
      const { data, error } = await supabase.rpc('execute_sql', {
        sql: `
        CREATE OR REPLACE FUNCTION public.update_product_display_name(
          p_id uuid,
          p_display_name text
        )
        RETURNS jsonb
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        DECLARE
          result jsonb;
        BEGIN
          -- Check if the column exists
          IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'products' 
            AND column_name = 'display_name'
          ) THEN
            -- Add the column if it doesn't exist
            EXECUTE 'ALTER TABLE products ADD COLUMN IF NOT EXISTS display_name text';
          END IF;
          
          -- Update the display_name
          UPDATE products 
          SET display_name = p_display_name,
              updated_at = NOW()
          WHERE id = p_id
          RETURNING to_jsonb(products.*) INTO result;
          
          RETURN jsonb_build_object(
            'success', true,
            'data', result
          );
          
        EXCEPTION WHEN OTHERS THEN
          RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'error_code', SQLSTATE
          );
        END;
        $$;
        `
      });
      
      if (error) {
        console.error('Error setting up update function:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          error: error
        });
        throw error;
      }
      
      console.log('Successfully set up update_product_display_name function');
      return { success: true, data };
      
    } catch (error) {
      console.error('Error in setupDisplayNameUpdateFunction:', {
        error,
        errorString: JSON.stringify(error, Object.getOwnPropertyNames(error)),
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  async updateDisplayNameSimple(id: string, displayName: string) {
    try {
      console.log(`Updating display_name to "${displayName}" for product ID:`, id);
      
      // First, check if the column exists
      const { data: columnCheck, error: columnError } = await supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_name', 'products')
        .eq('column_name', 'display_name')
        .single();
      
      if (columnError && columnError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error checking for display_name column:', columnError);
        throw columnError;
      }
      
      const columnExists = !!columnCheck;
      console.log('display_name column exists:', columnExists);
      
      // If the column doesn't exist, we'll try to add it
      if (!columnExists) {
        console.log('Attempting to add display_name column...');
        const { error: alterError } = await supabase.rpc('execute_sql', {
          query: 'ALTER TABLE products ADD COLUMN IF NOT EXISTS display_name text'
        });
        
        if (alterError) {
          console.error('Error adding display_name column:', alterError);
          throw alterError;
        }
        console.log('Successfully added display_name column');
      }
      
      // Now try to update the display_name
      console.log('Attempting to update display_name...');
      const { data, error } = await supabase
        .from('products')
        .update({ 
          display_name: displayName,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating display_name:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          error: error
        });
        
        // Try to get more detailed error information
        try {
          const { data: errorInfo } = await supabase
            .from('products')
            .select('*')
            .eq('id', id)
            .single();
          
          console.log('Current product data:', errorInfo);
          
          // Try a raw update with just the ID and display_name
          console.log('Trying raw update with just ID and display_name...');
          const { data: rawUpdate, error: rawError } = await supabase.rpc('execute_sql', {
            query: `UPDATE products SET display_name = '${displayName.replace(/'/g, "''")}' WHERE id = '${id}' RETURNING id, display_name`
          });
          
          if (rawError) throw rawError;
          
          console.log('Raw update successful:', rawUpdate);
          return { success: true, data: rawUpdate };
          
        } catch (rawError) {
          console.error('Raw update failed:', rawError);
          throw rawError;
        }
      }
      
      console.log('Update successful:', data);
      
      // Update the local cache
      const index = this.level3Products.findIndex(p => p.id === id);
      if (index !== -1) {
        this.level3Products[index].displayName = displayName;
      }
      
      return { success: true, data };
      
    } catch (error) {
      console.error('Error in updateDisplayNameSimple:', {
        error,
        errorString: JSON.stringify(error, Object.getOwnPropertyNames(error)),
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  async updateDisplayNameDirect(id: string, displayName: string) {
    try {
      console.log(`Updating display_name to "${displayName}" for product ID:`, id);
      
      // Direct update using Supabase client
      const { data, error } = await supabase
        .from('products')
        .update({ 
          display_name: displayName,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select('id, name, display_name')
        .single();
      
      if (error) {
        console.error('Error updating display_name:', error);
        throw error;
      }
      
      console.log('Successfully updated display_name:', data);
      
      // Update local cache
      const index = this.level3Products.findIndex(p => p.id === id || p.name === id);
      if (index !== -1) {
        this.level3Products[index].displayName = displayName;
      }
      
      return { success: true, data };
      
    } catch (error) {
      console.error('Error in updateDisplayNameDirect:', {
        error,
        errorString: JSON.stringify(error, Object.getOwnPropertyNames(error)),
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  async updateDisplayNameOnly(id: string, displayName: string) {
    try {
      const { data, error } = await supabase
        .from('products')
        .update({ 
          display_name: displayName,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select('id, name, display_name')
        .single();

      if (error) throw error;
      
      // Update local cache
      const index = this.level3Products.findIndex(p => p.id === id);
      if (index !== -1) {
        this.level3Products[index].displayName = displayName;
      }
      
      return data;
    } catch (error) {
      console.error('Error updating display name:', error);
      throw error;
    }
  }

  async updateProductDisplayName(id: string, displayName: string) {
    try {
      console.log(`Updating display_name to "${displayName}" for product ID:`, id);
      
      // First, ensure the display_name column exists using a raw SQL query
      const { error: alterError } = await supabase.rpc('pg_catalog.pg_execute', {
        query: `
          DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT 1 
              FROM information_schema.columns 
              WHERE table_name = 'products' 
              AND column_name = 'display_name'
            ) THEN
              ALTER TABLE products ADD COLUMN display_name text;
            END IF;
          END $$;
        `
      });

      if (alterError) {
        console.error('Error ensuring display_name column exists:', alterError);
        throw alterError;
      }

      // Now update the display_name using a raw SQL query
      const { data, error } = await supabase.rpc('pg_catalog.pg_execute', {
        query: `
          UPDATE products 
          SET 
            display_name = $1,
            updated_at = NOW()
          WHERE id = $2::uuid
          RETURNING id, name, display_name;
        `,
        params: [displayName, id]
      });
      
      if (error) {
        console.error('Error updating display_name:', error);
        throw error;
      }
      
      console.log('Successfully updated display_name:', data);
      
      // Update local cache
      const index = this.level3Products.findIndex(p => p.id === id || p.name === id);
      if (index !== -1) {
        this.level3Products[index].displayName = displayName;
      }
      
      return { success: true, data };
      
    } catch (error) {
      console.error('Error in updateProductDisplayName:', {
        error,
        errorString: JSON.stringify(error, Object.getOwnPropertyNames(error))
      });
      throw error;
    }
  }

}

// Export singleton instance
export const productDataService = ProductDataService.getInstance();