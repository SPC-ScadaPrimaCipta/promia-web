'use client';

import Link from 'next/link';
import React, { useState, useEffect } from 'react';
import ComponentTreeView from '@/components/risk-analysis/ComponentTreeView';

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
}

interface AssetInfoDef {
    ct_id: number;
    td_id: number;
    name: string;
    Table_Name: string;
    pos: number;
}

const Component = () => {
    const [selectedAsset, setSelectedAsset] = useState<AssetData | null>(null);
    const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
    const [assetInfoDefs, setAssetInfoDefs] = useState<AssetInfoDef[]>([]);
    const [selectedInfoDef, setSelectedInfoDef] = useState<string>('');
    const [loadingInfoDefs, setLoadingInfoDefs] = useState(false);
    const [assetData, setAssetData] = useState<any[]>([]);
    const [assetDataColumns, setAssetDataColumns] = useState<any[]>([]);
    const [loadingAssetData, setLoadingAssetData] = useState(false);
    const [fieldDefs, setFieldDefs] = useState<any[]>([]);
    const [lookupItemsByLlId, setLookupItemsByLlId] = useState<Record<number, any[]>>({});
    const [visibleCellInputs, setVisibleCellInputs] = useState<Record<string, boolean>>({});

    // Fetch asset info definitions when asset is selected
    useEffect(() => {
        if (selectedAsset && selectedAsset.ct_id) {
            const fetchAssetInfo = async () => {
                setLoadingInfoDefs(true);
                try {
                    const response = await fetch(`/api/risk-analysis/asset-info?ct_id=${selectedAsset.ct_id}`);
                    const result = await response.json();

                    if (result.success) {
                        // Sort by name alphabetically
                        const sortedData = result.data.sort((a: AssetInfoDef, b: AssetInfoDef) =>
                            a.name.localeCompare(b.name)
                        );
                        setAssetInfoDefs(sortedData);

                        // Check if currently selected item exists in new dropdown
                        // console.log('Selected Info Def:', selectedInfoDef);
                        const itemExists = sortedData.some((item: AssetInfoDef) => item.name === selectedInfoDef);

                        if (selectedInfoDef && itemExists) {
                            // Keep the same selection if it exists
                            // Don't change selectedInfoDef
                        } else {
                            // If no previous selection or item doesn't exist, select first item
                            if (sortedData.length > 0) {
                                setSelectedInfoDef(sortedData[0].name);
                            } else {
                                setSelectedInfoDef('');
                            }
                        }
                    } else {
                        console.error('Failed to fetch asset info:', result.error);
                        setAssetInfoDefs([]);
                    }
                } catch (error) {
                    console.error('Error fetching asset info:', error);
                    setAssetInfoDefs([]);
                } finally {
                    setLoadingInfoDefs(false);
                }
            };

            fetchAssetInfo();
        } else {
            setAssetInfoDefs([]);
            setSelectedInfoDef('');
        }
    }, [selectedAsset]);

    // Fetch asset data and field definitions when selected info def changes
    useEffect(() => {
        if (selectedAsset && selectedInfoDef && assetInfoDefs.length > 0) {
            const selectedInfo = assetInfoDefs.find((info) => info.name === selectedInfoDef);
            if (selectedInfo && selectedInfo.Table_Name) {
                const fetchData = async () => {
                    setLoadingAssetData(true);
                    try {
                        const tableName = `CIV_${selectedInfo.Table_Name}`;

                        // Fetch component information (asset data)
                        const componentResponse = await fetch(
                            `/api/risk-analysis/asset-data?table_name=${tableName}&asset_id=${selectedAsset.asset_id}`
                        );
                        const componentResult = await componentResponse.json();

                        // Fetch field definitions
                        const fieldDefResponse = await fetch(
                            `/api/risk-analysis/field-def?td_id=${selectedInfo.td_id}`
                        );
                        const fieldDefResult = await fieldDefResponse.json();

                        if (componentResult.success && fieldDefResult.success) {
                            const componentData = componentResult.data;
                            const fieldDefs = fieldDefResult.data;
                            setFieldDefs(fieldDefs);

                            // Get columns from component data, excluding asset_id
                            const componentColumns = componentResult.columns || [];
                            const columnsAfterAssetId = componentColumns.slice(
                                componentColumns.findIndex((col: string) => col.toLowerCase() === 'asset_id') + 1
                            );

                            // Join component data with field definitions (allow V/C suffixes and separators)
                            const normalizeName = (value: string) =>
                                value?.trim().replace(/[\s_]/g, '').toLowerCase();

                            const findFieldDef = (col: string) => {
                                const base = normalizeName(col.replace(/[VC]$/i, '')); // strip trailing V/C for fallback
                                const variants = [
                                    normalizeName(col),
                                    normalizeName(`${col}V`),
                                    normalizeName(`${col}C`),
                                    normalizeName(`${col}_V`),
                                    normalizeName(`${col}_C`),
                                ];

                                return (
                                    fieldDefs.find((fd: any) => variants.includes(normalizeName(fd.Field_Name || ''))) ||
                                    fieldDefs.find((fd: any) => normalizeName(fd.Field_Name || '') === base)
                                );
                            };

                            const joinedColumns = ['asset_id', ...columnsAfterAssetId.map((col: string) => {
                                const fieldDef = findFieldDef(col);
                                return {
                                    column: col,
                                    fd_id: fieldDef?.fd_id ?? null,
                                    ft_id: fieldDef?.ft_id ?? null,
                                    ll_id: fieldDef?.ll_id ?? null,
                                    name: fieldDef?.name ?? null,
                                };
                            })];

                            setAssetData(componentData);
                            setAssetDataColumns(joinedColumns);
                        } else {
                            console.error('Failed to fetch data:', componentResult.error || fieldDefResult.error);
                            setAssetData([]);
                            setAssetDataColumns([]);
                            setFieldDefs([]);
                        }
                    } catch (error) {
                        console.error('Error fetching data:', error);
                        setAssetData([]);
                        setAssetDataColumns([]);
                        setFieldDefs([]);
                    } finally {
                        setLoadingAssetData(false);
                    }
                };

                fetchData();
            }
        } else {
            setAssetData([]);
            setAssetDataColumns([]);
            setFieldDefs([]);
        }
    }, [selectedAsset, selectedInfoDef, assetInfoDefs]);

    // Fetch lookup items for ft_id = 37 fields (grouped by ll_id)
    useEffect(() => {
        const targets = fieldDefs.filter(
            (fd: any) => fd.ft_id === 37 && fd.ll_id && lookupItemsByLlId[fd.ll_id] === undefined
        );

        if (targets.length === 0) return;

        const uniqueLlIds = Array.from(new Set(targets.map((fd: any) => fd.ll_id)));

        const fetchLookupItems = async (llId: number) => {
            try {
                const res = await fetch(`/api/risk-analysis/lookup-item?ll_id=${llId}`);
                const result = await res.json();
                if (result.success) {
                    setLookupItemsByLlId((prev) => ({ ...prev, [llId]: result.data || [] }));
                } else {
                    console.error('Failed to fetch lookup items:', result.error);
                    setLookupItemsByLlId((prev) => ({ ...prev, [llId]: [] }));
                }
            } catch (error) {
                console.error('Error fetching lookup items:', error);
                setLookupItemsByLlId((prev) => ({ ...prev, [llId]: [] }));
            }
        };

        uniqueLlIds.forEach((llId) => fetchLookupItems(llId));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fieldDefs]);

    return (
        <div>
            {/* 2-Column Layout */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-10">
                {/* Left Column - Tree View */}
                <div className="panel lg:col-span-2">
                    <h5 className="mb-5 text-lg font-semibold dark:text-white-light">Equipment Tree</h5>
                    <ComponentTreeView onAssetSelect={setSelectedAsset} onModelChange={setSelectedModelId} />
                </div>

                {/* Right Column - Details/Information */}
                <div className="panel lg:col-span-8">
                    <h5 className="mb-5 text-lg font-semibold dark:text-white-light">Equipment Details</h5>
                    <div className="space-y-4">
                        {selectedAsset ? (
                            <div className="space-y-3">
                                {/* Info Definition Dropdown */}
                                <div>
                                    <label className="mb-2 block text-sm font-medium">Select Information</label>
                                    <select
                                        value={selectedInfoDef}
                                        onChange={(e) => setSelectedInfoDef(e.target.value)}
                                        className="form-select w-full"
                                        disabled={loadingInfoDefs || assetInfoDefs.length === 0}
                                    >
                                        {loadingInfoDefs ? (
                                            <option>Loading...</option>
                                        ) : assetInfoDefs.length > 0 ? (
                                            assetInfoDefs.map((info) => (
                                                <option key={info.td_id} value={info.name}>
                                                    {info.name}
                                                </option>
                                            ))
                                        ) : (
                                            <option>No information available</option>
                                        )}
                                    </select>
                                </div>

                                {/* Selected Dropdown Description */}
                                {selectedInfoDef && assetInfoDefs.length > 0 && (
                                    <div className="panel">
                                        <h5 className="mb-4 text-lg font-semibold dark:text-white-light">{selectedInfoDef}</h5>
                                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                            <div className="flex items-center justify-between rounded-md bg-gray-50 dark:bg-gray-800 p-3">
                                                <span className="text-sm font-medium">Table Name:</span>
                                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                                    {`CIV_${assetInfoDefs.find((info) => info.name === selectedInfoDef)?.Table_Name || ''}`}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between rounded-md bg-gray-50 dark:bg-gray-800 p-3">
                                                <span className="text-sm font-medium">TD_ID:</span>
                                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                                    {assetInfoDefs.find((info) => info.name === selectedInfoDef)?.td_id || '-'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Component Information Table - Transposed */}
                                        <div className="mt-4">
                                            <h6 className="mb-3 text-md font-semibold dark:text-white-light">Component Information</h6>
                                            {loadingAssetData ? (
                                                <div className="flex items-center justify-center py-8">
                                                    <div className="text-sm text-gray-500 dark:text-gray-400">Loading data...</div>
                                                </div>
                                            ) : assetData.length > 0 ? (
                                                <div className="table-responsive">
                                                    <table className="table-hover">
                                                        <thead>
                                                            <tr>
                                                                <th>FD_ID</th>
                                                                <th>FT_ID</th>
                                                                <th>LL_ID</th>
                                                                <th>Name</th>
                                                                {assetData.map((_, index) => (
                                                                    <th key={index}>Record {index + 1}</th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {assetDataColumns.map((columnInfo, index) => {
                                                                // Handle both string and object formats
                                                                const column = typeof columnInfo === 'string' ? columnInfo : columnInfo.column;
                                                                const fdId = typeof columnInfo === 'object' ? columnInfo.fd_id : null;
                                                                const ftId = typeof columnInfo === 'object' ? columnInfo.ft_id : null;
                                                                const llId = typeof columnInfo === 'object' ? columnInfo.ll_id : null;
                                                                const name = typeof columnInfo === 'object' ? columnInfo.name : column;
                                                                const isFt1 = ftId === 1;
                                                                const isFt6 = ftId === 6;
                                                                const isFt40 = ftId === 40;
                                                                const isFt37 = ftId === 37;
                                                                const isFt37C =
                                                                    isFt37 &&
                                                                    /c$/i.test(String(column));
                                                                const lookupOptions =
                                                                    llId !== null && llId !== undefined
                                                                        ? lookupItemsByLlId[llId]
                                                                        : undefined;
                                                                const normalizeValue = (val: any) =>
                                                                    val === null || val === undefined
                                                                        ? ''
                                                                        : String(val).trim().toLowerCase().replace(/\s+/g, ' ');

                                                                return (
                                                                    <tr key={index}>
                                                                        <td>{fdId !== null ? fdId : '-'}</td>
                                                                        <td>{ftId !== null ? ftId : '-'}</td>
                                                                        <td>{llId !== null ? llId : '-'}</td>
                                                                        <td>{name}</td>
                                                                        {assetData.map((row, rowIndex) => {
                                                                            const rowValueRaw = row[column];
                                                                            const rowValueNormalized = normalizeValue(rowValueRaw);
                                                                            const cellKey = `${column}-${rowIndex}`;
                                                                            const isInputVisible = visibleCellInputs[cellKey];
                                                                            const displayLabel =
                                                                                rowValueRaw === null || rowValueRaw === undefined
                                                                                    ? '-'
                                                                                    : (() => {
                                                                                          const num = Number(rowValueRaw);
                                                                                          if (!Number.isNaN(num) && num % 1 !== 0) {
                                                                                              return num.toFixed(2);
                                                                                          }
                                                                                          return String(rowValueRaw);
                                                                                      })();
                                                                            const matchingOption = Array.isArray(lookupOptions)
                                                                                ? lookupOptions.find((item: any) => {
                                                                                      if (!rowValueNormalized) return false;
                                                                                      const normalizedVal = normalizeValue(item.value);
                                                                                      const normalizedComments = normalizeValue(
                                                                                          item.comments
                                                                                      );
                                                                                      return (
                                                                                          normalizedVal === rowValueNormalized ||
                                                                                          normalizedComments === rowValueNormalized
                                                                                      );
                                                                                  })
                                                                                : undefined;
                                                                            const selectDefaultValue =
                                                                                matchingOption !== undefined
                                                                                    ? normalizeValue(matchingOption.value)
                                                                                    : '';
                                                                            if (isFt37C && Array.isArray(lookupOptions)) {
                                                                                console.log('Lookup dropdown record value', {
                                                                                    column,
                                                                                    rowIndex,
                                                                                    raw: rowValueRaw,
                                                                                    normalized: rowValueNormalized
                                                                                });
                                                                                console.log('Lookup dropdown selected item', {
                                                                                    column,
                                                                                    rowIndex,
                                                                                    selected: matchingOption
                                                                                        ? {
                                                                                              li_id: matchingOption.li_id,
                                                                                              value: matchingOption.value,
                                                                                              comments: matchingOption.comments,
                                                                                              normalizedValue: normalizeValue(matchingOption.value),
                                                                                              normalizedComments: normalizeValue(
                                                                                                  matchingOption.comments
                                                                                              )
                                                                                          }
                                                                                        : null
                                                                                });
                                                                                console.log('Lookup dropdown options', {
                                                                                    column,
                                                                                    rowIndex,
                                                                                    options: lookupOptions.map((item: any) => ({
                                                                                        li_id: item.li_id,
                                                                                        value: item.value,
                                                                                        normalized: normalizeValue(item.value),
                                                                                        comments: item.comments
                                                                                    }))
                                                                                });
                                                                            }

                                                                            return (
                                                                            <td
                                                                                key={`${column}-${rowIndex}`}
                                                                                style={
                                                                                    isFt1
                                                                                        ? { color: 'darkgreen' }
                                                                                        : isFt6
                                                                                        ? { color: 'darkmagenta' }
                                                                                        : isFt40
                                                                                        ? { color: 'darkorange' }
                                                                                        : isFt37
                                                                                        ? { color: 'darkblue' }
                                                                                        : undefined
                                                                                }
                                                                            >
                                                                                {isFt37C &&
                                                                                Array.isArray(lookupOptions) &&
                                                                                lookupOptions.length > 0 ? (
                                                                                    <select
                                                                                        className="form-select"
                                                                                        style={{ color: 'darkblue' }}
                                                                                        defaultValue={selectDefaultValue}
                                                                                    >
                                                                                        <option value="" disabled>
                                                                                            Select value
                                                                                        </option>
                                                                                        {lookupOptions.map((item: any) => (
                                                                                            <option
                                                                                                key={item.li_id}
                                                                                                value={normalizeValue(item.value)}
                                                                                                data-li-id={item.li_id}
                                                                                                data-raw-value={item.value}
                                                                                            >
                                                                                                {item.comments ?? item.value}
                                                                                            </option>
                                                                                        ))}
                                                                                    </select>
                                                                                ) : isFt1 ? (
                                                                                    isInputVisible ? (
                                                                                        <input
                                                                                            type="text"
                                                                                            className="form-input w-full"
                                                                                            style={{ color: 'darkgreen' }}
                                                                                            autoFocus
                                                                                            onBlur={() =>
                                                                                                setVisibleCellInputs((prev) => ({
                                                                                                    ...prev,
                                                                                                    [cellKey]: false
                                                                                                }))
                                                                                            }
                                                                                            defaultValue={
                                                                                                row[column] !== null && row[column] !== undefined
                                                                                                    ? String(row[column])
                                                                                                    : ''
                                                                                            }
                                                                                        />
                                                                                    ) : (
                                                                                        <button
                                                                                            type="button"
                                                                                            className="w-full text-left underline-offset-2 hover:underline"
                                                                                            style={{ color: 'darkgreen' }}
                                                                                            onClick={() =>
                                                                                                setVisibleCellInputs((prev) => ({
                                                                                                    ...prev,
                                                                                                    [cellKey]: true
                                                                                                }))
                                                                                            }
                                                                                        >
                                                                                            {row[column] !== null && row[column] !== undefined
                                                                                                ? String(row[column])
                                                                                                : '-'}
                                                                                        </button>
                                                                                    )
                                                                                ) : isFt6 ? (
                                                                                    isInputVisible ? (
                                                                                        <input
                                                                                            type="text"
                                                                                            inputMode="numeric"
                                                                                            pattern="[0-9]*"
                                                                                            className="form-input w-full"
                                                                                            style={{ color: 'darkmagenta' }}
                                                                                            autoFocus
                                                                                            onBlur={() =>
                                                                                                setVisibleCellInputs((prev) => ({
                                                                                                    ...prev,
                                                                                                    [cellKey]: false
                                                                                                }))
                                                                                            }
                                                                                            onKeyDown={(e) => {
                                                                                                const allowedKeys = [
                                                                                                    'Backspace',
                                                                                                    'Delete',
                                                                                                    'Tab',
                                                                                                    'ArrowLeft',
                                                                                                    'ArrowRight',
                                                                                                    'Home',
                                                                                                    'End'
                                                                                                ];
                                                                                                if (
                                                                                                    !/^[0-9]$/.test(e.key) &&
                                                                                                    !allowedKeys.includes(e.key)
                                                                                                ) {
                                                                                                    e.preventDefault();
                                                                                                }
                                                                                            }}
                                                                                            defaultValue={
                                                                                                row[column] !== null && row[column] !== undefined
                                                                                                    ? String(row[column])
                                                                                                    : ''
                                                                                            }
                                                                                        />
                                                                                    ) : (
                                                                                        <button
                                                                                            type="button"
                                                                                            className="w-full text-left underline-offset-2 hover:underline"
                                                                                            style={{ color: 'darkmagenta' }}
                                                                                            onClick={() =>
                                                                                                setVisibleCellInputs((prev) => ({
                                                                                                    ...prev,
                                                                                                    [cellKey]: true
                                                                                                }))
                                                                                            }
                                                                                        >
                                                                                            {row[column] !== null && row[column] !== undefined
                                                                                                ? String(row[column])
                                                                                                : '-'}
                                                                                        </button>
                                                                                    )
                                                                                ) : isFt40 ? (
                                                                                    isInputVisible ? (
                                                                                        <input
                                                                                            type="text"
                                                                                            readOnly
                                                                                            className="form-input w-full"
                                                                                            style={{ color: 'darkorange' }}
                                                                                            autoFocus
                                                                                            onBlur={() =>
                                                                                                setVisibleCellInputs((prev) => ({
                                                                                                    ...prev,
                                                                                                    [cellKey]: false
                                                                                                }))
                                                                                            }
                                                                                            defaultValue={
                                                                                                row[column] !== null && row[column] !== undefined
                                                                                                    ? String(row[column])
                                                                                                    : ''
                                                                                            }
                                                                                        />
                                                                                    ) : (
                                                                                        <button
                                                                                            type="button"
                                                                                            className="w-full text-left underline-offset-2 hover:underline"
                                                                                            style={{ color: 'darkorange' }}
                                                                                            onClick={() =>
                                                                                                setVisibleCellInputs((prev) => ({
                                                                                                    ...prev,
                                                                                                    [cellKey]: true
                                                                                                }))
                                                                                            }
                                                                                        >
                                                                                            {row[column] !== null && row[column] !== undefined
                                                                                                ? displayLabel
                                                                                                : '-'}
                                                                                        </button>
                                                                                    )
                                                                                ) : row[column] !== null && row[column] !== undefined ? (
                                                                                    String(row[column])
                                                                                ) : (
                                                                                    '-'
                                                                                )}
                                                                            </td>
                                                                        );
                                                                        })}
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <div className="rounded-md border border-gray-200 dark:border-gray-700 p-4">
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">No data available</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Field Definitions Table */}
                                        <div className="mt-6">
                                            <h6 className="mb-3 text-md font-semibold dark:text-white-light">Field Definitions</h6>
                                            {loadingAssetData ? (
                                                <div className="flex items-center justify-center py-8">
                                                    <div className="text-sm text-gray-500 dark:text-gray-400">Loading data...</div>
                                                </div>
                                            ) : fieldDefs.length > 0 ? (
                                                <div className="table-responsive">
                                                    <table className="table-hover">
                                                        <thead>
                                                            <tr>
                                                                <th>TD_ID</th>
                                                                <th>FD_ID</th>
                                                                <th>FT_ID</th>
                                                                <th>Field Name</th>
                                                                <th>Name</th>
                                                                <th>Order No</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {fieldDefs.map((field: any) => (
                                                                <tr key={field.fd_id}>
                                                                    <td className="font-medium">{field.fd_id}</td>
                                                                    <td>{field.td_id}</td>
                                                                    <td>{field.ft_id}</td>
                                                                    <td>{field.Field_Name}</td>
                                                                    <td>{field.name}</td>
                                                                    <td>{field.order_no}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <div className="rounded-md border border-gray-200 dark:border-gray-700 p-4">
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">No field definitions available</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center justify-between rounded-md bg-gray-50 dark:bg-gray-800 p-3">
                                    <span className="text-sm font-medium">Asset ID:</span>
                                    <span className="text-sm text-gray-700 dark:text-gray-300">{selectedAsset.asset_id}</span>
                                </div>
                                <div className="flex items-center justify-between rounded-md bg-gray-50 dark:bg-gray-800 p-3">
                                    <span className="text-sm font-medium">Asset Name:</span>
                                    <span className="text-sm text-gray-700 dark:text-gray-300">{selectedAsset.asset_name}</span>
                                </div>
                                <div className="flex items-center justify-between rounded-md bg-gray-50 dark:bg-gray-800 p-3">
                                    <span className="text-sm font-medium">Parent Name:</span>
                                    <span className="text-sm text-gray-700 dark:text-gray-300">{selectedAsset.parent_name}</span>
                                </div>
                                <div className="flex items-center justify-between rounded-md bg-gray-50 dark:bg-gray-800 p-3">
                                    <span className="text-sm font-medium">CT ID:</span>
                                    <span className="text-sm text-gray-700 dark:text-gray-300">{selectedAsset.ct_id}</span>
                                </div>
                                <div className="flex items-center justify-between rounded-md bg-gray-50 dark:bg-gray-800 p-3">
                                    <span className="text-sm font-medium">CI ID:</span>
                                    <span className="text-sm text-gray-700 dark:text-gray-300">{selectedAsset.ci_id}</span>
                                </div>
                                <div className="flex items-center justify-between rounded-md bg-gray-50 dark:bg-gray-800 p-3">
                                    <span className="text-sm font-medium">Description:</span>
                                    <span className="text-sm text-gray-700 dark:text-gray-300">{selectedAsset.description}</span>
                                </div>
                                <div className="flex items-center justify-between rounded-md bg-gray-50 dark:bg-gray-800 p-3">
                                    <span className="text-sm font-medium">Hierarchy ID:</span>
                                    <span className="text-sm text-gray-700 dark:text-gray-300">{selectedAsset.hierarchy_id}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-md border border-gray-200 dark:border-gray-700 p-4">
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Select an equipment item from the tree to view details here.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Component;
