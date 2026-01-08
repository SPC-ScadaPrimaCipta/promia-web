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

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = request.nextUrl;
        const ctId = searchParams.get('ct_id');

        if (!ctId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'ct_id parameter is required',
                },
                { status: 400 }
            );
        }

        const pool = await getConnection();

        // Build query
        let query = `
            SELECT
                c.ct_id,
                a.td_id,
                b.name,
                b.Table_Name,
                a.pos
            FROM dbo.rbi_info_def a
            INNER JOIN dbo.rbi_table_def b ON a.td_id = b.td_id
            INNER JOIN dbo.rbi_comp_type c ON a.ct_id = c.ct_id
            WHERE c.ct_id = @ctId
            ORDER BY a.pos
        `;

        const queryRequest = pool.request();
        queryRequest.input('ctId', sql.Int, parseInt(ctId));

        const result = await queryRequest.query(query);

        // Transform data
        const assetInfo = result.recordset.map((row: any) => ({
            ct_id: row.ct_id,
            td_id: row.td_id,
            name: row.name,
            Table_Name: row.Table_Name,
            pos: row.pos,
        }));

        return NextResponse.json({
            success: true,
            data: assetInfo,
        });
    } catch (error) {
        console.error('Error fetching asset info:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
