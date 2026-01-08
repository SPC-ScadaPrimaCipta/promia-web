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
        const llId = searchParams.get('ll_id');

        if (!llId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'll_id parameter is required',
                },
                { status: 400 }
            );
        }

        const pool = await getConnection();

        const query = `
            SELECT ll_id, li_id, value, comments
            FROM dbo.rbi_lookup_item
            WHERE ll_id = @llId
        `;

        const queryRequest = pool.request();
        queryRequest.input('llId', sql.Int, parseInt(llId));

        const result = await queryRequest.query(query);

        // Transform data to ensure all fields are present
        const fieldDefs = result.recordset.map((row: any) => ({
            ll_id: row.ll_id,
            li_id: row.li_id,
            value: row.value,
            comments: row.comments,
        }));

        return NextResponse.json({
            success: true,
            data: fieldDefs,
        });
    } catch (error) {
        console.error('Error fetching field definitions:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
