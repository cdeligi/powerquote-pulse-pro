import { Level1Product, Level2Product, Level3Product, ProductTypeConfig } from "@/types/product";

const STORAGE_KEYS = {
  LEVEL1_PRODUCTS: 'level1Products',
  LEVEL2_PRODUCTS: 'level2Products', 
  LEVEL3_PRODUCTS: 'level3Products',
  PRODUCT_TYPES: 'productTypes',
  ASSET_TYPES: 'assetTypes'
};

// Level 0 Asset Types (Power Assets grouping)
const DEFAULT_ASSET_TYPES = [
  { id: 'power-transformer', name: 'Power Transformer', enabled: true },
  { id: 'gas-insulated-switchgear', name: 'Gas Insulated Switchgear', enabled: true },
  { id: 'breakers', name: 'Breakers', enabled: true }
];

// Updated Level 1 products with corrected hierarchy
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
    id: 'dga',
    name: 'DGA',
    type: 'Power Transformer',
    category: 'DGA Monitors',
    description: 'Dissolved Gas Analysis Monitors',
    price: 0,
    cost: 0,
    enabled: true,
    partNumber: 'DGA-BASE-001'
  },
  {
    id: 'partial-discharge',
    name: 'Partial Discharge',
    type: 'Power Transformer',
    category: 'Partial Discharge Monitors',
    description: 'Partial Discharge Monitoring Systems',
    price: 0,
    cost: 0,
    enabled: true,
    partNumber: 'PD-BASE-001'
  }
];

// Updated Level 2 products with corrected parent relationships
const DEFAULT_LEVEL2_PRODUCTS: Level2Product[] = [
  // QTMS Level 2 products
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
  // DGA Level 2 products
  {
    id: 'tm8',
    name: 'TM8',
    parentProductId: 'dga',
    type: 'DGA',
    description: 'Dissolved Gas Analysis Monitor - 8 Channel',
    price: 12500,
    cost: 6250,
    enabled: true,
    specifications: {
      channels: 8,
      gasTypes: ['H2', 'CH4', 'C2H2', 'C2H4', 'C2H6', 'CO', 'CO2', 'O2']
    },
    partNumber: 'TM8-DGA-001'
  },
  {
    id: 'tm3',
    name: 'TM3',
    parentProductId: 'dga',
    type: 'DGA',
    description: 'Dissolved Gas Analysis Monitor - 3 Channel',
    price: 8500,
    cost: 4250,
    enabled: true,
    specifications: {
      channels: 3,
      gasTypes: ['H2', 'CH4', 'C2H2']
    },
    partNumber: 'TM3-DGA-001'
  },
  {
    id: 'tm1',
    name: 'TM1',
    parentProductId: 'dga',
    type: 'DGA',
    description: 'Dissolved Gas Analysis Monitor - Single Channel',
    price: 5500,
    cost: 2750,
    enabled: true,
    specifications: {
      channels: 1,
      gasTypes: ['H2']
    },
    partNumber: 'TM1-DGA-001'
  },
  // Partial Discharge Level 2 products
  {
    id: 'qpdm',
    name: 'QPDM',
    parentProductId: 'partial-discharge',
    type: 'Partial Discharge',
    description: 'Qualitrol Partial Discharge Monitor',
    price: 15000,
    cost: 7500,
    enabled: true,
    specifications: {
      sensitivity: 'High',
      channels: 'Multi-channel'
    },
    partNumber: 'QPDM-001'
  }
];

