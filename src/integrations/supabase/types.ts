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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          created_at: string
          description: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
          module: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          description: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          module: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          description?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          module?: string
          user_id?: string
        }
        Relationships: []
      }
      checklist_items: {
        Row: {
          checklist_id: string
          created_at: string | null
          current_quantity: number | null
          id: string
          inventory_item_id: string | null
          is_checked: boolean | null
          item_text: string
          order_index: number
          target_quantity: number | null
        }
        Insert: {
          checklist_id: string
          created_at?: string | null
          current_quantity?: number | null
          id?: string
          inventory_item_id?: string | null
          is_checked?: boolean | null
          item_text: string
          order_index: number
          target_quantity?: number | null
        }
        Update: {
          checklist_id?: string
          created_at?: string | null
          current_quantity?: number | null
          id?: string
          inventory_item_id?: string | null
          is_checked?: boolean | null
          item_text?: string
          order_index?: number
          target_quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "checklist_items_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      checklists: {
        Row: {
          checklist_type: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          name: string
          service_tag: string | null
          updated_at: string | null
        }
        Insert: {
          checklist_type?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          service_tag?: string | null
          updated_at?: string | null
        }
        Update: {
          checklist_type?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          service_tag?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      document_audit_log: {
        Row: {
          action: string
          created_at: string | null
          document_id: string | null
          id: string
          ip_address: unknown
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          document_id?: string | null
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          document_id?: string | null
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_audit_log_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_audit_log_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents_expiring_soon"
            referencedColumns: ["id"]
          },
        ]
      }
      document_tags: {
        Row: {
          created_at: string | null
          document_id: string
          id: string
          tag_id: string
        }
        Insert: {
          created_at?: string | null
          document_id: string
          id?: string
          tag_id: string
        }
        Update: {
          created_at?: string | null
          document_id?: string
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_tags_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_tags_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents_expiring_soon"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          category: Database["public"]["Enums"]["document_category"]
          created_at: string | null
          description: string | null
          employee_folder: string | null
          expiry_date: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          folder_id: string | null
          id: string
          title: string
          uploaded_at: string | null
          user_id: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["document_category"]
          created_at?: string | null
          description?: string | null
          employee_folder?: string | null
          expiry_date?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          folder_id?: string | null
          id?: string
          title: string
          uploaded_at?: string | null
          user_id?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["document_category"]
          created_at?: string | null
          description?: string | null
          employee_folder?: string | null
          expiry_date?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          folder_id?: string | null
          id?: string
          title?: string
          uploaded_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_folders: {
        Row: {
          created_at: string
          created_by: string | null
          folder_id: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          folder_id: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          folder_id?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      folders: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          parent_folder_id: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          parent_folder_id?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          parent_folder_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "folders_parent_folder_id_fkey"
            columns: ["parent_folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          category: string | null
          id: string
          item_name: string
          last_updated: string | null
          location: string | null
          min_quantity: number | null
          notes: string | null
          quantity: number | null
          unit: string | null
          updated_by: string | null
        }
        Insert: {
          category?: string | null
          id?: string
          item_name: string
          last_updated?: string | null
          location?: string | null
          min_quantity?: number | null
          notes?: string | null
          quantity?: number | null
          unit?: string | null
          updated_by?: string | null
        }
        Update: {
          category?: string | null
          id?: string
          item_name?: string
          last_updated?: string | null
          location?: string | null
          min_quantity?: number | null
          notes?: string | null
          quantity?: number | null
          unit?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      maintenance_records: {
        Row: {
          actions_taken: string | null
          completion_date: string | null
          cost: number | null
          created_at: string | null
          created_by: string | null
          description: string
          equipment_code: string
          equipment_name: string
          hours_spent: number | null
          id: string
          maintenance_type: string
          next_maintenance: string | null
          parts_used: string | null
          priority: string
          scheduled_date: string
          status: string
          technician: string
          updated_at: string | null
        }
        Insert: {
          actions_taken?: string | null
          completion_date?: string | null
          cost?: number | null
          created_at?: string | null
          created_by?: string | null
          description: string
          equipment_code: string
          equipment_name: string
          hours_spent?: number | null
          id?: string
          maintenance_type: string
          next_maintenance?: string | null
          parts_used?: string | null
          priority: string
          scheduled_date: string
          status: string
          technician: string
          updated_at?: string | null
        }
        Update: {
          actions_taken?: string | null
          completion_date?: string | null
          cost?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string
          equipment_code?: string
          equipment_name?: string
          hours_spent?: number | null
          id?: string
          maintenance_type?: string
          next_maintenance?: string | null
          parts_used?: string | null
          priority?: string
          scheduled_date?: string
          status?: string
          technician?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          related_id: string | null
          related_module: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          related_id?: string | null
          related_module?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          related_id?: string | null
          related_module?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          aplicacao: string | null
          cliente: string
          codigo_jbr: string
          created_at: string | null
          created_by: string | null
          data_inicio: string | null
          data_termino: string | null
          equipamentos: string | null
          escopo: string[] | null
          id: string
          outros_escopo: string | null
          updated_at: string | null
        }
        Insert: {
          aplicacao?: string | null
          cliente: string
          codigo_jbr: string
          created_at?: string | null
          created_by?: string | null
          data_inicio?: string | null
          data_termino?: string | null
          equipamentos?: string | null
          escopo?: string[] | null
          id?: string
          outros_escopo?: string | null
          updated_at?: string | null
        }
        Update: {
          aplicacao?: string | null
          cliente?: string
          codigo_jbr?: string
          created_at?: string | null
          created_by?: string | null
          data_inicio?: string | null
          data_termino?: string | null
          equipamentos?: string | null
          escopo?: string[] | null
          id?: string
          outros_escopo?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tags: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          company: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          position: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          position?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          position?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          approved: boolean | null
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          approved?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          approved?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      documents_expiring_soon: {
        Row: {
          category: Database["public"]["Enums"]["document_category"] | null
          created_at: string | null
          days_until_expiry: number | null
          description: string | null
          employee_folder: string | null
          employee_name: string | null
          expiry_date: string | null
          file_name: string | null
          file_path: string | null
          file_size: number | null
          file_type: string | null
          folder_id: string | null
          id: string | null
          title: string | null
          uploaded_at: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "inspector" | "viewer" | "moderator"
      document_category:
        | "procedimentos_oficiais"
        | "inspecoes"
        | "procedimentos_tecnicos"
        | "treinamento"
        | "modelos_relatorios"
        | "resolucao_problemas"
        | "duvidas_frequentes"
        | "historico"
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
      app_role: ["admin", "inspector", "viewer", "moderator"],
      document_category: [
        "procedimentos_oficiais",
        "inspecoes",
        "procedimentos_tecnicos",
        "treinamento",
        "modelos_relatorios",
        "resolucao_problemas",
        "duvidas_frequentes",
        "historico",
      ],
    },
  },
} as const
