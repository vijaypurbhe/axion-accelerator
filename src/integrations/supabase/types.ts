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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          actor: string
          created_at: string
          id: string
          initiative_id: string | null
          new_value_summary: string | null
          object_id: string
          object_type: string
          old_value_summary: string | null
          role: string
          summary: string
          tenant_id: string
        }
        Insert: {
          action: string
          actor?: string
          created_at?: string
          id?: string
          initiative_id?: string | null
          new_value_summary?: string | null
          object_id?: string
          object_type: string
          old_value_summary?: string | null
          role?: string
          summary?: string
          tenant_id?: string
        }
        Update: {
          action?: string
          actor?: string
          created_at?: string
          id?: string
          initiative_id?: string | null
          new_value_summary?: string | null
          object_id?: string
          object_type?: string
          old_value_summary?: string | null
          role?: string
          summary?: string
          tenant_id?: string
        }
        Relationships: []
      }
      agent_actions: {
        Row: {
          agent_id: string
          authorization_state: string
          authorized_at: string | null
          authorized_by: string | null
          created_at: string
          data: Json
          id: string
          position: number
          updated_at: string
        }
        Insert: {
          agent_id: string
          authorization_state?: string
          authorized_at?: string | null
          authorized_by?: string | null
          created_at?: string
          data?: Json
          id?: string
          position?: number
          updated_at?: string
        }
        Update: {
          agent_id?: string
          authorization_state?: string
          authorized_at?: string | null
          authorized_by?: string | null
          created_at?: string
          data?: Json
          id?: string
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_actions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_boundaries: {
        Row: {
          agent_id: string
          created_at: string
          data: Json
          id: string
          position: number
          updated_at: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          data?: Json
          id?: string
          position?: number
          updated_at?: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          data?: Json
          id?: string
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_boundaries_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_escalations: {
        Row: {
          agent_id: string
          created_at: string
          data: Json
          id: string
          position: number
          updated_at: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          data?: Json
          id?: string
          position?: number
          updated_at?: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          data?: Json
          id?: string
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_escalations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_grounding: {
        Row: {
          agent_id: string
          created_at: string
          data: Json
          id: string
          position: number
          updated_at: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          data?: Json
          id?: string
          position?: number
          updated_at?: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          data?: Json
          id?: string
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_grounding_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_guardrails: {
        Row: {
          agent_id: string
          created_at: string
          data: Json
          id: string
          position: number
          updated_at: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          data?: Json
          id?: string
          position?: number
          updated_at?: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          data?: Json
          id?: string
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_guardrails_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_reviews: {
        Row: {
          agent_id: string
          comments: string
          decided_at: string
          id: string
          outcome: string
          reviewer: string
          reviewer_role: Database["public"]["Enums"]["axion_role"]
          stage: string
        }
        Insert: {
          agent_id: string
          comments?: string
          decided_at?: string
          id?: string
          outcome?: string
          reviewer?: string
          reviewer_role: Database["public"]["Enums"]["axion_role"]
          stage: string
        }
        Update: {
          agent_id?: string
          comments?: string
          decided_at?: string
          id?: string
          outcome?: string
          reviewer?: string
          reviewer_role?: Database["public"]["Enums"]["axion_role"]
          stage?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_reviews_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_suggestion_decisions: {
        Row: {
          agent_id: string
          confidence: number | null
          decided_at: string
          decided_by: string
          decision: string
          id: string
          kind: string
          rationale: string
          title: string
        }
        Insert: {
          agent_id: string
          confidence?: number | null
          decided_at?: string
          decided_by?: string
          decision: string
          id?: string
          kind: string
          rationale?: string
          title: string
        }
        Update: {
          agent_id?: string
          confidence?: number | null
          decided_at?: string
          decided_by?: string
          decision?: string
          id?: string
          kind?: string
          rationale?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_suggestion_decisions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_topics: {
        Row: {
          agent_id: string
          created_at: string
          data: Json
          id: string
          position: number
          updated_at: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          data?: Json
          id?: string
          position?: number
          updated_at?: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          data?: Json
          id?: string
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_topics_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_versions: {
        Row: {
          agent_id: string
          content_hash: string
          counts: Json
          created_at: string
          created_by: string
          id: string
          payload: Json
          status: string
          summary: string
          version: string
        }
        Insert: {
          agent_id: string
          content_hash?: string
          counts?: Json
          created_at?: string
          created_by?: string
          id?: string
          payload?: Json
          status?: string
          summary?: string
          version: string
        }
        Update: {
          agent_id?: string
          content_hash?: string
          counts?: Json
          created_at?: string
          created_by?: string
          id?: string
          payload?: Json
          status?: string
          summary?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_versions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          backlog: Json
          consumption: Json
          created_at: string
          created_by: string
          id: string
          identity_policy_id: string | null
          initiative_id: string
          instructions: Json
          lifecycle_stage: string
          linked_decision_ids: string[]
          linked_risk_ids: string[]
          monitoring: Json
          origin: string
          overview: Json
          pattern_id: string
          reference: string
          release: string
          risk_rating: string
          status: string
          tenant_id: string
          test_status: string
          tests: Json
          updated_at: string
          updated_by: string
          version: string
        }
        Insert: {
          backlog?: Json
          consumption?: Json
          created_at?: string
          created_by?: string
          id?: string
          identity_policy_id?: string | null
          initiative_id: string
          instructions?: Json
          lifecycle_stage?: string
          linked_decision_ids?: string[]
          linked_risk_ids?: string[]
          monitoring?: Json
          origin?: string
          overview?: Json
          pattern_id: string
          reference: string
          release?: string
          risk_rating?: string
          status?: string
          tenant_id: string
          test_status?: string
          tests?: Json
          updated_at?: string
          updated_by?: string
          version?: string
        }
        Update: {
          backlog?: Json
          consumption?: Json
          created_at?: string
          created_by?: string
          id?: string
          identity_policy_id?: string | null
          initiative_id?: string
          instructions?: Json
          lifecycle_stage?: string
          linked_decision_ids?: string[]
          linked_risk_ids?: string[]
          monitoring?: Json
          origin?: string
          overview?: Json
          pattern_id?: string
          reference?: string
          release?: string
          risk_rating?: string
          status?: string
          tenant_id?: string
          test_status?: string
          tests?: Json
          updated_at?: string
          updated_by?: string
          version?: string
        }
        Relationships: []
      }
      approval_requests: {
        Row: {
          agent_id: string
          created_at: string
          due_by: string | null
          id: string
          requested_by: string
          required_roles: string[]
          stage: string
          state: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          due_by?: string | null
          id?: string
          requested_by?: string
          required_roles?: string[]
          stage: string
          state?: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          due_by?: string | null
          id?: string
          requested_by?: string
          required_roles?: string[]
          stage?: string
          state?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_requests_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      axion_user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["axion_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["axion_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["axion_role"]
          user_id?: string
        }
        Relationships: []
      }
      client_members: {
        Row: {
          client_id: string
          created_at: string
          id: string
          invited_by: string
          is_client_admin: boolean
          role: Database["public"]["Enums"]["axion_role"]
          status: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          invited_by?: string
          is_client_admin?: boolean
          role: Database["public"]["Enums"]["axion_role"]
          status?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          invited_by?: string
          is_client_admin?: boolean
          role?: Database["public"]["Enums"]["axion_role"]
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_members_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          branding_accent: string
          created_at: string
          created_by: string
          description: string
          geography: string
          id: string
          industry: string
          is_demo: boolean
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          branding_accent?: string
          created_at?: string
          created_by?: string
          description?: string
          geography?: string
          id: string
          industry?: string
          is_demo?: boolean
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          branding_accent?: string
          created_at?: string
          created_by?: string
          description?: string
          geography?: string
          id?: string
          industry?: string
          is_demo?: boolean
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      export_jobs: {
        Row: {
          agent_id: string
          byte_size: number
          content_hash: string
          created_at: string
          error: string | null
          format: string
          id: string
          requested_by: string
          status: string
          storage_path: string | null
          updated_at: string
        }
        Insert: {
          agent_id: string
          byte_size?: number
          content_hash?: string
          created_at?: string
          error?: string | null
          format: string
          id?: string
          requested_by?: string
          status?: string
          storage_path?: string | null
          updated_at?: string
        }
        Update: {
          agent_id?: string
          byte_size?: number
          content_hash?: string
          created_at?: string
          error?: string | null
          format?: string
          id?: string
          requested_by?: string
          status?: string
          storage_path?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "export_jobs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      login_audit_log: {
        Row: {
          email: string
          id: string
          ip_address: string | null
          location: string | null
          logged_in_at: string
          metadata: Json
          user_agent: string | null
          user_id: string
        }
        Insert: {
          email: string
          id?: string
          ip_address?: string | null
          location?: string | null
          logged_in_at?: string
          metadata?: Json
          user_agent?: string | null
          user_id: string
        }
        Update: {
          email?: string
          id?: string
          ip_address?: string | null
          location?: string | null
          logged_in_at?: string
          metadata?: Json
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          default_persona: string
          display_name: string
          email: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_persona?: string
          display_name?: string
          email: string
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_persona?: string
          display_name?: string
          email?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_onboarding: {
        Row: {
          checklist_dismissed: boolean
          chosen_role: Database["public"]["Enums"]["axion_role"] | null
          completed_steps: string[]
          created_at: string
          updated_at: string
          user_id: string
          wizard_complete: boolean
          wizard_step: number
        }
        Insert: {
          checklist_dismissed?: boolean
          chosen_role?: Database["public"]["Enums"]["axion_role"] | null
          completed_steps?: string[]
          created_at?: string
          updated_at?: string
          user_id: string
          wizard_complete?: boolean
          wizard_step?: number
        }
        Update: {
          checklist_dismissed?: boolean
          chosen_role?: Database["public"]["Enums"]["axion_role"] | null
          completed_steps?: string[]
          created_at?: string
          updated_at?: string
          user_id?: string
          wizard_complete?: boolean
          wizard_step?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      workspace_records: {
        Row: {
          client_id: string
          created_at: string
          created_by: string
          data: Json
          id: string
          initiative_id: string | null
          is_seed: boolean
          kind: string
          updated_at: string
          updated_by: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string
          data?: Json
          id: string
          initiative_id?: string | null
          is_seed?: boolean
          kind: string
          updated_at?: string
          updated_by?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string
          data?: Json
          id?: string
          initiative_id?: string | null
          is_seed?: boolean
          kind?: string
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_records_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_email: { Args: never; Returns: string }
      ensure_axion_access: {
        Args: { _display_name: string; _persona: string }
        Returns: boolean
      }
      ensure_login_report_admin: { Args: never; Returns: boolean }
      has_agent_access: { Args: { _agent_id: string }; Returns: boolean }
      has_axion_role: {
        Args: {
          _role: Database["public"]["Enums"]["axion_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_client_access: { Args: { _client_id: string }; Returns: boolean }
      has_client_role: {
        Args: {
          _client_id: string
          _role: Database["public"]["Enums"]["axion_role"]
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_client_admin: { Args: { _client_id: string }; Returns: boolean }
      is_techmahindra_user: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "login_report_admin"
      axion_role:
        | "executive-sponsor"
        | "enterprise-architect"
        | "data360-architect"
        | "data-steward"
        | "data-engineer"
        | "agentforce-architect"
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
      app_role: ["login_report_admin"],
      axion_role: [
        "executive-sponsor",
        "enterprise-architect",
        "data360-architect",
        "data-steward",
        "data-engineer",
        "agentforce-architect",
      ],
    },
  },
} as const
