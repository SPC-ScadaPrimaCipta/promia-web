import { NextResponse } from 'next/server';
import { getConnection } from '@/lib/db';

// Temporary endpoint to test database - NO AUTH REQUIRED for testing
export async function GET() {
    try {
        const pool = await getConnection();

        // Get all users with all columns to see password field
        const result = await pool.request()
            .query('SELECT TOP 10 * FROM RBI_USER');

        return NextResponse.json({
            success: true,
            message: 'Database connected successfully',
            users: result.recordset,
            count: result.recordset.length
        });
    } catch (error: any) {
        console.error('Database test error:', error);
        return NextResponse.json({
            success: false,
            error: error.message,
            details: error
        }, { status: 500 });
    }
}
