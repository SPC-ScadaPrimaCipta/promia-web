'use client';

import { debug } from 'console';
import React, { useState, useMemo, useEffect } from 'react';
import { Tree, ControlledTreeEnvironment, TreeItem } from 'react-complex-tree';
import 'react-complex-tree/lib/style-modern.css';
import ReportRiskSummary from './ReportRiskSummary';
import Report21 from './Report_2_1';
import Report43 from './Report_4_3';
import Report54 from './Report_5_4';
import Report64 from './Report_6_4';
import Report65 from './Report_6_5';
import Report67 from './Report_6_7';
import Report68 from './Report_6_8';
import Report72 from './Report_7_2';
import Report84L2 from './Report_8_4_L2';
import Report93 from './Report_9_3';
import Report101 from './Report_10_1';
import Report102 from './Report_10_2';
import ReportInspectionPiping from './Report_Inspection_Piping';
import ReportInspectionEquipment from './Report_Inspection_Equipment';
import ReportDiagramDegMech from './Report_Diagram_Deg_Mech';
import ReportDegMechAll from './Report_Deg_Mech_All';
import ReportPieChart from './Report_PieChart';
import ReportCountInspAll from './Report_Count_Insp_All';
import ReportCountInspAllGraphic from './Report_Count_Insp_All_Graphic';

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

interface LookupItem {
    ll_id: number;
    li_id: number;
    value: string;
    comments: string;
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
    selectedModelName?: string | null;
    selectedAssetId?: number | null;
}

