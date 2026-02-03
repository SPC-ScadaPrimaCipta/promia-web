'use client';

import React, { useRef } from 'react';
import ExcelJS from 'exceljs';
import { useSession } from 'next-auth/react';
import styles from './report-styles.module.css';
import * as excelStyles from './reportExcelStyles';
import { createBarDataset, getDefaultChartOptions } from './chartConfig';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

interface ReportCountInspAllGraphicProps {
    isOpen: boolean;
    onClose: () => void;
    data: any[];
    loading: boolean;
    reportTitle?: string;
}

interface ChartData {
    years: string[];
    pipingValues: number[];
    equipmentValues: number[];
}

const ReportCountInspAllGraphic: React.FC<ReportCountInspAllGraphicProps> = ({ isOpen, onClose, data, loading, reportTitle }) => {
    const { data: session } = useSession();
    const chartRefs = useRef<{ [key: string]: any }>({});

    if (!isOpen) return null;

    const getUserName = () => {
        return session?.user?.name || session?.user?.email || 'System User';
    };

    // Process data for charts
    const processData = (): { assetData: ChartData, costData: ChartData, costDistData: ChartData } => {
        const yearMap = new Map<string, { assetPiping: number, assetEquipment: number, costPiping: number, costEquipment: number }>();

        console.log('=== RAW DATA FROM API ===');
        console.log('Total rows:', data.length);
        console.log('First row sample:', data[0]);

        data.forEach((row, index) => {
            const year = String(row.insp_year || '');
            const countAsset = Number(row.countAsset ?? 0) || 0;
            const cost = Number(row.cost ?? 0) || 0;
            const pipingFlag = Number(row.piping ?? 0);
            const equipmentFlag = Number(row.equipment ?? 0);

            const assetPipingValue = pipingFlag === 1 ? countAsset : 0;
            const assetEquipmentValue = equipmentFlag === 1 ? countAsset : 0;
            const costPipingValue = pipingFlag === 1 ? cost : 0;
            const costEquipmentValue = equipmentFlag === 1 ? cost : 0;

            console.log(`Row ${index}: YEAR=${year}, countAsset=${countAsset}, cost=${cost}, pipingFlag=${pipingFlag}, equipFlag=${equipmentFlag}`);

            if (!yearMap.has(year)) {
                yearMap.set(year, { assetPiping: 0, assetEquipment: 0, costPiping: 0, costEquipment: 0 });
            }
            const yearEntry = yearMap.get(year)!;
            yearEntry.assetPiping += assetPipingValue;
            yearEntry.assetEquipment += assetEquipmentValue;
            yearEntry.costPiping += costPipingValue;
            yearEntry.costEquipment += costEquipmentValue;
        });

        const years = Array.from(yearMap.keys()).sort();
        const assetPipingValues: number[] = [];
        const assetEquipmentValues: number[] = [];
        const costPipingValues: number[] = [];
        const costEquipmentValues: number[] = [];

        years.forEach(year => {
            const entry = yearMap.get(year)!;
            assetPipingValues.push(entry.assetPiping);
            assetEquipmentValues.push(entry.assetEquipment);
            costPipingValues.push(entry.costPiping);
            costEquipmentValues.push(entry.costEquipment);
        });

        return {
            assetData: { years, pipingValues: assetPipingValues, equipmentValues: assetEquipmentValues },
            costData: { years, pipingValues: costPipingValues, equipmentValues: costEquipmentValues },
            costDistData: { years, pipingValues: costPipingValues, equipmentValues: costEquipmentValues }
        };
    };

    const { assetData, costData, costDistData } = processData();

    // Get chart data using centralized configuration
    const getAssetChartData = () => {
        const datasets = [];
        if (assetData.pipingValues.some(v => v > 0)) {
            datasets.push(createBarDataset('Piping', assetData.pipingValues, 'piping'));
        }
        if (assetData.equipmentValues.some(v => v > 0)) {
            datasets.push(createBarDataset('Equipment', assetData.equipmentValues, 'equipment'));
        }
        return { labels: assetData.years, datasets };
    };

    const getCostChartData = () => {
        const datasets = [];
        if (costData.pipingValues.some(v => v > 0)) {
            datasets.push(createBarDataset('Piping', costData.pipingValues, 'piping'));
        }
        if (costData.equipmentValues.some(v => v > 0)) {
            datasets.push(createBarDataset('Equipment', costData.equipmentValues, 'equipment'));
        }
        return { labels: costData.years, datasets };
    };

    const getCostDistChartData = () => {
        const totalValues = costDistData.years.map((_, index) =>
            costDistData.pipingValues[index] + costDistData.equipmentValues[index]
        );
        return {
            labels: costDistData.years,
            datasets: [createBarDataset('Total Cost', totalValues, 'total')]
        };
    };

    // Handle Excel export with embedded chart images using ExcelJS
    const handleExportToExcel = async () => {
        const now = new Date();
        const dateTimeStr = now.toISOString().replace('T', ' ').substring(0, 19);
        const userName = getUserName();
        const title = reportTitle || 'Inspection Plan Graphic Report';

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Inspection Plan Graphic');

        // Define border style
        const borderStyle = {
            top: { style: 'thin' as const },
            left: { style: 'thin' as const },
            bottom: { style: 'thin' as const },
            right: { style: 'thin' as const }
        };

        let currentRow = 1;

        // Main Title
        worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
        const mainTitleCell = worksheet.getCell(`A${currentRow}`);
        mainTitleCell.value = title;
        mainTitleCell.font = { bold: true, size: 16 };
        mainTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        currentRow += 2;

        // Chart 1: Graphic Inspection Plan (Asset)
        const addChartSection = (
            sectionTitle: string,
            headers: string[],
            chartData: ChartData,
            chartKey: string,
            includeTotal: boolean = false
        ) => {
            worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
            const sectionTitleCell = worksheet.getCell(`A${currentRow}`);
            sectionTitleCell.value = sectionTitle;
            sectionTitleCell.font = { bold: true, size: 14 };
            sectionTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
            sectionTitleCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE0E0E0' }
            };
            currentRow++;

            // Headers
            const numCols = includeTotal ? 4 : 3;
            for (let col = 0; col < numCols; col++) {
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

            // Data rows
            chartData.years.forEach((year, index) => {
                const rowData: any[] = [
                    year,
                    chartData.pipingValues[index] || '',
                    chartData.equipmentValues[index] || ''
                ];
                if (includeTotal) {
                    rowData.push((chartData.pipingValues[index] || 0) + (chartData.equipmentValues[index] || 0) || '');
                }

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
                const chartRef = chartRefs.current[chartKey];
                if (chartRef) {
                    const canvas = chartRef.canvas;
                    if (canvas) {
                        const imageBase64 = canvas.toDataURL('image/png').split(',')[1];
                        const imageId = workbook.addImage({
                            base64: imageBase64,
                            extension: 'png',
                        });

                        worksheet.addImage(imageId, {
                            tl: { col: 0, row: currentRow },
                            ext: { width: 600, height: 400 }
                        });

                        currentRow += 25;
                    }
                }
            } catch (error) {
                console.error('Error adding chart image:', error);
            }

            currentRow += 2;
        };

        addChartSection(
            'Graphic Inspection Plan (Asset)',
            ['Year', 'Piping', 'Equipment'],
            assetData,
            'asset',
            false
        );

        addChartSection(
            'Graphic Inspection Plan (Cost)',
            ['Year', 'Piping', 'Equipment'],
            costData,
            'cost',
            false
        );

        addChartSection(
            'Graphic Inspection Plan (Cost Distribution)',
            ['Year', 'Piping', 'Equipment', 'Total'],
            costDistData,
            'costDist',
            true
        );

        // Footer
        worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
        const footerCell = worksheet.getCell(`A${currentRow}`);
        footerCell.value = `Report generated by ${userName} on ${dateTimeStr}`;
        footerCell.font = { italic: true, color: { argb: 'FF666666' } };
        footerCell.alignment = { horizontal: 'left', vertical: 'middle' };

        // Set column widths
        worksheet.getColumn(1).width = 15; // Year
        worksheet.getColumn(2).width = 15; // Piping
        worksheet.getColumn(3).width = 15; // Equipment
        worksheet.getColumn(4).width = 15; // Total

        // Generate and download file
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `inspection_plan_graphic_${new Date().toISOString().slice(0, 10)}.xlsx`;
        link.click();
        window.URL.revokeObjectURL(url);
    };

    return (
        <div className={styles.reportModal} onClick={onClose}>
            <div className={styles.reportModalContent} onClick={(e) => e.stopPropagation()}>
                {/* Modal Header */}
                <div className={styles.reportModalHeader}>
                    <h3 className={styles.reportModalTitle}>
                        {reportTitle || 'Inspection Plan Graphic Report'}
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
                            {/* Chart 1: Graphic Inspection Plan (Asset) */}
                            <div className={styles.reportChartSection}>
                                <div className={styles.reportChartWrapper}>
                                    <Bar
                                        ref={(ref) => {
                                            if (ref) {
                                                chartRefs.current['asset'] = ref;
                                            }
                                        }}
                                        options={getDefaultChartOptions('Graphic Inspection Plan (Asset)')}
                                        data={getAssetChartData()}
                                    />
                                </div>
                                <div className="mt-4 overflow-x-auto">
                                    <table className={styles.reportTable}>
                                        <thead className={styles.reportTableHeader}>
                                            <tr>
                                                <th className={styles.reportTableHeaderCell}>Year</th>
                                                <th className={styles.reportTableHeaderCell}>Piping</th>
                                                <th className={styles.reportTableHeaderCell}>Equipment</th>
                                            </tr>
                                        </thead>
                                        <tbody className={styles.reportTableBody}>
                                            {assetData.years.map((year, index) => (
                                                <tr key={index} className={styles.reportTableRow}>
                                                    <td className={styles.reportTableCell}>{year}</td>
                                                    <td className={styles.reportTableCell}>{assetData.pipingValues[index] || '-'}</td>
                                                    <td className={styles.reportTableCell}>{assetData.equipmentValues[index] || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Chart 2: Graphic Inspection Plan (Cost) */}
                            <div className={styles.reportChartSection}>
                                <div className={styles.reportChartWrapper}>
                                    <Bar
                                        ref={(ref) => {
                                            if (ref) {
                                                chartRefs.current['cost'] = ref;
                                            }
                                        }}
                                        options={getDefaultChartOptions('Graphic Inspection Plan (Cost)')}
                                        data={getCostChartData()}
                                    />
                                </div>
                                <div className="mt-4 overflow-x-auto">
                                    <table className={styles.reportTable}>
                                        <thead className={styles.reportTableHeader}>
                                            <tr>
                                                <th className={styles.reportTableHeaderCell}>Year</th>
                                                <th className={styles.reportTableHeaderCell}>Piping</th>
                                                <th className={styles.reportTableHeaderCell}>Equipment</th>
                                            </tr>
                                        </thead>
                                        <tbody className={styles.reportTableBody}>
                                            {costData.years.map((year, index) => (
                                                <tr key={index} className={styles.reportTableRow}>
                                                    <td className={styles.reportTableCell}>{year}</td>
                                                    <td className={styles.reportTableCell}>{costData.pipingValues[index] || '-'}</td>
                                                    <td className={styles.reportTableCell}>{costData.equipmentValues[index] || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Chart 3: Graphic Inspection Plan (Cost Distribution) */}
                            <div className={styles.reportChartSection}>
                                <div className={styles.reportChartWrapper}>
                                    <Bar
                                        ref={(ref) => {
                                            if (ref) {
                                                chartRefs.current['costDist'] = ref;
                                            }
                                        }}
                                        options={getDefaultChartOptions('Graphic Inspection Plan (Cost Distribution)')}
                                        data={getCostDistChartData()}
                                    />
                                </div>
                                <div className="mt-4 overflow-x-auto">
                                    <table className={styles.reportTable}>
                                        <thead className={styles.reportTableHeader}>
                                            <tr>
                                                <th className={styles.reportTableHeaderCell}>Year</th>
                                                <th className={styles.reportTableHeaderCell}>Piping</th>
                                                <th className={styles.reportTableHeaderCell}>Equipment</th>
                                                <th className={styles.reportTableHeaderCell}>Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className={styles.reportTableBody}>
                                            {costDistData.years.map((year, index) => (
                                                <tr key={index} className={styles.reportTableRow}>
                                                    <td className={styles.reportTableCell}>{year}</td>
                                                    <td className={styles.reportTableCell}>{costDistData.pipingValues[index] || '-'}</td>
                                                    <td className={styles.reportTableCell}>{costDistData.equipmentValues[index] || '-'}</td>
                                                    <td className={styles.reportTableCell}>
                                                        {(costDistData.pipingValues[index] + costDistData.equipmentValues[index]) || '-'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
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

export default ReportCountInspAllGraphic;
