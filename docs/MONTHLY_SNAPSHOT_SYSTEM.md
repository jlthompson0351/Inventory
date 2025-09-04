# Monthly Inventory Snapshot System

## Overview

The Monthly Inventory Snapshot System provides automated monthly capture of inventory state for historical tracking, trend analysis, and comprehensive reporting. This system ensures that critical inventory data is preserved at month-end for long-term analysis and compliance.

## Key Features

- **Automated Monthly Capture**: pg_cron scheduled snapshots on the last day of each month
- **Complete State Preservation**: Captures quantity, location, status, and pricing data
- **Historical Analysis**: Unlimited historical data retrieval with flexible filtering
- **Soft Delete Support**: Data retention management without permanent data loss
- **Bulk Operations**: Efficient handling of large datasets with pagination and filtering
- **Export Capabilities**: CSV export for external analysis and reporting

## Database Schema

### Monthly Inventory Snapshots Table

```sql
CREATE TABLE monthly_inventory_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_item_id UUID NOT NULL REFERENCES inventory_items(id),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    asset_id UUID NOT NULL REFERENCES assets(id),
    asset_name TEXT NOT NULL,
    item_name TEXT NOT NULL,
    quantity NUMERIC NOT NULL CHECK (quantity >= 0),
    location TEXT,
    status TEXT,
    current_price NUMERIC NOT NULL CHECK (current_price >= 0),
    currency TEXT NOT NULL DEFAULT 'USD',
    snapshot_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    month_year TEXT NOT NULL CHECK (month_year ~ '^\d{4}-\d{2}$'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    is_deleted BOOLEAN DEFAULT FALSE,
    
    UNIQUE(inventory_item_id, month_year)
);
```

### Key Constraints and Indexes

- **Unique Constraint**: Prevents duplicate snapshots for the same item in the same month
- **Data Validation**: Quantity and price must be non-negative
- **Month Format**: month_year must be in YYYY-MM format
- **Performance Indexes**: Optimized for organization-based queries and date filtering

## Core Functions

### Snapshot Capture Functions

#### `capture_monthly_inventory_snapshot()`
Captures the current inventory state for all active items in the organization.

**Features:**
- Processes all active inventory items
- Captures complete state (quantity, location, status, pricing)
- Handles errors gracefully with detailed logging
- Validates data before insertion

#### `capture_monthly_snapshot_if_last_day()`
Wrapper function for pg_cron scheduling that ensures snapshots are only taken on the actual last day of the month.

**Features:**
- Validates current date is last day of month
- Calls main snapshot function only when appropriate
- Prevents duplicate snapshots from cron scheduling issues

### Data Retrieval Functions

#### `get_asset_complete_history(asset_id, organization_id)`
Retrieves complete historical data for a specific asset with unlimited history.

**Returns:**
- All monthly snapshots for the asset
- Complete inventory history records
- Combined chronological timeline

#### `get_inventory_item_complete_history(item_id, organization_id)`
Retrieves complete historical data for a specific inventory item.

**Returns:**
- All monthly snapshots for the item
- Complete inventory history records
- Combined chronological timeline

#### `get_asset_history_last_n_months(asset_id, organization_id, months)`
Retrieves historical data for the last N months for trend analysis.

**Parameters:**
- `asset_id`: Target asset ID
- `organization_id`: Organization context
- `months`: Number of months to retrieve

#### `get_asset_history_by_date_range(asset_id, organization_id, start_date, end_date)`
Retrieves historical data within a custom date range.

**Parameters:**
- `asset_id`: Target asset ID
- `organization_id`: Organization context
- `start_date`: Start date (inclusive)
- `end_date`: End date (inclusive)

### Utility Functions

#### `get_monthly_snapshot_stats(organization_id)`
Provides statistics about monthly snapshots for an organization.

**Returns:**
- Total snapshot count
- Date range of snapshots
- Assets with snapshots
- Recent snapshot activity

#### `trigger_manual_snapshot(organization_id)`
Manually triggers a monthly snapshot for testing or immediate capture.

**Use Cases:**
- Testing the snapshot system
- Immediate data capture
- Recovery from missed automated snapshots

#### `cleanup_old_snapshots(months_to_keep, dry_run)`
Manages data retention by soft-deleting old snapshots.

**Parameters:**
- `months_to_keep`: Number of months to retain
- `dry_run`: If true, shows what would be deleted without actually deleting

## Automated Scheduling

### pg_cron Configuration

The system uses PostgreSQL's pg_cron extension for automated scheduling:

```sql
-- Schedule monthly snapshots on the last day of each month at 11:59 PM
SELECT cron.schedule(
    'monthly-inventory-snapshot',
    '59 23 28-31 * *',  -- Last day of month at 11:59 PM
    'SELECT capture_monthly_snapshot_if_last_day();'
);
```

### Schedule Details

- **Frequency**: Monthly on the last day
- **Time**: 11:59 PM
- **Validation**: Only executes on actual last day of month
- **Error Handling**: Comprehensive logging and error reporting

## Frontend Integration

### Main Inventory Page - Table View

**Component**: `MonthlySnapshotTable`
**Location**: `/inventory` → "Monthly History" tab

