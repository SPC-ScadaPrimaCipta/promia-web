/**
 * Centralized Chart.js configuration for all reports
 * This file contains color palettes, dataset configurations, and chart defaults
 */

// Chart color palette
export const CHART_COLORS = {
    piping: {
        background: 'rgba(54, 162, 235, 0.7)',
        border: 'rgba(54, 162, 235, 1)',
    },
    equipment: {
        background: 'rgba(255, 99, 132, 0.7)',
        border: 'rgba(255, 99, 132, 1)',
    },
    total: {
        background: 'rgba(75, 192, 192, 0.7)',
        border: 'rgba(75, 192, 192, 1)',
    },
    // Pie chart default colors
    pieChart: [
        {
            background: 'rgba(255, 99, 132, 0.7)',
            border: 'rgba(255, 99, 132, 1)',
        },
        {
            background: 'rgba(54, 162, 235, 0.7)',
            border: 'rgba(54, 162, 235, 1)',
        },
        {
            background: 'rgba(255, 206, 86, 0.7)',
            border: 'rgba(255, 206, 86, 1)',
        },
        {
            background: 'rgba(75, 192, 192, 0.7)',
            border: 'rgba(75, 192, 192, 1)',
        },
        {
            background: 'rgba(153, 102, 255, 0.7)',
            border: 'rgba(153, 102, 255, 1)',
        },
        {
            background: 'rgba(255, 159, 64, 0.7)',
            border: 'rgba(255, 159, 64, 1)',
        },
    ]
};

// Default dataset configuration for bar charts
export const createBarDataset = (
    label: string,
    data: number[],
    type: 'piping' | 'equipment' | 'total'
) => ({
    label,
    data,
    backgroundColor: CHART_COLORS[type].background,
    borderColor: CHART_COLORS[type].border,
    borderWidth: 1,
});

// Default chart options with improved Y-axis
export const getDefaultChartOptions = (title: string) => ({
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
        legend: {
            position: 'top' as const,
        },
        title: {
            display: true,
            text: title,
            font: {
                size: 16,
                weight: 'bold' as const
            }
        },
    },
    scales: {
        y: {
            beginAtZero: true,
            ticks: {
                maxTicksLimit: 8,
                precision: 0
            },
            grid: {
                drawBorder: true,
                color: 'rgba(0, 0, 0, 0.1)'
            }
        }
    }
});

// Pie chart options
export const getPieChartOptions = (title: string) => ({
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
        legend: {
            position: 'top' as const,
        },
        title: {
            display: true,
            text: title,
            font: {
                size: 16,
                weight: 'bold' as const
            }
        },
    },
});

// Get pie chart colors for multiple categories
export const getPieChartColors = (count: number) => {
    const colors = CHART_COLORS.pieChart;
    const backgrounds = [];
    const borders = [];

    for (let i = 0; i < count; i++) {
        const colorIndex = i % colors.length;
        backgrounds.push(colors[colorIndex].background);
        borders.push(colors[colorIndex].border);
    }

    return { backgrounds, borders };
};
