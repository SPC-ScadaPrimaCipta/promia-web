'use client';

import React, { useState, useMemo } from 'react';
import { Tree, ControlledTreeEnvironment, TreeItem, TreeItemIndex } from 'react-complex-tree';
import 'react-complex-tree/lib/style-modern.css';

// Model component data structure from API
interface ModelComponentData {
    rbim_id: number;
    rbif_id: number | null;
    td_id: number | null;
    lvl: number;
    linktd_id: number | null;
    linkfd_id: number | null;
    linklinkfd_id: number | null;
    ll_id: number | null;
    ft_id: number | null;
    field_name: string | null;
    field_desc: string | null;
    table_name: string | null;
    table_desc: string | null;
    fnd_id: number | null;
    function_name: string | null;
    function_desc: string | null;
    fnp_id: number | null;
    param_types: string | null;
}

interface TreeNodeData {
    td_id: number | null;
    field_name: string;
    level: number;
    table_desc: string;
    function_name: string;
    editValue: string;
    // Additional data for logic
    ll_id: number | null;
    fnd_id: number | null;
    linkfd_id: number | null;
}

interface TreeGridItem extends TreeItem<TreeNodeData> {
    index: string;
    children?: string[];
    data: TreeNodeData;
    isFolder?: boolean;
}

interface TreeGridItems {
    [key: string]: TreeGridItem;
}

interface TreeGridExampleProps {
    selectedModelId?: string | null;
    selectedAssetId?: number | null;
}

