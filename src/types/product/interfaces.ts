
// Level 1: Main Product Categories (QTMS, etc.)
export interface Level1Product {
  id: string;
  name: string;
  type: 'QTMS' | 'TM8' | 'TM3' | 'TM1' | 'QPDM';
  description: string;
  price: number;
  cost?: number; // Hidden admin-only field
  productInfoUrl?: string;
  enabled: boolean;
  image?: string;
  partNumber?: string;
}

// Level 2: Product Variants/Chassis (LTX, MTX, STX for QTMS)
export interface Level2Product {
  id: string;
  name: string;
  parentProductId: string; // Links to Level1Product
  type: 'LTX' | 'MTX' | 'STX' | 'CalGas' | 'Moisture' | 'Standard';
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
}

// Level 3: Components/Cards/Options (Cards for chassis, accessories for others)
export interface Level3Product {
  id: string;
  name: string;
  parentProductId: string; // Links to Level2Product
  type: 'relay' | 'analog' | 'fiber' | 'display' | 'bushing' | 'accessory' | 'sensor';
  description: string;
  price: number;
  cost?: number;
  enabled: boolean;
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
}

// Legacy interfaces for backward compatibility
export interface Chassis extends Level2Product {
  height: string;
  slots: number;
}

export interface Card extends Level3Product {
  slotRequirement: number;
  compatibleChassis: string[];
}

export interface Level2Option extends Level3Product {
  // Kept for compatibility
}

export interface Level3Customization {
  id: string;
  name: string;
  parentOptionId: string;
  type: 'sensor_type' | 'fiber_option' | 'channel_config';
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
  level3Customizations?: Level3Product[];
  partNumber?: string;
}
