
export interface Chassis {
  id: string;
  name: string;
  type: 'LTX' | 'MTX' | 'STX';
  height: string;
  slots: number;
  price: number;
  cost?: number; // Hidden admin-only field
  description: string;
  image?: string;
  productInfoUrl?: string;
  partNumber?: string;
  enabled?: boolean;
}

export interface Card {
  id: string;
  name: string;
  type: 'relay' | 'analog' | 'fiber' | 'display' | 'bushing';
  description: string;
  price: number;
  cost?: number; // Hidden admin-only field
  slotRequirement: number;
  compatibleChassis: string[];
  specifications: Record<string, any>;
  image?: string;
  partNumber?: string;
  enabled?: boolean;
}

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
  cost?: number; // Hidden admin-only field
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
  cost?: number; // Hidden admin-only field
  enabled: boolean;
}

export interface BOMItem {
  id: string;
  product: Chassis | Card | Level1Product;
  quantity: number;
  slot?: number;
  configuration?: Record<string, any>;
  enabled: boolean;
  level2Options?: Level2Option[];
  level3Customizations?: Level3Customization[];
  partNumber?: string;
}
