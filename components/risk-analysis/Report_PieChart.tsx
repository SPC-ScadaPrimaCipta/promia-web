'use client';

import React, { useRef } from 'react';
import ExcelJS from 'exceljs';
import { useSession } from 'next-auth/react';
import styles from './report-styles.module.css';
import * as excelStyles from './reportExcelStyles';
import { getPieChartColors, getPieChartOptions } from './chartConfig';
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend,
} from 'chart.js';
import { Pie } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
    ArcElement,
    Tooltip,
    Legend
);

interface ReportPieChartProps {
    isOpen: boolean;
    onClose: () => void;
    data: any[];
    loading: boolean;
    reportTitle?: string;
}

interface UnitData {
    unitName: string;
    categories: string[];
    values: number[];
}

const ReportPieChart: React.FC<ReportPieChartProps> = ({ isOpen, onClose, data, loading, reportTitle }) => {
    const { data: session } = useSession();
    const chartRefs = useRef<{ [key: string]: any }>({});

    if (!isOpen) return null;

    const getUserName = () => {
        return session?.user?.name || session?.user?.email || 'System User';
    };

    // Group data by Unit Name
    const groupDataByUnit = (): UnitData[] => {
        const unitMap = new Map<string, Map<string, number>>();

        console.log('=== RAW DATA FROM API ===');
        console.log('Total rows:', data.length);
        console.log('First row sample:', data[0]);

        data.forEach((row, index) => {
            const unitName = row.unit_name || 'Unknown';
            const ctId = String(row.ct_id || '');
            const count = Number(row.Count_inclusive_exclusive ?? 0) || 0;

            console.log(`Row ${index}: UNIT=${unitName}, CT_ID=${ctId}, COUNT=${count}`);

            // Get or create unit map
            if (!unitMap.has(unitName)) {
                unitMap.set(unitName, new Map());
            }
            const categoryMap = unitMap.get(unitName)!;

            // Aggregate values for the same ct_id
            if (categoryMap.has(ctId)) {
                categoryMap.set(ctId, categoryMap.get(ctId)! + count);
            } else {
                categoryMap.set(ctId, count);
            }
        });

        // Convert to UnitData array format
        const result: UnitData[] = [];
        unitMap.forEach((categoryMap, unitName) => {
            const categories: string[] = [];
            const values: number[] = [];

            categoryMap.forEach((value, category) => {
                categories.push(category);
                values.push(value);
            });

            result.push({
                unitName,
                categories,
                values
            });
        });

        console.log('=== GROUPED DATA (AGGREGATED) ===');
        result.forEach(unit => {
            console.log(`\nUnit: ${unit.unitName}`);
            console.log('Categories (ct_id):', unit.categories);
            console.log('Values:', unit.values);
        });

        return result;
    };

    const unitDataList = groupDataByUnit();

    // Get chart data using centralized configuration
    const getChartData = (unitData: UnitData) => {
        console.log(`=== CHART DATA FOR UNIT: ${unitData.unitName} ===`);
        console.log('Categories:', unitData.categories);
        console.log('Values:', unitData.values);

        const { backgrounds, borders } = getPieChartColors(unitData.categories.length);

        return {
            labels: unitData.categories,
            datasets: [{
                data: unitData.values,
                backgroundColor: backgrounds,
                borderColor: borders,
                borderWidth: 1,
            }]
        };
    };

    // Handle Excel export with embedded chart images using ExcelJS
    const handleExportToExcel = async () => {
        const now = new Date();
        const dateTimeStr = now.toISOString().replace('T', ' ').substring(0, 19);
        const userName = getUserName();
        const title = reportTitle || 'Inclusive Exclusive Pie Chart Report';

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Pie Chart Report');

        // Define border style
        const borderStyle = {
            top: { style: 'thin' as const },
            left: { style: 'thin' as const },
            bottom: { style: 'thin' as const },
            right: { style: 'thin' as const }
        };

        // Always use 2 columns: Category, Count
        const lastColumn = 'B';

        // Row 1: Main Title
        worksheet.mergeCells(`A1:${lastColumn}1`);
        const mainTitleCell = worksheet.getCell('A1');
        mainTitleCell.value = title;
        mainTitleCell.font = { bold: true, size: 16 };
        mainTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };

        let currentRow = 3; // Start from row 3

        for (let i = 0; i < unitDataList.length; i++) {
            const unitData = unitDataList[i];

            // Unit Name as subtitle
            worksheet.mergeCells(`A${currentRow}:${lastColumn}${currentRow}`);
            const unitTitleCell = worksheet.getCell(`A${currentRow}`);
            unitTitleCell.value = unitData.unitName;
            unitTitleCell.font = { bold: true, size: 14 };
            unitTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
            unitTitleCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE0E0E0' }
            };
            currentRow++;

            // Headers - 2 columns
            const headers = ['Category', 'Count'];

            for (let col = 0; col < headers.length; col++) {
                const cell = worksheet.getCell(currentRow, col + 1);
                cell.value = headers[col];
                cell.font = { bold: true };
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFD3D3D3' }
                };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.border = borderStyle;
            }
            currentRow++;

            // Data rows - 2 columns
            unitData.categories.forEach((category, index) => {
                const rowData: any[] = [
                    category,
                    unitData.values[index] || 0
                ];

                for (let col = 0; col < rowData.length; col++) {
                    const cell = worksheet.getCell(currentRow, col + 1);
                    cell.value = rowData[col];
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    cell.border = borderStyle;
                }
                currentRow++;
            });

            // Add chart image
            try {
                const chartRef = chartRefs.current[unitData.unitName];
                if (chartRef) {
                    const canvas = chartRef.canvas;
                    if (canvas) {
                        // Convert canvas to base64 image
                        const imageBase64 = canvas.toDataURL('image/png').split(',')[1];

                        // Add image to workbook
                        const imageId = workbook.addImage({
                            base64: imageBase64,
                            extension: 'png',
                        });

                        // Position chart image with 1:1 aspect ratio for perfect circles
                        worksheet.addImage(imageId, {
                            tl: { col: 0, row: currentRow },
                            ext: { width: 400, height: 400 }
                        });

                        // Move current row down to account for image height (approx 25 rows for 400px)
                        currentRow += 25;
                    }
                }
            } catch (error) {
                console.error('Error adding chart image:', error);
            }

            // Add spacing between units
            currentRow += 2;
        }

        // Footer at the end
        worksheet.mergeCells(`A${currentRow}:${lastColumn}${currentRow}`);
        const footerCell = worksheet.getCell(`A${currentRow}`);
        footerCell.value = `Report generated by ${userName} on ${dateTimeStr}`;
        footerCell.font = { italic: true, color: { argb: 'FF666666' } };
        footerCell.alignment = { horizontal: 'left', vertical: 'middle' };

        // Set column widths for both columns
        worksheet.getColumn(1).width = 30; // Category
        worksheet.getColumn(2).width = 15; // Count

        // Generate and download file
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `pie_chart_report_${new Date().toISOString().slice(0, 10)}.xlsx`;
        link.click();
        window.URL.revokeObjectURL(url);
    };

    return (
        <div className={styles.reportModal} onClick={onClose}>
            <div className={styles.reportModalContent} onClick={(e) => e.stopPropagation()}>
                {/* Modal Header */}
                <div className={styles.reportModalHeader}>
                    <h3 className={styles.reportModalTitle}>
                        {reportTitle || 'Inclusive Exclusive Pie Chart Report'}
                    </h3>
                    <button
                        onClick={onClose}
                        className={styles.reportModalCloseButton}
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Modal Body */}
                <div className={styles.reportModalBody}>
                    {loading ? (
                        <div className={styles.reportLoadingContainer}>
                            <div className={styles.reportLoadingContent}>
                                <div className={styles.reportLoadingSpinner}></div>
                                <p className={styles.reportLoadingText}>Loading report...</p>
                            </div>
                        </div>
                    ) : data.length === 0 ? (
                        <div className={styles.reportEmptyState}>
                            <p className={styles.reportEmptyText}>No data available</p>
                        </div>
                    ) : (
                        <div className={styles.reportChartContainer}>
                            {unitDataList.map((unitData, index) => (
                                <div key={index} className={styles.reportChartSection}>
                                    <div className={styles.reportChartWrapper}>
                                        <Pie
                                            ref={(ref) => {
                                                if (ref) {
                                                    chartRefs.current[unitData.unitName] = ref;
                                                }
                                            }}
                                            options={getPieChartOptions(unitData.unitName)}
                                            data={getChartData(unitData)}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className={styles.reportModalFooter}>
                    <button
                        onClick={handleExportToExcel}
                        className={styles.reportSaveButton}
                        disabled={loading || data.length === 0}
                    >
                        Save
                    </button>
                    <button
                        onClick={onClose}
                        className={styles.reportCloseButton}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReportPieChart;
