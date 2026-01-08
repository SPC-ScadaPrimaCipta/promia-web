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

/**
 * GET /api/risk-analysis/model-risk
 * 
 * Query Parameters:
 * - rbim_id (required): The RBI Model ID
 * 
 * Returns:
 * - matrixRisk: All risk matrix definitions (rbi_matrix_risk) for the given model
 * - matrixCells: Matrix cells with asset counts for risk distribution
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = request.nextUrl;
        const rbimId = searchParams.get('rbim_id');

        if (!rbimId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'rbim_id parameter is required',
                },
                { status: 400 }
            );
        }

        const pool = await getConnection();
        const queryRequest = pool.request();
        queryRequest.input('rbimId', sql.Int, parseInt(rbimId));

        // First query: select a.* from rbi_matrix_risk a, rbi_model b where a.matrix_id=b.matrix_id and b.rbim_id=@rbim_id
        const matrixRiskQuery = `
            SELECT a.* 
            FROM rbi_matrix_risk a,
                 rbi_model b
            WHERE a.matrix_id = b.matrix_id
              AND b.rbim_id = @rbimId
            ORDER BY a.risk_id
        `;

        // Second query: SELECT mc.*, b.count_asset FROM dbo.RBI_Model m JOIN dbo.rbi_matrix_cell mc ON mc.matrix_id = m.matrix_id LEFT JOIN (...)
        const matrixCellsQuery = `
            SELECT 
                mc.*, 
                ISNULL(b.count_asset, 0) AS count_asset
            FROM dbo.RBI_Model m
            JOIN dbo.rbi_matrix_cell mc
                 ON mc.matrix_id = m.matrix_id
            LEFT JOIN (
                SELECT 
                    ASCII(x.consequence) - 64 AS consequence,
                    x.likelihood,
                    COUNT(*) AS count_asset
                FROM (
                    SELECT 
                        a.*, 
                        b.hierarchy_id AS parents
                    FROM dbo.rbi_risk a
                    LEFT JOIN dbo.rbi_asset b
                           ON a.asset_id = b.asset_id
                    JOIN dbo.rbi_risk_level c
                           ON a.asset_id = c.asset_id
                          AND a.rbim_id  = c.rbim_id
                    WHERE (b.hierarchy_id LIKE '2 %'
                        OR b.hierarchy_id LIKE '% 2 %'
                        OR b.hierarchy_id LIKE '% 2')
                      AND a.rbim_id = @rbimId
                ) x
                GROUP BY x.consequence, x.likelihood
            ) b ON mc.col = b.consequence
               AND mc.row = b.likelihood
            WHERE m.rbim_id = @rbimId
            ORDER BY mc.row, mc.col
        `;

        // Execute both queries in parallel
        const [matrixRiskResult, matrixCellsResult] = await Promise.all([
            queryRequest.query(matrixRiskQuery),
            queryRequest.query(matrixCellsQuery),
        ]);

        const matrixRiskRows = matrixRiskResult.recordset ?? [];
        const matrixCellsRows = matrixCellsResult.recordset ?? [];

        // Process rows to convert icon buffers to base64 strings
        const processIcon = (rows: any[]) => {
            return rows.map((row: any) => {
                const processedRow = { ...row };
                
                // Convert icon buffer to base64 if icon field exists and is a buffer
                if (row.icon !== null && row.icon !== undefined && Buffer.isBuffer(row.icon)) {
                    processedRow.icon = row.icon.toString('base64');
                }
                
                return processedRow;
            });
        };

        const processedMatrixRisk = processIcon(matrixRiskRows);
        const processedMatrixCells = processIcon(matrixCellsRows);

        return NextResponse.json({
            success: true,
            data: {
                matrixRisk: processedMatrixRisk,
                matrixCells: processedMatrixCells,
            },
        });
    } catch (error) {
        console.error('Error fetching model risk data:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}