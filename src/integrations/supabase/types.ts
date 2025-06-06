import { Database } from '@/types/database.types';

export type Tables = Database['public']['Tables'];

export type TablesInsert<T extends keyof Tables> = Tables[T]['Insert'];
export type TablesUpdate<T extends keyof Tables> = Tables[T]['Update'];
export type TablesRow<T extends keyof Tables> = Tables[T]['Row'];

// Convenience types for specific tables
export type InventoryItemRow = TablesRow<'inventory_items'>;
export type InventoryItemInsert = TablesInsert<'inventory_items'>;
export type InventoryItemUpdate = TablesUpdate<'inventory_items'>;

export type AssetTypeRow = TablesRow<'asset_types'>;
export type AssetTypeInsert = TablesInsert<'asset_types'>;
export type AssetTypeUpdate = TablesUpdate<'asset_types'>;

export type OrganizationRow = TablesRow<'organizations'>;
export type OrganizationInsert = TablesInsert<'organizations'>;
export type OrganizationUpdate = TablesUpdate<'organizations'>;

export type UserOrganizationRow = TablesRow<'user_organizations'>;
export type UserOrganizationInsert = TablesInsert<'user_organizations'>;
export type UserOrganizationUpdate = TablesUpdate<'user_organizations'>;

export type InventoryPriceHistoryRow = TablesRow<'inventory_price_history'>;
export type InventoryPriceHistoryInsert = TablesInsert<'inventory_price_history'>;
export type InventoryPriceHistoryUpdate = TablesUpdate<'inventory_price_history'>;

// Form types
export type FormRow = TablesRow<'forms'> & { 
  id: string;
  deleted_at?: string | null;
};
export type FormInsert = TablesInsert<'forms'>;
export type FormUpdate = TablesUpdate<'forms'>;

export type FormCategoryRow = TablesRow<'form_categories'> & { id: string };
export type FormCategoryInsert = TablesInsert<'form_categories'>;
export type FormCategoryUpdate = TablesUpdate<'form_categories'>;

export type FormCategoryMappingRow = TablesRow<'form_category_mappings'> & { id: string };
export type FormCategoryMappingInsert = TablesInsert<'form_category_mappings'>;
export type FormCategoryMappingUpdate = TablesUpdate<'form_category_mappings'>;

export type FormValidationRuleRow = TablesRow<'form_validation_rules'> & { id: string };
export type FormValidationRuleInsert = TablesInsert<'form_validation_rules'>;
export type FormValidationRuleUpdate = TablesUpdate<'form_validation_rules'>;

export type FormFieldDependencyRow = TablesRow<'form_field_dependencies'> & { id: string };
export type FormFieldDependencyInsert = TablesInsert<'form_field_dependencies'>;
export type FormFieldDependencyUpdate = TablesUpdate<'form_field_dependencies'>;

// Organization Member types
export type OrganizationMemberRow = TablesRow<'organization_members'>;
export type OrganizationMemberInsert = TablesInsert<'organization_members'>;
export type OrganizationMemberUpdate = TablesUpdate<'organization_members'>;

// Location types
export type LocationRow = TablesRow<'locations'>;
export type LocationInsert = TablesInsert<'locations'>;
export type LocationUpdate = TablesUpdate<'locations'>;

// Report types
export type ReportRow = TablesRow<'reports'>;
export type ReportInsert = TablesInsert<'reports'>;
export type ReportUpdate = TablesUpdate<'reports'>;

// Organization invitation types
export type OrganizationInvitationRow = TablesRow<'organization_invitations'>;
export type OrganizationInvitationInsert = TablesInsert<'organization_invitations'>;
export type OrganizationInvitationUpdate = TablesUpdate<'organization_invitations'>;

// Form response types
export type FormResponseRow = TablesRow<'form_responses'>;
export type FormResponseInsert = TablesInsert<'form_responses'>;
export type FormResponseUpdate = TablesUpdate<'form_responses'>;

// Asset formula types
export type AssetFormulaRow = TablesRow<'asset_formulas'>;
export type AssetFormulaInsert = TablesInsert<'asset_formulas'>;
export type AssetFormulaUpdate = TablesUpdate<'asset_formulas'>;

// System log types
export type SystemLogRow = TablesRow<'system_logs'>;
export type SystemLogInsert = TablesInsert<'system_logs'>;
export type SystemLogUpdate = TablesUpdate<'system_logs'>;

// Inventory event types
export type InventoryEventType =
  | 'intake'
  | 'addition'
  | 'audit'
  | 'adjustment'
  | 'removal'
  | 'transfer'
  | 'disposal'
  | 'deleted';

export type InventoryHistoryRow = TablesRow<'inventory_history'> & { event_type: InventoryEventType };
export type InventoryHistoryInsert = TablesInsert<'inventory_history'> & { event_type: InventoryEventType };
export type InventoryHistoryUpdate = TablesUpdate<'inventory_history'> & { event_type?: InventoryEventType };

// System role types - REMOVING THESE
// export type SystemRoleRow = TablesRow<'system_roles'>;
// export type SystemRoleInsert = TablesInsert<'system_roles'>;
// export type SystemRoleUpdate = TablesUpdate<'system_roles'>;

  // Invitation types
  export type InvitationRow = TablesRow<"organization_invitations">;
