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
      assistant_conversations: {
        Row: {
          created_at: string | null
          id: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      assistant_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          role: string
          sources: Json | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          role: string
          sources?: Json | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          role?: string
          sources?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "assistant_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "assistant_conversations"
            referencedColumns: ["id"]
          },
        ]
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
          is_template: boolean | null
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
          is_template?: boolean | null
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
          is_template?: boolean | null
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
      document_embeddings: {
        Row: {
          chunk_index: number
          content: string
          created_at: string | null
          document_id: string | null
          embedding: string | null
          id: string
          metadata: Json | null
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string | null
          document_id?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string | null
          document_id?: string | null
          embedding?: string | null
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "document_embeddings_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "technical_documents"
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
      equipment: {
        Row: {
          acquisition_date: string | null
          calibration_interval_months: number | null
          category: string
          code: string
          condition: Database["public"]["Enums"]["equipment_condition"] | null
          created_at: string | null
          created_by: string | null
          current_location: string | null
          current_service_id: string | null
          id: string
          inventory_item_id: string | null
          last_calibration: string | null
          manufacturer: string | null
          model: string | null
          name: string
          next_calibration: string | null
          notes: string | null
          photo_url: string | null
          serial_number: string | null
          status: Database["public"]["Enums"]["equipment_status"] | null
          updated_at: string | null
        }
        Insert: {
          acquisition_date?: string | null
          calibration_interval_months?: number | null
          category: string
          code: string
          condition?: Database["public"]["Enums"]["equipment_condition"] | null
          created_at?: string | null
          created_by?: string | null
          current_location?: string | null
          current_service_id?: string | null
          id?: string
          inventory_item_id?: string | null
          last_calibration?: string | null
          manufacturer?: string | null
          model?: string | null
          name: string
          next_calibration?: string | null
          notes?: string | null
          photo_url?: string | null
          serial_number?: string | null
          status?: Database["public"]["Enums"]["equipment_status"] | null
          updated_at?: string | null
        }
        Update: {
          acquisition_date?: string | null
          calibration_interval_months?: number | null
          category?: string
          code?: string
          condition?: Database["public"]["Enums"]["equipment_condition"] | null
          created_at?: string | null
          created_by?: string | null
          current_location?: string | null
          current_service_id?: string | null
          id?: string
          inventory_item_id?: string | null
          last_calibration?: string | null
          manufacturer?: string | null
          model?: string | null
          name?: string
          next_calibration?: string | null
          notes?: string | null
          photo_url?: string | null
          serial_number?: string | null
          status?: Database["public"]["Enums"]["equipment_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_current_service_id_fkey"
            columns: ["current_service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_allocations: {
        Row: {
          checked_in_by: string | null
          checked_out_by: string
          checkin_date: string | null
          checkin_notes: string | null
          checkout_date: string
          checkout_notes: string | null
          condition_on_checkin:
            | Database["public"]["Enums"]["equipment_condition"]
            | null
          condition_on_checkout: Database["public"]["Enums"]["equipment_condition"]
          created_at: string | null
          destination: string | null
          equipment_id: string
          id: string
          service_id: string | null
        }
        Insert: {
          checked_in_by?: string | null
          checked_out_by: string
          checkin_date?: string | null
          checkin_notes?: string | null
          checkout_date?: string
          checkout_notes?: string | null
          condition_on_checkin?:
            | Database["public"]["Enums"]["equipment_condition"]
            | null
          condition_on_checkout: Database["public"]["Enums"]["equipment_condition"]
          created_at?: string | null
          destination?: string | null
          equipment_id: string
          id?: string
          service_id?: string | null
        }
        Update: {
          checked_in_by?: string | null
          checked_out_by?: string
          checkin_date?: string | null
          checkin_notes?: string | null
          checkout_date?: string
          checkout_notes?: string | null
          condition_on_checkin?:
            | Database["public"]["Enums"]["equipment_condition"]
            | null
          condition_on_checkout?: Database["public"]["Enums"]["equipment_condition"]
          created_at?: string | null
          destination?: string | null
          equipment_id?: string
          id?: string
          service_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_allocations_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_allocations_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
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
      inspection_reports: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          report_data: Json
          report_number: string
          status: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          report_data: Json
          report_number: string
          status?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          report_data?: Json
          report_number?: string
          status?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      inventory: {
        Row: {
          acquisition_date: string | null
          calibration_interval_months: number | null
          category: string | null
          code: string | null
          condition: Database["public"]["Enums"]["equipment_condition"] | null
          current_location: string | null
          id: string
          item_name: string
          item_type: Database["public"]["Enums"]["item_type"]
          last_calibration: string | null
          last_updated: string | null
          location: string | null
          manufacturer: string | null
          min_quantity: number | null
          model: string | null
          next_calibration: string | null
          notes: string | null
          photo_url: string | null
          quantity: number | null
          serial_number: string | null
          status: Database["public"]["Enums"]["equipment_status"] | null
          unit: string | null
          updated_by: string | null
        }
        Insert: {
          acquisition_date?: string | null
          calibration_interval_months?: number | null
          category?: string | null
          code?: string | null
          condition?: Database["public"]["Enums"]["equipment_condition"] | null
          current_location?: string | null
          id?: string
          item_name: string
          item_type?: Database["public"]["Enums"]["item_type"]
          last_calibration?: string | null
          last_updated?: string | null
          location?: string | null
          manufacturer?: string | null
          min_quantity?: number | null
          model?: string | null
          next_calibration?: string | null
          notes?: string | null
          photo_url?: string | null
          quantity?: number | null
          serial_number?: string | null
          status?: Database["public"]["Enums"]["equipment_status"] | null
          unit?: string | null
          updated_by?: string | null
        }
        Update: {
          acquisition_date?: string | null
          calibration_interval_months?: number | null
          category?: string | null
          code?: string | null
          condition?: Database["public"]["Enums"]["equipment_condition"] | null
          current_location?: string | null
          id?: string
          item_name?: string
          item_type?: Database["public"]["Enums"]["item_type"]
          last_calibration?: string | null
          last_updated?: string | null
          location?: string | null
          manufacturer?: string | null
          min_quantity?: number | null
          model?: string | null
          next_calibration?: string | null
          notes?: string | null
          photo_url?: string | null
          quantity?: number | null
          serial_number?: string | null
          status?: Database["public"]["Enums"]["equipment_status"] | null
          unit?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      inventory_allocations: {
        Row: {
          checked_in_by: string | null
          checked_out_by: string
          checkin_date: string | null
          checkin_notes: string | null
          checkout_date: string
          checkout_notes: string | null
          condition_on_checkin:
            | Database["public"]["Enums"]["equipment_condition"]
            | null
          condition_on_checkout: Database["public"]["Enums"]["equipment_condition"]
          created_at: string | null
          destination: string | null
          id: string
          inventory_item_id: string
          service_id: string | null
        }
        Insert: {
          checked_in_by?: string | null
          checked_out_by: string
          checkin_date?: string | null
          checkin_notes?: string | null
          checkout_date?: string
          checkout_notes?: string | null
          condition_on_checkin?:
            | Database["public"]["Enums"]["equipment_condition"]
            | null
          condition_on_checkout: Database["public"]["Enums"]["equipment_condition"]
          created_at?: string | null
          destination?: string | null
          id?: string
          inventory_item_id: string
          service_id?: string | null
        }
        Update: {
          checked_in_by?: string | null
          checked_out_by?: string
          checkin_date?: string | null
          checkin_notes?: string | null
          checkout_date?: string
          checkout_notes?: string | null
          condition_on_checkin?:
            | Database["public"]["Enums"]["equipment_condition"]
            | null
          condition_on_checkout?: Database["public"]["Enums"]["equipment_condition"]
          created_at?: string | null
          destination?: string | null
          id?: string
          inventory_item_id?: string
          service_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_allocations_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_allocations_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_consumption_history: {
        Row: {
          action_source: string | null
          change_type: string
          checklist_id: string | null
          created_at: string
          created_by: string | null
          id: string
          inventory_item_id: string
          item_name: string | null
          new_quantity: number
          notes: string | null
          previous_quantity: number
          quantity_change: number
          service_id: string | null
        }
        Insert: {
          action_source?: string | null
          change_type: string
          checklist_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          inventory_item_id: string
          item_name?: string | null
          new_quantity: number
          notes?: string | null
          previous_quantity: number
          quantity_change: number
          service_id?: string | null
        }
        Update: {
          action_source?: string | null
          change_type?: string
          checklist_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          inventory_item_id?: string
          item_name?: string | null
          new_quantity?: number
          notes?: string | null
          previous_quantity?: number
          quantity_change?: number
          service_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_consumption_history_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_consumption_history_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_consumption_history_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_predictions: {
        Row: {
          confidence_score: number | null
          created_at: string
          id: string
          inventory_item_id: string
          predicted_value: Json
          prediction_type: string
          valid_until: string | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          id?: string
          inventory_item_id: string
          predicted_value: Json
          prediction_type: string
          valid_until?: string | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          id?: string
          inventory_item_id?: string
          predicted_value?: Json
          prediction_type?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_predictions_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
        ]
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
          equipment_id: string | null
          equipment_name: string
          hours_spent: number | null
          id: string
          inventory_item_id: string | null
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
          equipment_id?: string | null
          equipment_name: string
          hours_spent?: number | null
          id?: string
          inventory_item_id?: string | null
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
          equipment_id?: string | null
          equipment_name?: string
          hours_spent?: number | null
          id?: string
          inventory_item_id?: string | null
          maintenance_type?: string
          next_maintenance?: string | null
          parts_used?: string | null
          priority?: string
          scheduled_date?: string
          status?: string
          technician?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_records_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_records_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
        ]
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
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      report_knowledge: {
        Row: {
          client: string | null
          created_at: string
          created_by: string | null
          extracted_data: Json | null
          id: string
          improvements: string[] | null
          quality_score: number | null
          report_id: string | null
          scope_type: string
          strengths: string[] | null
          uploaded_file_path: string | null
        }
        Insert: {
          client?: string | null
          created_at?: string
          created_by?: string | null
          extracted_data?: Json | null
          id?: string
          improvements?: string[] | null
          quality_score?: number | null
          report_id?: string | null
          scope_type: string
          strengths?: string[] | null
          uploaded_file_path?: string | null
        }
        Update: {
          client?: string | null
          created_at?: string
          created_by?: string | null
          extracted_data?: Json | null
          id?: string
          improvements?: string[] | null
          quality_score?: number | null
          report_id?: string | null
          scope_type?: string
          strengths?: string[] | null
          uploaded_file_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_knowledge_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "inspection_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      report_patterns: {
        Row: {
          average_score: number | null
          created_at: string
          description: string
          examples: Json | null
          frequency: number
          id: string
          pattern_type: string
          scope_type: string
          updated_at: string
        }
        Insert: {
          average_score?: number | null
          created_at?: string
          description: string
          examples?: Json | null
          frequency?: number
          id?: string
          pattern_type: string
          scope_type: string
          updated_at?: string
        }
        Update: {
          average_score?: number | null
          created_at?: string
          description?: string
          examples?: Json | null
          frequency?: number
          id?: string
          pattern_type?: string
          scope_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      service_checklists: {
        Row: {
          checklist_id: string
          created_at: string | null
          id: string
          service_id: string
        }
        Insert: {
          checklist_id: string
          created_at?: string | null
          id?: string
          service_id: string
        }
        Update: {
          checklist_id?: string
          created_at?: string | null
          id?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_checklists_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_checklists_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_collaborators: {
        Row: {
          created_at: string | null
          id: string
          role: string | null
          service_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: string | null
          service_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string | null
          service_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_collaborators_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
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
          local: string | null
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
          local?: string | null
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
          local?: string | null
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
      technical_documents: {
        Row: {
          document_type: string
          error_message: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          processed_at: string | null
          status: string
          title: string
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          document_type?: string
          error_message?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          processed_at?: string | null
          status?: string
          title: string
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          document_type?: string
          error_message?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          processed_at?: string | null
          status?: string
          title?: string
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: []
      }
      time_entries: {
        Row: {
          check_in_type: Database["public"]["Enums"]["check_in_type"]
          created_at: string | null
          entry_date: string
          id: string
          notes: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          check_in_type: Database["public"]["Enums"]["check_in_type"]
          created_at?: string | null
          entry_date: string
          id?: string
          notes?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          check_in_type?: Database["public"]["Enums"]["check_in_type"]
          created_at?: string | null
          entry_date?: string
          id?: string
          notes?: string | null
          updated_at?: string | null
          user_id?: string
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
          language_preference: string | null
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
          language_preference?: string | null
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
          language_preference?: string | null
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
      check_expiring_calibrations: { Args: never; Returns: undefined }
      check_expiring_documents: { Args: never; Returns: undefined }
      check_maintenance_due: { Args: never; Returns: undefined }
      create_notification_with_push: {
        Args: {
          p_message: string
          p_related_id?: string
          p_related_module?: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      get_services_with_counts: {
        Args: never
        Returns: {
          aplicacao: string
          checklists_count: number
          cliente: string
          codigo_jbr: string
          collaborators_count: number
          created_at: string
          data_inicio: string
          data_termino: string
          equipamentos: string
          escopo: string[]
          id: string
          local: string
          outros_escopo: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      search_document_content: {
        Args: { match_count?: number; search_query: string }
        Returns: {
          content: string
          document_id: string
          id: string
          metadata: Json
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "inspector" | "viewer" | "moderator"
      check_in_type:
        | "home_office"
        | "offshore"
        | "travel"
        | "base"
        | "day_off"
        | "vacation"
      document_category:
        | "procedimentos_oficiais"
        | "inspecoes"
        | "procedimentos_tecnicos"
        | "treinamento"
        | "modelos_relatorios"
        | "resolucao_problemas"
        | "duvidas_frequentes"
        | "historico"
      equipment_condition:
        | "excellent"
        | "good"
        | "fair"
        | "needs_repair"
        | "damaged"
      equipment_status:
        | "available"
        | "in_service"
        | "maintenance"
        | "calibration"
        | "inactive"
      item_type: "consumivel" | "equipamento"
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
      check_in_type: [
        "home_office",
        "offshore",
        "travel",
        "base",
        "day_off",
        "vacation",
      ],
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
      equipment_condition: [
        "excellent",
        "good",
        "fair",
        "needs_repair",
        "damaged",
      ],
      equipment_status: [
        "available",
        "in_service",
        "maintenance",
        "calibration",
        "inactive",
      ],
      item_type: ["consumivel", "equipamento"],
    },
  },
} as const
