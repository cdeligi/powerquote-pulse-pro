export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
            foreignKeyName: "bom_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bom_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
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
      profiles: {
        Row: {
          created_at: string
          department: string | null
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          role: string
          updated_at: string
          user_status: string | null
        }
        Insert: {
          created_at?: string
          department?: string | null
          email: string
          first_name?: string | null
          id: string
          last_name?: string | null
          role?: string
          updated_at?: string
          user_status?: string | null
        }
        Update: {
          created_at?: string
          department?: string | null
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          role?: string
          updated_at?: string
          user_status?: string | null
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
          payment_terms: string
          price_adjustments: Json | null
          priority: string
          quote_fields: Json | null
          rejection_reason: string | null
          requested_discount: number
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
          payment_terms: string
          price_adjustments?: Json | null
          priority?: string
          quote_fields?: Json | null
          rejection_reason?: string | null
          requested_discount: number
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
          payment_terms?: string
          price_adjustments?: Json | null
          priority?: string
          quote_fields?: Json | null
          rejection_reason?: string | null
          requested_discount?: number
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
      is_admin_user: {
        Args: Record<PropertyKey, never>
        Returns: boolean
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
