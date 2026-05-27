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
      devotional_days: {
        Row: {
          chapter: string
          commentary: string
          created_at: string
          day_number: number
          id: string
          plan_id: string
          reflection_q1: string
          reflection_q2: string
          theme: string | null
        }
        Insert: {
          chapter: string
          commentary: string
          created_at?: string
          day_number: number
          id?: string
          plan_id: string
          reflection_q1: string
          reflection_q2: string
          theme?: string | null
        }
        Update: {
          chapter?: string
          commentary?: string
          created_at?: string
          day_number?: number
          id?: string
          plan_id?: string
          reflection_q1?: string
          reflection_q2?: string
          theme?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "devotional_days_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "devotional_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      devotional_plans: {
        Row: {
          category: string
          created_at: string
          description: string | null
          how_to_use: string | null
          id: string
          image_url: string | null
          subtitle: string | null
          title: string
          total_days: number
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          how_to_use?: string | null
          id?: string
          image_url?: string | null
          subtitle?: string | null
          title: string
          total_days?: number
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          how_to_use?: string | null
          id?: string
          image_url?: string | null
          subtitle?: string | null
          title?: string
          total_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      devotional_submissions: {
        Row: {
          day_number: number
          id: string
          plan_id: string
          prayer: string | null
          prayer_private: boolean
          q1_private: boolean
          q2_private: boolean
          response1: string | null
          response2: string | null
          submission_source: string
          submitted_at: string
          updated_at: string
          user_id: string
          voice_memo_private: boolean
          voice_memo_url: string | null
        }
        Insert: {
          day_number: number
          id?: string
          plan_id: string
          prayer?: string | null
          prayer_private?: boolean
          q1_private?: boolean
          q2_private?: boolean
          response1?: string | null
          response2?: string | null
          submission_source?: string
          submitted_at?: string
          updated_at?: string
          user_id: string
          voice_memo_private?: boolean
          voice_memo_url?: string | null
        }
        Update: {
          day_number?: number
          id?: string
          plan_id?: string
          prayer?: string | null
          prayer_private?: boolean
          q1_private?: boolean
          q2_private?: boolean
          response1?: string | null
          response2?: string | null
          submission_source?: string
          submitted_at?: string
          updated_at?: string
          user_id?: string
          voice_memo_private?: boolean
          voice_memo_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "devotional_submissions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "devotional_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      disciple_relationships: {
        Row: {
          created_at: string
          disciple_id: string
          discipler_id: string
          id: string
          status: string
        }
        Insert: {
          created_at?: string
          disciple_id: string
          discipler_id: string
          id?: string
          status?: string
        }
        Update: {
          created_at?: string
          disciple_id?: string
          discipler_id?: string
          id?: string
          status?: string
        }
        Relationships: []
      }
      discipler_notes: {
        Row: {
          created_at: string
          from_user_id: string
          id: string
          note: string
          related_submission_id: string | null
          to_user_id: string
        }
        Insert: {
          created_at?: string
          from_user_id: string
          id?: string
          note: string
          related_submission_id?: string | null
          to_user_id: string
        }
        Update: {
          created_at?: string
          from_user_id?: string
          id?: string
          note?: string
          related_submission_id?: string | null
          to_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discipler_notes_related_submission_id_fkey"
            columns: ["related_submission_id"]
            isOneToOne: false
            referencedRelation: "devotional_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          member_role: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          member_role?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          member_role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          created_by: string
          current_day: number
          current_plan_id: string | null
          group_type: string
          id: string
          invite_code: string
          name: string
          streak_count: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          current_day?: number
          current_plan_id?: string | null
          group_type: string
          id?: string
          invite_code?: string
          name: string
          streak_count?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          current_day?: number
          current_plan_id?: string | null
          group_type?: string
          id?: string
          invite_code?: string
          name?: string
          streak_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_current_plan_id_fkey"
            columns: ["current_plan_id"]
            isOneToOne: false
            referencedRelation: "devotional_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          church_name: string | null
          created_at: string
          display_name: string
          id: string
          primary_role: string
          streak_count: number
          survey_age_range: string | null
          survey_church_name: string | null
          survey_completed_at: string | null
          survey_devotional_rating: number | null
          survey_education: string | null
          survey_faith_journey: string | null
          survey_goals: string[] | null
          survey_has_church: boolean | null
          survey_name: string | null
          survey_state: string | null
          total_completed: number
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          church_name?: string | null
          created_at?: string
          display_name: string
          id?: string
          primary_role?: string
          streak_count?: number
          survey_age_range?: string | null
          survey_church_name?: string | null
          survey_completed_at?: string | null
          survey_devotional_rating?: number | null
          survey_education?: string | null
          survey_faith_journey?: string | null
          survey_goals?: string[] | null
          survey_has_church?: boolean | null
          survey_name?: string | null
          survey_state?: string | null
          total_completed?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          church_name?: string | null
          created_at?: string
          display_name?: string
          id?: string
          primary_role?: string
          streak_count?: number
          survey_age_range?: string | null
          survey_church_name?: string | null
          survey_completed_at?: string | null
          survey_devotional_rating?: number | null
          survey_education?: string | null
          survey_faith_journey?: string | null
          survey_goals?: string[] | null
          survey_has_church?: boolean | null
          survey_name?: string | null
          survey_state?: string | null
          total_completed?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      study_notes: {
        Row: {
          created_at: string
          day_number: number
          id: string
          notes: Json
          passage_reference: string
          plan_id: string
          source: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_number: number
          id?: string
          notes?: Json
          passage_reference: string
          plan_id: string
          source?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_number?: number
          id?: string
          notes?: Json
          passage_reference?: string
          plan_id?: string
          source?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_notes_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "devotional_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      submission_reactions: {
        Row: {
          created_at: string
          id: string
          reaction_type: string
          submission_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reaction_type: string
          submission_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reaction_type?: string
          submission_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submission_reactions_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "devotional_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_plan_progress: {
        Row: {
          completed_at: string | null
          current_day: number
          id: string
          plan_id: string
          started_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          current_day?: number
          id?: string
          plan_id: string
          started_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          current_day?: number
          id?: string
          plan_id?: string
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_plan_progress_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "devotional_plans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      submission_analytics: {
        Row: {
          commute_count: number | null
          last_submission_at: string | null
          plans_engaged: number | null
          total_submissions: number | null
          typed_count: number | null
          user_id: string | null
          voice_memo_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      is_discipler_of: {
        Args: { _disciple: string; _discipler: string }
        Returns: boolean
      }
      is_group_member: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      shares_group: {
        Args: { _user_a: string; _user_b: string }
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
