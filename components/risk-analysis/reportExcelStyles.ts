/**
 * Shared Excel styling configuration for all reports
 * This centralizes Excel export styles to ensure consistency across reports
 */

import ExcelJS from 'exceljs';

// Border styles
export const excelBorderStyle: Partial<ExcelJS.Borders> = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
};

// Title cell style
export const excelTitleStyle: Partial<ExcelJS.Style> = {
    font: { bold: true, size: 16 },
    alignment: { horizontal: 'center', vertical: 'middle' }
};

// Unit/Section title style
export const excelUnitTitleStyle: Partial<ExcelJS.Style> = {
    font: { bold: true, size: 14 },
    alignment: { horizontal: 'center', vertical: 'middle' },
    fill: {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
    }
};

// Header row style
export const excelHeaderStyle: Partial<ExcelJS.Style> = {
    font: { bold: true },
    fill: {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' }
    },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: excelBorderStyle
};

// Data cell style
export const excelDataCellStyle: Partial<ExcelJS.Style> = {
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: excelBorderStyle
};

// Total row style
export const excelTotalRowStyle: Partial<ExcelJS.Style> = {
    font: { bold: true },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: excelBorderStyle
};

// Footer style
export const excelFooterStyle: Partial<ExcelJS.Style> = {
    font: { italic: true, color: { argb: 'FF666666' } },
    alignment: { horizontal: 'left', vertical: 'middle' }
};

/**
 * Apply title style and merge cells
 */
export const applyTitleStyle = (
    worksheet: ExcelJS.Worksheet,
    title: string,
    startCol: number = 0,
    endCol: number,
    row: number = 1
) => {
    const cellAddress = ExcelJS.utils.getExcelCellRef(row - 1, startCol);
    worksheet.mergeCells(row, startCol + 1, row, endCol + 1);
    const titleCell = worksheet.getCell(row, startCol + 1);
    titleCell.value = title;
    titleCell.style = excelTitleStyle;
};

/**
 * Apply unit/section title style and merge cells
 */
export const applyUnitTitleStyle = (
    worksheet: ExcelJS.Worksheet,
    title: string,
    startCol: number = 0,
    endCol: number,
    row: number
) => {
    worksheet.mergeCells(row, startCol + 1, row, endCol + 1);
    const titleCell = worksheet.getCell(row, startCol + 1);
    titleCell.value = title;
    titleCell.style = excelUnitTitleStyle;
};

/**
 * Apply header row styles
 */
export const applyHeaderRowStyle = (
    worksheet: ExcelJS.Worksheet,
    headers: string[],
    row: number
) => {
    headers.forEach((header, col) => {
        const cell = worksheet.getCell(row, col + 1);
        cell.value = header;
        cell.style = excelHeaderStyle;
    });
};

/**
 * Apply data cell styles
 */
export const applyDataCellStyle = (
    worksheet: ExcelJS.Worksheet,
    data: any[],
    row: number,
    style: Partial<ExcelJS.Style> = excelDataCellStyle
) => {
    data.forEach((value, col) => {
        const cell = worksheet.getCell(row, col + 1);
        cell.value = value;
        cell.style = style;
    });
};

/**
 * Apply footer style and merge cells
 */
export const applyFooterStyle = (
    worksheet: ExcelJS.Worksheet,
    footerText: string,
    startCol: number = 0,
    endCol: number,
    row: number
) => {
    worksheet.mergeCells(row, startCol + 1, row, endCol + 1);
    const footerCell = worksheet.getCell(row, startCol + 1);
    footerCell.value = footerText;
    footerCell.style = excelFooterStyle;
};

/**
 * Add chart image to worksheet
 */
export const addChartImage = (
    workbook: ExcelJS.Workbook,
    worksheet: ExcelJS.Worksheet,
    canvas: HTMLCanvasElement,
    row: number,
    col: number = 0,
    width: number = 600,
    height: number = 400
): number => {
    try {
        const imageBase64 = canvas.toDataURL('image/png').split(',')[1];
        const imageId = workbook.addImage({
            base64: imageBase64,
            extension: 'png',
        });

        worksheet.addImage(imageId, {
            tl: { col, row },
            ext: { width, height }
        });

        // Calculate rows to skip (approx 25 rows for 400px height)
        return Math.ceil(height / 16);
    } catch (error) {
        console.error('Error adding chart image:', error);
        return 0;
    }
};

/**
 * Set standard column widths
 */
export const setStandardColumnWidths = (
    worksheet: ExcelJS.Worksheet,
    widths: number[]
) => {
    widths.forEach((width, index) => {
        worksheet.getColumn(index + 1).width = width;
    });
};

/**
 * Generate footer text with user and timestamp
 */
export const generateFooterText = (userName: string): string => {
    const now = new Date();
    const dateTimeStr = now.toISOString().replace('T', ' ').substring(0, 19);
    return `Report generated by ${userName} on ${dateTimeStr}`;
};
