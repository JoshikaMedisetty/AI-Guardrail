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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      agents: {
        Row: {
          category: string
          created_at: string
          description: string
          enabled: boolean
          icon: string
          id: string
          integration_method: string
          is_builtin: boolean
          last_activity: string
          legacy_owner_id: string | null
          name: string
          owner_id: string | null
          protection_mode: string
          request_count: number
          role_title: string | null
          sample_topics: string[]
          slug: string | null
          status: string
          system_prompt: string | null
          threat_count: number
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string
          enabled?: boolean
          icon?: string
          id?: string
          integration_method?: string
          is_builtin?: boolean
          last_activity?: string
          legacy_owner_id?: string | null
          name: string
          owner_id?: string | null
          protection_mode?: string
          request_count?: number
          role_title?: string | null
          sample_topics?: string[]
          slug?: string | null
          status?: string
          system_prompt?: string | null
          threat_count?: number
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          enabled?: boolean
          icon?: string
          id?: string
          integration_method?: string
          is_builtin?: boolean
          last_activity?: string
          legacy_owner_id?: string | null
          name?: string
          owner_id?: string | null
          protection_mode?: string
          request_count?: number
          role_title?: string | null
          sample_topics?: string[]
          slug?: string | null
          status?: string
          system_prompt?: string | null
          threat_count?: number
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          agent_id: string
          created_at: string
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          revoked_at: string | null
          user_id: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
          user_id: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action_taken: string
          agent_id: string
          attack_type: string | null
          confidence: number | null
          conversation_id: string | null
          created_at: string
          decision: string
          detected_indicators: Json
          explanation: string
          id: string
          legacy_user_id: string | null
          model_prediction: string | null
          model_score: number | null
          processing_time_ms: number
          request_text: string
          resource_type: string
          risk_score: number
          scan_status: string
          severity: string
          source_domain: string | null
          user_id: string | null
          website_url: string | null
        }
        Insert: {
          action_taken?: string
          agent_id: string
          attack_type?: string | null
          confidence?: number | null
          conversation_id?: string | null
          created_at?: string
          decision: string
          detected_indicators?: Json
          explanation: string
          id: string
          legacy_user_id?: string | null
          model_prediction?: string | null
          model_score?: number | null
          processing_time_ms?: number
          request_text: string
          resource_type?: string
          risk_score: number
          scan_status?: string
          severity: string
          source_domain?: string | null
          user_id?: string | null
          website_url?: string | null
        }
        Update: {
          action_taken?: string
          agent_id?: string
          attack_type?: string | null
          confidence?: number | null
          conversation_id?: string | null
          created_at?: string
          decision?: string
          detected_indicators?: Json
          explanation?: string
          id?: string
          legacy_user_id?: string | null
          model_prediction?: string | null
          model_score?: number | null
          processing_time_ms?: number
          request_text?: string
          resource_type?: string
          risk_score?: number
          scan_status?: string
          severity?: string
          source_domain?: string | null
          user_id?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          agent_id: string
          created_at: string
          id: string
          legacy_user_id: string | null
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          agent_id: string
          created_at?: string
          id?: string
          legacy_user_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          agent_id?: string
          created_at?: string
          id?: string
          legacy_user_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      guardrail_settings: {
        Row: {
          api_response_scanning: boolean
          block_mode: string
          data_leakage_detection: boolean
          high_threshold: number
          jailbreak_enabled: boolean
          low_threshold: number
          notify_blocked: boolean
          notify_critical: boolean
          notify_warnings: boolean
          output_validation: boolean
          prompt_injection_enabled: boolean
          system_prompt_protection: boolean
          tool_output_scanning: boolean
          updated_at: string
          user_id: string
          webpage_scanning: boolean
        }
        Insert: {
          api_response_scanning?: boolean
          block_mode?: string
          data_leakage_detection?: boolean
          high_threshold?: number
          jailbreak_enabled?: boolean
          low_threshold?: number
          notify_blocked?: boolean
          notify_critical?: boolean
          notify_warnings?: boolean
          output_validation?: boolean
          prompt_injection_enabled?: boolean
          system_prompt_protection?: boolean
          tool_output_scanning?: boolean
          updated_at?: string
          user_id: string
          webpage_scanning?: boolean
        }
        Update: {
          api_response_scanning?: boolean
          block_mode?: string
          data_leakage_detection?: boolean
          high_threshold?: number
          jailbreak_enabled?: boolean
          low_threshold?: number
          notify_blocked?: boolean
          notify_critical?: boolean
          notify_warnings?: boolean
          output_validation?: boolean
          prompt_injection_enabled?: boolean
          system_prompt_protection?: boolean
          tool_output_scanning?: boolean
          updated_at?: string
          user_id?: string
          webpage_scanning?: boolean
        }
        Relationships: []
      }
      legacy_users: {
        Row: {
          created_at: string
          email: string
          legacy_id: string
          linked_at: string | null
          linked_user_id: string | null
          name: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          email: string
          legacy_id: string
          linked_at?: string | null
          linked_user_id?: string | null
          name?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          email?: string
          legacy_id?: string
          linked_at?: string | null
          linked_user_id?: string | null
          name?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          decision: string
          detection_reason: string | null
          id: string
          legacy_user_id: string | null
          ml_score: number | null
          risk_level: string
          risk_score: number
          sender: string
          triggered_rules: Json
          user_id: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          decision?: string
          detection_reason?: string | null
          id?: string
          legacy_user_id?: string | null
          ml_score?: number | null
          risk_level?: string
          risk_score?: number
          sender: string
          triggered_rules?: Json
          user_id?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          decision?: string
          detection_reason?: string | null
          id?: string
          legacy_user_id?: string | null
          ml_score?: number | null
          risk_level?: string
          risk_score?: number
          sender?: string
          triggered_rules?: Json
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          name?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      security_alerts: {
        Row: {
          action_taken: string
          agent_id: string
          agent_name: string
          attack_type: string | null
          confidence: number | null
          created_at: string
          detected_input: string
          id: string
          indicators: Json
          model_name: string
          model_prediction: string | null
          model_score: number | null
          recommendations: Json
          request_id: string
          risk_score: number
          severity: string
          status: string
          threat: string
          user_id: string | null
          website_url: string | null
          what_detected: string
          why_blocked: string
        }
        Insert: {
          action_taken?: string
          agent_id: string
          agent_name: string
          attack_type?: string | null
          confidence?: number | null
          created_at?: string
          detected_input: string
          id: string
          indicators?: Json
          model_name?: string
          model_prediction?: string | null
          model_score?: number | null
          recommendations?: Json
          request_id: string
          risk_score: number
          severity: string
          status?: string
          threat: string
          user_id?: string | null
          website_url?: string | null
          what_detected: string
          why_blocked: string
        }
        Update: {
          action_taken?: string
          agent_id?: string
          agent_name?: string
          attack_type?: string | null
          confidence?: number | null
          created_at?: string
          detected_input?: string
          id?: string
          indicators?: Json
          model_name?: string
          model_prediction?: string | null
          model_score?: number | null
          recommendations?: Json
          request_id?: string
          risk_score?: number
          severity?: string
          status?: string
          threat?: string
          user_id?: string | null
          website_url?: string | null
          what_detected?: string
          why_blocked?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      link_legacy_user: {
        Args: { _email: string; _uid: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "user" | "security_admin"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["user", "security_admin"],
    },
  },
} as const
