'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Tree, ControlledTreeEnvironment, TreeItem, TreeItemIndex } from 'react-complex-tree';
import 'react-complex-tree/lib/style-modern.css';

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

interface TreeData {
    [key: string]: TreeItem<AssetData>;
}

interface ClusterOption {
    asset_id: number;
    asset_name: string;
}

interface ModelOption {
    rbim_id: number;
    name: string;
    matrix_id: number;
}

const ComponentTreeView = ({ onAssetSelect, onModelChange }: { onAssetSelect?: (asset: AssetData | null) => void; onModelChange?: (modelId: string | null) => void }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCluster, setSelectedCluster] = useState<string>('ALL');
    const [expandedItems, setExpandedItems] = useState<string[]>([]);
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [assets, setAssets] = useState<AssetData[]>([]);
    const [clusters, setClusters] = useState<ClusterOption[]>([]);
    const [models, setModels] = useState<ModelOption[]>([]);
    const [selectedModel, setSelectedModel] = useState<string>('');
    const [loadingModels, setLoadingModels] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedAsset, setSelectedAsset] = useState<AssetData | null>(null);

    // Fetch clusters (ct_id = 8)
    useEffect(() => {
        const fetchClusters = async () => {
            try {
                const response = await fetch('/api/risk-analysis/assets');
                const result = await response.json();

                if (result.success) {
                    const clusterData = result.data.filter((asset: AssetData) => asset.ct_id === 8);
                    setClusters(clusterData);

                    // Set default cluster if available
                    if (clusterData.length > 0 && selectedCluster === 'ALL') {
                        setSelectedCluster(clusterData[0].asset_id.toString());
                    }
                }
            } catch (error) {
                console.error('Error fetching clusters:', error);
            }
        };

        fetchClusters();
    }, []);

    // Fetch models
    useEffect(() => {
        const fetchModels = async () => {
            setLoadingModels(true);
            try {
                const response = await fetch('/api/risk-analysis/model');
                const result = await response.json();
                console.log('Models fetched:', result);
                if (result.success) {
                    const data = Array.isArray(result.data) ? result.data : [];
                    setModels(data);
                    if (!selectedModel && data.length > 0) {
                        const firstModelId = String(data[0].rbim_id);
                        console.log('Setting default model:', firstModelId);
                        setSelectedModel(firstModelId);
                        // Notify parent of default selection
                        if (onModelChange) {
                            console.log('Calling onModelChange with:', firstModelId);
                            onModelChange(firstModelId);
                        } else {
                            console.log('onModelChange callback not available');
                        }
                    }
                } else {
                    console.error('Failed to fetch models:', result.error);
                    setModels([]);
                }
            } catch (error) {
                console.error('Error fetching models:', error);
                setModels([]);
            } finally {
                setLoadingModels(false);
            }
        };

        fetchModels();
    }, [selectedModel, onModelChange]);

    // Fetch assets based on selected cluster and model
    useEffect(() => {
        const fetchAssets = async () => {
            setLoading(true);
            setError(null);

            try {
                let url = '/api/risk-analysis/assets';
                const params = new URLSearchParams();

                // Add cluster filter if not ALL
                if (selectedCluster !== 'ALL') {
                    params.append('cluster', selectedCluster);
                }

                // Add model filter if selected
                if (selectedModel) {
                    params.append('rbim_id', selectedModel);
                }

                if (params.toString()) {
                    url += `?${params.toString()}`;
                }

                const response = await fetch(url);
                const result = await response.json();

                if (result.success) {
                    setAssets(result.data);
                } else {
                    setError(result.error || 'Failed to fetch assets');
                }
            } catch (error) {
                console.error('Error fetching assets:', error);
                setError('Failed to connect to server');
            } finally {
                setLoading(false);
            }
        };

        if (selectedCluster) {
            fetchAssets();
        }
    }, [selectedCluster, selectedModel]);

    // Convert assets array to tree structure
    const treeData = useMemo(() => {
        if (!assets.length) return {};

        const tree: TreeData = {};

        // Build tree structure from flat array
        assets.forEach((asset) => {
            const key = `asset-${asset.asset_id}`;

            // Find children (exclude self-references like UBL)
            const children = assets
                .filter((a) => a.parent_id === asset.asset_id && a.asset_id !== asset.asset_id)
                .sort((a, b) => a.pos - b.pos)
                .map((a) => `asset-${a.asset_id}`);

            // ct_id 12 (Parts) and 23 (Piping) are leaf nodes, others are folders
            const isFolder = asset.ct_id !== 12 && asset.ct_id !== 23;

            tree[key] = {
                index: key,
                children,
                data: asset,
                isFolder,
            };
        });

        // Find root - UBL (asset_id = 2) or first asset with pos = 1
        const root = assets.find((a) => a.asset_id === 2 || a.pos === 1);
        if (root) {
            tree['root'] = {
                index: 'root',
                children: [`asset-${root.asset_id}`],
                data: {
                    parent_id: null,
                    parent_name: '',
                    asset_id: 0,
                    asset_name: 'Root',
                    ct_id: 0,
                    pos: 0,
                    hierarchy_id: '',
                    ci_id: 0,
                    description: 'Root',
                },
                isFolder: true,
            };
        }

        return tree;
    }, [assets]);

    // Filter tree by search term
    const searchFilteredData = useMemo(() => {
        if (!searchTerm) return treeData;

        const matches = new Set<string>();
        const searchLower = searchTerm.toLowerCase();

        // Helper to get all parent nodes (with cycle detection)
        const getParents = (index: string, data: TreeData, visited: Set<string> = new Set()): string[] => {
            if (visited.has(index)) return []; // Prevent infinite loops
            visited.add(index);

            const parents: string[] = [];
            Object.entries(data).forEach(([key, node]) => {
                if (key !== index && node.children && node.children.includes(index)) {
                    parents.push(key);
                    parents.push(...getParents(key, data, visited));
                }
            });
            return parents;
        };

        // Helper to get all children nodes recursively
        const getChildren = (index: string, data: TreeData, visited: Set<string> = new Set()): string[] => {
            if (visited.has(index)) return []; // Prevent infinite loops
            visited.add(index);

            const children: string[] = [];
            const node = data[index];
            if (node && node.children) {
                node.children.forEach((childKey) => {
                    children.push(childKey as string);
                    children.push(...getChildren(childKey as string, data, visited));
                });
            }
            return children;
        };

        // Find matching nodes, their parents, and their children
        Object.entries(treeData).forEach(([key, node]) => {
            if (node.data.asset_name.toLowerCase().includes(searchLower)) {
                matches.add(key);
                // Add all parents to show the path
                getParents(key, treeData).forEach((parent) => matches.add(parent));
                // Add all children to show descendants
                getChildren(key, treeData).forEach((child) => matches.add(child));
            }
        });

        // Build filtered tree
        const filtered: TreeData = {};
        matches.forEach((key) => {
            const node = treeData[key];
            if (node) {
                filtered[key] = {
                    ...node,
                    children: node.children?.filter((child) => matches.has(child as string)),
                };
            }
        });

        return filtered;
    }, [treeData, searchTerm]);

    // Count matching leaf nodes
    const matchCount = useMemo(() => {
        return Object.values(searchFilteredData).filter((node) => !node.isFolder && node.data.asset_name.toLowerCase().includes(searchTerm.toLowerCase())).length;
    }, [searchFilteredData, searchTerm]);

    // Auto-expand when searching
    const autoExpandedItems = useMemo(() => {
        if (!searchTerm) return [];
        return Object.keys(searchFilteredData).filter((key) => searchFilteredData[key].isFolder);
    }, [searchFilteredData, searchTerm]);

    // Update expanded items when search results change
    useEffect(() => {
        if (searchTerm && autoExpandedItems.length > 0) {
            setExpandedItems(autoExpandedItems);
        }
    }, [searchTerm, autoExpandedItems]);

    // Calculate depth of item in tree
    const getItemDepth = (itemIndex: string, data: TreeData): number => {
        if (itemIndex === 'root') return 0;

        let depth = 0;
        let currentIndex = itemIndex;
        const visited = new Set<string>();

        while (currentIndex !== 'root' && !visited.has(currentIndex)) {
            visited.add(currentIndex);
            depth++;

            // Find parent
            const parent = Object.entries(data).find(([, node]) => node.children?.includes(currentIndex));

            if (parent) {
                currentIndex = parent[0];
            } else {
                break;
            }
        }

        return depth;
    };

    // Handle asset selection
    const handleSelectItems = (items: string[]) => {
        setSelectedItems(items);

        if (items.length > 0) {
            // Extract asset_id from the selected item key (format: "asset-123")
            const selectedKey = items[0];
            const assetId = parseInt(selectedKey.replace('asset-', ''));

            // Find the asset in the assets array
            const asset = assets.find((a) => a.asset_id === assetId);

            if (asset) {
                setSelectedAsset(asset);
                if (onAssetSelect) {
                    onAssetSelect(asset);
                }
            }
        } else {
            setSelectedAsset(null);
            if (onAssetSelect) {
                onAssetSelect(null);
            }
        }
    };

    return (
        <div className="space-y-4">
            {/* Model Dropdown - Only show if onModelChange callback is provided */}
            {onModelChange && (
                <div>
                    <label className="mb-2 block text-sm font-medium">Select Model</label>
                    <select
                        value={selectedModel}
                        onChange={(e) => {
                            const newValue = e.target.value;
                            setSelectedModel(newValue);
                            if (onModelChange) {
                                onModelChange(newValue || null);
                            }
                        }}
                        className="form-select w-full"
                        disabled={loadingModels}
                    >
                        <option value="">Select a model</option>
                        {models.map((model) => (
                            <option key={model.rbim_id} value={model.rbim_id.toString()}>
                                {model.name}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {/* Cluster Dropdown */}
            <div>
                <label className="mb-2 block text-sm font-medium">Select Cluster</label>
                <select
                    value={selectedCluster}
                    onChange={(e) => {
                        setSelectedCluster(e.target.value);
                        setSearchTerm(''); // Clear search when changing cluster
                        setExpandedItems([]); // Collapse all
                    }}
                    className="form-select w-full"
                    disabled={loading}
                >
                    <option value="ALL">All Clusters</option>
                    {clusters.map((cluster) => (
                        <option key={cluster.asset_id} value={cluster.asset_id.toString()}>
                            {cluster.asset_name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Search Box */}
            <div>
                <label className="mb-2 block text-sm font-medium">Search Equipment</label>
                <div className="relative">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="e.g., SPR-02, CLUSTER, PIPING..."
                        className="form-input w-full pr-10"
                        disabled={loading}
                    />
                    {searchTerm && (
                        <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" title="Clear search">
                            ✕
                        </button>
                    )}
                </div>
                {searchTerm && !loading && (
                    <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        {matchCount > 0 ? (
                            <>
                                {matchCount} result{matchCount !== 1 ? 's' : ''} found
                                {selectedCluster !== 'ALL' &&
                                    clusters.find((c) => c.asset_id.toString() === selectedCluster) &&
                                    ` in ${clusters.find((c) => c.asset_id.toString() === selectedCluster)?.asset_name}`}
                            </>
                        ) : (
                            'No results found'
                        )}
                    </div>
                )}
            </div>

            {/* Tree View */}
            <div className="rounded-md border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-900 overflow-x-auto">
                <style jsx global>{`
                    .rct-tree-item-title-container {
                        height: 28px !important;
                        min-height: 28px !important;
                        padding: 2px 0 !important;
                        width: max-content !important;
                        min-width: 100% !important;
                    }
                    .rct-tree-item-li:nth-child(even) .rct-tree-item-title-container {
                        background-color: #f9fafb !important;
                    }
                    .rct-dark .rct-tree-item-li:nth-child(even) .rct-tree-item-title-container {
                        background-color: #1f2937 !important;
                    }
                `}</style>
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="text-sm text-gray-500 dark:text-gray-400">Loading assets...</div>
                    </div>
                ) : error ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="text-sm text-red-500">{error}</div>
                    </div>
                ) : Object.keys(searchFilteredData).length === 0 ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="text-sm text-gray-500 dark:text-gray-400">{searchTerm ? 'No results found' : 'No data available'}</div>
                    </div>
                ) : (
                    <ControlledTreeEnvironment
                        items={searchFilteredData}
                        getItemTitle={(item) => item.data.asset_name}
                        renderItemTitle={({ item }) => {
                            const depth = getItemDepth(item.index as string, searchFilteredData);
                            const indentPx = depth * 8; // 8px per level (about 1 character width)

                            return (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: `${indentPx}px`, whiteSpace: 'nowrap' }}>
                                    {item.data.icon && (
                                        <img
                                            src={`data:image/x-icon;base64,${item.data.icon}`}
                                            alt="Risk Icon"
                                            style={{ width: '16px', height: '16px' }}
                                            onError={(e) => {
                                                // Hide icon if it fails to load
                                                (e.target as HTMLImageElement).style.display = 'none';
                                            }}
                                        />
                                    )}
                                    <span>
                                        {item.data.Risk_Level && `[${item.data.Risk_Level}] `}
                                        {item.data.asset_name}
                                    </span>
                                </div>
                            );
                        }}
                        viewState={{
                            'component-tree': {
                                expandedItems,
                                selectedItems,
                            },
                        }}
                        onExpandItem={(item) => setExpandedItems([...expandedItems, item.index as string])}
                        onCollapseItem={(item) => setExpandedItems(expandedItems.filter((id) => id !== item.index))}
                        onSelectItems={(items) => handleSelectItems(items as string[])}
                        canDragAndDrop={false}
                        canDropOnFolder={false}
                        canReorderItems={false}
                    >
                        <Tree treeId="component-tree" rootItem="root" treeLabel="Equipment Tree" />
                    </ControlledTreeEnvironment>
                )}
            </div>

            {/* Instructions */}
            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                <p>
                    💡 <strong>Tip:</strong> Select a cluster to narrow down the view
                </p>
                <p>
                    🔍 <strong>Search:</strong> Type equipment name to filter results
                </p>
                <p>
                    📁 <strong>Navigate:</strong> Click folders to expand/collapse
                </p>
            </div>
        </div>
    );
};

export default ComponentTreeView;
