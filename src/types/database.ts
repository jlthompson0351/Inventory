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
      formula_templates: {
        Row: {
          category: string
          created_at: string | null
          created_by: string | null
          description: string | null
          example_output: string | null
          formula_text: string
          id: string
          is_public: boolean | null
          name: string
          organization_id: string | null
          required_fields: Json | null
          required_mapped_fields: Json | null
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          category: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          example_output?: string | null
          formula_text: string
          id?: string
          is_public?: boolean | null
          name: string
          organization_id?: string | null
          required_fields?: Json | null
          required_mapped_fields?: Json | null
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          example_output?: string | null
          formula_text?: string
          id?: string
          is_public?: boolean | null
          name?: string
          organization_id?: string | null
          required_fields?: Json | null
          required_mapped_fields?: Json | null
          updated_at?: string | null
          usage_count?: number | null
        }
      }
      formula_usage_analytics: {
        Row: {
          avg_evaluation_time_ms: number | null
          created_at: string | null
          created_by: string | null
          error_count: number | null
          evaluation_count: number | null
          field_references: Json | null
          form_id: string | null
          formula_complexity: string | null
          formula_text: string
          function_usage: Json | null
          id: string
          last_error_message: string | null
          mapped_field_references: Json | null
          organization_id: string
          updated_at: string | null
        }
        Insert: {
          avg_evaluation_time_ms?: number | null
          created_at?: string | null
          created_by?: string | null
          error_count?: number | null
          evaluation_count?: number | null
          field_references?: Json | null
          form_id?: string | null
          formula_complexity?: string | null
          formula_text: string
          function_usage?: Json | null
          id?: string
          last_error_message?: string | null
          mapped_field_references?: Json | null
          organization_id: string
          updated_at?: string | null
        }
        Update: {
          avg_evaluation_time_ms?: number | null
          created_at?: string | null
          created_by?: string | null
          error_count?: number | null
          evaluation_count?: number | null
          field_references?: Json | null
          form_id?: string | null
          formula_complexity?: string | null
          formula_text?: string
          function_usage?: Json | null
          id?: string
          last_error_message?: string | null
          mapped_field_references?: Json | null
          organization_id?: string
          updated_at?: string | null
        }
      }
    }
  }
}

// Additional type aliases for convenience
export type FormulaTemplate = Database['public']['Tables']['formula_templates']['Row']
export type FormulaUsageAnalytics = Database['public']['Tables']['formula_usage_analytics']['Row']

// Enum types for formula complexity
export type FormulaComplexity = 'simple' | 'moderate' | 'complex' | 'very_complex'

// Helper types for formula template categories
export type FormulaTemplateCategory = 'inventory' | 'financial' | 'measurement' | 'conversion' | 'custom' 