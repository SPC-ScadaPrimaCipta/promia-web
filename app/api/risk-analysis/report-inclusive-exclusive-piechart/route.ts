import { NextRequest, NextResponse } from 'next/server';
import sql from 'mssql';

// SQL Server connection configuration
const config: sql.config = {
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
    server: process.env.DB_SERVER || '',
    database: process.env.DB_DATABASE || '',
    options: {
        encrypt: true,
        trustServerCertificate: true,
    },
};

let pool: sql.ConnectionPool | null = null;

async function getConnection() {
    if (!pool) {
        pool = await sql.connect(config);
    }
    return pool;
}

/**
 * GET /api/risk-analysis/report-inclusive-exclusive-piechart
 *
 * Query Parameters:
 * - asset_id (required): The Asset ID
 *
 * Returns:
 * - data: All rows from dbo.RPT_INCLUSIVE_EXCLUSIVE_PIECHART_INFO for the given asset
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = request.nextUrl;
        const assetId = searchParams.get('asset_id');

        if (!assetId) {
            return NextResponse.json(
                { success: false, error: 'asset_id parameter is required' },
                { status: 400 }
            );
        }

        const pool = await getConnection();
        const queryRequest = pool.request();
        queryRequest.input('assetId', sql.Int, parseInt(assetId));

        const query = `
            SELECT
                unit__id,
                unit_name,
                Count_inclusive_exclusive,
                ct_id
            FROM dbo.RPT_INCLUSIVE_EXCLUSIVE_PIECHART_INFO(@assetId)
        `;

        const result = await queryRequest.query(query);
        const rows = result.recordset ?? [];

        return NextResponse.json({
            success: true,
            data: rows,
        });
    } catch (error) {
        console.error('Error fetching report-inclusive-exclusive-piechart:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
