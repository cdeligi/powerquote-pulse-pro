/**
 * Default product data for the QTMS system
 * Contains default Level 1, Level 2, and Level 3 products for development and fallback
 */

import { Level1Product, Level2Product, Level3Product } from "@/types/product";

export const DEFAULT_LEVEL1_PRODUCTS: Level1Product[] = [
  // Core QTMS products
  {
    id: 'qtms',
    name: 'QTMS',
    displayName: 'QTMS',
    type: 'QTMS',
    description: 'Qualitrol Transformer Monitoring System',
    price: 0,
    enabled: true,
    rackConfigurable: true,
    category: 'Monitoring Systems',
    asset_type_id: 'power-transformer'
  },
  {
    id: 'partial-discharge',
    name: 'Partial Discharge Solutions for Power Transformers',
    displayName: 'PD Solutions',
    type: 'QPDM',
    description: 'Partial discharge monitoring and analysis systems for power transformers',
    price: 0,
    enabled: true,
    rackConfigurable: false,
    category: 'Monitoring Systems',
    asset_type_id: 'power-transformer'
  },
  {
    id: 'dissolved-gas',
    name: 'Dissolved Gas Analyzers',
    displayName: 'DGA',
    type: 'DGA',
    description: 'Online dissolved gas analysis systems',
    price: 0,
    enabled: true,
    rackConfigurable: false,
    category: 'Gas Analysis',
    asset_type_id: 'power-transformer',
    customizations: ['Portable', 'Online', 'Stationary']
  },
  {
    id: 'tm8',
    name: 'TM8',
    displayName: 'TM8',
    type: 'TM8',
    description: '8-channel temperature monitoring system',
    price: 0,
    enabled: true,
    rackConfigurable: false,
    category: 'Temperature Monitoring',
    asset_type_id: 'power-transformer'
  },
  {
    id: 'tm3',
    name: 'TM3',
    displayName: 'TM3',
    type: 'TM3',
    description: '3-channel oil and winding temperature monitoring system',
    price: 0,
    enabled: true,
    rackConfigurable: false,
    category: 'Temperature Monitoring',
    asset_type_id: 'power-transformer'
  },
  {
    id: 'tm1',
    name: 'TM1',
    displayName: 'TM1',
    type: 'TM1',
    description: 'Single channel temperature monitoring system',
    price: 0,
    enabled: true,
    rackConfigurable: false,
    category: 'Temperature Monitoring',
    asset_type_id: 'power-transformer'
  }
];

export const DEFAULT_LEVEL2_PRODUCTS: Level2Product[] = [
  // QTMS Chassis variants
  {
    id: 'qtms-ltx',
    name: 'LTX',
    displayName: 'LTX Chassis',
    parentProductId: 'qtms',
    type: 'LTX',
    chassisType: 'LTX',
    description: 'Compact 4-slot monitoring chassis',
    price: 3500,
    cost: 2450,
    enabled: true,
    partNumber: 'QTMS-LTX-001',
    specifications: {
      slots: 4,
      capacity: 'Compact',
      height: '3U',
      width: '19"',
      power: '24VDC',
      communication: ['Ethernet', 'Serial']
    }
  },
  {
    id: 'qtms-mtx',
    name: 'MTX',
    displayName: 'MTX Chassis',
    parentProductId: 'qtms',
    type: 'MTX',
    chassisType: 'MTX',
    description: 'Mid-range 8-slot monitoring chassis',
    price: 5500,
    cost: 3850,
    enabled: true,
    partNumber: 'QTMS-MTX-001',
    specifications: {
      slots: 8,
      capacity: 'Mid-Range',
      height: '6U',
      width: '19"',
      power: '24VDC',
      communication: ['Ethernet', 'Serial', 'Modbus']
    }
  },
  {
    id: 'qtms-stx',
    name: 'STX',
    displayName: 'STX Chassis',
    parentProductId: 'qtms',
    type: 'STX',
    chassisType: 'STX',
    description: 'High-capacity 16-slot monitoring chassis',
    price: 8500,
    cost: 5950,
    enabled: true,
    partNumber: 'QTMS-STX-001',
    specifications: {
      slots: 16,
      capacity: 'High-Capacity',
      height: '12U',
      width: '19"',
      power: '24VDC',
      communication: ['Ethernet', 'Serial', 'Modbus', 'DNP3']
    }
  },
  
  // TM8 variants
  {
    id: 'tm8-standard',
    name: 'Standard',
    displayName: 'TM8 Standard',
    parentProductId: 'tm8',
    type: 'Standard',
    chassisType: 'N/A',
    description: 'Standard 8-channel temperature monitoring unit',
    price: 3200,
    cost: 2240,
    enabled: true,
    partNumber: 'TM8-STD-001',
    specifications: {
      channels: 8,
      inputs: 'RTD/Thermocouple',
      display: 'LCD',
      communication: ['Modbus RTU']
    }
  },
  
  // TM3 variants
  {
    id: 'tm3-standard',
    name: 'Standard',
    displayName: 'TM3 Standard',
    parentProductId: 'tm3',
    type: 'Standard',
    chassisType: 'N/A',
    description: 'Standard 3-channel temperature monitoring unit',
    price: 2800,
    cost: 1960,
    enabled: true,
    partNumber: 'TM3-STD-001',
    specifications: {
      channels: 3,
      inputs: 'RTD',
      display: 'LCD',
      communication: ['Modbus RTU']
    }
  },
  
  // TM1 variants
  {
    id: 'tm1-standard',
    name: 'Standard',
    displayName: 'TM1 Standard',
    parentProductId: 'tm1',
    type: 'Standard',
    chassisType: 'N/A',
    description: 'Single channel temperature monitoring unit',
    price: 1800,
    cost: 1260,
    enabled: true,
    partNumber: 'TM1-STD-001',
    specifications: {
      channels: 1,
      inputs: 'RTD',
      display: 'LED',
      communication: ['4-20mA']
    }
  },
  
  // Partial Discharge variants
  {
    id: 'pd-basic',
    name: 'Basic',
    displayName: 'PD Basic',
    parentProductId: 'partial-discharge',
    type: 'Monitor',
    chassisType: 'N/A',
    description: 'Basic partial discharge monitoring system',
    price: 15000,
    cost: 10500,
    enabled: true,
    partNumber: 'PD-BASIC-001',
    specifications: {
      sensors: 3,
      frequency: '500kHz-2MHz',
      communication: ['Ethernet']
    }
  },
  
  // Dissolved Gas variants
  {
    id: 'dga-online',
    name: 'Online',
    displayName: 'DGA Online',
    parentProductId: 'dissolved-gas',
    type: 'Online',
    chassisType: 'N/A',
    description: 'Online dissolved gas analyzer',
    price: 45000,
    cost: 31500,
    enabled: true,
    partNumber: 'DGA-ON-001',
    specifications: {
      gases: ['H2', 'CH4', 'C2H2', 'C2H4', 'C2H6', 'CO', 'CO2'],
      accuracy: '±10%',
      response: '< 5 minutes'
    }
  }
];

