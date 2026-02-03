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
 * GET /api/risk-analysis/report-6-5
 *
 * Query Parameters:
 * - rbim_id (required): The RBI Model ID
 * - parent_id (required): The Parent ID
 *
 * Returns:
 * - data: All rows from dbo.RPT_6_5 for the given model and parent
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = request.nextUrl;
        const rbimId = searchParams.get('rbim_id');
        const parentId = searchParams.get('parent_id');

        if (!rbimId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'rbim_id parameter is required',
                },
                { status: 400 }
            );
        }

        if (!parentId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'parent_id parameter is required',
                },
                { status: 400 }
            );
        }

        const pool = await getConnection();
        const queryRequest = pool.request();
        queryRequest.input('rbimId', sql.Int, parseInt(rbimId));
        queryRequest.input('parentId', sql.Int, parseInt(parentId));

        const query = `
            SELECT
                RBIM_ID,
                PARENT_ID,
                EQUIPMENT,
                HIERARCHY_ID,
                ASSET_ID,
                PART,
                DESCRIPTION
            FROM dbo.RPT_6_5(@rbimId, @parentId)
        `;

        const result = await queryRequest.query(query);

        // No special processing needed; return rows as-is
        const rows = result.recordset ?? [];

        return NextResponse.json({
            success: true,
            data: rows,
        });
    } catch (error) {
        console.error('Error fetching report 6-5:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
