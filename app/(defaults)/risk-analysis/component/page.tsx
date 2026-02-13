'use client';

import Link from 'next/link';
import React, { useState, useEffect } from 'react';
import ComponentTreeView from '@/components/risk-analysis/ComponentTreeView';
import Swal from 'sweetalert2';
import Select from 'react-select';

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
    const [editedData, setEditedData] = useState<Record<string, any>>({});
    const [hasChanges, setHasChanges] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [searchField, setSearchField] = useState<string>('');
    const [showGlobalSearch, setShowGlobalSearch] = useState(false);
    const [globalSearchQuery, setGlobalSearchQuery] = useState<string>('');
    const [globalSearchResults, setGlobalSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

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
                    setFetchError(null);
                    setSearchField(''); // Clear search when changing tabs
                    try {
                        // FETCH: Use CIV_ prefix for complete view data (read-only)
                        const viewTableName = `CIV_${selectedInfo.Table_Name}`;
                        
                        console.log('🟢 FETCH - Base table:', selectedInfo.Table_Name);
                        console.log('🟢 FETCH - View table:', viewTableName);
                        console.log('🟢 FETCH - Asset ID:', selectedAsset.asset_id);

                        // Fetch component information (asset data)
                        const componentResponse = await fetch(
                            `/api/risk-analysis/asset-data?table_name=${viewTableName}&asset_id=${selectedAsset.asset_id}`
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

                            // Remove duplicate columns with V/C suffixes - prioritize C > V > original
                            const deduplicatedColumns: string[] = [];
                            const processedBaseNames = new Set<string>();
                            const selectedColumns = new Set<string>(); // Track which exact columns we've selected
                            
                            // Build a set for fast column lookup
                            const columnSet = new Set(columnsAfterAssetId.map((c: string) => c.toLowerCase()));
                            
                            columnsAfterAssetId.forEach((col: string) => {
                                // Skip if this exact column was already selected
                                if (selectedColumns.has(col.toLowerCase())) {
                                    console.log('⚠️ SKIP - Already selected:', col);
                                    return;
                                }
                                
                                // Check if C/V is a suffix (variant exists) or part of the name
                                let baseName = col.toLowerCase();
                                const endsWithC = /c$/i.test(col);
                                const endsWithV = /v$/i.test(col);
                                
                                if (endsWithC || endsWithV) {
                                    const potentialBase = col.slice(0, -1).toLowerCase();
                                    // Only treat as suffix if base column actually exists
                                    if (columnSet.has(potentialBase)) {
                                        baseName = potentialBase;
                                    }
                                }
                                
                                if (!processedBaseNames.has(baseName)) {
                                    // First time seeing this base name - find best variant
                                    const cVariant = columnsAfterAssetId.find((c: string) => 
                                        c.toLowerCase() === baseName + 'c'
                                    );
                                    const vVariant = columnsAfterAssetId.find((c: string) => 
                                        c.toLowerCase() === baseName + 'v'
                                    );
                                    
                                    // Priority: C > V > original
                                    const selectedColumn = cVariant || vVariant || col;
                                    
                                    console.log('🔵 DEDUP:', {
                                        current: col,
                                        baseName,
                                        cVariant,
                                        vVariant,
                                        selected: selectedColumn
                                    });
                                    
                                    // Only add if not already added
                                    if (!selectedColumns.has(selectedColumn.toLowerCase())) {
                                        deduplicatedColumns.push(selectedColumn);
                                        selectedColumns.add(selectedColumn.toLowerCase());
                                    }
                                    
                                    processedBaseNames.add(baseName);
                                } else {
                                    console.log('⚠️ SKIP - BaseName already processed:', col, 'baseName:', baseName);
                                }
                                // If baseName already processed, skip entirely (don't add base/V/C variants)
                            });

                            console.log('🟡 DEBUG - All Columns:', columnsAfterAssetId);
                            console.log('🟡 DEBUG - Deduplicated Columns:', deduplicatedColumns);

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

                            const joinedColumns = ['asset_id', ...deduplicatedColumns.map((col: string) => {
                                const fieldDef = findFieldDef(col);
                                return {
                                    column: col,
                                    fd_id: fieldDef?.fd_id ?? null,
                                    ft_id: fieldDef?.ft_id ?? null,
                                    ll_id: fieldDef?.ll_id ?? null,
                                    name: fieldDef?.name ?? null,
                                };
                            })];

                            console.log('🟡 DEBUG - Component Data:', componentData);
                            console.log('🟡 DEBUG - Component Columns:', componentColumns);
                            console.log('🟡 DEBUG - Deduplicated:', deduplicatedColumns.length, 'of', columnsAfterAssetId.length);
                            console.log('🟡 DEBUG - Joined Columns:', joinedColumns);
                            console.log('🟡 DEBUG - Field Defs Count:', fieldDefs.length);

                            setAssetData(componentData);
                            setAssetDataColumns(joinedColumns);
                        } else {
                            const errorMsg = componentResult.error || fieldDefResult.error || 'Unknown error';
                            console.error('Failed to fetch data:', errorMsg);
                            setFetchError(errorMsg);
                            setAssetData([]);
                            setAssetDataColumns([]);
                            setFieldDefs([]);
                        }
                    } catch (error: any) {
                        const errorMsg = error.message || 'Failed to load data';
                        console.error('Error fetching data:', error);
                        setFetchError(errorMsg);
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

    // Reset edited data when asset or tab changes
    useEffect(() => {
        setEditedData({});
        setHasChanges(false);
        setFetchError(null);
    }, [selectedAsset, selectedInfoDef]);

    // Handle field change
    const handleFieldChange = (recordIndex: number, column: string, value: any) => {
        const key = `${recordIndex}-${column}`;
        setEditedData(prev => ({ ...prev, [key]: value }));
        setHasChanges(true);
    };

    // Get current value (edited or original)
    const getCurrentValue = (recordIndex: number, column: string) => {
        // For display columns with V/C suffix, check edited data with both suffix and without
        const key = `${recordIndex}-${column}`;
        const keyWithoutSuffix = `${recordIndex}-${column.replace(/[VC]$/i, '')}`;
        
        // Check edited data first (with or without suffix)
        if (key in editedData) {
            return editedData[key];
        }
        if (keyWithoutSuffix in editedData) {
            return editedData[keyWithoutSuffix];
        }
        
        // Return original value from assetData
        return assetData[recordIndex]?.[column];
    };

    // Global search across all tabs
    const handleGlobalSearch = async () => {
        if (!globalSearchQuery.trim() || !selectedAsset || assetInfoDefs.length === 0) {
            setGlobalSearchResults([]);
            return;
        }

        setIsSearching(true);
        const results: any[] = [];
        const searchLower = globalSearchQuery.toLowerCase();

        try {
            // Search through all tabs
            for (const infoDef of assetInfoDefs) {
                const viewTableName = `CIV_${infoDef.Table_Name}`;
                
                // Fetch data for this tab
                const componentResponse = await fetch(
                    `/api/risk-analysis/asset-data?table_name=${viewTableName}&asset_id=${selectedAsset.asset_id}`
                );
                const componentResult = await componentResponse.json();

                if (componentResult.success && componentResult.data.length > 0) {
                    const componentData = componentResult.data;
                    const componentColumns = componentResult.columns || [];

                    // Fetch field definitions for this tab
                    const fieldResponse = await fetch(`/api/risk-analysis/field-def?td_id=${infoDef.td_id}`);
                    const fieldResult = await fieldResponse.json();
                    const tabFieldDefs = fieldResult.success ? fieldResult.data : [];

                    const columnsAfterAssetId = componentColumns.slice(
                        componentColumns.findIndex((col: string) => col.toLowerCase() === 'asset_id') + 1
                    );

                    // Search in each column
                    columnsAfterAssetId.forEach((column: string) => {
                        if (column.toLowerCase() === 'asset_id') return;

                        // Find field definition for this column
                        const normalizeName = (value: string) =>
                            value?.trim().replace(/[\s_]/g, '').toLowerCase();

                        const fieldDef = tabFieldDefs.find((field: any) => {
                            const fieldNameNorm = normalizeName(field.Field_Name);
                            const columnNorm = normalizeName(column);
                            const columnBaseNorm = normalizeName(column.replace(/[VC]$/i, ''));
                            return (
                                fieldNameNorm === columnNorm ||
                                fieldNameNorm === columnBaseNorm
                            );
                        });

                        const fieldName = fieldDef?.name || column;
                        const currentValue = componentData[0]?.[column];
                        const valueStr = String(currentValue || '').toLowerCase();

                        // Check if matches search query
                        const nameMatch = fieldName.toLowerCase().includes(searchLower);
                        const columnMatch = column.toLowerCase().includes(searchLower);
                        const valueMatch = valueStr.includes(searchLower);

                        if (nameMatch || columnMatch || valueMatch) {
                            results.push({
                                tabName: infoDef.name,
                                tabTdId: infoDef.td_id,
                                fieldName: fieldName,
                                column: column,
                                value: currentValue,
                                fdId: fieldDef?.fd_id || null,
                                ftId: fieldDef?.ft_id || null,
                                llId: fieldDef?.ll_id || null,
                            });
                        }
                    });
                }
            }

            setGlobalSearchResults(results);
        } catch (error) {
            console.error('Error in global search:', error);
            Swal.fire({
                title: 'Search Error',
                text: 'An error occurred while searching',
                icon: 'error',
            });
        } finally {
            setIsSearching(false);
        }
    };

    // Execute search when query changes (with debounce would be better, but simple approach)
    useEffect(() => {
        if (showGlobalSearch && globalSearchQuery.trim()) {
            const timer = setTimeout(() => {
                handleGlobalSearch();
            }, 500); // 500ms debounce
            return () => clearTimeout(timer);
        } else {
            setGlobalSearchResults([]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [globalSearchQuery, showGlobalSearch]);

    // Keyboard shortcut for ESC to close modal
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && showGlobalSearch) {
                setShowGlobalSearch(false);
                setGlobalSearchQuery('');
                setGlobalSearchResults([]);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showGlobalSearch]);

    // Handle save
    const handleSave = async () => {
        if (!hasChanges || isSaving || !selectedAsset) return;

        const result = await Swal.fire({
            title: 'Save Changes?',
            text: 'Are you sure you want to save the changes?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, save it!',
            cancelButtonText: 'Cancel',
        });

        if (!result.isConfirmed) return;

        setIsSaving(true);

        try {
            const selectedInfo = assetInfoDefs.find(info => info.name === selectedInfoDef);
            if (!selectedInfo) throw new Error('Selected info not found');

            // UPDATE: Use CIG_ prefix for write operations (editable table)
            const writeTableName = `CIG_${selectedInfo.Table_Name}`;
            // FETCH: Use CIV_ prefix for refetch after save (complete view)
            const viewTableName = `CIV_${selectedInfo.Table_Name}`;

            console.log('🟢 SAVE - Write table:', writeTableName);
            console.log('🟢 SAVE - View table (refetch):', viewTableName);

            // Build updates array - keep column names as-is (including V/C suffix)
            // CIG table should have same columns as CIV view (with suffix)
            const updates = Object.entries(editedData).map(([key, value]) => {
                const [recordIndex, column] = key.split('-');
                
                console.log('🟢 Column for save:', { 
                    column: column, 
                    value,
                    valueType: typeof value
                });
                
                return {
                    record_index: parseInt(recordIndex),
                    column: column, // Keep suffix (C/V) as-is
                    value,
                };
            });

            console.log('🟢 Saving data:', {
                table_name: writeTableName,
                asset_id: selectedAsset.asset_id,
                updates_count: updates.length,
                updates,
            });

            const response = await fetch('/api/risk-analysis/component-data/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    table_name: writeTableName,
                    asset_id: selectedAsset.asset_id,
                    updates,
                }),
            });

            const result = await response.json();
            console.log('🟢 Save result:', result);

            if (result.success) {
                await Swal.fire({
                    title: 'Success!',
                    text: `${result.total_updates} record(s) updated successfully`,
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false,
                });

                // Clear edited data first
                setEditedData({});
                setHasChanges(false);

                // Refetch data to get updated calculated fields (use VIEW for complete data)
                setLoadingAssetData(true);
                try {
                    console.log('🟢 REFETCH - View table:', viewTableName);
                    const componentResponse = await fetch(
                        `/api/risk-analysis/asset-data?table_name=${viewTableName}&asset_id=${selectedAsset.asset_id}`
                    );
                    const componentResult = await componentResponse.json();

                    if (componentResult.success) {
                        const componentData = componentResult.data;
                        const componentColumns = componentResult.columns || [];
                        
                        // Re-join with field definitions (same logic as initial fetch)
                        const columnsAfterAssetId = componentColumns.slice(
                            componentColumns.findIndex((col: string) => col.toLowerCase() === 'asset_id') + 1
                        );

                        // Remove duplicate columns with V/C suffixes - prioritize C > V > original
                        const deduplicatedColumns: string[] = [];
                        const processedBaseNames = new Set<string>();
                        const selectedColumns = new Set<string>(); // Track which exact columns we've selected
                        
                        // Build a set for fast column lookup
                        const columnSet = new Set(columnsAfterAssetId.map((c: string) => c.toLowerCase()));
                        
                        columnsAfterAssetId.forEach((col: string) => {
                            // Skip if this exact column was already selected
                            if (selectedColumns.has(col.toLowerCase())) {
                                return;
                            }
                            
                            // Check if C/V is a suffix (variant exists) or part of the name
                            let baseName = col.toLowerCase();
                            const endsWithC = /c$/i.test(col);
                            const endsWithV = /v$/i.test(col);
                            
                            if (endsWithC || endsWithV) {
                                const potentialBase = col.slice(0, -1).toLowerCase();
                                // Only treat as suffix if base column actually exists
                                if (columnSet.has(potentialBase)) {
                                    baseName = potentialBase;
                                }
                            }
                            
                            if (!processedBaseNames.has(baseName)) {
                                // First time seeing this base name - find best variant
                                const cVariant = columnsAfterAssetId.find((c: string) => 
                                    c.toLowerCase() === baseName + 'c'
                                );
                                const vVariant = columnsAfterAssetId.find((c: string) => 
                                    c.toLowerCase() === baseName + 'v'
                                );
                                
                                // Priority: C > V > original
                                const selectedColumn = cVariant || vVariant || col;
                                
                                // Only add if not already added
                                if (!selectedColumns.has(selectedColumn.toLowerCase())) {
                                    deduplicatedColumns.push(selectedColumn);
                                    selectedColumns.add(selectedColumn.toLowerCase());
                                }
                                
                                processedBaseNames.add(baseName);
                            }
                            // If baseName already processed, skip entirely (don't add base/V/C variants)
                        });

                        const normalizeName = (value: string) =>
                            value?.trim().replace(/[\s_]/g, '').toLowerCase();

                        const findFieldDef = (col: string) => {
                            const base = normalizeName(col.replace(/[VC]$/i, ''));
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

                        const joinedColumns = ['asset_id', ...deduplicatedColumns.map((col: string) => {
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
                    }
                } finally {
                    setLoadingAssetData(false);
                }
            } else {
                throw new Error(result.error || 'Failed to save');
            }
        } catch (error: any) {
            console.error('Error saving:', error);
            Swal.fire({
                title: 'Error!',
                text: error.message || 'Failed to save changes',
                icon: 'error',
            });
        } finally {
            setIsSaving(false);
        }
    };

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
                                {/* Global Search Button */}
                                <div className="flex items-center justify-between">
                                    <h6 className="text-md font-semibold dark:text-white-light">Information Tabs</h6>
                                    <button
                                        type="button"
                                        onClick={() => setShowGlobalSearch(true)}
                                        className="btn btn-outline-primary btn-sm flex items-center gap-2"
                                        disabled={!selectedAsset || assetInfoDefs.length === 0}
                                    >
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                        Search All Fields
                                    </button>
                                </div>

                                {/* Info Definition Dropdown */}
                                <div>
                                    <label className="mb-2 block text-sm font-medium">Select Information</label>
                                    <Select
                                        placeholder={
                                            loadingInfoDefs
                                                ? 'Loading...'
                                                : assetInfoDefs.length === 0
                                                ? 'No information available'
                                                : 'Search or select information...'
                                        }
                                        value={
                                            selectedInfoDef
                                                ? { value: selectedInfoDef, label: selectedInfoDef }
                                                : null
                                        }
                                        onChange={(option) => setSelectedInfoDef(option?.value || '')}
                                        options={assetInfoDefs.map((info) => ({
                                            value: info.name,
                                            label: info.name,
                                        }))}
                                        isDisabled={loadingInfoDefs || assetInfoDefs.length === 0}
                                        isLoading={loadingInfoDefs}
                                        isClearable={false}
                                        isSearchable={true}
                                    />
                                </div>

                                {/* Selected Dropdown Description */}
                                {selectedInfoDef && assetInfoDefs.length > 0 && (
                                    <div className="panel">
                                        <h5 className="mb-4 text-lg font-semibold dark:text-white-light">{selectedInfoDef}</h5>
                                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                            <div className="flex items-center justify-between rounded-md bg-gray-50 dark:bg-gray-800 p-3">
                                                <span className="text-sm font-medium">Table Name:</span>
                                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                                    {`CIG_${assetInfoDefs.find((info) => info.name === selectedInfoDef)?.Table_Name || ''}`}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between rounded-md bg-gray-50 dark:bg-gray-800 p-3">
                                                <span className="text-sm font-medium">TD_ID:</span>
                                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                                    {assetInfoDefs.find((info) => info.name === selectedInfoDef)?.td_id || '-'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Component Information Table - Traditional 2-Column */}
                                        <div className="mt-4">
                                            <div className="flex items-center justify-between mb-3">
                                                <h6 className="text-md font-semibold dark:text-white-light">Component Information</h6>
                                                <div className="flex items-center gap-2">
                                                    {/* Search Field Input */}
                                                    <input
                                                        type="text"
                                                        placeholder="Search fields..."
                                                        value={searchField}
                                                        onChange={(e) => setSearchField(e.target.value)}
                                                        className="form-input w-64"
                                                    />
                                                    {hasChanges && !loadingAssetData && (
                                                        <button
                                                            type="button"
                                                            onClick={handleSave}
                                                            disabled={isSaving}
                                                            className="btn btn-primary btn-sm"
                                                        >
                                                            {isSaving ? 'Saving...' : 'Save Changes'}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            {fetchError ? (
                                                <div className="rounded-md border border-red-200 bg-red-50 dark:border-red-700 dark:bg-red-900/20 p-4">
                                                    <p className="text-sm text-red-600 dark:text-red-400">
                                                        <strong>Error loading data:</strong> {fetchError}
                                                    </p>
                                                    <p className="text-xs text-red-500 dark:text-red-500 mt-2">
                                                        This tab may not have data for the selected equipment, or there may be a database issue.
                                                    </p>
                                                </div>
                                            ) : loadingAssetData ? (
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
                                                                <th>Parameter</th>
                                                                <th>Value</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {assetDataColumns
                                                                .filter((columnInfo) => {
                                                                    if (!searchField.trim()) return true;
                                                                    
                                                                    const column = typeof columnInfo === 'string' ? columnInfo : columnInfo.column;
                                                                    const name = typeof columnInfo === 'object' ? columnInfo.name : column;
                                                                    const recordIndex = 0;
                                                                    const currentValue = getCurrentValue(recordIndex, column);
                                                                    
                                                                    const searchLower = searchField.toLowerCase();
                                                                    const nameMatch = name?.toLowerCase().includes(searchLower);
                                                                    const columnMatch = column?.toLowerCase().includes(searchLower);
                                                                    const valueMatch = String(currentValue || '').toLowerCase().includes(searchLower);
                                                                    
                                                                    return nameMatch || columnMatch || valueMatch;
                                                                })
                                                                .map((columnInfo, colIndex) => {
                                                                // Skip asset_id column
                                                                if (typeof columnInfo === 'string' && columnInfo.toLowerCase() === 'asset_id') {
                                                                    return null;
                                                                }

                                                                const column = typeof columnInfo === 'string' ? columnInfo : columnInfo.column;
                                                                const fdId = typeof columnInfo === 'object' ? columnInfo.fd_id : null;
                                                                const ftId = typeof columnInfo === 'object' ? columnInfo.ft_id : null;
                                                                const llId = typeof columnInfo === 'object' ? columnInfo.ll_id : null;
                                                                const name = typeof columnInfo === 'object' ? columnInfo.name : column;
                                                                const isFt1 = ftId === 1;
                                                                const isFt6 = ftId === 6;
                                                                const isFt40 = ftId === 40;
                                                                const isFt37 = ftId === 37;
                                                                const lookupOptions =
                                                                    llId !== null && llId !== undefined
                                                                        ? lookupItemsByLlId[llId]
                                                                        : undefined;

                                                                // Use first record (index 0)
                                                                const recordIndex = 0;
                                                                const currentValue = getCurrentValue(recordIndex, column);
                                                                
                                                                // For dropdowns, find matching option by comparing:
                                                                // - li_id (if currentValue is numeric ID)
                                                                // - value (string value)
                                                                // - comments (display text)
                                                                const normalizeForMatch = (val: any) =>
                                                                    val === null || val === undefined
                                                                        ? ''
                                                                        : String(val).trim().toLowerCase();

                                                                const matchingOption = Array.isArray(lookupOptions)
                                                                    ? lookupOptions.find((item: any) => {
                                                                          // Try exact numeric match (li_id)
                                                                          if (typeof currentValue === 'number' && item.li_id === currentValue) {
                                                                              return true;
                                                                          }
                                                                          
                                                                          // Try string match (value or comments)
                                                                          const currVal = normalizeForMatch(currentValue);
                                                                          if (!currVal) return false;
                                                                          
                                                                          const normalizedVal = normalizeForMatch(item.value);
                                                                          const normalizedComments = normalizeForMatch(item.comments);
                                                                          
                                                                          return (
                                                                              normalizedVal === currVal ||
                                                                              normalizedComments === currVal
                                                                          );
                                                                      })
                                                                    : undefined;

                                                                console.log('🔵 Dropdown Debug:', {
                                                                    column,
                                                                    currentValue,
                                                                    currentValueType: typeof currentValue,
                                                                    matchingOption,
                                                                    lookupOptionsCount: lookupOptions?.length
                                                                });

                                                                return (
                                                                    <tr key={colIndex}>
                                                                        <td>{fdId !== null ? fdId : '-'}</td>
                                                                        <td>{ftId !== null ? ftId : '-'}</td>
                                                                        <td>{llId !== null ? llId : '-'}</td>
                                                                        <td>{name || column}</td>
                                                                        <td
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
                                                                            {isFt37 && Array.isArray(lookupOptions) && lookupOptions.length > 0 ? (
                                                                                <select
                                                                                    className="form-select"
                                                                                    style={{ color: 'darkblue' }}
                                                                                    value={matchingOption?.comments || matchingOption?.value || ''}
                                                                                    onChange={(e) => {
                                                                                        const selectedValue = e.target.value;
                                                                                        console.log('🔵 Dropdown onChange:', { selectedValue, column });
                                                                                        
                                                                                        // Find option by comparing comments first, then value
                                                                                        const selectedOption = lookupOptions.find(
                                                                                            (item: any) =>
                                                                                                item.comments === selectedValue ||
                                                                                                item.value === selectedValue
                                                                                        );
                                                                                        
                                                                                        console.log('🔵 Selected Option:', selectedOption);
                                                                                        
                                                                                        // For dropdown (FT_ID=37), save li_id to column WITHOUT suffix
                                                                                        // because CIG table stores numeric ID, not display text
                                                                                        const columnForSave = column.replace(/[VC]$/i, ''); // Strip suffix
                                                                                        const valueToSave = selectedOption?.li_id; // Save numeric ID
                                                                                        
                                                                                        console.log('🔵 Saving:', {
                                                                                            displayColumn: column,
                                                                                            saveColumn: columnForSave,
                                                                                            displayValue: selectedValue,
                                                                                            saveValue: valueToSave
                                                                                        });
                                                                                        
                                                                                        handleFieldChange(
                                                                                            recordIndex,
                                                                                            columnForSave,
                                                                                            valueToSave
                                                                                        );
                                                                                    }}
                                                                                    disabled={isFt40}
                                                                                >
                                                                                    <option value="" disabled>
                                                                                        Select value
                                                                                    </option>
                                                                                    {lookupOptions.map((item: any) => (
                                                                                        <option
                                                                                            key={item.li_id}
                                                                                            value={item.comments || item.value}
                                                                                        >
                                                                                            {item.comments || item.value}
                                                                                        </option>
                                                                                    ))}
                                                                                </select>
                                                                            ) : isFt1 ? (
                                                                                <input
                                                                                    type="text"
                                                                                    className="form-input w-full"
                                                                                    style={{ color: 'darkgreen' }}
                                                                                    value={currentValue ?? ''}
                                                                                    onChange={(e) => {
                                                                                        // Save to base column (without V/C suffix) for CIG table compatibility
                                                                                        const saveColumn = column.replace(/[VC]$/i, '');
                                                                                        handleFieldChange(recordIndex, saveColumn, e.target.value);
                                                                                    }}
                                                                                    disabled={isFt40}
                                                                                />
                                                                            ) : isFt6 ? (
                                                                                <input
                                                                                    type="number"
                                                                                    step="any"
                                                                                    className="form-input w-full"
                                                                                    style={{ color: 'darkmagenta' }}
                                                                                    value={currentValue ?? ''}
                                                                                    onChange={(e) => {
                                                                                        // Save to base column (without V/C suffix) for CIG table compatibility
                                                                                        const saveColumn = column.replace(/[VC]$/i, '');
                                                                                        handleFieldChange(
                                                                                            recordIndex,
                                                                                            saveColumn,
                                                                                            e.target.value ? parseFloat(e.target.value) : null
                                                                                        );
                                                                                    }}
                                                                                    disabled={isFt40}
                                                                                />
                                                                            ) : isFt40 ? (
                                                                                <div className="form-input w-full" style={{ color: 'darkorange', backgroundColor: '#f9fafb' }}>
                                                                                    {currentValue !== null && currentValue !== undefined
                                                                                        ? String(currentValue)
                                                                                        : '-'}
                                                                                </div>
                                                                            ) : (
                                                                                <input
                                                                                    type="text"
                                                                                    className="form-input w-full"
                                                                                    value={currentValue ?? ''}
                                                                                    onChange={(e) =>
                                                                                        handleFieldChange(recordIndex, column, e.target.value)
                                                                                    }
                                                                                />
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            }).filter(Boolean)}
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

            {/* Global Search Modal */}
            {showGlobalSearch && (
                <div className="fixed inset-0 z-[999] flex items-start justify-center bg-black/60 pt-20" onClick={() => setShowGlobalSearch(false)}>
                    <div className="w-full max-w-3xl rounded-lg bg-white dark:bg-gray-800 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div className="border-b border-gray-200 dark:border-gray-700 p-4">
                            <div className="flex items-center gap-3">
                                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <input
                                    type="text"
                                    placeholder="Search all fields across all tabs..."
                                    value={globalSearchQuery}
                                    onChange={(e) => setGlobalSearchQuery(e.target.value)}
                                    className="flex-1 border-0 bg-transparent text-lg outline-none dark:text-white"
                                    autoFocus
                                />
                                <button
                                    onClick={() => {
                                        setShowGlobalSearch(false);
                                        setGlobalSearchQuery('');
                                        setGlobalSearchResults([]);
                                    }}
                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                >
                                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Modal Body - Search Results */}
                        <div className="max-h-[500px] overflow-y-auto p-2">
                            {isSearching ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="text-center">
                                        <div className="mb-2 inline-block h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-primary"></div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Searching...</p>
                                    </div>
                                </div>
                            ) : globalSearchQuery.trim() === '' ? (
                                <div className="py-12 text-center">
                                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                                        Type to search across all information tabs
                                    </p>
                                    <p className="mt-1 text-xs text-gray-400">
                                        Press <kbd className="rounded border px-1.5 py-0.5">ESC</kbd> to close
                                    </p>
                                </div>
                            ) : globalSearchResults.length === 0 ? (
                                <div className="py-12 text-center">
                                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 12h.01M12 12h.01M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                                        No results found for "{globalSearchQuery}"
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                                        Found {globalSearchResults.length} result{globalSearchResults.length !== 1 ? 's' : ''}
                                    </div>
                                    {globalSearchResults.map((result, index) => (
                                        <button
                                            key={index}
                                            onClick={() => {
                                                setSelectedInfoDef(result.tabName);
                                                setShowGlobalSearch(false);
                                                setGlobalSearchQuery('');
                                                setGlobalSearchResults([]);
                                            }}
                                            className="w-full rounded-md p-3 text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="inline-block rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                                            {result.tabName}
                                                        </span>
                                                        {result.fdId && (
                                                            <span className="text-xs text-gray-400">FD: {result.fdId}</span>
                                                        )}
                                                    </div>
                                                    <div className="mt-1 font-medium text-gray-900 dark:text-white">
                                                        {result.fieldName}
                                                    </div>
                                                    <div className="mt-1 truncate text-sm text-gray-600 dark:text-gray-300">
                                                        {result.value !== null && result.value !== undefined && result.value !== '' 
                                                            ? String(result.value) 
                                                            : <span className="italic text-gray-400">Empty</span>
                                                        }
                                                    </div>
                                                </div>
                                                <svg className="mt-1 h-5 w-5 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3">
                            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-1">
                                        <kbd className="rounded border border-gray-300 px-1.5 py-0.5 dark:border-gray-600">↑</kbd>
                                        <kbd className="rounded border border-gray-300 px-1.5 py-0.5 dark:border-gray-600">↓</kbd>
                                        <span>Navigate</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <kbd className="rounded border border-gray-300 px-1.5 py-0.5 dark:border-gray-600">Enter</kbd>
                                        <span>Select</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <kbd className="rounded border border-gray-300 px-1.5 py-0.5 dark:border-gray-600">ESC</kbd>
                                        <span>Close</span>
                                    </div>
                                </div>
                                <div>
                                    Searching across {assetInfoDefs.length} tab{assetInfoDefs.length !== 1 ? 's' : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Component;
