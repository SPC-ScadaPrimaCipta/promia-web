'use client';

import React, { useEffect, useRef } from 'react';
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

interface ReportDiagramDegMechProps {
    isOpen: boolean;
    onClose: () => void;
    data: any[];
    loading: boolean;
    reportTitle?: string;
}

interface UnitData {
    unitName: string;
    degMechs: string[];
    pipingValues: number[];
    equipmentValues: number[];
}

const ReportDiagramDegMech: React.FC<ReportDiagramDegMechProps> = ({ isOpen, onClose, data, loading, reportTitle }) => {
    const { data: session } = useSession();
    const chartRefs = useRef<{ [key: string]: any }>({});

    if (!isOpen) return null;

    const getUserName = () => {
        return session?.user?.name || session?.user?.email || 'System User';
    };

    // Group data by Unit Name and aggregate by DEG_MECH
    const groupDataByUnit = (): UnitData[] => {
        const unitMap = new Map<string, Map<string, { piping: number; equipment: number }>>();

        console.log('=== RAW DATA FROM API ===');
        console.log('Total rows:', data.length);
        console.log('First row sample:', data[0]);

        data.forEach((row, index) => {
            const unitName = row.UNIT_NAME || 'Unknown';
            const degMech = row.DEG_MECH || '';

            // Get the count value and check which category it belongs to
            const countDegMech = Number(row.COUNT_DEG_MECH ?? 0) || 0;
            const pipingFlag = Number(row.piping ?? row.PIPING ?? 0);
            const equipmentFlag = Number(row.equipment ?? row.EQUIPMENT ?? 0);

            // Use COUNT_DEG_MECH value based on the flag
            const pipingValue = pipingFlag === 1 ? countDegMech : 0;
            const equipmentValue = equipmentFlag === 1 ? countDegMech : 0;

            console.log(`Row ${index}: UNIT=${unitName}, DEG_MECH=${degMech}, COUNT=${countDegMech}, pipingFlag=${pipingFlag}, equipFlag=${equipmentFlag}, piping=${pipingValue}, equipment=${equipmentValue}`);

            // Get or create unit map
            if (!unitMap.has(unitName)) {
                unitMap.set(unitName, new Map());
            }
            const degMechMap = unitMap.get(unitName)!;

            // Aggregate values for the same DEG_MECH
            if (degMechMap.has(degMech)) {
                const existing = degMechMap.get(degMech)!;
                existing.piping += pipingValue;
                existing.equipment += equipmentValue;
            } else {
                degMechMap.set(degMech, { piping: pipingValue, equipment: equipmentValue });
            }
        });

        // Convert to UnitData array format
        const result: UnitData[] = [];
        unitMap.forEach((degMechMap, unitName) => {
            const degMechs: string[] = [];
            const pipingValues: number[] = [];
            const equipmentValues: number[] = [];

            degMechMap.forEach((values, degMech) => {
                degMechs.push(degMech);
                pipingValues.push(values.piping);
                equipmentValues.push(values.equipment);
            });

            result.push({
                unitName,
                degMechs,
                pipingValues,
                equipmentValues
            });
        });

        console.log('=== GROUPED DATA (AGGREGATED) ===');
        result.forEach(unit => {
            console.log(`\nUnit: ${unit.unitName}`);
            console.log('DEG_MECHs:', unit.degMechs);
            console.log('Piping Values:', unit.pipingValues);
            console.log('Equipment Values:', unit.equipmentValues);
        });

        return result;
    };

    const unitDataList = groupDataByUnit();

    // Get chart data using centralized configuration
    const getChartData = (unitData: UnitData) => {
        const hasPiping = unitData.pipingValues.some(v => v > 0);
        const hasEquipment = unitData.equipmentValues.some(v => v > 0);

        console.log(`=== CHART DATA FOR UNIT: ${unitData.unitName} ===`);
        console.log('Has Piping:', hasPiping);
        console.log('Has Equipment:', hasEquipment);

        const datasets = [];

        if (hasPiping) {
            console.log('Adding Piping dataset with values:', unitData.pipingValues);
            datasets.push(createBarDataset('Piping', unitData.pipingValues, 'piping'));
        }

        if (hasEquipment) {
            console.log('Adding Equipment dataset with values:', unitData.equipmentValues);
            datasets.push(createBarDataset('Equipment', unitData.equipmentValues, 'equipment'));
        }

        console.log('X-axis labels (DEG_MECH):', unitData.degMechs);
        console.log('Final datasets:', datasets);

        return {
            labels: unitData.degMechs,
            datasets
        };
    };

    // Handle Excel export with embedded chart images using ExcelJS
    const handleExportToExcel = async () => {
        const now = new Date();
        const dateTimeStr = now.toISOString().replace('T', ' ').substring(0, 19);
        const userName = getUserName();
        const title = reportTitle || 'Degradation Mechanism Report';

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Degradation Mechanism');

        // Define border style
        const borderStyle = {
            top: { style: 'thin' as const },
            left: { style: 'thin' as const },
            bottom: { style: 'thin' as const },
            right: { style: 'thin' as const }
        };

        // Always use 3 columns: DEG_MECH, Piping, Equipment
        const lastColumn = 'C';

        // Row 1: Main Title
        worksheet.mergeCells(`A1:${lastColumn}1`);
        const mainTitleCell = worksheet.getCell('A1');
        mainTitleCell.value = title;
        mainTitleCell.font = { bold: true, size: 16 };
        mainTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };

        let currentRow = 3; // Start from row 3

        for (let i = 0; i < unitDataList.length; i++) {
            const unitData = unitDataList[i];
            const hasPiping = unitData.pipingValues.some(v => v > 0);
            const hasEquipment = unitData.equipmentValues.some(v => v > 0);

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

            // Headers - always 3 columns
            const headers = ['DEG_MECH', 'Piping', 'Equipment'];

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

            // Data rows - always 3 columns, use blank for missing data
            unitData.degMechs.forEach((degMech, index) => {
                const rowData: any[] = [
                    degMech,
                    hasPiping ? (unitData.pipingValues[index] || 0) : '',
                    hasEquipment ? (unitData.equipmentValues[index] || 0) : ''
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

                        // Position chart image
                        worksheet.addImage(imageId, {
                            tl: { col: 0, row: currentRow },
                            ext: { width: 600, height: 400 }
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

        // Set column widths for all 3 columns
        worksheet.getColumn(1).width = 30; // DEG_MECH
        worksheet.getColumn(2).width = 15; // Piping
        worksheet.getColumn(3).width = 15; // Equipment

        // Generate and download file
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `deg_mech_report_${new Date().toISOString().slice(0, 10)}.xlsx`;
        link.click();
        window.URL.revokeObjectURL(url);
    };

    return (
        <div className={styles.reportModal} onClick={onClose}>
            <div className={styles.reportModalContent} onClick={(e) => e.stopPropagation()}>
                {/* Modal Header */}
                <div className={styles.reportModalHeader}>
                    <h3 className={styles.reportModalTitle}>
                        {reportTitle || 'Degradation Mechanism Report'}
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
                                        <Bar
                                            ref={(ref) => {
                                                if (ref) {
                                                    chartRefs.current[unitData.unitName] = ref;
                                                }
                                            }}
                                            options={getDefaultChartOptions(unitData.unitName)}
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

export default ReportDiagramDegMech;
