import {
  Level1Product,
  Level2Product,
  Level3Product,
  AssetType,
  AnalogSensorOption,
  BushingTapModelOption
} from "@/types/product";
import { ChassisType, ChassisTypeFormData } from "@/types/product/chassis-types";
import { getSupabaseClient, getSupabaseAdminClient, isAdminAvailable } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from 'uuid';

const supabase = getSupabaseClient();
const supabaseAdmin = getSupabaseAdminClient();;

// Helper function to generate a slug from a name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')      // Replace spaces with hyphens
    .replace(/-+/g, '-');      // Replace multiple hyphens with single hyphen
}

// Private instance to ensure singleton pattern
class ProductDataService {
  private static instance: ProductDataService | null = null;
  private level1Products: Level1Product[] = [];
  private level2Products: Level2Product[] = [];
  private level3Products: Level3Product[] = [];
  private level3ParentMap: Record<string, string[]> = {};
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
      console.log('[ProductDataService] Loading level 1 products from database...');
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('product_level', 1)
        .eq('enabled', true)
        .order('name');

      if (error) throw error;

      this.level1Products = (data || []).map(product => {
        // Log the product data for debugging
        console.log('[ProductDataService] Processing level 1 product:', {
          id: product.id,
          name: product.name,
          display_name: product.display_name,
          part_number: product.part_number
        });
        
        return {
          id: product.id,
          name: product.name,
          displayName: product.part_number || product.name, // Use part_number as displayName if available
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
        };
      });

