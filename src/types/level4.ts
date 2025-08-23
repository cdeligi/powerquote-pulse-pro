// Level 4 Configuration System Types
// Remodeled to support Option 1 (variable inputs) and Option 2 (fixed inputs)

export type Level4TemplateType = 'OPTION_1' | 'OPTION_2';

export interface Level4Configuration {
  id: string;
  level3_product_id: string;
  template_type: Level4TemplateType;
  field_label: string;
  info_url?: string | null;
  max_inputs?: number | null;   // for OPTION_1
  fixed_inputs?: number | null; // for OPTION_2
  options: Level4Option[];
  created_at?: string;
  updated_at?: string;
}

export interface Level4Option {
  id: string;
  level4_configuration_id: string;
  label: string;
  value: string;
  display_order: number;
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Level4SelectionEntry {
  index: number;  // 0-based
  value: string;  // matches an option.value
}

export interface Level4BOMValue {
  id: string;
  bom_item_id: string;
  level4_configuration_id: string;
  template_type: Level4TemplateType;
  entries: Level4SelectionEntry[]; // final user choices
  created_at?: string;
  updated_at?: string;
}

// Helper function signature
export interface Level4DisplayOptions {
  config: Level4Configuration;
  value: Level4BOMValue;
}

// Runtime payload for BOM integration
export interface Level4RuntimePayload {
  bomItemId: string;  // Added for BOM item tracking
  configuration_id: string;
  template_type: Level4TemplateType;
  entries: Level4SelectionEntry[];
}