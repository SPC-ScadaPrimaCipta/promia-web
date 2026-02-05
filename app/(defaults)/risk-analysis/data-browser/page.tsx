'use client';

import Link from 'next/link';
import React, { useMemo, useState, useEffect } from 'react';
import { Tree, ControlledTreeEnvironment, TreeItem } from 'react-complex-tree';
import 'react-complex-tree/lib/style-modern.css';

// Custom styles for tree
const treeStyles = `
    .rct-tree-root {
        max-width: 600px;
    }
    .rct-tree-item-li {
        max-width: 100%;
    }
    .rct-tree-item-title-container {
        max-width: fit-content !important;
        min-width: 200px;
        overflow: visible;
        display: inline-flex !important;
    }
    .rct-tree-item-title-container-selected,
    .rct-tree-item-title-container-focused {
        max-width: fit-content !important;
        min-width: 200px;
        display: inline-flex !important;
        background-color: transparent !important;
    }
    .rct-tree-item-title-container-selected {
        background-color: rgba(59, 130, 246, 0.1) !important;
        border-radius: 4px;
        padding: 2px 8px;
    }
    .rct-tree-item-title {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .rct-tree-item {
        width: fit-content !important;
    }
`;

interface CategoryItem {
    id: string;
    name: string;
    table: string;
}

interface ColumnItem {
    name: string;
    type: string;
    displayName: string;
}

interface TreeRow extends TreeItem<{ label: string; categoryId?: string; columnName?: string }> {
    index: string;
    children?: string[];
    data: { label: string; categoryId?: string; columnName?: string };
    isFolder?: boolean;
}

interface CategoryData {
    columns: any[];
    data: any[];
}

type TreeRows = Record<string, TreeRow>;

