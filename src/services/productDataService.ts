
import { Level1Product, Level2Product, Level3Product, AssetType } from "@/types/product";

const DEFAULT_ASSET_TYPES = [
  { id: 'power-transformer', name: 'Power Transformer', enabled: true },
  { id: 'gas-insulated-switchgear', name: 'Gas Insulated Switchgear', enabled: true },
  { id: 'breaker', name: 'Breaker', enabled: true }
];

const DEFAULT_LEVEL1_PRODUCTS: Level1Product[] = [
  {
    id: 'qtms',
    name: 'QTMS',
    type: 'Monitoring Systems',
    category: 'Monitoring Systems',
    description: 'The Qualitrol Transformer Monitoring System (QTMS) is a modular, multi-function system used to monitor critical parameters on power transformers.',
    price: 10000,
    cost: 7000,
    productInfoUrl: 'https://qualitrolcorp.com/products/qualitrol-qtms-transformer-monitoring-system/',
    enabled: true,
    partNumber: 'QTMS-1000',
    image: 'https://qualitrolcorp.com/wp-content/uploads/2024/01/QTMS_Main_Image.png'
  },
  {
    id: 'dga',
    name: 'DGA',
    type: 'Monitoring Systems',
    category: 'DGA Monitors',
    description: 'Dissolved Gas Analysis (DGA) monitors provide continuous, online monitoring of key gases dissolved in transformer oil, enabling early detection of developing faults.',
    price: 8000,
    cost: 5000,
    productInfoUrl: 'https://qualitrolcorp.com/products/dga-dissolved-gas-analysis/',
    enabled: true,
    partNumber: 'DGA-1000',
    image: 'https://qualitrolcorp.com/wp-content/uploads/2024/01/DGA_Monitor.png'
  },
  {
    id: 'partial-discharge',
    name: 'Partial Discharge',
    type: 'Monitoring Systems',
    category: 'PD Monitors',
    description: 'Partial Discharge (PD) monitors detect and measure the presence of PD activity within transformers, providing valuable insights into insulation condition and potential defects.',
    price: 12000,
    cost: 9000,
    productInfoUrl: 'https://qualitrolcorp.com/products/partial-discharge-monitoring/',
    enabled: true,
    partNumber: 'PD-1000',
    image: 'https://qualitrolcorp.com/wp-content/uploads/2024/01/Partial_Discharge_Monitor.png'
  }
];

