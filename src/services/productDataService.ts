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
  },
  {
    id: 'qpdm',
    name: 'QPDM',
    type: 'PD Couplers',
    category: 'PD Couplers',
    description: 'Qualitrol Partial Discharge Monitoring couplers for continuous online monitoring of partial discharge activity.',
    price: 5000,
    cost: 3500,
    productInfoUrl: 'https://qualitrolcorp.com/products/qpdm/',
    enabled: true,
    partNumber: 'QPDM-1000',
    hasQuantitySelection: true
  },
  {
    id: 'tm8',
    name: 'TM8',
    type: 'Temperature Monitoring',
    category: 'Temperature Monitors',
    description: 'Eight channel temperature monitoring system for transformer winding and oil temperature monitoring.',
    price: 6000,
    cost: 4200,
    productInfoUrl: 'https://qualitrolcorp.com/products/tm8/',
    enabled: true,
    partNumber: 'TM8-1000'
  },
  {
    id: 'tm3',
    name: 'TM3',
    type: 'Temperature Monitoring',
    category: 'Temperature Monitors',
    description: 'Three channel temperature monitoring system for basic transformer temperature monitoring.',
    price: 3500,
    cost: 2450,
    productInfoUrl: 'https://qualitrolcorp.com/products/tm3/',
    enabled: true,
    partNumber: 'TM3-1000'
  },
  {
    id: 'tm1',
    name: 'TM1',
    type: 'Temperature Monitoring',
    category: 'Temperature Monitors',
    description: 'Single channel temperature monitoring system for basic oil temperature monitoring.',
    price: 2000,
    cost: 1400,
    productInfoUrl: 'https://qualitrolcorp.com/products/tm1/',
    enabled: true,
    partNumber: 'TM1-1000'
  }
];