// Simple fallback products for initial development
export const FALLBACK_LEVEL2_PRODUCTS: Level2Product[] = [
  {
    id: 'pd-sense-basic',
    name: 'PD-Sense Basic',
    displayName: 'PD-Sense Basic',
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
    displayName: 'Basic Relay Card',
    parent_product_id: 'ltx-chassis',
    product_level: 3,
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
    displayName: 'Basic Relay Card',
    parent_product_id: 'mtx-chassis',
    product_level: 3,
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
    displayName: 'Basic Relay Card',
    parent_product_id: 'stx-chassis',
    product_level: 3,
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
    displayName: 'Multi-Input Analog Card',
    parent_product_id: 'ltx-chassis',
    product_level: 3,
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
    displayName: 'Multi-Input Analog Card',
    parent_product_id: 'mtx-chassis',
    product_level: 3,
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
    displayName: 'Multi-Input Analog Card',
    parent_product_id: 'stx-chassis',
    product_level: 3,
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
    displayName: 'Bushing Monitoring Card',
    parent_product_id: 'ltx-chassis',
    product_level: 3,
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
    displayName: 'Bushing Monitoring Card',
    parent_product_id: 'mtx-chassis',
    product_level: 3,
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
    displayName: 'Bushing Monitoring Card',
    parent_product_id: 'stx-chassis',
    product_level: 3,
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
    displayName: 'Local Display Interface',
    parent_product_id: 'ltx-chassis',
    product_level: 3,
    type: 'display',
    description: 'Local HMI display interface card',
    price: 950,
    cost: 700,
    enabled: true,
    partNumber: 'DSP-HMI-001',
    specifications: {
      display: '7" Color LCD',
      resolution: '800x480',
      backlight: 'LED',
      slotRequirement: 1,
      compatibleChassis: ['LTX']
    }
  },
  // Communication Cards
  {
    id: 'comm-ethernet-ltx',
    name: 'Ethernet Communication Card',
    displayName: 'Ethernet Communication Card',
    parent_product_id: 'ltx-chassis',
    product_level: 3,
    type: 'communication',
    description: 'Dual Ethernet communication interface',
    price: 750,
    cost: 525,
    enabled: true,
    partNumber: 'ETH-2PORT-001',
    specifications: {
      ports: 2,
      speed: '10/100/1000 Mbps',
      connector: 'RJ45',
      protocol: 'TCP/IP, Modbus TCP',
      slotRequirement: 1,
      compatibleChassis: ['LTX', 'MTX', 'STX']
    }
  },
  {
    id: 'comm-ethernet-mtx',
    name: 'Ethernet Communication Card',
    displayName: 'Ethernet Communication Card',
    parent_product_id: 'mtx-chassis',
    product_level: 3,
    type: 'communication',
    description: 'Dual Ethernet communication interface',
    price: 750,
    cost: 525,
    enabled: true,
    partNumber: 'ETH-2PORT-001',
    specifications: {
      ports: 2,
      speed: '10/100/1000 Mbps',
      connector: 'RJ45',
      protocol: 'TCP/IP, Modbus TCP',
      slotRequirement: 1,
      compatibleChassis: ['LTX', 'MTX', 'STX']
    }
  },
  {
    id: 'comm-ethernet-stx',
    name: 'Ethernet Communication Card',
    displayName: 'Ethernet Communication Card',
    parent_product_id: 'stx-chassis',
    product_level: 3,
    type: 'communication',
    description: 'Dual Ethernet communication interface',
    price: 750,
    cost: 525,
    enabled: true,
    partNumber: 'ETH-2PORT-001',
    specifications: {
      ports: 2,
      speed: '10/100/1000 Mbps',
      connector: 'RJ45',
      protocol: 'TCP/IP, Modbus TCP',
      slotRequirement: 1,
      compatibleChassis: ['LTX', 'MTX', 'STX']
    }
  },
  {
    id: 'comm-serial-stx',
    name: 'Serial Communication Card',
    displayName: 'Serial Communication Card',
    parent_product_id: 'stx-chassis',
    product_level: 3,
    type: 'communication',
    description: 'Multi-port serial communication interface',
    price: 650,
    cost: 455,
    enabled: true,
    partNumber: 'SER-4PORT-001',
    specifications: {
      ports: 4,
      interface: 'RS232/RS485',
      connector: 'DB9/Terminal Block',
      protocol: 'Modbus RTU, DNP3',
      slotRequirement: 1,
      compatibleChassis: ['MTX', 'STX']
    }
  },

  // Power Supply Cards
  {
    id: 'power-redundant-stx',
    name: 'Redundant Power Supply',
    displayName: 'Redundant Power Supply',
    parent_product_id: 'stx-chassis',
    product_level: 3,
    type: 'power',
    description: 'Redundant power supply module',
    price: 850,
    cost: 595,
    enabled: true,
    partNumber: 'PWR-RED-001',
    specifications: {
      channels: 2,
      voltage: '24VDC',
      current: '5A per channel',
      slotRequirement: 1
    }
  },

  // Analog I/O Cards
  {
    id: 'analog-io-high-precision',
    name: 'High Precision Analog I/O',
    displayName: 'High Precision Analog I/O',
    parent_product_id: 'mtx-chassis',
    product_level: 3,
    type: 'analog',
    description: 'High precision analog input/output card',
    price: 1450,
    cost: 1015,
    enabled: true,
    partNumber: 'AIO-HP-001',
    specifications: {
      channels: 8,
      inputRange: '±10V, 4-20mA',
      resolution: '24-bit',
      slotRequirement: 1
    }
  },

  // Fiber Optic Cards
  {
    id: 'fiber-optic-card',
    name: 'Fiber Optic Interface',
    displayName: 'Fiber Optic Interface',
    parent_product_id: 'stx-chassis',
    product_level: 3,
    type: 'communication',
    description: 'Single mode fiber optic communication interface',
    price: 1250,
    cost: 875,
    enabled: true,
    partNumber: 'FIBER-SM-001',
    specifications: {
      wavelength: '1310nm',
      distance: '40km',
      connectorType: 'LC',
      slotRequirement: 1
    }
  },

  // Touch Screen Interface
  {
    id: 'touchscreen-interface',
    name: 'Touch Screen Interface',
    displayName: 'Touch Screen Interface',
    parent_product_id: 'mtx-chassis',
    product_level: 3,
    type: 'display',
    description: 'Capacitive touch screen interface module',
    price: 1850,
    cost: 1295,
    enabled: true,
    partNumber: 'TOUCH-CAP-001',
    specifications: {
      size: '10.1"',
      resolution: '1280x800',
      touchType: 'Capacitive Multi-touch',
      slotRequirement: 2
    }
  },

  // Digital Input Cards
  {
    id: 'digital-input-card',
    name: 'Digital Input Card',
    displayName: 'Digital Input Card',
    parent_product_id: 'ltx-chassis',
    product_level: 3,
    type: 'digital',
    description: '16-channel digital input card',
    price: 650,
    cost: 455,
    enabled: true,
    partNumber: 'DIN-16CH-001',
    specifications: {
      channels: 16,
      voltage: '24VDC',
      inputType: 'Dry Contact/Wet Contact',
      slotRequirement: 1
    }
  },

  // Protocol Gateway Cards
  {
    id: 'protocol-gateway-card',
    name: 'Protocol Gateway',
    displayName: 'Protocol Gateway',
    parent_product_id: 'stx-chassis',
    product_level: 3,
    type: 'communication',
    description: 'Multi-protocol gateway and converter',
    price: 1650,
    cost: 1155,
    enabled: true,
    partNumber: 'PGATE-001',
    specifications: {
      protocol: 'IEC 61850, DNP3, Modbus',
      ports: 4,
      connectorType: 'RJ45/Fiber',
      slotRequirement: 1
    }
  }
];