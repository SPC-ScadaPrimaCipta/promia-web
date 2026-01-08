# Tree View Icon Implementation Plan

## Overview
Add risk level icons to the tree view nodes based on the selected model. Icons are fetched from the database and displayed next to each asset in the tree hierarchy.

---

## Database Schema Understanding

### Tables Involved:
1. **rbi_model**
   - Contains: `RBIM_ID`, `Matrix_ID`, `name`
   - Purpose: Links model to risk matrix

2. **RBI_RISK_LEVEL**
   - Contains: `RBIM_ID`, `ASSET_ID`, `Risk_ID`
   - Purpose: Stores risk level per asset per model
   - Returns: 1 row per asset per model

3. **rbi_matrix_risk**
   - Contains: `Matrix_ID`, `Risk_ID`, `icon` (byte[] - .ico file)
   - Purpose: Stores risk level icons for each matrix

### Data Flow:
```
Selected Model (RBIM_ID)
  → rbi_model.Matrix_ID
  → JOIN RBI_RISK_LEVEL on RBIM_ID and ASSET_ID
  → JOIN rbi_matrix_risk on Matrix_ID and Risk_ID
  → Get icon (byte[])
```

---

## Implementation Steps

### Step 1: Modify Assets API to Include Risk Icons
**File**: `/app/api/risk-analysis/assets/route.ts`

**Current Query**: Returns hierarchical asset structure with CTE
**New Query**: Add LEFT JOINs to include `Risk_ID` and `icon`

**Changes Needed**:
1. Add parameter: `rbim_id` (from selected model dropdown)
2. Modify the CTE query to include:
   - LEFT JOIN with `rbi_model` to get `Matrix_ID` using `RBIM_ID`
   - LEFT JOIN with `RBI_RISK_LEVEL` on `ASSET_ID` and `RBIM_ID`
   - LEFT JOIN with `rbi_matrix_risk` on `Matrix_ID` and `Risk_ID`
3. Add to SELECT clause:
   - `rl.Risk_ID` (from RBI_RISK_LEVEL)
   - `mr.icon` (from rbi_matrix_risk)
4. Handle NULL cases (assets without risk levels should not show icons)

**Pseudo SQL**:
```sql
WITH AssetHierarchy AS (
    -- Existing CTE logic
    SELECT
        a.site_id,
        a.area_id,
        a.unit_id,
        a.asset_id,
        a.site_name,
        a.area_name,
        a.unit_name,
        a.asset_name,
        rl.Risk_ID,
        mr.icon
    FROM dbo.rbi_asset a
    LEFT JOIN dbo.rbi_model m ON m.RBIM_ID = @rbimId
    LEFT JOIN dbo.RBI_RISK_LEVEL rl ON rl.ASSET_ID = a.asset_id AND rl.RBIM_ID = @rbimId
    LEFT JOIN dbo.rbi_matrix_risk mr ON mr.Matrix_ID = m.Matrix_ID AND mr.Risk_ID = rl.Risk_ID
    -- Rest of existing WHERE clauses
)
SELECT * FROM AssetHierarchy
```

**API Response Format**:
```typescript
{
    success: true,
    data: [
        {
            site_id: number,
            area_id: number,
            unit_id: number,
            asset_id: number,
            site_name: string,
            area_name: string,
            unit_name: string,
            asset_name: string,
            Risk_ID: number | null,
            icon: Buffer | null  // byte array from database
        }
    ]
}
```

**Icon Conversion**:
Convert `icon` (byte[]) to base64 string for client-side usage:
```typescript
const assetsWithIcons = result.recordset.map((row: any) => ({
    ...row,
    icon: row.icon ? row.icon.toString('base64') : null
}));
```

---

### Step 2: Update ComponentTreeView Component
**File**: `/components/risk-analysis/ComponentTreeView.tsx`

**Changes Needed**:

1. **Update TreeItem Interface**:
```typescript
interface TreeItem {
    index: string;
    canMove?: boolean;
    hasChildren?: boolean;
    children?: string[];
    data: {
        name: string;
        level: 'site' | 'area' | 'unit' | 'asset';
        id: number;
        Risk_ID?: number | null;  // NEW
        icon?: string | null;      // NEW - base64 string
    };
    canRename?: boolean;
    isFolder?: boolean;
}
```

2. **Pass Icon Data to Tree Items**:
When building tree structure from assets data, include `Risk_ID` and `icon` in each node's data property.

3. **Custom Render Function**:
Modify `ControlledTreeEnvironment` to use `renderItem` or `renderItemTitle` prop to display icons.

**Example Custom Render**:
```typescript
renderItemTitle={({ item, context }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {item.data.icon && (
            <img
                src={`data:image/x-icon;base64,${item.data.icon}`}
                alt="Risk Icon"
                style={{ width: '16px', height: '16px' }}
            />
        )}
        <span>{item.data.name}</span>
    </div>
)}
```

**Props to Add**:
```typescript
interface ComponentTreeViewProps {
    items: TreeItems;
    selectedAsset: TreeItem | null;
    onSelectAsset: (assetId: number, assetData: any) => void;
    expandedItems?: string[];
    onExpandedItemsChange?: (expandedItems: string[]) => void;
}
```

---

### Step 3: Update Component Page to Pass Model ID
**File**: `/app/(defaults)/risk-analysis/component/page.tsx`

**Changes Needed**:

1. **Fetch Assets with Model Context**:
Modify the assets API call to include `rbim_id` parameter:
```typescript
const response = await fetch(
    `/api/risk-analysis/assets?rbim_id=${selectedModel}`
);
```

