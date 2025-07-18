import { Level1Product, Level2Product, Level3Product, AssetType } from "@/types/product";

export const DEFAULT_ASSET_TYPES: AssetType[] = [
  { id: 'power-transformer', name: 'Power Transformer', enabled: true },
  { id: 'gas-insulated-switchgear', name: 'Gas Insulated Switchgear', enabled: true },
  { id: 'breaker', name: 'Breaker', enabled: true }
];

export const DEFAULT_LEVEL1_PRODUCTS: Level1Product[] = [
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

export const DEFAULT_LEVEL2_PRODUCTS: Level2Product[] = [
  // QTMS Chassis
  {
    id: 'ltx-chassis',
    name: 'LTX Chassis',
    parentProductId: 'qtms',
    type: 'LTX',
    description: 'Large capacity transformer monitoring system',
    price: 4200,
    cost: 3000,
    enabled: true,
    specifications: {
      height: '6U',
      slots: 14
    },
    partNumber: 'LTX-6U-14S',
    productInfoUrl: 'https://www.qualitrolcorp.com/products/ltx-chassis'
  },
  {
    id: 'mtx-chassis',
    name: 'MTX Chassis',
    parentProductId: 'qtms',
    type: 'MTX',
    description: 'Medium capacity transformer monitoring system',
    price: 2800,
    cost: 2000,
    enabled: true,
    specifications: {
      height: '3U',
      slots: 7
    },
    partNumber: 'MTX-3U-7S',
    productInfoUrl: 'https://www.qualitrolcorp.com/products/mtx-chassis'
  },
  {
    id: 'stx-chassis',
    name: 'STX Chassis',
    parentProductId: 'qtms',
    type: 'STX',
    description: 'Compact transformer monitoring system',
    price: 1900,
    cost: 1400,
    enabled: true,
    specifications: {
      height: '1.5U',
      slots: 4
    },
    partNumber: 'STX-1.5U-4S',
    productInfoUrl: 'https://www.qualitrolcorp.com/products/stx-chassis'
  },
  // Other existing Level 2 products
  {
    id: 'chassis-6-slot',
    name: '6-Slot Chassis',
    parentProductId: 'qtms',
    type: 'Chassis',
    description: '6-slot expansion chassis for QTMS',
    price: 2000,
    cost: 1500,
    enabled: true,
    partNumber: 'CHASSIS-006',
    specifications: {
      slots: 6,
      powerSupply: 'Redundant',
      mounting: 'Rackmount'
    }
  },
  {
    id: 'chassis-12-slot',
    name: '12-Slot Chassis',
    parentProductId: 'qtms',
    type: 'Chassis',
    description: '12-slot expansion chassis for QTMS',
    price: 3500,
    cost: 2500,
    enabled: true,
    partNumber: 'CHASSIS-012',
    specifications: {
      slots: 12,
      powerSupply: 'Redundant',
      mounting: 'Rackmount'
    }
  },
  {
    id: 'core-sensor-unit',
    name: 'Core Sensor Unit',
    parentProductId: 'qtms',
    type: 'Sensor',
    description: 'The Core Sensor Unit is the central processing unit for the QTMS system.',
    price: 5000,
    cost: 3500,
    enabled: true,
    partNumber: 'CSU-100',
    specifications: {
      inputs: 8,
      outputs: 4,
      communication: ['Ethernet', 'RS-485']
    }
  },
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

export const DEFAULT_LEVEL3_PRODUCTS: Level3Product[] = [
  // Basic Cards for all chassis types
  {
    id: 'relay-card-basic',
    name: 'Basic Relay Card',
    parentProductId: 'ltx-chassis',
    type: 'relay',
    description: '8-channel relay output card',
    price: 850,
    cost: 600,
    enabled: true,
    partNumber: 'RLY-8CH-001',
    specifications: {
      channels: 8,
      voltage: '24VDC',
      current: '2A per channel',
      slotRequirement: 1,
      compatibleChassis: ['LTX', 'MTX', 'STX']
    }
  },
  {
    id: 'relay-card-basic-mtx',
    name: 'Basic Relay Card',
    parentProductId: 'mtx-chassis',
    type: 'relay',
    description: '8-channel relay output card',
    price: 850,
    cost: 600,
    enabled: true,
    partNumber: 'RLY-8CH-001',
    specifications: {
      channels: 8,
      voltage: '24VDC',
      current: '2A per channel',
      slotRequirement: 1,
      compatibleChassis: ['LTX', 'MTX', 'STX']
    }
  },
  {
    id: 'relay-card-basic-stx',
    name: 'Basic Relay Card',
    parentProductId: 'stx-chassis',
    type: 'relay',
    description: '8-channel relay output card',
    price: 850,
    cost: 600,
    enabled: true,
    partNumber: 'RLY-8CH-001',
    specifications: {
      channels: 8,
      voltage: '24VDC',
      current: '2A per channel',
      slotRequirement: 1,
      compatibleChassis: ['LTX', 'MTX', 'STX']
    }
  },
  // Analog Cards
  {
    id: 'analog-card-multi-ltx',
    name: 'Multi-Input Analog Card',
    parentProductId: 'ltx-chassis',
    type: 'analog',
    description: 'High-precision analog input card',
    price: 1250,
    cost: 900,
    enabled: true,
    partNumber: 'ANA-16CH-001',
    specifications: {
      channels: 16,
      resolution: '16-bit',
      inputRange: '±10V, 4-20mA',
      inputs: 16,
      slotRequirement: 1,
      compatibleChassis: ['LTX', 'MTX', 'STX']
    }
  },
  {
    id: 'analog-card-multi-mtx',
    name: 'Multi-Input Analog Card',
    parentProductId: 'mtx-chassis',
    type: 'analog',
    description: 'High-precision analog input card',
    price: 1250,
    cost: 900,
    enabled: true,
    partNumber: 'ANA-16CH-001',
    specifications: {
      channels: 16,
      resolution: '16-bit',
      inputRange: '±10V, 4-20mA',
      inputs: 16,
      slotRequirement: 1,
      compatibleChassis: ['LTX', 'MTX', 'STX']
    }
  },
  {
    id: 'analog-card-multi-stx',
    name: 'Multi-Input Analog Card',
    parentProductId: 'stx-chassis',
    type: 'analog',
    description: 'High-precision analog input card',
    price: 1250,
    cost: 900,
    enabled: true,
    partNumber: 'ANA-16CH-001',
    specifications: {
      channels: 16,
      resolution: '16-bit',
      inputRange: '±10V, 4-20mA',
      inputs: 16,
      slotRequirement: 1,
      compatibleChassis: ['LTX', 'MTX', 'STX']
    }
  },
  // Bushing Cards
  {
    id: 'bushing-card-ltx',
    name: 'Bushing Monitoring Card',
    parentProductId: 'ltx-chassis',
    type: 'bushing',
    description: 'Transformer bushing monitoring interface',
    price: 2250,
    cost: 1600,
    enabled: true,
    partNumber: 'BSH-12CH-001',
    specifications: {
      channels: 12,
      measurement: 'Capacitance & Tan Delta',
      slotRequirement: 2,
      compatibleChassis: ['LTX', 'MTX', 'STX']
    }
  },
  {
    id: 'bushing-card-mtx',
    name: 'Bushing Monitoring Card',
    parentProductId: 'mtx-chassis',
    type: 'bushing',
    description: 'Transformer bushing monitoring interface',
    price: 2250,
    cost: 1600,
    enabled: true,
    partNumber: 'BSH-12CH-001',
    specifications: {
      channels: 12,
      measurement: 'Capacitance & Tan Delta',
      slotRequirement: 2,
      compatibleChassis: ['LTX', 'MTX', 'STX']
    }
  },
  {
    id: 'bushing-card-stx',
    name: 'Bushing Monitoring Card',
    parentProductId: 'stx-chassis',
    type: 'bushing',
    description: 'Transformer bushing monitoring interface',
    price: 2250,
    cost: 1600,
    enabled: true,
    partNumber: 'BSH-12CH-001',
    specifications: {
      channels: 12,
      measurement: 'Capacitance & Tan Delta',
      slotRequirement: 2,
      compatibleChassis: ['LTX', 'MTX', 'STX']
    }
  },
  // Display Cards (LTX only)
  {
    id: 'display-card-ltx',
    name: 'Local Display Interface',
    parentProductId: 'ltx-chassis',
    type: 'display',
    description: 'Local HMI display interface card',
    price: 950,
    cost: 700,
    enabled: true,
    partNumber: 'DIS-LCD-001',
    specifications: {
      display: 'LCD',
      resolution: '320x240',
      backlight: 'LED',
      slotRequirement: 1,
      compatibleChassis: ['LTX']
    }
  },
  // Fiber Cards
  {
    id: 'fiber-card-4-input-ltx',
    name: 'Fiber Optic Communication Card (4 Inputs)',
    parentProductId: 'ltx-chassis',
    type: 'fiber',
    description: 'High-speed fiber optic interface with 4 inputs',
    price: 1850,
    cost: 1300,
    enabled: true,
    partNumber: 'FIB-4I-001',
    specifications: {
      ports: 2,
      inputs: 4,
      speed: '1Gbps',
      connector: 'LC',
      slotRequirement: 1,
      compatibleChassis: ['LTX', 'MTX', 'STX']
    }
  },
  {
    id: 'fiber-card-6-input-ltx',
    name: 'Fiber Optic Communication Card (6 Inputs)',
    parentProductId: 'ltx-chassis',
    type: 'fiber',
    description: 'High-speed fiber optic interface with 6 inputs',
    price: 2150,
    cost: 1500,
    enabled: true,
    partNumber: 'FIB-6I-001',
    specifications: {
      ports: 2,
      inputs: 6,
      speed: '1Gbps',
      connector: 'LC',
      slotRequirement: 1,
      compatibleChassis: ['LTX', 'MTX', 'STX']
    }
  },
  {
    id: 'fiber-card-8-input-ltx',
    name: 'Fiber Optic Communication Card (8 Inputs)',
    parentProductId: 'ltx-chassis',
    type: 'fiber',
    description: 'High-speed fiber optic interface with 8 inputs',
    price: 2450,
    cost: 1700,
    enabled: true,
    partNumber: 'FIB-8I-001',
    specifications: {
      ports: 2,
      inputs: 8,
      speed: '1Gbps',
      connector: 'LC',
      slotRequirement: 1,
      compatibleChassis: ['LTX', 'MTX', 'STX']
    }
  },
  // Duplicate fiber cards for MTX and STX
  {
    id: 'fiber-card-4-input-mtx',
    name: 'Fiber Optic Communication Card (4 Inputs)',
    parentProductId: 'mtx-chassis',
    type: 'fiber',
    description: 'High-speed fiber optic interface with 4 inputs',
    price: 1850,
    cost: 1300,
    enabled: true,
    partNumber: 'FIB-4I-001',
    specifications: {
      ports: 2,
      inputs: 4,
      speed: '1Gbps',
      connector: 'LC',
      slotRequirement: 1,
      compatibleChassis: ['LTX', 'MTX', 'STX']
    }
  },
  {
    id: 'fiber-card-4-input-stx',
    name: 'Fiber Optic Communication Card (4 Inputs)',
    parentProductId: 'stx-chassis',
    type: 'fiber',
    description: 'High-speed fiber optic interface with 4 inputs',
    price: 1850,
    cost: 1300,
    enabled: true,
    partNumber: 'FIB-4I-001',
    specifications: {
      ports: 2,
      inputs: 4,
      speed: '1Gbps',
      connector: 'LC',
      slotRequirement: 1,
      compatibleChassis: ['LTX', 'MTX', 'STX']
    }
  },
  // Original Level 3 products
  {
    id: 'relay-card-8',
    name: '8-Channel Relay Card',
    parentProductId: 'chassis-6-slot',
    type: 'Relay',
    description: '8-channel relay output card for QTMS',
    price: 800,
    cost: 600,
    enabled: true,
    partNumber: 'RELAY-008',
    specifications: {
      channels: 8,
      voltage: '24V DC',
      current: '2A',
      slotRequirement: 1
    }
  },
  {
    id: 'analog-input-card-4',
    name: '4-Channel Analog Input Card',
    parentProductId: 'chassis-6-slot',
    type: 'Analog',
    description: '4-channel analog input card for QTMS',
    price: 700,
    cost: 500,
    enabled: true,
    partNumber: 'ANALOG-IN-004',
    specifications: {
      channels: 4,
      inputRange: '0-10V',
      resolution: '16-bit',
      slotRequirement: 1
    }
  },
  {
    id: 'fiber-optic-module',
    name: 'Fiber Optic Communication Module',
    parentProductId: 'chassis-6-slot',
    type: 'Fiber',
    description: 'Fiber optic communication module for QTMS',
    price: 1200,
    cost: 900,
    enabled: true,
    partNumber: 'FIBER-OPTIC-001',
    specifications: {
      wavelength: '1310 nm',
      distance: '20 km',
      connectorType: 'LC',
      slotRequirement: 2
    }
  },
  {
    id: 'display-module-touchscreen',
    name: 'Touchscreen Display Module',
    parentProductId: 'chassis-6-slot',
    type: 'Display',
    description: 'Touchscreen display module for local QTMS interface',
    price: 1500,
    cost: 1100,
    enabled: true,
    partNumber: 'DISPLAY-TOUCH-001',
    specifications: {
      size: '7 inch',
      resolution: '1024x600',
      touchType: 'Capacitive',
      slotRequirement: 2
    }
  },
  {
    id: 'digital-input-card-16',
    name: '16-Channel Digital Input Card',
    parentProductId: 'chassis-6-slot',
    type: 'Digital',
    description: '16-channel digital input card for QTMS',
    price: 600,
    cost: 400,
    enabled: true,
    partNumber: 'DIGITAL-IN-016',
    specifications: {
      channels: 16,
      voltage: '24V DC',
      inputType: 'Dry Contact',
      slotRequirement: 1
    }
  },
  {
    id: 'iec61850-communication-module',
    name: 'IEC 61850 Communication Module',
    parentProductId: 'chassis-6-slot',
    type: 'Communication',
    description: 'IEC 61850 communication module for QTMS',
    price: 1800,
    cost: 1300,
    enabled: true,
    partNumber: 'IEC61850-001',
    specifications: {
      protocol: 'IEC 61850',
      ports: 2,
      connectorType: 'RJ45',
      slotRequirement: 2
    }
  }
];
export { DEFAULT_ANALOG_SENSORS, DEFAULT_BUSHING_TAP_MODELS } from '@/types/product/sensor-config';
