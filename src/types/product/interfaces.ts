/**
 * 2025 Qualitrol Corp. All rights reserved.
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
  asset_type_id?: string; // Links to AssetType table
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
  rackConfigurable?: boolean; // Whether this product supports rack configuration
}

// Level 2: Product Variants/Chassis (LTX, MTX, STX for QTMS)
export interface Level2Product {
  id: string;
  name: string;
  parentProductId: string; // Links to Level1Product
  type?: string; // Deprecated: use chassisType instead - kept for backward compatibility
  description: string;
  price: number;
  cost?: number;
  enabled: boolean;
  chassisType?: string; // Chassis type: N/A, LTX, MTX, STX
  specifications?: {
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
  parent_product_id: string; // Links to Level2Product
  parentProductId?: string; // Backward compatibility
  description: string;
  price: number;
  cost?: number;
  enabled: boolean;
  product_level: 3;
  part_number_format?: string;
  partNumber?: string;
  requires_level4_config?: boolean; // Flag to enable Level 4 config
  productInfoUrl?: string;
  type?: string; // For backward compatibility
  specifications?: Record<string, any>;
  image?: string;
  sku?: string;
}

// Level 4: Dynamic Product Configuration
export interface Level4Configuration {
  id: string;
  level3_product_id: string;
  name: string;
  fields: Level4ConfigurationField[];
}

export interface Level4ConfigurationField {
  id: string;
  level4_configuration_id: string;
  label: string;
  info_url?: string;
  field_type: 'dropdown'; // Initially just dropdown
  display_order: number;
  dropdown_options?: Level4DropdownOption[];
  default_option_id?: string;
}

export interface Level4DropdownOption {
  id: string;
  field_id: string;
  value: string; // The value to be stored
  label: string; // The value to be displayed
  is_default: boolean;
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
  type: string; // Keep for backward compatibility
  height: string;
  slots: number;
  productInfoUrl?: string;
}

export interface Card extends Level3Product {
  slotRequirement: number;
  compatibleChassis: string[];
  enabled: boolean; // Make required to match Level3Product
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
  slotAssignments?: Record<number, Level3Product>; // For chassis configurations
  level4Selections?: { [fieldId: string]: string }; // fieldId: optionValue
  
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

export type Product = Level1Product | Level2Product | Level3Product;
