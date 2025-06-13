
export interface Chassis {
  id: string;
  name: string;
  type: 'LTX' | 'MTX' | 'STX';
  height: string;
  slots: number;
  price: number;
  description: string;
  image?: string;
}

export interface Card {
  id: string;
  name: string;
  type: 'relay' | 'analog' | 'fiber' | 'display' | 'bushing';
  description: string;
  price: number;
  slotRequirement: number;
  compatibleChassis: string[];
  specifications: Record<string, any>;
  image?: string;
}

// New expanded product hierarchy
export interface Level1Product {
  id: string;
  name: string;
  type: 'QTMS' | 'TM8' | 'TM3' | 'TM1' | 'QPDM';
  description: string;
  price: number;
  productInfoUrl?: string;
  enabled: boolean;
  image?: string;
}

export interface Level2Option {
  id: string;
  name: string;
  parentProductId: string;
  description: string;
  price: number;
  enabled: boolean;
  specifications?: Record<string, any>;
}

export interface Level3Customization {
  id: string;
  name: string;
  parentOptionId: string;
  type: 'sensor_type' | 'fiber_option' | 'channel_config';
  options: string[];
  price: number;
  enabled: boolean;
}

export interface BOMItem {
  id: string;
  product: Chassis | Card | Level1Product;
  quantity: number;
  slot?: number;
  configuration?: Record<string, any>;
  enabled: boolean; // New toggle state
  level2Options?: Level2Option[];
  level3Customizations?: Level3Customization[];
}

export interface Quote {
  id: string;
  userId: string;
  items: BOMItem[];
  subtotal: number;
  discount: number;
  total: number;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'finalized';
  createdAt: string;
  updatedAt: string;
  notes?: string;
  // New fields
  oracleCustomerId?: string;
  customerName?: string;
  priority: 'High' | 'Medium' | 'Low';
  termsAndConditions?: string;
}

// Type guard functions
export function isLevel1Product(product: Chassis | Card | Level1Product): product is Level1Product {
  return 'productInfoUrl' in product;
}

export function isChassis(product: Chassis | Card | Level1Product): product is Chassis {
  return 'slots' in product;
}

export function isCard(product: Chassis | Card | Level1Product): product is Card {
  return 'slotRequirement' in product;
}

// New sensor types for Level 3 analog customizations
export const ANALOG_SENSOR_TYPES = [
  'Pt100/RTD',
  'Cu10',
  'Clamp-on CT (0-5A)',
  'Clamp-on CT (10A)',
  'Clamp-on CT (20A)', 
  'Clamp-on CT (100A)',
  'DC Loop (0-1mA)',
  'DC Loop (4-20mA)',
  'DC Voltage (0-100mV)',
  'DC Voltage (0-10V)',
  'AC Voltage (0-140VAC)',
  'AC Voltage (0-320VAC)',
  'Potentiometer (1.5k-15kΩ)',
  'Dry Contact',
  'Opto-isolated Contact',
  'Tap Position Resistive Bridge'
] as const;

export type AnalogSensorType = typeof ANALOG_SENSOR_TYPES[number];
