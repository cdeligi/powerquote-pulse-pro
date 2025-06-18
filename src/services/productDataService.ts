
import { Level1Product, Level2Product, Level3Product, ProductTypeConfig } from "@/types/product";

const STORAGE_KEYS = {
  LEVEL1_PRODUCTS: 'level1Products',
  LEVEL2_PRODUCTS: 'level2Products', 
  LEVEL3_PRODUCTS: 'level3Products',
  PRODUCT_TYPES: 'productTypes'
};

// Default product types
const DEFAULT_TYPES: ProductTypeConfig[] = [
  { id: 'qtms', name: 'QTMS', level: 1, description: 'Qualitrol Transformer Monitoring System', enabled: true },
  { id: 'tm8', name: 'TM8', level: 1, description: 'Transformer Monitor 8-channel', enabled: true },
  { id: 'tm3', name: 'TM3', level: 1, description: 'Transformer Monitor 3-channel', enabled: true },
  { id: 'tm1', name: 'TM1', level: 1, description: 'Transformer Monitor Single Channel', enabled: true },
  { id: 'qpdm', name: 'QPDM', level: 1, description: 'Partial Discharge Monitor', enabled: true },
  { id: 'ltx', name: 'LTX', level: 2, description: 'Large Chassis', enabled: true },
  { id: 'mtx', name: 'MTX', level: 2, description: 'Medium Chassis', enabled: true },
  { id: 'stx', name: 'STX', level: 2, description: 'Small Chassis', enabled: true },
  { id: 'calgas', name: 'CalGas', level: 2, description: 'Calibration Gas System', enabled: true },
  { id: 'moisture', name: 'Moisture', level: 2, description: 'Moisture Sensor', enabled: true },
  { id: 'standard', name: 'Standard', level: 2, description: 'Standard Configuration', enabled: true },
  { id: 'relay', name: 'Relay', level: 3, description: 'Relay Protection Card', enabled: true },
  { id: 'analog', name: 'Analog', level: 3, description: 'Analog Input Card', enabled: true },
  { id: 'fiber', name: 'Fiber', level: 3, description: 'Fiber Communication Card', enabled: true },
  { id: 'display', name: 'Display', level: 3, description: 'Display Module', enabled: true },
  { id: 'bushing', name: 'Bushing', level: 3, description: 'Bushing Monitor', enabled: true },
  { id: 'accessory', name: 'Accessory', level: 3, description: 'General Accessory', enabled: true },
  { id: 'sensor', name: 'Sensor', level: 3, description: 'Sensor Component', enabled: true }
];

// Default products
const DEFAULT_LEVEL1_PRODUCTS: Level1Product[] = [
  {
    id: 'qtms-main',
    name: 'QTMS',
    category: 'Monitoring Systems',
    description: 'Qualitrol Transformer Monitoring System - Complete monitoring solution',
    price: 0,
    cost: 0,
    productInfoUrl: 'https://www.qualitrolcorp.com/products/qtms',
    enabled: true,
    partNumber: 'QTMS-BASE-001'
  },
  {
    id: 'tm8-dga',
    name: 'TM8',
    category: 'DGA Monitors',
    description: 'Dissolved Gas Analysis Monitor - Standalone DGA solution',
    price: 12500,
    cost: 6250,
    productInfoUrl: 'https://www.qualitrolcorp.com/products/tm8',
    enabled: true,
    partNumber: 'TM8-DGA-001'
  }
];

const DEFAULT_LEVEL2_PRODUCTS: Level2Product[] = [
  {
    id: 'ltx-chassis',
    name: 'LTX Chassis',
    parentProductId: 'qtms-main',
    type: 'LTX',
    description: 'Large capacity transformer monitoring chassis - 6U, 14 slots',
    price: 4200,
    cost: 2100,
    enabled: true,
    specifications: {
      height: '6U',
      slots: 14,
      capacity: 'Large'
    },
    partNumber: 'LTX-6U-14S'
  }
];

const DEFAULT_LEVEL3_PRODUCTS: Level3Product[] = [
  {
    id: 'relay-8in-2out',
    name: 'Relay Protection Card',
    parentProductId: 'ltx-chassis',
    type: 'relay',
    description: '8 digital inputs + 2 analog outputs for comprehensive protection',
    price: 2500,
    cost: 1250,
    enabled: true,
    specifications: {
      slotRequirement: 1,
      inputs: 8,
      outputs: 2,
      protocols: ['DNP3', 'IEC 61850']
    },
    partNumber: 'RPC-8I2O-001'
  }
];

class ProductDataService {
  // Product Types Management
  getProductTypes(): ProductTypeConfig[] {
    const stored = localStorage.getItem(STORAGE_KEYS.PRODUCT_TYPES);
    return stored ? JSON.parse(stored) : DEFAULT_TYPES;
  }