      this.level1Initialized = true;
    } catch (error) {
      console.error('Error loading Level 1 products:', error);
      this.level1Products = [];
      this.level1Initialized = true;
    }
  }

  private async loadLevel2ProductsFromDB(): Promise<void> {
    try {
      console.log('[ProductDataService] Loading level 2 products from database...');
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('product_level', 2)
        .order('name');

      if (error) throw error;

      this.level2Products = (data || []).map(product => {
        console.log('[ProductDataService] Processing level 2 product:', {
          id: product.id,
          name: product.name,
          parent_product_id: product.parent_product_id,
          has_parent: !!product.parent_product_id
        });
        
        const level2Product = {
          ...product,
          parentProductId: product.parent_product_id,
          displayName: product.display_name || product.name,
          cost: product.cost || 0,
          enabled: product.enabled,
          partNumber: product.part_number,
          chassisType: product.chassis_type || 'N/A',
          image: product.image_url,
          productInfoUrl: product.product_info_url,
          specifications: product.specifications || {}
        };
        
        console.log('[ProductDataService] Created level 2 product:', {
          id: level2Product.id,
          name: level2Product.name,
          parentProductId: level2Product.parentProductId,
          hasParent: !!level2Product.parentProductId
        });
        
        return level2Product;
      });
      
      console.log(`[ProductDataService] Loaded ${this.level2Products.length} level 2 products`);
      
      // Log a few sample products with their parent IDs
      const sampleProducts = this.level2Products.slice(0, 3);
      console.log('[ProductDataService] Sample level 2 products:', sampleProducts.map(p => ({
        id: p.id,
        name: p.name,
        parentProductId: p.parentProductId,
        hasParentInLevel1: !!this.level1Products.find(l1 => l1.id === p.parentProductId)
      })));
      
      this.level2Initialized = true;
    } catch (error) {
      console.error('Error loading Level 2 products:', error);
      this.level2Products = [];
      this.level2Initialized = true;
    }
  }

  private async loadLevel3ProductsFromDB(): Promise<void> {
    try {
      const [productsResult, relationshipsResult] = await Promise.all([
        supabase
          .from('products')
          .select('*')
          .eq('product_level', 3)
          .eq('enabled', true)
          .order('name'),
        supabase
          .from('level2_level3_relationships')
          .select('level2_product_id, level3_product_id')
      ]);

      if (productsResult.error) throw productsResult.error;

      const relationshipMap: Record<string, string[]> = {};
      if (relationshipsResult.error) {
        console.error('Error loading Level 2/Level 3 relationships:', relationshipsResult.error);
      } else {
        (relationshipsResult.data || []).forEach(rel => {
          if (!rel?.level3_product_id || !rel?.level2_product_id) return;
          if (!relationshipMap[rel.level3_product_id]) {
            relationshipMap[rel.level3_product_id] = [];
          }
          if (!relationshipMap[rel.level3_product_id].includes(rel.level2_product_id)) {
            relationshipMap[rel.level3_product_id].push(rel.level2_product_id);
          }
        });
      }

      this.level3ParentMap = relationshipMap;

      this.level3Products = (productsResult.data || []).map(product => {
        const relatedParents = relationshipMap[product.id] || [];
        const fallbackParent = product.parent_product_id ? [product.parent_product_id] : [];
        const mergedParents = [...relatedParents, ...fallbackParent].filter(Boolean);
        const uniqueParents = Array.from(new Set(mergedParents));
        const primaryParent = uniqueParents[0] || product.parent_product_id || null;

        return {
          id: product.id,
          name: product.name,
          displayName: product.display_name || product.name,
          parent_product_id: primaryParent || product.parent_product_id,
          parentProductId: primaryParent || product.parent_product_id,
          parent_product_ids: uniqueParents,
          parentProductIds: uniqueParents,
          product_level: 3,
          type: product.category || 'standard',
          description: product.description || '',
          price: product.price || 0,
          cost: product.cost || 0,
          enabled: product.enabled !== false,
          partNumber: product.part_number,
          image: product.image_url,
          productInfoUrl: product.product_info_url,
          has_level4: product.has_level4 === true,
          specifications: product.specifications || {}
        } as Level3Product;
      });

      this.level3Initialized = true;
    } catch (error) {
      console.error('Error loading Level 3 products:', error);
      this.level3Products = [];
      this.level3ParentMap = {};
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

  private async syncLevel3ParentRelationships(level3Id: string, parentIds: string[]): Promise<void> {
    const uniqueParentIds = Array.from(new Set((parentIds || []).filter(Boolean)));

    try {
      const { data: existingData, error: existingError } = await supabase
        .from('level2_level3_relationships')
        .select('level2_product_id')
        .eq('level3_product_id', level3Id);

      if (existingError) {
        throw existingError;
      }

      const existingIds = (existingData || []).map(rel => rel.level2_product_id);
      const toInsert = uniqueParentIds.filter(id => !existingIds.includes(id));
      const toDelete = existingIds.filter(id => !uniqueParentIds.includes(id));

      if (toInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('level2_level3_relationships')
          .upsert(
            toInsert.map(level2Id => ({
              level2_product_id: level2Id,
              level3_product_id: level3Id,
            })),
            { onConflict: 'level2_product_id, level3_product_id' }
          );

        if (insertError) {
          throw insertError;
        }
      }

      if (toDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('level2_level3_relationships')
          .delete()
          .eq('level3_product_id', level3Id)
          .in('level2_product_id', toDelete);

        if (deleteError) {
          throw deleteError;
        }
      }

      this.level3ParentMap[level3Id] = uniqueParentIds;
    } catch (error) {
      console.error('Error syncing Level 2/Level 3 relationships:', error);
      this.level3ParentMap[level3Id] = uniqueParentIds;
    }
  }

  async createLevel1Product(productData: Omit<Level1Product, 'id'>): Promise<Level1Product> {
    try {
      // Generate a unique ID from the product name
      const productId = generateSlug(productData.name);
      
      // Explicitly map fields - DO NOT include 'type' as it doesn't exist in DB
      const { data, error } = await supabase
        .from('products')
        .insert({
          id: productId,
          name: productData.name,
          description: productData.description || '',
          price: productData.price || 0,
          cost: productData.cost || 0,
          enabled: productData.enabled ?? true,
          product_level: 1,
          display_name: productData.displayName || productData.name,
          asset_type_id: productData.asset_type_id || null,
          category: productData.category || null,
          rack_configurable: productData.rackConfigurable || false,
          part_number: productData.partNumber || null,
          image_url: productData.image || null,
          product_info_url: productData.productInfoUrl || null,
          specifications: productData.specifications || {}
          // NOTE: 'type' field is NOT included - it doesn't exist in the products table
        })
        .select()
        .single();

      if (error) throw error;

      const newProduct: Level1Product = {
        id: data.id,
        name: data.name,
        displayName: data.display_name || data.name,
        type: data.category || 'standard',
        description: data.description || '',
        price: data.price || 0,
        cost: data.cost || 0,
        enabled: data.enabled,
        partNumber: data.part_number,
        image: data.image_url,
        productInfoUrl: data.product_info_url,
        asset_type_id: data.asset_type_id,
        category: data.category,
        rackConfigurable: data.rack_configurable || false,
        specifications: data.specifications || {}
      };

      this.level1Products = [...this.level1Products, newProduct];
      return newProduct;
    } catch (error) {
      console.error('Error creating Level 1 product:', error);
      throw error;
    }
  }

  async updateLevel1Product(id: string, productData: Partial<Level1Product>): Promise<Level1Product> {
    try {
      const { displayName, asset_type_id, category, rackConfigurable, type, ...restOfProductData } = productData;
      const { data: currentProduct, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!currentProduct) throw new Error('Product not found');

      const updateData: any = {
        ...restOfProductData, // Spread the rest of the data
        updated_at: new Date().toISOString(),
        display_name: displayName || currentProduct?.display_name || currentProduct?.name,
        price: productData.price !== undefined ? productData.price : currentProduct?.price,
        cost: productData.cost !== undefined ? productData.cost : currentProduct?.cost,
        enabled: productData.enabled !== undefined ? productData.enabled : currentProduct?.enabled,
        asset_type_id: asset_type_id !== undefined ? asset_type_id : currentProduct?.asset_type_id,
        category: category !== undefined ? category : currentProduct?.category,
        rack_configurable: rackConfigurable !== undefined ? rackConfigurable : currentProduct?.rack_configurable,
        specifications: productData.specifications !== undefined ? productData.specifications : currentProduct?.specifications,
      };

      const { data, error } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const index = this.level1Products.findIndex(p => p.id === id);
      if (index !== -1) {
        this.level1Products[index] = { ...this.level1Products[index], ...updateData };
      }

      return data as Level1Product;
    } catch (error) {
      console.error('Error updating Level 1 product:', error);
      throw error;
    }
  }

  async createLevel2Product(productData: Omit<Level2Product, 'id'>): Promise<Level2Product> {
    try {
      // Generate a unique ID from the product name with timestamp to avoid collisions
      const baseSlug = generateSlug(productData.name);
      const timestamp = Date.now();
      const productId = `${baseSlug}-${timestamp}`;
      
      console.log('Creating Level 2 product with ID:', productId, 'from name:', productData.name);
      
      const { parentProductId, chassisType, image, productInfoUrl, type, ...restOfProductData } = productData;
      const { data, error } = await supabase
        .from('products')
        .insert({
          id: productId,
          name: productData.name,
          description: productData.description || '',
          price: productData.price || 0,
          cost: productData.cost || 0,
          enabled: productData.enabled ?? true,
          product_level: 2,
          parent_product_id: parentProductId,
          chassis_type: chassisType,
          image_url: image,
          product_info_url: productInfoUrl,
          display_name: productData.displayName || productData.name,
          part_number: productData.partNumber || null,
          specifications: productData.specifications || {}
        })
        .select()
        .single();

      if (error) {
        console.error('Database error creating Level 2 product:', error);
        throw error;
      }

      const newProduct: Level2Product = {
        id: data.id,
        name: data.name,
        displayName: data.display_name || data.name,
        parentProductId: data.parent_product_id,
        description: data.description || '',
        price: data.price || 0,
        cost: data.cost || 0,
        enabled: data.enabled,
        partNumber: data.part_number,
        chassisType: data.chassis_type,
        image: data.image_url,
        productInfoUrl: data.product_info_url,
        specifications: data.specifications || {}
      };

      this.level2Products = [...this.level2Products, newProduct];
      return newProduct;
    } catch (error) {
      console.error('Error creating Level 2 product:', error);
      throw error;
    }
  }

  async createLevel3Product(productData: Omit<Level3Product, 'id'>): Promise<Level3Product> {
    try {
      const newId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : uuidv4();

      const parentIdCandidates = [
        ...(productData.parentProductIds || []),
        ...(productData.parent_product_ids || []),
        productData.parentProductId,
        productData.parent_product_id,
      ].filter((value): value is string => Boolean(value));

      const parentIds = Array.from(new Set(parentIdCandidates));
      if (parentIds.length === 0) {
        throw new Error('At least one parent Level 2 product is required to create a Level 3 product.');
      }

      const primaryParentId = parentIds[0];

      const trimmedPartNumber = productData.partNumber?.trim();
      const requiresLevel4 = (productData as any).requires_level4_config ?? (productData as any).has_level4;

      const payload: Record<string, any> = {
        id: newId,
        name: productData.name,
        display_name: (productData as any).displayName || productData.name,
        description: productData.description || '',
        price: Number.isFinite(productData.price) ? Number(productData.price) : 0,
        cost: Number.isFinite(productData.cost) ? Number(productData.cost) : 0,
        enabled: productData.enabled !== false,
        product_level: 3,
        parent_product_id: primaryParentId,
        has_level4: (productData as any).has_level4 === true || requiresLevel4 === true,
        requires_level4_config: requiresLevel4 === true,
        specifications: productData.specifications || {},
        part_number: trimmedPartNumber ? trimmedPartNumber : null,
      };

      if ((productData as any).category) {
        payload.category = (productData as any).category;
      } else if (productData.type) {
        payload.category = productData.type;
      }

      const { data, error } = await supabase
        .from('products')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      const newProduct: Level3Product = {
        id: data.id,
        name: data.name,
        displayName: data.display_name || data.name,
        parent_product_id: data.parent_product_id,
        parentProductId: data.parent_product_id,
        parent_product_ids: parentIds,
        parentProductIds: parentIds,
        product_level: 3,
        type: data.category,
        description: data.description || '',
        price: data.price || 0,
        cost: data.cost || 0,
        enabled: data.enabled !== false,
        partNumber: data.part_number || undefined,
        has_level4: data.has_level4 === true || data.requires_level4_config === true,
        requires_level4_config: data.requires_level4_config === true,
        specifications: data.specifications || {}
      };

      // Add to local cache
      this.level3Products = [...this.level3Products, newProduct];
      await this.syncLevel3ParentRelationships(newProduct.id, parentIds);

      return newProduct;
    } catch (error) {
      console.error('Error creating Level 3 product:', error);
      throw error;
    }
  }

  async updateLevel3Product(id: string, productData: Partial<Level3Product>): Promise<Level3Product> {
    try {
      console.log('Update data (productData received):', JSON.stringify(productData, null, 2)); // Added log

      // First, get the current product to preserve all existing data
      const { data: currentProduct, error: fetchError } = await supabase
        .from('products')
        .select('*') // Select all columns to preserve existing data
        .eq('id', id)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching current product:', fetchError);
        throw fetchError;
      }
      if (!currentProduct) {
        throw new Error('Product not found');
      }

      console.log('Current product from DB:', JSON.stringify(currentProduct, null, 2)); // Added log

      // Destructure to separate client-side properties from DB columns
      const { displayName, parentProductId, type, parentProductIds, parent_product_ids, ...restOfProductData } = productData;

      const currentParentIds = this.level3ParentMap[id] || (currentProduct.parent_product_id ? [currentProduct.parent_product_id] : []);
      const requestedParentIds = [
        ...(parentProductIds || []),
        ...(parent_product_ids || []),
        parentProductId,
        productData.parent_product_id,
      ].filter((value): value is string => Boolean(value));

      const parentSelectionProvided = parentProductIds !== undefined
        || parent_product_ids !== undefined
        || parentProductId !== undefined
        || productData.parent_product_id !== undefined;

      if (parentSelectionProvided && requestedParentIds.length === 0) {
        throw new Error('At least one parent Level 2 product must be selected.');
      }

      const normalizedParentIds = parentSelectionProvided && requestedParentIds.length > 0
        ? Array.from(new Set(requestedParentIds))
        : currentParentIds;

      if (normalizedParentIds.length === 0 && currentProduct.parent_product_id) {
        normalizedParentIds.push(currentProduct.parent_product_id);
      }

      // Prepare the update data, ensuring only valid DB columns are sent
      const updateData: any = {
        ...restOfProductData,
        updated_at: new Date().toISOString(),
        // Map camelCase properties to snake_case DB columns
        display_name: displayName,
        parent_product_id: normalizedParentIds[0] || currentProduct.parent_product_id,
        category: type,
      };

      if (updateData.partNumber !== undefined) {
        updateData.part_number = updateData.partNumber?.trim() || null;
        delete updateData.partNumber;
      }

      // Remove undefined properties to avoid sending them to Supabase
      Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

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

      console.log('Update successful, response from Supabase:', JSON.stringify(data, null, 2)); // Added log

      const updatedParents = normalizedParentIds.length > 0
        ? normalizedParentIds
        : (data.parent_product_id ? [data.parent_product_id] : currentParentIds);

      const updatedProduct: Level3Product = {
        id: data.id,
        name: data.name,
        displayName: data.display_name || data.name,
        parent_product_id: data.parent_product_id,
        parentProductId: data.parent_product_id,
        parent_product_ids: updatedParents,
        parentProductIds: updatedParents,
        product_level: 3,
        type: data.category || currentProduct.category,
        description: data.description || '',
        price: data.price || 0,
        cost: data.cost || 0,
        enabled: data.enabled !== false,
        partNumber: data.part_number || undefined,
        has_level4: data.has_level4 === true,
        specifications: data.specifications || {},
        image: data.image_url,
        productInfoUrl: data.product_info_url,
      };

      // Update the local cache
      const index = this.level3Products.findIndex(p => p.id === id);
      if (index !== -1) {
        this.level3Products[index] = {
          ...this.level3Products[index],
          ...updatedProduct,
        };
      }

      await this.syncLevel3ParentRelationships(id, updatedParents);

      return updatedProduct;
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
        .maybeSingle();

      if (error) {
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
    return this.level3Products
      .filter(product => {
        const parentIds = product.parentProductIds || product.parent_product_ids || [];
        if (parentIds.length > 0) {
          return parentIds.includes(level2Id);
        }
        return product.parent_product_id === level2Id || product.parentProductId === level2Id;
      })
      .map(product => {
        if ((product.parentProductIds || product.parent_product_ids)?.includes(level2Id) && product.parentProductId !== level2Id) {
          return {
            ...product,
            parent_product_id: level2Id,
            parentProductId: level2Id,
          };
        }
        return product;
      });
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
  
  deleteLevel1Product = async (id: string) => {
    try {
      // First delete any level1_level2_relationships
      const { error: relationshipError } = await supabase
        .from('level1_level2_relationships')
        .delete()
        .eq('level1_product_id', id);

      if (relationshipError) {
        console.error('Error deleting level1_level2_relationships:', relationshipError);
      }

      // Delete the product
      const { error: productError } = await supabase
        .from('products')
        .delete()
        .eq('id', id)
        .eq('product_level', 1);

      if (productError) {
        throw productError;
      }

      // Update local cache
      this.level1Products = this.level1Products.filter(product => product.id !== id);
    } catch (error) {
      console.error('Error deleting Level 1 product:', error);
      throw error;
    }
  };
  
  async updateLevel2Product(id: string, productData: Partial<Level2Product>): Promise<Level2Product> {
    try {
      const { data: currentProduct, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!currentProduct) throw new Error('Product not found');

      const { chassisType, parentProductId, image, productInfoUrl, ...restOfProductData } = productData;

      const updateData: any = {
        ...restOfProductData, // Spread the rest of the data
        updated_at: new Date().toISOString(),
        display_name: productData.displayName || currentProduct?.display_name || currentProduct?.name,
        price: productData.price !== undefined ? productData.price : currentProduct?.price,
        cost: productData.cost !== undefined ? productData.cost : currentProduct?.cost,
        enabled: productData.enabled !== undefined ? productData.enabled : currentProduct?.enabled,
        // Explicitly map camelCase to snake_case
        parent_product_id: parentProductId !== undefined ? parentProductId : currentProduct?.parent_product_id,
        chassis_type: chassisType !== undefined ? chassisType : currentProduct?.chassis_type,
        image_url: image !== undefined ? image : currentProduct?.image_url, // Corrected: image -> image_url
        product_info_url: productInfoUrl !== undefined ? productInfoUrl : currentProduct?.product_info_url,
        specifications: productData.specifications !== undefined ? productData.specifications : currentProduct?.specifications,
      };

      const { data, error } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const index = this.level2Products.findIndex(p => p.id === id);
      if (index !== -1) {
        this.level2Products[index] = { ...this.level2Products[index], ...updateData };
      }

      return data as Level2Product;
    } catch (error) {
      console.error('Error updating Level 2 product:', error);
      throw error;
    }
  }
  
  deleteLevel2Product = async (id: string) => {
    try {
      // Delete level2_level3_relationships
      const { error: rel3Error } = await supabase
        .from('level2_level3_relationships')
        .delete()
        .eq('level2_product_id', id);

      if (rel3Error) {
        console.error('Error deleting level2_level3_relationships:', rel3Error);
      }

      // Delete level1_level2_relationships
      const { error: rel1Error } = await supabase
        .from('level1_level2_relationships')
        .delete()
        .eq('level2_product_id', id);

      if (rel1Error) {
        console.error('Error deleting level1_level2_relationships:', rel1Error);
      }

      // Delete chassis_configurations
      const { error: chassisError } = await supabase
        .from('chassis_configurations')
        .delete()
        .eq('level2_product_id', id);

      if (chassisError) {
        console.error('Error deleting chassis_configurations:', chassisError);
      }

      // Delete part_number_configs
      const { error: partNumberError } = await supabase
        .from('part_number_configs')
        .delete()
        .eq('level2_product_id', id);

      if (partNumberError) {
        console.error('Error deleting part_number_configs:', partNumberError);
      }

      // Delete the product
      const { error: productError } = await supabase
        .from('products')
        .delete()
        .eq('id', id)
        .eq('product_level', 2);

      if (productError) {
        throw productError;
      }

      // Update local cache
      this.level2Products = this.level2Products.filter(product => product.id !== id);
    } catch (error) {
      console.error('Error deleting Level 2 product:', error);
      throw error;
    }
  };
  deleteLevel3Product = async (id: string) => {
    try {
      const { error: relationshipDeleteError } = await supabase
        .from('level2_level3_relationships')
        .delete()
        .eq('level3_product_id', id);

      if (relationshipDeleteError) {
        throw relationshipDeleteError;
      }

      const { error: partNumberDeleteError } = await supabase
        .from('part_number_codes')
        .delete()
        .eq('level3_product_id', id);

      if (partNumberDeleteError) {
        throw partNumberDeleteError;
      }

      const { error: productDeleteError } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (productDeleteError) {
        throw productDeleteError;
      }

      this.level3Products = this.level3Products.filter(product => product.id !== id);
      delete this.level3ParentMap[id];
    } catch (error) {
      console.error('Error deleting Level 3 product:', error);
      throw error;
    }
  };
  
  getLevel2ProductsByCategory = async (category: string): Promise<Level2Product[]> => {
    return this.level2Products.filter(p => 
      p.specifications?.category === category || 
      (p as any).category === category ||
      (p as any).subcategory === category
    );
  };

  getLevel2ProductsForLevel1 = async (level1Id: string): Promise<Level2Product[]> => {
    console.log(`[ProductDataService] Getting level 2 products for level 1 ID: ${level1Id}`);
    
    // Ensure level 1 products are loaded
    if (!this.level1Initialized) {
      console.log('[ProductDataService] Level 1 products not initialized, loading now...');
      await this.loadLevel1ProductsFromDB();
    }
    
    // Get parent product details
    const parentProduct = this.level1Products.find(p => p.id === level1Id);
    if (!parentProduct) {
      console.error(`[ProductDataService] Parent product with ID ${level1Id} not found`);
      return [];
    }
    
    console.log(`[ProductDataService] Found parent product:`, {
      id: parentProduct.id,
      name: parentProduct.name,
      displayName: parentProduct.displayName,
      hasDisplayName: !!parentProduct.displayName
    });
    
    // Get all level 2 products for this level 1 product
    const level2Products = this.level2Products.filter(p => {
      const matches = p.parentProductId === level1Id || p.parent_product_id === level1Id;
      console.log(`[ProductDataService] Checking product ${p.name} (${p.id}):`, {
        parentProductId: p.parentProductId,
        parent_product_id: p.parent_product_id,
        matchesParent: matches
      });
      return matches;
    });
    
    console.log(`[ProductDataService] Found ${level2Products.length} level 2 products for parent ID ${level1Id}`);
    
    // Add parent product reference to each level 2 product
    const result = level2Products.map(product => {
      const enhancedProduct = {
        ...product,
        // Ensure parentProductId is set correctly
        parentProductId: product.parentProductId || product.parent_product_id || level1Id,
        // Add parent product details for reference
        parentProduct: {
          id: parentProduct.id, 
          name: parentProduct.name, 
          displayName: parentProduct.displayName || parentProduct.name
        }
      };
      
      console.log(`[ProductDataService] Enhanced product ${product.name} with parent:`, {
        productId: product.id,
        productName: product.name,
        originalParentId: product.parentProductId || product.parent_product_id,
        finalParentId: enhancedProduct.parentProductId,
        parentDisplayName: enhancedProduct.parentProduct.displayName
      });
      
      return enhancedProduct;
    });
    
    return result;
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
  async findProductById(id: string): Promise<Level1Product | Level2Product | Level3Product | null> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error('Error finding product by ID:', error);
        throw error;
      }

      if (!data) return null;

      // Map to appropriate product type based on product_level
      if (data.product_level === 1) {
        return {
          id: data.id,
          name: data.name,
          displayName: data.display_name || data.name,
          type: data.category || 'standard',
          description: data.description || '',
          price: data.price || 0,
          cost: data.cost || 0,
          enabled: data.enabled,
          partNumber: data.part_number,
          image: data.image_url,
          productInfoUrl: data.product_info_url,
          asset_type_id: data.asset_type_id,
          category: data.category,
          rackConfigurable: data.rack_configurable || false,
          specifications: data.specifications || {}
        } as Level1Product;
      } else if (data.product_level === 2) {
        return {
          id: data.id,
          name: data.name,
          displayName: data.display_name || data.name, // Assuming Level2 also has display_name
          parentProductId: data.parent_product_id || '',
          description: data.description || '',
          price: data.price || 0,
          cost: data.cost || 0,
          enabled: data.enabled,
          partNumber: data.part_number,
          chassisType: data.chassis_type || 'N/A',
          image: data.image_url,
          productInfoUrl: data.product_info_url,
          specifications: data.specifications || {}
        } as Level2Product;
      } else if (data.product_level === 3) {
        return {
          id: data.id,
          name: data.name,
          displayName: data.display_name || data.name,
          parent_product_id: data.parent_product_id,
          parentProductId: data.parent_product_id,
          product_level: 3,
          type: data.category || 'standard',
          description: data.description || '',
          price: data.price || 0,
          cost: data.cost || 0,
          enabled: data.enabled !== false,
          partNumber: data.part_number,
          image: data.image_url,
          productInfoUrl: data.product_info_url,
          has_level4: data.has_level4 === true,
          sku: data.sku,
          specifications: data.specifications || {}
        } as Level3Product;
      }
      return null;
    } catch (error) {
      console.error('Error in findProductById:', error);
      throw error;
    }
  }
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
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!currentProduct) throw new Error('Product not found');
      
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
        .maybeSingle();

      if (columnError) {
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
            .maybeSingle();
          
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