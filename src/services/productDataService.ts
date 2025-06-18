import { Level1Product, Level2Product, Level3Product, ProductTypeConfig } from "@/types/product";

const STORAGE_KEYS = {
  LEVEL1_PRODUCTS: 'level1Products',
  LEVEL2_PRODUCTS: 'level2Products', 
  LEVEL3_PRODUCTS: 'level3Products',
  PRODUCT_TYPES: 'productTypes'
};

// Default product types
const DEFAULT_TYPES: ProductTypeConfig[] = [
  { id: 'power-transformer', name: 'Power Transformer', level: 1, description: 'Power Transformer Assets', enabled: true },
  { id: 'gas-insulated-switchgear', name: 'Gas Insulated Switchgear', level: 1, description: 'GIS Assets', enabled: true },
  { id: 'breakers', name: 'Breakers', level: 1, description: 'Circuit Breaker Assets', enabled: true }
];

// Updated Level 1 products with proper structure
const DEFAULT_LEVEL1_PRODUCTS: Level1Product[] = [
  {
    id: 'qtms',
    name: 'QTMS',
    type: 'Power Transformer',
    category: 'Monitoring Systems',
    description: 'Qualitrol Transformer Monitoring System - Complete monitoring solution',
    price: 0,
    cost: 0,
    productInfoUrl: 'https://www.qualitrolcorp.com/products/qtms',
    enabled: true,
    partNumber: 'QTMS-BASE-001'
  },
  {
    id: 'tm8',
    name: 'TM8',
    type: 'Power Transformer',
    category: 'DGA Monitors',
    description: 'Dissolved Gas Analysis Monitor - 8 Channel',
    price: 12500,
    cost: 6250,
    productInfoUrl: 'https://www.qualitrolcorp.com/products/tm8',
    enabled: true,
    partNumber: 'TM8-DGA-001'
  },
  {
    id: 'tm3',
    name: 'TM3',
    type: 'Power Transformer',
    category: 'DGA Monitors',
    description: 'Dissolved Gas Analysis Monitor - 3 Channel',
    price: 8500,
    cost: 4250,
    productInfoUrl: 'https://www.qualitrolcorp.com/products/tm3',
    enabled: true,
    partNumber: 'TM3-DGA-001'
  },
  {
    id: 'tm1',
    name: 'TM1',
    type: 'Power Transformer',
    category: 'DGA Monitors',
    description: 'Dissolved Gas Analysis Monitor - Single Channel',
    price: 5500,
    cost: 2750,
    productInfoUrl: 'https://www.qualitrolcorp.com/products/tm1',
    enabled: true,
    partNumber: 'TM1-DGA-001'
  },
  {
    id: 'qpdm',
    name: 'QPDM',
    type: 'Power Transformer',
    category: 'Partial Discharge Monitors',
    description: 'Qualitrol Partial Discharge Monitor',
    price: 15000,
    cost: 7500,
    productInfoUrl: 'https://www.qualitrolcorp.com/products/qpdm',
    enabled: true,
    partNumber: 'QPDM-001'
  }
];

