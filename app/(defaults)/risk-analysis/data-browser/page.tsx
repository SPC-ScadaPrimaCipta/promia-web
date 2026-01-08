'use client';

import Link from 'next/link';
import React, { useMemo, useState } from 'react';
import { Tree, ControlledTreeEnvironment, TreeItem } from 'react-complex-tree';
import 'react-complex-tree/lib/style-modern.css';

interface RowData {
    label: string;
    detailA: string;
    detailB: string;
    detailC: string;
    detailD: string;
}

interface TreeRow extends TreeItem<RowData> {
    index: string;
    children?: string[];
    data: RowData;
    isFolder?: boolean;
}

type TreeRows = Record<string, TreeRow>;

const DataBrowser = () => {
    // Manually define 10 rows (no iteration) with parent/child relationships and 5 columns of data
    const initialRows: TreeRows = {
        'parent-1': {
            index: 'parent-1',
            children: ['child-1', 'child-2'],
            data: { label: 'Parent 1', detailA: 'P1-A', detailB: 'P1-B', detailC: 'P1-C', detailD: 'P1-D' },
            isFolder: true,
        },
        'child-1': {
            index: 'child-1',
            children: [],
            data: { label: 'Child 1', detailA: 'C1-A', detailB: 'C1-B', detailC: 'C1-C', detailD: 'C1-D' },
            isFolder: false,
        },
        'child-2': {
            index: 'child-2',
            children: [],
            data: { label: 'Child 2', detailA: 'C2-A', detailB: 'C2-B', detailC: 'C2-C', detailD: 'C2-D' },
            isFolder: false,
        },
        'parent-2': {
            index: 'parent-2',
            children: ['child-3', 'child-4'],
            data: { label: 'Parent 2', detailA: 'P2-A', detailB: 'P2-B', detailC: 'P2-C', detailD: 'P2-D' },
            isFolder: true,
        },
        'child-3': {
            index: 'child-3',
            children: [],
            data: { label: 'Child 3', detailA: 'C3-A', detailB: 'C3-B', detailC: 'C3-C', detailD: 'C3-D' },
            isFolder: false,
        },
        'child-4': {
            index: 'child-4',
            children: [],
            data: { label: 'Child 4', detailA: 'C4-A', detailB: 'C4-B', detailC: 'C4-C', detailD: 'C4-D' },
            isFolder: false,
        },
        'parent-3': {
            index: 'parent-3',
            children: ['child-5', 'child-6', 'child-7'],
            data: { label: 'Parent 3', detailA: 'P3-A', detailB: 'P3-B', detailC: 'P3-C', detailD: 'P3-D' },
            isFolder: true,
        },
        'child-5': {
            index: 'child-5',
            children: [],
            data: { label: 'Child 5', detailA: 'C5-A', detailB: 'C5-B', detailC: 'C5-C', detailD: 'C5-D' },
            isFolder: false,
        },
        'child-6': {
            index: 'child-6',
            children: [],
            data: { label: 'Child 6', detailA: 'C6-A', detailB: 'C6-B', detailC: 'C6-C', detailD: 'C6-D' },
            isFolder: false,
        },
        'child-7': {
            index: 'child-7',
            children: [],
            data: { label: 'Child 7', detailA: 'C7-A', detailB: 'C7-B', detailC: 'C7-C', detailD: 'C7-D' },
            isFolder: false,
        },
    };

    initialRows['root'] = {
        index: 'root',
        children: [
            'parent-1',
            'parent-2',
            'parent-3',
        ],
        data: { label: 'Data Browser', detailA: '', detailB: '', detailC: '', detailD: '' },
        isFolder: true,
    };

    const [rows, setRows] = useState<TreeRows>(initialRows);
    const items = useMemo(() => rows, [rows]);
    const [expandedItems, setExpandedItems] = useState<string[]>(['root', 'parent-1', 'parent-2', 'parent-3']);
    const [selectedItems, setSelectedItems] = useState<string[]>([]);

    // Parent map to compute levels for indentation
    const parentMap: Record<string, string | undefined> = {
        'child-1': 'parent-1',
        'child-2': 'parent-1',
        'child-3': 'parent-2',
        'child-4': 'parent-2',
        'child-5': 'parent-3',
        'child-6': 'parent-3',
        'child-7': 'parent-3',
    };

    const getLevel = (key: string): number => {
        let level = 0;
        let current = parentMap[key];
        while (current) {
            level += 1;
            current = parentMap[current];
        }
        return level;
    };

    const renderRow = (item: TreeRow) => {
        const level = getLevel(item.index);
        const indentPx = level * 16;
        return (
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: '12px', width: '100%' }}>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontWeight: item.isFolder ? 600 : 400,
                        paddingLeft: `${indentPx}px`,
                    }}
                >
                    {item.data.label}
                </div>
                <div style={{ fontSize: '13px' }}>{item.data.detailA}</div>
                <div style={{ fontSize: '13px' }}>{item.data.detailB}</div>
                <div style={{ fontSize: '13px' }}>{item.data.detailC}</div>
                <div style={{ fontSize: '13px' }}>{item.data.detailD}</div>
            </div>
        );
    };

    const randomizeColumnFive = () => {
        debugger;
        const rand = () => `Rand ${Math.random().toFixed(4)}`;
        setRows((prev) => ({
            ...prev,
            'parent-1': { ...prev['parent-1'], data: { ...prev['parent-1'].data, detailD: rand() } },
            'child-1': { ...prev['child-1'], data: { ...prev['child-1'].data, detailD: rand() } },
            'child-2': { ...prev['child-2'], data: { ...prev['child-2'].data, detailD: rand() } },
            'parent-2': { ...prev['parent-2'], data: { ...prev['parent-2'].data, detailD: rand() } },
            'child-3': { ...prev['child-3'], data: { ...prev['child-3'].data, detailD: rand() } },
            'child-4': { ...prev['child-4'], data: { ...prev['child-4'].data, detailD: rand() } },
            'parent-3': { ...prev['parent-3'], data: { ...prev['parent-3'].data, detailD: rand() } },
            'child-5': { ...prev['child-5'], data: { ...prev['child-5'].data, detailD: rand() } },
            'child-6': { ...prev['child-6'], data: { ...prev['child-6'].data, detailD: rand() } },
            'child-7': { ...prev['child-7'], data: { ...prev['child-7'].data, detailD: rand() } },
        }));
    };

    return (
        <div>
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
                <h5 className="mb-5 text-lg font-semibold dark:text-white-light">Data Browser</h5>
                <div className="mb-4">
                    <button className="btn btn-primary btn-sm" onClick={randomizeColumnFive}>
                        Randomize 5th Column
                    </button>
                </div>
                {/* Header */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
                        padding: '10px 12px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        fontWeight: 600,
                    }}
                    className="mb-0"
                >
                    <div>Label</div>
                    <div>Detail A</div>
                    <div>Detail B</div>
                    <div>Detail C</div>
                    <div>Detail D</div>
                </div>

                {/* Tree content */}
                <div style={{ border: '1px solid #e2e8f0', borderTop: 'none' }}>
                    <ControlledTreeEnvironment
                        items={items}
                        getItemTitle={(item) => item.data.label}
                        renderItemTitle={({ item }) => renderRow(item as TreeRow)}
                        viewState={{ 'data-browser': { expandedItems, selectedItems } }}
                        onExpandItem={(item) => setExpandedItems((prev) => [...prev, item.index as string])}
                        onCollapseItem={(item) => setExpandedItems((prev) => prev.filter((id) => id !== item.index))}
                        onSelectItems={(items) => setSelectedItems(items as string[])}
                        canDragAndDrop={false}
                        canDropOnFolder={false}
                        canReorderItems={false}
                    >
                        <Tree treeId="data-browser" rootItem="root" treeLabel="Data Browser Grid" />
                    </ControlledTreeEnvironment>
                </div>
            </div>
        </div>
    );
};

export default DataBrowser;
