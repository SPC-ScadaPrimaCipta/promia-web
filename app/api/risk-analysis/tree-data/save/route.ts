import { NextRequest, NextResponse } from 'next/server';
import sql from 'mssql';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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

interface ChangeItem {
    nodeKey: string;
    td_id: number | null;
    linktd_id: number | null;
    linkfd_id: number | null;
    value: any;
    isCheckbox?: boolean;
}

export async function POST(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { rbim_id, asset_id, changes } = body as {
            rbim_id: number;
            asset_id: number;
            changes: ChangeItem[];
        };

        if (!rbim_id || !asset_id || !changes || !Array.isArray(changes) || changes.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields: rbim_id, asset_id, changes' },
                { status: 400 }
            );
        }

        console.log('🟢 Tree Save Request:', { rbim_id, asset_id, changes_count: changes.length });

        const pool = await getConnection();

        // Get all unique linktd_id values to fetch table names
        const uniqueTdIds = Array.from(new Set(changes.filter(c => c.linktd_id != null).map(c => c.linktd_id))) as number[];
        
        // Get all unique linkfd_id values to fetch field names
        const uniqueFdIds = Array.from(new Set(changes.filter(c => c.linkfd_id != null).map(c => c.linkfd_id))) as number[];

        // Fetch table names for linktd_id values
        const tableNameMap = new Map<number, string>();
        if (uniqueTdIds.length > 0) {
            const tdParams = uniqueTdIds.map((_, idx) => `@td${idx}`).join(',');
            const tableNameQuery = `
                SELECT td_id, Table_Name
                FROM dbo.rbi_table_def
                WHERE td_id IN (${tdParams})
            `;
            const tableNameRequest = pool.request();
            uniqueTdIds.forEach((id, idx) => {
                tableNameRequest.input(`td${idx}`, sql.Int, id);
            });
            const tableNameResult = await tableNameRequest.query(tableNameQuery);
            tableNameResult.recordset.forEach((row: any) => {
                tableNameMap.set(row.td_id, row.Table_Name);
            });
        }

        // Fetch field names for linkfd_id values
        const fieldNameMap = new Map<number, string>();
        if (uniqueFdIds.length > 0) {
            const fdParams = uniqueFdIds.map((_, idx) => `@fd${idx}`).join(',');
            const fieldNameQuery = `
                SELECT fd_id, Field_Name
                FROM dbo.rbi_field_def
                WHERE fd_id IN (${fdParams})
            `;
            const fieldNameRequest = pool.request();
            uniqueFdIds.forEach((id, idx) => {
                fieldNameRequest.input(`fd${idx}`, sql.Int, id);
            });
            const fieldNameResult = await fieldNameRequest.query(fieldNameQuery);
            fieldNameResult.recordset.forEach((row: any) => {
                fieldNameMap.set(row.fd_id, row.Field_Name);
            });
        }

        console.log('🟢 Table Name Map:', Object.fromEntries(tableNameMap));
        console.log('🟢 Field Name Map:', Object.fromEntries(fieldNameMap));

        // Group changes by table name
        const tableUpdates = new Map<string, { column: string; value: any; isCheckbox?: boolean }[]>();

        for (const change of changes) {
            if (change.linktd_id == null || change.linkfd_id == null) {
                console.warn('⚠️ Skipping change with null linktd_id or linkfd_id:', change);
                continue;
            }

            const tableName = tableNameMap.get(change.linktd_id);
            const fieldName = fieldNameMap.get(change.linkfd_id);

            if (!tableName || !fieldName) {
                console.warn('⚠️ Could not resolve table/field name:', {
                    linktd_id: change.linktd_id,
                    linkfd_id: change.linkfd_id,
                    tableName,
                    fieldName,
                });
                continue;
            }

            const criTableName = `CRI_${tableName}`;
            
            if (!tableUpdates.has(criTableName)) {
                tableUpdates.set(criTableName, []);
            }

            tableUpdates.get(criTableName)!.push({
                column: fieldName,
                value: change.value,
                isCheckbox: change.isCheckbox,
            });
        }

        console.log('🟢 Grouped updates by table:', Object.fromEntries(tableUpdates));

        // Execute updates for each table
        const results: { table: string; rowsAffected: number; error?: string }[] = [];

        const tableEntries = Array.from(tableUpdates.entries());
        for (const [tableName, updates] of tableEntries) {
            try {
                const setClauses: string[] = [];
                const updateRequest = pool.request();
                
                updates.forEach((update: { column: string; value: any; isCheckbox?: boolean }, idx: number) => {
                    const paramName = `param${idx}`;
                    
                    // Convert value based on type
                    let dbValue = update.value;
                    
                    // Handle checkbox/boolean values
                    if (update.isCheckbox) {
                        const normValue = String(dbValue).toLowerCase();
                        dbValue = normValue === 'true' || normValue === '1' || normValue === 'yes' ? 1 : 0;
                        updateRequest.input(paramName, sql.Bit, dbValue);
                    } else if (dbValue === null || dbValue === undefined || dbValue === '') {
                        updateRequest.input(paramName, sql.NVarChar, null);
                    } else if (typeof dbValue === 'number') {
                        updateRequest.input(paramName, sql.Float, dbValue);
                    } else if (typeof dbValue === 'boolean') {
                        updateRequest.input(paramName, sql.Bit, dbValue ? 1 : 0);
                    } else {
                        // Try to parse as number
                        const numValue = parseFloat(String(dbValue));
                        if (!isNaN(numValue) && String(dbValue).trim() !== '') {
                            updateRequest.input(paramName, sql.Float, numValue);
                        } else {
                            updateRequest.input(paramName, sql.NVarChar, String(dbValue));
                        }
                    }
                    
                    setClauses.push(`[${update.column}] = @${paramName}`);
                });

                if (setClauses.length === 0) continue;

                const updateQuery = `
                    UPDATE dbo.[${tableName}]
                    SET ${setClauses.join(', ')}
                    WHERE [Component_ID] = @componentId
                `;

                updateRequest.input('componentId', sql.Int, asset_id);

                console.log('🟢 Executing:', updateQuery);
                console.log('🟢 For asset_id:', asset_id);

                const result = await updateRequest.query(updateQuery);
                results.push({
                    table: tableName,
                    rowsAffected: result.rowsAffected[0] || 0,
                });

                console.log('🟢 Update successful:', tableName, 'rows:', result.rowsAffected[0]);

            } catch (tableError: any) {
                console.error('🔴 Error updating table:', tableName, tableError.message);
                results.push({
                    table: tableName,
                    rowsAffected: 0,
                    error: tableError.message,
                });
            }
        }

        // Calculate total updates
        const totalUpdates = results.reduce((sum, r) => sum + r.rowsAffected, 0);
        const hasErrors = results.some(r => r.error);

        console.log('🟢 Save complete:', {
            success: !hasErrors,
            results,
            totalUpdates,
        });

        return NextResponse.json({
            success: !hasErrors,
            message: hasErrors ? 'Some updates failed' : 'Data saved successfully',
            results,
            totalUpdates,
        });

    } catch (error: any) {
        console.error('🔴 Tree Save Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error.message,
            },
            { status: 500 }
        );
    }
}