// Updated Level 2 products with proper parent relationships
const DEFAULT_LEVEL2_PRODUCTS: Level2Product[] = [
  // QTMS variants
  {
    id: 'ltx-qtms',
    name: 'LTX',
    parentProductId: 'qtms',
    type: 'QTMS',
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
  },
  {
    id: 'mtx-qtms',
    name: 'MTX',
    parentProductId: 'qtms',
    type: 'QTMS',
    description: 'Medium capacity transformer monitoring chassis - 3U, 7 slots',
    price: 3200,
    cost: 1600,
    enabled: true,
    specifications: {
      height: '3U',
      slots: 7,
      capacity: 'Medium'
    },
    partNumber: 'MTX-3U-7S'
  },
  {
    id: 'stx-qtms',
    name: 'STX',
    parentProductId: 'qtms',
    type: 'QTMS',
    description: 'Small capacity transformer monitoring chassis - 1.5U, 4 slots',
    price: 2400,
    cost: 1200,
    enabled: true,
    specifications: {
      height: '1.5U',
      slots: 4,
      capacity: 'Small'
    },
    partNumber: 'STX-1.5U-4S'
  },
  // TM8 variants
  {
    id: 'calgas-tm8',
    name: 'CalGas',
    parentProductId: 'tm8',
    type: 'TM8',
    description: 'Calibration Gas System for TM8 DGA Monitor',
    price: 2500,
    cost: 1250,
    enabled: true,
    specifications: {
      gasType: 'Mixed Calibration Gas',
      capacity: 'Standard'
    },
    partNumber: 'TM8-CALGAS-001'
  },
  {
    id: 'helium-bottle-tm8',
    name: 'Helium Bottle',
    parentProductId: 'tm8',
    type: 'TM8',
    description: 'Helium Gas Bottle for TM8 System',
    price: 800,
    cost: 400,
    enabled: true,
    specifications: {
      gasType: 'Helium',
      volume: '5L'
    },
    partNumber: 'TM8-HE-BOTTLE-001'
  },
  // TM3 variants
  {
    id: 'calgas-tm3',
    name: 'CalGas',
    parentProductId: 'tm3',
    type: 'TM3',
    description: 'Calibration Gas System for TM3 DGA Monitor',
    price: 2200,
    cost: 1100,
    enabled: true,
    specifications: {
      gasType: 'Mixed Calibration Gas',
      capacity: 'Compact'
    },
    partNumber: 'TM3-CALGAS-001'
  },
  {
    id: 'helium-bottle-calgas-tm3',
    name: 'Helium Bottle/CalGas',
    parentProductId: 'tm3',
    type: 'TM3',
    description: 'Combined Helium Bottle and CalGas System for TM3',
    price: 2800,
    cost: 1400,
    enabled: true,
    specifications: {
      gasType: 'Helium + CalGas',
      configuration: 'Combined'
    },
    partNumber: 'TM3-HE-CALGAS-001'
  },
  // TM1 variants
  {
    id: '4-20ma-bridge-tm1',
    name: '4-20mA Bridge',
    parentProductId: 'tm1',
    type: 'TM1',
    description: '4-20mA Analog Output Bridge for TM1',
    price: 650,
    cost: 325,
    enabled: true,
    specifications: {
      outputType: '4-20mA',
      channels: 1
    },
    partNumber: 'TM1-4-20MA-001'
  },
  // QPDM variants
  {
    id: 'ic43-qpdm',
    name: 'IC43',
    parentProductId: 'qpdm',
    type: 'QPDM',
    description: 'IC43 Interface Card for QPDM',
    price: 1800,
    cost: 900,
    enabled: true,
    specifications: {
      cardType: 'Interface',
      model: 'IC43'
    },
    partNumber: 'QPDM-IC43-001'
  },
  {
    id: 'ic44-qpdm',
    name: 'IC44',
    parentProductId: 'qpdm',
    type: 'QPDM',
    description: 'IC44 Interface Card for QPDM',
    price: 2100,
    cost: 1050,
    enabled: true,
    specifications: {
      cardType: 'Interface',
      model: 'IC44'
    },
    partNumber: 'QPDM-IC44-001'
  },
  {
    id: 'drain-sensor-dn50-qpdm',
    name: 'Drain Type Sensor DN50',
    parentProductId: 'qpdm',
    type: 'QPDM',
    description: 'Drain Type Sensor DN50 for QPDM',
    price: 3200,
    cost: 1600,
    enabled: true,
    specifications: {
      sensorType: 'Drain',
      diameter: 'DN50'
    },
    partNumber: 'QPDM-DRAIN-DN50-001'
  },
  {
    id: 'drain-sensor-dn25-qpdm',
    name: 'Drain Type Sensor DN25',
    parentProductId: 'qpdm',
    type: 'QPDM',
    description: 'Drain Type Sensor DN25 for QPDM',
    price: 2800,
    cost: 1400,
    enabled: true,
    specifications: {
      sensorType: 'Drain',
      diameter: 'DN25'
    },
    partNumber: 'QPDM-DRAIN-DN25-001'
  }
];

// Default Level 3 products - keeping existing structure for cards/components
const DEFAULT_LEVEL3_PRODUCTS: Level3Product[] = [
  {
    id: 'relay-8in-2out',
    name: 'Relay Protection Card',
    parentProductId: 'ltx-qtms',
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