const DEFAULT_LEVEL2_PRODUCTS: Level2Product[] = [
  // QTMS Chassis Variants
  {
    id: 'qtms-ltx-chassis',
    name: 'QTMS LTX Chassis',
    parentProductId: 'qtms',
    type: 'LTX',
    description: 'High-density 15-slot chassis for QTMS system. Supports up to 14 cards in 2-row configuration.',
    price: 5000,
    cost: 3500,
    enabled: true,
    partNumber: 'QTMS-LTX-CHASSIS',
    specifications: {
      height: '7U',
      slots: 15,
      maxCards: 14,
      layout: '2-row (slots 0-7 bottom, 8-14 top)',
      powerSupply: 'Redundant AC/DC',
      mounting: 'Rackmount'
    }
  },
  {
    id: 'qtms-mtx-chassis',
    name: 'QTMS MTX Chassis',
    parentProductId: 'qtms',
    type: 'MTX',
    description: 'Mid-range 8-slot chassis for QTMS system. Single-row configuration with 7 card slots.',
    price: 3500,
    cost: 2500,
    enabled: true,
    partNumber: 'QTMS-MTX-CHASSIS',
    specifications: {
      height: '4U',
      slots: 8,
      maxCards: 7,
      layout: 'Single-row (slots 0-7)',
      powerSupply: 'Single AC/DC',
      mounting: 'Rackmount'
    }
  },
  {
    id: 'qtms-stx-chassis',
    name: 'QTMS STX Chassis',
    parentProductId: 'qtms',
    type: 'STX',
    description: 'Compact 5-slot chassis for QTMS system. Single-row configuration with 4 card slots.',
    price: 2500,
    cost: 1800,
    enabled: true,
    partNumber: 'QTMS-STX-CHASSIS',
    specifications: {
      height: '2U',
      slots: 5,
      maxCards: 4,
      layout: 'Single-row (slots 0-4)',
      powerSupply: 'Single DC',
      mounting: 'Rackmount/DIN Rail'
    }
  },
  // DGA Products
  {
    id: 'dga-9-plus',
    name: 'DGA 9 Plus',
    parentProductId: 'dga',
    type: 'Monitor',
    description: '9-gas online DGA monitor with advanced features',
    price: 15000,
    cost: 11000,
    enabled: true,
    partNumber: 'DGA9+-001',
    specifications: {
      gases: ['H2', 'O2', 'N2', 'CO', 'CO2', 'CH4', 'C2H2', 'C2H4', 'C2H6'],
      oilType: 'Mineral',
      communication: ['Ethernet', 'Modbus']
    }
  },
  {
    id: 'dga-5-pro',
    name: 'DGA 5 Pro',
    parentProductId: 'dga',
    type: 'Monitor',
    description: '5-gas online DGA monitor for essential monitoring',
    price: 12000,
    cost: 9000,
    enabled: true,
    partNumber: 'DGA5-PRO-001',
    specifications: {
      gases: ['H2', 'CO', 'CO2', 'CH4', 'C2H2'],
      oilType: 'Mineral',
      communication: ['Ethernet']
    }
  },
  // PD Products
  {
    id: 'pd-guard-pro',
    name: 'PD-Guard Pro',
    parentProductId: 'partial-discharge',
    type: 'Monitor',
    description: 'Advanced online partial discharge monitoring system',
    price: 18000,
    cost: 14000,
    enabled: true,
    partNumber: 'PD-G-PRO-001',
    specifications: {
      sensors: 6,
      frequencyRange: '300 kHz - 3 MHz',
      communication: ['Fiber Optic', 'Ethernet']
    }
  },
  {
    id: 'pd-sense-basic',
    name: 'PD-Sense Basic',
    parentProductId: 'partial-discharge',
    type: 'Monitor',
    description: 'Basic online partial discharge detection system',
    price: 15000,
    cost: 11000,
    enabled: true,
    partNumber: 'PD-S-BASIC-001',
    specifications: {
      sensors: 3,
      frequencyRange: '500 kHz - 2 MHz',
      communication: ['Ethernet']
    }
  }
];

