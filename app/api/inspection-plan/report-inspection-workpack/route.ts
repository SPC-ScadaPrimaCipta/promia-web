import { NextRequest, NextResponse } from 'next/server';
import { getConnection, sql } from '@/lib/db';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = request.nextUrl;
        const rbimId = searchParams.get('rbim_id');
        const assetId = searchParams.get('asset_id');
        const year = searchParams.get('year');

        if (!rbimId || !assetId || !year) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'rbim_id, asset_id, and year parameters are required',
                },
                { status: 400 }
            );
        }

        const pool = await getConnection();

        // Query 1: Workpack data
        const workpackQuery = `
            SELECT hierarchy_id, parent_id, parent_name, [Asset Name], rbim_id, insp_year, description,
                   category, [Risk Level], red_color, green_color, blue_color, [Damage Mechanism],
                   [Inspection Technique], Status, Effectiveness, Coverage, pos, [Unit Cost US$],
                   location, [PFD No], [P&ID No], LI_ID, category_id
            FROM dbo.vw_rbi_insp_workpack
            WHERE RBIM_ID = @rbimId
                AND (hierarchy_id LIKE '% ' + CONVERT(VARCHAR(20), @assetId) + '%'
                     OR hierarchy_id LIKE '% ' + CONVERT(VARCHAR(20), @assetId) + ' %'
                     OR hierarchy_id LIKE CONVERT(VARCHAR(20), @assetId) + ' %')
                AND insp_year NOT LIKE '%|%'
                AND insp_year LIKE '%' + CONVERT(VARCHAR(4), @year) + '%'
        `;

        // Query 2: Risk matrix data
        const riskMatrixQuery = `
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

        const requestQuery = pool.request();
        requestQuery.input('rbimId', sql.Int, parseInt(rbimId));
        requestQuery.input('assetId', sql.Int, parseInt(assetId));
        requestQuery.input('year', sql.Int, parseInt(year));

        const workpackResult = await requestQuery.query(workpackQuery);

        // Execute risk matrix query
        const riskMatrixRequest = pool.request();
        riskMatrixRequest.input('rbimId', sql.Int, parseInt(rbimId));
        const riskMatrixResult = await riskMatrixRequest.query(riskMatrixQuery);

        return NextResponse.json({
            success: true,
            data: workpackResult.recordset,
            riskMatrix: riskMatrixResult.recordset,
        });
    } catch (error) {
        console.error('Error in report-inspection-workpack API:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}