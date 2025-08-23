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
        parent_product_id: product.parent_product_id || '',
        parentProductId: product.parent_product_id || '',
        description: product.description || '',
        price: product.price || 0,
        cost: product.cost || 0,
        enabled: product.enabled,
        product_level: 3,
        part_number_format: product.part_number,
        partNumber: product.part_number,
        requires_level4_config: product.requires_level4_config || false,
        has_level4: product.has_level4 || false,
        productInfoUrl: product.product_info_url,
        specifications: product.specifications || {},
        image: product.image_url,
        sku: product.part_number
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
    const newProduct = { id: 'temp', ...productData };
    return newProduct;
  }

  async updateLevel3Product(id: string, productData: Partial<Level3Product>): Promise<Level3Product> {
    return { id, ...productData } as Level3Product;
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

  // Stub methods to prevent build errors - with correct signatures
  getAssetTypes = async (): Promise<AssetType[]> => [];
  getAssetTypesSync = (): AssetType[] => [];
  
  getPartNumberConfig = async (level2Id: string) => ({
    prefix: '',
    slot_placeholder: 'XX',
    slot_count: 2,
    suffix_separator: '-',
    remote_off_code: '0',
    remote_on_code: '1'
  });
  
  getLevel3ProductsForLevel2 = async (level2Id: string): Promise<Level3Product[]> => {
    return this.level3Products.filter(p => p.parent_product_id === level2Id || p.parentProductId === level2Id);
  };
  
  getPartNumberCodesForLevel2 = async (level2Id: string) => ({});
  
  upsertPartNumberConfig = async (config: any) => {};
  
  upsertPartNumberCodes = async (codes: any) => {};
  
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
}

// Export singleton instance
export const productDataService = ProductDataService.getInstance();