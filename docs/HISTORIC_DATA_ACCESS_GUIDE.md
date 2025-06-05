# Historic Data Access Guide

## Overview

This guide explains how to access historic data including soft-deleted records for comprehensive reporting, analytics, and audit purposes in Logistiq.

## 🎯 **Use Cases**

- **Audit Reports**: Track what was deleted and when
- **Historic Analytics**: Analyze trends including deleted items  
- **Data Recovery**: Find and restore accidentally deleted items
- **Compliance**: Maintain complete audit trails
- **Trend Analysis**: See the full lifecycle of your data

## 🛠️ **Service Functions**

### Core Services with `includeDeleted` Parameter

All main service functions now support an optional `includeDeleted` parameter:

```typescript
// Asset Types
import { getAssetTypes } from '@/services/assetTypeService';

// Active only (default behavior)
const activeAssetTypes = await getAssetTypes(orgId);

// Include soft-deleted records
const allAssetTypes = await getAssetTypes(orgId, true);

// Assets  
import { getAssets, getAssetsByType } from '@/services/assetService';

const activeAssets = await getAssets(orgId);
const allAssets = await getAssets(orgId, true);

const activeTypeAssets = await getAssetsByType(orgId, typeId);
const allTypeAssets = await getAssetsByType(orgId, typeId, true);

// Forms
import { getForms } from '@/services/formService';

const activeForms = await getForms(orgId);
const allForms = await getForms(orgId, true);
```

### Historic Data Service (NEW)

**Dedicated service for comprehensive historic data access:**

```typescript
import { 
  getHistoricAssetTypes,
  getHistoricAssets,
  getHistoricForms,
  getHistoricInventoryItems,
  getComprehensiveAuditTrail,
  getSoftDeleteStatistics
} from '@/services/historicDataService';

// Get all asset types including deleted ones
const historicAssetTypes = await getHistoricAssetTypes(orgId, {
  includeDeleted: true,
  sortBy: 'deleted_at',
  sortOrder: 'desc',
  limit: 100
});

// Get comprehensive audit trail
const auditTrail = await getComprehensiveAuditTrail(orgId, { limit: 500 });
console.log('Summary:', auditTrail.summary);
// { totalActive: 150, totalDeleted: 23, deletionRatio: 13.29 }

// Get soft delete statistics
const stats = await getSoftDeleteStatistics(orgId);
console.log('Asset Types:', stats.asset_types);
// { total: 10, active: 8, deleted: 2, deletionPercentage: 20.0 }
```

## 📊 **Report Integration Examples**

### Example 1: Asset Lifecycle Report

```typescript
const generateAssetLifecycleReport = async (orgId: string) => {
  // Get all assets including deleted ones
  const allAssets = await getHistoricAssets(orgId, {
    includeDeleted: true,
    sortBy: 'created_at',
    sortOrder: 'asc'
  });

  return allAssets.map(asset => ({
    id: asset.id,
    name: asset.name,
    status: asset.is_deleted ? 'DELETED' : 'ACTIVE',
    createdAt: asset.created_at,
    deletedAt: asset.deleted_at,
    lifespan: asset.deleted_at 
      ? Math.round((new Date(asset.deleted_at).getTime() - new Date(asset.created_at).getTime()) / (1000 * 60 * 60 * 24))
      : null // days alive
  }));
};
```

### Example 2: Deletion Trend Analysis

```typescript
const generateDeletionTrendReport = async (orgId: string) => {
  const auditTrail = await getComprehensiveAuditTrail(orgId);
  
  // Group deletions by month
  const deletionsByMonth = auditTrail.assets
    .filter(asset => asset.is_deleted && asset.deleted_at)
    .reduce((acc, asset) => {
      const month = new Date(asset.deleted_at).toISOString().slice(0, 7);
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  return {
    summary: auditTrail.summary,
    trends: deletionsByMonth,
    recommendations: auditTrail.summary.deletionRatio > 25 
      ? "High deletion rate detected - review data management practices"
      : "Deletion rate within normal range"
  };
};
```

### Example 3: Recovery Report

```typescript
const generateRecoveryReport = async (orgId: string) => {
  const stats = await getSoftDeleteStatistics(orgId);
  
  return Object.entries(stats).map(([tableName, tableStats]) => ({
    table: tableName,
    deletedCount: tableStats.deleted,
    deletionPercentage: tableStats.deletionPercentage,
    recoverable: tableStats.deleted > 0,
    priority: tableStats.deletionPercentage > 30 ? 'HIGH' : 
              tableStats.deletionPercentage > 10 ? 'MEDIUM' : 'LOW'
  }));
};
```

## 🔧 **Data Structure**

### Soft Delete Fields

Every record that supports soft deletion has:

```typescript
interface SoftDeletableRecord {
  is_deleted: boolean;      // Primary flag for queries
  deleted_at: string | null; // Timestamp of deletion
  // ... other fields
}
```

### Historic Data Options

```typescript
interface HistoricDataOptions {
  includeDeleted?: boolean;   // Include soft-deleted records (default: true)
  sortBy?: string;           // Sort field (default: 'created_at')
  sortOrder?: 'asc' | 'desc'; // Sort direction (default: 'desc')
  limit?: number;            // Limit results
}
```

## 📈 **Analytics Integration**

Use historic data for:

1. **Deletion Rate Monitoring**: Track deletion patterns over time
2. **Data Health Reports**: Monitor soft delete ratios
3. **Audit Compliance**: Maintain complete record trails
4. **Recovery Planning**: Identify accidentally deleted items
5. **Lifecycle Analysis**: Understand data usage patterns

## ⚠️ **Best Practices**

1. **Performance**: Use limits for large datasets
2. **Security**: Ensure users have permission for historic data access
3. **UI Indication**: Clearly mark soft-deleted items in reports
4. **Filtering**: Provide toggles to show/hide deleted items
5. **Context**: Include deletion timestamps and reasons when available

## 🛡️ **Data Consistency**

The system ensures:
- `is_deleted = true` ↔ `deleted_at IS NOT NULL`
- Database triggers maintain field synchronization
- Constraints prevent inconsistent states
- All filtering uses `is_deleted` for consistency

## 📋 **Quick Reference**

| Function | Active Only | Include Deleted |
|----------|------------|----------------|
| `getAssetTypes(orgId)` | ✅ Default | `getAssetTypes(orgId, true)` |
| `getAssets(orgId)` | ✅ Default | `getAssets(orgId, true)` |
| `getForms(orgId)` | ✅ Default | `getForms(orgId, true)` |
| Historic Service | `includeDeleted: false` | `includeDeleted: true` ✅ Default |

---

**Need help?** Check the source code in `/src/services/historicDataService.ts` for complete examples and implementation details. 