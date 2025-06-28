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

class ProductDataService {
  private level1Products: Level1Product[] = [];
  private level2Products: Level2Product[] = [];
  private level3Products: Level3Product[] = [];
  private level4Products: Level4Product[] = [];
  private assetTypes: AssetType[] = [];
  private analogSensorTypes: AnalogSensorOption[] = [];
  private bushingTapModels: BushingTapModelOption[] = [];

  constructor() {
    this.loadData();
  }

  private loadData() {
    const storedAssetTypes = localStorage.getItem('assetTypes');
    this.assetTypes = storedAssetTypes ? JSON.parse(storedAssetTypes) : [];

    const storedAnalogSensorTypes = localStorage.getItem('analogSensorTypes');
    this.analogSensorTypes = storedAnalogSensorTypes ? JSON.parse(storedAnalogSensorTypes) : [];

    const storedBushingTapModels = localStorage.getItem('bushingTapModels');
    this.bushingTapModels = storedBushingTapModels ? JSON.parse(storedBushingTapModels) : [];

    const storedLevel1Products = localStorage.getItem('level1Products');
    this.level1Products = storedLevel1Products ? JSON.parse(storedLevel1Products) : [];

    const storedLevel2Products = localStorage.getItem('level2Products');
    this.level2Products = storedLevel2Products ? JSON.parse(storedLevel2Products) : [];

    const storedLevel3Products = localStorage.getItem('level3Products');
    this.level3Products = storedLevel3Products ? JSON.parse(storedLevel3Products) : [];

    const storedLevel4Products = localStorage.getItem('level4Products');
    this.level4Products = storedLevel4Products ? JSON.parse(storedLevel4Products) : [];

    this.initializeDefaultData();
  }

  private saveData() {
    localStorage.setItem('assetTypes', JSON.stringify(this.assetTypes));
    localStorage.setItem('analogSensorTypes', JSON.stringify(this.analogSensorTypes));
    localStorage.setItem('bushingTapModels', JSON.stringify(this.bushingTapModels));
    localStorage.setItem('level1Products', JSON.stringify(this.level1Products));
    localStorage.setItem('level2Products', JSON.stringify(this.level2Products));
    localStorage.setItem('level3Products', JSON.stringify(this.level3Products));
    localStorage.setItem('level4Products', JSON.stringify(this.level4Products));
  }

  // Asset Types (Level 0) methods
  getAssetTypes() {
    return this.assetTypes;
  }

  createAssetType(assetType: Omit<AssetType, 'id'>) {
    const newAssetType: AssetType = {
      ...assetType,
      id: `asset-${Date.now()}`
    };
    this.assetTypes.push(newAssetType);
    this.saveData();
    return newAssetType;
  }

  updateAssetType(id: string, updates: Partial<Omit<AssetType, 'id'>>) {
    const index = this.assetTypes.findIndex(type => type.id === id);
    if (index !== -1) {
      this.assetTypes[index] = { ...this.assetTypes[index], ...updates };
      this.saveData();
      return this.assetTypes[index];
    }
    return null;
  }

  deleteAssetType(id: string) {
    this.assetTypes = this.assetTypes.filter(type => type.id !== id);
    this.saveData();
  }

  // Analog Sensor Types
  getAnalogSensorTypes() {
    return this.analogSensorTypes;
  }

  async createAnalogSensorType(sensor: Omit<AnalogSensorOption, 'id'>) {
    const newSensor: AnalogSensorOption = { ...sensor, id: `sensor-${Date.now()}` };
    this.analogSensorTypes.push(newSensor);
    this.saveData();
    try {
      await supabase.from('analog_sensor_types').insert({ id: newSensor.id, name: newSensor.name, description: newSensor.description });
    } catch (error) {
      console.error('Failed to persist analog sensor type', error);
    }
    return newSensor;
  }

