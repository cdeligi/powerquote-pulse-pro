
/**
 * © 2025 Qualitrol Corp. All rights reserved.
 * Confidential and proprietary. Unauthorized copying or distribution is prohibited.
 */

export interface MarginSettings {
  marginLimit: number;
}

export interface UserSession {
  id: string;
  user_id: string;
  session_token: string;
  ip_address: string | null;
  user_agent: string | null;
  device_info: Record<string, any>;
  location_data: Record<string, any>;
  created_at: string;
  last_activity: string;
  expires_at: string | null;
  is_active: boolean;
  revoked_at: string | null;
  revoked_by: string | null;
}

export interface PriceOverride {
  item_id: string;
  original_price: number;
  new_price: number;
  reason: string;
  timestamp: string;
  approved_by: string;
}

export interface FinanceApprovalRequirement {
  required: boolean;
  reason: string;
  current_margin: number;
  minimum_margin: number;
}