  saveProductTypes(types: ProductTypeConfig[]): void {
    localStorage.setItem(STORAGE_KEYS.PRODUCT_TYPES, JSON.stringify(types));
  }

  getAvailableTypesForLevel(level: 1 | 2 | 3): ProductTypeConfig[] {
    return this.getProductTypes().filter(type => type.level === level && type.enabled);
  }

  // Level 1 Products
  getLevel1Products(): Level1Product[] {
    const stored = localStorage.getItem(STORAGE_KEYS.LEVEL1_PRODUCTS);
    return stored ? JSON.parse(stored) : DEFAULT_LEVEL1_PRODUCTS;
  }

  saveLevel1Products(products: Level1Product[]): void {
    localStorage.setItem(STORAGE_KEYS.LEVEL1_PRODUCTS, JSON.stringify(products));
  }

  addLevel1Product(product: Level1Product): void {
    const products = this.getLevel1Products();
    products.push(product);
    this.saveLevel1Products(products);
  }

  updateLevel1Product(id: string, updatedProduct: Level1Product): void {
    const products = this.getLevel1Products();
    const index = products.findIndex(p => p.id === id);
    if (index !== -1) {
      products[index] = updatedProduct;
      this.saveLevel1Products(products);
    }
  }

  deleteLevel1Product(id: string): void {
    const products = this.getLevel1Products().filter(p => p.id !== id);
    this.saveLevel1Products(products);
  }

  // Level 2 Products
  getLevel2Products(): Level2Product[] {
    const stored = localStorage.getItem(STORAGE_KEYS.LEVEL2_PRODUCTS);
    return stored ? JSON.parse(stored) : DEFAULT_LEVEL2_PRODUCTS;
  }

  saveLevel2Products(products: Level2Product[]): void {
    localStorage.setItem(STORAGE_KEYS.LEVEL2_PRODUCTS, JSON.stringify(products));
  }

  addLevel2Product(product: Level2Product): void {
    const products = this.getLevel2Products();
    products.push(product);
    this.saveLevel2Products(products);
  }

  updateLevel2Product(id: string, updatedProduct: Level2Product): void {
    const products = this.getLevel2Products();
    const index = products.findIndex(p => p.id === id);
    if (index !== -1) {
      products[index] = updatedProduct;
      this.saveLevel2Products(products);
    }
  }

  deleteLevel2Product(id: string): void {
    const products = this.getLevel2Products().filter(p => p.id !== id);
    this.saveLevel2Products(products);
  }

  // Level 3 Products
  getLevel3Products(): Level3Product[] {
    const stored = localStorage.getItem(STORAGE_KEYS.LEVEL3_PRODUCTS);
    return stored ? JSON.parse(stored) : DEFAULT_LEVEL3_PRODUCTS;
  }

  saveLevel3Products(products: Level3Product[]): void {
    localStorage.setItem(STORAGE_KEYS.LEVEL3_PRODUCTS, JSON.stringify(products));
  }

  addLevel3Product(product: Level3Product): void {
    const products = this.getLevel3Products();
    products.push(product);
    this.saveLevel3Products(products);
  }

  updateLevel3Product(id: string, updatedProduct: Level3Product): void {
    const products = this.getLevel3Products();
    const index = products.findIndex(p => p.id === id);
    if (index !== -1) {
      products[index] = updatedProduct;
      this.saveLevel3Products(products);
    }
  }

  deleteLevel3Product(id: string): void {
    const products = this.getLevel3Products().filter(p => p.id !== id);
    this.saveLevel3Products(products);
  }

  // Utility methods
  getLevel2ProductsForLevel1(level1Id: string): Level2Product[] {
    return this.getLevel2Products().filter(p => p.parentProductId === level1Id);
  }

  getLevel3ProductsForLevel2(level2Id: string): Level3Product[] {
    return this.getLevel3Products().filter(p => p.parentProductId === level2Id);
  }

  // Export/Import functionality
  exportAllData() {
    return {
      level1Products: this.getLevel1Products(),
      level2Products: this.getLevel2Products(),
      level3Products: this.getLevel3Products(),
      productTypes: this.getProductTypes(),
      exportDate: new Date().toISOString()
    };
  }

  importAllData(data: any) {
    if (data.level1Products) this.saveLevel1Products(data.level1Products);
    if (data.level2Products) this.saveLevel2Products(data.level2Products);
    if (data.level3Products) this.saveLevel3Products(data.level3Products);
    if (data.productTypes) this.saveProductTypes(data.productTypes);
  }
}

export const productDataService = new ProductDataService();
