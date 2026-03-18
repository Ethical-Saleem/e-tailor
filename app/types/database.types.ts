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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      customers: {
        Row: {
          address: string | null
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          is_deleted: boolean
          last_order_date: string | null
          name: string
          notes: string | null
          outstanding_balance: number
          phone: string | null
          shop_id: string
          tags: string[]
          total_orders: number
          total_spend: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_deleted?: boolean
          last_order_date?: string | null
          name: string
          notes?: string | null
          outstanding_balance?: number
          phone?: string | null
          shop_id: string
          tags?: string[]
          total_orders?: number
          total_spend?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_deleted?: boolean
          last_order_date?: string | null
          name?: string
          notes?: string | null
          outstanding_balance?: number
          phone?: string | null
          shop_id?: string
          tags?: string[]
          total_orders?: number
          total_spend?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      material_price_history: {
        Row: {
          created_at: string
          id: string
          material_id: string
          notes: string | null
          purchase_date: string
          quantity_purchased: number
          receipt_url: string | null
          shop_id: string
          supplier: string | null
          total_cost: number
          unit_cost: number
        }
        Insert: {
          created_at?: string
          id?: string
          material_id: string
          notes?: string | null
          purchase_date?: string
          quantity_purchased?: number
          receipt_url?: string | null
          shop_id: string
          supplier?: string | null
          total_cost?: number
          unit_cost: number
        }
        Update: {
          created_at?: string
          id?: string
          material_id?: string
          notes?: string | null
          purchase_date?: string
          quantity_purchased?: number
          receipt_url?: string | null
          shop_id?: string
          supplier?: string | null
          total_cost?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "material_price_history_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "low_stock_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_price_history_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_price_history_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          average_unit_cost: number
          category: string
          color: string | null
          created_at: string
          current_stock: number
          current_unit_cost: number
          description: string | null
          id: string
          image_url: string | null
          is_deleted: boolean
          minimum_stock: number
          name: string
          shop_id: string
          sku: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          average_unit_cost?: number
          category: string
          color?: string | null
          created_at?: string
          current_stock?: number
          current_unit_cost?: number
          description?: string | null
          id?: string
          image_url?: string | null
          is_deleted?: boolean
          minimum_stock?: number
          name: string
          shop_id: string
          sku?: string | null
          unit?: string
          updated_at?: string
        }
        Update: {
          average_unit_cost?: number
          category?: string
          color?: string | null
          created_at?: string
          current_stock?: number
          current_unit_cost?: number
          description?: string | null
          id?: string
          image_url?: string | null
          is_deleted?: boolean
          minimum_stock?: number
          name?: string
          shop_id?: string
          sku?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "materials_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      measurement_profiles: {
        Row: {
          category: string
          created_at: string
          customer_id: string | null
          design_images: string[]
          id: string
          is_deleted: boolean
          is_template: boolean
          label: string
          measurements: Json
          notes: string | null
          shop_id: string
          taken_at: string | null
          taken_by: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          customer_id?: string | null
          design_images?: string[]
          id?: string
          is_deleted?: boolean
          is_template?: boolean
          label: string
          measurements?: Json
          notes?: string | null
          shop_id: string
          taken_at?: string | null
          taken_by?: string | null
          unit?: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          customer_id?: string | null
          design_images?: string[]
          id?: string
          is_deleted?: boolean
          is_template?: boolean
          label?: string
          measurements?: Json
          notes?: string | null
          shop_id?: string
          taken_at?: string | null
          taken_by?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "measurement_profiles_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_lifetime_value"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "measurement_profiles_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "measurement_profiles_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      order_events: {
        Row: {
          created_at: string
          created_by: string | null
          event_type: string
          id: string
          new_value: string | null
          note: string | null
          old_value: string | null
          order_id: string
          shop_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event_type: string
          id?: string
          new_value?: string | null
          note?: string | null
          old_value?: string | null
          order_id: string
          shop_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event_type?: string
          id?: string
          new_value?: string | null
          note?: string | null
          old_value?: string | null
          order_id?: string
          shop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_events_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount_paid: number
          created_at: string
          custom_measurements: Json | null
          customer_id: string
          customer_name: string
          customer_phone: string | null
          delivery_date: string | null
          deposit_amount: number
          design_images: string[]
          discount: number
          discount_type: string
          due_date: string | null
          id: string
          internal_notes: string | null
          is_deleted: boolean
          items: Json
          material_usage: Json
          measurement_category: string | null
          measurement_profile_id: string | null
          order_number: string
          payment_status: string
          priority: string
          shop_id: string
          status: string
          style_notes: string | null
          subtotal: number
          tax: number
          total: number
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          created_at?: string
          custom_measurements?: Json | null
          customer_id: string
          customer_name: string
          customer_phone?: string | null
          delivery_date?: string | null
          deposit_amount?: number
          design_images?: string[]
          discount?: number
          discount_type?: string
          due_date?: string | null
          id?: string
          internal_notes?: string | null
          is_deleted?: boolean
          items?: Json
          material_usage?: Json
          measurement_category?: string | null
          measurement_profile_id?: string | null
          order_number: string
          payment_status?: string
          priority?: string
          shop_id: string
          status?: string
          style_notes?: string | null
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          created_at?: string
          custom_measurements?: Json | null
          customer_id?: string
          customer_name?: string
          customer_phone?: string | null
          delivery_date?: string | null
          deposit_amount?: number
          design_images?: string[]
          discount?: number
          discount_type?: string
          due_date?: string | null
          id?: string
          internal_notes?: string | null
          is_deleted?: boolean
          items?: Json
          material_usage?: Json
          measurement_category?: string | null
          measurement_profile_id?: string | null
          order_number?: string
          payment_status?: string
          priority?: string
          shop_id?: string
          status?: string
          style_notes?: string | null
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_lifetime_value"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_measurement_profile_id_fkey"
            columns: ["measurement_profile_id"]
            isOneToOne: false
            referencedRelation: "measurement_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          method: string
          notes: string | null
          order_id: string
          reference: string | null
          shop_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          method?: string
          notes?: string | null
          order_id: string
          reference?: string | null
          shop_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          method?: string
          notes?: string | null
          order_id?: string
          reference?: string | null
          shop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shops: {
        Row: {
          address: string | null
          created_at: string
          currency: string
          id: string
          logo_url: string | null
          name: string
          owner_id: string
          phone: string | null
          settings: Json
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          currency?: string
          id?: string
          logo_url?: string | null
          name: string
          owner_id: string
          phone?: string | null
          settings?: Json
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          currency?: string
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string
          phone?: string | null
          settings?: Json
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      customer_lifetime_value: {
        Row: {
          id: string | null
          last_order_date: string | null
          name: string | null
          phone: string | null
          shop_id: string | null
          total_orders: number | null
          total_paid: number | null
          total_value: number | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      low_stock_materials: {
        Row: {
          average_unit_cost: number | null
          category: string | null
          color: string | null
          created_at: string | null
          current_stock: number | null
          current_unit_cost: number | null
          deficit: number | null
          description: string | null
          id: string | null
          image_url: string | null
          is_deleted: boolean | null
          minimum_stock: number | null
          name: string | null
          shop_id: string | null
          sku: string | null
          unit: string | null
          updated_at: string | null
        }
        Insert: {
          average_unit_cost?: number | null
          category?: string | null
          color?: string | null
          created_at?: string | null
          current_stock?: number | null
          current_unit_cost?: number | null
          deficit?: never
          description?: string | null
          id?: string | null
          image_url?: string | null
          is_deleted?: boolean | null
          minimum_stock?: number | null
          name?: string | null
          shop_id?: string | null
          sku?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Update: {
          average_unit_cost?: number | null
          category?: string | null
          color?: string | null
          created_at?: string | null
          current_stock?: number | null
          current_unit_cost?: number | null
          deficit?: never
          description?: string | null
          id?: string | null
          image_url?: string | null
          is_deleted?: boolean | null
          minimum_stock?: number | null
          name?: string | null
          shop_id?: string | null
          sku?: string | null
          unit?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "materials_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_revenue: {
        Row: {
          month: string | null
          payment_count: number | null
          shop_id: string | null
          total_collected: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      order_stats: {
        Row: {
          avg_completion_days: number | null
          avg_order_value: number | null
          order_count: number | null
          payment_status: string | null
          priority: string | null
          shop_id: string | null
          status: string | null
          total_collected: number | null
          total_outstanding: number | null
          total_value: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_my_shop_id: { Args: never; Returns: string }
      get_revenue: {
        Args: { p_from: string; p_shop_id: string; p_to: string }
        Returns: {
          order_count: number
          period: string
          revenue: number
        }[]
      }
      recalculate_customer_totals: {
        Args: { p_customer_id: string }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
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
