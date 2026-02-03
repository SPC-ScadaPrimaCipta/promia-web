'use client';
import { IRootState } from '@/store';
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

interface UnitDefinition {
    ASSET_ID: number;
    ASSET_NAME: string;
    HIERARCHY_ID: number;
    DESCRIPTION: string;
    PIPING: number;
    EQUIPMENT: number;
    level: number;
}

const UnitDefinitionsTable = () => {
    const [data, setData] = useState<UnitDefinition[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const isDark = useSelector((state: IRootState) => state.themeConfig.theme === 'dark' || state.themeConfig.isDarkMode);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                // Using rbim_id=26 and asset_id=2 as specified
                const response = await fetch('/api/risk-analysis/report-5-4?rbim_id=26&asset_id=2');
                const result = await response.json();
                
                if (result.success) {
                    console.log('Unit definitions data:', result.data);
                    setData(result.data || []);
                } else {
                    setError(result.error || 'Failed to fetch data');
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="panel h-full">
                <div className="flex h-64 items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                    <span className="ml-2">Loading unit definitions...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="panel h-full">
                <div className="flex h-64 items-center justify-center text-danger">
                    Error loading unit definitions: {error}
                </div>
            </div>
        );
    }

    return (
        <div className="panel h-full">
            <div className="mb-5 flex items-center justify-between">
                <h5 className="text-lg font-semibold dark:text-white-light">Unit Definitions for Semi Quantitative Analysis</h5>
                <div className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary dark:bg-primary dark:text-white-light">
                    RBIM ID: 26, Asset ID: 2
                </div>
            </div>
            
            <div className="mb-4">
                <p className="mb-4 text-white-dark">
                    This table shows the unit definitions (Level 2/Level 3 hierarchy) for Semi Quantitative Analysis.
                    It includes asset details with separate columns for piping and equipment categorization.
                </p>
                
                {data.length > 0 ? (
                    <div className="overflow-x-auto rounded border border-white-light dark:border-dark">
                        <table className="min-w-full divide-y divide-white-light dark:divide-dark">
                            <thead>
                                <tr className="bg-white-light/30 dark:bg-dark/30">
                                    {/* <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white-dark">
                                        Asset ID
                                    </th> */}
                                    <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white-dark">
                                        Asset Name
                                    </th>
                                    {/* <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white-dark">
                                        Hierarchy ID
                                    </th> */}
                                    <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white-dark">
                                        Description
                                    </th>
                                    <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white-dark">
                                        Piping
                                    </th>
                                    <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white-dark">
                                        Equipment
                                    </th>
                                    <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-white-dark">
                                        Level
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white-light dark:divide-dark">
                                {data.map((item, index) => (
                                    <tr
                                        key={`${item.ASSET_ID}-${item.HIERARCHY_ID}`}
                                        className={index % 2 === 0 ? 'bg-white-light/10 dark:bg-dark/10' : ''}
                                    >
                                        {/* <td className="whitespace-nowrap px-4 py-3 text-sm">
                                            {item.ASSET_ID}
                                        </td> */}
                                        <td className="whitespace-nowrap px-4 py-3 text-sm font-medium">
                                            {item.ASSET_NAME}
                                        </td>
                                        {/* <td className="whitespace-nowrap px-4 py-3 text-sm">
                                            {item.HIERARCHY_ID}
                                        </td> */}
                                        <td className="px-4 py-3 text-sm">
                                            {item.DESCRIPTION || '-'}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-sm text-center">
                                            {item.PIPING}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-sm text-center">
                                            {item.EQUIPMENT}
                                        </td>
                                        <td className="whitespace-nowrap px-4 py-3 text-sm">
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${item.level === 2 ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'}`}>
                                                Level {item.level}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="rounded border border-dashed border-white-light p-8 text-center dark:border-dark">
                        <div className="text-lg font-semibold text-white-dark">No unit definitions available</div>
                        <div className="text-sm text-white-dark mt-2">No data found for the specified RBIM ID and Asset ID</div>
                    </div>
                )}

                {data.length > 0 && (
                    <div className="mt-4 rounded border border-white-light p-3 dark:border-dark">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-white-dark">Summary</div>
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <div className="text-2xl font-bold text-primary">{data.length}</div>
                                <div className="text-xs text-white-dark">Total Units</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-blue-600">
                                    {data.filter(item => item.PIPING === 1).length}
                                </div>
                                <div className="text-xs text-white-dark">Piping Units</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-green-600">
                                    {data.filter(item => item.EQUIPMENT === 1).length}
                                </div>
                                <div className="text-xs text-white-dark">Equipment Units</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UnitDefinitionsTable;