export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      analytics_events: {
        Row: {
          event_type: string
          game_id: number | null
          id: number
          occurred_at: string
          properties: Json
          user_id: string | null
        }
        Insert: {
          event_type: string
          game_id?: number | null
          id?: never
          occurred_at: string
          properties?: Json
          user_id?: string | null
        }
        Update: {
          event_type?: string
          game_id?: number | null
          id?: never
          occurred_at?: string
          properties?: Json
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["steam_app_id"]
          },
        ]
      }
      analytics_events_2025_01: {
        Row: {
          event_type: string
          game_id: number | null
          id: number
          occurred_at: string
          properties: Json
          user_id: string | null
        }
        Insert: {
          event_type: string
          game_id?: number | null
          id?: never
          occurred_at: string
          properties?: Json
          user_id?: string | null
        }
        Update: {
          event_type?: string
          game_id?: number | null
          id?: never
          occurred_at?: string
          properties?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      analytics_events_2025_02: {
        Row: {
          event_type: string
          game_id: number | null
          id: number
          occurred_at: string
          properties: Json
          user_id: string | null
        }
        Insert: {
          event_type: string
          game_id?: number | null
          id?: never
          occurred_at: string
          properties?: Json
          user_id?: string | null
        }
        Update: {
          event_type?: string
          game_id?: number | null
          id?: never
          occurred_at?: string
          properties?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      analytics_events_2025_03: {
        Row: {
          event_type: string
          game_id: number | null
          id: number
          occurred_at: string
          properties: Json
          user_id: string | null
        }
        Insert: {
          event_type: string
          game_id?: number | null
          id?: never
          occurred_at: string
          properties?: Json
          user_id?: string | null
        }
        Update: {
          event_type?: string
          game_id?: number | null
          id?: never
          occurred_at?: string
          properties?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      analytics_events_2025_04: {
        Row: {
          event_type: string
          game_id: number | null
          id: number
          occurred_at: string
          properties: Json
          user_id: string | null
        }
        Insert: {
          event_type: string
          game_id?: number | null
          id?: never
          occurred_at: string
          properties?: Json
          user_id?: string | null
        }
        Update: {
          event_type?: string
          game_id?: number | null
          id?: never
          occurred_at?: string
          properties?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      analytics_events_2025_05: {
        Row: {
          event_type: string
          game_id: number | null
          id: number
          occurred_at: string
          properties: Json
          user_id: string | null
        }
        Insert: {
          event_type: string
          game_id?: number | null
          id?: never
          occurred_at: string
          properties?: Json
          user_id?: string | null
        }
        Update: {
          event_type?: string
          game_id?: number | null
          id?: never
          occurred_at?: string
          properties?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      analytics_events_2025_06: {
        Row: {
          event_type: string
          game_id: number | null
          id: number
          occurred_at: string
          properties: Json
          user_id: string | null
        }
        Insert: {
          event_type: string
          game_id?: number | null
          id?: never
          occurred_at: string
          properties?: Json
          user_id?: string | null
        }
        Update: {
          event_type?: string
          game_id?: number | null
          id?: never
          occurred_at?: string
          properties?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      analytics_events_2025_07: {
        Row: {
          event_type: string
          game_id: number | null
          id: number
          occurred_at: string
          properties: Json
          user_id: string | null
        }
        Insert: {
          event_type: string
          game_id?: number | null
          id?: never
          occurred_at: string
          properties?: Json
          user_id?: string | null
        }
        Update: {
          event_type?: string
          game_id?: number | null
          id?: never
          occurred_at?: string
          properties?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      analytics_events_2025_08: {
        Row: {
          event_type: string
          game_id: number | null
          id: number
          occurred_at: string
          properties: Json
          user_id: string | null
        }
        Insert: {
          event_type: string
          game_id?: number | null
          id?: never
          occurred_at: string
          properties?: Json
          user_id?: string | null
        }
        Update: {
          event_type?: string
          game_id?: number | null
          id?: never
          occurred_at?: string
          properties?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      analytics_events_2025_09: {
        Row: {
          event_type: string
          game_id: number | null
          id: number
          occurred_at: string
          properties: Json
          user_id: string | null
        }
        Insert: {
          event_type: string
          game_id?: number | null
          id?: never
          occurred_at: string
          properties?: Json
          user_id?: string | null
        }
        Update: {
          event_type?: string
          game_id?: number | null
          id?: never
          occurred_at?: string
          properties?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      analytics_events_2025_10: {
        Row: {
          event_type: string
          game_id: number | null
          id: number
          occurred_at: string
          properties: Json
          user_id: string | null
        }
        Insert: {
          event_type: string
          game_id?: number | null
          id?: never
          occurred_at: string
          properties?: Json
          user_id?: string | null
        }
        Update: {
          event_type?: string
          game_id?: number | null
          id?: never
          occurred_at?: string
          properties?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      analytics_events_2025_11: {
        Row: {
          event_type: string
          game_id: number | null
          id: number
          occurred_at: string
          properties: Json
          user_id: string | null
        }
        Insert: {
          event_type: string
          game_id?: number | null
          id?: never
          occurred_at: string
          properties?: Json
          user_id?: string | null
        }
        Update: {
          event_type?: string
          game_id?: number | null
          id?: never
          occurred_at?: string
          properties?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      analytics_events_2025_12: {
        Row: {
          event_type: string
          game_id: number | null
          id: number
          occurred_at: string
          properties: Json
          user_id: string | null
        }
        Insert: {
          event_type: string
          game_id?: number | null
          id?: never
          occurred_at: string
          properties?: Json
          user_id?: string | null
        }
        Update: {
          event_type?: string
          game_id?: number | null
          id?: never
          occurred_at?: string
          properties?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      analytics_events_2026_01: {
        Row: {
          event_type: string
          game_id: number | null
          id: number
          occurred_at: string
          properties: Json
          user_id: string | null
        }
        Insert: {
          event_type: string
          game_id?: number | null
          id?: never
          occurred_at: string
          properties?: Json
          user_id?: string | null
        }
        Update: {
          event_type?: string
          game_id?: number | null
          id?: never
          occurred_at?: string
          properties?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      analytics_events_2026_02: {
        Row: {
          event_type: string
          game_id: number | null
          id: number
          occurred_at: string
          properties: Json
          user_id: string | null
        }
        Insert: {
          event_type: string
          game_id?: number | null
          id?: never
          occurred_at: string
          properties?: Json
          user_id?: string | null
        }
        Update: {
          event_type?: string
          game_id?: number | null
          id?: never
          occurred_at?: string
          properties?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      analytics_events_2026_03: {
        Row: {
          event_type: string
          game_id: number | null
          id: number
          occurred_at: string
          properties: Json
          user_id: string | null
        }
        Insert: {
          event_type: string
          game_id?: number | null
          id?: never
          occurred_at: string
          properties?: Json
          user_id?: string | null
        }
        Update: {
          event_type?: string
          game_id?: number | null
          id?: never
          occurred_at?: string
          properties?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      analytics_events_2026_04: {
        Row: {
          event_type: string
          game_id: number | null
          id: number
          occurred_at: string
          properties: Json
          user_id: string | null
        }
        Insert: {
          event_type: string
          game_id?: number | null
          id?: never
          occurred_at: string
          properties?: Json
          user_id?: string | null
        }
        Update: {
          event_type?: string
          game_id?: number | null
          id?: never
          occurred_at?: string
          properties?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      analytics_events_2026_05: {
        Row: {
          event_type: string
          game_id: number | null
          id: number
          occurred_at: string
          properties: Json
          user_id: string | null
        }
        Insert: {
          event_type: string
          game_id?: number | null
          id?: never
          occurred_at: string
          properties?: Json
          user_id?: string | null
        }
        Update: {
          event_type?: string
          game_id?: number | null
          id?: never
          occurred_at?: string
          properties?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      analytics_events_2026_06: {
        Row: {
          event_type: string
          game_id: number | null
          id: number
          occurred_at: string
          properties: Json
          user_id: string | null
        }
        Insert: {
          event_type: string
          game_id?: number | null
          id?: never
          occurred_at: string
          properties?: Json
          user_id?: string | null
        }
        Update: {
          event_type?: string
          game_id?: number | null
          id?: never
          occurred_at?: string
          properties?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      analytics_events_2026_07: {
        Row: {
          event_type: string
          game_id: number | null
          id: number
          occurred_at: string
          properties: Json
          user_id: string | null
        }
        Insert: {
          event_type: string
          game_id?: number | null
          id?: never
          occurred_at: string
          properties?: Json
          user_id?: string | null
        }
        Update: {
          event_type?: string
          game_id?: number | null
          id?: never
          occurred_at?: string
          properties?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      analytics_events_2026_08: {
        Row: {
          event_type: string
          game_id: number | null
          id: number
          occurred_at: string
          properties: Json
          user_id: string | null
        }
        Insert: {
          event_type: string
          game_id?: number | null
          id?: never
          occurred_at: string
          properties?: Json
          user_id?: string | null
        }
        Update: {
          event_type?: string
          game_id?: number | null
          id?: never
          occurred_at?: string
          properties?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      analytics_events_2026_09: {
        Row: {
          event_type: string
          game_id: number | null
          id: number
          occurred_at: string
          properties: Json
          user_id: string | null
        }
        Insert: {
          event_type: string
          game_id?: number | null
          id?: never
          occurred_at: string
          properties?: Json
          user_id?: string | null
        }
        Update: {
          event_type?: string
          game_id?: number | null
          id?: never
          occurred_at?: string
          properties?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      analytics_events_2026_10: {
        Row: {
          event_type: string
          game_id: number | null
          id: number
          occurred_at: string
          properties: Json
          user_id: string | null
        }
        Insert: {
          event_type: string
          game_id?: number | null
          id?: never
          occurred_at: string
          properties?: Json
          user_id?: string | null
        }
        Update: {
          event_type?: string
          game_id?: number | null
          id?: never
          occurred_at?: string
          properties?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      analytics_events_2026_11: {
        Row: {
          event_type: string
          game_id: number | null
          id: number
          occurred_at: string
          properties: Json
          user_id: string | null
        }
        Insert: {
          event_type: string
          game_id?: number | null
          id?: never
          occurred_at: string
          properties?: Json
          user_id?: string | null
        }
        Update: {
          event_type?: string
          game_id?: number | null
          id?: never
          occurred_at?: string
          properties?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      analytics_events_2026_12: {
        Row: {
          event_type: string
          game_id: number | null
          id: number
          occurred_at: string
          properties: Json
          user_id: string | null
        }
        Insert: {
          event_type: string
          game_id?: number | null
          id?: never
          occurred_at: string
          properties?: Json
          user_id?: string | null
        }
        Update: {
          event_type?: string
          game_id?: number | null
          id?: never
          occurred_at?: string
          properties?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      games: {
        Row: {
          achievements_total: number | null
          artwork_url: string | null
          created_at: string
          genres: string[]
          last_imported_at: string | null
          popularity_score: number | null
          release_date: string | null
          search_tsv: unknown
          slug: string
          steam_app_id: number
          title: string
          updated_at: string
        }
        Insert: {
          achievements_total?: number | null
          artwork_url?: string | null
          created_at?: string
          genres?: string[]
          last_imported_at?: string | null
          popularity_score?: number | null
          release_date?: string | null
          search_tsv?: unknown
          slug: string
          steam_app_id: number
          title: string
          updated_at?: string
        }
        Update: {
          achievements_total?: number | null
          artwork_url?: string | null
          created_at?: string
          genres?: string[]
          last_imported_at?: string | null
          popularity_score?: number | null
          release_date?: string | null
          search_tsv?: unknown
          slug?: string
          steam_app_id?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      import_jobs: {
        Row: {
          error_code: string | null
          error_message: string | null
          finished_at: string | null
          id: string
          idempotency_key: string
          payload: Json | null
          requested_at: string
          started_at: string | null
          status: Database["public"]["Enums"]["import_job_status"]
          user_id: string
        }
        Insert: {
          error_code?: string | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          idempotency_key: string
          payload?: Json | null
          requested_at?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["import_job_status"]
          user_id: string
        }
        Update: {
          error_code?: string | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          idempotency_key?: string
          payload?: Json | null
          requested_at?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["import_job_status"]
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          onboarded_at: string | null
          steam_display_name: string | null
          steam_id: string | null
          suggestion_weights: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          onboarded_at?: string | null
          steam_display_name?: string | null
          steam_id?: string | null
          suggestion_weights?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          onboarded_at?: string | null
          steam_display_name?: string | null
          steam_id?: string | null
          suggestion_weights?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_games: {
        Row: {
          achievements_unlocked: number | null
          completed_at: string | null
          created_at: string
          game_id: number
          imported_at: string
          in_progress_position: number | null
          removed_at: string | null
          status: Database["public"]["Enums"]["game_play_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          achievements_unlocked?: number | null
          completed_at?: string | null
          created_at?: string
          game_id: number
          imported_at?: string
          in_progress_position?: number | null
          removed_at?: string | null
          status?: Database["public"]["Enums"]["game_play_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          achievements_unlocked?: number | null
          completed_at?: string | null
          created_at?: string
          game_id?: number
          imported_at?: string
          in_progress_position?: number | null
          removed_at?: string | null
          status?: Database["public"]["Enums"]["game_play_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_games_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["steam_app_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_analytics_events_partition: {
        Args: { p_partition_start: string }
        Returns: undefined
      }
      drop_analytics_events_partition: {
        Args: { p_partition_start: string }
        Returns: undefined
      }
      ensure_policy: {
        Args: {
          policy_name: string
          policy_sql: string
          schema_name: string
          table_name: string
        }
        Returns: undefined
      }
      immutable_unaccent: { Args: { input: string }; Returns: string }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      unaccent: { Args: { "": string }; Returns: string }
    }
    Enums: {
      game_play_status: "backlog" | "in_progress" | "completed" | "removed"
      import_job_status: "pending" | "running" | "succeeded" | "failed"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      game_play_status: ["backlog", "in_progress", "completed", "removed"],
      import_job_status: ["pending", "running", "succeeded", "failed"],
    },
  },
} as const

