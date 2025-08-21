/**
 * 2025 Qualitrol Corp. All rights reserved.
 * 
 * This file contains default product configurations for the QTMS system.
 * It includes Level 1 (main products), Level 2 (chassis/variants), 
 * Level 3 (cards/components), and asset types.
 */

import { AssetType, Level1Product, Level2Product, Level3Product } from "@/types/product";

export const DEFAULT_ASSET_TYPES: AssetType[] = [
  { id: 'power-transformer', name: 'Power Transformer', enabled: true },
  { id: 'gis', name: 'GIS (Gas Insulated Switchgear)', enabled: true },
  { id: 'circuit-breaker', name: 'Circuit Breaker', enabled: true },
  { id: 'reactor', name: 'Reactor', enabled: true },
  { id: 'capacitor-bank', name: 'Capacitor Bank', enabled: true }
];

// Helper function to ensure Level3Product compliance
const createLevel3Product = (base: any): Level3Product => ({
  ...base,
  parent_product_id: base.parentProductId,
  product_level: 3 as const,
});

export const DEFAULT_LEVEL1_PRODUCTS: Level1Product[] = [
  {
    id: 'qtms',
    name: 'QTMS - Qualitrol Transformer Monitoring System',
    type: 'power-transformer',
    asset_type_id: 'power-transformer',
    description: 'Comprehensive monitoring system for power transformers',
    price: 15000,
    cost: 10500,
    enabled: true,
    partNumber: 'QTMS-BASE',
    rackConfigurable: true,
    hasQuantitySelection: false,
    productInfoUrl: '/products/qtms'
  },
  {
    id: 'tm8',
    name: 'TM8 Transformer Monitor',
    type: 'power-transformer', 
    asset_type_id: 'power-transformer',
    description: '8-channel transformer monitoring system',
    price: 8500,
    cost: 6000,
    enabled: true,
    partNumber: 'TM8-001',
    rackConfigurable: false,
    hasQuantitySelection: false
  },
  {
    id: 'tm3',
    name: 'TM3 Transformer Monitor',
    type: 'power-transformer',
    asset_type_id: 'power-transformer', 
    description: '3-channel compact transformer monitor',
    price: 5200,
    cost: 3640,
    enabled: true,
    partNumber: 'TM3-001',
    rackConfigurable: false,
    hasQuantitySelection: false
  },
  {
    id: 'tm1',
    name: 'TM1 Transformer Monitor',
    type: 'power-transformer',
    asset_type_id: 'power-transformer',
    description: 'Single-channel transformer monitor',
    price: 2800,
    cost: 1960,
    enabled: true,
    partNumber: 'TM1-001',
    rackConfigurable: false,
    hasQuantitySelection: false
  }
];

export const DEFAULT_LEVEL2_PRODUCTS: Level2Product[] = [
  {
    id: 'ltx-chassis',
    name: 'LTX Chassis',
    parentProductId: 'qtms',
    chassisType: 'LTX',
    type: 'LTX',
    description: '14-slot expandable chassis for comprehensive monitoring',
    price: 3200,
    cost: 2240,
    enabled: true,
    specifications: {
      slots: 14,
      capacity: 'High Capacity',
      dimensions: '19" rack mountable',
      powerSupply: 'Redundant',
      cooling: 'Active'
    },
    partNumber: 'LTX-CHASSIS-14',
    productInfoUrl: '/products/qtms/ltx'
  },
  {
    id: 'mtx-chassis',
    name: 'MTX Chassis', 
    parentProductId: 'qtms',
    chassisType: 'MTX',
    type: 'MTX',
    description: '7-slot modular chassis for medium applications',
    price: 2400,
    cost: 1680,
    enabled: true,
    specifications: {
      slots: 7,
      capacity: 'Medium Capacity',
      dimensions: '19" rack mountable',
      powerSupply: 'Standard',
      cooling: 'Passive'
    },
    partNumber: 'MTX-CHASSIS-7',
    productInfoUrl: '/products/qtms/mtx'
  },
  {
    id: 'stx-chassis',
    name: 'STX Chassis',
    parentProductId: 'qtms',
    chassisType: 'STX', 
    type: 'STX',
    description: '4-slot compact chassis for small installations',
    price: 1600,
    cost: 1120,
    enabled: true,
    specifications: {
      slots: 4,
      capacity: 'Compact',
      dimensions: 'Compact 19" rack',
      powerSupply: 'External',
      cooling: 'Passive'
    },
    partNumber: 'STX-CHASSIS-4',
    productInfoUrl: '/products/qtms/stx'
  }
];