const DEFAULT_LEVEL2_PRODUCTS: Level2Product[] = [
  // QTMS Chassis Variants - Fixed slot counts
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
    type: 'Standard',
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
    type: 'Standard',
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
  {
    id: 'dga-moisture',
    name: 'DGA with Moisture',
    parentProductId: 'dga',
    type: 'Moisture',
    description: 'DGA monitor with integrated moisture analysis',
    price: 18000,
    cost: 13500,
    enabled: true,
    partNumber: 'DGA-MOIST-001',
    specifications: {
      gases: ['H2', 'CO', 'CO2', 'CH4', 'C2H2', 'Moisture'],
      oilType: 'Mineral/Synthetic',
      communication: ['Ethernet', 'Modbus']
    }
  },
  // PD Products
  {
    id: 'pd-guard-pro',
    name: 'PD-Guard Pro',
    parentProductId: 'partial-discharge',
    type: 'Standard',
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
    type: 'Standard',
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
  },
  // QPDM Couplers
  {
    id: 'qpdm-standard',
    name: 'QPDM Standard Coupler',
    parentProductId: 'qpdm',
    type: 'Standard',
    description: 'Standard partial discharge coupler for transformer monitoring',
    price: 800,
    cost: 560,
    enabled: true,
    partNumber: 'QPDM-STD-001'
  },
  {
    id: 'qpdm-high-voltage',
    name: 'QPDM High Voltage Coupler',
    parentProductId: 'qpdm',
    type: 'Standard',
    description: 'High voltage partial discharge coupler for large transformers',
    price: 1200,
    cost: 840,
    enabled: true,
    partNumber: 'QPDM-HV-001'
  },
  // TM8 Temperature Monitoring Options
  {
    id: 'tm8-basic-kit',
    name: 'TM8 Basic Sensor Kit',
    parentProductId: 'tm8',
    type: 'Sensor Kit',
    description: 'Basic 8-channel temperature sensor kit with standard RTDs',
    price: 1200,
    cost: 800,
    enabled: true,
    partNumber: 'TM8-BASIC-KIT'
  },
  {
    id: 'tm8-premium-kit',
    name: 'TM8 Premium Sensor Kit',
    parentProductId: 'tm8',
    type: 'Sensor Kit',
    description: 'Premium 8-channel temperature sensor kit with high precision RTDs',
    price: 1800,
    cost: 1200,
    enabled: true,
    partNumber: 'TM8-PREMIUM-KIT'
  },
  // TM3 Temperature Monitoring Options
  {
    id: 'tm3-basic-kit',
    name: 'TM3 Basic Sensor Kit',
    parentProductId: 'tm3',
    type: 'Sensor Kit',
    description: 'Basic 3-channel temperature sensor kit',
    price: 600,
    cost: 400,
    enabled: true,
    partNumber: 'TM3-BASIC-KIT'
  },
  {
    id: 'tm3-advanced-kit',
    name: 'TM3 Advanced Sensor Kit',
    parentProductId: 'tm3',
    type: 'Sensor Kit',
    description: 'Advanced 3-channel temperature sensor kit with wireless options',
    price: 900,
    cost: 600,
    enabled: true,
    partNumber: 'TM3-ADV-KIT'
  },
  // TM1 Temperature Monitoring Options
  {
    id: 'tm1-standard',
    name: 'TM1 Standard Configuration',
    parentProductId: 'tm1',
    type: 'Standard',
    description: 'Single channel oil temperature monitoring with basic RTD',
    price: 400,
    cost: 280,
    enabled: true,
    partNumber: 'TM1-STD-001'
  },
  {
    id: 'tm1-wireless',
    name: 'TM1 Wireless Configuration',
    parentProductId: 'tm1',
    type: 'Wireless',
    description: 'Single channel wireless oil temperature monitoring',
    price: 650,
    cost: 450,
    enabled: true,
    partNumber: 'TM1-WIRELESS-001'
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
  // Analog Input Cards with configuration options
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
      inputConfigurations: ['4x Voltage', '4x Current', '2x Voltage + 2x Current', 'Mixed'],
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
      inputConfigurations: ['8x Voltage', '8x Current', '4x Voltage + 4x Current', 'Mixed'],
      slotRequirement: 1,
      compatibleChassis: ['LTX', 'MTX', 'STX']
    }
  },
  // Hot Spot Fiber Cards with input options
  {
    id: 'hotspot-fiber-4ch',
    name: 'Hot Spot Fiber 4-Channel',
    parentProductId: 'qtms-ltx-chassis',
    type: 'Fiber',
    description: '4-channel fiber optic hot spot temperature monitoring',
    price: 2200,
    cost: 1600,
    enabled: true,
    partNumber: 'QTMS-HOTSPOT-4CH',
    specifications: {
      channels: 4,
      sensorType: 'Fiber Optic',
      temperature: '-40°C to +200°C',
      accuracy: '±1°C',
      slotRequirement: 1,
      compatibleChassis: ['LTX', 'MTX', 'STX']
    }
  },
  {
    id: 'hotspot-fiber-6ch',
    name: 'Hot Spot Fiber 6-Channel',
    parentProductId: 'qtms-ltx-chassis',
    type: 'Fiber',
    description: '6-channel fiber optic hot spot temperature monitoring',
    price: 2800,
    cost: 2000,
    enabled: true,
    partNumber: 'QTMS-HOTSPOT-6CH',
    specifications: {
      channels: 6,
      sensorType: 'Fiber Optic',
      temperature: '-40°C to +200°C',
      accuracy: '±1°C',
      slotRequirement: 1,
      compatibleChassis: ['LTX', 'MTX', 'STX']
    }
  },
  {
    id: 'hotspot-fiber-8ch',
    name: 'Hot Spot Fiber 8-Channel',
    parentProductId: 'qtms-ltx-chassis',
    type: 'Fiber',
    description: '8-channel fiber optic hot spot temperature monitoring',
    price: 3200,
    cost: 2300,
    enabled: true,
    partNumber: 'QTMS-HOTSPOT-8CH',
    specifications: {
      channels: 8,
      sensorType: 'Fiber Optic',
      temperature: '-40°C to +200°C',
      accuracy: '±1°C',
      slotRequirement: 2,
      compatibleChassis: ['LTX', 'MTX']
    }
  },
  // Display Cards - Local and Remote
  {
    id: 'display-local-7inch',
    name: '7-inch Local Display Card',
    parentProductId: 'qtms-ltx-chassis',
    type: 'Display',
    description: '7-inch color touchscreen display for local system interface',
    price: 1500,
    cost: 1100,
    enabled: true,
    partNumber: 'QTMS-DISPLAY-LOCAL-7',
    specifications: {
      size: '7 inch',
      resolution: '1024x600',
      touchType: 'Capacitive',
      colors: '16.7M',
      mounting: 'Card Slot',
      slotRequirement: 2,
      compatibleChassis: ['LTX', 'MTX']
    }
  },
  {
    id: 'display-remote-interface',
    name: 'Remote Display Interface Card',
    parentProductId: 'qtms-ltx-chassis',
    type: 'Display',
    description: 'Interface card for remote display connection',
    price: 600,
    cost: 400,
    enabled: true,
    partNumber: 'QTMS-DISPLAY-REMOTE',
    specifications: {
      connection: 'Ethernet/RS485',
      distance: 'Up to 1000m',
      displays: 'Up to 4 remote displays',
      slotRequirement: 1,
      compatibleChassis: ['LTX', 'MTX', 'STX']
    }
  },
  // Bushing Monitoring Cards - Specific slot restrictions
  {
    id: 'bushing-monitor-3ch',
    name: '3-Channel Bushing Monitor Card',
    parentProductId: 'qtms-ltx-chassis',
    type: 'Bushing',
    description: '3-channel bushing monitoring card for power factor and capacitance measurement',
    price: 1800,
    cost: 1300,
    enabled: true,
    partNumber: 'QTMS-BUSHING-3CH',
    specifications: {
      channels: 3,
      measurements: ['Power Factor', 'Capacitance', 'Temperature'],
      frequency: '50/60 Hz',
      accuracy: '±0.1%',
      slotRequirement: 1,
      restrictedSlots: [1, 2, 3], // Can only go in specific slots
      compatibleChassis: ['LTX', 'MTX', 'STX']
    }
  },
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
      restrictedSlots: [1, 2, 3, 4], // Can only go in specific slots
      compatibleChassis: ['LTX', 'MTX']
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
  // QPDM Level 3 Accessories
  {
    id: 'qpdm-ic43',
    name: 'IC43 Interface Cable',
    parentProductId: 'qpdm-standard',
    type: 'Accessory',
    description: '43-meter interface cable for QPDM coupler connection',
    price: 150,
    cost: 100,
    enabled: true,
    partNumber: 'QPDM-IC43'
  },
  {
    id: 'qpdm-ic44',
    name: 'IC44 Interface Cable',
    parentProductId: 'qpdm-standard',
    type: 'Accessory',
    description: '44-meter interface cable for QPDM coupler connection',
    price: 160,
    cost: 110,
    enabled: true,
    partNumber: 'QPDM-IC44'
  },
  {
    id: 'qpdm-drain-dn25',
    name: 'Drain Coupler DN25',
    parentProductId: 'qpdm-standard',
    type: 'Accessory',
    description: 'DN25 drain type coupler for transformer valve connection',
    price: 200,
    cost: 140,
    enabled: true,
    partNumber: 'QPDM-DRAIN-DN25'
  },
  {
    id: 'qpdm-drain-dn50',
    name: 'Drain Coupler DN50',
    parentProductId: 'qpdm-standard',
    type: 'Accessory',
    description: 'DN50 drain type coupler for large transformer valve connection',
    price: 250,
    cost: 175,
    enabled: true,
    partNumber: 'QPDM-DRAIN-DN50'
  },
  // TM8 Level 3 Options
  {
    id: 'tm8-calibration-kit',
    name: 'TM8 Calibration Kit',
    parentProductId: 'tm8-basic-kit',
    type: 'Calibration',
    description: 'Calibration kit for TM8 temperature monitoring system',
    price: 300,
    cost: 200,
    enabled: true,
    partNumber: 'TM8-CAL-KIT'
  },
  {
    id: 'tm8-wireless-module',
    name: 'TM8 Wireless Communication Module',
    parentProductId: 'tm8-basic-kit',
    type: 'Communication',
    description: 'Wireless communication module for TM8 system',
    price: 450,
    cost: 300,
    enabled: true,
    partNumber: 'TM8-WIRELESS'
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

  // Helper method to get chassis slot configuration - FIXED
  getChassisSlotConfiguration(chassisId: string) {
    const chassis = this.level2Products.find(p => p.id === chassisId);
    if (!chassis || chassis.parentProductId !== 'qtms') {
      return null;
    }

    const config = {
      'LTX': { 
        totalSlots: 15, 
        usableSlots: 14, // Fixed: 14 cards not 15
        layout: 'Two-row: Bottom (0-7), Top (8-14)',
        slotNumbers: Array.from({length: 15}, (_, i) => i),
        bushingSlots: [1, 2, 3, 4] // Specific slots for bushing cards
      },
      'MTX': { 
        totalSlots: 8, 
        usableSlots: 7, // Fixed: 7 cards not 8
        layout: 'Single-row: (0-7)',
        slotNumbers: Array.from({length: 8}, (_, i) => i),
        bushingSlots: [1, 2, 3] // Specific slots for bushing cards
      },
      'STX': { 
        totalSlots: 5, 
        usableSlots: 4, // Fixed: 4 cards not 5
        layout: 'Single-row: (0-4)',
        slotNumbers: Array.from({length: 5}, (_, i) => i),
        bushingSlots: [1, 2] // Specific slots for bushing cards
      }
    };

    return config[chassis.type as keyof typeof config] || null;
  }

  // Check if card can go in specific slot (for bushing cards)
  canCardGoInSlot(cardId: string, chassisId: string, slotNumber: number): boolean {
    const card = this.level3Products.find(p => p.id === cardId);
    const chassisConfig = this.getChassisSlotConfiguration(chassisId);
    
    if (!card || !chassisConfig) return false;
    
    // Slot 0 is always reserved for controller
    if (slotNumber === 0) return false;
    
    // Check if slot is within usable range
    if (slotNumber > chassisConfig.usableSlots) return false;
    
    // Check bushing card restrictions
    if (card.type === 'Bushing' && card.specifications?.restrictedSlots) {
      return card.specifications.restrictedSlots.includes(slotNumber);
    }
    
    return true;
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
