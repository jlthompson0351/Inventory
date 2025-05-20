export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      asset_types: {
        Row: {
          id: string
          name: string
          description: string | null
          organization_id: string
          color: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          organization_id: string
          color?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          organization_id?: string
          color?: string | null
          created_at?: string
          updated_at?: string | null
        }
      }
      organizations: {
        Row: {
          id: string
          name: string
          description: string | null
          parent_id: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          parent_id?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          parent_id?: string | null
          created_at?: string
          updated_at?: string | null
        }
      }
      forms: {
        Row: {
          id: string
          name: string
          description: string | null
          form_data: Json
          organization_id: string
          created_at: string
          updated_at: string | null
          form_type: string
          category_id: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          form_data: Json
          organization_id: string
          created_at?: string
          updated_at?: string | null
          form_type?: string
          category_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          form_data?: Json
          organization_id?: string
          created_at?: string
          updated_at?: string | null
          form_type?: string
          category_id?: string | null
        }
      }
      assets: {
        Row: {
          id: string
          name: string
          asset_type_id: string
          organization_id: string
          created_at: string
          updated_at: string | null
          serial_number: string | null
          barcode: string | null
          status: string | null
          location: string | null
          parent_id: string | null
          acquisition_date: string | null
          acquisition_cost: number | null
          deleted_at: string | null
          is_deleted: boolean
        }
        Insert: {
          id?: string
          name: string
          asset_type_id: string
          organization_id: string
          created_at?: string
          updated_at?: string | null
          serial_number?: string | null
          barcode?: string | null
          status?: string | null
          location?: string | null
          parent_id?: string | null
          acquisition_date?: string | null
          acquisition_cost?: number | null
          deleted_at?: string | null
          is_deleted?: boolean
        }
        Update: {
          id?: string
          name?: string
          asset_type_id?: string
          organization_id?: string
          created_at?: string
          updated_at?: string | null
          serial_number?: string | null
          barcode?: string | null
          status?: string | null
          location?: string | null
          parent_id?: string | null
          acquisition_date?: string | null
          acquisition_cost?: number | null
          deleted_at?: string | null
          is_deleted?: boolean
        }
      }
      organization_members: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          role: string
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id: string
          role?: string
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string
          role?: string
          created_at?: string
        }
      }
      form_submissions: {
        Row: {
          id: string
          form_id: string
          asset_id: string
          submission_data: Json
          created_at: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          form_id: string
          asset_id: string
          submission_data: Json
          created_at?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          form_id?: string
          asset_id?: string
          submission_data?: Json
          created_at?: string
          updated_at?: string | null
          user_id?: string
        }
      }
      inventory_items: {
        Row: {
          id: string;
          organization_id: string;
          asset_type_id: string | null;
          name: string;
          description: string | null;
          sku: string | null;
          barcode: string | null;
          quantity: number;
          location: string | null;
          category: string | null;
          created_at: string;
          updated_at: string | null;
          current_price: number | null;
          currency: string | null;
          profile_image_url: string | null;
          metadata: Json | null;
          asset_id: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          asset_type_id?: string | null;
          name: string;
          description?: string | null;
          sku?: string | null;
          barcode?: string | null;
          quantity?: number;
          location?: string | null;
          category?: string | null;
          created_at?: string;
          updated_at?: string | null;
          current_price?: number | null;
          currency?: string | null;
          profile_image_url?: string | null;
          metadata?: Json | null;
          asset_id?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          asset_type_id?: string | null;
          name?: string;
          description?: string | null;
          sku?: string | null;
          barcode?: string | null;
          quantity?: number;
          location?: string | null;
          category?: string | null;
          created_at?: string;
          updated_at?: string | null;
          current_price?: number | null;
          currency?: string | null;
          profile_image_url?: string | null;
          metadata?: Json | null;
          asset_id?: string | null;
        };
      }
      inventory_price_history: {
        Row: {
          id: string;
          organization_id: string;
          inventory_item_id: string;
          price: number;
          currency: string;
          effective_date: string;
          notes: string | null;
          created_by: string | null;
          submission_id: string | null;
          unit_type: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          inventory_item_id: string;
          price: number;
          currency: string;
          effective_date?: string;
          notes?: string | null;
          created_by?: string | null;
          submission_id?: string | null;
          unit_type?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          inventory_item_id?: string;
          price?: number;
          currency?: string;
          effective_date?: string;
          notes?: string | null;
          created_by?: string | null;
          submission_id?: string | null;
          unit_type?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      }
      inventory_history: {
        Row: {
          id: string;
          inventory_item_id: string;
          organization_id: string;
          event_type: 'intake' | 'addition' | 'audit' | 'adjustment' | 'removal' | 'transfer' | 'disposal' | 'deleted';
          quantity: number;
          condition: string | null;
          check_date: string;
          notes: string | null;
          status: string | null;
          location: string | null;
          created_by: string | null;
          created_at: string;
          month_year: string | null;
          response_data: Json | null;
        };
        Insert: {
          id?: string;
          inventory_item_id: string;
          organization_id: string;
          event_type: 'intake' | 'addition' | 'audit' | 'adjustment' | 'removal' | 'transfer' | 'disposal' | 'deleted';
          quantity: number;
          condition?: string | null;
          check_date?: string;
          notes?: string | null;
          status?: string | null;
          location?: string | null;
          created_by?: string | null;
          created_at?: string;
          month_year?: string | null;
          response_data?: Json | null;
        };
        Update: {
          id?: string;
          inventory_item_id?: string;
          organization_id?: string;
          event_type?: 'intake' | 'addition' | 'audit' | 'adjustment' | 'removal' | 'transfer' | 'disposal' | 'deleted';
          quantity?: number;
          condition?: string | null;
          check_date?: string;
          notes?: string | null;
          status?: string | null;
          location?: string | null;
          created_by?: string | null;
          created_at?: string;
          month_year?: string | null;
          response_data?: Json | null;
        };
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_asset_types_with_counts: {
        Args: {
          org_id: string
        }
        Returns: {
          id: string
          name: string
          description: string | null
          organization_id: string
          color: string | null
          created_at: string
          updated_at: string | null
          asset_count: number
        }[]
      }
      process_form_submission: {
        Args: {
          p_form_id: string
          p_asset_id: string
          p_submission_data: Json
          p_user_id: string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
