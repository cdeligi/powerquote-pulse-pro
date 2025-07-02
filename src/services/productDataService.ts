
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
import {
  DEFAULT_ASSET_TYPES,
  DEFAULT_LEVEL1_PRODUCTS,
  DEFAULT_LEVEL2_PRODUCTS,
  DEFAULT_LEVEL3_PRODUCTS,
  DEFAULT_ANALOG_SENSORS,
  DEFAULT_BUSHING_TAP_MODELS
} from "@/data/productDefaults";
import { dataDebugUtils } from "@/utils/dataDebug";

class ProductDataService {
  private level1Products: Level1Product[] = [];
  private level2Products: Level2Product[] = [];
  private level3Products: Level3Product[] = [];
  private level4Products: Level4Product[] = [];
  private assetTypes: AssetType[] = [];
  private analogSensorTypes: AnalogSensorOption[] = [];
  private bushingTapModels: BushingTapModelOption[] = [];
  private initialized: boolean = false;
  private defaultsLoaded: boolean = false;
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    // Load defaults immediately to prevent blocking
    this.loadDefaults();
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this._performInitialization();
    return this.initializationPromise;
  }

  private async _performInitialization(): Promise<void> {
    try {
      console.log('ProductDataService: Starting initialization...');
      
      // Set a timeout to prevent infinite loading
      const initTimeout = setTimeout(() => {
        console.warn('ProductDataService: Initialization timeout, using defaults');
        this.loadDefaults();
        this.defaultsLoaded = true;
        this.initialized = true;
      }, 5000);

      // Step 1: Try to load from database first
      const dbSuccess = await this.loadFromDatabase();

      if (dbSuccess) {
        this.defaultsLoaded = false;
      } else {
        console.log('ProductDataService: Database load failed, trying localStorage...');
        // Step 2: Fallback to localStorage
        const localSuccess = this.loadFromLocalStorage();

        if (localSuccess) {
          this.defaultsLoaded = false;
        } else {
          console.log('ProductDataService: localStorage load failed, using defaults...');
          // Step 3: Final fallback to defaults
          this.loadDefaults();
        }
      }

      // Clear the timeout since we completed successfully
      clearTimeout(initTimeout);

      // Validate data relationships
      dataDebugUtils.validateProductRelationships(
        this.level1Products, 
        this.level2Products, 
        this.level3Products
      );

      // Save current state to localStorage for offline access
      this.saveToLocalStorage();
      
      this.initialized = true;
      console.log('ProductDataService: Initialization complete', {
        level1Count: this.level1Products.length,
        level2Count: this.level2Products.length,
        level3Count: this.level3Products.length,
        level4Count: this.level4Products.length,
        assetTypesCount: this.assetTypes.length
      });

    } catch (error) {
      console.error('ProductDataService: Initialization failed:', error);
      // Emergency fallback to defaults
      this.loadDefaults();
      this.defaultsLoaded = true;
      this.initialized = true;
    }
  }

  private async loadFromDatabase(): Promise<boolean> {
    try {
      console.log('ProductDataService: Loading from database...');
      
      // Set a timeout for database operations
      const dbTimeout = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Database timeout')), 3000);
      });

      const dbOperations = Promise.all([
        supabase.from('products').select('*').eq('category', 'level1').eq('is_active', true),
        supabase.from('products').select('*').eq('category', 'level2').eq('is_active', true),
        supabase.from('products').select('*').eq('category', 'level3').eq('is_active', true),
        supabase.from('level4_products').select('*').eq('enabled', true),
        supabase.from('level1_level2_relationships').select('*'),
        supabase.from('level2_level3_relationships').select('*')
      ]);

      const [
        { data: level1Data, error: l1Error },
        { data: level2Data, error: l2Error },
        { data: level3Data, error: l3Error },
        { data: level4Data, error: l4Error },
        { data: l1l2Relations, error: l1l2Error },
        { data: l2l3Relations, error: l2l3Error }
      ] = await Promise.race([dbOperations, dbTimeout]);

      if (l1Error || l2Error || l3Error || l4Error || l1l2Error || l2l3Error) {
        console.warn('ProductDataService: Database errors:', { l1Error, l2Error, l3Error, l4Error, l1l2Error, l2l3Error });
        return false;
      }

      // Transform database format to our format with proper relationships
      this.level1Products = this.transformDbToLevel1(level1Data || []);
      this.level2Products = this.transformDbToLevel2(level2Data || [], l1l2Relations || []);
      this.level3Products = this.transformDbToLevel3(level3Data || [], l2l3Relations || []);
      this.level4Products = level4Data || [];

      // Load other data types (use defaults for now since they're not in DB)
      this.assetTypes = [...DEFAULT_ASSET_TYPES];
      this.analogSensorTypes = [...DEFAULT_ANALOG_SENSORS];
      this.bushingTapModels = [...DEFAULT_BUSHING_TAP_MODELS];

      // Validate we have some data
      const hasData = this.level1Products.length > 0;
      
      console.log('ProductDataService: Database load successful', {
        level1Count: this.level1Products.length,
        level2Count: this.level2Products.length,
        level3Count: this.level3Products.length,
        relationshipsL1L2: l1l2Relations?.length || 0,
        relationshipsL2L3: l2l3Relations?.length || 0
      });
      
      return hasData;
    } catch (error) {
      console.error('ProductDataService: Database load failed:', error);
      return false;
    }
  }

  private loadFromLocalStorage(): boolean {
    try {
      console.log('ProductDataService: Loading from localStorage...');
      
      const storedL1 = localStorage.getItem('level1Products');
      const storedL2 = localStorage.getItem('level2Products');
      const storedL3 = localStorage.getItem('level3Products');
      const storedL4 = localStorage.getItem('level4Products');
      
      if (storedL1) this.level1Products = JSON.parse(storedL1);
      if (storedL2) this.level2Products = JSON.parse(storedL2);
      if (storedL3) this.level3Products = JSON.parse(storedL3);
      if (storedL4) this.level4Products = JSON.parse(storedL4);

      // Load other types
      const storedAssetTypes = localStorage.getItem('assetTypes');
      const storedAnalogSensors = localStorage.getItem('analogSensorTypes');
      const storedBushingTap = localStorage.getItem('bushingTapModels');
      
      this.assetTypes = storedAssetTypes ? JSON.parse(storedAssetTypes) : [...DEFAULT_ASSET_TYPES];
      this.analogSensorTypes = storedAnalogSensors ? JSON.parse(storedAnalogSensors) : [...DEFAULT_ANALOG_SENSORS];
      this.bushingTapModels = storedBushingTap ? JSON.parse(storedBushingTap) : [...DEFAULT_BUSHING_TAP_MODELS];

      // Validate we have some data
      const hasData = this.level1Products.length > 0;
      
      console.log('ProductDataService: localStorage load result:', { hasData });
      return hasData;
    } catch (error) {
      console.error('ProductDataService: localStorage load failed:', error);
      return false;
    }
  }

  private loadDefaults(): void {
    console.log('ProductDataService: Loading default data...');

    this.level1Products = [...DEFAULT_LEVEL1_PRODUCTS];
    this.level2Products = [...DEFAULT_LEVEL2_PRODUCTS];
    this.level3Products = [...DEFAULT_LEVEL3_PRODUCTS];
    this.level4Products = [];
    this.assetTypes = [...DEFAULT_ASSET_TYPES];
    this.analogSensorTypes = [...DEFAULT_ANALOG_SENSORS];
    this.bushingTapModels = [...DEFAULT_BUSHING_TAP_MODELS];
    this.defaultsLoaded = true;
  }

  private saveToLocalStorage(): void {
    try {
      localStorage.setItem('level1Products', JSON.stringify(this.level1Products));
      localStorage.setItem('level2Products', JSON.stringify(this.level2Products));
      localStorage.setItem('level3Products', JSON.stringify(this.level3Products));
      localStorage.setItem('level4Products', JSON.stringify(this.level4Products));
      localStorage.setItem('assetTypes', JSON.stringify(this.assetTypes));
      localStorage.setItem('analogSensorTypes', JSON.stringify(this.analogSensorTypes));
      localStorage.setItem('bushingTapModels', JSON.stringify(this.bushingTapModels));
    } catch (error) {
      console.error('ProductDataService: Failed to save to localStorage:', error);
    }
  }

  // Transform database format to our format with proper relationships
  private transformDbToLevel1(dbData: any[]): Level1Product[] {
    return dbData.map(item => ({
      id: item.id,
      name: item.name,
      type: item.subcategory || 'QTMS',
      category: item.category,
      description: item.description || '',
      price: parseFloat(item.price) || 0,
      cost: parseFloat(item.cost) || 0,
      enabled: item.is_active !== false
    }));
  }

  private transformDbToLevel2(dbData: any[], relationships: any[]): Level2Product[] {
    return dbData.map(item => {
      // Find parent relationship
      const parentRelation = relationships.find(rel => rel.level2_product_id === item.id);
      
      return {
        id: item.id,
        name: item.name,
        parentProductId: parentRelation?.level1_product_id || '',
        type: item.subcategory || 'LTX',
        description: item.description || '',
        price: parseFloat(item.price) || 0,
        cost: parseFloat(item.cost) || 0,
        enabled: item.is_active !== false,
        specifications: this.parseSpecifications(item.subcategory)
      };
    });
  }

  private transformDbToLevel3(dbData: any[], relationships: any[]): Level3Product[] {
    return dbData.map(item => {
      // Find parent relationship
      const parentRelation = relationships.find(rel => rel.level3_product_id === item.id);
      
      return {
        id: item.id,
        name: item.name,
        parentProductId: parentRelation?.level2_product_id || '',
        type: item.subcategory || 'card',
        description: item.description || '',
        price: parseFloat(item.price) || 0,
        cost: parseFloat(item.cost) || 0,
        enabled: item.is_active !== false,
        specifications: this.parseLevel3Specifications(item.subcategory, item.name)
      };
    });
  }

  private parseSpecifications(subcategory: string): any {
    switch (subcategory) {
      case 'LTX':
        return { height: '7U', slots: 19, capacity: 'Large' };
      case 'MTX':
        return { height: '5U', slots: 12, capacity: 'Medium' };
      case 'STX':
        return { height: '3U', slots: 6, capacity: 'Small' };
      default:
        return {};
    }
  }

  private parseLevel3Specifications(subcategory: string, name: string): any {
    const specs: any = {};
    
    if (subcategory === 'card') {
      specs.slotRequirement = 1;
      
      if (name.toLowerCase().includes('analog')) {
        specs.inputs = 8;
        specs.channels = 8;
        specs.inputTypes = ['4-20mA', '0-10V', 'RTD', 'Thermocouple'];
      } else if (name.toLowerCase().includes('digital')) {
        specs.inputs = 16;
        specs.outputs = ['Relay', 'Digital'];
        specs.channels = 16;
      } else if (name.toLowerCase().includes('communication')) {
        specs.protocols = ['Modbus', 'DNP3', 'IEC 61850'];
        specs.outputs = ['Ethernet', 'Serial'];
      }
    }
    
    return specs;
  }

  // Public async methods
  async getLevel1Products(): Promise<Level1Product[]> {
    // Always return immediately with current data, optionally trigger background update
    if (!this.initialized || this.level1Products.length === 0) {
      this.initialize().catch(console.error);
    }
    return [...this.level1Products];
  }

  async getLevel2Products(): Promise<Level2Product[]> {
    if (!this.initialized || this.level2Products.length === 0) {
      this.initialize().catch(console.error);
    }
    return [...this.level2Products];
  }

  async getLevel3Products(): Promise<Level3Product[]> {
    if (!this.initialized || this.level3Products.length === 0) {
      this.initialize().catch(console.error);
    }
    return [...this.level3Products];
  }

  async getLevel4Products(): Promise<Level4Product[]> {
    if (!this.initialized) {
      this.initialize().catch(console.error);
    }
    return [...this.level4Products];
  }

  async getAssetTypes(): Promise<AssetType[]> {
    if (!this.initialized || this.assetTypes.length === 0) {
      this.initialize().catch(console.error);
    }
    return [...this.assetTypes];
  }

  // Synchronous methods for backward compatibility
  getLevel1ProductsSync(): Level1Product[] {
    return [...this.level1Products];
  }

  getLevel2ProductsSync(): Level2Product[] {
    return [...this.level2Products];
  }

  getLevel3ProductsSync(): Level3Product[] {
    return [...this.level3Products];
  }

  getLevel4ProductsSync(): Level4Product[] {
    return [...this.level4Products];
  }

  getAssetTypesSync(): AssetType[] {
    return [...this.assetTypes];
  }

  // Relationship methods with proper database-driven relationships
  getLevel2ProductsForLevel1(level1Id: string): Level2Product[] {
    return this.level2Products.filter(l2 => l2.parentProductId === level1Id);
  }

  getLevel3ProductsForLevel2(level2Id: string): Level3Product[] {
    return this.level3Products.filter(l3 => l3.parentProductId === level2Id);
  }

  // Sensor and bushing methods
  getAnalogSensorTypes(): AnalogSensorOption[] {
    return [...this.analogSensorTypes];
  }

  getBushingTapModels(): BushingTapModelOption[] {
    return [...this.bushingTapModels];
  }

  // CRUD methods for analog sensor types
  async createAnalogSensorType(data: Omit<AnalogSensorOption, 'id'>): Promise<AnalogSensorOption> {
    const newItem: AnalogSensorOption = {
      ...data,
      id: `analog-${Date.now()}`
    };
    this.analogSensorTypes.push(newItem);
    this.saveToLocalStorage();
    return newItem;
  }

  async updateAnalogSensorType(id: string, data: Partial<Omit<AnalogSensorOption, 'id'>>): Promise<AnalogSensorOption | null> {
    const index = this.analogSensorTypes.findIndex(item => item.id === id);
    if (index !== -1) {
      this.analogSensorTypes[index] = { ...this.analogSensorTypes[index], ...data };
      this.saveToLocalStorage();
      return this.analogSensorTypes[index];
    }
    return null;
  }

  async deleteAnalogSensorType(id: string): Promise<void> {
    this.analogSensorTypes = this.analogSensorTypes.filter(item => item.id !== id);
    this.saveToLocalStorage();
  }

  // CRUD methods for bushing tap models
  async createBushingTapModel(data: Omit<BushingTapModelOption, 'id'>): Promise<BushingTapModelOption> {
    const newItem: BushingTapModelOption = {
      ...data,
      id: `bushing-${Date.now()}`
    };
    this.bushingTapModels.push(newItem);
    this.saveToLocalStorage();
    return newItem;
  }

  async updateBushingTapModel(id: string, data: Partial<Omit<BushingTapModelOption, 'id'>>): Promise<BushingTapModelOption | null> {
    const index = this.bushingTapModels.findIndex(item => item.id === id);
    if (index !== -1) {
      this.bushingTapModels[index] = { ...this.bushingTapModels[index], ...data };
      this.saveToLocalStorage();
      return this.bushingTapModels[index];
    }
    return null;
  }

  async deleteBushingTapModel(id: string): Promise<void> {
    this.bushingTapModels = this.bushingTapModels.filter(item => item.id !== id);
    this.saveToLocalStorage();
  }

  // Replace all products method for sync functionality
  replaceAllProducts(level1Data: any[], level2Data: any[], level3Data: any[], level4Data: any[]): void {
    this.level1Products = this.transformDbToLevel1(level1Data);
    this.level2Products = this.transformDbToLevel2(level2Data, []); // Pass empty array for relationships
    this.level3Products = this.transformDbToLevel3(level3Data, []); // Pass empty array for relationships
    this.level4Products = level4Data;
    this.saveToLocalStorage();
    this.defaultsLoaded = false;
    this.initialized = true;
  }

  // Level 1 Products methods
  async createLevel1Product(product: Omit<Level1Product, 'id'>): Promise<Level1Product> {
    await this.initialize();
    const newProduct: Level1Product = {
      ...product,
      id: `level1-${Date.now()}`
    };
    this.level1Products.push(newProduct);
    this.saveToLocalStorage();

    try {
      await supabase.from('products').insert({
        id: newProduct.id,
        name: newProduct.name,
        description: newProduct.description,
        category: 'level1',
        subcategory: newProduct.type,
        price: newProduct.price,
        cost: newProduct.cost ?? null,
        is_active: newProduct.enabled
      });
    } catch (error) {
      console.error('Failed to persist level1 product', error);
    }

    return newProduct;
  }

  async updateLevel1Product(id: string, updates: Partial<Omit<Level1Product, 'id'>>): Promise<Level1Product | null> {
    await this.initialize();
    const index = this.level1Products.findIndex(product => product.id === id);
    if (index !== -1) {
      this.level1Products[index] = { ...this.level1Products[index], ...updates };
      this.saveToLocalStorage();

      try {
        await supabase.from('products')
          .update({
            name: this.level1Products[index].name,
            description: this.level1Products[index].description,
            subcategory: this.level1Products[index].type,
            price: this.level1Products[index].price,
            cost: this.level1Products[index].cost ?? null,
            is_active: this.level1Products[index].enabled
          })
          .eq('id', id);
      } catch (error) {
        console.error('Failed to update level1 product', error);
      }

      return this.level1Products[index];
    }
    return null;
  }

  async deleteLevel1Product(id: string): Promise<void> {
    await this.initialize();
    this.level1Products = this.level1Products.filter(product => product.id !== id);
    this.saveToLocalStorage();

    try {
      await supabase.from('products').delete().eq('id', id);
    } catch (error) {
      console.error('Failed to delete level1 product', error);
    }
  }

  // Level 2 Products methods
  async createLevel2Product(product: Omit<Level2Product, 'id'>): Promise<Level2Product> {
    await this.initialize();
    const newProduct: Level2Product = {
      ...product,
      id: `level2-${Date.now()}`
    };
    this.level2Products.push(newProduct);
    this.saveToLocalStorage();

    try {
      await supabase.from('products').insert({
        id: newProduct.id,
        name: newProduct.name,
        description: newProduct.description,
        category: 'level2',
        subcategory: newProduct.type,
        price: newProduct.price,
        cost: newProduct.cost ?? null,
        is_active: newProduct.enabled
      });
    } catch (error) {
      console.error('Failed to persist level2 product', error);
    }

    return newProduct;
  }

  async updateLevel2Product(id: string, updates: Partial<Omit<Level2Product, 'id'>>): Promise<Level2Product | null> {
    await this.initialize();
    const index = this.level2Products.findIndex(product => product.id === id);
    if (index !== -1) {
      this.level2Products[index] = { ...this.level2Products[index], ...updates };
      this.saveToLocalStorage();

      try {
        await supabase.from('products')
          .update({
            name: this.level2Products[index].name,
            description: this.level2Products[index].description,
            subcategory: this.level2Products[index].type,
            price: this.level2Products[index].price,
            cost: this.level2Products[index].cost ?? null,
            is_active: this.level2Products[index].enabled
          })
          .eq('id', id);
      } catch (error) {
        console.error('Failed to update level2 product', error);
      }

      return this.level2Products[index];
    }
    return null;
  }

  async deleteLevel2Product(id: string): Promise<void> {
    await this.initialize();
    this.level2Products = this.level2Products.filter(product => product.id !== id);
    this.saveToLocalStorage();

    try {
      await supabase.from('products').delete().eq('id', id);
    } catch (error) {
      console.error('Failed to delete level2 product', error);
    }
  }

  // Level 3 and Level 4 methods
  async createLevel3Product(product: Omit<Level3Product, 'id'>): Promise<Level3Product> {
    await this.initialize();
    const newProduct: Level3Product = {
      ...product,
      id: `level3-${Date.now()}`
    };
    this.level3Products.push(newProduct);
    this.saveToLocalStorage();

    try {
      await supabase.from('products').insert({
        id: newProduct.id,
        name: newProduct.name,
        description: newProduct.description,
        category: 'level3',
        subcategory: newProduct.type,
        price: newProduct.price,
        cost: newProduct.cost ?? null,
        is_active: newProduct.enabled ?? true
      });
    } catch (error) {
      console.error('Failed to persist level3 product', error);
    }

    return newProduct;
  }

  async updateLevel3Product(id: string, updates: Partial<Omit<Level3Product, 'id'>>): Promise<Level3Product | null> {
    await this.initialize();
    const index = this.level3Products.findIndex(product => product.id === id);
    if (index !== -1) {
      this.level3Products[index] = { ...this.level3Products[index], ...updates };
      this.saveToLocalStorage();

      try {
        await supabase.from('products')
          .update({
            name: this.level3Products[index].name,
            description: this.level3Products[index].description,
            subcategory: this.level3Products[index].type,
            price: this.level3Products[index].price,
            cost: this.level3Products[index].cost ?? null,
            is_active: this.level3Products[index].enabled ?? true
          })
          .eq('id', id);
      } catch (error) {
        console.error('Failed to update level3 product', error);
      }

      return this.level3Products[index];
    }
    return null;
  }

  async deleteLevel3Product(id: string): Promise<void> {
    await this.initialize();
    this.level3Products = this.level3Products.filter(product => product.id !== id);
    this.saveToLocalStorage();

    try {
      await supabase.from('products').delete().eq('id', id);
    } catch (error) {
      console.error('Failed to delete level3 product', error);
    }
  }

  async createLevel4Product(product: Omit<Level4Product, 'id'>): Promise<Level4Product> {
    await this.initialize();
    const newProduct: Level4Product = {
      ...product,
      id: `level4-${Date.now()}`
    };
    this.level4Products.push(newProduct);
    this.saveToLocalStorage();

    try {
      await supabase.from('level4_products').insert({
        id: newProduct.id,
        name: newProduct.name,
        parent_product_id: newProduct.parentProductId,
        description: newProduct.description,
        configuration_type: newProduct.configurationType,
        price: newProduct.price,
        cost: newProduct.cost ?? null,
        enabled: newProduct.enabled
      });
    } catch (error) {
      console.error('Failed to persist level4 product', error);
    }

    return newProduct;
  }

  // Debug method to reset and reload
  async resetAndReload(): Promise<void> {
    console.log('ProductDataService: Resetting and reloading...');
    dataDebugUtils.clearLocalStorage();
    this.initialized = false;
    this.initializationPromise = null;
    this.loadDefaults();
    await this.initialize();
  }

  // Debug methods
  clearCorruptedData(): void {
    console.log('ProductDataService: Clearing potentially corrupted data...');
    dataDebugUtils.clearLocalStorage();
    this.loadDefaults();
    this.saveToLocalStorage();
  }

  getDebugInfo(): any {
    return {
      initialized: this.initialized,
      defaultsLoaded: this.defaultsLoaded,
      level1Count: this.level1Products.length,
      level2Count: this.level2Products.length,
      level3Count: this.level3Products.length,
      level4Count: this.level4Products.length,
      assetTypesCount: this.assetTypes.length,
      analogSensorTypesCount: this.analogSensorTypes.length,
      bushingTapModelsCount: this.bushingTapModels.length
    };
  }
}

export const productDataService = new ProductDataService();

// Expose for debugging
if (typeof window !== 'undefined') {
  (window as any).productDataService = productDataService;
  (window as any).clearProductData = () => productDataService.clearCorruptedData();
  (window as any).getProductDebugInfo = () => productDataService.getDebugInfo();
}
