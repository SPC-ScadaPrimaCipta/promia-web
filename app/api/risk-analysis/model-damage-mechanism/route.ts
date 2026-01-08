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
 * GET /api/risk-analysis/model-damage-mechanism
 * 
 * Query Parameters:
 * - rbim_id (required): The RBI Model ID
 * 
 * Returns:
 * - data: All rows from [dbo].[RPT_DEG_MECH] for the given model and a default asset
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = request.nextUrl;
        const rbimId = searchParams.get('rbim_id');

        if (!rbimId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'rbim_id parameter is required',
                },
                { status: 400 }
            );
        }

        const pool = await getConnection();
        const queryRequest = pool.request();
        queryRequest.input('rbimId', sql.Int, parseInt(rbimId));

        // Query: select * from [dbo].[RPT_DEG_MECH](@RBIM_ID, (select top 1 asset_id from rbi_asset where pos=1))
        const query = `
            SELECT *
            FROM [dbo].[RPT_DEG_MECH](@rbimId, (SELECT TOP 1 asset_id FROM rbi_asset WHERE pos = 1))
        `;

        const result = await queryRequest.query(query);

        // No special processing needed; return rows as-is
        const rows = result.recordset ?? [];

        return NextResponse.json({
            success: true,
            data: rows,
        });
    } catch (error) {
        console.error('Error fetching damage mechanism data:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}