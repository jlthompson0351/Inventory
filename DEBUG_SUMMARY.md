# FormBuilder Glitching Debug Summary

## Problem
The FormBuilder was experiencing infinite re-renders/glitching when editing forms with many mapped fields (6+ calculated fields).

## Root Causes Identified

1. **Missing State Variable**: `setSelectedAssetType` was not defined, causing the asset type restoration to fail with an error
2. **Multiple `loadMappedFields` Calls**: The function was being called from multiple effects without coordination
3. **No Concurrency Control**: Multiple simultaneous loads of mapped fields could occur
4. **Duplicate Variable Declaration**: `selectedAssetType` was declared both as state and as a computed value
5. **Formula Effect Running Too Often**: The formula calculation effect was re-running on every `formData.fields` change
6. **No Memoization**: Components and expensive computations were recalculating on every render

## Fixes Applied

### 1. Added Comprehensive Debugging
```typescript
// Render counter with state tracking
const renderCount = useRef(0);
console.log(`🔄 FormBuilder RENDER #${renderCount.current}`, {...});

// Effect logging with emojis for easy identification
🟦 EFFECT: Asset type selection check
🟩 EFFECT: Load asset types triggered  
🟪 EFFECT: Reload mapped fields on asset type change
🟥 EFFECT: Initialize form triggered
🟡 EFFECT: Formula mock values update
📥 loadMappedFields called
```

### 2. Fixed State Management
- Added missing `selectedAssetType` state variable
- Removed duplicate `selectedAssetType` computed value
- Added `isLoadingMappedFields` ref to prevent concurrent loads

### 3. Optimized Effect Dependencies
- Removed `loadMappedFields()` from the organization load effect
- Let asset type selection trigger mapped fields loading instead
- Added concurrency guard in `loadMappedFields`:

```typescript
if (isLoadingMappedFields.current) {
  console.log(`⏸️ loadMappedFields already in progress, skipping`);
  return;
}
```

### 4. Fixed Asset Type Restoration
- Added proper error handling for asset type restoration
- Fixed the error where `setSelectedAssetType` was undefined

### 5. Optimized Formula Effect
- Removed `formData.fields` from formula effect dependencies
- Added change detection before updating mock values:
```typescript
let hasChanges = false;
dependencies.forEach(depKey => {
  if (!(depKey in newMocks)) {
    newMocks[depKey] = '';
    hasChanges = true;
  }
});
if (hasChanges) {
  setMockMappedValues(newMocks);
}
```

### 6. Added Memoization
- Created memoized `AssetTypePanel` component with `React.memo`
- Used `useMemo` for `effectiveAssetTypeId`
- Used `useCallback` for `loadMappedFields`

## Results

The improvements have significantly reduced unnecessary renders:
- Initial render pattern is more stable
- Formula effects no longer trigger on every field change
- Components don't re-render unnecessarily

## Testing Instructions

1. Open browser Developer Console (F12)
2. Navigate to a form with many mapped fields
3. Watch for the debug logs
4. Verify:
   - No rapid re-renders occur
   - Formula effect only runs when selecting a calculated field
   - loadMappedFields is called at most twice (once for org fields, once for asset type)

## If Still Experiencing Issues

1. Check for any remaining effects that might depend on frequently changing state
2. Look for computed values that should be memoized
3. Consider using React DevTools Profiler to identify expensive renders
4. Add more specific debugging to isolate the exact trigger

## Debug Helper

Use the included `test-debug.html` file for reference on what to look for in the console logs. 