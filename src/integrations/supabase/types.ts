export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
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
      level4_configuration_options: {
        Row: {
          created_at: string
          display_order: number | null
          enabled: boolean | null
          id: string
          level4_product_id: string
          option_key: string
          option_value: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          enabled?: boolean | null
          id?: string
          level4_product_id: string
          option_key: string
          option_value: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          enabled?: boolean | null
          id?: string
          level4_product_id?: string
          option_key?: string
          option_value?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_level4_options_product"
            columns: ["level4_product_id"]
            isOneToOne: false
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
      products: {
        Row: {
          category: string | null
          cost: number | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          price: number | null
          subcategory: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          cost?: number | null
          created_at?: string
          description?: string | null
          id: string
          is_active?: boolean
          name: string
          price?: number | null
          subcategory?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          cost?: number | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price?: number | null
          subcategory?: string | null
          updated_at?: string
        }
        Relationships: []
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
          label?: string
          options?: Json | null
          required?: boolean
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      quotes: {
        Row: {
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
          gross_profit: number
          id: string
          is_rep_involved: boolean
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
          status: string
          submitted_by_email: string | null
          submitted_by_name: string | null
          total_cost: number
          updated_at: string
          user_id: string
        }
        Insert: {
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
          gross_profit: number
          id: string
          is_rep_involved?: boolean
          oracle_customer_id: string
          original_margin: number
          original_prices?: Json | null
          original_quote_value: number
          original_submitted_at?: string | null
          payment_terms: string
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
          shipping_terms: string
          status?: string
          submitted_by_email?: string | null
          submitted_by_name?: string | null
          total_cost: number
          updated_at?: string
          user_id: string
        }
        Update: {
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
          gross_profit?: number
          id?: string
          is_rep_involved?: boolean
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
          status?: string
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
          p_email: string
          p_password: string
          p_first_name: string
          p_last_name: string
          p_role: string
          p_department?: string
        }
        Returns: Json
      }
      admin_list_users: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          email: string
          first_name: string
          last_name: string
          role: string
          department: string
          user_status: string
          created_at: string
          updated_at: string
        }[]
      }
      admin_update_user_status: {
        Args: { p_user_id: string; p_status: string }
        Returns: Json
      }
      calculate_bom_total_cost: {
        Args: { quote_id_param: string }
        Returns: number
      }
      create_user: {
        Args: {
          email: string
          password: string
          first_name: string
          last_name: string
          role: string
          department: string
        }
        Returns: string
      }
      deactivate_user: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      get_admin_user_ids: {
        Args: Record<PropertyKey, never>
        Returns: string[]
      }
      get_user_role: {
        Args: { user_id: string }
        Returns: string
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
              p_user_id: string
              p_action: string
              p_details: string
              p_ip_address: string
              p_user_agent: string
              p_severity?: string
            }
          | {
              p_user_id: string
              p_action: string
              p_details?: Json
              p_ip_address?: string
              p_user_agent?: string
              p_severity?: string
            }
        Returns: undefined
      }
      log_user_security_event: {
        Args: {
          p_user_id: string
          p_action: string
          p_details: string
          p_ip_address: string
          p_user_agent: string
          p_severity?: string
        }
        Returns: undefined
      }
      revoke_user_access: {
        Args: { p_target_user_id: string; p_reason?: string }
        Returns: boolean
      }
      track_user_session: {
        Args: {
          p_user_id: string
          p_session_token: string
          p_ip_address?: string
          p_user_agent?: string
          p_device_info?: Json
          p_location_data?: Json
        }
        Returns: string
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
          p_user_id: string
          p_success: boolean
          p_ip_address?: string
          p_user_agent?: string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