const DEFAULT_LEVEL3_PRODUCTS: Level3Product[] = [
  // Relay Cards - Compatible with all QTMS chassis
  {
    id: 'relay-card-8ch',
    name: '8-Channel Relay Card',
    parentProductId: 'qtms-ltx-chassis',
    type: 'Relay',
    description: '8-channel relay output card for alarm and control functions',
    price: 800,
    cost: 600,
    enabled: true,
    partNumber: 'QTMS-RELAY-8CH',
    specifications: {
      channels: 8,
      voltage: '24V DC',
      current: '2A per channel',
      slotRequirement: 1,
      compatibleChassis: ['LTX', 'MTX', 'STX']
    }
  },
  {
    id: 'relay-card-16ch',
    name: '16-Channel Relay Card',
    parentProductId: 'qtms-ltx-chassis',
    type: 'Relay',
    description: '16-channel relay output card for extensive alarm and control',
    price: 1200,
    cost: 900,
    enabled: true,
    partNumber: 'QTMS-RELAY-16CH',
    specifications: {
      channels: 16,
      voltage: '24V DC',
      current: '2A per channel',
      slotRequirement: 2,
      compatibleChassis: ['LTX', 'MTX']
    }
  },
  // Analog Input Cards
  {
    id: 'analog-input-4ch',
    name: '4-Channel Analog Input Card',
    parentProductId: 'qtms-ltx-chassis',
    type: 'Analog',
    description: '4-channel analog input card for temperature and pressure sensors',
    price: 700,
    cost: 500,
    enabled: true,
    partNumber: 'QTMS-ANALOG-4CH',
    specifications: {
      channels: 4,
      inputRange: '0-10V / 4-20mA',
      resolution: '16-bit',
      sensorTypes: ['Temperature', 'Pressure', 'Flow', 'Level'],
      slotRequirement: 1,
      compatibleChassis: ['LTX', 'MTX', 'STX']
    }
  },
  {
    id: 'analog-input-8ch',
    name: '8-Channel Analog Input Card',
    parentProductId: 'qtms-ltx-chassis',
    type: 'Analog',
    description: '8-channel analog input card for multiple sensor monitoring',
    price: 1100,
    cost: 800,
    enabled: true,
    partNumber: 'QTMS-ANALOG-8CH',
    specifications: {
      channels: 8,
      inputRange: '0-10V / 4-20mA',
      resolution: '16-bit',
      sensorTypes: ['Temperature', 'Pressure', 'Flow', 'Level'],
      slotRequirement: 1,
      compatibleChassis: ['LTX', 'MTX', 'STX']
    }
  },
  // Fiber Optic Cards
  {
    id: 'fiber-optic-single',
    name: 'Single-Mode Fiber Optic Card',
    parentProductId: 'qtms-ltx-chassis',
    type: 'Fiber',
    description: 'Single-mode fiber optic communication card for long-distance connectivity',
    price: 1200,
    cost: 900,
    enabled: true,
    partNumber: 'QTMS-FIBER-SM',
    specifications: {
      mode: 'Single-mode',
      wavelength: '1310/1550 nm',
      distance: '40 km',
      connectorType: 'LC',
      ports: 2,
      slotRequirement: 1,
      compatibleChassis: ['LTX', 'MTX', 'STX']
    }
  },
  {
    id: 'fiber-optic-multi',
    name: 'Multi-Mode Fiber Optic Card',
    parentProductId: 'qtms-ltx-chassis',
    type: 'Fiber',
    description: 'Multi-mode fiber optic communication card for short-distance connectivity',
    price: 900,
    cost: 650,
    enabled: true,
    partNumber: 'QTMS-FIBER-MM',
    specifications: {
      mode: 'Multi-mode',
      wavelength: '850/1300 nm',
      distance: '2 km',
      connectorType: 'SC',
      ports: 2,
      slotRequirement: 1,
      compatibleChassis: ['LTX', 'MTX', 'STX']
    }
  },
  // Display Cards
  {
    id: 'display-touchscreen-7inch',
    name: '7-inch Touchscreen Display',
    parentProductId: 'qtms-ltx-chassis',
    type: 'Display',
    description: '7-inch color touchscreen display for local system interface',
    price: 1500,
    cost: 1100,
    enabled: true,
    partNumber: 'QTMS-DISPLAY-7T',
    specifications: {
      size: '7 inch',
      resolution: '1024x600',
      touchType: 'Capacitive',
      colors: '16.7M',
      slotRequirement: 2,
      compatibleChassis: ['LTX', 'MTX']
    }
  },
  {
    id: 'display-lcd-4inch',
    name: '4-inch LCD Display',
    parentProductId: 'qtms-ltx-chassis',
    type: 'Display',
    description: '4-inch LCD display with button interface for basic local access',
    price: 800,
    cost: 600,
    enabled: true,
    partNumber: 'QTMS-DISPLAY-4L',
    specifications: {
      size: '4 inch',
      resolution: '480x320',
      touchType: 'Button Interface',
      colors: 'Monochrome',
      slotRequirement: 1,
      compatibleChassis: ['LTX', 'MTX', 'STX']
    }
  },
  // Digital Input Cards
  {
    id: 'digital-input-16ch',
    name: '16-Channel Digital Input Card',
    parentProductId: 'qtms-ltx-chassis',
    type: 'Digital',
    description: '16-channel digital input card for dry contact monitoring',
    price: 600,
    cost: 400,
    enabled: true,
    partNumber: 'QTMS-DIGITAL-16CH',
    specifications: {
      channels: 16,
      voltage: '24V DC',
      inputType: 'Dry Contact / Wet Contact',
      isolation: 'Optically Isolated',
      slotRequirement: 1,
      compatibleChassis: ['LTX', 'MTX', 'STX']
    }
  },
  // Communication Cards
  {
    id: 'iec61850-comm-card',
    name: 'IEC 61850 Communication Card',
    parentProductId: 'qtms-ltx-chassis',
    type: 'Communication',
    description: 'IEC 61850 communication card for substation integration',
    price: 1800,
    cost: 1300,
    enabled: true,
    partNumber: 'QTMS-IEC61850',
    specifications: {
      protocol: 'IEC 61850',
      ports: 2,
      connectorType: 'RJ45',
      dataRate: '100 Mbps',
      slotRequirement: 1,
      compatibleChassis: ['LTX', 'MTX', 'STX']
    }
  },
  {
    id: 'modbus-comm-card',
    name: 'Modbus Communication Card',
    parentProductId: 'qtms-ltx-chassis',
    type: 'Communication',
    description: 'Modbus RTU/TCP communication card for SCADA integration',
    price: 900,
    cost: 650,
    enabled: true,
    partNumber: 'QTMS-MODBUS',
    specifications: {
      protocol: 'Modbus RTU/TCP',
      ports: 4,
      connectorType: 'RJ45/Terminal Block',
      dataRate: '115.2 kbps / 100 Mbps',
      slotRequirement: 1,
      compatibleChassis: ['LTX', 'MTX', 'STX']
    }
  },
  // Bushing Monitoring Cards
  {
    id: 'bushing-monitor-6ch',
    name: '6-Channel Bushing Monitor Card',
    parentProductId: 'qtms-ltx-chassis',
    type: 'Bushing',
    description: '6-channel bushing monitoring card for power factor and capacitance measurement',
    price: 2200,
    cost: 1600,
    enabled: true,
    partNumber: 'QTMS-BUSHING-6CH',
    specifications: {
      channels: 6,
      measurements: ['Power Factor', 'Capacitance', 'Temperature'],
      frequency: '50/60 Hz',
      accuracy: '±0.1%',
      slotRequirement: 2,
      compatibleChassis: ['LTX', 'MTX']
    }
  }
];

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

  // Enhanced compatibility checking for QTMS cards
  isLevel3AvailableForLevel2(level3: Level3Product, level2: Level2Product): boolean {
    // Direct parent-child relationship
    if (level3.parentProductId === level2.id) {
      return true;
    }

    // Special logic for QTMS chassis compatibility
    if (level2.parentProductId === 'qtms' && level3.specifications?.compatibleChassis) {
      const chassisType = level2.type; // LTX, MTX, or STX
      return level3.specifications.compatibleChassis.includes(chassisType);
    }

    return false;
  }

  // Helper method to get chassis slot configuration
  getChassisSlotConfiguration(chassisId: string) {
    const chassis = this.level2Products.find(p => p.id === chassisId);
    if (!chassis || chassis.parentProductId !== 'qtms') {
      return null;
    }

    const config = {
      'LTX': { 
        totalSlots: 15, 
        usableSlots: 14, 
        layout: 'Two-row: Bottom (0-7), Top (8-14)',
        slotNumbers: Array.from({length: 15}, (_, i) => i)
      },
      'MTX': { 
        totalSlots: 8, 
        usableSlots: 7, 
        layout: 'Single-row: (0-7)',
        slotNumbers: Array.from({length: 8}, (_, i) => i)
      },
      'STX': { 
        totalSlots: 5, 
        usableSlots: 4, 
        layout: 'Single-row: (0-4)',
        slotNumbers: Array.from({length: 5}, (_, i) => i)
      }
    };

    return config[chassis.type as keyof typeof config] || null;
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
