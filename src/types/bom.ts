// Base types
export interface Product {
  id: string;
  name: string;
  partNumber: string;
  description?: string;
  price?: number;
  cost?: number;
  type?: string;
  product_level?: number;
  parent_product_id?: string;
  parentProductId?: string;
  specifications?: Record<string, any>;
  customizations?: string[];
  hasQuantitySelection?: boolean;
  requires_level4_config?: boolean;
  part_number_format?: string;
  productInfoUrl?: string;
  displayName?: string;
  enabled?: boolean;
}

export interface Level1Product extends Product {
  product_level: 1;
  level2Options?: Level2Product[];
}

export interface Level2Product extends Product {
  product_level: 2;
  parentProductId: string;
  chassisType?: string;
  specifications: {
    slots?: number;
    capacity?: string;
    height?: number;
    [key: string]: any;
  };
}

export interface Level3Product extends Product {
  product_level: 3;
  parentProductId: string;
  slot_span?: number;
  is_standard?: boolean;
  standard_position?: number;
  color?: string;
}

export interface Level3Customization {
  id: string;
  name: string;
  value: any;
  options?: Array<{ value: any; label: string }>;
  type: 'text' | 'number' | 'select' | 'checkbox';
}

export interface BaseBOMItem {
  id: string;
  product: Product;
  quantity: number;
  enabled: boolean;
  partNumber?: string;
  displayName?: string;
  configuration?: Record<string, any>;
  level4Config?: any;
  slot?: number;
  isAccessory?: boolean;
  level3Customizations?: Record<string, any>;
  slotAssignments?: Record<number, any>;
  parentProduct?: Product | null;
  customPartNumber?: string;
  original_unit_price?: number;
  priceHistory?: Array<{
    timestamp: string;
    oldPrice: number;
    newPrice: number;
    reason: string;
  }>;
}

export interface ExtendedBOMItem extends BaseBOMItem {
  parentProduct: Level1Product | Level2Product | null;
  configuration: Record<string, any>;
}

export type BOMItem = ExtendedBOMItem;

export interface BOMBuilderProps {
  onBOMUpdate: (items: ExtendedBOMItem[]) => void;
  canSeePrices: boolean;
  canSeeCosts?: boolean;
}

export interface Level4RuntimePayload {
  configuration: Record<string, any>;
  customPartNumber?: string;
}

export interface ConsolidatedQTMS {
  partNumber: string;
  description: string;
  configuration: Record<string, any>;
  name?: string;
  price?: number;
  id?: string;
}

// Helper type for slot assignments
export type SlotAssignment = Record<number, Level3Product>;