// Updated Level 3 products with corrected relationships
const DEFAULT_LEVEL3_PRODUCTS: Level3Product[] = [
  // QTMS Cards - available for all QTMS Level 2 products (LTX, MTX, STX)
  {
    id: 'relay-card',
    name: 'Relay Card',
    parentProductId: 'qtms', // Parent is Level 1 QTMS, so available for all QTMS L2s
    type: 'QTMS',
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
  },
  {
    id: 'analog-card',
    name: 'Analog Card',
    parentProductId: 'qtms',
    type: 'QTMS',
    description: '8-channel analog input with configurable input types',
    price: 1800,
    cost: 900,
    enabled: true,
    specifications: {
      slotRequirement: 1,
      channels: 8,
      inputTypes: ['4-20mA', 'CT', 'RTD', 'Thermocouple']
    },
    partNumber: 'AIC-8CH-001'
  },
  {
    id: 'fiber-4-card',
    name: 'Fiber Card 4 Inputs',
    parentProductId: 'qtms',
    type: 'QTMS',
    description: '4-port fiber optic communication card',
    price: 3200,
    cost: 1600,
    enabled: true,
    specifications: {
      slotRequirement: 1,
      ports: 4,
      protocols: ['IEC 61850', 'GOOSE']
    },
    partNumber: 'FOC-4P-001'
  },
  {
    id: 'fiber-6-card',
    name: 'Fiber Card 6 Inputs',
    parentProductId: 'qtms',
    type: 'QTMS',
    description: '6-port fiber optic communication card',
    price: 4200,
    cost: 2100,
    enabled: true,
    specifications: {
      slotRequirement: 1,
      ports: 6,
      protocols: ['IEC 61850', 'GOOSE']
    },
    partNumber: 'FOC-6P-001'
  },
  {
    id: 'fiber-8-card',
    name: 'Fiber Card 8 Inputs',
    parentProductId: 'qtms',
    type: 'QTMS',
    description: '8-port fiber optic communication card',
    price: 5200,
    cost: 2600,
    enabled: true,
    specifications: {
      slotRequirement: 1,
      ports: 8,
      protocols: ['IEC 61850', 'GOOSE']
    },
    partNumber: 'FOC-8P-001'
  },
  {
    id: 'display-card',
    name: 'Display Card',
    parentProductId: 'qtms',
    type: 'QTMS',
    description: 'Integrated display module for local monitoring',
    price: 1200,
    cost: 600,
    enabled: true,
    specifications: {
      slotRequirement: 1,
      type: 'LCD',
      size: '3.5"',
      resolution: '320x240'
    },
    partNumber: 'DCM-LCD-001'
  },
  {
    id: 'remote-display',
    name: 'Remote Display',
    parentProductId: 'qtms',
    type: 'QTMS',
    description: 'Remote display unit for external monitoring',
    price: 1800,
    cost: 900,
    enabled: true,
    specifications: {
      slotRequirement: 1,
      type: 'Remote LCD',
      size: '7"',
      connection: 'Ethernet'
    },
    partNumber: 'RDM-LCD-001'
  },
  {
    id: 'digital-card',
    name: 'Digital Card',
    parentProductId: 'qtms',
    type: 'QTMS',
    description: 'Digital I/O card for control and monitoring',
    price: 1500,
    cost: 750,
    enabled: true,
    specifications: {
      slotRequirement: 1,
      digitalInputs: 16,
      digitalOutputs: 8
    },
    partNumber: 'DIO-16I8O-001'
  },
  // DGA Level 3 products
  {
    id: 'calgas-tm8-tm3',
    name: 'CalGas',
    parentProductId: 'tm8',
    type: 'DGA',
    description: 'Calibration Gas System for TM8 & TM3 DGA Monitors',
    price: 2500,
    cost: 1250,
    enabled: true,
    specifications: {
      gasType: 'Mixed Calibration Gas',
      compatibility: ['TM8', 'TM3']
    },
    partNumber: 'DGA-CALGAS-001'
  },
  {
    id: 'helium-bottle-tm8-tm3',
    name: 'Helium Bottle',
    parentProductId: 'tm8',
    type: 'DGA',
    description: 'Helium Gas Bottle for TM8 & TM3 Systems',
    price: 800,
    cost: 400,
    enabled: true,
    specifications: {
      gasType: 'Helium',
      volume: '5L',
      compatibility: ['TM8', 'TM3']
    },
    partNumber: 'DGA-HE-BOTTLE-001'
  },
  {
    id: '4-20ma-bridge-tm1',
    name: '4-20mA Bridge',
    parentProductId: 'tm1',
    type: 'DGA',
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
  // Partial Discharge Level 3 products
  {
    id: 'ic43-qpdm',
    name: 'IC43',
    parentProductId: 'qpdm',
    type: 'Partial Discharge',
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
    type: 'Partial Discharge',
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
    type: 'Partial Discharge',
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
    type: 'Partial Discharge',
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

class ProductDataService {
  // Asset Types Management (Level 0)
  getAssetTypes() {
    const stored = localStorage.getItem(STORAGE_KEYS.ASSET_TYPES);
    return stored ? JSON.parse(stored) : DEFAULT_ASSET_TYPES;
  }

  saveAssetTypes(types: any[]): void {
    localStorage.setItem(STORAGE_KEYS.ASSET_TYPES, JSON.stringify(types));
  }

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

  // Special method for QTMS cards - available for all QTMS Level 2 products
  getLevel3ProductsForQTMS(): Level3Product[] {
    return this.getLevel3Products().filter(p => p.parentProductId === 'qtms');
  }

  // Check if Level 3 product is available for a specific Level 2 product
  isLevel3AvailableForLevel2(level3Product: Level3Product, level2Product: Level2Product): boolean {
    // If Level 3 parent is Level 1 QTMS and Level 2 is QTMS type, it's available
    if (level3Product.parentProductId === 'qtms' && level2Product.type === 'QTMS') {
      return true;
    }
    // For DGA products that work with multiple Level 2s
    if (level3Product.specifications?.compatibility?.includes(level2Product.name)) {
      return true;
    }
    // Standard parent-child relationship
    return level3Product.parentProductId === level2Product.id;
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
