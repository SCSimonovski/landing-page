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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agents: {
        Row: {
          created_at: string
          full_name: string
          id: string
          license_states: string[]
          platform_user_id: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          license_states?: string[]
          platform_user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          license_states?: string[]
          platform_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agents_platform_user_id_fkey"
            columns: ["platform_user_id"]
            isOneToOne: true
            referencedRelation: "platform_users"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_log: {
        Row: {
          brand: string
          consent_text: string
          created_at: string
          form_version: string
          id: string
          ip_address: unknown
          lead_id: string
          page_url: string
          user_agent: string
        }
        Insert: {
          brand: string
          consent_text: string
          created_at?: string
          form_version: string
          id?: string
          ip_address: unknown
          lead_id: string
          page_url: string
          user_agent: string
        }
        Update: {
          brand?: string
          consent_text?: string
          created_at?: string
          form_version?: string
          id?: string
          ip_address?: unknown
          lead_id?: string
          page_url?: string
          user_agent?: string
        }
        Relationships: [
          {
            foreignKeyName: "consent_log_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      dnc_registry: {
        Row: {
          phone_e164: string
          updated_at: string
        }
        Insert: {
          phone_e164: string
          updated_at?: string
        }
        Update: {
          phone_e164?: string
          updated_at?: string
        }
        Relationships: []
      }
      lead_events: {
        Row: {
          actor_platform_user_id: string | null
          created_at: string
          event_data: Json | null
          event_type: Database["public"]["Enums"]["lead_event_type"]
          id: string
          lead_id: string
        }
        Insert: {
          actor_platform_user_id?: string | null
          created_at?: string
          event_data?: Json | null
          event_type: Database["public"]["Enums"]["lead_event_type"]
          id?: string
          lead_id: string
        }
        Update: {
          actor_platform_user_id?: string | null
          created_at?: string
          event_data?: Json | null
          event_type?: Database["public"]["Enums"]["lead_event_type"]
          id?: string
          lead_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_events_actor_platform_user_id_fkey"
            columns: ["actor_platform_user_id"]
            isOneToOne: false
            referencedRelation: "platform_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          age: number
          agent_id: string | null
          best_time_to_call: Database["public"]["Enums"]["time_of_day"]
          brand: string
          created_at: string
          details: Json
          email: string
          fbc: string | null
          fbclid: string | null
          fbp: string | null
          first_contact_at: string | null
          first_name: string
          id: string
          intent_score: number
          landing_page_variant: string | null
          last_name: string
          notes: string | null
          on_dnc: boolean
          outcome: string | null
          phone_e164: string
          policy_value: number | null
          product: string
          state: string
          status: Database["public"]["Enums"]["lead_status"]
          temperature: Database["public"]["Enums"]["lead_temperature"]
          utm_adset: string | null
          utm_campaign: string | null
          utm_creative: string | null
          utm_source: string | null
        }
        Insert: {
          age: number
          agent_id?: string | null
          best_time_to_call: Database["public"]["Enums"]["time_of_day"]
          brand: string
          created_at?: string
          details: Json
          email: string
          fbc?: string | null
          fbclid?: string | null
          fbp?: string | null
          first_contact_at?: string | null
          first_name: string
          id?: string
          intent_score: number
          landing_page_variant?: string | null
          last_name: string
          notes?: string | null
          on_dnc?: boolean
          outcome?: string | null
          phone_e164: string
          policy_value?: number | null
          product: string
          state: string
          status?: Database["public"]["Enums"]["lead_status"]
          temperature: Database["public"]["Enums"]["lead_temperature"]
          utm_adset?: string | null
          utm_campaign?: string | null
          utm_creative?: string | null
          utm_source?: string | null
        }
        Update: {
          age?: number
          agent_id?: string | null
          best_time_to_call?: Database["public"]["Enums"]["time_of_day"]
          brand?: string
          created_at?: string
          details?: Json
          email?: string
          fbc?: string | null
          fbclid?: string | null
          fbp?: string | null
          first_contact_at?: string | null
          first_name?: string
          id?: string
          intent_score?: number
          landing_page_variant?: string | null
          last_name?: string
          notes?: string | null
          on_dnc?: boolean
          outcome?: string | null
          phone_e164?: string
          policy_value?: number | null
          product?: string
          state?: string
          status?: Database["public"]["Enums"]["lead_status"]
          temperature?: Database["public"]["Enums"]["lead_temperature"]
          utm_adset?: string | null
          utm_campaign?: string | null
          utm_creative?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_users: {
        Row: {
          active: boolean
          created_at: string
          email: string
          id: string
          role: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          email: string
          id?: string
          role: string
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string
          id?: string
          role?: string
        }
        Relationships: []
      }
      suppressions: {
        Row: {
          email: string | null
          id: string
          phone_e164: string | null
          reason: string
          source_brand: string | null
          suppressed_at: string
        }
        Insert: {
          email?: string | null
          id?: string
          phone_e164?: string | null
          reason: string
          source_brand?: string | null
          suppressed_at?: string
        }
        Update: {
          email?: string | null
          id?: string
          phone_e164?: string | null
          reason?: string
          source_brand?: string | null
          suppressed_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_lead: {
        Args: { p_lead_id: string; p_new_agent_id: string }
        Returns: undefined
      }
      current_platform_user: {
        Args: never
        Returns: {
          active: boolean
          agent_id: string
          id: string
          role: string
        }[]
      }
      insert_lead_with_consent: { Args: { payload: Json }; Returns: string }
      set_platform_user_active: {
        Args: { p_new_active: boolean; p_target_user_id: string }
        Returns: undefined
      }
      update_agent_profile: {
        Args: { p_full_name: string; p_license_states: string[] }
        Returns: undefined
      }
      update_lead_notes: {
        Args: { p_lead_id: string; p_notes: string }
        Returns: undefined
      }
      update_lead_status: {
        Args: {
          p_lead_id: string
          p_new_status: Database["public"]["Enums"]["lead_status"]
        }
        Returns: undefined
      }
    }
    Enums: {
      lead_event_type:
        | "created"
        | "sms_sent"
        | "email_sent"
        | "capi_sent"
        | "status_change"
        | "note_added"
        | "refund_requested"
        | "duplicate_attempt"
        | "sms_skipped_dnc"
        | "sms_skipped_suppression"
        | "email_skipped_suppression"
        | "assigned"
      lead_status:
        | "new"
        | "contacted"
        | "appointment"
        | "sold"
        | "dead"
        | "refunded"
      lead_temperature: "hot" | "warm" | "cold"
      time_of_day: "morning" | "afternoon" | "evening"
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
      lead_event_type: [
        "created",
        "sms_sent",
        "email_sent",
        "capi_sent",
        "status_change",
        "note_added",
        "refund_requested",
        "duplicate_attempt",
        "sms_skipped_dnc",
        "sms_skipped_suppression",
        "email_skipped_suppression",
        "assigned",
      ],
      lead_status: [
        "new",
        "contacted",
        "appointment",
        "sold",
        "dead",
        "refunded",
      ],
      lead_temperature: ["hot", "warm", "cold"],
      time_of_day: ["morning", "afternoon", "evening"],
    },
  },
} as const