  async updateAnalogSensorType(id: string, updates: Partial<Omit<AnalogSensorOption, 'id'>>) {
    const index = this.analogSensorTypes.findIndex(t => t.id === id);
    if (index !== -1) {
      this.analogSensorTypes[index] = { ...this.analogSensorTypes[index], ...updates };
      this.saveData();
      try {
        await supabase.from('analog_sensor_types').update({ name: this.analogSensorTypes[index].name, description: this.analogSensorTypes[index].description }).eq('id', id);
      } catch (error) {
        console.error('Failed to update analog sensor type', error);
      }
      return this.analogSensorTypes[index];
    }
    return null;
  }

  async deleteAnalogSensorType(id: string) {
    this.analogSensorTypes = this.analogSensorTypes.filter(t => t.id !== id);
    this.saveData();
    try {
      await supabase.from('analog_sensor_types').delete().eq('id', id);
    } catch (error) {
      console.error('Failed to delete analog sensor type', error);
    }
  }

  // Bushing Tap Models
  getBushingTapModels() {
    return this.bushingTapModels;
  }

  async createBushingTapModel(model: Omit<BushingTapModelOption, 'id'>) {
    const newModel: BushingTapModelOption = { ...model, id: `bushing-${Date.now()}` };
    this.bushingTapModels.push(newModel);
    this.saveData();
    try {
      await supabase.from('bushing_tap_models').insert({ id: newModel.id, name: newModel.name });
    } catch (error) {
      console.error('Failed to persist bushing tap model', error);
    }
    return newModel;
  }

  async updateBushingTapModel(id: string, updates: Partial<Omit<BushingTapModelOption, 'id'>>) {
    const index = this.bushingTapModels.findIndex(b => b.id === id);
    if (index !== -1) {
      this.bushingTapModels[index] = { ...this.bushingTapModels[index], ...updates };
      this.saveData();
      try {
        await supabase.from('bushing_tap_models').update({ name: this.bushingTapModels[index].name }).eq('id', id);
      } catch (error) {
        console.error('Failed to update bushing tap model', error);
      }
      return this.bushingTapModels[index];
    }
    return null;
  }

  async deleteBushingTapModel(id: string) {
    this.bushingTapModels = this.bushingTapModels.filter(b => b.id !== id);
    this.saveData();
    try {
      await supabase.from('bushing_tap_models').delete().eq('id', id);
    } catch (error) {
      console.error('Failed to delete bushing tap model', error);
    }
  }

  // Level 1 Products methods
  getLevel1Products(): Level1Product[] {
    return this.level1Products;
  }

  async createLevel1Product(product: Omit<Level1Product, 'id'>): Promise<Level1Product> {
    const newProduct: Level1Product = {
      ...product,
      id: `level1-${Date.now()}`
    };
    this.level1Products.push(newProduct);
    this.saveData();

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
    const index = this.level1Products.findIndex(product => product.id === id);
    if (index !== -1) {
      this.level1Products[index] = { ...this.level1Products[index], ...updates };
      this.saveData();

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
    this.level1Products = this.level1Products.filter(product => product.id !== id);
    this.saveData();

    try {
      await supabase.from('products').delete().eq('id', id);
    } catch (error) {
      console.error('Failed to delete level1 product', error);
    }
  }

  // Level 2 Products methods
  getLevel2Products(): Level2Product[] {
    return this.level2Products;
  }

  getLevel2ProductsForLevel1(level1ProductId: string): Level2Product[] {
    return this.level2Products.filter(product => product.parentProductId === level1ProductId);
  }

  async createLevel2Product(product: Omit<Level2Product, 'id'>): Promise<Level2Product> {
    const newProduct: Level2Product = {
      ...product,
      id: `level2-${Date.now()}`
    };
    this.level2Products.push(newProduct);
    this.saveData();

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
      await supabase.from('level1_level2_relationships').insert({
        level1_product_id: newProduct.parentProductId,
        level2_product_id: newProduct.id
      });
    } catch (error) {
      console.error('Failed to persist level2 product', error);
    }

    return newProduct;
  }

