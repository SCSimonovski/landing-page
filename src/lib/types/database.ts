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
          active: boolean
          created_at: string
          email: string
          full_name: string
          id: string
          license_states: string[]
        }
        Insert: {
          active?: boolean
          created_at?: string
          email: string
          full_name: string
          id?: string
          license_states?: string[]
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          license_states?: string[]
        }
        Relationships: []
      }
      consent_log: {
        Row: {
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
          created_at: string
          event_data: Json | null
          event_type: Database["public"]["Enums"]["lead_event_type"]
          id: string
          lead_id: string
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_type: Database["public"]["Enums"]["lead_event_type"]
          id?: string
          lead_id: string
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_type?: Database["public"]["Enums"]["lead_event_type"]
          id?: string
          lead_id?: string
        }
        Relationships: [
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
          created_at: string
          email: string
          fbc: string | null
          fbclid: string | null
          fbp: string | null
          first_contact_at: string | null
          first_name: string
          id: string
          intent_score: number
          is_homeowner: boolean
          is_smoker: boolean
          landing_page_variant: string | null
          last_name: string
          mortgage_balance: number
          notes: string | null
          on_dnc: boolean
          outcome: string | null
          phone_e164: string
          policy_value: number | null
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
          created_at?: string
          email: string
          fbc?: string | null
          fbclid?: string | null
          fbp?: string | null
          first_contact_at?: string | null
          first_name: string
          id?: string
          intent_score: number
          is_homeowner: boolean
          is_smoker: boolean
          landing_page_variant?: string | null
          last_name: string
          mortgage_balance: number
          notes?: string | null
          on_dnc?: boolean
          outcome?: string | null
          phone_e164: string
          policy_value?: number | null
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
          created_at?: string
          email?: string
          fbc?: string | null
          fbclid?: string | null
          fbp?: string | null
          first_contact_at?: string | null
          first_name?: string
          id?: string
          intent_score?: number
          is_homeowner?: boolean
          is_smoker?: boolean
          landing_page_variant?: string | null
          last_name?: string
          mortgage_balance?: number
          notes?: string | null
          on_dnc?: boolean
          outcome?: string | null
          phone_e164?: string
          policy_value?: number | null
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
      suppressions: {
        Row: {
          email: string | null
          id: string
          phone_e164: string | null
          reason: string
          suppressed_at: string
        }
        Insert: {
          email?: string | null
          id?: string
          phone_e164?: string | null
          reason: string
          suppressed_at?: string
        }
        Update: {
          email?: string | null
          id?: string
          phone_e164?: string | null
          reason?: string
          suppressed_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      insert_lead_with_consent: { Args: { payload: Json }; Returns: string }
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