**Features:**
- Professional table layout for bulk operations
- Advanced filtering by asset type, date range, and search
- Bulk selection and export capabilities
- Real-time search and pagination
- Status-based filtering and sorting

**Key UI Elements:**
- Asset type dropdown with color indicators
- Date range picker (month/year selection)
- Search by asset name
- Bulk selection with "Select All" functionality
- CSV export for selected or all data
- Refresh and filter toggle controls

### Individual Asset History Page - Card View

**Component**: `MonthlySnapshotHistory`
**Location**: `/inventory/:inventoryItemId/history`

**Features:**
- Collapsible monthly snapshots section
- Detailed card view for single asset analysis
- Date range filtering
- Trend indicators and status badges
- Export capabilities for individual asset data

**Key UI Elements:**
- Collapsible section with toggle button
- Month/year range selection
- Asset-specific filtering
- Detailed snapshot cards with status indicators
- Export button for individual asset data

## Data Flow

### Monthly Snapshot Process

1. **Scheduled Trigger**: pg_cron triggers on last day of month
2. **Date Validation**: Wrapper function validates it's actually the last day
3. **Data Capture**: Main function captures current state of all active inventory items
4. **Data Validation**: Ensures data integrity and constraint compliance
5. **Storage**: Snapshots stored with month_year indexing
6. **Logging**: Complete audit trail of snapshot process

### Data Retrieval Process

1. **User Request**: Frontend requests historical data with filters
2. **Function Call**: Appropriate retrieval function called with parameters
3. **Data Aggregation**: Combines monthly snapshots with inventory history
4. **Filtering**: Applies date range, asset type, and search filters
5. **Response**: Returns formatted data for frontend display

## Performance Considerations

### Database Optimization

- **Indexes**: Optimized for common query patterns
- **Soft Delete**: Efficient filtering with is_deleted flag
- **Pagination**: Large dataset handling with limit/offset
- **Caching**: Query result caching for frequently accessed data

### Frontend Optimization

- **Lazy Loading**: Data loaded on demand
- **Debounced Search**: Prevents excessive API calls
- **Memoization**: React optimization for expensive calculations
- **Virtual Scrolling**: Efficient rendering of large datasets

## Security and Access Control

### Row-Level Security (RLS)

- **Organization Isolation**: Complete data isolation between organizations
- **Role-Based Access**: Different permissions for admin, manager, editor, member
- **Soft Delete Support**: RLS policies include is_deleted = false conditions

### Data Privacy

- **No Cross-Organization Access**: Impossible to access other organizations' data
- **Audit Trail**: Complete logging of all snapshot operations
- **Data Retention**: Configurable retention policies for compliance

## Monitoring and Maintenance

### Health Checks

- **Snapshot Success Rate**: Monitor automated snapshot completion
- **Data Quality**: Validate snapshot data integrity
- **Performance Metrics**: Track query performance and optimization needs

### Maintenance Tasks

- **Data Cleanup**: Regular cleanup of old snapshots
- **Index Maintenance**: Optimize database performance
- **Error Monitoring**: Track and resolve snapshot failures

## Usage Examples

### Capturing a Manual Snapshot

```sql
-- Trigger immediate snapshot for testing
SELECT trigger_manual_snapshot('organization-uuid');
```

### Retrieving Asset History

```sql
-- Get complete history for an asset
SELECT * FROM get_asset_complete_history('asset-uuid', 'organization-uuid');

-- Get last 12 months of data
SELECT * FROM get_asset_history_last_n_months('asset-uuid', 'organization-uuid', 12);

-- Get data for specific date range
SELECT * FROM get_asset_history_by_date_range(
    'asset-uuid', 
    'organization-uuid', 
    '2024-01-01', 
    '2024-12-31'
);
```

### Data Retention Management

```sql
-- See what would be deleted (dry run)
SELECT * FROM cleanup_old_snapshots(24, true);

-- Actually delete snapshots older than 24 months
SELECT * FROM cleanup_old_snapshots(24, false);
```

## Troubleshooting

### Common Issues

1. **Missing Snapshots**: Check pg_cron status and logs
2. **Data Quality Issues**: Validate constraint compliance
3. **Performance Problems**: Check indexes and query optimization
4. **Access Issues**: Verify RLS policies and user permissions

### Debugging Tools

- **Snapshot Statistics**: Use `get_monthly_snapshot_stats()` for overview
- **Manual Trigger**: Use `trigger_manual_snapshot()` for testing
- **Log Analysis**: Check system logs for error details
- **Data Validation**: Verify constraint compliance and data integrity

## Future Enhancements

### Planned Features

- **Trend Analysis**: Advanced analytics and trend detection
- **Automated Alerts**: Notifications for significant changes
- **Custom Retention**: Per-asset-type retention policies
- **API Endpoints**: RESTful API for external integrations
- **Advanced Reporting**: Custom report generation and scheduling

### Scalability Considerations

- **Partitioning**: Table partitioning for very large datasets
- **Archiving**: Long-term storage for historical data
- **Compression**: Data compression for storage optimization
- **Distributed Processing**: Multi-organization snapshot processing

---

*This system provides a robust foundation for historical inventory tracking and analysis, ensuring data preservation and enabling comprehensive reporting capabilities.*
