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
      asset_formula_mappings: {
        Row: {
          aggregatable: boolean | null
          asset_type_id: string
          created_at: string | null
          deleted_at: string | null
          description: string | null
          field_type: string | null
          id: string
          is_deleted: boolean | null
          organization_id: string
          source_field: string
          target_field: string
          updated_at: string | null
        }
        Insert: {
          aggregatable?: boolean | null
          asset_type_id: string
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          field_type?: string | null
          id?: string
          is_deleted?: boolean | null
          organization_id: string
          source_field: string
          target_field: string
          updated_at?: string | null
        }
        Update: {
          aggregatable?: boolean | null
          asset_type_id?: string
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          field_type?: string | null
          id?: string
          is_deleted?: boolean | null
          organization_id?: string
          source_field?: string
          target_field?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_formula_mappings_asset_type_id_fkey"
            columns: ["asset_type_id"]
            isOneToOne: false
            referencedRelation: "asset_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_formula_mappings_asset_type_id_fkey"
            columns: ["asset_type_id"]
            isOneToOne: false
            referencedRelation: "inventory_aggregation_report"
            referencedColumns: ["asset_type_id"]
          },
          {
            foreignKeyName: "asset_formula_mappings_asset_type_id_fkey"
            columns: ["asset_type_id"]
            isOneToOne: false
            referencedRelation: "mv_asset_type_summary"
            referencedColumns: ["asset_type_id"]
          },
          {
            foreignKeyName: "asset_formula_mappings_asset_type_id_fkey"
            columns: ["asset_type_id"]
            isOneToOne: false
            referencedRelation: "qr_asset_details"
            referencedColumns: ["asset_type_id"]
          },
          {
            foreignKeyName: "asset_formula_mappings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_formulas: {
        Row: {
          asset_type_id: string | null
          created_at: string
          formula: string
          id: string
          inventory_item_id: string | null
          organization_id: string
          source_field: string
          target_field: string
          updated_at: string
        }
        Insert: {
          asset_type_id?: string | null
          created_at?: string
          formula: string
          id?: string
          inventory_item_id?: string | null
          organization_id: string
          source_field: string
          target_field: string
          updated_at?: string
        }
        Update: {
          asset_type_id?: string | null
          created_at?: string
          formula?: string
          id?: string
          inventory_item_id?: string | null
          organization_id?: string
          source_field?: string
          target_field?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_formulas_asset_type_id_fkey"
            columns: ["asset_type_id"]
            isOneToOne: false
            referencedRelation: "asset_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_formulas_asset_type_id_fkey"
            columns: ["asset_type_id"]
            isOneToOne: false
            referencedRelation: "inventory_aggregation_report"
            referencedColumns: ["asset_type_id"]
          },
          {
            foreignKeyName: "asset_formulas_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "asset_inventory_with_price_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_formulas_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_formulas_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_type_forms: {
        Row: {
          asset_type_id: string
          created_at: string
          form_id: string
          id: string
          organization_id: string
          purpose: string | null
          updated_at: string
        }
        Insert: {
          asset_type_id: string
          created_at?: string
          form_id: string
          id?: string
          organization_id: string
          purpose?: string | null
          updated_at?: string
        }
        Update: {
          asset_type_id?: string
          created_at?: string
          form_id?: string
          id?: string
          organization_id?: string
          purpose?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_type_forms_asset_type_id_fkey"
            columns: ["asset_type_id"]
            isOneToOne: false
            referencedRelation: "asset_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_type_forms_asset_type_id_fkey"
            columns: ["asset_type_id"]
            isOneToOne: false
            referencedRelation: "inventory_aggregation_report"
            referencedColumns: ["asset_type_id"]
          },
          {
            foreignKeyName: "asset_type_forms_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_type_forms_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_types: {
        Row: {
          barcode_prefix: string | null
          barcode_type: string | null
          calculation_formulas: Json | null
          color: string | null
          conversion_fields: Json | null
          created_at: string
          default_conversion_settings: Json | null
          deleted_at: string | null
          description: string | null
          enable_barcodes: boolean | null
          icon: string | null
          id: string
          intake_form_id: string | null
          inventory_form_id: string | null
          mapping_form_id: string | null
          measurement_units: Json | null
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          barcode_prefix?: string | null
          barcode_type?: string | null
          calculation_formulas?: Json | null
          color?: string | null
          conversion_fields?: Json | null
          created_at?: string
          default_conversion_settings?: Json | null
          deleted_at?: string | null
          description?: string | null
          enable_barcodes?: boolean | null
          icon?: string | null
          id?: string
          intake_form_id?: string | null
          inventory_form_id?: string | null
          mapping_form_id?: string | null
          measurement_units?: Json | null
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          barcode_prefix?: string | null
          barcode_type?: string | null
          calculation_formulas?: Json | null
          color?: string | null
          conversion_fields?: Json | null
          created_at?: string
          default_conversion_settings?: Json | null
          deleted_at?: string | null
          description?: string | null
          enable_barcodes?: boolean | null
          icon?: string | null
          id?: string
          intake_form_id?: string | null
          inventory_form_id?: string | null
          mapping_form_id?: string | null
          measurement_units?: Json | null
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_types_intake_form_id_fkey"
            columns: ["intake_form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_types_inventory_form_id_fkey"
            columns: ["inventory_form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_types_mapping_form_id_fkey"
            columns: ["mapping_form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_types_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          acquisition_date: string | null
          asset_type_id: string | null
          barcode: string | null
          barcode_type: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          description: string | null
          id: string
          is_deleted: boolean | null
          metadata: Json | null
          name: string
          organization_id: string | null
          parent_asset_id: string | null
          serial_number: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          acquisition_date?: string | null
          asset_type_id?: string | null
          barcode?: string | null
          barcode_type?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_deleted?: boolean | null
          metadata?: Json | null
          name: string
          organization_id?: string | null
          parent_asset_id?: string | null
          serial_number?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          acquisition_date?: string | null
          asset_type_id?: string | null
          barcode?: string | null
          barcode_type?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_deleted?: boolean | null
          metadata?: Json | null
          name?: string
          organization_id?: string | null
          parent_asset_id?: string | null
          serial_number?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_asset_type_id_fkey"
            columns: ["asset_type_id"]
            isOneToOne: false
            referencedRelation: "asset_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_asset_type_id_fkey"
            columns: ["asset_type_id"]
            isOneToOne: false
            referencedRelation: "inventory_aggregation_report"
            referencedColumns: ["asset_type_id"]
          },
          {
            foreignKeyName: "assets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_parent_asset_id_fkey"
            columns: ["parent_asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      form_categories: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      form_category_mappings: {
        Row: {
          category_id: string
          created_at: string
          form_id: string
          id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          form_id: string
          id?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          form_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_category_mappings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "form_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_category_mappings_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      form_field_dependencies: {
        Row: {
          action: string
          condition: string
          condition_value: Json
          created_at: string
          form_id: string
          id: string
          source_field_id: string
          target_field_id: string
          updated_at: string
        }
        Insert: {
          action: string
          condition: string
          condition_value: Json
          created_at?: string
          form_id: string
          id?: string
          source_field_id: string
          target_field_id: string
          updated_at?: string
        }
        Update: {
          action?: string
          condition?: string
          condition_value?: Json
          created_at?: string
          form_id?: string
          id?: string
          source_field_id?: string
          target_field_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_field_dependencies_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      form_responses: {
        Row: {
          created_at: string
          form_id: string
          id: string
          inventory_item_id: string | null
          organization_id: string
          response_data: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          form_id: string
          id?: string
          inventory_item_id?: string | null
          organization_id: string
          response_data: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          form_id?: string
          id?: string
          inventory_item_id?: string | null
          organization_id?: string
          response_data?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_responses_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_responses_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "asset_inventory_with_price_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_responses_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_responses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      form_schedules: {
        Row: {
          asset_type_id: string | null
          created_at: string | null
          end_date: string | null
          form_id: string | null
          id: string
          organization_id: string | null
          repeat_interval: number | null
          repeat_type: string | null
          start_date: string | null
          updated_at: string | null
        }
        Insert: {
          asset_type_id?: string | null
          created_at?: string | null
          end_date?: string | null
          form_id?: string | null
          id?: string
          organization_id?: string | null
          repeat_interval?: number | null
          repeat_type?: string | null
          start_date?: string | null
          updated_at?: string | null
        }
        Update: {
          asset_type_id?: string | null
          created_at?: string | null
          end_date?: string | null
          form_id?: string | null
          id?: string
          organization_id?: string | null
          repeat_interval?: number | null
          repeat_type?: string | null
          start_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_schedules_asset_type_id_fkey"
            columns: ["asset_type_id"]
            isOneToOne: false
            referencedRelation: "asset_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_schedules_asset_type_id_fkey"
            columns: ["asset_type_id"]
            isOneToOne: false
            referencedRelation: "inventory_aggregation_report"
            referencedColumns: ["asset_type_id"]
          },
          {
            foreignKeyName: "form_schedules_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_schedules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      form_submissions: {
        Row: {
          asset_id: string | null
          asset_type_id: string | null
          calculation_results: Json | null
          created_at: string | null
          form_id: string | null
          id: string
          organization_id: string | null
          status: string | null
          submission_data: Json | null
          submitted_by: string | null
          updated_at: string | null
        }
        Insert: {
          asset_id?: string | null
          asset_type_id?: string | null
          calculation_results?: Json | null
          created_at?: string | null
          form_id?: string | null
          id?: string
          organization_id?: string | null
          status?: string | null
          submission_data?: Json | null
          submitted_by?: string | null
          updated_at?: string | null
        }
        Update: {
          asset_id?: string | null
          asset_type_id?: string | null
          calculation_results?: Json | null
          created_at?: string | null
          form_id?: string | null
          id?: string
          organization_id?: string | null
          status?: string | null
          submission_data?: Json | null
          submitted_by?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_submissions_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_asset_type_id_fkey"
            columns: ["asset_type_id"]
            isOneToOne: false
            referencedRelation: "asset_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_asset_type_id_fkey"
            columns: ["asset_type_id"]
            isOneToOne: false
            referencedRelation: "inventory_aggregation_report"
            referencedColumns: ["asset_type_id"]
          },
          {
            foreignKeyName: "form_submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      form_validation_rules: {
        Row: {
          created_at: string
          error_message: string | null
          field_id: string
          form_id: string
          id: string
          rule_type: string
          rule_value: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          field_id: string
          form_id: string
          id?: string
          rule_type: string
          rule_value?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          field_id?: string
          form_id?: string
          id?: string
          rule_type?: string
          rule_value?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_validation_rules_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      forms: {
        Row: {
          asset_types: string[]
          created_at: string
          deleted_at: string | null
          description: string | null
          form_data: Json
          form_type: string | null
          id: string
          is_template: boolean
          name: string
          organization_id: string
          purpose: string | null
          status: string
          updated_at: string
          version: number
        }
        Insert: {
          asset_types?: string[]
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          form_data: Json
          form_type?: string | null
          id?: string
          is_template?: boolean
          name: string
          organization_id: string
          purpose?: string | null
          status?: string
          updated_at?: string
          version?: number
        }
        Update: {
          asset_types?: string[]
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          form_data?: Json
          form_type?: string | null
          id?: string
          is_template?: boolean
          name?: string
          organization_id?: string
          purpose?: string | null
          status?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "forms_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_history: {
        Row: {
          adjustment_reason: string | null
          calculation_metadata: Json | null
          check_date: string | null
          check_type: string
          condition: string | null
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          edit_history: Json | null
          event_type: string
          id: string
          inventory_item_id: string | null
          is_deleted: boolean | null
          location: string | null
          month_year: string | null
          movement_type:
            | Database["public"]["Enums"]["inventory_movement_type"]
            | null
          notes: string | null
          organization_id: string | null
          previous_quantity: number | null
          quantity: number | null
          related_entity_id: string | null
          related_entity_type: string | null
          response_data: Json | null
          status: string | null
          updated_at: string | null
          validated_at: string | null
          validated_by: string | null
          validation_notes: string | null
          validation_status: string | null
        }
        Insert: {
          adjustment_reason?: string | null
          calculation_metadata?: Json | null
          check_date?: string | null
          check_type: string
          condition?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          edit_history?: Json | null
          event_type?: string
          id?: string
          inventory_item_id?: string | null
          is_deleted?: boolean | null
          location?: string | null
          month_year?: string | null
          movement_type?:
            | Database["public"]["Enums"]["inventory_movement_type"]
            | null
          notes?: string | null
          organization_id?: string | null
          previous_quantity?: number | null
          quantity?: number | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          response_data?: Json | null
          status?: string | null
          updated_at?: string | null
          validated_at?: string | null
          validated_by?: string | null
          validation_notes?: string | null
          validation_status?: string | null
        }
        Update: {
          adjustment_reason?: string | null
          calculation_metadata?: Json | null
          check_date?: string | null
          check_type?: string
          condition?: string | null
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          edit_history?: Json | null
          event_type?: string
          id?: string
          inventory_item_id?: string | null
          is_deleted?: boolean | null
          location?: string | null
          month_year?: string | null
          movement_type?:
            | Database["public"]["Enums"]["inventory_movement_type"]
            | null
          notes?: string | null
          organization_id?: string | null
          previous_quantity?: number | null
          quantity?: number | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          response_data?: Json | null
          status?: string | null
          updated_at?: string | null
          validated_at?: string | null
          validated_by?: string | null
          validation_notes?: string | null
          validation_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_history_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_history_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "asset_inventory_with_price_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_history_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_history_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          asset_id: string | null
          asset_type_id: string | null
          barcode: string | null
          category: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          current_price: number | null
          description: string | null
          id: string
          location: string | null
          metadata: Json | null
          name: string
          organization_id: string
          profile_image_url: string | null
          quantity: number
          sku: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          asset_id?: string | null
          asset_type_id?: string | null
          barcode?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          current_price?: number | null
          description?: string | null
          id?: string
          location?: string | null
          metadata?: Json | null
          name: string
          organization_id: string
          profile_image_url?: string | null
          quantity?: number
          sku?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          asset_id?: string | null
          asset_type_id?: string | null
          barcode?: string | null
          category?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          current_price?: number | null
          description?: string | null
          id?: string
          location?: string | null
          metadata?: Json | null
          name?: string
          organization_id?: string
          profile_image_url?: string | null
          quantity?: number
          sku?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_asset_type_id_fkey"
            columns: ["asset_type_id"]
            isOneToOne: false
            referencedRelation: "asset_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_asset_type_id_fkey"
            columns: ["asset_type_id"]
            isOneToOne: false
            referencedRelation: "inventory_aggregation_report"
            referencedColumns: ["asset_type_id"]
          },
          {
            foreignKeyName: "inventory_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_price_history: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string
          effective_date: string
          id: string
          inventory_item_id: string
          notes: string | null
          organization_id: string
          price: number
          submission_id: string | null
          unit_type: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency?: string
          effective_date?: string
          id?: string
          inventory_item_id: string
          notes?: string | null
          organization_id: string
          price: number
          submission_id?: string | null
          unit_type?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string
          effective_date?: string
          id?: string
          inventory_item_id?: string
          notes?: string | null
          organization_id?: string
          price?: number
          submission_id?: string | null
          unit_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_price_history_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_price_history_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "asset_inventory_with_price_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_price_history_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_price_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_price_history_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "form_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          organization_id: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
          organization_id: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          organization_id?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "locations_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      mapped_fields: {
        Row: {
          created_at: string
          description: string | null
          field_id: string
          field_label: string
          field_type: string
          form_id: string
          id: string
          inventory_action: string | null
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          field_id: string
          field_label: string
          field_type: string
          form_id: string
          id?: string
          inventory_action?: string | null
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          field_id?: string
          field_label?: string
          field_type?: string
          form_id?: string
          id?: string
          inventory_action?: string | null
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mapped_fields_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mapped_fields_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          custom_message: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string
          organization_id: string
          role: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          custom_message?: string | null
          email: string
          expires_at: string
          id?: string
          invited_by: string
          organization_id: string
          role: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          custom_message?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          organization_id?: string
          role?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          avatar_url: string | null
          created_at: string
          description: string | null
          id: string
          is_mothership: boolean
          name: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_mothership?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_mothership?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      platform_operators: {
        Row: {
          user_id: string
        }
        Insert: {
          user_id: string
        }
        Update: {
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_operators_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          deleted_at: string | null
          full_name: string | null
          id: string
          is_deleted: boolean | null
          quick_access_pin: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          full_name?: string | null
          id: string
          is_deleted?: boolean | null
          quick_access_pin?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          full_name?: string | null
          id?: string
          is_deleted?: boolean | null
          quick_access_pin?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      report_runs: {
        Row: {
          error_message: string | null
          execution_time_ms: number | null
          export_format: string | null
          id: string
          report_id: string
          row_count: number | null
          run_at: string
          run_by: string
          status: string
        }
        Insert: {
          error_message?: string | null
          execution_time_ms?: number | null
          export_format?: string | null
          id?: string
          report_id: string
          row_count?: number | null
          run_at?: string
          run_by: string
          status?: string
        }
        Update: {
          error_message?: string | null
          execution_time_ms?: number | null
          export_format?: string | null
          id?: string
          report_id?: string
          row_count?: number | null
          run_at?: string
          run_by?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_runs_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_runs_run_by_fkey"
            columns: ["run_by"]
            isOneToOne: false
            referencedRelation: "users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          is_favorite: boolean | null
          is_template: boolean | null
          last_run_at: string | null
          name: string
          organization_id: string
          report_config: Json
          template_category: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_favorite?: boolean | null
          is_template?: boolean | null
          last_run_at?: string | null
          name: string
          organization_id: string
          report_config: Json
          template_category?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_favorite?: boolean | null
          is_template?: boolean | null
          last_run_at?: string | null
          name?: string
          organization_id?: string
          report_config?: Json
          template_category?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      system_logs: {
        Row: {
          actor_id: string | null
          created_at: string
          details: Json | null
          id: string
          message: string
          organization_id: string | null
          type: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          message: string
          organization_id?: string | null
          type: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          message?: string
          organization_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users_view"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      asset_inventory_with_price_history: {
        Row: {
          asset_type_id: string | null
          asset_type_name: string | null
          barcode: string | null
          created_at: string | null
          currency: string | null
          current_price: number | null
          description: string | null
          id: string | null
          location: string | null
          name: string | null
          organization_id: string | null
          price_history: Json | null
          profile_image_url: string | null
          quantity: number | null
          sku: string | null
          status: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_asset_type_id_fkey"
            columns: ["asset_type_id"]
            isOneToOne: false
            referencedRelation: "asset_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_asset_type_id_fkey"
            columns: ["asset_type_id"]
            isOneToOne: false
            referencedRelation: "inventory_aggregation_report"
            referencedColumns: ["asset_type_id"]
          },
          {
            foreignKeyName: "inventory_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_aggregation_report: {
        Row: {
          asset_count: number | null
          asset_type_id: string | null
          asset_type_name: string | null
          field_description: string | null
          field_name: string | null
          organization_id: string | null
          organization_name: string | null
          report_month: string | null
          total_value: number | null
        }
        Relationships: [
          {
            foreignKeyName: "form_submissions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      mapped_fields_reporting: {
        Row: {
          asset_type_id: string | null
          asset_type_name: string | null
          field_id: string | null
          field_label: string | null
          field_type: string | null
          form_id: string | null
          form_name: string | null
          inventory_action: string | null
          mapped_field_created_at: string | null
          mapped_field_description: string | null
          mapped_field_updated_at: string | null
          organization_id: string | null
          purpose: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_type_forms_asset_type_id_fkey"
            columns: ["asset_type_id"]
            isOneToOne: false
            referencedRelation: "asset_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_type_forms_asset_type_id_fkey"
            columns: ["asset_type_id"]
            isOneToOne: false
            referencedRelation: "inventory_aggregation_report"
            referencedColumns: ["asset_type_id"]
          },
          {
            foreignKeyName: "asset_type_forms_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_type_forms_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_organization: {
        Row: {
          organization_id: string | null
          user_id: string | null
        }
        Insert: {
          organization_id?: string | null
          user_id?: string | null
        }
        Update: {
          organization_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users_view"
            referencedColumns: ["id"]
          },
        ]
      }
      users_view: {
        Row: {
          email: string | null
          full_name: string | null
          id: string | null
        }
        Insert: {
          email?: string | null
          full_name?: never
          id?: string | null
        }
        Update: {
          email?: string | null
          full_name?: never
          id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_invitation: {
        Args: { invitation_token: string }
        Returns: string
      }
      apply_asset_calculation_formulas: {
        Args:
          | { p_form_data: Json; p_calculation_formulas: Json }
          | {
              p_form_data: Json
              p_calculation_formulas: Json
              p_asset_metadata?: Json
            }
        Returns: Json
      }
      calculate_form_formulas: {
        Args: { p_submission_data: Json; p_form_schema: Json }
        Returns: Json
      }
      calculate_volume_gallons: {
        Args: {
          height: number
          width: number
          depth: number
          fill_percentage?: number
        }
        Returns: number
      }
      clone_asset_type: {
        Args: { type_id: string; target_org_id: string; admin_user_id: string }
        Returns: string
      }
      clone_form: {
        Args: {
          p_form_id: string
          p_organization_id: string
          p_new_name?: string
        }
        Returns: string
      }
      create_asset_with_inventory: {
        Args: {
          p_asset_data: Json
          p_intake_form_data: Json
          p_user_id: string
        }
        Returns: Json
      }
      create_default_forms_for_asset_type: {
        Args: { p_asset_type_id: string }
        Returns: {
          intake_form_id: string
          inventory_form_id: string
        }[]
      }
      create_form_template: {
        Args: {
          p_name: string
          p_description: string
          p_form_data: Json
          p_is_template?: boolean
        }
        Returns: string
      }
      create_invitation: {
        Args:
          | { email_address: string; member_role?: string }
          | {
              target_email: string
              target_role: string
              target_custom_message: string
              target_organization_id: string
            }
        Returns: string
      }
      create_organization_for_platform_admin: {
        Args: { org_name: string; org_description?: string }
        Returns: string
      }
      create_periodic_inventory_check: {
        Args: {
          p_inventory_item_id: string
          p_check_data: Json
          p_user_id: string
        }
        Returns: Json
      }
      delete_inventory_item: {
        Args: { item_id: string }
        Returns: boolean
      }
      delete_invitation: {
        Args: { target_invitation_id: string }
        Returns: undefined
      }
      delete_organization: {
        Args: { org_id: string }
        Returns: boolean
      }
      delete_organization_completely: {
        Args: { org_id: string }
        Returns: boolean
      }
      delete_user_completely: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      find_recommended_forms_for_asset_type: {
        Args: { p_asset_type_id: string }
        Returns: {
          form_id: string
          form_name: string
          form_description: string
          form_type: string
          similarity: number
        }[]
      }
      generate_asset_barcode: {
        Args: { p_asset_id: string; p_barcode_type?: string }
        Returns: string
      }
      generate_barcode: {
        Args: { p_prefix: string; p_id: string }
        Returns: string
      }
      generate_unique_barcode: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_aggregated_inventory_values: {
        Args: {
          p_organization_id: string
          p_asset_type_id?: string
          p_start_date?: string
          p_end_date?: string
        }
        Returns: Json
      }
      get_all_organizations_for_platform_admin: {
        Args: Record<PropertyKey, never>
        Returns: {
          avatar_url: string | null
          created_at: string
          description: string | null
          id: string
          is_mothership: boolean
          name: string
          updated_at: string
        }[]
      }
      get_asset_barcode_data: {
        Args: { p_asset_id: string }
        Returns: Json
      }
      get_asset_by_barcode: {
        Args: { p_barcode: string }
        Returns: Json
      }
      get_asset_inventory_history: {
        Args: { p_asset_id: string }
        Returns: {
          id: string
          inventory_item_id: string
          check_type: string
          quantity: number
          condition: string
          check_date: string
          notes: string
          status: string
          location: string
          created_by: string
          created_at: string
          created_by_name: string
        }[]
      }
      get_asset_types_for_form: {
        Args: { p_form_id: string; p_organization_id: string }
        Returns: {
          asset_type_id: string
          purpose: string
          asset_type_name: string
          asset_type_description: string
          asset_type_color: string
          created_at: string
          updated_at: string
        }[]
      }
      get_asset_types_with_counts: {
        Args: { org_id: string }
        Returns: {
          id: string
          name: string
          description: string
          organization_id: string
          created_at: string
          updated_at: string
          color: string
          icon: string
          deleted_at: string
          asset_count: number
          enable_barcodes: boolean
          barcode_type: string
          barcode_prefix: string
          intake_form_id: string
          inventory_form_id: string
        }[]
      }
      get_asset_with_formulas_by_barcode: {
        Args: { p_barcode: string }
        Returns: Json
      }
      get_current_organization_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_form_mappable_fields: {
        Args: { p_form_id: string }
        Returns: Json
      }
      get_forms_for_asset_type: {
        Args: { p_asset_type_id: string; p_organization_id: string }
        Returns: {
          form_id: string
          purpose: string
          form_name: string
          form_description: string
          form_data: Json
          created_at: string
          updated_at: string
        }[]
      }
      get_invitation_by_token: {
        Args: { token_input: string }
        Returns: {
          id: string
          organization_id: string
          email: string
          role: string
          invited_by: string
          expires_at: string
          accepted_at: string
        }[]
      }
      get_latest_inventory_check: {
        Args: { p_asset_id: string }
        Returns: {
          inventory_item_id: string
          quantity: number
          condition: string
          check_date: string
          location: string
          status: string
          notes: string
          created_by: string
          created_by_name: string
          check_type: string
        }[]
      }
      get_mappable_fields: {
        Args: { p_organization_id: string }
        Returns: Json
      }
      get_mappable_fields_with_form_names: {
        Args: { p_organization_id: string }
        Returns: Json[]
      }
      get_monthly_inventory_report: {
        Args: {
          p_organization_id: string
          p_year: number
          p_month: number
          p_asset_type_id?: string
        }
        Returns: Json
      }
      get_organization_deletion_preview: {
        Args: { org_id: string }
        Returns: Json
      }
      get_organization_invitations: {
        Args: Record<PropertyKey, never> | { target_organization_id: string }
        Returns: {
          accepted_at: string | null
          created_at: string
          custom_message: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string
          organization_id: string
          role: string
          token: string
        }[]
      }
      get_pending_forms_for_asset: {
        Args: { p_asset_id: string; p_user_id: string }
        Returns: {
          form_id: string
          form_name: string
          form_description: string
          asset_id: string
          asset_name: string
          asset_type_id: string
          asset_type_name: string
          schedule_id: string
          due_date: string
          is_overdue: boolean
        }[]
      }
      get_recommended_forms_for_asset_type: {
        Args: { p_asset_type_id: string }
        Returns: Json
      }
      get_table_counts: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_user_id_by_email: {
        Args: { email_input: string }
        Returns: {
          user_id: string
        }[]
      }
      get_user_organization: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_organizations: {
        Args: { p_user_id: string }
        Returns: {
          org_id: string
          org_name: string
          org_avatar_url: string
          member_role: string
        }[]
      }
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      is_current_user_org_admin: {
        Args: { org_id: string }
        Returns: boolean
      }
      is_member_of_organization: {
        Args: { org_id: string }
        Returns: boolean
      }
      is_org_admin: {
        Args: { org_id: string }
        Returns: boolean
      }
      is_org_member: {
        Args: { org_id: string }
        Returns: boolean
      }
      is_super_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_system_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      link_asset_type_form: {
        Args: {
          p_asset_type_id: string
          p_form_id: string
          p_organization_id: string
          p_purpose?: string
        }
        Returns: undefined
      }
      process_form_submission: {
        Args: {
          p_form_id: string
          p_asset_id: string
          p_asset_type_id: string
          p_submission_data: Json
          p_organization_id: string
          p_user_id: string
        }
        Returns: string
      }
      register_mapped_field: {
        Args: {
          p_organization_id: string
          p_form_id: string
          p_field_id: string
          p_field_label: string
          p_field_type: string
          p_description?: string
          p_inventory_action?: string
        }
        Returns: string
      }
      resend_invitation: {
        Args: { target_invitation_id: string }
        Returns: undefined
      }
      scan_asset_barcode: {
        Args: { p_barcode: string }
        Returns: Json
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
      unlink_asset_type_form: {
        Args: {
          p_asset_type_id: string
          p_form_id: string
          p_organization_id: string
          p_purpose?: string
        }
        Returns: undefined
      }
      unregister_mapped_field: {
        Args: { p_form_id: string; p_field_id: string }
        Returns: boolean
      }
      validate_barcode: {
        Args: { p_barcode: string }
        Returns: boolean
      }
      verify_quick_access_pin: {
        Args: { pin_code: string }
        Returns: {
          user_id: string
          full_name: string
          organization_id: string
          role: string
        }[]
      }
    }
    Enums: {
      inventory_movement_type:
        | "intake"
        | "consumption"
        | "adjustment_up"
        | "adjustment_down"
        | "damage"
        | "theft"
        | "return"
        | "transfer_in"
        | "transfer_out"
        | "expired"
        | "audit"
    }
    CompositeTypes: {
      organization_hierarchy: {
        id: string | null
        name: string | null
        parent_id: string | null
        hierarchy_level: number | null
        avatar_url: string | null
        description: string | null
      }
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
    Enums: {
      inventory_movement_type: [
        "intake",
        "consumption",
        "adjustment_up",
        "adjustment_down",
        "damage",
        "theft",
        "return",
        "transfer_in",
        "transfer_out",
        "expired",
        "audit",
      ],
    },
  },
} as const