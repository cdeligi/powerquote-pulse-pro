export interface Chassis {
  id: string;
  name: string;
  type: 'LTX' | 'MTX' | 'STX';
  height: string;
  slots: number;
  price: number;
  description: string;
  image?: string;
  productInfoUrl?: string;
  partNumber?: string;
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
  partNumber?: string;
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
  customizations?: string[];
  hasQuantitySelection?: boolean;
  partNumber?: string;
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
  partNumber?: string; // Generated part number
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
  rejectionReason?: string;
  // New fields
  oracleCustomerId?: string;
  customerName?: string;
  priority: 'High' | 'Medium' | 'Low';
  termsAndConditions?: string;
  isRepInvolved?: boolean;
  shippingTerms?: 'Ex-Works' | 'CFR' | 'CIF' | 'CIP' | 'CPT' | 'DDP' | 'DAP' | 'FCA' | 'Prepaid';
  paymentTerms?: 'Prepaid' | '15' | '30' | '60' | '90' | '120';
  quoteCurrency?: 'USD' | 'EURO' | 'GBP' | 'CAD';
}

// Type guard functions
export function isLevel1Product(product: Chassis | Card | Level1Product): product is Level1Product {
  return 'productInfoUrl' in product && typeof (product as Level1Product).productInfoUrl === 'string';
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
  'Current Sensor', 
  'DC Current Loops',
  'DC Voltage',
  'AC Voltage',
  'Potentiometer',
  'Switch Contact (dry)',
  'Switch Contact (opto-isolated)'
] as const;

export type AnalogSensorType = typeof ANALOG_SENSOR_TYPES[number];

// Sensor descriptions for tooltips
export const ANALOG_SENSOR_DESCRIPTIONS: Record<AnalogSensorType, string> = {
  'Pt100/RTD': '100 ohm Platinum (Pt100), 10 ohm Copper (Cu10) RTD',
  'Current Sensor': 'Clamp-on CT : 0 - 5A, 10A, 20A, 100A',
  'DC Current Loops': '0 - 1 or 4 - 20 mA DC',
  'DC Voltage': '0 - 100 mV DC or 0 - 10 VDC',
  'AC Voltage': '0 - 140 VAC and 0 - 320 VAC; 50/60 Hz',
  'Potentiometer': '1500 - 15,000 ohms',
  'Switch Contact (dry)': 'Open/Closed',
  'Switch Contact (opto-isolated)': '>80V or >130V Open, jumper selectable; optically isolated'
};

// Updated TM1 customization options
export const TM1_CUSTOMIZATION_OPTIONS = ['Moisture Sensor', '4-20mA bridge'] as const;

// Part number generation functions
export const generateQTMSPartNumber = (chassis: Chassis, cards: Card[], hasRemoteDisplay: boolean): string => {
  let partNumber = '';
  
  // Base chassis part number
  switch (chassis.type) {
    case 'LTX':
      partNumber = 'QTMS-LTX-';
      break;
    case 'MTX':
      partNumber = 'QTMS-MTX-';
      break;
    case 'STX':
      partNumber = 'QTMS-STX-';
      break;
  }
  
  // Add card configuration
  const cardTypes = cards.map(card => {
    switch (card.type) {
      case 'relay': return 'R';
      case 'analog': return 'A';
      case 'fiber': return 'F';
      case 'display': return 'D';
      case 'bushing': return 'B';
      default: return 'X';
    }
  }).join('');
  
  partNumber += cardTypes || 'BASE';
  
  // Add remote display suffix
  if (hasRemoteDisplay) {
    partNumber += '-RD';
  }
  
  return partNumber;
};

export const generateProductPartNumber = (product: Level1Product, configuration?: Record<string, any>): string => {
  let partNumber = product.partNumber || product.id.toUpperCase();
  
  // Add configuration suffix for DGA products
  if (['TM8', 'TM3', 'TM1'].includes(product.type) && configuration) {
    const options = [];
    if (configuration['CalGas']) options.push('CG');
    if (configuration['Helium Bottle']) options.push('HB');
    if (configuration['Moisture Sensor']) options.push('MS');
    if (configuration['4-20mA bridge']) options.push('MA');
    
    if (options.length > 0) {
      partNumber += '-' + options.join('');
    }
  }
  
  // Add quantity suffix for PD products
  if (product.type === 'QPDM' && configuration?.quantity) {
    partNumber += '-Q' + configuration.quantity;
  }
  
  // Add channel configuration for QPDM
  if (product.type === 'QPDM' && configuration?.channels === '6-channel') {
    partNumber += '-6CH';
  }
  
  return partNumber;
};
