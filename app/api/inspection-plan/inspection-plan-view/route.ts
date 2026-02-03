import { NextRequest, NextResponse } from 'next/server';
import { getConnection, sql } from '@/lib/db';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = request.nextUrl;
        const assetId = searchParams.get('asset_id');
        const rbimId = searchParams.get('rbim_id');

        if (!assetId || !rbimId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'asset_id and rbim_id parameters are required',
                },
                { status: 400 }
            );
        }

        const pool = await getConnection();

        // Query 1: year_of_analysis from cig_inspection_plan
        const query1 = `SELECT year_of_analysis FROM cig_inspection_plan WHERE asset_id = @assetId`;
        const request1 = pool.request();
        request1.input('assetId', sql.Int, parseInt(assetId));
        const result1 = await request1.query(query1);

        // Query 2: VW_INSPEC_HISTORY with 'No Inspection' column
        const query2 = `SELECT *, 'No Inspection' as ' ' FROM VW_INSPEC_HISTORY WHERE asset_id = @assetId`;
        const request2 = pool.request();
        request2.input('assetId', sql.Int, parseInt(assetId));
        const result2 = await request2.query(query2);

        // Query 3: vw_rbi_insp_plan_org with year columns
        const query3 = `SELECT a.* , cast(0 as bit) '2025', cast(0 as bit) '2026', cast(0 as bit) '2027', cast(0 as bit) '2028', cast(0 as bit) '2029', cast(0 as bit) '2030', cast(0 as bit) '2031', cast(0 as bit) '2032', cast(0 as bit) '2033', cast(0 as bit) '2034', cast(0 as bit) '2035', cast(0 as bit) '2036', cast(0 as bit) '2037', cast(0 as bit) '2038', cast(0 as bit) '2039' FROM dbo.vw_rbi_insp_plan_org a WHERE a.asset_id = @assetId AND RBIM_ID = @rbimId ORDER BY a.parent_name, a.asset_name, a.deg_mech`;
        const request3 = pool.request();
        request3.input('assetId', sql.Int, parseInt(assetId));
        request3.input('rbimId', sql.Int, parseInt(rbimId));
        const result3 = await request3.query(query3);

        // Query 4: CIV_HEADING with joins
        const query4 = `SELECT a.asset_id, a.category, CASE WHEN a.category BETWEEN 469 AND 478 THEN (CASE WHEN b.lenght IS NULL THEN 50 ELSE b.lenght END) ELSE (CASE WHEN b.lenght IS NULL THEN 60 ELSE b.lenght END) END AS panjang, CASE WHEN a.category BETWEEN 469 AND 478 THEN 'piping' ELSE 'non piping' END AS jenis FROM CIV_HEADING a LEFT OUTER JOIN CIV_MECHANICAL_INFORMATI b ON a.asset_id = b.asset_id WHERE a.asset_id = @assetId`;
        const request4 = pool.request();
        request4.input('assetId', sql.Int, parseInt(assetId));
        const result4 = await request4.query(query4);

        // Query 5: CIV_INSPECTION_PLAN_DESC with joins
        const query5 = `SELECT a.Description, a.Category, a.Installation_Date AS 'Installation Date', a.Statutory_Certification_Expir AS 'Statutory Certification Expired Date', b.MATERIAL_TYPEC AS 'Material', c.REMAINING_LIFE__YEARS_ AS 'Remaining Life (years)' FROM CIV_INSPECTION_PLAN_DESC a LEFT OUTER JOIN CIV_MATERIAL b ON a.asset_id = b.asset_id LEFT OUTER JOIN CIV_INSPECTION_PLAN c ON a.asset_id = c.asset_id WHERE a.asset_id = @assetId`;
        const request5 = pool.request();
        request5.input('assetId', sql.Int, parseInt(assetId));
        const result5 = await request5.query(query5);

        // Query 6: Stored procedure Retrieve_Risk_Query
        const query6 = `EXEC dbo.Retrieve_Risk_Query @assetId, @rbimId`;
        const request6 = pool.request();
        request6.input('assetId', sql.Int, parseInt(assetId));
        request6.input('rbimId', sql.Int, parseInt(rbimId));
        const result6 = await request6.query(query6);

        // Query 7: Risk matrix data
        const query7 = `
            SELECT a.rbim_id, b.matrix_id, b.risk_id, b.description, b.color,
                   c.row, c.col,
                   CAST(c.row as VARCHAR) + CHAR(64 + c.col) AS Risk_Level
            FROM rbi_model a,
                 rbi_matrix_risk b,
                 rbi_matrix_cell c
            WHERE a.matrix_id = b.matrix_id
                AND a.Matrix_ID = c.matrix_id
                AND b.risk_id = c.risk_id
                AND a.rbim_id = @rbimId
        `;
        const request7 = pool.request();
        request7.input('rbimId', sql.Int, parseInt(rbimId));
        const result7 = await request7.query(query7);

        // Combine results into a single JSON object
        const combinedResult = {
            success: true,
            data: {
                year_of_analysis: result1.recordset,
                inspection_history: result2.recordset,
                rbi_inspection_plan: result3.recordset,
                civ_heading: result4.recordset,
                inspection_plan_desc: result5.recordset,
                risk_query: result6.recordset,
                risk_matrix: result7.recordset,
            },
        };

        return NextResponse.json(combinedResult);
    } catch (error) {
        console.error('Error in inspection-plan-view API:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}