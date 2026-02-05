import { NextRequest, NextResponse } from 'next/server';
import { getConnection, sql } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { cigStructure, criStructure, riskStructure } from '../categories';

export async function GET(request: NextRequest) {
    const session = await getServerSession();
    if (!session) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const pool = await getConnection();
        const searchParams = request.nextUrl.searchParams;
        const category = searchParams.get('category');

        if (!category) {
            return NextResponse.json({ success: false, error: 'Category parameter required' }, { status: 400 });
        }

        // Build tableMap from imported structures
        const allCategories = [...cigStructure, ...criStructure, ...riskStructure];
        const tableMap: Record<string, string> = {};
        allCategories.forEach(cat => {
            tableMap[cat.id] = cat.table;
        });

        /* Old hardcoded map - replaced with import
        const tableMap: Record<string, string> = {
            'acceptance-criteria': 'CIV_ACCEPTANCE_CRITERIA2_',
            'aqueous-corrosion': 'CIV_AQUEOUS_CORROSION',
            'atmospheric-corrosion': 'CIV_ATMOSPHERIC_CORROSIO',
            'business-information': 'CIV_BUSSINESS_INFORMATIO',
            'category-information': 'CIV_CATEGORY_INFORMATION',
            'co2-local-corrosion': 'CIV_CO2_LOCAL_CORROSION',
            'co2-uniform-corrosion': 'CIV_CO2_UNIFORM_CORROSIO',
            'cof-calculation': 'CIV_COF_CALCULATION',
            'cof-calculation-dnv': 'CIV_COF_CALCULATION_DNV',
            'cof-calculation-level3': 'CIV_COF_CALCULATION_LEVE',
            'cof-economic-dnv': 'CIV_COF_ECONOMIC_DNV',
            'cof-environmental-dnv': 'CIV_COF_ENVIRONMENTAL_DN',
            'cof-parameter-dnv': 'CIV_COF_PARAMETER_DNV',
            'cof-safety-dnv': 'CIV_COF_SAFETY_DNV',
            'complexity-of-fabricator': 'CIV_COMPLEXITY_OF_FABRIC',
            'complexity-of-fabricator2': 'CIV_COMPLEXITY_OF_FABRIC2_',
            'condition-affective-rate': 'CIV_CONDITION_AFFECTIVE',
            'cui': 'CIV_CUI',
            'cui-for-carbon-and-low': 'CIV_CUI_FOR_CARBON_AND_L',
            'damage-mechanism': 'CIV_DAMAGE_MECHANISM',
            'damage-mechanism-2': 'CIV_DAMAGE_MECHANISM_2',
            'data-damage-mechanism': 'CIV_DATA_DAMAGE_MECHANIS',
            'data-of-technical-mode': 'CIV_DATA_OF_TECHNICAL_MO',
            'degradation-mechanism': 'CIV_DEGRADATION_MECHANIS',
            'dimension-information': 'CIV_DIMENSION_INFORMATIO',
            'economic-information': 'CIV_ECONOMIC_INFORMATION',
            'environmental-cof-resume': 'CIV_ENVIROMENTAL_COF_RES',
            'environment-load-cond': 'CIV_ENVIRONMENT_LOAD_CON',
            'erosion': 'CIV_EROSION',
            'escc-stable': 'CIV_ESCC_STABLE',
            'escc-unstable': 'CIV_ESCC_UNSTABLE',
            'fatigue': 'CIV_FATIGUE',
            'fatigue-data': 'CIV_FATIGUE_DATA',
            'flammable-area-resume': 'CIV_FLAMMABLE_AREA_RESUM',
            'fluid-composition-dnv': 'CIV_FLUID_COMPOSITION_DN',
            'fluid-dnv': 'CIV_FLUID_DNV',
            'h2s-cracking-stable': 'CIV_H2S_CRACKING_STABLE',
            'h2s-cracking-unstable': 'CIV_H2S_CRACKING_UNSTABL',
            'heading': 'CIV_HEADING',
            'heading-dnv': 'CIV_HEADING_DNV',
            'insignificant': 'CIV_INSIGNIFICANT',
            'inspection-history': 'CIV_INSPECTION_HISTORY',
            'inspection-history-dnv': 'CIV_INSPECTION_HISTORY_D',
            'inspection-judgement': 'CIV_INSPECTION_JUDGEMENT',
            'inspection-plan': 'CIV_INSPECTION_PLAN',
            'inspection-plan-descript': 'CIV_INSPECTION_PLAN_DESC',
            'inspection-plan-dnv': 'CIV_INSPECTION_PLAN_DNV',
            'inspection-plan-no-insp': 'CIV_INSPECTION_PLAN_NO_I',
            'inspection-plan-paramet': 'CIV_INSPECTION_PLAN_PARA',
            'inspection-plan-suggest': 'CIV_INSPECTION_PLAN_SUGG',
            'inspection-plan-suggest2': 'CIV_INSPECTION_PLAN_SUGG2_',
            'inspection-plan-suggest3': 'CIV_INSPECTION_PLAN_SUGG3_',
            'inspection-plan-suggest4': 'CIV_INSPECTION_PLAN_SUGG4_',
            'installation-fabrication': 'CIV_INSTALLATION___FABRI',
            'large-hole-size': 'CIV_LARGE_HOLE_SIZE',
            'maintenance-history': 'CIV_MAINTENANCE_HISTORY',
            'maintenance-history2': 'CIV_MAINTENANCE_HISTORY2_',
            'material': 'CIV_MATERIAL',
            'material-and-coating': 'CIV_MATERIAL_AND_COATING',
            'mechanical-information': 'CIV_MECHANICAL_INFORMATI',
            'medium-hole-size': 'CIV_MEDIUM_HOLE_SIZE',
            'mic': 'CIV_MIC',
            'mitigation-system': 'CIV_MITIGATION_SYSTEM',
            'no-of-shutdown-per': 'CIV_NO__OF_SHUTDOWN_PER_',
            'norsok-corrosion-rate': 'CIV_NORSOK_CORROSION_RAT',
            'operating-condition': 'CIV_OPERATING_CONDITION',
            'other-information': 'CIV_OTHER_INFORMATION',
            'particle-parameter-dnv': 'CIV_PARTICLE_PARAMETER_D',
            'platform-information': 'CIV_PLATFORM_INFORMATION',
            'pof-api-level-3-with': 'CIV_POF_API_LEVEL_3_WITH',
            'pof-api-level-3-with2': 'CIV_POF_API_LEVEL_3_WITH2_',
            'pof-calculation-dnv': 'CIV_POF_CALCULATION_DNV',
            'pof-dnv': 'CIV_POF_DNV',
            'probability-of-failure': 'CIV_PROBABILITY_OF_FAILU',
            'process-data-dnv': 'CIV_PROCESS_DATA_DNV',
            'process-information': 'CIV_PROCESS_INFORMATION',
            'risk-calculation-dnv': 'CIV_RISK_CALCULATION_DNV',
            'risk-status': 'CIV_RISK_STATUS',
            'risk-summary-api-level': 'CIV_RISK_SUMMARY_API_LEV',
            'risk-summary-api-level2': 'CIV_RISK_SUMMARY_API_LEV2_',
            'risk-summary-dnv': 'CIV_RISK_SUMMARY_DNV',
            'rupture-hole-size': 'CIV_RUPTURE_HOLE_SIZE',
            'safety-system-information': 'CIV_SAFETY_SYSTEM_INFORM',
            'sap-property': 'CIV_SAP_PROPERTY',
            'ssc-susceptibility': 'CIV_SSC_SUSCEPTIBILITY',
            'screening-damage-mechanism': 'CIV_SCREENING_DAMAGE_MEC',
            'screening-parameter': 'CIV_SCREENING_PARAMETER',
            'semi-quantitative-check': 'CIV_SEMI_QUANTITATIVE_CH',
            'small-hole-size': 'CIV_SMALL_HOLE_SIZE',
            'stability-ranking': 'CIV_STABILITY_RANGKING',
            'statutory-certificate': 'CIV_STATUTORY_CERTIFICAT',
            'system-information-dnv': 'CIV_SYSTEM_INFORMATION_D',
            'thickness': 'CIV_THICKNESS',
            'tmsf': 'CIV_TMSF',
            'tmsf-screening': 'CIV_TMSF_SCREENING',
            'toxic-area-resume-dnv': 'CIV_TOXIC_AREA_RESUME_DN',
            'universal-information': 'CIV_UNIVERSAL_INFORMATIO',
            'unknown': 'CIV_UNKNOWN',
        };
        */ // End of old hardcoded map

        const tableName = tableMap[category];
        if (!tableName) {
            return NextResponse.json({ success: false, error: `Invalid category: ${category}` }, { status: 400 });
        }

        // Get column metadata from INFORMATION_SCHEMA
        const columnsResult = await pool.request()
            .input('tableName', sql.VarChar, tableName)
            .query(`
                SELECT 
                    COLUMN_NAME as name,
                    DATA_TYPE as type,
                    CHARACTER_MAXIMUM_LENGTH as length
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_NAME = @tableName
                ORDER BY ORDINAL_POSITION
            `);

        console.log(`Table ${tableName} has ${columnsResult.recordset.length} total columns`);

        // Filter out only specific ID columns that are not useful for users
        // Keep Component_ID for CRI tables and Asset_ID for CIG tables as they are primary identifiers
        const filteredColumns = columnsResult.recordset.filter((col: any) => {
            const columnName = col.name;
            // Only exclude: Scenario_ID and _Re2_ID (foreign keys)
            // Keep: Asset_ID (for CIG) and Component_ID (for CRI) - these are important identifiers
            const shouldExclude = /(Scenario_ID|_Re2_ID)$/i.test(columnName);
            return !shouldExclude;
        });

        console.log(`After filtering: ${filteredColumns.length} columns remain`);

        return NextResponse.json({
            success: true,
            columns: filteredColumns,
        });

    } catch (error: any) {
        console.error('Columns API Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error.message,
            },
            { status: 500 }
        );
    }
}
