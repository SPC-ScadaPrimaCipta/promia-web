'use client';

import React, { useState, useEffect } from 'react';
import ReportInspectionWorkpack from './Report_Inspection_Workpack';

interface AssetData {
    parent_id: number | null;
    parent_name: string;
    asset_id: number;
    asset_name: string;
    ct_id: number;
    pos: number;
    hierarchy_id: string;
    ci_id: number;
    description: string;
    Risk_ID?: number | null;
    Risk_Level?: string | null;
    icon?: string | null;
}

interface InspectionViewProps {
    selectedModelId?: string | null;
    selectedModelName?: string | null;
    selectedAsset?: AssetData | null;
}

interface RiskMatrixCardProps {
    title: string;
    riskMatrix: any[];
    xValue: number;
    yValue: number;
    cofValue: number;
    pofValue: number;
}

const RiskMatrixCard: React.FC<RiskMatrixCardProps> = ({ title, riskMatrix, xValue, yValue, cofValue, pofValue }) => {
    // Get the maximum row and column values to determine matrix size
    const maxRow = Math.max(...riskMatrix.map(cell => cell.row));
    const maxCol = Math.max(...riskMatrix.map(cell => cell.col));

    // Get cell color by row and column
    const getCellColor = (row: number, col: number) => {
        const cell = riskMatrix.find(c => c.row === row && c.col === col);
        if (cell && cell.color) {
            return cell.color.startsWith('#') ? cell.color : `#${cell.color}`;
        }
        return '#CCCCCC';
    };

    // Check if cell is the current position
    const isCurrentPosition = (row: number, col: number) => {
        return row === yValue && col === xValue;
    };

    return (
        <div className="rounded-lg border border-gray-300 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <h5 className="mb-3 text-center text-lg font-semibold text-gray-900 dark:text-white">{title}</h5>

            {/* Risk Matrix Grid */}
            <div className="mb-4 flex justify-center">
                <div className="w-full max-w-xs">
                    <div className="flex">
                        {/* Row numbers on the left */}
                        <div className="flex flex-col justify-between pr-1">
                            {Array.from({ length: maxRow }, (_, rowIndex) => {
                                const row = maxRow - rowIndex;
                                return (
                                    <div
                                        key={row}
                                        className="flex items-center justify-center text-xs font-medium text-gray-700 dark:text-gray-300"
                                        style={{ height: `calc((100% - ${maxRow - 1}px) / ${maxRow})` }}
                                    >
                                        {row}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Matrix grid and column letters */}
                        <div className="flex-1">
                            <table className="w-full border-collapse" style={{ aspectRatio: '1 / 1' }}>
                                <tbody>
                                    {Array.from({ length: maxRow }, (_, rowIndex) => {
                                        const row = maxRow - rowIndex; // Reverse order for display
                                        return (
                                            <tr key={row} style={{ height: `${100 / maxRow}%` }}>
                                                {Array.from({ length: maxCol }, (_, colIndex) => {
                                                    const col = colIndex + 1;
                                                    const isCurrent = isCurrentPosition(row, col);
                                                    return (
                                                        <td
                                                            key={col}
                                                            className="relative border border-gray-400 dark:border-gray-600"
                                                            style={{
                                                                backgroundColor: getCellColor(row, col),
                                                                width: `${100 / maxCol}%`,
                                                            }}
                                                        >
                                                            {isCurrent && (
                                                                <div className="absolute inset-0 flex items-center justify-center">
                                                                    {/* Simple X marker */}
                                                                    <svg className="h-3/4 w-3/4" viewBox="0 0 100 100">
                                                                        {/* First diagonal line (top-left to bottom-right) */}
                                                                        <line
                                                                            x1="20" y1="20"
                                                                            x2="80" y2="80"
                                                                            stroke="black"
                                                                            strokeWidth="8"
                                                                            strokeLinecap="round"
                                                                        />
                                                                        {/* Second diagonal line (top-right to bottom-left) */}
                                                                        <line
                                                                            x1="80" y1="20"
                                                                            x2="20" y2="80"
                                                                            stroke="black"
                                                                            strokeWidth="8"
                                                                            strokeLinecap="round"
                                                                        />
                                                                    </svg>
                                                                </div>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            {/* Column letters at the bottom */}
                            <div className="flex justify-between pt-1">
                                {Array.from({ length: maxCol }, (_, colIndex) => {
                                    const letter = String.fromCharCode(65 + colIndex); // 65 is 'A'
                                    return (
                                        <div
                                            key={colIndex}
                                            className="flex items-center justify-center text-xs font-medium text-gray-700 dark:text-gray-300"
                                            style={{ width: `calc((100% - ${maxCol - 1}px) / ${maxCol})` }}
                                        >
                                            {letter}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* CoF and PoF Values */}
            <div className="flex items-center justify-center gap-4 rounded bg-gray-50 p-2 dark:bg-gray-700">
                <div className="flex items-center gap-1">
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">CoF:</span>
                    <span className="text-xs font-semibold text-gray-900 dark:text-white">
                        {cofValue != null ? cofValue.toFixed(2) : 'N/A'}
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">PoF:</span>
                    <span className="text-xs font-semibold text-gray-900 dark:text-white">
                        {pofValue != null ? pofValue.toFixed(2) : 'N/A'}
                    </span>
                </div>
            </div>
        </div>
    );
};

const InspectionView = ({ selectedModelId, selectedModelName, selectedAsset }: InspectionViewProps) => {
    // Collapsible panel states
    const [equipmentDescOpen, setEquipmentDescOpen] = useState(true);
    const [historicalDataOpen, setHistoricalDataOpen] = useState(true);
    const [suggestedPlanOpen, setSuggestedPlanOpen] = useState(true);
    const [riskMatrixOpen, setRiskMatrixOpen] = useState(true);
    const [inspectionPlanOpen, setInspectionPlanOpen] = useState(true);

    // API data state
    const [apiData, setApiData] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    // Inspection year dropdown
    const currentYear = new Date().getFullYear();
    const baseYear = apiData?.data?.year_of_analysis?.[0]?.year_of_analysis ?? currentYear;
    const yearOptions = Array.from({ length: 16 }, (_, i) => baseYear + i); // base year to +15
    const [selectedYear, setSelectedYear] = useState(baseYear);

    // Workpack modal state
    const [showWorkpackModal, setShowWorkpackModal] = useState(false);
    const [workpackData, setWorkpackData] = useState<any[]>([]);
    const [riskMatrixData, setRiskMatrixData] = useState<any[]>([]);
    const [loadingWorkpack, setLoadingWorkpack] = useState(false);

    // Inspection Technique modal state
    const [showInspectionTechniqueModal, setShowInspectionTechniqueModal] = useState(false);
    const [selectedInspectionRow, setSelectedInspectionRow] = useState<any>(null);
    const [inspectionTechniqueData, setInspectionTechniqueData] = useState<any[]>([]);
    const [loadingInspectionTechnique, setLoadingInspectionTechnique] = useState(false);
    const [selectedTechniqueIndex, setSelectedTechniqueIndex] = useState<number | null>(null);

    // Inspection Plan year selections (one per row)
    const [inspectionYears, setInspectionYears] = useState<{ [key: number]: number }>({});

    // Sync selectedYear when baseYear changes (e.g., after API fetch)
    useEffect(() => {
        setSelectedYear(baseYear);
    }, [baseYear]);

    // Initialize inspection years from API data
    useEffect(() => {
        if (apiData?.data?.rbi_inspection_plan) {
            const initialYears: { [key: number]: number } = {};
            apiData.data.rbi_inspection_plan.forEach((item: any, idx: number) => {
                const inspYear = item.insp_year ? parseInt(item.insp_year) : baseYear;
                initialYears[idx] = inspYear;
            });
            setInspectionYears(initialYears);
        }
    }, [apiData, baseYear]);

    // Fetch inspection plan data when asset or model changes
    useEffect(() => {
        if (!selectedAsset || !selectedModelId) {
            setApiData(null);
            return;
        }
        const fetchData = async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams({
                    asset_id: selectedAsset.asset_id.toString(),
                    rbim_id: selectedModelId,
                });
                const res = await fetch(`/api/inspection-plan/inspection-plan-view?${params}`);
                if (!res.ok) throw new Error(`API error: ${res.status}`);
                const data = await res.json();
                setApiData(data);
            } catch (error) {
                console.error('Failed to fetch inspection plan:', error);
                setApiData(null);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [selectedAsset, selectedModelId]);

    // Fetch inspection technique data when modal opens
    useEffect(() => {
        if (!showInspectionTechniqueModal || !selectedInspectionRow) {
            setInspectionTechniqueData([]);
            setSelectedTechniqueIndex(null);
            return;
        }

        const fetchInspectionTechnique = async () => {
            setLoadingInspectionTechnique(true);
            setSelectedTechniqueIndex(null); // Reset selection when fetching new data
            try {
                const degMech = selectedInspectionRow.DEG_MECH_ID;
                const equipId = apiData?.data?.civ_heading?.[0]?.category;

                if (!degMech || !equipId) {
                    console.error('Missing DEG_MECH_ID or category');
                    setInspectionTechniqueData([]);
                    return;
                }

                const params = new URLSearchParams({
                    DEG_MECH: degMech,
                    EQUIP_ID: equipId.toString(),
                });

                const res = await fetch(`/api/inspection-plan/inspection-technique?${params}`);
                if (!res.ok) throw new Error(`API error: ${res.status}`);
                const result = await res.json();

                if (result.success && result.data) {
                    setInspectionTechniqueData(result.data);
                } else {
                    console.error('Failed to fetch inspection technique data:', result.error);
                    setInspectionTechniqueData([]);
                }
            } catch (error) {
                console.error('Failed to fetch inspection technique:', error);
                setInspectionTechniqueData([]);
            } finally {
                setLoadingInspectionTechnique(false);
            }
        };

        fetchInspectionTechnique();
    }, [showInspectionTechniqueModal, selectedInspectionRow, apiData]);

    // Handle Workpack button click
    const handleWorkpackClick = async () => {
        if (!selectedAsset || !selectedModelId) {
            alert('Please select a model and asset first.');
            return;
        }

        setLoadingWorkpack(true);
        setShowWorkpackModal(true);
        setWorkpackData([]);
        setRiskMatrixData([]);

        try {
            const params = new URLSearchParams({
                rbim_id: selectedModelId,
                asset_id: selectedAsset.asset_id.toString(),
                year: selectedYear.toString(),
            });
            const res = await fetch(`/api/inspection-plan/report-inspection-workpack?${params}`);
            if (!res.ok) throw new Error(`API error: ${res.status}`);
            const result = await res.json();

            if (result.success && result.data) {
                setWorkpackData(result.data);
                setRiskMatrixData(result.riskMatrix || []);
            } else {
                console.error('Failed to fetch workpack data:', result.error);
                setWorkpackData([]);
                setRiskMatrixData([]);
            }
        } catch (error) {
            console.error('Failed to fetch workpack report:', error);
            setWorkpackData([]);
            setRiskMatrixData([]);
        } finally {
            setLoadingWorkpack(false);
        }
    };

    return (
        <div className="space-y-2">
            {/* Panel 1: Button Panel / Toolbar */}
            <div className="panel border-0 shadow-none p-0">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">Inspection Plan</h3>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2">
                            <label htmlFor="inspection-year" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Inspection Year:
                            </label>
                            <select
                                id="inspection-year"
                                className="form-select rounded border border-gray-300 bg-white px-3 py-1 text-sm dark:border-gray-600 dark:bg-gray-800"
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(Number(e.target.value))}
                            >
                                {yearOptions.map((year) => (
                                    <option key={year} value={year}>
                                        {year}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <button
                            className="btn btn-outline-primary btn-sm"
                            onClick={handleWorkpackClick}
                            disabled={!selectedAsset || !selectedModelId}
                        >
                            <span className="mr-1">📦</span>
                            Workpack
                        </button>
                        <button className="btn btn-primary btn-sm">
                            <span className="mr-1">+</span>
                            Add Inspection
                        </button>
                        <button className="btn btn-outline-primary btn-sm">
                            <span className="mr-1">↓</span>
                            Export
                        </button>
                    </div>
                </div>
            </div>

            {/* Panel 2: Equipment Description */}
            <div className="panel border-0 shadow-none p-0">
                <div
                    className="mb-1 flex items-center cursor-pointer"
                    onClick={() => setEquipmentDescOpen(!equipmentDescOpen)}
                >
                    <div className="rounded-full bg-primary/10 p-1">
                        <span className="text-primary">📋</span>
                    </div>
                    <h4 className="ml-2 text-lg font-semibold">Equipment Description</h4>
                    <span className="ml-auto transition-transform duration-200">
                        {equipmentDescOpen ? '▼' : '▶'}
                    </span>
                </div>
                {equipmentDescOpen && (
                    <div className="rounded-lg border border-gray-300 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
                        {loading ? (
                            <div className="flex items-center justify-center py-2">
                                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                                <span className="ml-2 text-sm text-gray-500">Loading equipment data...</span>
                            </div>
                        ) : apiData?.data?.inspection_plan_desc?.[0] ? (
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                {Object.entries(apiData.data.inspection_plan_desc[0]).map(([key, value]) => (
                                    <div key={key} className="space-y-0">
                                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                        </div>
                                        <div className="text-base font-semibold text-gray-800 dark:text-gray-200">
                                            {value !== null && value !== undefined ? String(value) : 'N/A'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center text-gray-500 dark:text-gray-400">
                                No equipment description data available.
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Panel 3: Historical Inspection Data */}
            <div className="panel border-0 shadow-none p-0">
                <div
                    className="mb-1 flex items-center cursor-pointer"
                    onClick={() => setHistoricalDataOpen(!historicalDataOpen)}
                >
                    <div className="rounded-full bg-info/10 p-1">
                        <span className="text-info">📊</span>
                    </div>
                    <h4 className="ml-2 text-lg font-semibold">Historical Inspection Data</h4>
                    <span className="ml-auto transition-transform duration-200">
                        {historicalDataOpen ? '▼' : '▶'}
                    </span>
                </div>
                {historicalDataOpen && (
                    <div className="mt-2">
                        {loading ? (
                            <div className="flex items-center justify-center py-2">
                                <div className="h-5 w-5 animate-spin rounded-full border-2 border-info border-t-transparent"></div>
                                <span className="ml-2 text-sm text-gray-500">Loading historical data...</span>
                            </div>
                        ) : apiData?.data?.inspection_history?.length ? (
                            <div className="overflow-x-auto">
                                <table className="w-full table-auto border-collapse">
                                    <thead>
                                        <tr className="bg-gray-100 dark:bg-gray-900">
                                            <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold dark:border-gray-700">Inspection Year</th>
                                            <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold dark:border-gray-700">Inspection Method</th>
                                            <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold dark:border-gray-700">Coverage Area</th>
                                            <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold dark:border-gray-700">Inspection Point</th>
                                            <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold dark:border-gray-700">Repair/Alteration</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {apiData.data.inspection_history.map((item: any, idx: number) => (
                                            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                                <td className="border border-gray-300 px-4 py-2 text-sm dark:border-gray-700">
                                                    {item['Inspection Year'] ?? 'N/A'}
                                                </td>
                                                <td className="border border-gray-300 px-4 py-2 text-sm dark:border-gray-700">
                                                    {item['Inspection Method'] ?? 'N/A'}
                                                </td>
                                                <td className="border border-gray-300 px-4 py-2 text-sm dark:border-gray-700">
                                                    {item['Coverage Area'] ?? 'N/A'}
                                                </td>
                                                <td className="border border-gray-300 px-4 py-2 text-sm dark:border-gray-700">
                                                    {item['Inspection Point'] ?? 'N/A'}
                                                </td>
                                                <td className="border border-gray-300 px-4 py-2 text-sm dark:border-gray-700">
                                                    {item['Repair/Altteration'] ?? 'N/A'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center text-gray-500 dark:text-gray-400">
                                No historical inspection data available.
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Panel 4: Suggested Inspection Plan */}
            <div className="panel border-0 shadow-none p-0">
                <div
                    className="mb-1 flex items-center cursor-pointer"
                    onClick={() => setSuggestedPlanOpen(!suggestedPlanOpen)}
                >
                    <div className="rounded-full bg-warning/10 p-1">
                        <span className="text-warning">💡</span>
                    </div>
                    <h4 className="ml-2 text-lg font-semibold">Suggested Inspection Plan</h4>
                    <span className="ml-auto transition-transform duration-200">
                        {suggestedPlanOpen ? '▼' : '▶'}
                    </span>
                </div>
                {suggestedPlanOpen && (
                    <div className="mt-2">
                        {apiData?.data?.rbi_inspection_plan && apiData.data.rbi_inspection_plan.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full table-auto border-collapse">
                                    <thead>
                                        <tr className="bg-gray-100 dark:bg-gray-900">
                                            <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold dark:border-gray-700">Deg Mech</th>
                                            <th className="border border-gray-300 px-4 py-2 text-center text-sm font-semibold dark:border-gray-700">Inspection Number</th>
                                            <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold dark:border-gray-700">Inspection Technique</th>
                                            <th className="border border-gray-300 px-4 py-2 text-right text-sm font-semibold dark:border-gray-700">Cost</th>
                                            <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold dark:border-gray-700">Intrusive</th>
                                            <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold dark:border-gray-700">Effective</th>
                                            <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold dark:border-gray-700">Coverage</th>
                                            <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold dark:border-gray-700">Inspection Point</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {apiData.data.rbi_inspection_plan.map((item: any, idx: number) => (
                                            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                                <td className="border border-gray-300 px-4 py-2 text-sm dark:border-gray-700">
                                                    {item.DEG_MECH || '-'}
                                                </td>
                                                <td className="border border-gray-300 px-4 py-2 text-center text-sm dark:border-gray-700">
                                                    {item['Inspection Number'] ?? '-'}
                                                </td>
                                                <td className="border border-gray-300 px-4 py-2 text-sm dark:border-gray-700">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedInspectionRow(item);
                                                            setShowInspectionTechniqueModal(true);
                                                        }}
                                                        className="text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                                                    >
                                                        {item['Inspection Technique'] || '-'}
                                                    </button>
                                                </td>
                                                <td className="border border-gray-300 px-4 py-2 text-right text-sm dark:border-gray-700">
                                                    {item.Cost != null ? item.Cost.toLocaleString() : '-'}
                                                </td>
                                                <td className="border border-gray-300 px-4 py-2 text-sm dark:border-gray-700">
                                                    {item.Intrusive || '-'}
                                                </td>
                                                <td className="border border-gray-300 px-4 py-2 text-sm dark:border-gray-700">
                                                    {item.Effective || '-'}
                                                </td>
                                                <td className="border border-gray-300 px-4 py-2 text-sm dark:border-gray-700">
                                                    {item.Coverage || '-'}
                                                </td>
                                                <td className="border border-gray-300 px-4 py-2 text-sm dark:border-gray-700">
                                                    {item['Inspection Point'] || '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center text-gray-500 dark:text-gray-400">
                                No suggested inspection plan available.
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Panel 5: Risk Matrix */}
            <div className="panel border-0 shadow-none p-0">
                <div
                    className="mb-1 flex items-center cursor-pointer"
                    onClick={() => setRiskMatrixOpen(!riskMatrixOpen)}
                >
                    <div className="rounded-full bg-danger/10 p-1">
                        <span className="text-danger">⚠️</span>
                    </div>
                    <h4 className="ml-2 text-lg font-semibold">Risk Matrix</h4>
                    <span className="ml-auto transition-transform duration-200">
                        {riskMatrixOpen ? '▼' : '▶'}
                    </span>
                </div>
                {riskMatrixOpen && (
                    <div className="mt-2">
                        {apiData?.data?.risk_matrix && apiData?.data?.risk_query?.[0] ? (
                            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                                {/* Current Condition */}
                                <RiskMatrixCard
                                    title="Current Condition"
                                    riskMatrix={apiData.data.risk_matrix}
                                    xValue={apiData.data.risk_query[0].X_Value}
                                    yValue={apiData.data.risk_query[0].Y_Value}
                                    cofValue={apiData.data.risk_query[0].COF_VALUE_ACTUAL}
                                    pofValue={apiData.data.risk_query[0].POF_VALUE_ACTUAL}
                                />

                                {/* No Inspection */}
                                <RiskMatrixCard
                                    title="No Inspection"
                                    riskMatrix={apiData.data.risk_matrix}
                                    xValue={apiData.data.risk_query[0].X_Value_Without_Inspection}
                                    yValue={apiData.data.risk_query[0].Y_Value_Without_Inspection}
                                    cofValue={apiData.data.risk_query[0].COF_VALUE_WITHOUT_INSPECTION}
                                    pofValue={apiData.data.risk_query[0].POF_VALUE_WITHOUT_INSPECTION}
                                />

                                {/* With Inspection */}
                                <RiskMatrixCard
                                    title="With Inspection"
                                    riskMatrix={apiData.data.risk_matrix}
                                    xValue={apiData.data.risk_query[0].X_Value_With_Inspection}
                                    yValue={apiData.data.risk_query[0].Y_Value_With_Inspection}
                                    cofValue={apiData.data.risk_query[0].COF_VALUE_WITH_INSPECTION}
                                    pofValue={apiData.data.risk_query[0].POF_VALUE_WITH_INSPECTION}
                                />
                            </div>
                        ) : (
                            <div className="text-center text-gray-500 dark:text-gray-400">
                                No risk matrix data available.
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Panel 6: Inspection Plan */}
            <div className="panel border-0 shadow-none p-0">
                <div
                    className="mb-1 flex items-center cursor-pointer"
                    onClick={() => setInspectionPlanOpen(!inspectionPlanOpen)}
                >
                    <div className="rounded-full bg-success/10 p-1">
                        <span className="text-success">📝</span>
                    </div>
                    <h4 className="ml-2 text-lg font-semibold">Inspection Plan</h4>
                    <span className="ml-auto transition-transform duration-200">
                        {inspectionPlanOpen ? '▼' : '▶'}
                    </span>
                </div>
                {inspectionPlanOpen && (
                    <div className="mt-2">
                        {apiData?.data?.rbi_inspection_plan && apiData.data.rbi_inspection_plan.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full table-auto border-collapse">
                                    <thead>
                                        <tr className="bg-gray-100 dark:bg-gray-900">
                                            <th className="border border-gray-300 px-4 py-2 text-center text-sm font-semibold dark:border-gray-700">Inspection Number</th>
                                            <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold dark:border-gray-700">Inspection Technique</th>
                                            <th className="border border-gray-300 px-4 py-2 text-center text-sm font-semibold dark:border-gray-700">Significant</th>
                                            <th className="border border-gray-300 px-4 py-2 text-center text-sm font-semibold dark:border-gray-700" style={{ minWidth: '280px' }}>Inspection Year</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {apiData.data.rbi_inspection_plan.map((item: any, idx: number) => {
                                            const currentYear = inspectionYears[idx] || (item.insp_year ? parseInt(item.insp_year) : baseYear);

                                            return (
                                                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                                    <td className="border border-gray-300 px-4 py-2 text-center text-sm dark:border-gray-700">
                                                        {item['Inspection Number'] ?? '-'}
                                                    </td>
                                                    <td className="border border-gray-300 px-4 py-2 text-sm dark:border-gray-700">
                                                        {item['Inspection Technique'] || '-'}
                                                    </td>
                                                    <td className="border border-gray-300 px-4 py-2 text-center text-sm dark:border-gray-700">
                                                        <input
                                                            type="checkbox"
                                                            checked={item.Significant === true}
                                                            readOnly
                                                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                                        />
                                                    </td>
                                                    <td className="border border-gray-300 px-4 py-2 text-sm dark:border-gray-700">
                                                        <div className="flex items-center gap-3">
                                                            {/* Editable Year Input */}
                                                            <input
                                                                type="number"
                                                                min={yearOptions[0]}
                                                                max={yearOptions[yearOptions.length - 1]}
                                                                value={currentYear}
                                                                onChange={(e) => {
                                                                    const newYear = Number(e.target.value);
                                                                    if (newYear >= yearOptions[0] && newYear <= yearOptions[yearOptions.length - 1]) {
                                                                        setInspectionYears(prev => ({
                                                                            ...prev,
                                                                            [idx]: newYear
                                                                        }));
                                                                    }
                                                                }}
                                                                className="w-20 rounded border border-gray-300 bg-primary/10 px-3 py-1 text-center text-sm font-semibold text-primary dark:border-gray-600 dark:bg-primary/20"
                                                            />
                                                            {/* Year Slider */}
                                                            <div className="flex flex-1 items-center gap-2">
                                                                <span className="text-xs text-gray-500 dark:text-gray-400 w-10 text-right">
                                                                    {yearOptions[0]}
                                                                </span>
                                                                <input
                                                                    type="range"
                                                                    min={yearOptions[0]}
                                                                    max={yearOptions[yearOptions.length - 1]}
                                                                    value={currentYear}
                                                                    onChange={(e) => {
                                                                        const newYear = Number(e.target.value);
                                                                        setInspectionYears(prev => ({
                                                                            ...prev,
                                                                            [idx]: newYear
                                                                        }));
                                                                    }}
                                                                    className="flex-1 h-2 rounded-lg appearance-none cursor-pointer"
                                                                    style={{
                                                                        background: `linear-gradient(to right, #4f46e5 0%, #4f46e5 ${((currentYear - yearOptions[0]) / (yearOptions[yearOptions.length - 1] - yearOptions[0])) * 100}%, #d1d5db ${((currentYear - yearOptions[0]) / (yearOptions[yearOptions.length - 1] - yearOptions[0])) * 100}%, #d1d5db 100%)`
                                                                    }}
                                                                />
                                                                <span className="text-xs text-gray-500 dark:text-gray-400 w-10">
                                                                    {yearOptions[yearOptions.length - 1]}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center text-gray-500 dark:text-gray-400">
                                No inspection plan available.
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Panel 7: Selected Model and Selected Asset (Merged) */}
            <div className="panel border-0 shadow-none p-0">
                <div className="mb-1 flex items-center">
                    <div className="rounded-full bg-primary/10 p-1">
                        <span className="text-primary">🎯</span>
                    </div>
                    <h4 className="ml-2 text-lg font-semibold">Selected Model & Asset</h4>
                </div>
                
                {selectedModelId && selectedAsset ? (
                    <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
                        {/* Model Info */}
                        <div className="space-y-0">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Model ID:</span>
                                <span className="font-medium">{selectedModelId}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Model Name:</span>
                                <span className="font-medium text-primary">{selectedModelName || 'N/A'}</span>
                            </div>
                            <div className="mt-0 rounded-lg bg-gray-50 p-2 dark:bg-gray-800">
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                    This model is currently selected for inspection planning.
                                </p>
                            </div>
                        </div>

                        {/* Asset Info */}
                        <div className="space-y-0">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Asset ID:</span>
                                <span className="font-medium">{selectedAsset.asset_id}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Asset Name:</span>
                                <span className="font-medium text-success">{selectedAsset.asset_name}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-500 dark:text-gray-400">CT ID:</span>
                                <span className="font-medium">{selectedAsset.ct_id}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Description:</span>
                                <span className="font-medium">{selectedAsset.description || 'N/A'}</span>
                            </div>
                            {selectedAsset.Risk_Level && (
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">Risk Level:</span>
                                    <span className={`font-medium ${
                                        selectedAsset.Risk_Level === 'High' ? 'text-danger' :
                                        selectedAsset.Risk_Level === 'Medium' ? 'text-warning' :
                                        'text-success'
                                    }`}>
                                        {selectedAsset.Risk_Level}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-2 text-center">
                        <div className="text-4xl text-gray-300 dark:text-gray-600">🎯</div>
                        <p className="mt-2 text-gray-500 dark:text-gray-400">No model or asset selected</p>
                        <p className="text-sm text-gray-400 dark:text-gray-500">Please select a model and asset from the equipment tree</p>
                    </div>
                )}
            </div>

            {/* Workpack Report Modal */}
            <ReportInspectionWorkpack
                isOpen={showWorkpackModal}
                onClose={() => setShowWorkpackModal(false)}
                data={workpackData}
                riskMatrix={riskMatrixData}
                loading={loadingWorkpack}
                reportTitle={`Inspection Workpack Report - ${selectedYear}`}
                year={selectedYear}
            />

            {/* Inspection Technique Modal */}
            {showInspectionTechniqueModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={() => setShowInspectionTechniqueModal(false)}>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-7xl w-full mx-4 max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                                Inspection Technique Details
                            </h3>
                            <button
                                onClick={() => setShowInspectionTechniqueModal(false)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-5 overflow-auto max-h-[calc(90vh-140px)]">
                            {selectedInspectionRow ? (
                                <div>
                                    {/* Alternative Inspection Techniques Section */}
                                    {loadingInspectionTechnique ? (
                                        <div className="flex items-center justify-center py-4">
                                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                                            <span className="ml-2 text-sm text-gray-500">Loading inspection techniques...</span>
                                        </div>
                                    ) : inspectionTechniqueData.length > 0 ? (
                                        <div className="overflow-x-auto">
                                            <table className="w-full table-auto border-collapse">
                                                <thead>
                                                    <tr className="bg-gray-100 dark:bg-gray-900">
                                                        <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold dark:border-gray-700">Inspection Technique</th>
                                                        <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold dark:border-gray-700">Intrusive</th>
                                                        <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold dark:border-gray-700">Effective</th>
                                                        <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold dark:border-gray-700">Coverage</th>
                                                        <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold dark:border-gray-700">Inspection Point</th>
                                                        <th className="border border-gray-300 px-3 py-2 text-right text-sm font-semibold dark:border-gray-700">Unit Price $</th>
                                                        <th className="border border-gray-300 px-3 py-2 text-right text-sm font-semibold dark:border-gray-700">Duration (Days)</th>
                                                        <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold dark:border-gray-700">Description</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {inspectionTechniqueData.map((item: any, idx: number) => (
                                                        <tr
                                                            key={idx}
                                                            onClick={() => setSelectedTechniqueIndex(idx)}
                                                            className={`cursor-pointer transition-colors ${
                                                                selectedTechniqueIndex === idx
                                                                    ? 'bg-blue-100 dark:bg-blue-900'
                                                                    : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                                                            }`}
                                                        >
                                                            <td className="border border-gray-300 px-3 py-2 text-sm dark:border-gray-700">
                                                                {item.INSP_TECH || '-'}
                                                            </td>
                                                            <td className="border border-gray-300 px-3 py-2 text-sm dark:border-gray-700">
                                                                {item.intrusivec || '-'}
                                                            </td>
                                                            <td className="border border-gray-300 px-3 py-2 text-sm dark:border-gray-700">
                                                                {item.effectivec || '-'}
                                                            </td>
                                                            <td className="border border-gray-300 px-3 py-2 text-sm dark:border-gray-700">
                                                                {item.Coverage || '-'}
                                                            </td>
                                                            <td className="border border-gray-300 px-3 py-2 text-sm dark:border-gray-700">
                                                                {item.INSPECTION_POINT || '-'}
                                                            </td>
                                                            <td className="border border-gray-300 px-3 py-2 text-right text-sm dark:border-gray-700">
                                                                {item.UNIT_PRICE != null ? `$${item.UNIT_PRICE.toLocaleString()}` : '-'}
                                                            </td>
                                                            <td className="border border-gray-300 px-3 py-2 text-right text-sm dark:border-gray-700">
                                                                {item.DURATION_DAYS != null ? item.DURATION_DAYS.toFixed(2) : '-'}
                                                            </td>
                                                            <td className="border border-gray-300 px-3 py-2 text-sm dark:border-gray-700">
                                                                {item.inspection_description || '-'}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-500 dark:text-gray-400 italic text-center py-4">
                                            No alternative inspection techniques available.
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <p className="text-gray-500 dark:text-gray-400">No inspection data selected</p>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="flex items-center justify-end p-5 border-t border-gray-200 dark:border-gray-700">
                            <button
                                onClick={() => setShowInspectionTechniqueModal(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 rounded-lg"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InspectionView;