import ComponentsDashboardRisk from '@/components/dashboard/components-dashboard-risk';
import DamageMechanismCharts from '@/components/dashboard/components-dashboard-damage-mechanism';
import UnitDefinitionsTable from '@/components/dashboard/components-dashboard-unit-definitions';
import { Metadata } from 'next';
import Link from 'next/link';
import React from 'react';

export const metadata: Metadata = {
    title: 'Risk Dashboard',
};

const RiskDashboard = () => {
    return (
        <div>
            <ul className="flex space-x-2 rtl:space-x-reverse">
                <li>
                    <Link href="/" className="text-primary hover:underline">
                        Dashboard
                    </Link>
                </li>
                <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                    <Link href="/risk-analysis" className="text-primary hover:underline">
                        Risk Analysis
                    </Link>
                </li>
                <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                    <span>Risk Dashboard</span>
                </li>
            </ul>
            <div className="pt-5">
                <div className="mb-5">
                    <h1 className="text-2xl font-bold dark:text-white-light">Risk Assessment Matrices</h1>
                    <p className="text-white-dark">Visual representation of risk matrices for different assessment methodologies</p>
                </div>

                <div className="mb-6 grid gap-6 lg:grid-cols-3">
                    <ComponentsDashboardRisk 
                        rbimId={7} 
                        title="Risk Matrix for Qualitative Assessment" 
                    />
                    
                    <ComponentsDashboardRisk 
                        rbimId={26} 
                        title="Risk Matrix for Semi Quantitative Assessment" 
                    />
                    
                    <ComponentsDashboardRisk 
                        rbimId={27} 
                        title="Risk Matrix for Quantitative Assessment" 
                    />
                </div>

                <DamageMechanismCharts />

                <UnitDefinitionsTable />

                <div className="panel">
                    <div className="mb-5">
                        <h5 className="text-lg font-semibold dark:text-white-light">About Risk Matrices</h5>
                    </div>
                    <div className="space-y-4 text-white-dark">
                        <p>
                            Risk matrices are visual tools used to assess and prioritize risks based on their likelihood and consequence. 
                            Each cell in the matrix represents a combination of likelihood (rows) and consequence (columns), 
                            with the color indicating the risk level and the number showing the count of assets in that risk category.
                        </p>
                        <div className="grid gap-4 sm:grid-cols-3">
                            <div className="rounded border border-white-light p-4 dark:border-dark">
                                <h6 className="mb-2 font-semibold text-primary">Qualitative Assessment</h6>
                                <p className="text-sm">
                                    Uses descriptive scales (e.g., Low, Medium, High) for likelihood and consequence. 
                                    Suitable for initial risk screening.
                                </p>
                            </div>
                            <div className="rounded border border-white-light p-4 dark:border-dark">
                                <h6 className="mb-2 font-semibold text-primary">Semi-Quantitative Assessment</h6>
                                <p className="text-sm">
                                    Combines qualitative descriptions with numerical scores. 
                                    Provides more granularity than purely qualitative methods.
                                </p>
                            </div>
                            <div className="rounded border border-white-light p-4 dark:border-dark">
                                <h6 className="mb-2 font-semibold text-primary">Quantitative Assessment</h6>
                                <p className="text-sm">
                                    Uses numerical values for likelihood and consequence. 
                                    Enables more precise risk calculations and cost-benefit analysis.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RiskDashboard;