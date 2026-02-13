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
        const tableName = searchParams.get('table_name');
        const assetId = searchParams.get('asset_id');

        if (!tableName || !assetId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'table_name and asset_id parameters are required',
                },
                { status: 400 }
            );
        }

        // Validate table name to prevent SQL injection (only allow alphanumeric and underscore)
        if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid table name format',
                },
                { status: 400 }
            );
        }

        const pool = await getConnection();

        // Build query - table name must be injected directly as it cannot be parameterized
        // Use Asset_ID with capital letters (from database schema)
        const query = `SELECT * FROM dbo.[${tableName}] WHERE [Asset_ID] = @assetId`;

        console.log('🔵 Fetching data from table:', tableName);
        console.log('🔵 Asset ID:', assetId);

        const queryRequest = pool.request();
        queryRequest.input('assetId', sql.Int, parseInt(assetId));

        const result = await queryRequest.query(query);

        // Get column names from the result
        const columns = result.recordset.columns ? Object.keys(result.recordset.columns) : [];

        return NextResponse.json({
            success: true,
            data: result.recordset,
            columns: columns,
        });
    } catch (error) {
        console.error('Error fetching asset data:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