export const DEFAULT_LEVEL3_PRODUCTS: Level3Product[] = [
  // Basic Cards for all chassis types
  createLevel3Product({
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
      current: '10A per channel',
      slotRequirement: 1,
      compatibleChassis: ['LTX', 'MTX', 'STX']
    }
  }),
  createLevel3Product({
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
  }),
  createLevel3Product({
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
  }),
  // Analog input cards with Level 4 configuration capability
  createLevel3Product({
    id: 'analog-card-multi',
    name: 'Multi-Input Analog Card',
    parentProductId: 'ltx-chassis',
    type: 'analog',
    description: 'Multi-channel analog input card with configurable inputs',
    price: 1200,
    cost: 840,
    enabled: true,
    requires_level4_config: true,
    partNumber: 'ANA-MULTI-001',
    specifications: {
      channels: 8,
      resolution: '16-bit',
      inputRange: '±10V, ±5V, 0-10V',
      inputs: 8,
      slotRequirement: 1,
      compatibleChassis: ['LTX', 'MTX', 'STX']
    }
  }),
  createLevel3Product({
    id: 'analog-card-multi-mtx',
    name: 'Multi-Input Analog Card',
    parentProductId: 'mtx-chassis',
    type: 'analog',
    description: 'Multi-channel analog input card with configurable inputs',
    price: 1200,
    cost: 840,
    enabled: true,
    requires_level4_config: true,
    partNumber: 'ANA-MULTI-001',
    specifications: {
      channels: 8,
      resolution: '16-bit',
      inputRange: '±10V, ±5V, 0-10V',
      inputs: 8,
      slotRequirement: 1,
      compatibleChassis: ['LTX', 'MTX', 'STX']
    }
  }),
  createLevel3Product({
    id: 'analog-card-multi-stx',
    name: 'Multi-Input Analog Card',
    parentProductId: 'stx-chassis',
    type: 'analog',
    description: 'Multi-channel analog input card with configurable inputs',
    price: 1200,
    cost: 840,
    enabled: true,
    requires_level4_config: true,
    partNumber: 'ANA-MULTI-001',
    specifications: {
      channels: 8,
      resolution: '16-bit',
      inputRange: '±10V, ±5V, 0-10V',
      inputs: 8,
      slotRequirement: 1,
      compatibleChassis: ['LTX', 'MTX', 'STX']
    }
  }),
  // Temperature monitoring cards
  createLevel3Product({
    id: 'temp-card-rtd',
    name: 'RTD Temperature Card',
    parentProductId: 'ltx-chassis',
    type: 'temperature',
    description: '8-channel RTD temperature monitoring',
    price: 950,
    cost: 665,
    enabled: true,
    partNumber: 'TEMP-RTD-8CH',
    specifications: {
      channels: 8,
      measurement: 'RTD (PT100/PT1000)',
      slotRequirement: 1,
      compatibleChassis: ['LTX', 'MTX', 'STX']
    }
  }),
  createLevel3Product({
    id: 'temp-card-tc',
    name: 'Thermocouple Card',
    parentProductId: 'mtx-chassis',
    type: 'temperature',
    description: '8-channel thermocouple input card',
    price: 920,
    cost: 644,
    enabled: true,
    partNumber: 'TEMP-TC-8CH',
    specifications: {
      channels: 8,
      measurement: 'Thermocouple (J,K,T)',
      slotRequirement: 1,
      compatibleChassis: ['LTX', 'MTX', 'STX']
    }
  }),
  createLevel3Product({
    id: 'temp-card-ambient',
    name: 'Ambient Temperature Card',
    parentProductId: 'stx-chassis',
    type: 'temperature',
    description: '4-channel ambient temperature sensor',
    price: 680,
    cost: 476,
    enabled: true,
    partNumber: 'TEMP-AMB-4CH',
    specifications: {
      channels: 4,
      measurement: 'Ambient (-40°C to +85°C)',
      slotRequirement: 1,
      compatibleChassis: ['LTX', 'MTX', 'STX']
    }
  }),
  // Display and interface cards
  createLevel3Product({
    id: 'display-card-lcd',
    name: 'LCD Display Card',
    parentProductId: 'ltx-chassis',
    type: 'display',
    description: 'Color LCD display with touch interface',
    price: 1450,
    cost: 1015,
    enabled: true,
    partNumber: 'DISP-LCD-COLOR',
    specifications: {
      display: 'Color LCD',
      resolution: '800x480',
      backlight: 'LED',
      slotRequirement: 2,
      compatibleChassis: ['LTX', 'MTX']
    }
  }),
  // Communication cards
  createLevel3Product({
    id: 'comm-ethernet',
    name: 'Ethernet Communication Card',
    parentProductId: 'ltx-chassis',
    type: 'communication',
    description: 'Dual-port Ethernet interface card',
    price: 720,
    cost: 504,
    enabled: true,
    partNumber: 'COMM-ETH-DUAL',
    specifications: {
      ports: 2,
      inputs: 2,
      speed: '10/100/1000 Mbps',
      connector: 'RJ45',
      slotRequirement: 1,
      compatibleChassis: ['LTX', 'MTX', 'STX']
    }
  }),
  createLevel3Product({
    id: 'comm-serial',
    name: 'Serial Communication Card',
    parentProductId: 'mtx-chassis',
    type: 'communication',
    description: 'Multi-protocol serial interface',
    price: 580,
    cost: 406,
    enabled: true,
    partNumber: 'COMM-SER-MULTI',
    specifications: {
      ports: 4,
      inputs: 4,
      speed: 'Up to 115.2 kbps',
      connector: 'DB9/Terminal',
      slotRequirement: 1,
      compatibleChassis: ['LTX', 'MTX', 'STX']
    }
  }),
  createLevel3Product({
    id: 'comm-modbus',
    name: 'Modbus Communication Card',
    parentProductId: 'stx-chassis',
    type: 'communication',
    description: 'Modbus RTU/TCP interface card',
    price: 650,
    cost: 455,
    enabled: true,
    partNumber: 'COMM-MODBUS',
    specifications: {
      ports: 2,
      inputs: 2,
      speed: '9600-115200 bps',
      connector: 'Terminal/RJ45',
      slotRequirement: 1,
      compatibleChassis: ['LTX', 'MTX', 'STX']
    }
  })
];