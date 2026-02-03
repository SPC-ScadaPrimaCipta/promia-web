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

interface ReportDegMechAllProps {
    isOpen: boolean;
    onClose: () => void;
    data: any[];
    loading: boolean;
    reportTitle?: string;
}

const ReportDegMechAll: React.FC<ReportDegMechAllProps> = ({ isOpen, onClose, data, loading, reportTitle }) => {
    const { data: session } = useSession();
    const chartRef = useRef<any>(null);

    if (!isOpen) return null;

    const getUserName = () => {
        return session?.user?.name || session?.user?.email || 'System User';
    };

    // Aggregate all data across units - separate piping and equipment by DEG_MECH
    const aggregateData = () => {
        const degMechMap = new Map<string, { piping: number; equipment: number }>();

        console.log('=== RAW DATA FROM API ===');
        console.log('Total rows:', data.length);
        console.log('First row sample:', data[0]);

        data.forEach((row, index) => {
            const degMech = row.DEG_MECH || '';

            // Get the count value and check which category it belongs to
            const countDegMech = Number(row.COUNT_DEG_MECH ?? 0) || 0;
            const pipingFlag = Number(row.piping ?? row.PIPING ?? 0);
            const equipmentFlag = Number(row.equipment ?? row.EQUIPMENT ?? 0);

            // Use COUNT_DEG_MECH value based on the flag
            const pipingValue = pipingFlag === 1 ? countDegMech : 0;
            const equipmentValue = equipmentFlag === 1 ? countDegMech : 0;

            console.log(`Row ${index}: DEG_MECH=${degMech}, COUNT=${countDegMech}, pipingFlag=${pipingFlag}, equipFlag=${equipmentFlag}, piping=${pipingValue}, equipment=${equipmentValue}`);

            // Aggregate by DEG_MECH
            if (degMechMap.has(degMech)) {
                const existing = degMechMap.get(degMech)!;
                existing.piping += pipingValue;
                existing.equipment += equipmentValue;
            } else {
                degMechMap.set(degMech, { piping: pipingValue, equipment: equipmentValue });
            }
        });

        // Convert to arrays
        const degMechs: string[] = [];
        const pipingValues: number[] = [];
        const equipmentValues: number[] = [];

        degMechMap.forEach((values, degMech) => {
            degMechs.push(degMech);
            pipingValues.push(values.piping);
            equipmentValues.push(values.equipment);
        });

        console.log('=== AGGREGATED DATA ===');
        console.log('DEG_MECHs:', degMechs);
        console.log('Piping Values:', pipingValues);
        console.log('Equipment Values:', equipmentValues);

        return { degMechs, pipingValues, equipmentValues };
    };

    const { degMechs, pipingValues, equipmentValues } = aggregateData();

    // Get chart data using centralized configuration
    const getChartData = () => {
        const hasPiping = pipingValues.some(v => v > 0);
        const hasEquipment = equipmentValues.some(v => v > 0);

        console.log('=== CHART DATA ===');
        console.log('Has Piping:', hasPiping);
        console.log('Has Equipment:', hasEquipment);
        console.log('X-axis labels (DEG_MECH):', degMechs);
        console.log('Piping values:', pipingValues);
        console.log('Equipment values:', equipmentValues);

        const datasets = [];

        if (hasPiping) {
            console.log('Adding Piping dataset');
            datasets.push(createBarDataset('Piping', pipingValues, 'piping'));
        }

        if (hasEquipment) {
            console.log('Adding Equipment dataset');
            datasets.push(createBarDataset('Equipment', equipmentValues, 'equipment'));
        }

        console.log('Final datasets:', datasets);

        return {
            labels: degMechs,
            datasets
        };
    };

    // Handle Excel export with embedded chart image using ExcelJS
    const handleExportToExcel = async () => {
        const now = new Date();
        const dateTimeStr = now.toISOString().replace('T', ' ').substring(0, 19);
        const userName = getUserName();
        const title = reportTitle || 'Degradation Mechanism Summary Report';

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Deg Mech Summary');

        // Define border style
        const borderStyle = {
            top: { style: 'thin' as const },
            left: { style: 'thin' as const },
            bottom: { style: 'thin' as const },
            right: { style: 'thin' as const }
        };

        // 3 columns: DEG_MECH, Piping, Equipment
        const lastColumn = 'C';
        const hasPiping = pipingValues.some(v => v > 0);
        const hasEquipment = equipmentValues.some(v => v > 0);

        // Row 1: Main Title
        worksheet.mergeCells(`A1:${lastColumn}1`);
        const mainTitleCell = worksheet.getCell('A1');
        mainTitleCell.value = title;
        mainTitleCell.font = { bold: true, size: 16 };
        mainTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };

        let currentRow = 3;

        // Headers
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

        // Data rows
        degMechs.forEach((degMech, index) => {
            const rowData: any[] = [
                degMech,
                hasPiping ? (pipingValues[index] || 0) : '',
                hasEquipment ? (equipmentValues[index] || 0) : ''
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
            if (chartRef.current) {
                const canvas = chartRef.current.canvas;
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

                    // Move current row down to account for image height
                    currentRow += 25;
                }
            }
        } catch (error) {
            console.error('Error adding chart image:', error);
        }

        // Add spacing
        currentRow += 2;

        // Footer
        worksheet.mergeCells(`A${currentRow}:${lastColumn}${currentRow}`);
        const footerCell = worksheet.getCell(`A${currentRow}`);
        footerCell.value = `Report generated by ${userName} on ${dateTimeStr}`;
        footerCell.font = { italic: true, color: { argb: 'FF666666' } };
        footerCell.alignment = { horizontal: 'left', vertical: 'middle' };

        // Set column widths
        worksheet.getColumn(1).width = 30; // DEG_MECH
        worksheet.getColumn(2).width = 15; // Piping
        worksheet.getColumn(3).width = 15; // Equipment

        // Generate and download file
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `deg_mech_summary_report_${new Date().toISOString().slice(0, 10)}.xlsx`;
        link.click();
        window.URL.revokeObjectURL(url);
    };

    return (
        <div className={styles.reportModal} onClick={onClose}>
            <div className={styles.reportModalContent} onClick={(e) => e.stopPropagation()}>
                {/* Modal Header */}
                <div className={styles.reportModalHeader}>
                    <h3 className={styles.reportModalTitle}>
                        {reportTitle || 'Degradation Mechanism Summary Report'}
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
                            <div className={styles.reportChartSection}>
                                <div className={styles.reportChartWrapper}>
                                    <Bar
                                        ref={chartRef}
                                        options={getDefaultChartOptions('Degradation Mechanisms Summary (All Units)')}
                                        data={getChartData()}
                                    />
                                </div>
                                <div className="mt-4 overflow-x-auto">
                                    <table className={styles.reportTable}>
                                        <thead className={styles.reportTableHeader}>
                                            <tr>
                                                <th className={styles.reportTableHeaderCell}>DEG_MECH</th>
                                                <th className={styles.reportTableHeaderCell}>Piping</th>
                                                <th className={styles.reportTableHeaderCell}>Equipment</th>
                                            </tr>
                                        </thead>
                                        <tbody className={styles.reportTableBody}>
                                            {degMechs.map((degMech, index) => (
                                                <tr key={index} className={styles.reportTableRow}>
                                                    <td className={styles.reportTableCell}>{degMech}</td>
                                                    <td className={styles.reportTableCell}>{pipingValues[index] || '-'}</td>
                                                    <td className={styles.reportTableCell}>{equipmentValues[index] || '-'}</td>
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

export default ReportDegMechAll;
