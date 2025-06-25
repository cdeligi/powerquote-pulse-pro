export interface Level1Product {
  id: string;
  name: string;
  description?: string;
  category?: string;
  partNumber?: string;
  price?: number;
  enabled: boolean;
  type?: 'QTMS' | 'DGA' | 'Partial Discharge' | string;
  configurationOptions?: any;
}

export interface Level2Product {
  id: string;
  name: string;
  description?: string;
  price?: number;
  enabled: boolean;
  requires_configuration?: boolean;
  slots?: number;
  partNumber?: string;
  type?: 'Chassis' | 'Card' | string;
}

export interface Level3Product {
  id: string;
  name: string;
  description?: string;
  price?: number;
  enabled: boolean;
  requires_configuration?: boolean;
  partNumber?: string;
  type?: 'Card' | string;
}

export interface Level3Customization {
  id: string;
  name: string;
  description?: string;
  options: string[];
}

export interface BOMItem {
  id: string;
  product: Level1Product | Level2Product | Level3Product;
  name?: string; // Add name property
  description?: string; // Add description property
  quantity: number;
  unitPrice?: number; // Add unitPrice property
  unit_price?: number; // Keep existing property for compatibility
  unit_cost?: number;
  total_price?: number;
  total_cost?: number;
  margin?: number;
  partNumber?: string;
  slot?: number;
  enabled: boolean;
  level3Customizations?: Level3Customization[];
  configuration?: Record<string, any>;
}