2. **Re-fetch Tree When Model Changes**:
Add `selectedModel` to the useEffect dependency array that fetches assets:
```typescript
useEffect(() => {
    const fetchAssets = async () => {
        if (selectedModel) {
            // Fetch assets with model parameter
        }
    };
    fetchAssets();
}, [selectedModel]); // Re-fetch when model changes
```

3. **Handle No Model Selected**:
- If no model is selected, fetch assets without icons (current behavior)
- Or disable tree until model is selected (optional UX improvement)

---

### Step 4: Handle Edge Cases

**4.1. Assets Without Risk Levels**:
- Query uses LEFT JOIN, so assets without risk levels will have `Risk_ID = NULL` and `icon = NULL`
- Don't render icon element if `icon` is null
- Tree node displays normally without icon

**4.2. Model Not Selected**:
- Make `rbim_id` parameter optional in assets API
- If not provided, don't include JOIN with risk tables
- Return assets without `Risk_ID` and `icon` columns

**4.3. Invalid Icon Data**:
- Wrap icon rendering in try-catch
- If base64 conversion fails, don't show icon
- Log error for debugging

**4.4. Performance**:
- Only ~5 unique icons total
- Icons are small .ico files (~1-5KB each)
- Base64 encoding adds ~33% size overhead
- Total payload increase: ~10-20KB (negligible)

---

### Step 5: Testing Checklist

- [ ] Model dropdown selects a model
- [ ] Assets API receives `rbim_id` parameter correctly
- [ ] Assets API returns `Risk_ID` and `icon` for assets with risk levels
- [ ] Assets API returns `NULL` for assets without risk levels
- [ ] Tree view displays icons next to asset names
- [ ] Icons render correctly as .ico format
- [ ] Assets without risk levels display without icons
- [ ] Changing model refreshes tree with new icons
- [ ] Tree selection still works correctly
- [ ] Component information table still loads correctly
- [ ] No console errors or warnings

---

## Files to Modify

1. **Backend (API)**:
   - `/app/api/risk-analysis/assets/route.ts`
     - Add `rbim_id` query parameter
     - Modify SQL query to JOIN risk tables
     - Convert icon byte[] to base64

2. **Frontend (Components)**:
   - `/components/risk-analysis/ComponentTreeView.tsx`
     - Update TreeItem interface
     - Add icon rendering logic
     - Custom renderItemTitle function

   - `/app/(defaults)/risk-analysis/component/page.tsx`
     - Pass `rbim_id` to assets API
     - Re-fetch assets when model changes
     - Pass icon data to ComponentTreeView

---

## SQL Query Template

```sql
WITH AssetHierarchy AS (
    SELECT
        a.site_id,
        a.area_id,
        a.unit_id,
        a.asset_id,
        a.site_name,
        a.area_name,
        a.unit_name,
        a.asset_name,
        rl.Risk_ID,
        mr.icon
    FROM dbo.rbi_asset a
    LEFT JOIN dbo.rbi_model m ON m.RBIM_ID = @rbimId
    LEFT JOIN dbo.RBI_RISK_LEVEL rl
        ON rl.ASSET_ID = a.asset_id
        AND rl.RBIM_ID = @rbimId
    LEFT JOIN dbo.rbi_matrix_risk mr
        ON mr.Matrix_ID = m.Matrix_ID
        AND mr.Risk_ID = rl.Risk_ID
    WHERE a.active = 1  -- existing condition
)
SELECT * FROM AssetHierarchy
ORDER BY site_name, area_name, unit_name, asset_name
```

---

## API Endpoint Changes

### Current: `/api/risk-analysis/assets`
**Parameters**: None
**Returns**: Asset hierarchy without icons

### Updated: `/api/risk-analysis/assets?rbim_id={model_id}`
**Parameters**:
- `rbim_id` (optional): Number - Model ID for risk level lookup

**Returns**: Asset hierarchy with risk icons
```json
{
  "success": true,
  "data": [
    {
      "site_id": 1,
      "asset_id": 100,
      "asset_name": "Tank-001",
      "Risk_ID": 3,
      "icon": "AAABAAEAEBAAAAEAIABoBAAA..."  // base64 string
    }
  ]
}
```

---

## Technical Notes

### Icon Format Handling:
- **.ico files** are stored as `byte[]` in SQL Server
- Convert to **base64 string** in API
- Display using: `data:image/x-icon;base64,{base64String}`
- Alternative MIME types: `image/vnd.microsoft.icon` or `image/x-icon`

### Tree Library Support:
- `react-complex-tree` supports custom rendering via `renderItemTitle` prop
- Can pass custom JSX with icons + text
- Icon should appear before text label

### State Management:
- Keep existing tree state (expanded items, selected asset)
- Add icon data without breaking current functionality
- Model change triggers tree re-fetch

---

## Questions Answered

1. ✅ Model dropdown exists with `selectedModel` state
2. ✅ Modify assets API query to include joins
3. ✅ RBI_RISK_LEVEL returns 1 row per asset per model
4. ✅ Icon is .ico file (byte[]) - convert to base64
5. ✅ Modify ComponentTreeView to render icons
6. ✅ Single query in assets API with additional columns

---

## Next Steps After Approval

1. Start with backend: Modify assets API route
2. Test API response manually
3. Update ComponentTreeView component
4. Update page.tsx to pass model ID
5. Test complete flow
6. Handle edge cases
7. Clean up console logs
