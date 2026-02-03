# Report Styling Centralization

This document explains the centralized styling system for all risk analysis reports.

## Overview

All report components now use shared styling files to ensure consistency and easier maintenance across the application.

## Files Created

### 1. `report-styles.module.css`
Central CSS module containing all reusable UI component styles for reports.

**Key Style Classes:**
- `reportModal` - Main modal overlay
- `reportModalContent` - Modal content container
- `reportModalHeader` - Modal header section
- `reportModalTitle` - Modal title text
- `reportModalCloseButton` - Close button
- `reportModalBody` - Scrollable modal body
- `reportLoadingContainer/Content/Spinner/Text` - Loading state components
- `reportEmptyState/Text` - Empty data state
- `reportTableContainer` - Table wrapper
- `reportTable/Header/Body/Row/Cell` - Table components
- `reportTableCellWithBorder` - Table cells with right border
- `reportTableTotalRow` - Total/summary row styling
- `reportChartContainer/Section/Wrapper` - Chart layout components
- `reportModalFooter` - Modal footer with buttons
- `reportSaveButton/CloseButton` - Action buttons

### 2. `reportExcelStyles.ts`
TypeScript module containing shared ExcelJS styling configurations and helper functions.

**Key Exports:**

#### Style Objects:
- `excelBorderStyle` - Standard border configuration
- `excelTitleStyle` - Main title cell styling
- `excelUnitTitleStyle` - Unit/section title styling
- `excelHeaderStyle` - Header row styling
- `excelDataCellStyle` - Data cell styling
- `excelTotalRowStyle` - Total row styling
- `excelFooterStyle` - Footer text styling

#### Helper Functions:
- `applyTitleStyle()` - Apply title and merge cells
- `applyUnitTitleStyle()` - Apply section title and merge cells
- `applyHeaderRowStyle()` - Apply header row styles
- `applyDataCellStyle()` - Apply data cell styles
- `applyFooterStyle()` - Apply footer and merge cells
- `addChartImage()` - Add chart image to worksheet
- `setStandardColumnWidths()` - Set column widths
- `generateFooterText()` - Generate footer with user and timestamp

### 3. `chartConfig.ts`
Centralized Chart.js configuration containing color palettes, dataset configurations, and chart defaults.

**Key Exports:**

#### Color Palette:
- `CHART_COLORS.piping` - Piping dataset colors (blue)
- `CHART_COLORS.equipment` - Equipment dataset colors (red)
- `CHART_COLORS.total` - Total/combined dataset colors (teal)
- `CHART_COLORS.pieChart` - Array of 6 colors for pie charts

#### Helper Functions:
- `createBarDataset()` - Create a bar chart dataset with consistent styling
- `getDefaultChartOptions()` - Get default bar/line chart options with improved Y-axis
- `getPieChartOptions()` - Get default pie chart options
- `getPieChartColors()` - Get color arrays for multiple pie chart segments

## Refactored Components

All report components have been updated to use the centralized styles:

1. **Report_Count_Insp_All.tsx** (report_id=101)
   - Table-based report with dynamic year columns
   - Uses CSS module for all UI styling
   - Excel export uses XLSX library

2. **Report_Count_Insp_All_Graphic.tsx** (report_id=102)
   - 3 bar charts with data tables
   - Uses CSS module for UI styling
   - Uses chartConfig for chart colors and options
   - Excel export uses ExcelJS with embedded chart images

3. **Report_Diagram_Deg_Mech.tsx**
   - Bar chart report grouped by unit
   - Uses CSS module for UI styling
   - Uses chartConfig for chart colors and options
   - Excel export uses ExcelJS with embedded chart images

4. **Report_PieChart.tsx**
   - Pie chart report grouped by unit
   - Uses CSS module for UI styling
   - Uses chartConfig for chart colors and options
   - Excel export uses ExcelJS with embedded chart images

## Usage Example

### CSS Module Usage:
```tsx
import styles from './report-styles.module.css';

// In component JSX:
<div className={styles.reportModal}>
  <div className={styles.reportModalContent}>
    <div className={styles.reportModalHeader}>
      <h3 className={styles.reportModalTitle}>Report Title</h3>
    </div>
  </div>
</div>
```

### Excel Styles Usage:
```tsx
import * as excelStyles from './reportExcelStyles';

// Apply title
excelStyles.applyTitleStyle(worksheet, 'Report Title', 0, numColumns - 1, 1);

// Apply header row
excelStyles.applyHeaderRowStyle(worksheet, ['Col1', 'Col2'], 3);

// Apply data cells
excelStyles.applyDataCellStyle(worksheet, ['Value1', 'Value2'], 4);

// Add chart image
const rowsSkipped = excelStyles.addChartImage(
  workbook,
  worksheet,
  chartCanvas,
  currentRow
);

// Generate footer
const footerText = excelStyles.generateFooterText(userName);
excelStyles.applyFooterStyle(worksheet, footerText, 0, numColumns - 1, footerRow);
```

### Chart Configuration Usage:
```tsx
import { createBarDataset, getDefaultChartOptions, getPieChartColors, getPieChartOptions } from './chartConfig';

// Bar chart example
const datasets = [];
if (hasPipingData) {
  datasets.push(createBarDataset('Piping', pipingValues, 'piping'));
}
if (hasEquipmentData) {
  datasets.push(createBarDataset('Equipment', equipmentValues, 'equipment'));
}

const chartData = {
  labels: yearLabels,
  datasets
};

const chartOptions = getDefaultChartOptions('My Chart Title');

// Pie chart example
const { backgrounds, borders } = getPieChartColors(categoryCount);
const pieData = {
  labels: categories,
  datasets: [{
    data: values,
    backgroundColor: backgrounds,
    borderColor: borders,
    borderWidth: 1,
  }]
};

const pieOptions = getPieChartOptions('My Pie Chart');
```

## Benefits

1. **Consistency** - All reports use the same visual styling
2. **Maintainability** - Style changes only need to be made in one place
3. **Reusability** - Easy to create new reports using existing styles
4. **Type Safety** - TypeScript types ensure correct usage of Excel styles
5. **Performance** - CSS modules provide scoped styles with minimal overhead
6. **DRY Principle** - No duplicate styling code across components

## Future Improvements

When creating new reports:
1. Import `report-styles.module.css` for UI styling
2. Import `reportExcelStyles` for Excel export styling
3. Import `chartConfig` for chart colors and configurations
4. Use the existing style classes instead of creating new ones
5. Only add new styles/colors to the centralized files if truly needed
6. Consider extracting more common patterns into helper functions

## Migration Notes

The following inline styles were replaced:

### UI Styling (CSS):
- Modal overlay and container classes
- Loading spinner and empty state styles
- Table header and body classes
- Chart container and section classes
- Button styles (using existing btn classes)

### Excel Export Styling:
- Shared border, font, and alignment configurations
- Helper functions for common operations
- Consistent cell styling patterns

### Chart Styling:
- Hard-coded rgba color values replaced with centralized color palette
- Duplicate chart configuration objects removed
- Chart options standardized with improved Y-axis settings
- Dataset creation unified through helper functions
