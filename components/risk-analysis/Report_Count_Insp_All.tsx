'use client';

import React from 'react';
import * as XLSX from 'xlsx';
import { useSession } from 'next-auth/react';
import styles from './report-styles.module.css';

interface ReportCountInspAllProps {
    isOpen: boolean;
    onClose: () => void;
    data: any[];
    loading: boolean;
    reportTitle?: string;
}

interface UnitData {
    unitName: string;
    years: string[];
    pipingValues: { [year: string]: number };
    equipmentValues: { [year: string]: number };
}

const ReportCountInspAll: React.FC<ReportCountInspAllProps> = ({ isOpen, onClose, data, loading, reportTitle }) => {
    const { data: session } = useSession();

    if (!isOpen) return null;

    const getUserName = () => {
        return session?.user?.name || session?.user?.email || 'System User';
    };

    // Group data by Unit Name and get distinct years
    const processData = (): { unitDataList: UnitData[], years: string[] } => {
        const yearsSet = new Set<string>();
        const unitMap = new Map<string, { piping: { [year: string]: number }, equipment: { [year: string]: number } }>();

        console.log('=== RAW DATA FROM API ===');
        console.log('Total rows:', data.length);
        console.log('First row sample:', data[0]);

        data.forEach((row, index) => {
            const unitName = row.unit_name || 'Unknown';
            const year = String(row.insp_year || '');

            // Get the count value and check which category it belongs to
            const countAsset = Number(row.countAsset ?? 0) || 0;
            const pipingFlag = Number(row.piping ?? 0);
            const equipmentFlag = Number(row.equipment ?? 0);

            // Use countAsset value based on the flag
            const pipingValue = pipingFlag === 1 ? countAsset : 0;
            const equipmentValue = equipmentFlag === 1 ? countAsset : 0;

            console.log(`Row ${index}: UNIT=${unitName}, YEAR=${year}, countAsset=${countAsset}, pipingFlag=${pipingFlag}, equipFlag=${equipmentFlag}, piping=${pipingValue}, equipment=${equipmentValue}`);

            if (year) {
                yearsSet.add(year);
            }

            // Get or create unit map
            if (!unitMap.has(unitName)) {
                unitMap.set(unitName, { piping: {}, equipment: {} });
            }
            const unitEntry = unitMap.get(unitName)!;

            // Aggregate values for the same year
            if (year) {
                unitEntry.piping[year] = (unitEntry.piping[year] || 0) + pipingValue;
                unitEntry.equipment[year] = (unitEntry.equipment[year] || 0) + equipmentValue;
            }
        });

        // Convert years to sorted array
        const years = Array.from(yearsSet).sort();

        // Convert to UnitData array format
        const unitDataList: UnitData[] = [];
        unitMap.forEach((entry, unitName) => {
            unitDataList.push({
                unitName,
                years,
                pipingValues: entry.piping,
                equipmentValues: entry.equipment
            });
        });

        console.log('=== PROCESSED DATA ===');
        console.log('Years:', years);
        console.log('Units:', unitDataList);

        return { unitDataList, years };
    };

    const { unitDataList, years } = processData();

    // Handle Excel export
    const handleExportToExcel = () => {
        const now = new Date();
        const dateTimeStr = now.toISOString().replace('T', ' ').substring(0, 19);
        const userName = getUserName();
        const title = reportTitle || 'Count Inspection All Report';

        const ws = XLSX.utils.aoa_to_sheet([]);

        // Row 1: Title
        XLSX.utils.sheet_add_aoa(ws, [[title]], { origin: 'A1' });

        // Row 3: Headers
        const headers = ['No.', 'UNIT NAME', 'ASSET', ...years];
        XLSX.utils.sheet_add_aoa(ws, [headers], { origin: 'A3' });

        // Define border style
        const borderStyle = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        };

        let currentRow = 4;

        // Track merge ranges for UNIT NAME and No.
        const mergeRanges: { s: { r: number; c: number }, e: { r: number; c: number } }[] = [];

        // Add data for each unit
        unitDataList.forEach((unitData, unitIndex) => {
            const unitStartRow = currentRow;
            const unitNumber = unitIndex + 1;

            // Piping row
            const pipingRow: any[] = [
                unitNumber,
                unitData.unitName,
                'Piping',
                ...years.map(year => unitData.pipingValues[year] || '')
            ];
            XLSX.utils.sheet_add_aoa(ws, [pipingRow], { origin: `A${currentRow}` });
            currentRow++;

            // Equipment row
            const equipmentRow: any[] = [
                '', // Empty No. for second row (will be merged)
                '', // Empty UNIT NAME for second row (will be merged)
                'Equipment',
                ...years.map(year => unitData.equipmentValues[year] || '')
            ];
            XLSX.utils.sheet_add_aoa(ws, [equipmentRow], { origin: `A${currentRow}` });
            currentRow++;

            // Add merge range for No. column (column A, rows unitStartRow to currentRow-1)
            mergeRanges.push({
                s: { r: unitStartRow - 1, c: 0 }, // -1 because Excel uses 0-based indexing
                e: { r: currentRow - 2, c: 0 }
            });

            // Add merge range for UNIT NAME (column B, rows unitStartRow to currentRow-1)
            mergeRanges.push({
                s: { r: unitStartRow - 1, c: 1 },
                e: { r: currentRow - 2, c: 1 }
            });
        });

        // Add TOTAL row
        const totalRow: any[] = [
            '',
            '',
            'TOTAL',
            ...years.map(year => {
                const total = unitDataList.reduce((sum, unitData) => {
                    return sum + (unitData.pipingValues[year] || 0) + (unitData.equipmentValues[year] || 0);
                }, 0);
                return total || '';
            })
        ];
        XLSX.utils.sheet_add_aoa(ws, [totalRow], { origin: `A${currentRow}` });
        const totalRowIndex = currentRow;
        currentRow++;

        // Footer
        const footerStartRow = currentRow + 1;
        const footerText = `Report generated by ${userName} on ${dateTimeStr}`;
        XLSX.utils.sheet_add_aoa(ws, [[footerText]], { origin: `A${footerStartRow}` });

        // Apply cell styles
        const numColumns = 3 + years.length; // No, Unit, Asset, Years

        // Style title cell
        const titleCell = ws['A1'];
        if (titleCell) {
            titleCell.s = {
                font: { bold: true, sz: 16, color: { rgb: '000000' } },
                alignment: { horizontal: 'center', vertical: 'center' }
            };
        }

        // Merge title across all columns
        ws['!merges'] = ws['!merges'] || [];
        ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: numColumns - 1 } });

        // Add UNIT NAME merge ranges
        mergeRanges.forEach(range => {
            ws['!merges'].push(range);
        });

        // Style the header row (Row 3)
        for (let col = 0; col < numColumns; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: 2, c: col });
            if (!ws[cellAddress]) continue;
            ws[cellAddress].s = {
                font: { bold: true, color: { rgb: '000000' } },
                fill: { fgColor: { rgb: 'D3D3D3' } },
                alignment: { horizontal: 'center', vertical: 'center' },
                border: borderStyle
            };
        }

        // Apply styles to all data cells
        const dataRowCount = unitDataList.length * 2;
        for (let row = 0; row < dataRowCount; row++) {
            for (let col = 0; col < numColumns; col++) {
                const cellAddress = XLSX.utils.encode_cell({ r: row + 3, c: col });
                if (!ws[cellAddress]) continue;

                ws[cellAddress].s = {
                    alignment: { horizontal: 'center', vertical: 'center' },
                    border: borderStyle
                };
            }
        }

        // Style the TOTAL row - bold with borders
        const totalRowIdx = totalRowIndex - 1; // Convert to 0-based index
        for (let col = 0; col < numColumns; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: totalRowIdx, c: col });
            if (!ws[cellAddress]) continue;
            ws[cellAddress].s = {
                font: { bold: true, color: { rgb: '000000' } },
                alignment: { horizontal: 'center', vertical: 'center' },
                border: borderStyle
            };
        }

        // Style the footer
        const footerCell = ws[`A${footerStartRow}`];
        if (footerCell) {
            footerCell.s = {
                font: { italic: true, color: { rgb: '666666' } },
                alignment: { horizontal: 'left', vertical: 'center' }
            };
        }

        // Merge footer across all columns
        ws['!merges'].push({ s: { r: footerStartRow - 1, c: 0 }, e: { r: footerStartRow - 1, c: numColumns - 1 } });

        // Set column widths
        const colWidths = [
            { wch: 8 },  // No.
            { wch: 25 }, // UNIT NAME
            { wch: 15 }, // ASSET
            ...years.map(() => ({ wch: 12 })) // Year columns
        ];
        ws['!cols'] = colWidths;

        // Create workbook and add worksheet
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Count Inspection All');

        // Generate and download file
        XLSX.writeFile(wb, `count_insp_all_${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    return (
        <div className={styles.reportModal} onClick={onClose}>
            <div className={styles.reportModalContent} onClick={(e) => e.stopPropagation()}>
                {/* Modal Header */}
                <div className={styles.reportModalHeader}>
                    <h3 className={styles.reportModalTitle}>
                        {reportTitle || 'Count Inspection All Report'}
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
                        <div className={styles.reportTableContainer}>
                            <table className={styles.reportTable}>
                                <thead className={styles.reportTableHeader}>
                                    <tr>
                                        <th className={styles.reportTableHeaderCell}>No.</th>
                                        <th className={styles.reportTableHeaderCell}>UNIT NAME</th>
                                        <th className={styles.reportTableHeaderCell}>ASSET</th>
                                        {years.map((year) => (
                                            <th key={year} className={styles.reportTableHeaderCell}>
                                                {year}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className={styles.reportTableBody}>
                                    {unitDataList.map((unitData, unitIndex) => (
                                        <React.Fragment key={unitIndex}>
                                            {/* Piping row */}
                                            <tr className={styles.reportTableRow}>
                                                <td rowSpan={2} className={styles.reportTableCellWithBorder}>
                                                    {unitIndex + 1}
                                                </td>
                                                <td rowSpan={2} className={styles.reportTableCellWithBorder}>
                                                    {unitData.unitName}
                                                </td>
                                                <td className={styles.reportTableCell}>
                                                    Piping
                                                </td>
                                                {years.map((year) => (
                                                    <td key={year} className={styles.reportTableCell}>
                                                        {unitData.pipingValues[year] || '-'}
                                                    </td>
                                                ))}
                                            </tr>
                                            {/* Equipment row */}
                                            <tr className={styles.reportTableRow}>
                                                <td className={styles.reportTableCell}>
                                                    Equipment
                                                </td>
                                                {years.map((year) => (
                                                    <td key={year} className={styles.reportTableCell}>
                                                        {unitData.equipmentValues[year] || '-'}
                                                    </td>
                                                ))}
                                            </tr>
                                        </React.Fragment>
                                    ))}
                                    {/* TOTAL row */}
                                    <tr className={styles.reportTableTotalRow}>
                                        <td className={styles.reportTableCell}></td>
                                        <td className={styles.reportTableCell}></td>
                                        <td className={styles.reportTableCell}>TOTAL</td>
                                        {years.map((year) => {
                                            const total = unitDataList.reduce((sum, unitData) => {
                                                return sum + (unitData.pipingValues[year] || 0) + (unitData.equipmentValues[year] || 0);
                                            }, 0);
                                            return (
                                                <td key={year} className={styles.reportTableCell}>
                                                    {total || '-'}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                </tbody>
                            </table>
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

export default ReportCountInspAll;
