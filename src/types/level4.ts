
export interface Level4SharedOption {
  id: string;
  level4_configuration_id: string;
  label: string;
  value: string;
  display_order: number;
  created_at: string;
}

export interface Level4Configuration {
  id: string;
  level3_product_id: string;
  name: string;
  fields: Level4ConfigurationField[];
  shared_options?: Level4SharedOption[];
  default_option_id?: string;
}

export interface Level4ConfigurationField {
  id: string;
  level4_configuration_id: string;
  label: string;
  info_url?: string;
  field_type: 'dropdown';
  display_order: number;
  dropdown_options?: Level4DropdownOption[];
  default_option_id?: string;
}

export interface Level4DropdownOption {
  id: string;
  field_id: string;
  value: string;
  label: string;
  is_default: boolean;
}
