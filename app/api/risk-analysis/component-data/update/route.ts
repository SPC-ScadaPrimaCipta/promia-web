import { NextRequest, NextResponse } from 'next/server';
import sql from 'mssql';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER || '',
    database: process.env.DB_DATABASE,
    options: {
        encrypt: true,
        trustServerCertificate: true,
    },
};

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { table_name, asset_id, updates } = body;

        if (!table_name || !asset_id || !updates || !Array.isArray(updates)) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields: table_name, asset_id, updates' },
                { status: 400 }
            );
        }

        // Validate table name to prevent SQL injection
        if (!/^[a-zA-Z0-9_]+$/.test(table_name)) {
            return NextResponse.json(
                { success: false, error: 'Invalid table name format' },
                { status: 400 }
            );
        }

        console.log('🔵 Update request:', { table_name, asset_id, updates_count: updates.length });

        const pool = await sql.connect(config);

        // Ensure we're writing to CIG table (even if CIV is passed)
        const finalTableName = table_name.startsWith('CIV_') 
            ? table_name.replace(/^CIV_/, 'CIG_') 
            : table_name;

        // Use Asset_ID with capital letters (from database schema)
        const assetIdColumn = 'Asset_ID';
        
        console.log('🔵 Original table:', table_name);
        console.log('🔵 Final write table:', finalTableName);
        console.log('🔵 Using column name:', assetIdColumn);

        // Group updates by record index (for multiple records support)
        const recordUpdates: Record<number, any[]> = {};
        updates.forEach((update: any) => {
            const { record_index = 0, column, value } = update;
            if (!recordUpdates[record_index]) {
                recordUpdates[record_index] = [];
            }
            recordUpdates[record_index].push({ column, value });
        });

        const results = [];

        // Process each record
        for (const [recordIndex, recordUpdatesArray] of Object.entries(recordUpdates)) {
            const setClauses: string[] = [];
            const request = pool.request();
            
            recordUpdatesArray.forEach((update: any, idx: number) => {
                const { column, value } = update;
                const paramName = `param${idx}`;
                
                // Determine SQL type based on value
                if (value === null || value === undefined) {
                    request.input(paramName, sql.NVarChar, null);
                } else if (typeof value === 'number') {
                    request.input(paramName, sql.Float, value);
                } else if (typeof value === 'boolean') {
                    request.input(paramName, sql.Bit, value);
                } else {
                    request.input(paramName, sql.NVarChar, String(value));
                }
                
                setClauses.push(`[${column}] = @${paramName}`);
            });

            if (setClauses.length === 0) continue;

            // Build UPDATE query with final table name
            const updateQuery = `
                UPDATE dbo.[${finalTableName}]
                SET ${setClauses.join(', ')}
                WHERE [${assetIdColumn}] = @assetId
            `;

            request.input('assetId', sql.Int, asset_id);

            console.log('🔵 Executing update query:', updateQuery);
            console.log('🔵 Table:', finalTableName);
            console.log('🔵 Asset ID:', asset_id);
            console.log('🔵 SET clauses:', setClauses);
            console.log('🔵 Updates:', recordUpdatesArray);

            try {
                const result = await request.query(updateQuery);
                results.push({
                    record_index: recordIndex,
                    rowsAffected: result.rowsAffected[0],
                });
                console.log('🔵 Update successful, rows affected:', result.rowsAffected[0]);
            } catch (queryError: any) {
                console.error('🔴 Query execution error:', queryError);
                console.error('🔴 Error message:', queryError.message);
                
                // Check if error is about column not existing or conversion error
                if (queryError.message?.includes('Invalid column name') || 
                    queryError.message?.includes('Conversion failed')) {
                    
                    console.log('🔵 Attempting fallback: trying without V/C suffix or with different approach');
                    
                    // Retry with modified columns (strip suffix or handle differently)
                    // For now, throw error to let frontend know
                    throw new Error(`Column/Type mismatch: ${queryError.message}. Column may need different format.`);
                }
                
                throw new Error(`Failed to update record ${recordIndex}: ${queryError.message}`);
            }
        }

        // Don't close pool - let connection pooling handle it
        // await pool.close();

        console.log('🟢 Update complete:', {
            success: true,
            results_count: results.length,
            total_updates: results.reduce((sum, r) => sum + r.rowsAffected, 0),
        });

        return NextResponse.json({
            success: true,
            message: 'Data updated successfully',
            results,
            total_updates: results.reduce((sum, r) => sum + r.rowsAffected, 0),
        });
    } catch (error: any) {
        console.error('🔴 Error updating component data:', error);
        console.error('🔴 Error stack:', error.stack);
        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Failed to update data',
                details: error.toString(),
            },
            { status: 500 }
        );
    }
}
