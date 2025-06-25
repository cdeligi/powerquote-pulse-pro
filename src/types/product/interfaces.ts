
/**
 * © 2025 Qualitrol Corp. All rights reserved.
 */

// Level 0: Asset Types (Power Transformer, GIS, Breaker, etc.)
export interface AssetType {
  id: string;
  name: string;
  enabled: boolean;
}

// Level 1: Main Product Categories (QTMS, etc.)
export interface Level1Product {
  id: string;
  name: string;
  type: string; // Made mandatory since code depends on it for branching
  category?: string; // Optional internal category for organization
  description: string;
  price: number;
  cost?: number; // Hidden admin-only field
  productInfoUrl?: string;
  enabled: boolean;
  image?: string;
  partNumber?: string;
  customizations?: string[]; // For DGA products
  hasQuantitySelection?: boolean; // For PD couplers
}

// Level 2: Product Variants/Chassis (LTX, MTX, STX for QTMS)
export interface Level2Product {
  id: string;
  name: string;
  parentProductId: string; // Links to Level1Product
  type: string; // Dynamic type instead of hardcoded union
  description: string;
  price: number;
  cost?: number;
  enabled: boolean;
  specifications?: {
    height?: string;
    slots?: number;
    capacity?: string;
    [key: string]: any;
  };
  partNumber?: string;
  image?: string;
  productInfoUrl?: string;
}

// Level 3: Components/Cards/Options (Cards for chassis, accessories for others)
export interface Level3Product {
  id: string;
  name: string;
  parentProductId: string; // Links to Level2Product
  type: string; // Dynamic type instead of hardcoded union
  description: string;
  price: number;
  cost?: number;
  enabled?: boolean; // Made optional since many static card objects omit it
  specifications?: {
    slotRequirement?: number;
    inputs?: number;
    outputs?: number;
    protocols?: string[];
    channels?: number;
    inputTypes?: string[];
    [key: string]: any;
  };
  partNumber?: string;
  image?: string;
  productInfoUrl?: string;
}

// Analog sensor types and descriptions
export const ANALOG_SENSOR_TYPES = [
  'Pt100/RTD',
  'Thermocouple Type K',
  'Thermocouple Type J',
  'Thermocouple Type T',
  'Thermocouple Type E',
  'Thermocouple Type R',
  'Thermocouple Type S',
  'Thermocouple Type B',
  'Thermocouple Type N',
  '4-20mA Current Loop',
  '0-10V Voltage',
  '0-5V Voltage',
  'Strain Gauge',
  'Load Cell',
  'Pressure Transducer',
  'Vibration Sensor',
  'Custom Analog Input'
] as const;

export type AnalogSensorType = typeof ANALOG_SENSOR_TYPES[number];

export const ANALOG_SENSOR_DESCRIPTIONS: Record<AnalogSensorType, string> = {
  'Pt100/RTD': 'Platinum resistance temperature detector for high accuracy temperature measurement',
  'Thermocouple Type K': 'Chromel-Alumel thermocouple for general purpose temperature measurement (-200°C to +1350°C)',
  'Thermocouple Type J': 'Iron-Constantan thermocouple for moderate temperature applications (-210°C to +760°C)',
  'Thermocouple Type T': 'Copper-Constantan thermocouple for low temperature applications (-250°C to +400°C)',
  'Thermocouple Type E': 'Chromel-Constantan thermocouple for high sensitivity applications (-250°C to +900°C)',
  'Thermocouple Type R': 'Platinum-Rhodium thermocouple for high temperature applications (0°C to +1600°C)',
  'Thermocouple Type S': 'Platinum-Rhodium thermocouple for high temperature applications (0°C to +1600°C)',
  'Thermocouple Type B': 'Platinum-Rhodium thermocouple for very high temperature applications (+200°C to +1800°C)',
  'Thermocouple Type N': 'Nicrosil-Nisil thermocouple for high temperature stability (-250°C to +1300°C)',
  '4-20mA Current Loop': 'Industry standard current loop for process control signals',
  '0-10V Voltage': 'Standard voltage input for analog sensors and control signals',
  '0-5V Voltage': 'Low voltage input for analog sensors and control signals',
  'Strain Gauge': 'Mechanical strain measurement for stress and load monitoring',
  'Load Cell': 'Force and weight measurement transducer',
  'Pressure Transducer': 'Pressure measurement sensor for hydraulic and pneumatic systems',
  'Vibration Sensor': 'Accelerometer or velocity sensor for vibration monitoring',
  'Custom Analog Input': 'Configurable analog input for specialized sensor types'
};

// Type unions for backward compatibility
export type ProductType = 'QTMS' | 'TM8' | 'TM3' | 'TM1' | 'QPDM';
export type Level2ProductType = 'LTX' | 'MTX' | 'STX' | 'CalGas' | 'Standard' | 'Moisture';

// Type management interfaces
export interface ProductTypeConfig {
  id: string;
  name: string;
  level: 1 | 2 | 3;
  description?: string;
  enabled: boolean;
}

// Legacy interfaces for backward compatibility - extend from new hierarchy
export interface Chassis extends Level2Product {
  height: string;
  slots: number;
  productInfoUrl?: string;
}

export interface Card extends Level3Product {
  slotRequirement: number;
  compatibleChassis: string[];
  enabled?: boolean; // Optional since many static card objects omit it
}

export interface Level2Option extends Level3Product {
  // Level2Option is now Level3Product for backward compatibility
}

export interface Level3Customization {
  id: string;
  parentOptionId: string;
  type: string;
  name: string;
  description?: string;
  options: string[];
  price: number;
  cost?: number;
  enabled: boolean;
}

export interface BOMItem {
  id: string;
  product: Level1Product | Level2Product | Level3Product;
  quantity: number;
  slot?: number;
  configuration?: Record<string, any>;
  enabled: boolean;
  level2Options?: Level2Product[];
  level3Customizations?: Level3Customization[];
  partNumber?: string;
}