  async updateLevel2Product(id: string, updates: Partial<Omit<Level2Product, 'id'>>): Promise<Level2Product | null> {
    const index = this.level2Products.findIndex(product => product.id === id);
    if (index !== -1) {
      const oldParent = this.level2Products[index].parentProductId;
      this.level2Products[index] = { ...this.level2Products[index], ...updates };
      this.saveData();

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

        if (updates.parentProductId && updates.parentProductId !== oldParent) {
          await supabase.from('level1_level2_relationships')
            .delete()
            .eq('level2_product_id', id);
          await supabase.from('level1_level2_relationships').insert({
            level1_product_id: updates.parentProductId,
            level2_product_id: id
          });
        }
      } catch (error) {
        console.error('Failed to update level2 product', error);
      }

      return this.level2Products[index];
    }
    return null;
  }

  async deleteLevel2Product(id: string): Promise<void> {
    this.level2Products = this.level2Products.filter(product => product.id !== id);
    this.saveData();

    try {
      await supabase.from('level1_level2_relationships').delete().eq('level2_product_id', id);
      await supabase.from('products').delete().eq('id', id);
    } catch (error) {
      console.error('Failed to delete level2 product', error);
    }
  }

  // Level 3 Products methods
  getLevel3Products(): Level3Product[] {
    return this.level3Products;
  }

  getLevel3ProductsForLevel2(level2ProductId: string): Level3Product[] {
    return this.level3Products.filter(product => product.parentProductId === level2ProductId);
  }

  async createLevel3Product(product: Omit<Level3Product, 'id'>): Promise<Level3Product> {
    const newProduct: Level3Product = {
      ...product,
      id: `level3-${Date.now()}`
    };
    this.level3Products.push(newProduct);
    this.saveData();

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
      await supabase.from('level2_level3_relationships').insert({
        level2_product_id: newProduct.parentProductId,
        level3_product_id: newProduct.id
      });
    } catch (error) {
      console.error('Failed to persist level3 product', error);
    }

    return newProduct;
  }

  async updateLevel3Product(id: string, updates: Partial<Omit<Level3Product, 'id'>>): Promise<Level3Product | null> {
    const index = this.level3Products.findIndex(product => product.id === id);
    if (index !== -1) {
      const oldParent = this.level3Products[index].parentProductId;
      this.level3Products[index] = { ...this.level3Products[index], ...updates };
      this.saveData();

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

        if (updates.parentProductId && updates.parentProductId !== oldParent) {
          await supabase.from('level2_level3_relationships')
            .delete()
            .eq('level3_product_id', id);
          await supabase.from('level2_level3_relationships').insert({
            level2_product_id: updates.parentProductId,
            level3_product_id: id
          });
        }
      } catch (error) {
        console.error('Failed to update level3 product', error);
      }

      return this.level3Products[index];
    }
    return null;
  }

  async deleteLevel3Product(id: string): Promise<void> {
    this.level3Products = this.level3Products.filter(product => product.id !== id);
    this.saveData();

    try {
      await supabase.from('level2_level3_relationships').delete().eq('level3_product_id', id);
      await supabase.from('products').delete().eq('id', id);
    } catch (error) {
      console.error('Failed to delete level3 product', error);
    }
  }

  isLevel3AvailableForLevel2(level3: Level3Product, level2: Level2Product): boolean {
    return level3.parentProductId === level2.id;
  }

  // Level 4 Products methods
  getLevel4Products(): Level4Product[] {
    return this.level4Products;
  }

  getLevel4ProductsForLevel3(level3ProductId: string): Level4Product[] {
    return this.level4Products.filter(product => product.parentProductId === level3ProductId);
  }

  async createLevel4Product(product: Omit<Level4Product, 'id'>): Promise<Level4Product> {
    const newProduct: Level4Product = {
      ...product,
      id: `level4-${Date.now()}`
    };
    this.level4Products.push(newProduct);
    this.saveData();

    try {
      // Insert main product record
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

      // Insert relationship record
      await supabase.from('level3_level4_relationships').insert({
        level3_product_id: newProduct.parentProductId,
        level4_product_id: newProduct.id
      });

      // Insert configuration options
      if (newProduct.options && newProduct.options.length > 0) {
        const optionsToInsert = newProduct.options.map(option => ({
          level4_product_id: newProduct.id,
          option_key: option.optionKey,
          option_value: option.optionValue,
          display_order: option.displayOrder,
          enabled: option.enabled
        }));
        await supabase.from('level4_configuration_options').insert(optionsToInsert);
      }
    } catch (error) {
      console.error('Failed to persist level4 product', error);
    }

    return newProduct;
  }

  async updateLevel4Product(id: string, updates: Partial<Omit<Level4Product, 'id'>>): Promise<Level4Product | null> {
    const index = this.level4Products.findIndex(product => product.id === id);
    if (index !== -1) {
      const oldParent = this.level4Products[index].parentProductId;
      this.level4Products[index] = { ...this.level4Products[index], ...updates };
      this.saveData();

      try {
        // Update main product record
        await supabase.from('level4_products')
          .update({
            name: this.level4Products[index].name,
            parent_product_id: this.level4Products[index].parentProductId,
            description: this.level4Products[index].description,
            configuration_type: this.level4Products[index].configurationType,
            price: this.level4Products[index].price,
            cost: this.level4Products[index].cost ?? null,
            enabled: this.level4Products[index].enabled
          })
          .eq('id', id);

        // Update relationship if parent changed
        if (updates.parentProductId && updates.parentProductId !== oldParent) {
          await supabase.from('level3_level4_relationships')
            .delete()
            .eq('level4_product_id', id);
          await supabase.from('level3_level4_relationships').insert({
            level3_product_id: updates.parentProductId,
            level4_product_id: id
          });
        }

        // Update options if provided
        if (updates.options) {
          await supabase.from('level4_configuration_options')
            .delete()
            .eq('level4_product_id', id);
          
          if (updates.options.length > 0) {
            const optionsToInsert = updates.options.map(option => ({
              level4_product_id: id,
              option_key: option.optionKey,
              option_value: option.optionValue,
              display_order: option.displayOrder,
              enabled: option.enabled
            }));
            await supabase.from('level4_configuration_options').insert(optionsToInsert);
          }
        }
      } catch (error) {
        console.error('Failed to update level4 product', error);
      }

      return this.level4Products[index];
    }
    return null;
  }

  async deleteLevel4Product(id: string): Promise<void> {
    this.level4Products = this.level4Products.filter(product => product.id !== id);
    this.saveData();

    try {
      // Delete configuration options first
      await supabase.from('level4_configuration_options').delete().eq('level4_product_id', id);
      // Delete relationships
      await supabase.from('level3_level4_relationships').delete().eq('level4_product_id', id);
      // Delete main product record
      await supabase.from('level4_products').delete().eq('id', id);
    } catch (error) {
      console.error('Failed to delete level4 product', error);
    }
  }

  isLevel4AvailableForLevel3(level4: Level4Product, level3: Level3Product): boolean {
    return level4.parentProductId === level3.id;
  }

  /**
   * Replace all existing product lists with freshly fetched data.
   * This is useful when synchronizing from a remote source.
   */
  replaceAllProducts(
    level1: Level1Product[],
    level2: Level2Product[],
    level3: Level3Product[],
    level4: Level4Product[]
  ) {
    this.level1Products = [...level1];
    this.level2Products = [...level2];
    this.level3Products = [...level3];
    this.level4Products = [...level4];
    this.saveData();
  }

  private initializeDefaultData() {
    // Initialize asset types if empty
    if (this.assetTypes.length === 0) {
      this.assetTypes = [...DEFAULT_ASSET_TYPES];
    }
    
    if (this.level1Products.length === 0) {
      this.level1Products = [...DEFAULT_LEVEL1_PRODUCTS];
    }

    if (this.level2Products.length === 0) {
      this.level2Products = [...DEFAULT_LEVEL2_PRODUCTS];
    }

    if (this.level3Products.length === 0) {
      this.level3Products = [...DEFAULT_LEVEL3_PRODUCTS];
    }

    if (this.analogSensorTypes.length === 0) {
      this.analogSensorTypes = [...DEFAULT_ANALOG_SENSORS];
    }

    if (this.bushingTapModels.length === 0) {
      this.bushingTapModels = [...DEFAULT_BUSHING_TAP_MODELS];
    }

    // Level 4 products start empty - they're created by admins
    this.saveData();
  }
}

export const productDataService = new ProductDataService();
