
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
    outputs?: string[];
    protocols?: string[];
    channels?: number;
    inputTypes?: string[];
    [key: string]: any;
  };
  partNumber?: string;
  image?: string;
  productInfoUrl?: string;
}

// Level 4: Product Configurations (Sensor configs, specific customizations)
export interface Level4Product {
  id: string;
  name: string;
  parentProductId: string; // Links to Level3Product
  description: string;
  configurationType: 'dropdown' | 'multiline';
  price: number;
  cost?: number;
  enabled: boolean;
  options: Level4ConfigurationOption[];
}

export interface Level4ConfigurationOption {
  id: string;
  level4ProductId: string;
  optionKey: string; // For dropdown: the value; For multiline: the field name
  optionValue: string; // For dropdown: display name; For multiline: the description
  displayOrder: number;
  enabled: boolean;
}

// Type unions for backward compatibility
export type ProductType = 'QTMS' | 'TM8' | 'TM3' | 'TM1' | 'QPDM';
export type Level2ProductType = 'LTX' | 'MTX' | 'STX' | 'CalGas' | 'Standard' | 'Moisture';

// Type management interfaces
export interface ProductTypeConfig {
  id: string;
  name: string;
  level: 1 | 2 | 3 | 4;
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
  id?: string;
  product: Product;
  quantity: number;
  enabled: boolean;
  slot?: number;
  partNumber?: string;
  configuration?: Record<string, any>;
  level2Options?: Level2Product[];
  level3Customizations?: Level3Customization[];
  level4Configurations?: Level4Product[];
  
  // Additional properties for admin quote management
  name?: string;
  description?: string;
  part_number?: string;
  unit_price?: number;
  unit_cost?: number;
  total_price?: number;
  margin?: number;
  original_unit_price?: number;
  approved_unit_price?: number;
  price_adjustment_history?: any[];
}

export type Product = Level1Product | Level2Product | Level3Product | Level4Product;
