# Quick Start Guide: Optimized Reporting System

## 🚀 Getting Started in 5 Minutes

### 1. Basic Report Creation

```typescript
import { executeOptimizedReport } from '@/services/optimizedReportService';

// Create a simple inventory report
const report = {
  id: 'temp-report',
  name: 'Inventory Summary',
  report_config: {
    subject: 'inventory_items',
    dataSources: ['inventory_items', 'asset_types'],
    columns: [
      'inventory_items.name',
      'inventory_items.quantity',
      'inventory_items.current_price',
      'asset_types.name'
    ],
    filters: [{
      field: 'inventory_items.quantity',
      operator: 'greater_than',
      value: 0
    }],
    sorts: [{
      field: 'inventory_items.quantity',
      direction: 'desc'
    }],
    caching: { enabled: true, ttl: 300 }
  },
  organization_id: 'your-org-id',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

// Execute the report
const result = await executeOptimizedReport(report);
console.log(`Found ${result.data.length} items in ${result.stats.executionTime}ms`);
```

### 2. Using the Report Builder UI

```tsx
import OptimizedReportBuilder from '@/components/reporting/OptimizedReportBuilder';

function MyReportPage() {
  return (
    <OptimizedReportBuilder
      onSave={async (report) => {
        // Save to database
        await createReport(report);
      }}
      onCancel={() => navigate('/reports')}
    />
  );
}
```

### 3. Advanced Filtering Examples

```typescript
// Multiple filter operators
const advancedFilters = [
  { field: 'assets.name', operator: 'contains', value: 'pump' },
  { field: 'assets.status', operator: 'in', value: ['active', 'maintenance'] },
  { field: 'assets.acquisition_date', operator: 'between', 
    value: '2023-01-01', secondValue: '2023-12-31' },
  { field: 'assets.serial_number', operator: 'regex', value: '^[A-Z]{2}\\d{4}$' }
];
```

### 4. Performance Monitoring

```typescript
// Check cache statistics
import { optimizedReportCache } from '@/services/optimizedReportService';

const stats = optimizedReportCache.getStats();
console.log(`Cache hit rate: ${stats.hitRate}%, Memory: ${stats.totalSizeMB}MB`);

// Monitor slow queries
const { data } = await supabase.rpc('get_slow_reports', {
  org_id: organizationId,
  limit_count: 5
});
```

### 5. Database Maintenance

```sql
-- Run periodic maintenance
SELECT run_reporting_maintenance();

-- Check table statistics
SELECT * FROM get_reporting_table_stats();

-- Manually refresh views if needed
SELECT refresh_reporting_views();
```

## 📊 Common Use Cases

### Inventory Value Report
```typescript
const inventoryValueReport = {
  dataSources: ['inventory_items'],
  columns: ['name', 'quantity', 'current_price'],
  aggregations: [{
    field: 'inventory_items.quantity * inventory_items.current_price',
    function: 'sum',
    alias: 'total_value'
  }]
};
```

### Asset Status Dashboard
```typescript
const assetDashboard = {
  dataSources: ['assets', 'asset_types'],
  columns: ['asset_types.name', 'assets.status'],
  aggregations: [{
    field: 'assets.id',
    function: 'count',
    alias: 'count',
    groupBy: ['asset_types.name', 'assets.status']
  }]
};
```

### Form Submission Trends
```typescript
const formTrends = {
  dataSources: ['form_submissions'],
  columns: ['created_at', 'form_id'],
  filters: [{
    field: 'form_submissions.created_at',
    operator: 'greater_than',
    value: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  }]
};
```

## ⚡ Performance Tips

1. **Enable Caching** for frequently accessed reports
2. **Use Specific Filters** to reduce data set size
3. **Limit Columns** to only what you need
4. **Monitor Performance** using the built-in dashboard
5. **Schedule Maintenance** to keep views fresh

## 🔧 Troubleshooting

### Report Running Slowly?
1. Check the performance indicator (aim for ⚡ green)
2. Add more specific filters
3. Enable caching
4. Check if materialized views need refresh

### Cache Not Working?
1. Verify caching is enabled in report config
2. Check cache statistics
3. Clear cache if needed: `optimizedReportCache.invalidate()`

### Need Help?
- Full docs: [Optimized Reporting System](./OPTIMIZED-REPORTING-SYSTEM.md)
- Check execution stats in the UI
- Review slow query log in database 