const TreeGridExample = ({ selectedModelId, selectedModelName, selectedAssetId }: TreeGridExampleProps) => {
    const [apiData, setApiData] = useState<ModelComponentData[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [detailQueries, setDetailQueries] = useState<DetailQueryResult[]>([]);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState<string | null>(null);
    const [expandedItems, setExpandedItems] = useState<string[]>(['root']);
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [editValues, setEditValues] = useState<Record<string, any>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [reports, setReports] = useState<any[]>([]);
    const [selectedReport, setSelectedReport] = useState<string>('');
    const [loadingReports, setLoadingReports] = useState(false);
    const [showRiskSummaryModal, setShowRiskSummaryModal] = useState(false);
    const [riskSummaryData, setRiskSummaryData] = useState<any[]>([]);
    const [loadingRiskSummary, setLoadingRiskSummary] = useState(false);
    const [showReport21Modal, setShowReport21Modal] = useState(false);
    const [report21Data, setReport21Data] = useState<any[]>([]);
    const [loadingReport21, setLoadingReport21] = useState(false);
    const [showReport43Modal, setShowReport43Modal] = useState(false);
    const [report43Data, setReport43Data] = useState<any[]>([]);
    const [loadingReport43, setLoadingReport43] = useState(false);
    const [showUnitDefinitionsModal, setShowUnitDefinitionsModal] = useState(false);
    const [unitDefinitionsData, setUnitDefinitionsData] = useState<any[]>([]);
    const [loadingUnitDefinitions, setLoadingUnitDefinitions] = useState(false);
    const [showReport64Modal, setShowReport64Modal] = useState(false);
    const [report64Data, setReport64Data] = useState<any[]>([]);
    const [loadingReport64, setLoadingReport64] = useState(false);
    const [showReport65Modal, setShowReport65Modal] = useState(false);
    const [report65Data, setReport65Data] = useState<any[]>([]);
    const [loadingReport65, setLoadingReport65] = useState(false);
    const [showReport67Modal, setShowReport67Modal] = useState(false);
    const [report67Data, setReport67Data] = useState<any[]>([]);
    const [loadingReport67, setLoadingReport67] = useState(false);
    const [showReport68Modal, setShowReport68Modal] = useState(false);
    const [report68Data, setReport68Data] = useState<any[]>([]);
    const [loadingReport68, setLoadingReport68] = useState(false);
    const [showReport72Modal, setShowReport72Modal] = useState(false);
    const [report72Data, setReport72Data] = useState<any[]>([]);
    const [loadingReport72, setLoadingReport72] = useState(false);
    const [showReport84L2Modal, setShowReport84L2Modal] = useState(false);
    const [report84L2Data, setReport84L2Data] = useState<any[]>([]);
    const [loadingReport84L2, setLoadingReport84L2] = useState(false);
    const [showReport93Modal, setShowReport93Modal] = useState(false);
    const [report93Data, setReport93Data] = useState<any[]>([]);
    const [loadingReport93, setLoadingReport93] = useState(false);
    const [showReport101Modal, setShowReport101Modal] = useState(false);
    const [report101Data, setReport101Data] = useState<any[]>([]);
    const [loadingReport101, setLoadingReport101] = useState(false);
    const [showReport102Modal, setShowReport102Modal] = useState(false);
    const [report102Data, setReport102Data] = useState<any[]>([]);
    const [loadingReport102, setLoadingReport102] = useState(false);
    const [showInspectionPipingModal, setShowInspectionPipingModal] = useState(false);
    const [inspectionPipingData, setInspectionPipingData] = useState<any[]>([]);
    const [loadingInspectionPiping, setLoadingInspectionPiping] = useState(false);
    const [showInspectionEquipmentModal, setShowInspectionEquipmentModal] = useState(false);
    const [inspectionEquipmentData, setInspectionEquipmentData] = useState<any[]>([]);
    const [loadingInspectionEquipment, setLoadingInspectionEquipment] = useState(false);
    const [showDegMechModal, setShowDegMechModal] = useState(false);
    const [degMechData, setDegMechData] = useState<any[]>([]);
    const [loadingDegMech, setLoadingDegMech] = useState(false);
    const [showDegMechAllModal, setShowDegMechAllModal] = useState(false);
    const [degMechAllData, setDegMechAllData] = useState<any[]>([]);
    const [loadingDegMechAll, setLoadingDegMechAll] = useState(false);
    const [showPieChartModal, setShowPieChartModal] = useState(false);
    const [pieChartData, setPieChartData] = useState<any[]>([]);
    const [loadingPieChart, setLoadingPieChart] = useState(false);
    const [showCountInspAllModal, setShowCountInspAllModal] = useState(false);
    const [countInspAllData, setCountInspAllData] = useState<any[]>([]);
    const [loadingCountInspAll, setLoadingCountInspAll] = useState(false);
    const [showCountInspAllGraphicModal, setShowCountInspAllGraphicModal] = useState(false);
    const [countInspAllGraphicData, setCountInspAllGraphicData] = useState<any[]>([]);
    const [loadingCountInspAllGraphic, setLoadingCountInspAllGraphic] = useState(false);
    const [selectedReportTitle, setSelectedReportTitle] = useState<string>('');

    // Lookup items cache: Map of ll_id to dropdown options
    const [lookupCache, setLookupCache] = useState<Map<number, { label: string; value: string }[]>>(new Map());

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

    // Fetch reports when selectedModelId changes
    useEffect(() => {
        const fetchReports = async () => {
            if (!selectedModelId) {
                setReports([]);
                setSelectedReport('');
                return;
            }

            setLoadingReports(true);
            try {
                const response = await fetch(`/api/risk-analysis/report-list-model?rbim_id=${selectedModelId}`);
                const result = await response.json();

                if (result.success) {
                    setReports(result.data || []);
                    // Auto-select first report if available
                    if (result.data && result.data.length > 0) {
                        setSelectedReport(result.data[0].id || result.data[0].report_id || '');
                    }
                } else {
                    setReports([]);
                    setSelectedReport('');
                }
            } catch (error) {
                console.error('Error fetching reports:', error);
                setReports([]);
                setSelectedReport('');
            } finally {
                setLoadingReports(false);
            }
        };

        fetchReports();
    }, [selectedModelId]);

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
                    console.log(`📥 Received ${result.data.length} items from API`);

                    // DON'T set apiData yet - collect LL_IDs and populate cache first
                    const apiDataItems = result.data;
                    const uniqueLlIds = new Set<number>();
                    apiDataItems.forEach((item: any) => {
                        const llId = item.LL_ID ?? item.ll_id;
                        if (llId !== null && llId !== undefined) {
                            uniqueLlIds.add(llId);
                        }
                    });

                    console.log(`📋 Found ${uniqueLlIds.size} unique LL_IDs:`, Array.from(uniqueLlIds));

                    const newCache = new Map<number, { label: string; value: string }[]>();

                    await Promise.all(
                        Array.from(uniqueLlIds).map(async (llId) => {
                            try {
                                const lookupResponse = await fetch(`/api/risk-analysis/lookup-item?ll_id=${llId}`);
                                const lookupResult = await lookupResponse.json();

                                if (lookupResult.success && lookupResult.data) {
                                    const options = lookupResult.data.map((item: any) => ({
                                        label: item.comments || item.value || String(item.li_id),
                                        value: String(item.li_id),
                                    }));
                                    newCache.set(llId, options);
                                    if ([66, 67, 68].includes(llId)) {
                                        console.log(`✅ LL_ID=${llId}: Loaded ${options.length} options`, options);
                                    }
                                }
                            } catch (error) {
                                console.error(`❌ Failed to fetch lookup items for LL_ID ${llId}:`, error);
                            }
                        })
                    );

                    console.log(`💾 Lookup cache populated with ${newCache.size} entries`);
                    setLookupCache(newCache);

                    // NOW set apiData - tree will build with populated lookup cache
                    console.log(`✅ Setting apiData with ${result.data.length} items - cache ready!`);
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

        // debugger;

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

            for (const key of keyCandidates) {
                const value = detailValueMap.get(key);
                if (value !== undefined) {
                    detailValue = value;
                    break;
                }
            }

            // Special logging for TMSF field and RISK10_ children
            // if (item.field_name === 'TMSF' || (item.LinkTD_ID === 649 && item.LinkFD_ID === 1741) || item.LinkTD_ID === 647) {
            //     console.log(`🎯 NODE MATCHING ATTEMPT (${item.field_name || item.table_name}):`);
            //     console.log(`  Node key: ${nodeKey}`);
            //     console.log(`  TD_ID: ${item.TD_ID}`);
            //     console.log(`  LinkTD_ID: ${item.LinkTD_ID}`);
            //     console.log(`  LinkFD_ID: ${item.LinkFD_ID}`);
            //     console.log(`  Key candidates:`, keyCandidates);
            //     console.log(`  Matched key: ${matchedKey}`);
            //     console.log(`  Detail value found: ${detailValue}`);
            //     console.log(`  Value will be stored as: "${detailValue !== undefined && detailValue !== null ? String(detailValue) : ''}"`);
            // }

            // Get dropdown options from lookup cache if LL_ID exists
            // ONLY use lookupCache, ignore hardcoded item.ui.options
            const dropdownOptions = llId !== null && lookupCache.has(llId)
                ? lookupCache.get(llId)
                : undefined;

            // Debug logging ONLY for problematic LL_IDs
            if (llId !== null && [66, 67, 68].includes(llId)) {
                console.log(`🚨 LL_ID ${llId} Node ${index}: field="${item.field_name || item.table_name}" LinkFD=${linkFdId} hasCache=${lookupCache.has(llId)} options=`, dropdownOptions);
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
                    dropdownOptions: dropdownOptions,
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
    }, [apiData, detailValueMap, lookupCache]);

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
    const handleSaveAll = async () => {
        if (Object.keys(editValues).length === 0) {
            alert('No changes to save.');
            return;
        }

        if (!selectedModelId || !selectedAssetId) {
            alert('Please select both a model and an asset first.');
            return;
        }

        setIsSaving(true);

        try {
            // Build changes array with proper metadata from treeData
            const changes = Object.entries(editValues).map(([nodeKey, value]) => {
                const node = treeData[nodeKey];
                return {
                    nodeKey,
                    td_id: node?.data.td_id ?? null,
                    linktd_id: node?.data.linktd_id ?? null,
                    linkfd_id: node?.data.linkfd_id ?? null,
                    value,
                    isCheckbox: node?.data.isCheckbox ?? false,
                };
            });

            console.log('🟢 Saving changes:', changes);

            const response = await fetch('/api/risk-analysis/tree-data/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rbim_id: parseInt(selectedModelId, 10),
                    asset_id: selectedAssetId,
                    changes,
                }),
            });

            const result = await response.json();
            console.log('🟢 Save result:', result);

            if (result.success) {
                alert(`Saved successfully! ${result.totalUpdates} record(s) updated.`);
                
                // Clear edit values after successful save
                setEditValues({});

                // Refresh detail data to get updated calculated values
                if (selectedModelId && selectedAssetId) {
                    setDetailLoading(true);
                    try {
                        const detailUrl = `/api/risk-analysis/model-component-detail?rbim_id=${selectedModelId}&asset_id=${selectedAssetId}`;
                        const detailResponse = await fetch(detailUrl);
                        const detailResult = await detailResponse.json();

                        if (detailResult.success) {
                            setDetailQueries(detailResult.queries || []);
                            console.log('🟢 Detail data refreshed after save');
                        }
                    } catch (refreshError) {
                        console.error('Error refreshing detail data:', refreshError);
                    } finally {
                        setDetailLoading(false);
                    }
                }
            } else {
                alert(`Save failed: ${result.error || 'Unknown error'}`);
                console.error('Save failed:', result);
            }
        } catch (error: any) {
            console.error('Error saving changes:', error);
            alert(`Error saving changes: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    // Handle Risk Summary button click
    const handleRiskSummary = async () => {
        if (!selectedModelId || !selectedAssetId) {
            alert('Please select both a model and an asset first.');
            return;
        }

        setShowRiskSummaryModal(true);
        setLoadingRiskSummary(true);
        setRiskSummaryData([]);

        try {
            const response = await fetch(`/api/risk-analysis/report-risk-summary?rbim_id=${selectedModelId}&asset_id=${selectedAssetId}`);
            const result = await response.json();

            if (result.success) {
                setRiskSummaryData(result.data || []);
            } else {
                console.error('Failed to fetch risk summary:', result.error);
                setRiskSummaryData([]);
            }
        } catch (error) {
            console.error('Error fetching risk summary:', error);
            setRiskSummaryData([]);
        } finally {
            setLoadingRiskSummary(false);
        }
    };

    // Handle Unit Definitions report
    const handleUnitDefinitions = async () => {
        if (!selectedModelId || !selectedAssetId) {
            alert('Please select both a model and an asset first.');
            return;
        }

        setShowUnitDefinitionsModal(true);
        setLoadingUnitDefinitions(true);
        setUnitDefinitionsData([]);

        try {
            const response = await fetch(`/api/risk-analysis/report-5-4?rbim_id=${selectedModelId}&asset_id=${selectedAssetId}`);
            const result = await response.json();

            if (result.success) {
                setUnitDefinitionsData(result.data || []);
            } else {
                console.error('Failed to fetch unit definitions:', result.error);
                setUnitDefinitionsData([]);
            }
        } catch (error) {
            console.error('Error fetching unit definitions:', error);
            setUnitDefinitionsData([]);
        } finally {
            setLoadingUnitDefinitions(false);
        }
    };

    // Handle Report 2-1
    const handleReport21 = async () => {
        if (!selectedModelId || !selectedAssetId) {
            alert('Please select both a model and an asset first.');
            return;
        }

        setShowReport21Modal(true);
        setLoadingReport21(true);
        setReport21Data([]);

        try {
            const response = await fetch(`/api/risk-analysis/report-2-1?rbim_id=${selectedModelId}&asset_id=${selectedAssetId}`);
            const result = await response.json();

            if (result.success) {
                setReport21Data(result.data || []);
            } else {
                console.error('Failed to fetch report 2-1:', result.error);
                setReport21Data([]);
            }
        } catch (error) {
            console.error('Error fetching report 2-1:', error);
            setReport21Data([]);
        } finally {
            setLoadingReport21(false);
        }
    };

    // Handle Report 4-3
    const handleReport43 = async () => {
        if (!selectedModelId || !selectedAssetId) {
            alert('Please select both a model and an asset first.');
            return;
        }

        setShowReport43Modal(true);
        setLoadingReport43(true);
        setReport43Data([]);

        try {
            const response = await fetch(`/api/risk-analysis/report-4-3-b?rbim_id=${selectedModelId}&asset_id=${selectedAssetId}`);
            const result = await response.json();

            if (result.success) {
                setReport43Data(result.data || []);
            } else {
                console.error('Failed to fetch report 4-3:', result.error);
                setReport43Data([]);
            }
        } catch (error) {
            console.error('Error fetching report 4-3:', error);
            setReport43Data([]);
        } finally {
            setLoadingReport43(false);
        }
    };

    // Handle Report 6-4
    const handleReport64 = async () => {
        if (!selectedModelId || !selectedAssetId) {
            alert('Please select both a model and an asset first.');
            return;
        }

        setShowReport64Modal(true);
        setLoadingReport64(true);
        setReport64Data([]);

        try {
            const response = await fetch(`/api/risk-analysis/report-6-4?rbim_id=${selectedModelId}&asset_id=${selectedAssetId}`);
            const result = await response.json();

            if (result.success) {
                setReport64Data(result.data || []);
            } else {
                console.error('Failed to fetch report 6-4:', result.error);
                setReport64Data([]);
            }
        } catch (error) {
            console.error('Error fetching report 6-4:', error);
            setReport64Data([]);
        } finally {
            setLoadingReport64(false);
        }
    };

    // Handle Report 6-5
    const handleReport65 = async () => {
        if (!selectedModelId || !selectedAssetId) {
            alert('Please select both a model and an asset first.');
            return;
        }

        setShowReport65Modal(true);
        setLoadingReport65(true);
        setReport65Data([]);

        try {
            // Note: API uses parent_id parameter instead of asset_id
            const response = await fetch(`/api/risk-analysis/report-6-5?rbim_id=${selectedModelId}&parent_id=${selectedAssetId}`);
            const result = await response.json();

            if (result.success) {
                setReport65Data(result.data || []);
            } else {
                console.error('Failed to fetch report 6-5:', result.error);
                setReport65Data([]);
            }
        } catch (error) {
            console.error('Error fetching report 6-5:', error);
            setReport65Data([]);
        } finally {
            setLoadingReport65(false);
        }
    };

    // Handle Report 6-7
    const handleReport67 = async () => {
        if (!selectedModelId || !selectedAssetId) {
            alert('Please select both a model and an asset first.');
            return;
        }

        setShowReport67Modal(true);
        setLoadingReport67(true);
        setReport67Data([]);

        try {
            const response = await fetch(`/api/risk-analysis/report-6-7?rbim_id=${selectedModelId}&asset_id=${selectedAssetId}`);
            const result = await response.json();

            if (result.success) {
                setReport67Data(result.data || []);
            } else {
                console.error('Failed to fetch report 6-7:', result.error);
                setReport67Data([]);
            }
        } catch (error) {
            console.error('Error fetching report 6-7:', error);
            setReport67Data([]);
        } finally {
            setLoadingReport67(false);
        }
    };

    // Handle Report 6-8
    const handleReport68 = async () => {
        if (!selectedModelId || !selectedAssetId) {
            alert('Please select both a model and an asset first.');
            return;
        }

        setShowReport68Modal(true);
        setLoadingReport68(true);
        setReport68Data([]);

        try {
            const response = await fetch(`/api/risk-analysis/report-6-8?rbim_id=${selectedModelId}&asset_id=${selectedAssetId}`);
            const result = await response.json();

            if (result.success) {
                setReport68Data(result.data || []);
            } else {
                console.error('Failed to fetch report 6-8:', result.error);
                setReport68Data([]);
            }
        } catch (error) {
            console.error('Error fetching report 6-8:', error);
            setReport68Data([]);
        } finally {
            setLoadingReport68(false);
        }
    };

    // Handle Report 7-2
    const handleReport72 = async () => {
        if (!selectedModelId || !selectedAssetId) {
            alert('Please select both a model and an asset first.');
            return;
        }

        setShowReport72Modal(true);
        setLoadingReport72(true);
        setReport72Data([]);

        try {
            const response = await fetch(`/api/risk-analysis/report-7-2?rbim_id=${selectedModelId}&asset_id=${selectedAssetId}`);
            const result = await response.json();

            if (result.success) {
                setReport72Data(result.data || []);
            } else {
                console.error('Failed to fetch report 7-2:', result.error);
                setReport72Data([]);
            }
        } catch (error) {
            console.error('Error fetching report 7-2:', error);
            setReport72Data([]);
        } finally {
            setLoadingReport72(false);
        }
    };

    // Handle Report 8-4 L2
    const handleReport84L2 = async () => {
        if (!selectedModelId || !selectedAssetId) {
            alert('Please select both a model and an asset first.');
            return;
        }

        setShowReport84L2Modal(true);
        setLoadingReport84L2(true);
        setReport84L2Data([]);

        try {
            // Note: Uses parent_id parameter
            const response = await fetch(`/api/risk-analysis/report-4-3?rbim_id=${selectedModelId}&parent_id=${selectedAssetId}`);
            const result = await response.json();

            if (result.success) {
                setReport84L2Data(result.data || []);
            } else {
                console.error('Failed to fetch report 8-4 L2:', result.error);
                setReport84L2Data([]);
            }
        } catch (error) {
            console.error('Error fetching report 8-4 L2:', error);
            setReport84L2Data([]);
        } finally {
            setLoadingReport84L2(false);
        }
    };

    const handleReport101 = async () => {
        if (!selectedModelId || !selectedAssetId) {
            alert('Please select both a model and an asset first.');
            return;
        }

        setShowReport101Modal(true);
        setLoadingReport101(true);
        setReport101Data([]);

        try {
            const response = await fetch(`/api/risk-analysis/report-10-2-pp?rbim_id=${selectedModelId}&asset_id=${selectedAssetId}`);
            const result = await response.json();

            if (result.success) {
                setReport101Data(result.data || []);
            } else {
                console.error('Failed to fetch report 10-1:', result.error);
                setReport101Data([]);
            }
        } catch (error) {
            console.error('Error fetching report 10-1:', error);
            setReport101Data([]);
        } finally {
            setLoadingReport101(false);
        }
    };

    const handleReport93 = async () => {
        if (!selectedModelId || !selectedAssetId) {
            alert('Please select both a model and an asset first.');
            return;
        }

        setShowReport93Modal(true);
        setLoadingReport93(true);
        setReport93Data([]);

        try {
            const response = await fetch(`/api/risk-analysis/report-workpack-summary-l2l3?rbim_id=${selectedModelId}&asset_id=${selectedAssetId}`);
            const result = await response.json();

            if (result.success) {
                setReport93Data(result.data || []);
            } else {
                console.error('Failed to fetch report 9-3:', result.error);
                setReport93Data([]);
            }
        } catch (error) {
            console.error('Error fetching report 9-3:', error);
            setReport93Data([]);
        } finally {
            setLoadingReport93(false);
        }
    };

    const handleReport102 = async () => {
        if (!selectedModelId || !selectedAssetId) {
            alert('Please select both a model and an asset first.');
            return;
        }

        setShowReport102Modal(true);
        setLoadingReport102(true);
        setReport102Data([]);

        try {
            const response = await fetch(`/api/risk-analysis/report-10-2-eq?rbim_id=${selectedModelId}&asset_id=${selectedAssetId}`);
            const result = await response.json();

            if (result.success) {
                setReport102Data(result.data || []);
            } else {
                console.error('Failed to fetch report 10-2:', result.error);
                setReport102Data([]);
            }
        } catch (error) {
            console.error('Error fetching report 10-2:', error);
            setReport102Data([]);
        } finally {
            setLoadingReport102(false);
        }
    };

    const handleInspectionPiping = async () => {
        if (!selectedModelId || !selectedAssetId) {
            alert('Please select both a model and an asset first.');
            return;
        }

        setShowInspectionPipingModal(true);
        setLoadingInspectionPiping(true);
        setInspectionPipingData([]);

        try {
            const response = await fetch(`/api/risk-analysis/report-insp-piping?rbim_id=${selectedModelId}&asset_id=${selectedAssetId}`);
            const result = await response.json();

            if (result.success) {
                setInspectionPipingData(result.data || []);
            } else {
                console.error('Failed to fetch inspection piping report:', result.error);
                setInspectionPipingData([]);
            }
        } catch (error) {
            console.error('Error fetching inspection piping report:', error);
            setInspectionPipingData([]);
        } finally {
            setLoadingInspectionPiping(false);
        }
    };

    const handleInspectionEquipment = async () => {
        if (!selectedModelId || !selectedAssetId) {
            alert('Please select both a model and an asset first.');
            return;
        }

        setShowInspectionEquipmentModal(true);
        setLoadingInspectionEquipment(true);
        setInspectionEquipmentData([]);

        try {
            const response = await fetch(`/api/risk-analysis/report-insp-equipment?rbim_id=${selectedModelId}&asset_id=${selectedAssetId}`);
            const result = await response.json();

            if (result.success) {
                setInspectionEquipmentData(result.data || []);
            } else {
                console.error('Failed to fetch inspection equipment report:', result.error);
                setInspectionEquipmentData([]);
            }
        } catch (error) {
            console.error('Error fetching inspection equipment report:', error);
            setInspectionEquipmentData([]);
        } finally {
            setLoadingInspectionEquipment(false);
        }
    };

    const handleDegMech = async () => {
        if (!selectedModelId || !selectedAssetId) {
            alert('Please select both a model and an asset first.');
            return;
        }

        setShowDegMechModal(true);
        setLoadingDegMech(true);
        setDegMechData([]);

        try {
            const response = await fetch(`/api/risk-analysis/report-deg-mech?rbim_id=${selectedModelId}&asset_id=${selectedAssetId}`);
            const result = await response.json();

            if (result.success) {
                setDegMechData(result.data || []);
            } else {
                console.error('Failed to fetch deg mech report:', result.error);
                setDegMechData([]);
            }
        } catch (error) {
            console.error('Error fetching deg mech report:', error);
            setDegMechData([]);
        } finally {
            setLoadingDegMech(false);
        }
    };

    const handleDegMechAll = async () => {
        if (!selectedModelId || !selectedAssetId) {
            alert('Please select both a model and an asset first.');
            return;
        }

        setShowDegMechAllModal(true);
        setLoadingDegMechAll(true);
        setDegMechAllData([]);

        try {
            const response = await fetch(`/api/risk-analysis/report-deg-mech?rbim_id=${selectedModelId}&asset_id=${selectedAssetId}`);
            const result = await response.json();

            if (result.success) {
                setDegMechAllData(result.data || []);
            } else {
                console.error('Failed to fetch deg mech all report:', result.error);
                setDegMechAllData([]);
            }
        } catch (error) {
            console.error('Error fetching deg mech all report:', error);
            setDegMechAllData([]);
        } finally {
            setLoadingDegMechAll(false);
        }
    };

    const handlePieChart = async () => {
        if (!selectedAssetId) {
            alert('Please select an asset first.');
            return;
        }

        setShowPieChartModal(true);
        setLoadingPieChart(true);
        setPieChartData([]);

        try {
            const response = await fetch(`/api/risk-analysis/report-inclusive-exclusive-piechart?asset_id=${selectedAssetId}`);
            const result = await response.json();

            if (result.success) {
                setPieChartData(result.data || []);
            } else {
                console.error('Failed to fetch pie chart report:', result.error);
                setPieChartData([]);
            }
        } catch (error) {
            console.error('Error fetching pie chart report:', error);
            setPieChartData([]);
        } finally {
            setLoadingPieChart(false);
        }
    };

    const handleCountInspAll = async () => {
        if (!selectedModelId || !selectedAssetId) {
            alert('Please select both a model and an asset first.');
            return;
        }

        setShowCountInspAllModal(true);
        setLoadingCountInspAll(true);
        setCountInspAllData([]);

        try {
            const response = await fetch(`/api/risk-analysis/report-count-all-level-graphic?rbim_id=${selectedModelId}&asset_id=${selectedAssetId}`);
            const result = await response.json();

            if (result.success) {
                setCountInspAllData(result.data || []);
            } else {
                console.error('Failed to fetch count insp all report:', result.error);
                setCountInspAllData([]);
            }
        } catch (error) {
            console.error('Error fetching count insp all report:', error);
            setCountInspAllData([]);
        } finally {
            setLoadingCountInspAll(false);
        }
    };

    const handleCountInspAllGraphic = async () => {
        if (!selectedModelId || !selectedAssetId) {
            alert('Please select both a model and an asset first.');
            return;
        }

        setShowCountInspAllGraphicModal(true);
        setLoadingCountInspAllGraphic(true);
        setCountInspAllGraphicData([]);

        try {
            const response = await fetch(`/api/risk-analysis/report-count-all-level-graphic?rbim_id=${selectedModelId}&asset_id=${selectedAssetId}`);
            const result = await response.json();

            if (result.success) {
                setCountInspAllGraphicData(result.data || []);
            } else {
                console.error('Failed to fetch count insp all graphic report:', result.error);
                setCountInspAllGraphicData([]);
            }
        } catch (error) {
            console.error('Error fetching count insp all graphic report:', error);
            setCountInspAllGraphicData([]);
        } finally {
            setLoadingCountInspAllGraphic(false);
        }
    };

    // Handle report selection change
    const handleReportChange = (reportId: string, reportDescription?: string) => {
        setSelectedReport(reportId);
        if (reportDescription) {
            setSelectedReportTitle(reportDescription);
        }
        if (reportId) {
            console.log('Selected report:', reportId);
            // Check if it's Unit Definitions report (report_id = 4)
            if (reportId === '4') {
                handleUnitDefinitions();
            }
            // Check if it's Report 6-4 (report_id = 8)
            else if (reportId === '8') {
                handleReport64();
            }
            // Check if it's Report 6-5 (report_id = 10)
            else if (reportId === '10') {
                handleReport65();
            }
            // Check if it's Report 6-8 (report_id = 12)
            else if (reportId === '12') {
                handleReport68();
            }
            // Check if it's Report 7-2 (report_id = 15)
            else if (reportId === '15') {
                handleReport72();
            }
            // Check if it's Report 2-1 (report_id = 28)
            else if (reportId === '28') {
                handleReport21();
            }
            // Check if it's Report 6-7 (report_id = 30)
            else if (reportId === '36') {
                handleReport67();
            }
            // Check if it's Report 4-3 (report_id = 45)
            else if (reportId === '45') {
                handleReport43();
            }
            // Check if it's Report 8-4 L2 (report_id = 47)
            else if (reportId === '47') {
                handleReport84L2();
            }
            else if (reportId === '55') {
                handleReport101();
            }
            else if (reportId === '57') {
                handleReport102();
            }
            // Check if it's Report 9-3 (report_id = 66)
            else if (reportId === '66') {
                handleReport93();
            }
            // Check if it's Deg Mech Report (report_id = 69)
            else if (reportId === '69') {
                handleDegMech();
            }
            // Check if it's Deg Mech All Report (report_id = 84)
            else if (reportId === '84') {
                handleDegMechAll();
            }
            // Check if it's Pie Chart Report (report_id = 72)
            else if (reportId === '72') {
                handlePieChart();
            }
            // Check if it's Count Insp All Report (report_id = 101)
            else if (reportId === '101') {
                handleCountInspAll();
            }
            // Check if it's Count Insp All Graphic Report (report_id = 102)
            else if (reportId === '102') {
                handleCountInspAllGraphic();
            }
            // Check if it's Inspection Equipment Report (report_id = 103)
            else if (reportId === '103') {
                handleInspectionEquipment();
            }
            // Check if it's Inspection Piping Report (report_id = 105)
            else if (reportId === '105') {
                handleInspectionPiping();
            }

        }
    };

    // Determine control type based on node data
    const getControlType = (node: TreeGridItem): 'readonly' | 'dropdown' | 'checkbox' | 'textbox' => {
        // Debug for LL_ID 66, 67, 68
        if (node.data.ll_id !== null && [66, 67, 68].includes(node.data.ll_id)) {
            console.log(`🎯 getControlType for LL_ID ${node.data.ll_id}:`, {
                fnd_id: node.data.fnd_id,
                function_name: node.data.function_name,
                isCheckbox: node.data.isCheckbox,
                dropdownOptions: node.data.dropdownOptions,
                ll_id: node.data.ll_id,
            });
        }

        // PRIORITY 1: Checkbox
        if (node.data.isCheckbox) {
            return 'checkbox';
        }

        // PRIORITY 2: Dropdown (if we have dropdown options or ll_id)
        // This must come BEFORE readonly check because fields can have both ll_id and fnd_id
        if ((node.data.dropdownOptions && node.data.dropdownOptions.length > 0) || node.data.ll_id !== null) {
            return 'dropdown';
        }

        // PRIORITY 3: Readonly/calculation (if function_name or fnd_id)
        if (node.data.fnd_id !== null || node.data.function_name) {
            return 'readonly';
        }

        // PRIORITY 4: Editable textbox (default)
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

            // Find matching option to display label instead of value
            const matchedOption = options.find(opt =>
                normalizeValue(opt.value).toLowerCase() === normalizedCurrent
            );
            const displayValue = matchedOption?.label || currentValue;

            // Removed excessive logging

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
                <div className="ml-auto flex gap-2 items-center">
                    {Object.keys(editValues).length > 0 && (
                        <span className="text-sm text-orange-600 dark:text-orange-400">
                            {Object.keys(editValues).length} unsaved change(s)
                        </span>
                    )}
                    <button 
                        onClick={handleSaveAll} 
                        className="btn btn-sm btn-primary"
                        disabled={isSaving || Object.keys(editValues).length === 0}
                    >
                        {isSaving ? 'Saving...' : 'Save All Changes'}
                    </button>
                    <button 
                        onClick={handleRiskSummary} 
                        className="btn btn-sm btn-primary"
                        disabled={!selectedModelId || !selectedAssetId}
                    >
                        Risk Summary
                    </button>
                    <select
                        value={selectedReport}
                        onChange={(e) => {
                            const selectedId = e.target.value;
                            const selectedReportObj = reports.find(r =>
                                (r.id || r.report_id) === selectedId ||
                                (r.id || r.report_id).toString() === selectedId
                            );
                            handleReportChange(selectedId, selectedReportObj?.description);
                        }}
                        className="form-select"
                        style={{ minWidth: '200px' }}
                        disabled={loadingReports || reports.length === 0}
                    >
                        <option value="">Select Report...</option>
                        {reports.map((report, index) => (
                            <option
                                key={report.id || report.report_id || index}
                                value={report.id || report.report_id || index}
                            >
                                {report.description}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Tree Grid */}
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                {/* Header */}
                <div
                    style={{
                        display: 'grid',
                        // Added LL_ID column
                        gridTemplateColumns: '1.6fr 1.6fr 0.8fr 0.8fr 0.8fr 1.2fr 1.4fr',
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
                    <div>LL_ID</div>
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
                                // Match header widths with LL_ID column added
                                gridTemplateColumns: '1.6fr 1.6fr 0.8fr 0.8fr 0.8fr 1.2fr 1.4fr',
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

                                    {/* Column 5: LL_ID */}
                                    <div style={{ fontSize: '13px', color: '#475569', fontWeight: 500 }}>
                                        {treeItem.data.ll_id !== null && treeItem.data.ll_id !== undefined
                                            ? treeItem.data.ll_id
                                            : '-'}
                                    </div>

                                    {/* Column 6: Function Name */}
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

                                    {/* Column 7: Edit Value */}
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

            {/* Risk Summary Modal */}
            <ReportRiskSummary
                isOpen={showRiskSummaryModal}
                onClose={() => {
                    setShowRiskSummaryModal(false);
                    setSelectedReport(''); // Reset dropdown selection
                }}
                data={riskSummaryData}
                loading={loadingRiskSummary}
            />

            {/* Report 5-4 Modal */}
            <Report54
                isOpen={showUnitDefinitionsModal}
                onClose={() => {
                    setShowUnitDefinitionsModal(false);
                    setSelectedReport(''); // Reset dropdown selection
                }}
                data={unitDefinitionsData}
                loading={loadingUnitDefinitions}
            />

            {/* Report 4-3 Modal */}
            <Report43
                isOpen={showReport43Modal}
                onClose={() => {
                    setShowReport43Modal(false);
                    setSelectedReport(''); // Reset dropdown selection
                }}
                data={report43Data}
                loading={loadingReport43}
                reportTitle={selectedReportTitle}
            />

            {/* Report 6-4 Modal */}
            <Report64
                isOpen={showReport64Modal}
                onClose={() => {
                    setShowReport64Modal(false);
                    setSelectedReport(''); // Reset dropdown selection
                }}
                data={report64Data}
                loading={loadingReport64}
                rbimId={selectedModelId}
                modelName={selectedModelName}
            />

            {/* Report 6-5 Modal */}
            <Report65
                isOpen={showReport65Modal}
                onClose={() => {
                    setShowReport65Modal(false);
                    setSelectedReport(''); // Reset dropdown selection
                }}
                data={report65Data}
                loading={loadingReport65}
                reportTitle={selectedReportTitle}
            />

            {/* Report 6-7 Modal */}
            <Report67
                isOpen={showReport67Modal}
                onClose={() => {
                    setShowReport67Modal(false);
                    setSelectedReport(''); // Reset dropdown selection
                }}
                data={report67Data}
                loading={loadingReport67}
                reportTitle={selectedReportTitle}
            />

            {/* Report 6-8 Modal */}
            <Report68
                isOpen={showReport68Modal}
                onClose={() => {
                    setShowReport68Modal(false);
                    setSelectedReport(''); // Reset dropdown selection
                }}
                data={report68Data}
                loading={loadingReport68}
                reportTitle={selectedReportTitle}
            />

            {/* Report 7-2 Modal */}
            <Report72
                isOpen={showReport72Modal}
                onClose={() => {
                    setShowReport72Modal(false);
                    setSelectedReport(''); // Reset dropdown selection
                }}
                data={report72Data}
                loading={loadingReport72}
                reportTitle={selectedReportTitle}
            />

            {/* Report 2-1 Modal */}
            <Report21
                isOpen={showReport21Modal}
                onClose={() => {
                    setShowReport21Modal(false);
                    setSelectedReport(''); // Reset dropdown selection
                }}
                data={report21Data}
                loading={loadingReport21}
                reportTitle={selectedReportTitle}
            />

            {/* Report 8-4 L2 Modal */}
            <Report84L2
                isOpen={showReport84L2Modal}
                onClose={() => {
                    setShowReport84L2Modal(false);
                    setSelectedReport(''); // Reset dropdown selection
                }}
                data={report84L2Data}
                loading={loadingReport84L2}
                reportTitle={selectedReportTitle}
            />

            {/* Report 10-1 Modal */}
            <Report101
                isOpen={showReport101Modal}
                onClose={() => {
                    setShowReport101Modal(false);
                    setSelectedReport('');
                }}
                data={report101Data}
                loading={loadingReport101}
                reportTitle={selectedReportTitle}
            />

            {/* Report 10-2 Modal */}
            <Report102
                isOpen={showReport102Modal}
                onClose={() => {
                    setShowReport102Modal(false);
                    setSelectedReport('');
                }}
                data={report102Data}
                loading={loadingReport102}
                reportTitle={selectedReportTitle}
            />

            {/* Report 9-3 Modal */}
            <Report93
                isOpen={showReport93Modal}
                onClose={() => {
                    setShowReport93Modal(false);
                    setSelectedReport('');
                }}
                data={report93Data}
                loading={loadingReport93}
                reportTitle={selectedReportTitle}
            />

            {/* Deg Mech Modal */}
            <ReportDiagramDegMech
                isOpen={showDegMechModal}
                onClose={() => {
                    setShowDegMechModal(false);
                    setSelectedReport('');
                }}
                data={degMechData}
                loading={loadingDegMech}
                reportTitle={selectedReportTitle}
            />

            {/* Deg Mech All Modal */}
            <ReportDegMechAll
                isOpen={showDegMechAllModal}
                onClose={() => {
                    setShowDegMechAllModal(false);
                    setSelectedReport('');
                }}
                data={degMechAllData}
                loading={loadingDegMechAll}
                reportTitle={selectedReportTitle}
            />

            {/* Pie Chart Modal */}
            <ReportPieChart
                isOpen={showPieChartModal}
                onClose={() => {
                    setShowPieChartModal(false);
                    setSelectedReport('');
                }}
                data={pieChartData}
                loading={loadingPieChart}
                reportTitle={selectedReportTitle}
            />

            {/* Count Insp All Modal */}
            <ReportCountInspAll
                isOpen={showCountInspAllModal}
                onClose={() => {
                    setShowCountInspAllModal(false);
                    setSelectedReport('');
                }}
                data={countInspAllData}
                loading={loadingCountInspAll}
                reportTitle={selectedReportTitle}
            />

            {/* Count Insp All Graphic Modal */}
            <ReportCountInspAllGraphic
                isOpen={showCountInspAllGraphicModal}
                onClose={() => {
                    setShowCountInspAllGraphicModal(false);
                    setSelectedReport('');
                }}
                data={countInspAllGraphicData}
                loading={loadingCountInspAllGraphic}
                reportTitle={selectedReportTitle}
            />

            {/* Inspection Equipment Modal */}
            <ReportInspectionEquipment
                isOpen={showInspectionEquipmentModal}
                onClose={() => {
                    setShowInspectionEquipmentModal(false);
                    setSelectedReport('');
                }}
                data={inspectionEquipmentData}
                loading={loadingInspectionEquipment}
                reportTitle={selectedReportTitle}
            />

            {/* Inspection Piping Modal */}
            <ReportInspectionPiping
                isOpen={showInspectionPipingModal}
                onClose={() => {
                    setShowInspectionPipingModal(false);
                    setSelectedReport('');
                }}
                data={inspectionPipingData}
                loading={loadingInspectionPiping}
                reportTitle={selectedReportTitle}
            />
        </div>
    );
};

export default TreeGridExample;
