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
        const tdId = searchParams.get('td_id');

        if (!tdId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'td_id parameter is required',
                },
                { status: 400 }
            );
        }

        const pool = await getConnection();

        const query = `
            SELECT fd_id, td_id, ft_id, ll_id, Field_Name, name, order_no
            FROM dbo.rbi_field_def
            WHERE td_id = @tdId
            ORDER BY order_no
        `;

        const queryRequest = pool.request();
        queryRequest.input('tdId', sql.Int, parseInt(tdId));

        const result = await queryRequest.query(query);

        // Transform data to ensure all fields are present
        const fieldDefs = result.recordset.map((row: any) => ({
            fd_id: row.fd_id,
            td_id: row.td_id,
            ft_id: row.ft_id,
            ll_id: row.ll_id,
            Field_Name: row.Field_Name,
            name: row.name,
            order_no: row.order_no,
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
