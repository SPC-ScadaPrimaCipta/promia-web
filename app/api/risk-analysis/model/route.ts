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
        const rbimId = searchParams.get('rbim_id');

        const pool = await getConnection();

        const queryRequest = pool.request();
        let query = `
            SELECT rbim_id, name, matrix_id
            FROM dbo.rbi_model
            WHERE Matrix_ID is not null
            ORDER BY name
        `;

        if (rbimId) {
            query += ' WHERE rbim_id = @rbimId';
            queryRequest.input('rbimId', sql.Int, parseInt(rbimId));
        }

        const result = await queryRequest.query(query);

        // Transform data to ensure all fields are present
        const fieldDefs = result.recordset.map((row: any) => ({
            rbim_id: row.rbim_id,
            name: row.name,
            matrix_id: row.matrix_id,
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
