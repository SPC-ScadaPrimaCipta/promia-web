'use client';

import { debug } from 'console';
import React, { useState, useMemo, useEffect } from 'react';
import { Tree, ControlledTreeEnvironment, TreeItem } from 'react-complex-tree';
import 'react-complex-tree/lib/style-modern.css';

// Model component data structure from API
// Note: SQL Server returns column names with specific casing
interface ModelComponentData {
    RBIM_ID: number;
    RBIF_ID: number | null;
    TD_ID: number | null;
    Lvl: number;
    LinkTD_ID: number | null;
    LinkFD_ID: number | null;
    LinkLinkFD_ID: number | null;
    LL_ID: number | null;
    FT_ID: number | null;
    field_name: string | null;
    field_desc: string | null;
    table_name: string | null;
    table_desc: string | null;
    FND_ID: number | null;
    function_name: string | null;
    function_desc: string | null;
    FNP_ID: number | null;
    param_types: string | null;
    // UI metadata from API (optional)
    ui?: {
        type?: 'dropdown' | 'checkbox' | 'calculation';
        options?: { label: string; value: any }[];
    };
}

interface TreeNodeData {
    td_id: number | null;
    field_name: string;
    level: number;
    table_desc: string;
    function_name: string;
    editValue: any;
    // Additional data for logic
    ll_id: number | null;
    fnd_id: number | null;
    linkfd_id: number | null;
    linktd_id: number | null; // Added for matching with detail API results
    dropdownOptions?: { label: string; value: any }[];
    isCheckbox?: boolean;
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

interface DetailValue {
    LinkFD_ID: number;
    Value: any;
}

interface DetailQueryResult {
    success: boolean;
    LinkTD_ID: number;
    LinkFD_IDs: number[];
    query: string;
    data: DetailValue[];
    error?: string;
}

interface TreeGridExampleProps {
    selectedModelId?: string | null;
    selectedAssetId?: number | null;
}

const TreeGridExample = ({ selectedModelId, selectedAssetId }: TreeGridExampleProps) => {
    const [apiData, setApiData] = useState<ModelComponentData[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [detailQueries, setDetailQueries] = useState<DetailQueryResult[]>([]);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState<string | null>(null);
    const [expandedItems, setExpandedItems] = useState<string[]>(['root']);
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [editValues, setEditValues] = useState<Record<string, any>>({});

    // Add custom CSS for soft grid styling
    useEffect(() => {
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
    useEffect(() => {
        const fetchModelComponent = async () => {
            if (!selectedModelId) {
                setApiData([]);
                setDetailQueries([]);
                setEditValues({});
                return;
            }

            setLoading(true);
            setError(null);
            setDetailQueries([]);
            setEditValues({});

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

    // Fetch model-component-detail when both model and asset are selected
    useEffect(() => {
        const fetchDetail = async () => {
            if (!selectedModelId || !selectedAssetId) {
                setDetailQueries([]);
                return;
            }

            setDetailLoading(true);
            setDetailError(null);
            setEditValues({});

            try {
                const detailUrl = `/api/risk-analysis/model-component-detail?rbim_id=${selectedModelId}&asset_id=${selectedAssetId}`;
                const response = await fetch(
                    detailUrl
                );
                const result = await response.json();

                console.log('detail fetch URL', detailUrl);
                console.log('detail raw result', result);

                //debugger;

                if (result.success) {
                    setDetailQueries(result.queries || []);
                } else {
                    setDetailQueries([]);
                    setDetailError(result.error || 'Failed to fetch model component detail');
                }
            } catch (err) {
                console.error('Error fetching model component detail:', err);
                setDetailQueries([]);
                setDetailError('Failed to connect to server');
            } finally {
                setDetailLoading(false);
            }
        };

        fetchDetail();
    }, [selectedModelId, selectedAssetId]);

    // Map detail values by LinkTD_ID/LinkFD_ID for quick lookup
    const detailValueMap = useMemo(() => {
        const map = new Map<string, any>();
        console.log('=== Building detailValueMap ===');
        console.log('detailQueries count:', detailQueries.length);

        detailQueries.forEach((q, qIndex) => {
            console.log(`Query ${qIndex}:`, {
                success: q.success,
                LinkTD_ID: q.LinkTD_ID,
                dataCount: q.data?.length || 0,
            });

            if (!q.success || !Array.isArray(q.data)) return;

            q.data.forEach((entry) => {
                const key = `${q.LinkTD_ID}:${entry.LinkFD_ID}`;
                console.log(`  Mapping key: ${key} = ${entry.Value}`);
                map.set(key, entry.Value);
            });
        });

        console.log('detailValueMap total keys:', map.size);
        console.log('detailValueMap all keys:', Array.from(map.keys()));
        return map;
    }, [detailQueries]);

    // Build tree structure from API data
    const treeData = useMemo(() => {
        console.log('🏗️ REBUILDING TREE - Triggered by apiData or detailValueMap change');
        console.log('  - apiData.length:', apiData.length);
        console.log('  - detailValueMap.size:', detailValueMap.size);

        if (!apiData.length) return {};

        const tree: TreeGridItems = {};

        const getTdId = (row: any): number | null => row.TD_ID ?? row.td_id ?? null;
        const getLinkTdId = (row: any): number | null => row.LinkTD_ID ?? row.linktd_id ?? null;
        const getLinkFdId = (row: any): number | null => row.LinkFD_ID ?? row.linkfd_id ?? null;
        const getLinkLinkFdId = (row: any): number | null => row.LinkLinkFD_ID ?? row.linklinkfd_id ?? null;
        const getLvl = (row: any): number => row.Lvl ?? row.lvl ?? 0;

        // Helper function to calculate actual depth based on parent chain
        const calculateActualDepth = (item: ModelComponentData, dataArray: ModelComponentData[]): number => {
            const lvlVal = getLvl(item);
            const linkTdVal = getLinkTdId(item);
            const tdVal = getTdId(item);

            // If Lvl is 60000, it's a leaf node - calculate depth from parent
            if (lvlVal === 60000) {
                if (linkTdVal === null) return 0;

                // Find parent and get its depth
                const parent = dataArray.find((p) => getTdId(p) === linkTdVal);
                if (parent) {
                    return calculateActualDepth(parent, dataArray) + 1;
                }
                return 0;
            }
            // For normal Lvl values, use them directly
            return lvlVal;
        };

        // Helper to choose a non-empty display name, ignoring blank/whitespace
        const pickDisplayName = (item: ModelComponentData): string => {
            const candidates = [item.field_name, item.field_desc, item.table_name];
            for (const c of candidates) {
                if (typeof c === 'string' && c.trim()) {
                    return c.trim();
                }
            }
            return 'Unnamed';
        };

        // Create nodes from API data
        console.log('=== Building Tree Nodes ===');
        console.log('apiData count:', apiData.length);
        console.log('detailValueMap has', detailValueMap.size, 'values');

        debugger;

        apiData.forEach((item, index) => {
            const tdId = getTdId(item);
            const linkTdId = getLinkTdId(item);
            const linkFdId = getLinkFdId(item);
            const linkLinkFdId = getLinkLinkFdId(item);
            const llId = item.LL_ID ?? (item as any).ll_id ?? null;
            const fndId = item.FND_ID ?? (item as any).fnd_id ?? null;
            const ftId = item.FT_ID ?? (item as any).ft_id ?? null;

            const nodeKey = `node-${tdId || `temp-${index}`}`;
            // Nodes with TD_ID=null are always leaf nodes (from Lvl=60000 union), never folders
            const hasChildren = tdId !== null && apiData.some((child) => getLinkTdId(child) === tdId);
            const actualLevel = calculateActualDepth(item, apiData);

            // Try to match detail value using LinkTD_ID/LinkFD_ID with additional fallbacks
            const keyCandidates: string[] = [];
            // Primary: LinkTD_ID (parent table) + LinkFD_ID (this field)
            if (item.LinkTD_ID !== null && item.LinkFD_ID !== null) {
                keyCandidates.push(`${item.LinkTD_ID}:${item.LinkFD_ID}`);
            }
            // Secondary: TD_ID (this table) + LinkFD_ID (this field)
            if (item.TD_ID !== null && item.LinkFD_ID !== null) {
                keyCandidates.push(`${item.TD_ID}:${item.LinkFD_ID}`);
            }
            // Tertiary: LinkTD_ID + LinkLinkFD_ID
            if (item.LinkTD_ID !== null && item.LinkLinkFD_ID !== null) {
                keyCandidates.push(`${item.LinkTD_ID}:${item.LinkLinkFD_ID}`);
            }
            // Quaternary: TD_ID + LinkLinkFD_ID
            if (item.TD_ID !== null && item.LinkLinkFD_ID !== null) {
                keyCandidates.push(`${item.TD_ID}:${item.LinkLinkFD_ID}`);
            }
            // Normalized fallback keys
            if (linkTdId !== null && linkFdId !== null) {
                keyCandidates.push(`${linkTdId}:${linkFdId}`);
            }
            if (tdId !== null && linkFdId !== null) {
                keyCandidates.push(`${tdId}:${linkFdId}`);
            }
            if (linkTdId !== null && linkLinkFdId !== null) {
                keyCandidates.push(`${linkTdId}:${linkLinkFdId}`);
            }
            if (tdId !== null && linkLinkFdId !== null) {
                keyCandidates.push(`${tdId}:${linkLinkFdId}`);
            }

            // Try to find matching value
            let detailValue: any = undefined;
            let matchedKey: string | null = null;

            for (const key of keyCandidates) {
                const value = detailValueMap.get(key);
                if (value !== undefined) {
                    detailValue = value;
                    matchedKey = key;
                    break;
                }
            }

            // Special logging for TMSF field and RISK10_ children
            if (item.field_name === 'TMSF' || (item.LinkTD_ID === 649 && item.LinkFD_ID === 1741) || item.LinkTD_ID === 647) {
                console.log(`🎯 NODE MATCHING ATTEMPT (${item.field_name || item.table_name}):`);
                console.log(`  Node key: ${nodeKey}`);
                console.log(`  TD_ID: ${item.TD_ID}`);
                console.log(`  LinkTD_ID: ${item.LinkTD_ID}`);
                console.log(`  LinkFD_ID: ${item.LinkFD_ID}`);
                console.log(`  Key candidates:`, keyCandidates);
                console.log(`  Matched key: ${matchedKey}`);
                console.log(`  Detail value found: ${detailValue}`);
                console.log(`  Value will be stored as: "${detailValue !== undefined && detailValue !== null ? String(detailValue) : ''}"`);
            }

            tree[nodeKey] = {
                index: nodeKey,
                children: [],
                data: {
                    td_id: tdId,
                    // Prefer explicit field_name; if missing/blank, fall back to field_desc, then table_name
                    field_name: pickDisplayName(item),
                    level: actualLevel,
                    // Use table_desc; if missing/blank, fall back to field_desc
                    table_desc: (item.table_desc && item.table_desc.trim()) || (item.field_desc && item.field_desc.trim()) || '',
                    function_name: item.function_name || '',
                    editValue: detailValue !== undefined && detailValue !== null ? detailValue : '',
                    ll_id: llId,
                    fnd_id: fndId,
                    linkfd_id: linkFdId,
                    linktd_id: linkTdId, // Store LinkTD_ID for reference
                    dropdownOptions: item.ui?.type === 'dropdown' ? item.ui.options || [] : undefined,
                    isCheckbox: item.ui?.type === 'checkbox' || ftId === 5,
                },
                isFolder: hasChildren,
            };

            // Log TMSF folder status
            if (item.field_name === 'TMSF') {
                console.log(`📁 TMSF isFolder status: ${hasChildren}`);
                console.log(`   Has children check found: ${hasChildren ? 'YES - will not be editable!' : 'NO - will be editable'}`);
            }
        });

        console.log('=== Tree Building Complete ===');
        console.log('Total nodes created:', Object.keys(tree).length);

        // Summary: Count how many nodes have values
        const nodesWithValues = Object.values(tree).filter(node => node.data.editValue !== '').length;
        console.log('Nodes with values populated:', nodesWithValues);
        console.log('Nodes without values:', Object.keys(tree).length - nodesWithValues);

        // Example: Show a specific case from your data - LinkTD_ID: 649, LinkFD_ID: 1741
        const testKey = '649:1741';
        const hasTestKey = detailValueMap.has(testKey);
        const testValue = detailValueMap.get(testKey);
        console.log(`\n🔍 TEST CASE: Looking for key "${testKey}"`);
        console.log(`  ✓ Key exists in detailValueMap: ${hasTestKey}`);
        console.log(`  ✓ Value: ${testValue}`);

        // Find if any node has LinkTD_ID=649 and LinkFD_ID=1741
        const matchingNode = apiData.find(item => item.LinkTD_ID === 649 && item.LinkFD_ID === 1741);
        console.log(`  ✓ Found node with LinkTD_ID=649 & LinkFD_ID=1741:`, matchingNode ? 'YES' : 'NO');
        if (matchingNode) {
            console.log(`    - TD_ID: ${matchingNode.TD_ID}`);
            console.log(`    - field_name: ${matchingNode.field_name}`);
            console.log(`    - table_name: ${matchingNode.table_name}`);
        }

        // Also check: Is there a node where TD_ID=649 and LinkFD_ID=1741?
        const matchingNode2 = apiData.find(item => item.TD_ID === 649 && item.LinkFD_ID === 1741);
        console.log(`  ✓ Found node with TD_ID=649 & LinkFD_ID=1741:`, matchingNode2 ? 'YES' : 'NO');
        if (matchingNode2) {
            console.log(`    - LinkTD_ID: ${matchingNode2.LinkTD_ID}`);
            console.log(`    - field_name: ${matchingNode2.field_name}`);
            console.log(`    - table_name: ${matchingNode2.table_name}`);
        }

        // Show all nodes that have LinkFD_ID=1741
        console.log(`\n📋 All nodes with LinkFD_ID=1741:`);
        const nodesWithLinkFD = apiData.filter(item => item.LinkFD_ID === 1741);
        nodesWithLinkFD.forEach(node => {
            console.log(`  - TD_ID=${node.TD_ID}, LinkTD_ID=${node.LinkTD_ID}, field=${node.field_name || node.table_name}`);
        });

        // NEW: Show all nodes with LinkTD_ID=647 (RISK10_)
        console.log(`\n📋 All nodes with LinkTD_ID=647 (RISK10_):`);
        const nodesWithLinkTD647 = apiData.filter(item => item.LinkTD_ID === 647);
        if (nodesWithLinkTD647.length === 0) {
            console.log('  ❌ NO NODES FOUND with LinkTD_ID=647');
            console.log('  This means the tree structure does not include child fields of RISK10_');
        } else {
            nodesWithLinkTD647.forEach(node => {
                console.log(`  - TD_ID=${node.TD_ID}, LinkFD_ID=${node.LinkFD_ID}, field=${node.field_name || node.table_name}`);
            });
        }

        // Show the RISK10_ table node itself (TD_ID=647)
        console.log(`\n📋 Node with TD_ID=647 (RISK10_ table):`);
        const risk10Node = apiData.find(item => item.TD_ID === 647);
        if (risk10Node) {
            console.log(`  ✓ Found: field=${risk10Node.field_name || risk10Node.table_name}, LinkTD_ID=${risk10Node.LinkTD_ID}, has children=${apiData.some(child => child.LinkTD_ID === 647)}`);
        } else {
            console.log('  ❌ NOT FOUND - TD_ID=647 does not exist in tree structure');
        }

        // Build parent-child relationships
        apiData.forEach((item, index) => {
            const nodeKey = `node-${item.TD_ID || `temp-${index}`}`;

            if (item.LinkTD_ID !== null) {
                // Find parent node
                const parentKey = `node-${item.LinkTD_ID}`;
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
            .filter((item) => item.LinkTD_ID === null)
            .map((item, index) => `node-${item.TD_ID || `temp-${index}`}`);

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
                linktd_id: null,
            },
            isFolder: true,
        };

        return tree;
    }, [apiData, detailValueMap]);

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

    // Handle value change
    const handleValueChange = (nodeKey: string, value: string) => {
        setEditValues((prev) => ({
            ...prev,
            [nodeKey]: value,
        }));
    };

    // Get current value (edited or original), preserving falsy values like 0/false
    const getCurrentValue = (nodeKey: string) => {
        const edited = Object.prototype.hasOwnProperty.call(editValues, nodeKey) ? editValues[nodeKey] : undefined;
        if (edited !== undefined) return edited;
        const base = treeData[nodeKey]?.data.editValue;
        return base !== undefined ? base : '';
    };

    // Save all changes
    const handleSaveAll = () => {
        console.log('Saving all changes:', editValues);
        alert('Changes saved! Check console for values.');
    };

    // Determine control type based on node data
    const getControlType = (node: TreeGridItem): 'readonly' | 'dropdown' | 'checkbox' | 'textbox' => {
        // If function_name is not null → readonly/calculation textbox
        if (node.data.fnd_id !== null || node.data.function_name) {
            return 'readonly';
        }
        if (node.data.isCheckbox) {
            return 'checkbox';
        }
        // If we have dropdown options or ll_id → dropdown
        if ((node.data.dropdownOptions && node.data.dropdownOptions.length > 0) || node.data.ll_id !== null) {
            return 'dropdown';
        }
        // Otherwise → editable textbox
        return 'textbox';
    };

    // Render control based on type
    const renderControl = (node: TreeGridItem, nodeKey: string) => {
        const controlType = getControlType(node);
        const currentValue = getCurrentValue(nodeKey);
        const normalizeValue = (val: any) => {
            if (val === null || val === undefined) return '';
            if (typeof val === 'boolean') return val ? 'true' : 'false';
            return String(val).trim();
        };

        // Debug log for TMSF
        if (node.data.field_name === 'TMSF') {
            console.log(`🎨 RENDERING TMSF CONTROL:`);
            console.log(`  nodeKey: ${nodeKey}`);
            console.log(`  node.data.editValue: "${node.data.editValue}"`);
            console.log(`  editValues[${nodeKey}]: "${editValues[nodeKey]}"`);
            console.log(`  getCurrentValue result: "${currentValue}"`);
            console.log(`  controlType: ${controlType}`);
        }

        const inputStyle = {
            padding: '6px 10px',
            border: '1.5px solid #e2e8f0',
            borderRadius: '6px',
            fontSize: '13px',
            width: '100%',
            backgroundColor: '#fafbfc',
            transition: 'all 0.2s ease',
            outline: 'none' as const,
        };

        if (controlType === 'readonly') {
            // Format number to 3 decimal places if it's a number
            const formattedValue = (() => {
                const numValue = parseFloat(normalizeValue(currentValue));
                if (!isNaN(numValue)) {
                    return numValue.toFixed(3);
                }
                return normalizeValue(currentValue);
            })();

            return (
                <input
                    type="text"
                    value={formattedValue}
                    readOnly
                    placeholder="Calculated"
                    style={{
                        ...inputStyle,
                        backgroundColor: '#fff7ed',
                        cursor: 'not-allowed',
                        color: '#ea580c', // Orange color
                        fontWeight: 600,
                    }}
                    onClick={(e) => e.stopPropagation()}
                />
            );
        }

        if (controlType === 'dropdown') {
            const options = node.data.dropdownOptions ?? [];
            const normalizedCurrent = normalizeValue(currentValue).toLowerCase();
            return (
                <select
                    value={normalizedCurrent}
                    onChange={(e) => handleValueChange(nodeKey, e.target.value)}
                    style={{
                        ...inputStyle,
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
                    <option value="">Select...</option>
                    {options.map((opt, idx) => {
                        const valueStrRaw = opt.value ?? '';
                        const valueStrNorm = normalizeValue(valueStrRaw).toLowerCase();
                        const label = opt.label ?? normalizeValue(valueStrRaw);
                        return (
                            <option key={`${nodeKey}-opt-${idx}`} value={valueStrNorm}>
                                {label}
                            </option>
                        );
                    })}
                </select>
            );
        }

        if (controlType === 'checkbox') {
            const checked = (() => {
                if (typeof currentValue === 'boolean') return currentValue;
                const norm = normalizeValue(currentValue).toLowerCase();
                return norm === 'true' || norm === '1' || norm === 'yes';
            })();
            return (
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => handleValueChange(nodeKey, String(e.target.checked))}
                    style={{
                        width: '16px',
                        height: '16px',
                        cursor: 'pointer',
                        accentColor: '#3b82f6',
                    }}
                    onClick={(e) => e.stopPropagation()}
                />
            );
        }

        // textbox
        return (
            <input
                type="text"
                value={currentValue}
                onChange={(e) => handleValueChange(nodeKey, e.target.value)}
                placeholder="Enter value"
                style={inputStyle}
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
        );
    };

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex gap-2 items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
                <button onClick={expandAll} className="btn btn-sm btn-outline-primary">
                    Expand All
                </button>
                <button onClick={collapseAll} className="btn btn-sm btn-outline-primary">
                    Collapse All
                </button>
                <button onClick={() => expandToLevel(2)} className="btn btn-sm btn-outline-primary">
                    Expand to Level 2
                </button>
                <button onClick={() => expandToLevel(3)} className="btn btn-sm btn-outline-primary">
                    Expand to Level 3
                </button>
                <div className="ml-auto">
                    <button onClick={handleSaveAll} className="btn btn-sm btn-primary">
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
                        // Slightly reduce Field Name and Edit Value widths
                        gridTemplateColumns: '1.6fr 1.6fr 0.8fr 0.8fr 1.2fr 1.4fr',
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
                    <div>Field Name</div>
                    <div>Table Description</div>
                    <div>LinkTD_ID</div>
                    <div>LinkFD_ID</div>
                    <div>Function Name</div>
                    <div>Edit Value</div>
                </div>

                {/* Loading/Error/Empty States */}
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="text-sm text-gray-500 dark:text-gray-400">Loading model components...</div>
                    </div>
                ) : error ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="text-sm text-red-500">{error}</div>
                    </div>
                ) : Object.keys(treeData).length === 0 ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                            {selectedModelId ? 'No data available for this model' : 'Please select a model to view components'}
                        </div>
                    </div>
                ) : (
                    /* Tree */
                    <ControlledTreeEnvironment
                        items={treeData}
                        getItemTitle={(item) => item.data.field_name}
                    renderItemTitle={({ item }) => {
                        const treeItem = item as TreeGridItem;
                        const nodeKey = treeItem.index as string;
                        const isEditable = !treeItem.isFolder;

                            // Use the calculated level for indentation
                            // Smaller indentation for better readability
                            const indentLevel = treeItem.data.level;
                            const indentPx = indentLevel * 16; // 16px per level

                    return (
                        <div
                            style={{
                                display: 'grid',
                                // Match header widths: Field Name and Edit Value slightly reduced
                                gridTemplateColumns: '1.6fr 1.6fr 0.8fr 0.8fr 1.2fr 1.4fr',
                                gap: '12px',
                                alignItems: 'center',
                                width: '100%',
                            }}
                        >
                                    {/* Column 1: Field Name with indentation */}
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            fontWeight: treeItem.isFolder ? 500 : 400,
                                            color: treeItem.isFolder ? '#334155' : '#475569',
                                            paddingLeft: `${indentPx}px`,
                                        }}
                                    >
                                        <span>{treeItem.data.field_name}</span>
                                    </div>

                                    {/* Column 2: Table Description */}
                                    <div style={{ fontSize: '13px', color: '#64748b' }}>{treeItem.data.table_desc || '-'}</div>

                                    {/* Column 3: LinkTD_ID */}
                                    <div style={{ fontSize: '13px', color: '#475569', fontWeight: 500 }}>
                                        {treeItem.data.linktd_id !== null && treeItem.data.linktd_id !== undefined
                                            ? treeItem.data.linktd_id
                                            : '-'}
                                    </div>

                                    {/* Column 4: LinkFD_ID */}
                                    <div style={{ fontSize: '13px', color: '#475569', fontWeight: 500 }}>
                                        {treeItem.data.linkfd_id !== null && treeItem.data.linkfd_id !== undefined
                                            ? treeItem.data.linkfd_id
                                            : '-'}
                                    </div>

                                    {/* Column 5: Function Name */}
                                    <div style={{ fontSize: '13px', color: '#64748b' }}>
                                        {treeItem.data.function_name ? (
                                            <span
                                                style={{
                                                    backgroundColor: '#dbeafe',
                                                    padding: '3px 8px',
                                                    borderRadius: '6px',
                                                    fontSize: '12px',
                                                    color: '#1e40af',
                                                    fontWeight: 500,
                                                }}
                                            >
                                                {treeItem.data.function_name}
                                            </span>
                                        ) : (
                                            '-'
                                        )}
                                    </div>

                                    {/* Column 6: Edit Value */}
                                    <div>
                                        {isEditable ? (
                                            renderControl(treeItem, nodeKey)
                                        ) : treeItem.data.editValue ? (
                                            // Display value for folder nodes that have editValue - styled like readonly
                                            <input
                                                type="text"
                                                value={treeItem.data.editValue}
                                                readOnly
                                                style={{
                                                    padding: '6px 10px',
                                                    border: '1.5px solid #e2e8f0',
                                                    borderRadius: '6px',
                                                    fontSize: '13px',
                                                    width: '100%',
                                                    backgroundColor: '#fff7ed',
                                                    cursor: 'not-allowed',
                                                    color: '#ea580c',
                                                    fontWeight: 600,
                                                    outline: 'none',
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                            />
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
                        <Tree treeId="tree-grid" rootItem="root" treeLabel="Model Components Grid" />
                    </ControlledTreeEnvironment>
                )}
            </div>

            {/* Debug: show detail query payload in non-production environments */}
            {process.env.NODE_ENV !== 'production' && detailQueries.length > 0 && (
                <pre className="text-xs bg-gray-50 dark:bg-gray-800 p-3 rounded-md overflow-auto max-h-64">
                    {JSON.stringify(detailQueries, null, 2)}
                </pre>
            )}

            {/* Info */}
            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                <p>
                    💡 <strong>Tip:</strong> Use toolbar buttons to expand/collapse tree levels
                </p>
                <p>
                    ✏️ <strong>Edit:</strong> Calculated fields are read-only, dropdown fields show options, others are editable
                </p>
                <p>
                    💾 <strong>Save:</strong> Click "Save All Changes" to save (check console)
                </p>
            </div>
        </div>
    );
};

export default TreeGridExample;
