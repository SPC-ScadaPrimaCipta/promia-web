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
        const assetId = searchParams.get('asset_id');

        if (!rbimId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'rbim_id parameter is required',
                },
                { status: 400 }
            );
        }

        if (!assetId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'asset_id parameter is required',
                },
                { status: 400 }
            );
        }

        const parsedRbimId = parseInt(rbimId, 10);
        const parsedAssetId = parseInt(assetId, 10);

        if (Number.isNaN(parsedRbimId) || Number.isNaN(parsedAssetId)) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'rbim_id and asset_id must be valid numbers',
                },
                { status: 400 }
            );
        }

        const pool = await getConnection();

        const baseQuery = `
            SELECT
                a.*,
                b.fnp_id
            FROM
            (
                SELECT
                    a.*,
                    b.fnp_id
                FROM
                (
                    SELECT
                        a.*,
                        b.*
                    FROM
                    (
                        SELECT
                            a.*,
                            b.name        AS table_name,
                            b.description AS table_desc
                        FROM
                        (
                            SELECT
                                a.*,
                                b.ft_id,
                                b.name     AS field_name,
                                b.comments AS field_desc
                            FROM
                            (
                                SELECT
                                    b.*,
                                    a.linkfd_id AS linklinkfd_id,
                                    NULL        AS ll_id
                                FROM dbo.RBI_Factor a,
                                     dbo.RBI_Factor b
                                WHERE
                                    a.td_id   = b.linktd_id
                                    AND a.rbim_id = @rbimId

                                UNION

                                SELECT
                                    *,
                                    NULL AS linklinkfd_id,
                                    NULL AS ll_id
                                FROM dbo.RBI_Factor
                                WHERE
                                    linktd_id IS NULL
                                    AND rbim_id = @rbimId

                                UNION

                                SELECT
                                    @rbimId       AS rbim_id,
                                    NULL          AS rbif_id,
                                    NULL          AS td_id,
                                    60000         AS lvl,
                                    b.td_id       AS linktd_id,
                                    b.fd_id       AS linkfd_id,
                                    a.linkfd_id   AS linklinkfd_id,
                                    b.ll_id
                                FROM rbi_factor a,
                                     rbi_field_def b
                                WHERE
                                    b.td_id IN (
                                        SELECT td_id
                                        FROM rbi_factor
                                        WHERE rbim_id = @rbimId
                                    )
                                    AND b.fd_id NOT IN (
                                        SELECT linkfd_id
                                        FROM rbi_factor
                                        WHERE linkfd_id IS NOT NULL
                                          AND rbim_id = @rbimId
                                    )
                                    AND a.td_id = b.td_id
                            ) a
                            LEFT OUTER JOIN rbi_field_def b
                                ON a.linkfd_id = b.fd_id
                        ) a
                        LEFT OUTER JOIN rbi_table_def b
                            ON a.td_id = b.td_id
                    ) a
                    LEFT OUTER JOIN
                    (
                        SELECT
                            a.fd_id,
                            b.fnd_id,
                            b.name        AS function_name,
                            b.description AS function_desc,
                            b.function_name as fnd_name
                        FROM
                        (
                            SELECT DISTINCT
                                fd_id,
                                fnd_id
                            FROM rbi_fn_input
                        ) a,
                        rbi_fn_definition b
                        WHERE
                            a.fnd_id = b.fnd_id
                    ) b
                        ON a.linkfd_id = b.fd_id
                ) a
                LEFT OUTER JOIN
                (
                    SELECT
                        a.*,
                        b.param_types
                    FROM rbi_fn_input a
                    LEFT OUTER JOIN rbi_fn_parameter b
                        ON a.fnd_id = b.fnd_id
                       AND a.fnp_id = b.fnp_id
                ) b
                    ON a.linkfd_id = b.linkfd_id
                   AND a.linktd_id = b.linktd_id
                   AND a.fnd_id    = b.fnd_id
            ) a
            LEFT OUTER JOIN
            (
                SELECT
                    a.*,
                    b.param_types
                FROM rbi_fn_input a
                LEFT OUTER JOIN rbi_fn_parameter b
                    ON a.fnd_id = b.fnd_id
                   AND a.fnp_id = b.fnp_id
            ) b
                ON a.linkfd_id = b.linkfd_id
               AND a.linktd_id = b.linktd_id
               AND a.fnd_id    = b.fnd_id
            WHERE (a.field_name IS NULL OR a.field_name NOT IN ('X_Value','Y_Value'))
            ORDER BY
                a.linktd_id,
                b.fnp_id,
                a.linkfd_id
        `;

        const queryRequest = pool.request();
        queryRequest.input('rbimId', sql.Int, parsedRbimId);

        const result = await queryRequest.query(baseQuery);
        const rows = result.recordset;

        // Collect unique linktd_id and linkfd_id pairs
        const tdFieldMap = new Map<number, Set<number>>();
        const uniqueTdIds = new Set<number>();
        const uniqueFdIds = new Set<number>();

        const pickNumeric = (row: any, keys: string[]): number | null => {
            for (const key of keys) {
                if (Object.prototype.hasOwnProperty.call(row, key) && row[key] !== null && row[key] !== undefined) {
                    const val = Number(row[key]);
                    if (!Number.isNaN(val)) {
                        return val;
                    }
                }
            }
            return null;
        };

        rows.forEach((row: any) => {
            const tdId = pickNumeric(row, ['linktd_id', 'LinkTD_ID', 'LINKTD_ID']);
            const fdId = pickNumeric(row, ['linkfd_id', 'LinkFD_ID', 'LINKFD_ID']);

            if (tdId !== null && fdId !== null) {
                uniqueTdIds.add(tdId);
                uniqueFdIds.add(fdId);

                const fieldSet = tdFieldMap.get(tdId) ?? new Set<number>();
                fieldSet.add(fdId);
                tdFieldMap.set(tdId, fieldSet);
            }
        });

        // Fetch table names for linktd_id values
        const tdIdList = Array.from(uniqueTdIds);
        const tdParams = tdIdList.map((_, idx) => `@td${idx}`).join(',');
        const tableNameQuery = `
            SELECT td_id, Table_Name
            FROM dbo.rbi_table_def
            WHERE td_id IN (${tdParams})
        `;
        const tableNameRequest = pool.request();
        tdIdList.forEach((id, idx) => {
            tableNameRequest.input(`td${idx}`, sql.Int, id);
        });
        const tableNameResult = await tableNameRequest.query(tableNameQuery);
        const tableNameMap = new Map<number, string>();
        tableNameResult.recordset.forEach((row: any) => {
            tableNameMap.set(row.td_id, row.Table_Name);
        });

        // Fetch field names for linkfd_id values
        const fdIdList = Array.from(uniqueFdIds);
        const fdParams = fdIdList.map((_, idx) => `@fd${idx}`).join(',');
        const fieldNameQuery = `
            SELECT fd_id, Field_Name
            FROM dbo.rbi_field_def
            WHERE fd_id IN (${fdParams})
        `;
        const fieldNameRequest = pool.request();
        fdIdList.forEach((id, idx) => {
            fieldNameRequest.input(`fd${idx}`, sql.Int, id);
        });
        const fieldNameResult = await fieldNameRequest.query(fieldNameQuery);
        const fieldNameMap = new Map<number, string>();
        fieldNameResult.recordset.forEach((row: any) => {
            fieldNameMap.set(row.fd_id, row.Field_Name);
        });

        // Build query list and execute each to include LinkTD_ID, LinkFD_ID, and values
        const queries = await Promise.all(
            Array.from(tdFieldMap.entries()).map(async ([tdId, fdIds]) => {
                const tableName = tableNameMap.get(tdId);
                const fieldEntries = Array.from(fdIds)
                    .map((fdId) => ({
                        fdId,
                        fieldName: fieldNameMap.get(fdId),
                    }))
                    .filter((entry) => !!entry.fieldName) as { fdId: number; fieldName: string }[];

                const columns = fieldEntries.map((entry) => entry.fieldName);
                const columnList = columns.length > 0 ? columns.map((name) => `[${name}]`).join(', ') : '*';
                const prefixedTable = tableName ? `CRV_${tableName}` : `CRV_td_${tdId}`;
                const tableRef = `[${prefixedTable}]`;
                const query = `SELECT ${columnList} FROM ${tableRef} WHERE COMPONENT_ID = @componentId`;

                try {
                    const detailRequest = pool.request();
                    detailRequest.input('componentId', sql.Int, parsedAssetId);
                    const queryResult = await detailRequest.query(query);
                    const firstRow = queryResult.recordset?.[0] ?? null;

                    const values =
                        firstRow && fieldEntries.length > 0
                            ? fieldEntries.map((entry) => ({
                                  LinkFD_ID: entry.fdId,
                                  Value: firstRow[entry.fieldName] ?? null,
                              }))
                            : [];

                    return {
                        success: true,
                        LinkTD_ID: tdId,
                        LinkFD_IDs: fieldEntries.map((entry) => entry.fdId),
                        td_id: tdId,
                        table_name: tableName ?? null,
                        columns,
                        query,
                        data: values,
                    };
                } catch (err) {
                    return {
                        success: false,
                        LinkTD_ID: tdId,
                        LinkFD_IDs: fieldEntries.map((entry) => entry.fdId),
                        td_id: tdId,
                        table_name: tableName ?? null,
                        columns,
                        query,
                        data: [],
                        error: err instanceof Error ? err.message : 'Unknown error executing detail query',
                    };
                }
            })
        );

        return NextResponse.json({ success: true, queries });
    } catch (error) {
        console.error('Error fetching model component detail data:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
