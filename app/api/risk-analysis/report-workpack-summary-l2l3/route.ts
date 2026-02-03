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
 * GET /api/risk-analysis/report-workpack-summary-l2l3
 *
 * Query Parameters:
 * - rbim_id (required): The RBI Model ID
 * - asset_id (required): The Asset ID
 *
 * Returns:
 * - data: All rows from dbo.RPT_WORKPACK_SUMMARY_L2L3 for the given model and asset
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = request.nextUrl;
        const rbimId = searchParams.get('rbim_id');
        const assetId = searchParams.get('asset_id');

        if (!rbimId) {
            return NextResponse.json(
                { success: false, error: 'rbim_id parameter is required' },
                { status: 400 }
            );
        }

        if (!assetId) {
            return NextResponse.json(
                { success: false, error: 'asset_id parameter is required' },
                { status: 400 }
            );
        }

        const pool = await getConnection();
        const queryRequest = pool.request();
        queryRequest.input('rbimId', sql.Int, parseInt(rbimId));
        queryRequest.input('assetId', sql.Int, parseInt(assetId));

        const query = `
            SELECT
                insp_year,
                piping,
                equipment,
                rbimID
            FROM dbo.RPT_WORKPACK_SUMMARY_L2L3(@rbimId, @assetId)
        `;

        const result = await queryRequest.query(query);
        const rows = result.recordset ?? [];

        return NextResponse.json({
            success: true,
            data: rows,
        });
    } catch (error) {
        console.error('Error fetching report-workpack-summary-l2l3:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
