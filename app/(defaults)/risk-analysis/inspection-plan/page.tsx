'use client';

import Link from 'next/link';
import React, { useState } from 'react';
import ComponentTreeView from '@/components/risk-analysis/ComponentTreeView';
import InspectionView from '@/components/risk-analysis/InspectionView';

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
    icon?: string | null;
}

const InspectionPlan = () => {
    const [selectedAsset, setSelectedAsset] = useState<AssetData | null>(null);
    const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
    const [selectedModelName, setSelectedModelName] = useState<string | null>(null);

    const handleModelChange = (modelId: string | null, modelName: string | null) => {
        console.log('InspectionPlan: Model changed to:', modelId, modelName);
        setSelectedModelId(modelId);
        setSelectedModelName(modelName);
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
                    <span>Inspection Plan</span>
                </li>
            </ul>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-10">
                {/* Left Column - Equipment Tree View */}
                <div className="panel lg:col-span-2">
                    <h5 className="mb-5 text-lg font-semibold dark:text-white-light">Equipment Selection</h5>
                    <ComponentTreeView onAssetSelect={setSelectedAsset} onModelChange={handleModelChange} />
                </div>

                {/* Right Column - Inspection View */}
                <div className="panel lg:col-span-8">
                    <h5 className="mb-5 text-lg font-semibold dark:text-white-light">Inspection Planning</h5>
                    <InspectionView 
                        selectedModelId={selectedModelId} 
                        selectedModelName={selectedModelName} 
                        selectedAsset={selectedAsset} 
                    />
                </div>
            </div>
        </div>
    );
};

export default InspectionPlan;