# Monthly Snapshot Frontend Components

## Overview

The Monthly Snapshot System frontend provides two distinct user interfaces for different use cases:

1. **Table View** - Professional bulk operations for managing hundreds of assets
2. **Card View** - Detailed individual asset analysis with collapsible sections

## Components

### MonthlySnapshotTable

**Location**: `src/components/inventory/MonthlySnapshotTable.tsx`
**Usage**: Main inventory page (`/inventory`) → "Monthly History" tab

#### Purpose
Professional table interface for bulk asset monthly snapshot management and analysis.

#### Key Features
- **Advanced Filtering**: Asset type, date range, and search functionality
- **Bulk Operations**: Select individual rows or select all with export capabilities
- **Real-time Search**: Debounced search by asset name
- **Status Indicators**: Color-coded status badges (active, low_stock, out_of_stock)
- **Export Functionality**: CSV export for selected or all data
- **Performance Optimized**: Efficient handling of large datasets

#### Props Interface
```typescript
interface MonthlySnapshotTableProps {
  organizationId: string;
}
```

#### State Management
- `snapshots`: Array of monthly snapshot data
- `loading`: Loading state indicator
- `error`: Error state handling
- `searchTerm`: Search input value
- `selectedAssetTypes`: Array of selected asset type IDs
- `selectedRows`: Set of selected row IDs for bulk operations
- `availableAssetTypes`: Array of available asset types for filtering
- `showFilters`: Toggle for filter panel visibility
- `dateRange`: Object with start and end dates for filtering

#### Key Methods
- `loadSnapshots()`: Fetches snapshot data with applied filters
- `handleRowSelect()`: Manages individual row selection
- `handleSelectAll()`: Manages select all functionality
- `exportData()`: Exports selected or all data to CSV
- `getStatusColor()`: Returns appropriate color for status badges

#### UI Elements
- **Header Section**: Title, record count, and action buttons
- **Filter Panel**: Collapsible panel with search, asset type, and date filters
- **Bulk Actions Bar**: Appears when rows are selected
- **Data Table**: Professional table with sorting and selection
- **Loading States**: Spinner and loading messages
- **Error Handling**: Alert components for error states

### MonthlySnapshotHistory

**Location**: `src/components/inventory/MonthlySnapshotHistory.tsx`
**Usage**: Individual asset history page (`/inventory/:inventoryItemId/history`)

#### Purpose
Detailed card-based interface for individual asset monthly snapshot analysis.

#### Key Features
- **Collapsible Section**: Space-saving collapsible design
- **Asset-Specific Filtering**: Pre-filtered for specific asset
- **Date Range Selection**: Month/year picker for historical analysis
- **Card Display**: Detailed snapshot cards with trend indicators
- **Export Capabilities**: CSV export for individual asset data
- **Visual Indicators**: Status badges and trend arrows

#### Props Interface
```typescript
interface MonthlySnapshotHistoryProps {
  assetName?: string;
  organizationId: string;
  showAssetFilter?: boolean;
  showDateRange?: boolean;
  maxMonths?: number;
}
```

#### State Management
- `snapshots`: Array of monthly snapshot data
- `loading`: Loading state indicator
- `error`: Error state handling
- `selectedAssets`: Array of selected asset IDs
- `selectedAssetTypes`: Array of selected asset type IDs
- `dateRange`: Object with start and end dates
- `availableAssets`: Array of available assets for selection
- `availableAssetTypes`: Array of available asset types

#### Key Methods
- `loadSnapshots()`: Fetches snapshot data with filters
- `handleAssetSelect()`: Manages asset selection
- `handleAssetTypeSelect()`: Manages asset type filtering
- `exportData()`: Exports data to CSV
- `getTrendIndicator()`: Calculates trend indicators

#### UI Elements
- **Collapsible Header**: Toggle button with preview information
- **Filter Controls**: Asset selection and date range pickers
- **Snapshot Cards**: Individual cards for each monthly snapshot
- **Trend Indicators**: Visual trend arrows and status badges
- **Export Button**: CSV export functionality

## Integration Points

### Main Inventory Page

**File**: `src/pages/Inventory.tsx`

The main inventory page integrates the table view through a tabbed interface:

```typescript
<TabsContent value="monthly-history" className="mt-6">
  <MonthlySnapshotTable
    organizationId={currentOrganization.id}
  />
</TabsContent>
```

**Features**:
- Tab-based navigation between current inventory and monthly history
- Clean integration with existing inventory management workflow
- Responsive design for desktop and mobile use

### Individual Asset History Page

**File**: `src/pages/AssetInventoryHistory.tsx`

