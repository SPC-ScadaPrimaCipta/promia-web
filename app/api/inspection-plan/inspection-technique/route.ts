import { NextRequest, NextResponse } from 'next/server';
import sql from 'mssql';

const config: sql.config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER || '',
    database: process.env.DB_DATABASE,
    options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_CERT === 'true',
    },
};

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const degMech = searchParams.get('DEG_MECH');
        const equipId = searchParams.get('EQUIP_ID');

        if (!degMech) {
            return NextResponse.json(
                { success: false, error: 'DEG_MECH parameter is required' },
                { status: 400 }
            );
        }

        if (!equipId) {
            return NextResponse.json(
                { success: false, error: 'EQUIP_ID parameter is required' },
                { status: 400 }
            );
        }

        const pool = await sql.connect(config);

        const query = `
            SELECT
                DEG_MECH_ID,
                INSP_ID,
                INSP_TECH,
                EFFECTIVE,
                effectivev,
                effectivec,
                INTRUSIVE,
                intrusivev,
                intrusivec,
                COVERAGE_MIN,
                COVERAGE_MAX,
                Coverage,
                INSPECTION_POINT,
                inspectionpointv,
                inspectionpointc,
                UNIT_PRICE,
                DURATION_DAYS,
                MOB_DEMOB,
                INSP_TECH_DESCRIPTION,
                inspection_description_id,
                inspection_description,
                EQUIP_TYPE_ID_MIN,
                EQUIP_TYPE_ID_MAX
            FROM VW_RBI_INSP_TECHNIQUE
            WHERE intrusivec IS NOT NULL
                AND effectivec IS NOT NULL
                AND DEG_MECH_ID = @DEG_MECH
                AND EQUIP_TYPE_ID_MAX = @EQUIP_ID
            ORDER BY intrusivev ASC, effectivev DESC
        `;

        const result = await pool.request()
            .input('DEG_MECH', sql.VarChar, degMech)
            .input('EQUIP_ID', sql.Int, parseInt(equipId))
            .query(query);

        await pool.close();

        return NextResponse.json({
            success: true,
            data: result.recordset,
        });
    } catch (error: any) {
        console.error('Error fetching inspection technique data:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to fetch inspection technique data',
                details: error.message
            },
            { status: 500 }
        );
    }
}
