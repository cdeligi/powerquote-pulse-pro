/**
 * 2025 Qualitrol Corp. All rights reserved.
 */

import type { Level4RuntimePayload } from '@/types/level4';

// Base product interface with common fields
export interface BaseProduct {
  id: string;
  name: string;
  displayName?: string;  // Shorter, display-friendly name
  description: string;
  price: number;
  cost?: number;
  enabled: boolean;
  partNumber?: string;
  image?: string;
  productInfoUrl?: string;
  specifications?: {
    [key: string]: any;
  };
}

// Level 0: Asset Types (Power Transformer, GIS, Breaker, etc.)
export interface AssetType {
  id: string;
  name: string;
  enabled: boolean;
}

// Level 1: Main Product Categories (QTMS, etc.)
export interface Level1Product extends BaseProduct {
  type: string; // Made mandatory since code depends on it for branching
  asset_type_id?: string; // Links to AssetType table
  category?: string; // Optional internal category for organization
  customizations?: string[]; // For DGA products
  hasQuantitySelection?: boolean; // For PD couplers
  rackConfigurable?: boolean; // Whether this product supports rack configuration
}

// Level 2: Product Variants/Chassis (LTX, MTX, STX for QTMS)
export interface Level2Product extends BaseProduct {
  parentProductId: string; // Links to Level1Product (camelCase for frontend)
  parent_product_id?: string; // snake_case for database compatibility
  productInfoUrl?: string; // Maps to database column product_info_url
  parentProduct?: {      // Added for easy access to parent product details
    id: string;
    name: string;
    displayName?: string;
  };
  type?: string; // Deprecated: use chassisType instead - kept for backward compatibility
  chassisType?: string; // Chassis type: N/A, LTX, MTX, STX
  specifications?: {
    slots?: number;
    capacity?: string;
    [key: string]: any;
  };
}

// Level 3: Components/Cards/Options (Cards for chassis, accessories for others)
export interface Level3Product extends Omit<BaseProduct, 'partNumber'> {
  parent_product_id: string; // Links to Level2Product
  parentProductId?: string; // Backward compatibility alias
  parentProduct?: {      // Added for easy access to parent product details
    id: string;
    name: string;
    displayName?: string;
  };
  product_level: 3;
  type?: string; // Backward compatibility
  part_number_format?: string;
  partNumber?: string; // Backward compatibility
  requires_level4_config?: boolean; // Flag to enable Level 4 config
  has_level4?: boolean; // Alias for requires_level4_config
  sku?: string; // Backward compatibility
  displayName: string; // Explicitly include displayName as required
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

export interface Card extends Omit<Level3Product, 'enabled'> {
  enabled?: boolean;
  slotRequirement: number;
  compatibleChassis: string[];
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
  level?: 1 | 2 | 3 | 4;
  slot?: number;
  partNumber?: string;
  displayName?: string;
  configuration?: Record<string, any>;
  parentLevel2Id?: string;
  resolvedInfoUrl?: string;
  rackConfiguration?: {
    slots?: Array<{
      slot?: number;
      slotNumber?: number;
      cardName?: string;
      partNumber?: string;
      product?: {
        name?: string;
        partNumber?: string;
      };
    }>;
    [key: string]: any;
  };
  level2Options?: Level2Product[];
  level3Customizations?: Level3Customization[];
  slotAssignments?: Record<number, Level3Product>;
  level4Selections?: { [fieldId: string]: string };
  level4Config?: Level4RuntimePayload | {
    entries?: Array<{
      index?: number;
      value?: string;
      label?: string;
    }>;
    [key: string]: any;
  };
  isAccessory?: boolean;
  name?: string;
  description?: string;
  part_number?: string;
  unit_price?: number;
  unit_cost?: number;
  original_unit_price?: number;
  priceHistory?: Array<{
    timestamp: string;
    oldPrice: number;
    newPrice: number;
    reason: string;
  }>;
  total_price?: number;
  margin?: number;
  approved_unit_price?: number;
  price_adjustment_history?: any[];
  partNumberContext?: {
    pnConfig: any | null;
    codeMap: Record<string, any>;
  };
}

export type Product = Level1Product | Level2Product | Level3Product;