The individual asset page integrates the card view in a collapsible section:

```typescript
<CardContent className="space-y-4">
  <div className="flex items-center justify-between">
    <Button
      variant="outline"
      size="sm"
      onClick={() => setShowMonthlySnapshots(!showMonthlySnapshots)}
    >
      {showMonthlySnapshots ? (
        <>
          <ChevronDown className="h-4 w-4 mr-2" />
          Hide Snapshots
        </>
      ) : (
        <>
          <ChevronRight className="h-4 w-4 mr-2" />
          Show Snapshots
        </>
      )}
    </Button>
  </div>
  
  {showMonthlySnapshots && (
    <MonthlySnapshotHistory
      assetName={asset.asset_name}
      organizationId={asset.organization_id}
      showAssetFilter={false}
      showDateRange={true}
      maxMonths={24}
    />
  )}
</CardContent>
```

**Features**:
- Collapsible design to save space
- Asset-specific data filtering
- Toggle button with clear visual indicators
- Preview information when collapsed

## Data Flow

### Data Fetching

1. **Component Mount**: Components initialize with organization context
2. **Filter Application**: User interactions update filter state
3. **API Calls**: Supabase queries executed with current filters
4. **Data Processing**: Raw data processed and formatted for display
5. **UI Updates**: Components re-render with new data

### State Management

- **Local State**: React useState for component-specific state
- **Effect Dependencies**: useEffect with proper dependency arrays
- **Loading States**: Comprehensive loading and error handling
- **Optimistic Updates**: Immediate UI feedback for user actions

### Performance Optimizations

- **Debounced Search**: Prevents excessive API calls during typing
- **Memoized Calculations**: Expensive operations cached with useMemo
- **Efficient Re-renders**: Proper dependency management in useEffect
- **Pagination**: Large datasets handled with pagination controls

## Styling and UI

### Design System

- **Shadcn/ui Components**: Consistent with application design system
- **TailwindCSS**: Utility-first CSS for responsive design
- **Color Coding**: Status-based color schemes for quick recognition
- **Icons**: Lucide React icons for consistent iconography

### Responsive Design

- **Mobile-First**: Optimized for mobile and desktop use
- **Flexible Layouts**: Grid and flexbox for responsive behavior
- **Touch-Friendly**: Appropriate touch targets for mobile devices
- **Accessibility**: Proper ARIA labels and keyboard navigation

### Visual Indicators

- **Status Badges**: Color-coded status indicators
- **Trend Arrows**: Visual trend indicators for quantity changes
- **Loading States**: Spinners and skeleton loaders
- **Error States**: Clear error messages and recovery options

## Error Handling

### API Errors

- **Network Failures**: Graceful handling of connection issues
- **Authentication Errors**: Proper error messages for auth failures
- **Data Validation**: Client-side validation before API calls
- **Retry Logic**: Automatic retry for transient failures

### User Experience

- **Loading States**: Clear feedback during data operations
- **Error Messages**: User-friendly error descriptions
- **Recovery Options**: Clear paths to resolve errors
- **Fallback UI**: Graceful degradation when data unavailable

## Testing Considerations

### Unit Tests

- **Component Rendering**: Test component mounting and unmounting
- **State Management**: Test state updates and side effects
- **User Interactions**: Test button clicks and form submissions
- **Error Handling**: Test error states and recovery

### Integration Tests

- **API Integration**: Test data fetching and error handling
- **Filter Functionality**: Test filtering and search capabilities
- **Export Features**: Test CSV export functionality
- **Navigation**: Test integration with parent components

### Performance Tests

- **Large Datasets**: Test with hundreds of records
- **Search Performance**: Test search responsiveness
- **Memory Usage**: Monitor memory consumption
- **Rendering Performance**: Test component re-render efficiency

## Future Enhancements

### Planned Features

- **Advanced Filtering**: More sophisticated filter options
- **Real-time Updates**: WebSocket integration for live data
- **Bulk Editing**: Inline editing capabilities
- **Custom Views**: User-defined view configurations

### Performance Improvements

- **Virtual Scrolling**: For very large datasets
- **Data Caching**: Client-side caching for better performance
- **Lazy Loading**: Progressive data loading
- **Background Sync**: Offline capability with sync

### User Experience

- **Keyboard Shortcuts**: Power user features
- **Customizable Columns**: User-defined table columns
- **Saved Filters**: Persistent filter configurations
- **Advanced Export**: Multiple export formats and options

---

*This frontend system provides a comprehensive interface for monthly snapshot management, balancing functionality with usability for both bulk operations and detailed analysis.*
