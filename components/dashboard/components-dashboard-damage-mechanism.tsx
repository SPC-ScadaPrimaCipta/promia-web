'use client';
import { IRootState } from '@/store';
import ReactApexChart from 'react-apexcharts';
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

interface DamageMechanismData {
    DEG_MECH: string;
    COUNT_DEG_MECH: number;
    piping: number; // 1 if piping, 0 otherwise
    equipment: number; // 1 if equipment, 0 otherwise
}

interface ChartData {
    categories: string[];
    series: {
        name: string;
        data: number[];
    }[];
}

const DamageMechanismCharts = () => {
    const isDark = useSelector((state: IRootState) => state.themeConfig.theme === 'dark' || state.themeConfig.isDarkMode);
    const isRtl = useSelector((state: IRootState) => state.themeConfig.rtlClass) === 'rtl';

    const [semiQuantData, setSemiQuantData] = useState<DamageMechanismData[]>([]);
    const [quantData, setQuantData] = useState<DamageMechanismData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                // Fetch data for rbim_id=26 (Semi Quantitative Assessment)
                const semiQuantResponse = await fetch('/api/risk-analysis/model-damage-mechanism?rbim_id=26');
                const semiQuantResult = await semiQuantResponse.json();
                if (!semiQuantResult.success) {
                    throw new Error(semiQuantResult.error || 'Failed to fetch semi-quantitative data');
                }
                const semiQuantData = semiQuantResult.data || [];
                console.log('Semi‑Quantitative data sample:', semiQuantData[0]);
                console.log('All columns:', semiQuantData.length > 0 ? Object.keys(semiQuantData[0]) : []);
                setSemiQuantData(semiQuantData);

                // Fetch data for rbim_id=27 (Quantitative Assessment)
                const quantResponse = await fetch('/api/risk-analysis/model-damage-mechanism?rbim_id=27');
                const quantResult = await quantResponse.json();
                if (!quantResult.success) {
                    throw new Error(quantResult.error || 'Failed to fetch quantitative data');
                }
                const quantData = quantResult.data || [];
                console.log('Quantitative data sample:', quantData[0]);
                setQuantData(quantData);
            } catch (err) {
                console.error('Error fetching damage mechanism data:', err);
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Transform data for ApexCharts - group by DEG_MECH and sum COUNT_DEG_MECH per type
    const transformData = (data: DamageMechanismData[]): ChartData => {
        const grouped = new Map<string, { piping: number; equipment: number }>();
        
        data.forEach(item => {
            const key = item.DEG_MECH;
            const existing = grouped.get(key) || { piping: 0, equipment: 0 };
            const count = item.COUNT_DEG_MECH || 0;
            // piping and equipment are flags (1/0) indicating which category the count belongs to
            grouped.set(key, {
                piping: existing.piping + (item.piping ? count : 0),
                equipment: existing.equipment + (item.equipment ? count : 0),
            });
        });

        // Sort keys alphabetically for consistent ordering
        const sortedKeys = Array.from(grouped.keys()).sort();
        const categories = sortedKeys;
        const pipingData = sortedKeys.map(key => grouped.get(key)!.piping);
        const equipmentData = sortedKeys.map(key => grouped.get(key)!.equipment);

        return {
            categories,
            series: [
                {
                    name: 'Piping',
                    data: pipingData,
                },
                {
                    name: 'Equipment',
                    data: equipmentData,
                },
            ],
        };
    };

    const semiQuantChart = transformData(semiQuantData);
    const quantChart = transformData(quantData);

    // Common chart options generator
    const getChartOptions = (title: string, categories: string[]) => ({
        chart: {
            height: 350,
            type: 'bar' as const,
            zoom: {
                enabled: false,
            },
            toolbar: {
                show: false,
            },
        },
        plotOptions: {
            bar: {
                horizontal: false,
                columnWidth: '55%',
                endingShape: 'rounded' as const,
            },
        },
        dataLabels: {
            enabled: false,
        },
        stroke: {
            show: true,
            width: 2,
            colors: ['transparent'],
        },
        colors: ['#4361ee', '#00ab55'],
        xaxis: {
            categories,
            axisBorder: {
                color: isDark ? '#191e3a' : '#e0e6ed',
            },
            labels: {
                style: {
                    colors: isDark ? '#ffffff' : '#000000',
                },
            },
        },
        yaxis: {
            title: {
                text: 'Count',
                style: {
                    color: isDark ? '#ffffff' : '#000000',
                },
            },
            opposite: isRtl,
            reversed: isRtl,
            labels: {
                style: {
                    colors: isDark ? '#ffffff' : '#000000',
                },
            },
        },
        fill: {
            opacity: 1,
        },
        tooltip: {
            y: {
                formatter: (val: number) => val.toLocaleString(),
            },
        },
        grid: {
            borderColor: isDark ? '#191e3a' : '#e0e6ed',
        },
        title: {
            text: title,
            align: 'left' as const,
            style: {
                fontSize: '16px',
                fontWeight: 'bold',
                color: isDark ? '#ffffff' : '#000000',
            },
        },
        legend: {
            show: true,
            position: 'top' as const,
            horizontalAlign: 'right' as const,
            labels: {
                colors: isDark ? '#ffffff' : '#000000',
            },
        },
    });

    if (loading) {
        return (
            <div className="panel h-full">
                <div className="flex h-64 items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                    <span className="ml-2">Loading damage mechanism charts...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="panel h-full">
                <div className="flex h-64 items-center justify-center text-danger">
                    Error loading damage mechanism data: {error}
                </div>
            </div>
        );
    }

    return (
        <div className="panel">
            <h5 className="mb-5 text-lg font-semibold dark:text-white-light">Damage Mechanism Distribution</h5>
            <p className="mb-6 text-white-dark">
                Breakdown of damage mechanisms across piping and equipment for Semi‑Quantitative and Quantitative assessment models.
            </p>
            
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Semi Quantitative Assessment Chart */}
                <div className="rounded border border-white-light p-4 dark:border-dark">
                    <ReactApexChart
                        series={semiQuantChart.series}
                        options={getChartOptions('Semi‑Quantitative Assessment (RBIM ID: 26)', semiQuantChart.categories)}
                        type="bar"
                        height={350}
                        width="100%"
                    />
                </div>

                {/* Quantitative Assessment Chart */}
                <div className="rounded border border-white-light p-4 dark:border-dark">
                    <ReactApexChart
                        series={quantChart.series}
                        options={getChartOptions('Quantitative Assessment (RBIM ID: 27)', quantChart.categories)}
                        type="bar"
                        height={350}
                        width="100%"
                    />
                </div>
            </div>

            <div className="mt-6 text-xs text-white-dark">
                <p>Data source: <code>[dbo].[RPT_DEG_MECH]</code> function. Counts represent the number of assets per damage mechanism.</p>
            </div>
        </div>
    );
};

export default DamageMechanismCharts;