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

        const query = `
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
                            b.description AS function_desc
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
        queryRequest.input('rbimId', sql.Int, parseInt(rbimId));

        const result = await queryRequest.query(query);
        const rows = result.recordset ?? [];

        // Collect lookup list IDs for dropdown fields (ft_id === 37) to batch fetch options
        const dropdownLLIds = Array.from(
            new Set(
                rows
                    .filter((row: any) => row.ft_id === 37 && row.ll_id !== null && row.ll_id !== undefined)
                    .map((row: any) => row.ll_id)
            )
        );

        let dropdownMap = new Map<number, { label: string; value: any }[]>();

        if (dropdownLLIds.length > 0) {
            const llParams = dropdownLLIds.map((_, idx) => `@ll${idx}`).join(',');
            const dropdownQuery = `
                SELECT LL_ID, LI_ID, Comments, Value
                FROM RBI_LOOKUP_ITEM
                WHERE LL_ID IN (${llParams})
                ORDER BY LL_ID, LI_ID
            `;

            const dropdownRequest = pool.request();
            dropdownLLIds.forEach((llId, idx) => {
                dropdownRequest.input(`ll${idx}`, sql.Int, llId);
            });

            const dropdownResult = await dropdownRequest.query(dropdownQuery);
            dropdownMap = dropdownResult.recordset.reduce((acc: Map<number, { label: string; value: any }[]>, item: any) => {
                const llId = item.LL_ID ?? item.ll_id;
                if (llId === null || llId === undefined) return acc;

                const options = acc.get(llId) ?? [];
                options.push({
                    label: item.Comments,
                    // value: item.Value,
                    value: item.LI_ID,
                });
                acc.set(llId, options);
                return acc;
            }, new Map<number, { label: string; value: any }[]>());
        }

        // Decorate rows with UI metadata (dropdown / checkbox / calculation)
        const dataWithUi = rows.map((row: any) => {
            const decorated: any = { ...row };
            const llId = row.ll_id ?? row.LL_ID;

            if (row.ft_id === 37) {
                decorated.ui = {
                    type: 'dropdown',
                    options: dropdownMap.get(llId) ?? [],
                };
            } else if (row.ft_id === 5) {
                decorated.ui = {
                    type: 'checkbox',
                    checked: Boolean(row.value ?? row.Value ?? false),
                };
            } else if (row.ft_id === 40) {
                decorated.ui = {
                    type: 'calculation',
                };
            }

            return decorated;
        });

        return NextResponse.json({
            success: true,
            data: dataWithUi,
        });
    } catch (error) {
        console.error('Error fetching model component data:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
