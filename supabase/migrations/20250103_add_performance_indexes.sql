-- Migration: Add critical performance indexes for Logistiq Inventory System
-- Date: January 3, 2025
-- Purpose: Improve query performance for inventory history, asset searches, and form submissions

-- Index for inventory_history table to speed up history lookups by inventory item
-- This composite index will make queries filtering by inventory_item_id and ordering by check_date much faster
CREATE INDEX IF NOT EXISTS idx_inventory_history_item_date 
ON inventory_history(inventory_item_id, check_date DESC);

-- Index for assets table to optimize common search patterns
-- This partial index covers the most common query pattern: finding active assets by organization and type
CREATE INDEX IF NOT EXISTS idx_assets_org_type_status 
ON assets(organization_id, asset_type_id, status) 
WHERE is_deleted = false;

-- Index for form_submissions table to speed up asset-related submission queries
-- This helps when looking up form submissions for a specific asset ordered by creation date
CREATE INDEX IF NOT EXISTS idx_form_submissions_asset_created 
ON form_submissions(asset_id, created_at DESC);

-- Additional helpful indexes for common query patterns

-- Index for inventory_items to speed up asset lookups
CREATE INDEX IF NOT EXISTS idx_inventory_items_asset_org 
ON inventory_items(asset_id, organization_id) 
WHERE is_deleted = false;

-- Index for forms to speed up organization and status queries
CREATE INDEX IF NOT EXISTS idx_forms_org_status 
ON forms(organization_id, status) 
WHERE is_deleted = false;

-- Index for asset_types to speed up organization queries
CREATE INDEX IF NOT EXISTS idx_asset_types_org 
ON asset_types(organization_id) 
WHERE is_deleted = false;

-- Add comments to document the indexes
COMMENT ON INDEX idx_inventory_history_item_date IS 'Speeds up inventory history lookups by item and date';
COMMENT ON INDEX idx_assets_org_type_status IS 'Optimizes asset searches by organization, type, and status';
COMMENT ON INDEX idx_form_submissions_asset_created IS 'Speeds up form submission queries for specific assets';
COMMENT ON INDEX idx_inventory_items_asset_org IS 'Optimizes inventory item lookups by asset';
COMMENT ON INDEX idx_forms_org_status IS 'Speeds up form queries by organization and status';
COMMENT ON INDEX idx_asset_types_org IS 'Optimizes asset type lookups by organization'; 