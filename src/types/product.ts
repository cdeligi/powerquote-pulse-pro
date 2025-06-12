
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

export interface BOMItem {
  id: string;
  product: Chassis | Card;
  quantity: number;
  slot?: number;
  configuration?: Record<string, any>;
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
}
