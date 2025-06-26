import { Level1Product, Level2Product, Level3Product, AssetType } from "@/types/product";
import {
  DEFAULT_ASSET_TYPES,
  DEFAULT_LEVEL1_PRODUCTS,
  DEFAULT_LEVEL2_PRODUCTS,
  DEFAULT_LEVEL3_PRODUCTS
} from "@/data/productDefaults";

class ProductDataService {
  private level1Products: Level1Product[] = [];
  private level2Products: Level2Product[] = [];
  private level3Products: Level3Product[] = [];
  private assetTypes: AssetType[] = [];

  constructor() {
    this.loadData();
  }

  private loadData() {
    const storedAssetTypes = localStorage.getItem('assetTypes');
    this.assetTypes = storedAssetTypes ? JSON.parse(storedAssetTypes) : [];

    const storedLevel1Products = localStorage.getItem('level1Products');
    this.level1Products = storedLevel1Products ? JSON.parse(storedLevel1Products) : [];

    const storedLevel2Products = localStorage.getItem('level2Products');
    this.level2Products = storedLevel2Products ? JSON.parse(storedLevel2Products) : [];

    const storedLevel3Products = localStorage.getItem('level3Products');
    this.level3Products = storedLevel3Products ? JSON.parse(storedLevel3Products) : [];

    this.initializeDefaultData();
  }

  private saveData() {
    localStorage.setItem('assetTypes', JSON.stringify(this.assetTypes));
    localStorage.setItem('level1Products', JSON.stringify(this.level1Products));
    localStorage.setItem('level2Products', JSON.stringify(this.level2Products));
    localStorage.setItem('level3Products', JSON.stringify(this.level3Products));
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

  // Level 1 Products methods
  getLevel1Products(): Level1Product[] {
    return this.level1Products;
  }

  createLevel1Product(product: Omit<Level1Product, 'id'>): Level1Product {
    const newProduct: Level1Product = {
      ...product,
      id: `level1-${Date.now()}`
    };
    this.level1Products.push(newProduct);
    this.saveData();
    return newProduct;
  }

  updateLevel1Product(id: string, updates: Partial<Omit<Level1Product, 'id'>>): Level1Product | null {
    const index = this.level1Products.findIndex(product => product.id === id);
    if (index !== -1) {
      this.level1Products[index] = { ...this.level1Products[index], ...updates };
      this.saveData();
      return this.level1Products[index];
    }
    return null;
  }

  deleteLevel1Product(id: string): void {
    this.level1Products = this.level1Products.filter(product => product.id !== id);
    this.saveData();
  }

  // Level 2 Products methods
  getLevel2Products(): Level2Product[] {
    return this.level2Products;
  }

  getLevel2ProductsForLevel1(level1ProductId: string): Level2Product[] {
    return this.level2Products.filter(product => product.parentProductId === level1ProductId);
  }

  createLevel2Product(product: Omit<Level2Product, 'id'>): Level2Product {
    const newProduct: Level2Product = {
      ...product,
      id: `level2-${Date.now()}`
    };
    this.level2Products.push(newProduct);
    this.saveData();
    return newProduct;
  }

  updateLevel2Product(id: string, updates: Partial<Omit<Level2Product, 'id'>>): Level2Product | null {
    const index = this.level2Products.findIndex(product => product.id === id);
    if (index !== -1) {
      this.level2Products[index] = { ...this.level2Products[index], ...updates };
      this.saveData();
      return this.level2Products[index];
    }
    return null;
  }

  deleteLevel2Product(id: string): void {
    this.level2Products = this.level2Products.filter(product => product.id !== id);
    this.saveData();
  }

  // Level 3 Products methods
  getLevel3Products(): Level3Product[] {
    return this.level3Products;
  }

  getLevel3ProductsForLevel2(level2ProductId: string): Level3Product[] {
    return this.level3Products.filter(product => product.parentProductId === level2ProductId);
  }

  createLevel3Product(product: Omit<Level3Product, 'id'>): Level3Product {
    const newProduct: Level3Product = {
      ...product,
      id: `level3-${Date.now()}`
    };
    this.level3Products.push(newProduct);
    this.saveData();
    return newProduct;
  }

  updateLevel3Product(id: string, updates: Partial<Omit<Level3Product, 'id'>>): Level3Product | null {
    const index = this.level3Products.findIndex(product => product.id === id);
    if (index !== -1) {
      this.level3Products[index] = { ...this.level3Products[index], ...updates };
      this.saveData();
      return this.level3Products[index];
    }
    return null;
  }

  deleteLevel3Product(id: string): void {
    this.level3Products = this.level3Products.filter(product => product.id !== id);
    this.saveData();
  }

  isLevel3AvailableForLevel2(level3: Level3Product, level2: Level2Product): boolean {
    return level3.parentProductId === level2.id;
  }

  /**
   * Replace all existing product lists with freshly fetched data.
   * This is useful when synchronizing from a remote source.
   */
  replaceAllProducts(
    level1: Level1Product[],
    level2: Level2Product[],
    level3: Level3Product[]
  ) {
    this.level1Products = [...level1];
    this.level2Products = [...level2];
    this.level3Products = [...level3];
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
    this.saveData();
  }
}

export const productDataService = new ProductDataService();
