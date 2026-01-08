import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';

// NO AUTHENTICATION REQUIRED - For testing/debugging only
export async function GET(request: NextRequest) {
    try {
        const pool = await getConnection();
        const searchParams = request.nextUrl.searchParams;
        const tableName = searchParams.get('table') || 'RBI_USER';

        // Get column information for the table
        const result = await pool.request().query(`
            SELECT
                COLUMN_NAME,
                DATA_TYPE,
                CHARACTER_MAXIMUM_LENGTH,
                IS_NULLABLE,
                ORDINAL_POSITION
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = '${tableName}'
            ORDER BY ORDINAL_POSITION
        `);

        return NextResponse.json({
            success: true,
            table: tableName,
            columns: result.recordset,
        });
    } catch (error: any) {
        console.error('Database query error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error.message,
            },
            { status: 500 }
        );
    }
}
