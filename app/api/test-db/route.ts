import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getConnection, sql } from '@/lib/db';

// GET: Test database connection and query
export async function GET() {
    // Check if user is authenticated
    const session = await getServerSession();

    if (!session) {
        return NextResponse.json(
            {
                success: false,
                error: 'Unauthorized - Please login first',
            },
            { status: 401 }
        );
    }

    try {
        const pool = await getConnection();

        // Example 1: Simple query
        const result = await pool.request().query('SELECT @@VERSION as version');

        return NextResponse.json({
            success: true,
            message: 'Connected to SQL Server',
            data: result.recordset,
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