const DataBrowser = () => {
    const [rows, setRows] = useState<TreeRows>({});
    const [loading, setLoading] = useState(true);
    const [expandedItems, setExpandedItems] = useState<string[]>([]);
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [checkedColumns, setCheckedColumns] = useState<Record<string, string[]>>({}); // {categoryId: [columnName1, columnName2]}
    const [categoryColumns, setCategoryColumns] = useState<Record<string, ColumnItem[]>>({}); // Cache columns
    const [categoryData, setCategoryData] = useState<CategoryData | null>(null);
    const [loadingData, setLoadingData] = useState(false);
    const [topValue, setTopValue] = useState<number>(10); // Default TOP 10
    const [useTop, setUseTop] = useState<boolean>(true); // Checkbox for TOP
    const [rowCount, setRowCount] = useState<number | null>(null);
    const [generatedSQL, setGeneratedSQL] = useState<string>(''); // Store generated SQL
    const [showSQL, setShowSQL] = useState<boolean>(false); // Toggle SQL panel

    useEffect(() => {
        fetchDataBrowserData();
    }, []);

    const fetchDataBrowserData = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/risk-analysis/data-browser');
            const result = await response.json();

            if (result.success) {
                const transformedData = transformToTreeStructure(result.cig, result.cri, result.risk || []);
                setRows(transformedData);
            }
        } catch (error) {
            console.error('Error fetching data browser:', error);
        } finally {
            setLoading(false);
        }
    };

    const transformToTreeStructure = (cigCategories: CategoryItem[], criCategories: CategoryItem[], riskCategories: CategoryItem[]): TreeRows => {
        const treeData: TreeRows = {
            root: {
                index: 'root',
                children: ['cig', 'cri', 'risk'],
                data: { label: 'Data Browser' },
                isFolder: true,
            },
            cig: {
                index: 'cig',
                children: [],
                data: { label: 'CIG' },
                isFolder: true,
            },
            cri: {
                index: 'cri',
                children: [],
                data: { label: 'CRI' },
                isFolder: true,
            },
            risk: {
                index: 'risk',
                children: [],
                data: { label: 'RISK' },
                isFolder: true,
            },
        };

        // Add all CIG categories as folders (expandable)
        const cigCategoryIds: string[] = [];
        cigCategories.forEach((category) => {
            treeData[category.id] = {
                index: category.id,
                children: [], // Will be populated when expanded
                data: { label: category.name, categoryId: category.id },
                isFolder: true, // Categories are folders now
            };
            cigCategoryIds.push(category.id);
        });
        treeData.cig.children = cigCategoryIds;

        // Add all CRI categories as folders (expandable)
        const criCategoryIds: string[] = [];
        criCategories.forEach((category) => {
            treeData[category.id] = {
                index: category.id,
                children: [], // Will be populated when expanded
                data: { label: category.name, categoryId: category.id },
                isFolder: true, // Categories are folders now
            };
            criCategoryIds.push(category.id);
        });
        treeData.cri.children = criCategoryIds;

        // Add all RISK categories as folders (expandable)
        const riskCategoryIds: string[] = [];
        riskCategories.forEach((category) => {
            treeData[category.id] = {
                index: category.id,
                children: [], // Will be populated when expanded
                data: { label: category.name, categoryId: category.id },
                isFolder: true, // Categories are folders now
            };
            riskCategoryIds.push(category.id);
        });
        treeData.risk.children = riskCategoryIds;

        return treeData;
    };

    const fetchCategoryColumns = async (categoryId: string) => {
        // Check cache first
        if (categoryColumns[categoryId]) {
            console.log(`Using cached columns for ${categoryId}`);
            return categoryColumns[categoryId];
        }

        console.log(`Fetching columns for category: ${categoryId}`);
        try {
            const response = await fetch(`/api/risk-analysis/data-browser/columns?category=${categoryId}`);
            console.log(`Response status for ${categoryId}:`, response.status);
            const result = await response.json();
            console.log(`Result for ${categoryId}:`, result);

            if (result.success && result.columns) {
                // Filter out Asset_ID and other metadata columns
                const filteredColumns = result.columns.filter((col: any) => 
                    !['Asset_ID', 'ASSET_ID', 'asset_id'].includes(col.name)
                );
                
                const columns = filteredColumns.map((col: any) => ({
                    name: col.name,
                    type: col.type,
                    displayName: col.name.replace(/_/g, ' ')
                        .split(' ')
                        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                        .join(' ')
                }));
                
                console.log(`Setting ${columns.length} columns for ${categoryId}`);
                setCategoryColumns(prev => ({ ...prev, [categoryId]: columns }));
                return columns;
            } else {
                console.error(`Failed to fetch columns for ${categoryId}:`, result.error);
            }
            return [];
        } catch (error) {
            console.error(`Error fetching columns for ${categoryId}:`, error);
            return [];
        }
    };

    const handleCategoryExpand = async (categoryId: string) => {
        console.log(`handleCategoryExpand called for: ${categoryId}`);
        // Fetch columns if not already loaded
        const columns = await fetchCategoryColumns(categoryId);
        
        console.log(`Got ${columns.length} columns for ${categoryId}`);
        if (columns.length > 0) {
            // Update tree to include column children
            setRows(prev => {
                const newRows = { ...prev };
                const columnIds = columns.map((col: ColumnItem) => `${categoryId}-${col.name}`);
                
                // Update category to have children
                newRows[categoryId] = {
                    ...newRows[categoryId],
                    children: columnIds,
                };
                
                // Add column items
                columns.forEach((col: ColumnItem) => {
                    const itemId = `${categoryId}-${col.name}`;
                    newRows[itemId] = {
                        index: itemId,
                        children: [],
                        data: { 
                            label: col.displayName,
                            categoryId: categoryId,
                            columnName: col.name
                        },
                        isFolder: false,
                    };
                });
                
                return newRows;
            });
        }
    };

    const runSQL = async () => {
        // Get all checked columns across all categories
        const hasCheckedColumns = Object.values(checkedColumns).some(cols => cols.length > 0);
        
        if (!hasCheckedColumns) {
            alert('Please check at least one column');
            return;
        }

        try {
            setLoadingData(true);
            
            // Build query parameters for multiple categories
            const categoriesWithColumns: Record<string, string[]> = {};
            Object.keys(checkedColumns).forEach(catId => {
                if (checkedColumns[catId].length > 0) {
                    categoriesWithColumns[catId] = checkedColumns[catId];
                }
            });
            
            // Send as JSON in request body
            const response = await fetch('/api/risk-analysis/data-browser', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    categories: categoriesWithColumns,
                    top: useTop ? topValue : null
                })
            });
            const result = await response.json();

            if (result.success) {
                setCategoryData(result);
                setGeneratedSQL(result.query || '');
                setRowCount(result.data?.length || 0);
            } else {
                alert('Failed to load category data: ' + result.error);
                setGeneratedSQL('');
                setRowCount(null);
            }
        } catch (error) {
            console.error('Error fetching category data:', error);
            alert('Error fetching category data');
        } finally {
            setLoadingData(false);
        }
    };

    const toggleColumn = (categoryId: string, columnName: string) => {
        setCheckedColumns(prev => {
            const categoryChecked = prev[categoryId] || [];
            
            if (categoryChecked.includes(columnName)) {
                // Uncheck column
                return {
                    ...prev,
                    [categoryId]: categoryChecked.filter(col => col !== columnName)
                };
            } else {
                // Check column
                return {
                    ...prev,
                    [categoryId]: [...categoryChecked, columnName]
                };
            }
        });
    };

    const toggleAllColumnsInCategory = (categoryId: string) => {
        const columns = categoryColumns[categoryId];
        if (!columns) return;

        const currentChecked = checkedColumns[categoryId] || [];
        const allColumnNames = columns.map(col => col.name);
        
        // If all are checked, uncheck all. Otherwise, check all
        const allChecked = allColumnNames.every(name => currentChecked.includes(name));
        
        setCheckedColumns(prev => ({
            ...prev,
            [categoryId]: allChecked ? [] : allColumnNames
        }));
    };

    const items = useMemo(() => rows, [rows]);

    const renderRow = (item: TreeRow) => {
        const isRoot = item.index === 'root';
        const isCIG = item.index === 'cig';
        const isCRI = item.index === 'cri';
        const isRISK = item.index === 'risk';
        const isCategory = item.data.categoryId && !item.data.columnName;
        const isColumn = item.data.categoryId && item.data.columnName;
        
        // Calculate indent based on hierarchy
        let indent = 0;
        if (isRoot) indent = 0;
        else if (isCIG || isCRI || isRISK) indent = 20;
        else if (isCategory) indent = 40;
        else if (isColumn) indent = 60;
        
        // Check state for columns
        const isColumnChecked = isColumn && 
            checkedColumns[item.data.categoryId!]?.includes(item.data.columnName!);
        
        // Check state for category (all children checked?)
        const isCategoryChecked = isCategory && categoryColumns[item.data.categoryId!] && 
            categoryColumns[item.data.categoryId!].length > 0 &&
            categoryColumns[item.data.categoryId!].every(col => 
                checkedColumns[item.data.categoryId!]?.includes(col.name)
            );
        
        // Indeterminate state for category (some but not all checked)
        const isCategoryIndeterminate = isCategory && categoryColumns[item.data.categoryId!] &&
            (checkedColumns[item.data.categoryId!]?.length > 0) &&
            !isCategoryChecked;
        
        return (
            <div style={{ 
                display: 'flex',
                alignItems: 'center',
                paddingLeft: `${indent}px`,
                fontWeight: item.isFolder ? 600 : 400,
                fontSize: '13px',
                gap: '8px',
            }}>
                {isCategory && (
                    <input 
                        type="checkbox"
                        checked={isCategoryChecked || false}
                        ref={(el) => {
                            if (el) el.indeterminate = isCategoryIndeterminate || false;
                        }}
                        onChange={(e) => {
                            e.stopPropagation();
                            toggleAllColumnsInCategory(item.data.categoryId!);
                        }}
                        className="form-checkbox"
                    />
                )}
                {isColumn && (
                    <input 
                        type="checkbox"
                        checked={isColumnChecked || false}
                        onChange={(e) => {
                            e.stopPropagation();
                            toggleColumn(item.data.categoryId!, item.data.columnName!);
                        }}
                        className="form-checkbox"
                    />
                )}
                {item.data.label}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <span className="inline-flex h-10 w-10 animate-spin rounded-full border-4 border-transparent border-l-primary"></span>
            </div>
        );
    }

    return (
        <div>
            <style>{treeStyles}</style>
            <ul className="mb-6 flex space-x-2 rtl:space-x-reverse">
                <li>
                    <Link href="#" className="text-primary hover:underline">
                        Risk Analysis
                    </Link>
                </li>
                <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                    <span>Data Browser</span>
                </li>
            </ul>

            <div className="panel">
                <div className="mb-5 flex items-center justify-between">
                    <h5 className="text-lg font-semibold dark:text-white-light">Data Browser</h5>
                    <div className="flex gap-3 items-center">
                        <button 
                            className="btn btn-success btn-sm" 
                            onClick={runSQL}
                            disabled={Object.values(checkedColumns).every(cols => cols.length === 0) || loadingData}
                        >
                            {loadingData ? 'Loading...' : 'Run SQL'}
                        </button>
                        <button 
                            className="btn btn-info btn-sm" 
                            onClick={() => setShowSQL(!showSQL)}
                        >
                            {showSQL ? 'Hide SQL' : 'Show SQL'}
                        </button>
                    </div>
                </div>

                {/* Top Controls */}
                <div className="mb-4 flex items-center gap-4 border-b pb-4">
                    <div className="flex items-center gap-2">
                        <input 
                            type="checkbox" 
                            checked={useTop}
                            onChange={(e) => setUseTop(e.target.checked)}
                            className="form-checkbox"
                        />
                        <label className="text-sm font-medium">Top</label>
                        <input 
                            type="number" 
                            min="1" 
                            max="10000"
                            value={topValue}
                            onChange={(e) => setTopValue(parseInt(e.target.value) || 10)}
                            disabled={!useTop}
                            className="form-input w-24 py-1"
                        />
                    </div>
                    <button 
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => {
                            setCheckedColumns({});
                            setExpandedItems([]);
                            setCategoryData(null);
                            setRowCount(null);
                            setGeneratedSQL('');
                        }}
                    >
                        Reset
                    </button>
                    {rowCount !== null && (
                        <div className="flex items-center gap-2 ml-auto">
                            <span className="text-sm font-medium">Count Row:</span>
                            <span className="text-sm bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded">{rowCount}</span>
                        </div>
                    )}
                </div>

                {/* Tree View */}
                <div className="border border-gray-200 dark:border-gray-700 rounded p-4" style={{ maxHeight: '500px', overflowY: 'auto', overflowX: 'hidden' }}>
                    <ControlledTreeEnvironment
                        items={items}
                        getItemTitle={(item) => item.data.label}
                        renderItemTitle={({ item }) => renderRow(item as TreeRow)}
                        viewState={{ 'data-browser': { expandedItems, selectedItems } }}
                        onExpandItem={(item) => {
                            const itemIndex = item.index as string;
                            console.log('onExpandItem called for:', itemIndex);
                            setExpandedItems((prev) => [...prev, itemIndex]);
                            
                            // Fetch columns when category is expanded
                            const treeItem = items[itemIndex] as TreeRow;
                            console.log('Tree item:', treeItem);
                            console.log('Has categoryId?', treeItem?.data?.categoryId);
                            console.log('Has columnName?', treeItem?.data?.columnName);
                            
                            // A category is a folder that has categoryId but no columnName
                            // and is not root/cig/cri
                            const isCategory = treeItem?.data?.categoryId && 
                                              !treeItem?.data?.columnName;
                            
                            console.log('Is category?', isCategory);
                            
                            if (isCategory) {
                                console.log('Expanding category:', treeItem.data.categoryId);
                                handleCategoryExpand(treeItem.data.categoryId);
                            }
                        }}
                        onCollapseItem={(item) => setExpandedItems((prev) => prev.filter((id) => id !== item.index))}
                        onSelectItems={(items) => setSelectedItems(items as string[])}
                        canDragAndDrop={false}
                        canDropOnFolder={false}
                        canReorderItems={false}
                    >
                        <Tree treeId="data-browser" rootItem="root" treeLabel="Data Browser Tree" />
                    </ControlledTreeEnvironment>
                </div>

                {/* SQL Preview Panel */}
                {showSQL && generatedSQL && (
                    <div className="mt-4 border border-gray-300 dark:border-gray-600 rounded">
                        <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 border-b border-gray-300 dark:border-gray-600">
                            <span className="text-sm font-semibold">Generated SQL</span>
                        </div>
                        <div className="p-4 bg-white dark:bg-gray-900">
                            <pre className="text-xs font-mono whitespace-pre-wrap break-words">{generatedSQL}</pre>
                        </div>
                    </div>
                )}

                {/* Data Grid */}
                {loadingData && (
                    <div className="mt-6 flex justify-center">
                        <span className="inline-flex h-8 w-8 animate-spin rounded-full border-4 border-transparent border-l-primary"></span>
                    </div>
                )}

                {categoryData && categoryData.data && categoryData.data.length > 0 && !loadingData && (
                    <div className="mt-6">
                        <h6 className="mb-3 text-md font-semibold">
                            Category Data ({categoryData.data.length} records)
                        </h6>
                        <div className="table-responsive">
                            <table className="table-hover">
                                <thead>
                                    <tr>
                                        {Object.keys(categoryData.data[0]).map((key) => (
                                            <th key={key} className="whitespace-nowrap">
                                                {key}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {categoryData.data.map((row, idx) => (
                                        <tr key={idx}>
                                            {Object.values(row).map((value: any, cellIdx) => (
                                                <td key={cellIdx} className="whitespace-nowrap">
                                                    {value !== null && value !== undefined ? String(value) : '-'}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {categoryData && categoryData.data && categoryData.data.length === 0 && !loadingData && (
                    <div className="mt-6 text-center text-gray-500">
                        <p>No data available for this category</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DataBrowser;
