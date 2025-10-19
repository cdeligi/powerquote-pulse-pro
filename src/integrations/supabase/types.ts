export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      admin_notifications: {
        Row: {
          created_at: string | null
          id: string
          message_content: Json | null
          notification_type: string
          quote_id: string
          sent_to: string[]
        }
        Insert: {
          created_at?: string | null
          id?: string
          message_content?: Json | null
          notification_type?: string
          quote_id: string
          sent_to?: string[]
        }
        Update: {
          created_at?: string | null
          id?: string
          message_content?: Json | null
          notification_type?: string
          quote_id?: string
          sent_to?: string[]
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "app_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_types: {
        Row: {
          created_at: string | null
          description: string | null
          enabled: boolean | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          id: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      bom_items: {
        Row: {
          approved_unit_price: number | null
          configuration_data: Json | null
          created_at: string
          description: string | null
          id: string
          margin: number
          name: string
          original_unit_price: number | null
          parent_quote_item_id: string | null
          part_number: string | null
          price_adjustment_history: Json | null
          product_id: string
          product_type: string | null
          quantity: number
          quote_id: string
          total_cost: number
          total_price: number
          unit_cost: number
          unit_price: number
        }
        Insert: {
          approved_unit_price?: number | null
          configuration_data?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          margin?: number
          name: string
          original_unit_price?: number | null
          parent_quote_item_id?: string | null
          part_number?: string | null
          price_adjustment_history?: Json | null
          product_id: string
          product_type?: string | null
          quantity: number
          quote_id: string
          total_cost?: number
          total_price: number
          unit_cost?: number
          unit_price: number
        }
        Update: {
          approved_unit_price?: number | null
          configuration_data?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          margin?: number
          name?: string
          original_unit_price?: number | null
          parent_quote_item_id?: string | null
          part_number?: string | null
          price_adjustment_history?: Json | null
          product_id?: string
          product_type?: string | null
          quantity?: number
          quote_id?: string
          total_cost?: number
          total_price?: number
          unit_cost?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "bom_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      bom_level4_values: {
        Row: {
          bom_item_id: string
          created_at: string
          entries: Json
          id: string
          level4_config_id: string
          updated_at: string
        }
        Insert: {
          bom_item_id: string
          created_at?: string
          entries: Json
          id?: string
          level4_config_id: string
          updated_at?: string
        }
        Update: {
          bom_item_id?: string
          created_at?: string
          entries?: Json
          id?: string
          level4_config_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bom_level4_values_bom_item_id_fkey"
            columns: ["bom_item_id"]
            isOneToOne: false
            referencedRelation: "bom_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bom_level4_values_level4_config_id_fkey"
            columns: ["level4_config_id"]
            isOneToOne: false
            referencedRelation: "level4_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      chassis_configurations: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          layout_data: Json
          level2_product_id: string
          slot_mappings: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          layout_data?: Json
          level2_product_id: string
          slot_mappings?: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          layout_data?: Json
          level2_product_id?: string
          slot_mappings?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chassis_configurations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chassis_slot_options: {
        Row: {
          chassis_type_id: string
          created_at: string
          id: string
          level3_product_id: string
          slot_number: number
        }
        Insert: {
          chassis_type_id: string
          created_at?: string
          id?: string
          level3_product_id: string
          slot_number: number
        }
        Update: {
          chassis_type_id?: string
          created_at?: string
          id?: string
          level3_product_id?: string
          slot_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "chassis_slot_options_chassis_type_id_fkey"
            columns: ["chassis_type_id"]
            isOneToOne: false
            referencedRelation: "chassis_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chassis_slot_options_level3_product_id_fkey"
            columns: ["level3_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      chassis_types: {
        Row: {
          code: string
          created_at: string
          enabled: boolean
          id: string
          layout_rows: Json | null
          metadata: Json
          name: string
          total_slots: number
          updated_at: string
          visual_layout: Json | null
        }
        Insert: {
          code: string
          created_at?: string
          enabled?: boolean
          id?: string
          layout_rows?: Json | null
          metadata?: Json
          name: string
          total_slots: number
          updated_at?: string
          visual_layout?: Json | null
        }
        Update: {
          code?: string
          created_at?: string
          enabled?: boolean
          id?: string
          layout_rows?: Json | null
          metadata?: Json
          name?: string
          total_slots?: number
          updated_at?: string
          visual_layout?: Json | null
        }
        Relationships: []
      }
      departments: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string | null
        }
        Relationships: []
      }
      email_audit_log: {
        Row: {
          body: string
          created_at: string
          error_message: string | null
          id: string
          quote_id: string
          recipient_email: string
          recipient_name: string | null
          sent_at: string | null
          status: string
          subject: string
          template_type: string
        }
        Insert: {
          body: string
          created_at?: string
          error_message?: string | null
          id?: string
          quote_id: string
          recipient_email: string
          recipient_name?: string | null
          sent_at?: string | null
          status: string
          subject: string
          template_type: string
        }
        Update: {
          body?: string
          created_at?: string
          error_message?: string | null
          id?: string
          quote_id?: string
          recipient_email?: string
          recipient_name?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          template_type?: string
        }
        Relationships: []
      }
      email_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_encrypted: boolean | null
          setting_key: string
          setting_value: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_encrypted?: boolean | null
          setting_key: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_encrypted?: boolean | null
          setting_key?: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body_template: string
          created_at: string
          enabled: boolean | null
          id: string
          subject_template: string
          template_type: string
          updated_at: string
          updated_by: string | null
          variables: Json | null
        }
        Insert: {
          body_template: string
          created_at?: string
          enabled?: boolean | null
          id?: string
          subject_template: string
          template_type: string
          updated_at?: string
          updated_by?: string | null
          variables?: Json | null
        }
        Update: {
          body_template?: string
          created_at?: string
          enabled?: boolean | null
          id?: string
          subject_template?: string
          template_type?: string
          updated_at?: string
          updated_by?: string | null
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_rates: {
        Row: {
          base_currency: string
          created_at: string | null
          error_message: string | null
          fetched_at: string
          id: string
          rates: Json
          success: boolean | null
        }
        Insert: {
          base_currency?: string
          created_at?: string | null
          error_message?: string | null
          fetched_at?: string
          id?: string
          rates: Json
          success?: boolean | null
        }
        Update: {
          base_currency?: string
          created_at?: string | null
          error_message?: string | null
          fetched_at?: string
          id?: string
          rates?: Json
          success?: boolean | null
        }
        Relationships: []
      }
      features: {
        Row: {
          created_at: string | null
          description: string
          key: string
          label: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          key: string
          label: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          key?: string
          label?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      legal_pages: {
        Row: {
          content: string
          created_at: string | null
          slug: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          content?: string
          created_at?: string | null
          slug: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          slug?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_pages_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      level1_level2_relationships: {
        Row: {
          created_at: string
          id: string
          level1_product_id: string
          level2_product_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          level1_product_id: string
          level2_product_id: string
        }
        Update: {
          created_at?: string
          id?: string
          level1_product_id?: string
          level2_product_id?: string
        }
        Relationships: []
      }
      level2: {
        Row: {
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      level2_level3_relationships: {
        Row: {
          created_at: string
          id: string
          level2_product_id: string
          level3_product_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          level2_product_id: string
          level3_product_id: string
        }
        Update: {
          created_at?: string
          id?: string
          level2_product_id?: string
          level3_product_id?: string
        }
        Relationships: []
      }
      level3_level4_relationships: {
        Row: {
          created_at: string
          id: string
          level3_product_id: string
          level4_product_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          level3_product_id: string
          level4_product_id: string
        }
        Update: {
          created_at?: string
          id?: string
          level3_product_id?: string
          level4_product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_level3_relationship"
            columns: ["level3_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_level4_relationship"
            columns: ["level4_product_id"]
            isOneToOne: false
            referencedRelation: "level4_products"
            referencedColumns: ["id"]
          },
        ]
      }
      level4_configs: {
        Row: {
          created_at: string
          field_label: string
          fixed_number_of_inputs: number | null
          id: string
          mode: string
          options: Json
          product_id: string
          updated_at: string
          variable_max_inputs: number | null
        }
        Insert: {
          created_at?: string
          field_label: string
          fixed_number_of_inputs?: number | null
          id?: string
          mode: string
          options?: Json
          product_id: string
          updated_at?: string
          variable_max_inputs?: number | null
        }
        Update: {
          created_at?: string
          field_label?: string
          fixed_number_of_inputs?: number | null
          id?: string
          mode?: string
          options?: Json
          product_id?: string
          updated_at?: string
          variable_max_inputs?: number | null
        }
        Relationships: []
      }
      level4_configuration_options: {
        Row: {
          created_at: string
          display_order: number | null
          enabled: boolean | null
          id: string
          info_url: string | null
          level4_product_id: string
          metadata: Json | null
          option_key: string
          option_value: string
          part_number: string | null
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          enabled?: boolean | null
          id?: string
          info_url?: string | null
          level4_product_id: string
          metadata?: Json | null
          option_key: string
          option_value: string
          part_number?: string | null
        }
        Update: {
          created_at?: string
          display_order?: number | null
          enabled?: boolean | null
          id?: string
          info_url?: string | null
          level4_product_id?: string
          metadata?: Json | null
          option_key?: string
          option_value?: string
          part_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_level4_options_product"
            columns: ["level4_product_id"]
            isOneToOne: false
            referencedRelation: "level4_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "level4_configuration_options_level4_product_id_fkey"
            columns: ["level4_product_id"]
            isOneToOne: false
            referencedRelation: "level4_products"
            referencedColumns: ["id"]
          },
        ]
      }
      level4_product_configs: {
        Row: {
          config_data: Json
          created_at: string
          id: string
          level4_product_id: string
          updated_at: string
        }
        Insert: {
          config_data?: Json
          created_at?: string
          id?: string
          level4_product_id: string
          updated_at?: string
        }
        Update: {
          config_data?: Json
          created_at?: string
          id?: string
          level4_product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "level4_product_configs_level4_product_id_fkey"
            columns: ["level4_product_id"]
            isOneToOne: true
            referencedRelation: "level4_products"
            referencedColumns: ["id"]
          },
        ]
      }
      level4_products: {
        Row: {
          configuration_type: string
          cost: number | null
          created_at: string
          description: string | null
          enabled: boolean | null
          id: string
          name: string
          options: Json
          parent_product_id: string
          price: number | null
          updated_at: string
        }
        Insert: {
          configuration_type?: string
          cost?: number | null
          created_at?: string
          description?: string | null
          enabled?: boolean | null
          id: string
          name: string
          options?: Json
          parent_product_id: string
          price?: number | null
          updated_at?: string
        }
        Update: {
          configuration_type?: string
          cost?: number | null
          created_at?: string
          description?: string | null
          enabled?: boolean | null
          id?: string
          name?: string
          options?: Json
          parent_product_id?: string
          price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_level4_parent_product"
            columns: ["parent_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      margin_thresholds: {
        Row: {
          created_at: string | null
          id: string
          minimum_margin_percent: number
          requires_approval: boolean | null
          threshold_name: string
          updated_at: string | null
          warning_message: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          minimum_margin_percent: number
          requires_approval?: boolean | null
          threshold_name: string
          updated_at?: string | null
          warning_message?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          minimum_margin_percent?: number
          requires_approval?: boolean | null
          threshold_name?: string
          updated_at?: string | null
          warning_message?: string | null
        }
        Relationships: []
      }
      part_number_codes: {
        Row: {
          color: string | null
          created_at: string
          designated_only: boolean
          designated_positions: number[]
          exclusive_in_slots: boolean
          id: string
          is_standard: boolean
          level2_product_id: string | null
          level3_product_id: string
          notes: string | null
          outside_chassis: boolean
          slot_span: number
          standard_position: number | null
          template: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          designated_only?: boolean
          designated_positions?: number[]
          exclusive_in_slots?: boolean
          id?: string
          is_standard?: boolean
          level2_product_id?: string | null
          level3_product_id: string
          notes?: string | null
          outside_chassis?: boolean
          slot_span?: number
          standard_position?: number | null
          template: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          designated_only?: boolean
          designated_positions?: number[]
          exclusive_in_slots?: boolean
          id?: string
          is_standard?: boolean
          level2_product_id?: string | null
          level3_product_id?: string
          notes?: string | null
          outside_chassis?: boolean
          slot_span?: number
          standard_position?: number | null
          template?: string
          updated_at?: string
        }
        Relationships: []
      }
      part_number_configs: {
        Row: {
          color: string | null
          created_at: string
          designated_only: boolean
          designated_positions: number[]
          exclusive_in_slots: boolean
          id: string
          level2_product_id: string
          notes: string | null
          outside_chassis: boolean
          prefix: string
          slot_count: number
          slot_placeholder: string
          slot_span: number
          standard_position: number | null
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          designated_only?: boolean
          designated_positions?: number[]
          exclusive_in_slots?: boolean
          id?: string
          level2_product_id: string
          notes?: string | null
          outside_chassis?: boolean
          prefix: string
          slot_count: number
          slot_placeholder?: string
          slot_span?: number
          standard_position?: number | null
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          designated_only?: boolean
          designated_positions?: number[]
          exclusive_in_slots?: boolean
          id?: string
          level2_product_id?: string
          notes?: string | null
          outside_chassis?: boolean
          prefix?: string
          slot_count?: number
          slot_placeholder?: string
          slot_span?: number
          standard_position?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          asset_type_id: string | null
          category: string | null
          chassis_type: string | null
          code: string | null
          cost: number | null
          created_at: string
          description: string | null
          display_name: string | null
          enabled: boolean | null
          has_level4: boolean
          id: string
          image: string | null
          image_url: string | null
          is_active: boolean
          name: string
          parent_product_id: string | null
          part_number: string | null
          price: number | null
          product_info_url: string | null
          product_level: number | null
          rack_configurable: boolean | null
          requires_level4_config: boolean | null
          slot_requirement: number | null
          specifications: Json | null
          subcategory: string | null
          updated_at: string
        }
        Insert: {
          asset_type_id?: string | null
          category?: string | null
          chassis_type?: string | null
          code?: string | null
          cost?: number | null
          created_at?: string
          description?: string | null
          display_name?: string | null
          enabled?: boolean | null
          has_level4?: boolean
          id: string
          image?: string | null
          image_url?: string | null
          is_active?: boolean
          name: string
          parent_product_id?: string | null
          part_number?: string | null
          price?: number | null
          product_info_url?: string | null
          product_level?: number | null
          rack_configurable?: boolean | null
          requires_level4_config?: boolean | null
          slot_requirement?: number | null
          specifications?: Json | null
          subcategory?: string | null
          updated_at?: string
        }
        Update: {
          asset_type_id?: string | null
          category?: string | null
          chassis_type?: string | null
          code?: string | null
          cost?: number | null
          created_at?: string
          description?: string | null
          display_name?: string | null
          enabled?: boolean | null
          has_level4?: boolean
          id?: string
          image?: string | null
          image_url?: string | null
          is_active?: boolean
          name?: string
          parent_product_id?: string | null
          part_number?: string | null
          price?: number | null
          product_info_url?: string | null
          product_level?: number | null
          rack_configurable?: boolean | null
          requires_level4_config?: boolean | null
          slot_requirement?: number | null
          specifications?: Json | null
          subcategory?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_asset_type_id_fkey"
            columns: ["asset_type_id"]
            isOneToOne: false
            referencedRelation: "asset_types"
            referencedColumns: ["id"]
          },
        ]
      }
      products_lvl1: {
        Row: {
          cost: number | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          price: number | null
          updated_at: string | null
        }
        Insert: {
          cost?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          price?: number | null
          updated_at?: string | null
        }
        Update: {
          cost?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      products_lvl2: {
        Row: {
          cost: number | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          parent_product_id: string | null
          price: number | null
          slot_mapping: Json | null
          updated_at: string | null
        }
        Insert: {
          cost?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_product_id?: string | null
          price?: number | null
          slot_mapping?: Json | null
          updated_at?: string | null
        }
        Update: {
          cost?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_product_id?: string | null
          price?: number | null
          slot_mapping?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_lvl2_parent_product_id_fkey"
            columns: ["parent_product_id"]
            isOneToOne: false
            referencedRelation: "products_lvl1"
            referencedColumns: ["id"]
          },
        ]
      }
      products_lvl3: {
        Row: {
          cost: number | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          parent_product_id: string | null
          price: number | null
          updated_at: string | null
        }
        Insert: {
          cost?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_product_id?: string | null
          price?: number | null
          updated_at?: string | null
        }
        Update: {
          cost?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_product_id?: string | null
          price?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_lvl3_parent_product_id_fkey"
            columns: ["parent_product_id"]
            isOneToOne: false
            referencedRelation: "products_lvl2"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          business_justification: string | null
          company_name: string | null
          created_at: string
          department: string | null
          email: string
          first_name: string | null
          id: string
          job_title: string | null
          last_name: string | null
          manager_email: string | null
          phone_number: string | null
          role: string
          updated_at: string
          user_status: string | null
        }
        Insert: {
          business_justification?: string | null
          company_name?: string | null
          created_at?: string
          department?: string | null
          email: string
          first_name?: string | null
          id: string
          job_title?: string | null
          last_name?: string | null
          manager_email?: string | null
          phone_number?: string | null
          role?: string
          updated_at?: string
          user_status?: string | null
        }
        Update: {
          business_justification?: string | null
          company_name?: string | null
          created_at?: string
          department?: string | null
          email?: string
          first_name?: string | null
          id?: string
          job_title?: string | null
          last_name?: string | null
          manager_email?: string | null
          phone_number?: string | null
          role?: string
          updated_at?: string
          user_status?: string | null
        }
        Relationships: []
      }
      quote_analytics: {
        Row: {
          created_at: string | null
          id: string
          month: string
          quote_count: number
          status: string
          total_cost: number | null
          total_value: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          month: string
          quote_count?: number
          status: string
          total_cost?: number | null
          total_value?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          month?: string
          quote_count?: number
          status?: string
          total_cost?: number | null
          total_value?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      quote_fields: {
        Row: {
          created_at: string
          display_order: number | null
          enabled: boolean
          id: string
          conditional_logic: Json | null
          include_in_pdf: boolean | null
          label: string
          options: Json | null
          required: boolean
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          enabled?: boolean
          id: string
          conditional_logic?: Json | null
          include_in_pdf?: boolean | null
          label: string
          options?: Json | null
          required?: boolean
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          enabled?: boolean
          id?: string
          conditional_logic?: Json | null
          include_in_pdf?: boolean | null
          label?: string
          options?: Json | null
          required?: boolean
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      quote_shares: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          permission_level: string
          quote_id: string
          shared_by: string
          shared_with: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          permission_level?: string
          quote_id: string
          shared_by: string
          shared_with: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          permission_level?: string
          quote_id?: string
          shared_by?: string
          shared_with?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_shares_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_shares_shared_with_fkey"
            columns: ["shared_with"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          app_version: string | null
          approval_notes: string | null
          approved_discount: number | null
          approved_prices: Json | null
          counter_offers: Json | null
          created_at: string
          currency: string
          customer_name: string
          discount_justification: string | null
          discounted_margin: number
          discounted_value: number
          display_number: number
          draft_bom: Json | null
          exchange_rate_metadata: Json | null
          gross_profit: number
          id: string
          is_rep_involved: boolean
          locked_at: string | null
          oracle_customer_id: string
          original_margin: number
          original_prices: Json | null
          original_quote_value: number
          original_submitted_at: string | null
          payment_terms: string
          price_adjustments: Json | null
          price_override_history: Json | null
          priority: string
          quote_fields: Json | null
          rejection_reason: string | null
          requested_discount: number
          requires_finance_approval: boolean | null
          reviewed_at: string | null
          reviewed_by: string | null
          sfdc_opportunity: string
          shipping_terms: string
          source_quote_id: string | null
          status: string
          submitted_at: string | null
          submitted_by_email: string | null
          submitted_by_name: string | null
          total_cost: number
          updated_at: string
          user_id: string
        }
        Insert: {
          app_version?: string | null
          approval_notes?: string | null
          approved_discount?: number | null
          approved_prices?: Json | null
          counter_offers?: Json | null
          created_at?: string
          currency?: string
          customer_name: string
          discount_justification?: string | null
          discounted_margin: number
          discounted_value: number
          display_number?: number
          draft_bom?: Json | null
          exchange_rate_metadata?: Json | null
          gross_profit: number
          id: string
          is_rep_involved?: boolean
          locked_at?: string | null
          oracle_customer_id: string
          original_margin: number
          original_prices?: Json | null
          original_quote_value: number
          original_submitted_at?: string | null
          payment_terms?: string
          price_adjustments?: Json | null
          price_override_history?: Json | null
          priority?: string
          quote_fields?: Json | null
          rejection_reason?: string | null
          requested_discount: number
          requires_finance_approval?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sfdc_opportunity: string
          shipping_terms?: string
          source_quote_id?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by_email?: string | null
          submitted_by_name?: string | null
          total_cost: number
          updated_at?: string
          user_id: string
        }
        Update: {
          app_version?: string | null
          approval_notes?: string | null
          approved_discount?: number | null
          approved_prices?: Json | null
          counter_offers?: Json | null
          created_at?: string
          currency?: string
          customer_name?: string
          discount_justification?: string | null
          discounted_margin?: number
          discounted_value?: number
          display_number?: number
          draft_bom?: Json | null
          exchange_rate_metadata?: Json | null
          gross_profit?: number
          id?: string
          is_rep_involved?: boolean
          locked_at?: string | null
          oracle_customer_id?: string
          original_margin?: number
          original_prices?: Json | null
          original_quote_value?: number
          original_submitted_at?: string | null
          payment_terms?: string
          price_adjustments?: Json | null
          price_override_history?: Json | null
          priority?: string
          quote_fields?: Json | null
          rejection_reason?: string | null
          requested_discount?: number
          requires_finance_approval?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sfdc_opportunity?: string
          shipping_terms?: string
          source_quote_id?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by_email?: string | null
          submitted_by_name?: string | null
          total_cost?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_feature_defaults: {
        Row: {
          allowed: boolean
          created_at: string | null
          feature_key: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          allowed?: boolean
          created_at?: string | null
          feature_key: string
          id?: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          allowed?: boolean
          created_at?: string | null
          feature_key?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: [
          {
            foreignKeyName: "role_feature_defaults_feature_key_fkey"
            columns: ["feature_key"]
            isOneToOne: false
            referencedRelation: "features"
            referencedColumns: ["key"]
          },
        ]
      }
      security_events: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: string | null
          severity: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          severity?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          severity?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_feature_overrides: {
        Row: {
          allowed: boolean | null
          created_at: string | null
          feature_key: string
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          allowed?: boolean | null
          created_at?: string | null
          feature_key: string
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          allowed?: boolean | null
          created_at?: string | null
          feature_key?: string
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_feature_overrides_feature_key_fkey"
            columns: ["feature_key"]
            isOneToOne: false
            referencedRelation: "features"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "user_feature_overrides_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_login_attempts: {
        Row: {
          created_at: string | null
          email: string
          id: string
          ip_address: string | null
          success: boolean | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          ip_address?: string | null
          success?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          ip_address?: string | null
          success?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          created_at: string
          enabled: boolean
          expires_at: string | null
          granted_by: string
          id: string
          permission_type: string
          resource_id: string | null
          resource_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          expires_at?: string | null
          granted_by: string
          id?: string
          permission_type: string
          resource_id?: string | null
          resource_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          expires_at?: string | null
          granted_by?: string
          id?: string
          permission_type?: string
          resource_id?: string | null
          resource_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_quote_counters: {
        Row: {
          created_at: string
          current_counter: number
          id: string
          last_finalized_counter: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_counter?: number
          id?: string
          last_finalized_counter?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_counter?: number
          id?: string
          last_finalized_counter?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_quote_counters_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_registration_requests: {
        Row: {
          agreed_to_privacy_policy: boolean
          agreed_to_terms: boolean
          business_justification: string
          company_name: string
          created_at: string
          department: string
          email: string
          first_name: string
          id: string
          ip_address: string
          job_title: string
          last_name: string
          manager_email: string
          phone_number: string | null
          rejection_reason: string | null
          requested_role: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_agent: string
        }
        Insert: {
          agreed_to_privacy_policy?: boolean
          agreed_to_terms?: boolean
          business_justification: string
          company_name: string
          created_at?: string
          department: string
          email: string
          first_name: string
          id: string
          ip_address: string
          job_title: string
          last_name: string
          manager_email: string
          phone_number?: string | null
          rejection_reason?: string | null
          requested_role: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_agent: string
        }
        Update: {
          agreed_to_privacy_policy?: boolean
          agreed_to_terms?: boolean
          business_justification?: string
          company_name?: string
          created_at?: string
          department?: string
          email?: string
          first_name?: string
          id?: string
          ip_address?: string
          job_title?: string
          last_name?: string
          manager_email?: string
          phone_number?: string | null
          rejection_reason?: string | null
          requested_role?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_agent?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_registration_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_requests: {
        Row: {
          business_justification: string | null
          company_name: string | null
          department: string | null
          email: string
          first_name: string | null
          full_name: string | null
          id: string
          ip_address: string | null
          job_title: string | null
          last_name: string | null
          manager_email: string | null
          phone_number: string | null
          processed_at: string | null
          processed_by: string | null
          rejection_reason: string | null
          requested_at: string | null
          requested_role: string
          status: string | null
          user_agent: string | null
        }
        Insert: {
          business_justification?: string | null
          company_name?: string | null
          department?: string | null
          email: string
          first_name?: string | null
          full_name?: string | null
          id?: string
          ip_address?: string | null
          job_title?: string | null
          last_name?: string | null
          manager_email?: string | null
          phone_number?: string | null
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          requested_at?: string | null
          requested_role?: string
          status?: string | null
          user_agent?: string | null
        }
        Update: {
          business_justification?: string | null
          company_name?: string | null
          department?: string | null
          email?: string
          first_name?: string | null
          full_name?: string | null
          id?: string
          ip_address?: string | null
          job_title?: string | null
          last_name?: string | null
          manager_email?: string | null
          phone_number?: string | null
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          requested_at?: string | null
          requested_role?: string
          status?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_requests_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          browser_fingerprint: string | null
          created_at: string | null
          device_info: Json | null
          event: string | null
          id: string
          ip_address: string | null
          is_active: boolean | null
          last_activity: string | null
          location: Json | null
          location_data: Json | null
          revoked_at: string | null
          revoked_reason: string | null
          screen_resolution: string | null
          session_token: string | null
          timezone: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          browser_fingerprint?: string | null
          created_at?: string | null
          device_info?: Json | null
          event?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_activity?: string | null
          location?: Json | null
          location_data?: Json | null
          revoked_at?: string | null
          revoked_reason?: string | null
          screen_resolution?: string | null
          session_token?: string | null
          timezone?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          browser_fingerprint?: string | null
          created_at?: string | null
          device_info?: Json | null
          event?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_activity?: string | null
          location?: Json | null
          location_data?: Json | null
          revoked_at?: string | null
          revoked_reason?: string | null
          screen_resolution?: string | null
          session_token?: string | null
          timezone?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_create_user: {
        Args: {
          p_department?: string
          p_email: string
          p_first_name: string
          p_last_name: string
          p_password: string
          p_role: string
        }
        Returns: Json
      }
      admin_list_users: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          department: string
          email: string
          first_name: string
          id: string
          last_name: string
          role: string
          updated_at: string
          user_status: string
        }[]
      }
      admin_update_user_status: {
        Args: { p_status: string; p_user_id: string }
        Returns: Json
      }
      array_all_positive: {
        Args: { arr: number[] }
        Returns: boolean
      }
      calculate_bom_total_cost: {
        Args: { quote_id_param: string }
        Returns: number
      }
      clone_quote: {
        Args: { new_user_id: string; source_quote_id: string }
        Returns: string
      }
      create_user: {
        Args: {
          department: string
          email: string
          first_name: string
          last_name: string
          password: string
          role: string
        }
        Returns: string
      }
      deactivate_user: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      execute_sql: {
        Args: { query: string }
        Returns: Json
      }
      finalize_draft_quote_id: {
        Args: { draft_quote_id: string }
        Returns: string
      }
      generate_quote_id: {
        Args: { is_draft?: boolean; user_email: string }
        Returns: string
      }
      get_admin_user_ids: {
        Args: Record<PropertyKey, never>
        Returns: string[]
      }
      reload_postgrest_schema: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      get_dga_products: {
        Args: Record<PropertyKey, never>
        Returns: {
          category: string
          cost: number
          description: string
          enabled: boolean
          id: string
          image_url: string
          name: string
          parent_product_id: string
          part_number: string
          price: number
          product_info_url: string
          specifications: Json
          subcategory: string
        }[]
      }
      get_level1_products_with_asset_types: {
        Args: Record<PropertyKey, never>
        Returns: {
          asset_type_id: string
          asset_type_name: string
          category: string
          cost: number
          description: string
          enabled: boolean
          id: string
          image_url: string
          name: string
          part_number: string
          price: number
          product_info_url: string
          specifications: Json
          subcategory: string
        }[]
      }
      get_level2_products_by_parent: {
        Args: { parent_id: string }
        Returns: {
          category: string
          chassis_type: string
          cost: number
          description: string
          enabled: boolean
          id: string
          image_url: string
          name: string
          parent_product_id: string
          part_number: string
          price: number
          product_info_url: string
          specifications: Json
          subcategory: string
        }[]
      }
      get_level2_products_for_category: {
        Args: { category_filter: string }
        Returns: {
          category: string
          chassis_type: string
          cost: number
          description: string
          enabled: boolean
          id: string
          image_url: string
          name: string
          parent_product_id: string
          part_number: string
          price: number
          product_info_url: string
          specifications: Json
          subcategory: string
        }[]
      }
      get_pd_products: {
        Args: Record<PropertyKey, never>
        Returns: {
          category: string
          cost: number
          description: string
          enabled: boolean
          id: string
          image_url: string
          name: string
          parent_product_id: string
          part_number: string
          price: number
          product_info_url: string
          specifications: Json
          subcategory: string
        }[]
      }
      get_products_by_level: {
        Args: { level_filter: number }
        Returns: {
          category: string
          chassis_type: string
          cost: number
          description: string
          enabled: boolean
          id: string
          image_url: string
          name: string
          parent_product_id: string
          part_number: string
          price: number
          product_info_url: string
          slot_requirement: number
          specifications: Json
          subcategory: string
        }[]
      }
      get_user_role: {
        Args: { user_id: string }
        Returns: string
      }
      has_permission: {
        Args: {
          _permission_type: string
          _resource_id?: string
          _resource_type?: string
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_admin_user: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      log_security_event: {
        Args:
          | {
              p_action: string
              p_details: string
              p_ip_address: string
              p_severity?: string
              p_user_agent: string
              p_user_id: string
            }
          | {
              p_action: string
              p_details?: Json
              p_ip_address?: string
              p_severity?: string
              p_user_agent?: string
              p_user_id: string
            }
        Returns: string
      }
      log_user_security_event: {
        Args: {
          p_action: string
          p_details: string
          p_ip_address: string
          p_severity?: string
          p_user_agent: string
          p_user_id: string
        }
        Returns: undefined
      }
      repair_draft_bom_prices: {
        Args: Record<PropertyKey, never>
        Returns: {
          items_repaired: number
          items_with_issues: number
          quote_id: string
        }[]
      }
      revoke_user_access: {
        Args: { p_reason?: string; p_target_user_id: string }
        Returns: boolean
      }
      set_default_dropdown_option: {
        Args: { p_field_id: string; p_option_id: string }
        Returns: undefined
      }
      track_user_session: {
        Args: {
          p_device_info?: Json
          p_ip_address?: string
          p_location_data?: Json
          p_session_token: string
          p_user_agent?: string
          p_user_id: string
        }
        Returns: string
      }
      update_product_display_name: {
        Args:
          | { p_display_name: string; p_id: string }
          | { p_display_name: string; p_id: string }
        Returns: Json
      }
      update_quote_analytics: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_session_activity: {
        Args: { p_session_token: string }
        Returns: boolean
      }
      update_user_login: {
        Args: {
          p_ip_address?: string
          p_success: boolean
          p_user_agent?: string
          p_user_id: string
        }
        Returns: string
      }
    }
    Enums: {
      user_role: "LEVEL_1" | "LEVEL_2" | "LEVEL_3" | "ADMIN" | "FINANCE"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      user_role: ["LEVEL_1", "LEVEL_2", "LEVEL_3", "ADMIN", "FINANCE"],
    },
  },
} as const