const TreeGridExample = ({ selectedModelId, selectedAssetId }: TreeGridExampleProps) => {
    const [apiData, setApiData] = React.useState<ModelComponentData[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    // Add custom CSS for soft grid styling
    React.useEffect(() => {
        const style = document.createElement('style');
        style.textContent = `
            .rct-tree-item-li {
                border-bottom: 1px solid #f1f5f9 !important;
                transition: background-color 0.15s ease;
            }
            .rct-tree-item-li:hover {
                background-color: #f8fafc !important;
            }
            .rct-tree-item-li:nth-child(even) {
                background-color: #fafbfc;
            }
            .rct-tree-item-title-container {
                padding: 8px 12px !important;
            }
            .rct-tree-item-button {
                color: #64748b !important;
            }
            .rct-tree-item-button:hover {
                color: #334155 !important;
            }
        `;
        document.head.appendChild(style);
        return () => {
            document.head.removeChild(style);
        };
    }, []);

    // Fetch model-component data when selectedModelId changes
    React.useEffect(() => {
        const fetchModelComponent = async () => {
            if (!selectedModelId) {
                setApiData([]);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                const response = await fetch(`/api/risk-analysis/model-component?rbim_id=${selectedModelId}`);
                const result = await response.json();

                if (result.success) {
                    setApiData(result.data);
                } else {
                    setError(result.error || 'Failed to fetch model component data');
                }
            } catch (error) {
                console.error('Error fetching model component:', error);
                setError('Failed to connect to server');
            } finally {
                setLoading(false);
            }
        };

        fetchModelComponent();
    }, [selectedModelId]);

    // Build tree structure from API data
    const buildTreeFromApiData = React.useMemo(() => {
        if (!apiData.length) return {};

        const tree: TreeGridItems = {};

        // Create nodes from API data
        apiData.forEach((item, index) => {
            const nodeKey = `node-${item.td_id || index}`;
            const hasChildren = apiData.some((child) => child.linktd_id === item.td_id);

            tree[nodeKey] = {
                index: nodeKey,
                children: [],
                data: {
                    td_id: item.td_id,
                    field_name: item.field_name || item.table_name || 'Unnamed',
                    level: item.lvl,
                    table_desc: item.table_desc || '',
                    function_name: item.function_name || '',
                    editValue: '',
                    ll_id: item.ll_id,
                    fnd_id: item.fnd_id,
                    linkfd_id: item.linkfd_id,
                },
                isFolder: hasChildren,
            };
        });

        // Build parent-child relationships
        apiData.forEach((item, index) => {
            const nodeKey = `node-${item.td_id || index}`;

            if (item.linktd_id !== null) {
                // Find parent node
                const parentKey = `node-${item.linktd_id}`;
                if (tree[parentKey]) {
                    if (!tree[parentKey].children) {
                        tree[parentKey].children = [];
                    }
                    tree[parentKey].children!.push(nodeKey);
                }
            }
        });

        // Create root node
        const rootNodes = apiData
            .filter((item) => item.linktd_id === null)
            .map((item, index) => `node-${item.td_id || index}`);

        tree['root'] = {
            index: 'root',
            children: rootNodes,
            data: {
                td_id: null,
                field_name: 'Model Components',
                level: 0,
                table_desc: '',
                function_name: '',
                editValue: '',
                ll_id: null,
                fnd_id: null,
                linkfd_id: null,
            },
            isFolder: true,
        };

        return tree;
    }, [apiData]);

    const treeData = buildTreeFromApiData;

    // Sample tree data - 10 leaf nodes (5 with dropdown, 5 with textbox) - DEPRECATED
    const sampleData: TreeGridItems = {
        root: {
            index: 'root',
            children: ['node-1'],
            data: { id: 0, name: 'Root', level: 0, status: 'Active', riskValue: '' },
            isFolder: true,
        },
        'node-1': {
            index: 'node-1',
            children: ['node-2', 'node-3'],
            data: { id: 1, name: 'UBL', level: 1, status: 'Active', riskValue: '' },
            isFolder: true,
        },
        'node-2': {
            index: 'node-2',
            children: ['node-4', 'node-5', 'node-6', 'node-7', 'node-8'],
            data: { id: 2, name: 'Cluster 1', level: 2, status: 'Active', riskValue: '' },
            isFolder: true,
        },
        'node-3': {
            index: 'node-3',
            children: ['node-9', 'node-10', 'node-11', 'node-12', 'node-13'],
            data: { id: 3, name: 'Cluster 2', level: 2, status: 'Inactive', riskValue: '' },
            isFolder: true,
        },
        // Cluster 1 children - textbox only (5 nodes)
        'node-4': {
            index: 'node-4',
            children: [],
            data: { id: 4, name: 'Asset 001', level: 3, status: 'Active', riskValue: '2.5' },
            isFolder: false,
        },
        'node-5': {
            index: 'node-5',
            children: [],
            data: { id: 5, name: 'Asset 002', level: 3, status: 'Active', riskValue: '3.2' },
            isFolder: false,
        },
        'node-6': {
            index: 'node-6',
            children: [],
            data: { id: 6, name: 'Asset 003', level: 3, status: 'Active', riskValue: '1.8' },
            isFolder: false,
        },
        'node-7': {
            index: 'node-7',
            children: [],
            data: { id: 7, name: 'Asset 004', level: 3, status: 'Active', riskValue: '4.1' },
            isFolder: false,
        },
        'node-8': {
            index: 'node-8',
            children: [],
            data: { id: 8, name: 'Asset 005', level: 3, status: 'Active', riskValue: '2.9' },
            isFolder: false,
        },
        // Cluster 2 children - dropdown only (5 nodes)
        'node-9': {
            index: 'node-9',
            children: [],
            data: { id: 9, name: 'Unit A', level: 3, status: 'Inactive', riskValue: '' },
            isFolder: false,
        },
        'node-10': {
            index: 'node-10',
            children: [],
            data: { id: 10, name: 'Unit B', level: 3, status: 'Maintenance', riskValue: '' },
            isFolder: false,
        },
        'node-11': {
            index: 'node-11',
            children: [],
            data: { id: 11, name: 'Unit C', level: 3, status: 'Ready', riskValue: '' },
            isFolder: false,
        },
        'node-12': {
            index: 'node-12',
            children: [],
            data: { id: 12, name: 'Unit D', level: 3, status: 'Active', riskValue: '' },
            isFolder: false,
        },
        'node-13': {
            index: 'node-13',
            children: [],
            data: { id: 13, name: 'Unit E', level: 3, status: 'Inactive', riskValue: '' },
            isFolder: false,
        },
    };

    const [treeData, setTreeData] = useState<TreeGridItems>(sampleData);
    const [expandedItems, setExpandedItems] = useState<string[]>(['root', 'node-1', 'node-2', 'node-3']);
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [editValues, setEditValues] = useState<Record<string, { status: string; riskValue: string }>>({});

    // Get node level from tree structure
    const getNodeLevel = (nodeKey: string): number => {
        const node = treeData[nodeKey];
        return node?.data.level || 0;
    };

    // Expand to specific level
    const expandToLevel = (targetLevel: number) => {
        const itemsToExpand: string[] = [];
        Object.entries(treeData).forEach(([key, node]) => {
            if (node.data.level < targetLevel && node.isFolder) {
                itemsToExpand.push(key);
            }
        });
        setExpandedItems(itemsToExpand);
    };

    // Collapse all
    const collapseAll = () => {
        setExpandedItems(['root']);
    };

    // Expand all
    const expandAll = () => {
        const allFolders = Object.entries(treeData)
            .filter(([_, node]) => node.isFolder)
            .map(([key]) => key);
        setExpandedItems(allFolders);
    };

    // Handle status change
    const handleStatusChange = (nodeKey: string, status: string) => {
        setEditValues((prev) => ({
            ...prev,
            [nodeKey]: {
                ...prev[nodeKey],
                status,
            },
        }));
    };

    // Handle risk value change
    const handleRiskValueChange = (nodeKey: string, value: string) => {
        setEditValues((prev) => ({
            ...prev,
            [nodeKey]: {
                ...prev[nodeKey],
                riskValue: value,
            },
        }));
    };

    // Get current value (edited or original)
    const getCurrentValue = (nodeKey: string) => {
        const edited = editValues[nodeKey];
        const original = treeData[nodeKey]?.data;
        return {
            status: edited?.status || original?.status || 'Active',
            riskValue: edited?.riskValue || original?.riskValue || '',
        };
    };

    // Save all changes
    const handleSaveAll = () => {
        console.log('Saving all changes:', editValues);
        // Here you would typically send to API
        alert('Changes saved! Check console for values.');
    };

    // Custom render for tree grid row
    const renderTreeGridRow = ({ item }: { item: TreeGridItem }) => {
        const nodeKey = item.index as string;
        const currentValue = getCurrentValue(nodeKey);
        const isEditable = !item.isFolder; // Only leaf nodes are editable in this example

        return (
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 1fr 2fr',
                    gap: '8px',
                    alignItems: 'center',
                    padding: '4px 8px',
                    borderBottom: '1px solid #e5e7eb',
                }}
            >
                {/* Column 1: Tree with icon and name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{item.data.name}</span>
                </div>

                {/* Column 2: Level */}
                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                    Level {item.data.level}
                </div>

                {/* Column 3: Status (Read-only display) */}
                <div style={{ fontSize: '14px' }}>
                    <span
                        style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            backgroundColor:
                                currentValue.status === 'Active'
                                    ? '#d1fae5'
                                    : currentValue.status === 'Inactive'
                                    ? '#fee2e2'
                                    : '#fef3c7',
                            color:
                                currentValue.status === 'Active'
                                    ? '#065f46'
                                    : currentValue.status === 'Inactive'
                                    ? '#991b1b'
                                    : '#92400e',
                            fontSize: '12px',
                        }}
                    >
                        {currentValue.status}
                    </span>
                </div>

                {/* Column 4: Editable Controls */}
                <div>
                    {isEditable ? (
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {/* Show textbox only for node-4 to node-8 (Cluster 1 children) */}
                            {['node-4', 'node-5', 'node-6', 'node-7', 'node-8'].includes(nodeKey) && (
                                <input
                                    type="text"
                                    value={currentValue.riskValue}
                                    onChange={(e) => handleRiskValueChange(nodeKey, e.target.value)}
                                    placeholder="Risk value"
                                    style={{
                                        padding: '4px 8px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '4px',
                                        fontSize: '14px',
                                        width: '100%',
                                    }}
                                    onClick={(e) => e.stopPropagation()} // Prevent tree expand/collapse
                                />
                            )}

                            {/* Show dropdown only for node-9 to node-13 (Cluster 2 children) */}
                            {['node-9', 'node-10', 'node-11', 'node-12', 'node-13'].includes(nodeKey) && (
                                <select
                                    value={currentValue.status}
                                    onChange={(e) => handleStatusChange(nodeKey, e.target.value)}
                                    style={{
                                        padding: '4px 8px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '4px',
                                        fontSize: '14px',
                                        width: '100%',
                                    }}
                                    onClick={(e) => e.stopPropagation()} // Prevent tree expand/collapse
                                >
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                    <option value="Maintenance">Maintenance</option>
                                    <option value="Ready">Ready</option>
                                </select>
                            )}
                        </div>
                    ) : (
                        <span style={{ fontSize: '14px', color: '#9ca3af' }}>-</span>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex gap-2 items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
                <button
                    onClick={expandAll}
                    className="btn btn-sm btn-outline-primary"
                >
                    Expand All
                </button>
                <button
                    onClick={collapseAll}
                    className="btn btn-sm btn-outline-primary"
                >
                    Collapse All
                </button>
                <button
                    onClick={() => expandToLevel(2)}
                    className="btn btn-sm btn-outline-primary"
                >
                    Expand to Level 2
                </button>
                <button
                    onClick={() => expandToLevel(3)}
                    className="btn btn-sm btn-outline-primary"
                >
                    Expand to Level 3
                </button>
                <div className="ml-auto">
                    <button
                        onClick={handleSaveAll}
                        className="btn btn-sm btn-primary"
                    >
                        Save All Changes
                    </button>
                </div>
            </div>

            {/* Tree Grid */}
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                {/* Header */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 1fr 1fr 2fr',
                        gap: '1px',
                        padding: '14px 12px',
                        background: 'linear-gradient(to bottom, #f8fafc, #f1f5f9)',
                        borderBottom: '2px solid #e2e8f0',
                        fontWeight: 600,
                        fontSize: '13px',
                        color: '#475569',
                        letterSpacing: '0.025em',
                    }}
                >
                    <div>Equipment Tree</div>
                    <div>Level</div>
                    <div>Status</div>
                    <div>Edit</div>
                </div>

                {/* Tree */}
                <ControlledTreeEnvironment
                    items={treeData}
                    getItemTitle={(item) => item.data.name}
                    renderItemTitle={({ item }) => {
                        const treeItem = item as TreeGridItem;
                        const nodeKey = treeItem.index as string;
                        const currentValue = getCurrentValue(nodeKey);
                        const isEditable = !treeItem.isFolder;

                        return (
                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '2fr 1fr 1fr 2fr',
                                    gap: '12px',
                                    alignItems: 'center',
                                    width: '100%',
                                }}
                            >
                                {/* Column 1: Name (already has tree icon from react-complex-tree) */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    fontWeight: treeItem.isFolder ? 500 : 400,
                                    color: treeItem.isFolder ? '#334155' : '#475569',
                                }}>
                                    <span>{treeItem.data.name}</span>
                                </div>

                                {/* Column 2: Level */}
                                <div style={{
                                    fontSize: '13px',
                                    color: '#64748b',
                                    fontWeight: 500,
                                }}>
                                    <span style={{
                                        backgroundColor: '#f1f5f9',
                                        padding: '3px 8px',
                                        borderRadius: '6px',
                                        fontSize: '12px',
                                    }}>
                                        L{treeItem.data.level}
                                    </span>
                                </div>

                                {/* Column 3: Status (Read-only display) */}
                                <div style={{ fontSize: '13px' }}>
                                    <span
                                        style={{
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                            backgroundColor:
                                                currentValue.status === 'Active'
                                                    ? '#dcfce7'
                                                    : currentValue.status === 'Inactive'
                                                    ? '#fee2e2'
                                                    : currentValue.status === 'Maintenance'
                                                    ? '#fef3c7'
                                                    : '#dbeafe',
                                            color:
                                                currentValue.status === 'Active'
                                                    ? '#15803d'
                                                    : currentValue.status === 'Inactive'
                                                    ? '#991b1b'
                                                    : currentValue.status === 'Maintenance'
                                                    ? '#92400e'
                                                    : '#1e40af',
                                            fontSize: '12px',
                                            fontWeight: 500,
                                        }}
                                    >
                                        {currentValue.status}
                                    </span>
                                </div>

                                {/* Column 4: Editable Controls */}
                                <div>
                                    {isEditable ? (
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            {/* Show textbox only for node-4 to node-8 (Cluster 1 children) */}
                                            {['node-4', 'node-5', 'node-6', 'node-7', 'node-8'].includes(nodeKey) && (
                                                <input
                                                    type="text"
                                                    value={currentValue.riskValue}
                                                    onChange={(e) => handleRiskValueChange(nodeKey, e.target.value)}
                                                    placeholder="Enter value"
                                                    style={{
                                                        padding: '6px 10px',
                                                        border: '1.5px solid #e2e8f0',
                                                        borderRadius: '6px',
                                                        fontSize: '13px',
                                                        width: '100%',
                                                        backgroundColor: '#fafbfc',
                                                        transition: 'all 0.2s ease',
                                                        outline: 'none',
                                                    }}
                                                    onFocus={(e) => {
                                                        e.currentTarget.style.borderColor = '#3b82f6';
                                                        e.currentTarget.style.backgroundColor = '#ffffff';
                                                    }}
                                                    onBlur={(e) => {
                                                        e.currentTarget.style.borderColor = '#e2e8f0';
                                                        e.currentTarget.style.backgroundColor = '#fafbfc';
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            )}

                                            {/* Show dropdown only for node-9 to node-13 (Cluster 2 children) */}
                                            {['node-9', 'node-10', 'node-11', 'node-12', 'node-13'].includes(nodeKey) && (
                                                <select
                                                    value={currentValue.status}
                                                    onChange={(e) => handleStatusChange(nodeKey, e.target.value)}
                                                    style={{
                                                        padding: '6px 10px',
                                                        border: '1.5px solid #e2e8f0',
                                                        borderRadius: '6px',
                                                        fontSize: '13px',
                                                        width: '100%',
                                                        backgroundColor: '#fafbfc',
                                                        transition: 'all 0.2s ease',
                                                        outline: 'none',
                                                        cursor: 'pointer',
                                                    }}
                                                    onFocus={(e) => {
                                                        e.currentTarget.style.borderColor = '#3b82f6';
                                                        e.currentTarget.style.backgroundColor = '#ffffff';
                                                    }}
                                                    onBlur={(e) => {
                                                        e.currentTarget.style.borderColor = '#e2e8f0';
                                                        e.currentTarget.style.backgroundColor = '#fafbfc';
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <option value="Active">Active</option>
                                                    <option value="Inactive">Inactive</option>
                                                    <option value="Maintenance">Maintenance</option>
                                                    <option value="Ready">Ready</option>
                                                </select>
                                            )}
                                        </div>
                                    ) : (
                                        <span style={{ fontSize: '14px', color: '#9ca3af' }}>-</span>
                                    )}
                                </div>
                            </div>
                        );
                    }}
                    viewState={{
                        'tree-grid': {
                            expandedItems,
                            selectedItems,
                        },
                    }}
                    onExpandItem={(item) => setExpandedItems([...expandedItems, item.index as string])}
                    onCollapseItem={(item) => setExpandedItems(expandedItems.filter((id) => id !== item.index))}
                    onSelectItems={(items) => setSelectedItems(items as string[])}
                    canDragAndDrop={false}
                    canDropOnFolder={false}
                    canReorderItems={false}
                >
                    <Tree treeId="tree-grid" rootItem="root" treeLabel="Tree Grid Example" />
                </ControlledTreeEnvironment>
            </div>

            {/* Info */}
            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                <p>💡 <strong>Tip:</strong> Use toolbar buttons to expand/collapse tree levels</p>
                <p>✏️ <strong>Edit:</strong> Cluster 1 has textbox (5 rows), Cluster 2 has dropdown (5 rows)</p>
                <p>💾 <strong>Save:</strong> Click "Save All Changes" to save (check console)</p>
            </div>
        </div>
    );
};

export default TreeGridExample;
