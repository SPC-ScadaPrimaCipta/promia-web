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
        const clusterId = searchParams.get('cluster');
        const searchTerm = searchParams.get('search');
        const rbimId = searchParams.get('rbim_id'); // Model ID for risk level lookup

        const pool = await getConnection();

        let query: string;
        const params: any = {};

        // Base query with risk level joins
        const buildBaseQuery = (includeRiskData: boolean) => {
            let selectClause = `
                a.parent_id,
                b.asset_name as parent_name,
                a.asset_id,
                a.asset_name,
                a.ct_id,
                a.pos,
                a.hierarchy_id,
                c.ci_id,
                c.description`;

            if (includeRiskData) {
                selectClause += `,
                CASE WHEN rl.asset_id IS NOT NULL THEN rr.risk_overall ELSE NULL END as risk_overall,
                CASE WHEN rl.asset_id IS NOT NULL THEN CAST(rr.likelihood as VARCHAR)+rr.consequence ELSE NULL END as risk_level,
                CASE WHEN rl.asset_id IS NOT NULL THEN mr.icon ELSE NULL END as icon`;
            }

            let fromClause = `
                FROM rbi_asset a
                INNER JOIN rbi_asset b ON a.parent_id = b.asset_id
                INNER JOIN rbi_comp_type c ON a.ct_id = c.ct_id`;

            if (includeRiskData) {
                fromClause += `
                LEFT JOIN dbo.rbi_risk_level rl
                    ON rl.asset_id = a.asset_id
                    AND rl.rbim_id = @rbimId
                LEFT JOIN dbo.rbi_risk rr
                    ON rr.asset_id = a.asset_id
                    AND rr.rbim_id = @rbimId
                LEFT JOIN dbo.RBI_Model m
                    ON m.RBIM_ID = @rbimId
                LEFT JOIN dbo.rbi_matrix_risk mr
                    ON mr.matrix_id = m.Matrix_ID
                    AND mr.risk_id = rr.risk_overall`;
            }

            return `SELECT ${selectClause} ${fromClause} WHERE 1=1`;
        };

        const includeRiskData = !!(rbimId && rbimId !== '');
        if (includeRiskData) {
            params.rbimId = parseInt(rbimId!);
        }

        // Build query based on parameters
        if (clusterId && clusterId !== 'ALL') {
            // Use CTE to get cluster and all its descendants
            const selectClause = includeRiskData
                ? `a.parent_id,
                    b.asset_name as parent_name,
                    a.asset_id,
                    a.asset_name,
                    a.ct_id,
                    a.pos,
                    a.hierarchy_id,
                    c.ci_id,
                    c.description,
                    CASE WHEN rl.asset_id IS NOT NULL THEN rr.risk_overall ELSE NULL END as risk_overall,
                    CASE WHEN rl.asset_id IS NOT NULL THEN CAST(rr.likelihood as VARCHAR)+rr.consequence ELSE NULL END as risk_level,
                    CASE WHEN rl.asset_id IS NOT NULL THEN mr.icon ELSE NULL END as icon`
                : `a.parent_id,
                    b.asset_name as parent_name,
                    a.asset_id,
                    a.asset_name,
                    a.ct_id,
                    a.pos,
                    a.hierarchy_id,
                    c.ci_id,
                    c.description`;

            const joinClause = includeRiskData
                ? `INNER JOIN rbi_asset b ON a.parent_id = b.asset_id
                INNER JOIN rbi_comp_type c ON a.ct_id = c.ct_id
                LEFT JOIN dbo.rbi_risk_level rl
                    ON rl.asset_id = a.asset_id
                    AND rl.rbim_id = @rbimId
                LEFT JOIN dbo.rbi_risk rr
                    ON rr.asset_id = a.asset_id
                    AND rr.rbim_id = @rbimId
                LEFT JOIN dbo.RBI_Model m
                    ON m.RBIM_ID = @rbimId
                LEFT JOIN dbo.rbi_matrix_risk mr
                    ON mr.matrix_id = m.Matrix_ID
                    AND mr.risk_id = rr.risk_overall`
                : `INNER JOIN rbi_asset b ON a.parent_id = b.asset_id
                INNER JOIN rbi_comp_type c ON a.ct_id = c.ct_id`;

            query = `
                WITH AssetHierarchy AS (
                    -- Start with the selected cluster
                    SELECT asset_id
                    FROM rbi_asset
                    WHERE asset_id = @clusterId

                    UNION ALL

                    -- Get all descendants
                    SELECT a.asset_id
                    FROM rbi_asset a
                    INNER JOIN AssetHierarchy ah ON a.parent_id = ah.asset_id
                    WHERE a.asset_id != a.parent_id
                )
                SELECT
                    ${selectClause}
                FROM rbi_asset a
                ${joinClause}
                WHERE a.asset_id IN (SELECT asset_id FROM AssetHierarchy)
                   OR a.asset_id = @clusterId
                   OR a.asset_id = 2
            `;
            params.clusterId = parseInt(clusterId);
        } else {
            // Get all assets
            query = buildBaseQuery(includeRiskData);
        }

        // Add search filter if specified
        if (searchTerm) {
            query += ` AND a.asset_name LIKE @searchTerm`;
            params.searchTerm = `%${searchTerm}%`;
        }

        query += ` ORDER BY a.pos, a.hierarchy_id`;

        const queryRequest = pool.request();
        Object.entries(params).forEach(([key, value]) => {
            queryRequest.input(key, value);
        });

        console.log('Executing query:', query);
        console.log('With params:', params);

        const result = await queryRequest.query(query);

        // Transform data into tree structure
        const assets = result.recordset.map((row: any) => {
            const asset: any = {
                parent_id: row.parent_id,
                parent_name: row.parent_name,
                asset_id: row.asset_id,
                asset_name: row.asset_name,
                ct_id: row.ct_id,
                pos: row.pos,
                hierarchy_id: row.hierarchy_id,
                ci_id: row.ci_id,
                description: row.description,
            };

            // Add risk data if available
            if (includeRiskData) {
                // Only set Risk_ID if there's actually a risk entry (not null)
                asset.Risk_ID = row.risk_overall !== null && row.risk_overall !== undefined ? row.risk_overall : null;
                asset.Risk_Level = row.risk_level !== null && row.risk_level !== undefined ? row.risk_level : null;
                // Convert icon buffer to base64 string only if icon exists
                asset.icon = row.icon !== null && row.icon !== undefined ? row.icon.toString('base64') : null;
            }

            return asset;
        });

        return NextResponse.json({
            success: true,
            data: assets,
        });
    } catch (error) {
        console.error('Error fetching assets:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
