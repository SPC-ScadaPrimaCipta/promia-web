import { NextRequest, NextResponse } from 'next/server';
import { getConnection, sql } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { cigStructure, criStructure, riskStructure } from './categories';

export async function POST(request: NextRequest) {
    const session = await getServerSession();
    if (!session) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const pool = await getConnection();
        const body = await request.json();
        const { categories, top } = body; // categories = { categoryId: [columns], ... }
        const topValue = top || 100;

        if (!categories || Object.keys(categories).length === 0) {
            return NextResponse.json({
                success: false,
                error: 'No categories selected'
            }, { status: 400 });
        }

        // Use imported structures
        const allCategories = [...cigStructure, ...criStructure, ...riskStructure];
        const categoryMap = new Map(allCategories.map(c => [c.id, c]));

        // Build table info and column selections
        const tableInfos: Array<{ alias: string; tableName: string; columns: string[] }> = [];
        
        for (const [categoryId, columns] of Object.entries(categories)) {
            const category = categoryMap.get(categoryId);
            if (!category) continue;

            // Create alias from table name
            // For CIG_/CRI_ tables: remove prefix and trailing underscore
            // For rbi_ tables: use table name as is
            let alias = category.table;
            if (category.table.startsWith('CIG_') || category.table.startsWith('CRI_')) {
                alias = category.table.replace(/^(CIG_|CRI_)/, '').replace(/_$/, '');
            }
            
            tableInfos.push({
                alias,
                tableName: category.table,
                columns: columns as string[]
            });
        }

        if (tableInfos.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'No valid categories found'
            }, { status: 400 });
        }

        // Get first table as base (FROM clause)
        const firstTable = tableInfos[0];
        const otherTables = tableInfos.slice(1);

        // Build SELECT clause - Asset ID and Name from RBI_ASSET
        const selectParts: string[] = [
            `\tRBI_ASSET.Asset_ID as 'Asset ID'`,
            `\tRBI_ASSET.Asset_Name as 'Asset Name'`
        ];

        // Add columns from all tables
        for (const tableInfo of tableInfos) {
            for (const column of tableInfo.columns) {
                // Create readable alias
                const alias = column
                    .replace(/_/g, ' ')
                    .replace(/\b\w/g, (char: string) => char.toUpperCase())
                    .trim();
                selectParts.push(`\t${tableInfo.alias}.${column} as '${alias}'`);
            }
        }

        // Build FROM and JOIN clauses
        const fromClause = `FROM \t${firstTable.tableName} ${firstTable.alias}`;
        
        // Determine join column for first table based on table prefix
        const firstTableJoinColumn = firstTable.tableName.startsWith('CRI_') ? 'Asset_ID' : 'Asset_ID';
        
        const joinClauses: string[] = [
            `\tLEFT OUTER JOIN RBI_ASSET RBI_ASSET on RBI_ASSET.Asset_ID = ${firstTable.alias}.${firstTableJoinColumn}`
        ];

        // Add joins for other tables
        for (const tableInfo of otherTables) {
            // Determine join column based on table type:
            // - CRI tables use Component_ID
            // - CIG and RISK tables use Asset_ID
            const joinColumn = tableInfo.tableName.startsWith('CRI_') ? 'Component_ID' : 'Asset_ID';
            
            joinClauses.push(
                `\tLEFT OUTER JOIN ${tableInfo.tableName} ${tableInfo.alias} on ${tableInfo.alias}.${joinColumn} = ${firstTable.alias}.${firstTableJoinColumn}`
            );
        }

        // Build final query
        const topClause = topValue && topValue > 0 ? `TOP ${topValue}` : '';
        const sqlQuery = `
SELECT \t${topClause} 
${selectParts.join(', \n')} 
${fromClause}  
${joinClauses.join(' \n')}  
WHERE\t RBI_ASSET.ASSET_ID IS NOT NULL
`.replace(/\t \n/, '\t\n'); // Clean up empty TOP line if no topValue

        console.log('Generated SQL Query:', sqlQuery);

        // Execute query with better error handling
        try {
            const result = await pool.request().query(sqlQuery);

            return NextResponse.json({
                success: true,
                query: sqlQuery,
                data: result.recordset,
                rowCount: result.recordset.length
            });
        } catch (queryError: any) {
            console.error('SQL Query Execution Error:', queryError);
            
            // Return more detailed error message
            return NextResponse.json({
                success: false,
                error: `Database query failed: ${queryError.message}`,
                query: sqlQuery,
                details: queryError.toString()
            }, { status: 500 });
        }

    } catch (error: any) {
        console.error('Data Browser POST API Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error.message,
            },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    const session = await getServerSession();
    if (!session) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const pool = await getConnection();
        const searchParams = request.nextUrl.searchParams;
        const assetId = searchParams.get('assetId');
        const category = searchParams.get('category');
        const columnsParam = searchParams.get('columns'); // comma-separated column names
        const topParam = searchParams.get('top'); // TOP N records
        const topValue = topParam ? parseInt(topParam) : 100; // Default 100

        // Jika request untuk mendapatkan tree structure
        if (!category) {
            // Return static tree structure based on imported CIG and CRI structures
            return NextResponse.json({
                success: true,
                cig: cigStructure,
                cri: criStructure,
                risk: riskStructure,
            });
        }

        // Jika request untuk data spesifik kategori
        if (category) {
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
                // CRI - Component Risk Input tables (CRV_)
                'cri-amine-corrosion': 'CRV_AMINE_CORROSION_RE2_',
                'cri-api-copi-level-2': 'CRV_API_COPI_LEVEL_2',
                'cri-api-copi-level3': 'CRV_API_COPI_LEVEL3',
                'cri-api581-l12': 'CRV_API581_L12_',
                'cri-api581-l22': 'CRV_API581_L22_',
                'cri-consequence-of-failure': 'CRV_CONSEQUENCE_OF_FAU2_',
                'cri-piping-and-static': 'CRV_PIPING_AND_STATICQ2_',
                'cri-safety-relief-valves': 'CRV_SAFETY_RELIEF_VALVES',
                'cri-asset-damage': 'CRV_ASSET_DAMAGE',
                'cri-af2': 'CRV_AF2_',
                'cri-basic-release-rate': 'CRV_BASIC_RELEASE_RATE',
                'cri-bottom-plate-risk': 'CRV_BOTTOM_PLATE_RISK',
                'cri-brittle-facture': 'CRV_BRITTLE_FACTURE_TF2_',
                'cri-brittle-fracture': 'CRV_BRITTLE_FRACTURE',
                'cri-business-interruption': 'CRV_BUSINESS_INTERRUPTIO2_',
                'cri-business-interruption-2': 'CRV_BUSINESS_INTERRUPTIO',
                'cri-bussiness-interuption': 'CRV_BUSSINESS_INTERUPTIO',
                'cri-calculated-rate': 'CRV_CALCULATED_RATE',
                'cri-cf': 'CRV_CF',
                'cri-combined-tmsf': 'CRV_COMBINED_TMSF',
                'cri-commercial-impact': 'CRV_COMMERCIAL_IMPACT2_',
                'cri-ccf2': 'CRV_CCF2_',
                'cri-confidence-rating': 'CRV_CONFIDENCE_RATING2_',
                'cri-consequence': 'CRV_CONSEQUENCE',
                'cri-consequence-category': 'CRV_CONSEQUENCE_CATEGORY',
                'cri-consequence-factor-2': 'CRV_CONSEQUENCE_FACTO_2_',
                'cri-consequence-factor-5': 'CRV_CONSEQUENCE_FACTO_5_',
                'cri-consequence-factor-4': 'CRV_CONSEQUENCE_FACTO_4_',
                'cri-consequence-factor-9': 'CRV_CONSEQUENCE_FACTO_9_',
                'cri-consequence-factor-a': 'CRV_CONSEQUENCE_FACTO_A_',
                'cri-consequence-factor': 'CRV_CONSEQUENCE_FACTOR__',
                'cri-consequence-factor-8': 'CRV_CONSEQUENCE_FACTO_8_',
                'cri-consequence-factor-3': 'CRV_CONSEQUENCE_FACTO_3_',
                'cri-consequence-factor-6': 'CRV_CONSEQUENCE_FACTO_6_',
                'cri-consequence-factor-main': 'CRV_CONSEQUENCE_FACTOR',
                'cri-consequence-of-failure-main': 'CRV_CONSEQUENCE_OF_FAILU',
                'cri-consequence-of-failure-2': 'CRV_CONSEQUENCE_OF_FAILU2_',
                'cri-consequence-of-failure-3': 'CRV_CONSEQUENCE_OF_FAILU3_',
                'cri-consequence-of-failure-5': 'CRV_CONSEQUENCE_OF_FAILU5_',
                'cri-consequence-of-failure-4': 'CRV_CONSEQUENCE_OF_FAILU4_',
                'cri-consequence-rating-a': 'CRV_CONSEQUENCE_RATIN_A_',
                'cri-consequence-rating-3': 'CRV_CONSEQUENCE_RATIN_3_',
                'cri-consequence-rating-6': 'CRV_CONSEQUENCE_RATIN_6_',
                'cri-consequence-rating-2': 'CRV_CONSEQUENCE_RATIN_2_',
                'cri-consequence-rating-5': 'CRV_CONSEQUENCE_RATIN_5_',
                'cri-consequence-rating-8': 'CRV_CONSEQUENCE_RATIN_8_',
                'cri-consequence-rating-main': 'CRV_CONSEQUENCE_RATING__',
                'cri-consequence-rating-4': 'CRV_CONSEQUENCE_RATIN_4_',
                'cri-consequence-rating-7': 'CRV_CONSEQUENCE_RATIN_7_',
                'cri-consequence-rating-f4': 'CRV_CONSEQUENCE_RATINF4_',
                'cri-consequence-rating-f2': 'CRV_CONSEQUENCE_RATINF2_',
                'cri-consequence-rating-f': 'CRV_CONSEQUENCE_RATING_F',
                'cri-corrosion-rate': 'CRV_CORROSION_RATE2_',
                'cri-corrosion-type': 'CRV_CORROSION_TYPE2_',
                'cri-crf': 'CRV_CRF',
                'cri-crfh2': 'CRV_CRFH2_',
                'cri-criticality': 'CRV_CRITICALITY',
                'cri-criticality-value': 'CRV_CRITICALITY_VALUE2_',
                'cri-damage-consequence': 'CRV_DAMAGE_CONSEQUENC2_',
                'cri-damage-consequence-f': 'CRV_DAMAGE_CONSEQUENCE_F',
                'cri-df2': 'CRV_DF2_',
                'cri-deadleg-factor': 'CRV_DEADLEG_FACTOR',
                'cri-detection-and-isolation': 'CRV_DETECTION_AND_ISOLAT',
                'cri-release-phase-call': 'CRV_RELEASE_PHASE_CALL2_',
                'cri-dif2': 'CRV_DIF2_',
                'cri-dnv-detail-assessment': 'CRV_DNV_DETAIL_ASSESSMEN',
                'cri-dnv-detail-assessment-2': 'CRV_DNV_DETAIL_ASSESSMEN2_',
                'cri-dnv-screening': 'CRV_DNV_SCREENING',
                'cri-economic-category': 'CRV_ECONOMIC_CATEGORY',
                'cri-economic-consequence': 'CRV_ECONOMIC_CONSEQUENCE',
                'cri-economic-consequence-2': 'CRV_ECONOMIC_CONSEQUENCE2_',
                'cri-economic-consequence-3': 'CRV_ECONOMIC_CONSEQUENCE3_',
                'cri-eemua-tanks': 'CRV_EEMUA_TANKS2_',
                'cri-environment-category': 'CRV_ENVIRONMENT_CATEGORY',
                'cri-environment-consequence': 'CRV_ENVIRONMENT_CONSEQUE',
                'cri-environmental-consequence': 'CRV_ENVIRONMENTAL_CONSEQ',
                'cri-environmental-consequence-2': 'CRV_ENVIRONMENTAL_CONSEQ2_',
                'cri-environmental-cost': 'CRV_ENVIRONMENTAL_COST',
                'cri-environmental-impact': 'CRV_ENVIRONMENTAL_IMPT2_',
                'cri-equipment-lining': 'CRV_EQUIPMENT_LINING',
                'cri-equipment-lining-sm': 'CRV_EQUIPMENT_LININGSM2_',
                'cri-equipment-modification': 'CRV_EQUIPMENT_MODIFICATI',
                'cri-damage-modes': 'CRV_DAMAGE_MODES2_',
                'cri-external-category': 'CRV_EXTERNAL_CATEGORY',
                'cri-external-corrosion-3': 'CRV_EXTERNAL_CORROSIO3_',
                'cri-external-corrosion-2': 'CRV_EXTERNAL_CORROSIO2_',
                'cri-external-corrosion': 'CRV_EXTERNAL_CORROSION',
                'cri-external-corrosion-4': 'CRV_EXTERNAL_CORROSIO4_',
                'cri-external-corrosion-5': 'CRV_EXTERNAL_CORROSIO5_',
                'cri-external-damage': 'CRV_EXTERNAL_DAMAGE',
                'cri-external-damage-tf': 'CRV_EXTERNAL_DAMAGE_TF2_',
                'cri-external-degradation': 'CRV_EXTERNAL_DEGRADATION',
                'cri-external-probability': 'CRV_EXTERNAL_PROBABILITY',
                'cri-factors-influencing': 'CRV_FACTORS_INFLUENCING_',
                'cri-failure-history': 'CRV_FAILURE_HISTORY',
                'cri-failure-history-category': 'CRV_FAILURE_HISTORY_CATE',
                'cri-fatigue': 'CRV_FATIGUE',
                'cri-fatigue-and-overstress': 'CRV_FATIGUE_AND_OVERSTRE',
                'cri-fatigue-and-overstress-2': 'CRV_FATIGUE_AND_OVERSE2_',
                'cri-fatigue-and-overstress-3': 'CRV_FATIGUE_AND_OVERSE3_',
                'cri-fatigue-and-overstress-4': 'CRV_FATIGUE_AND_OVERSE4_',
                'cri-fatigue-and-overstress-5': 'CRV_FATIGUE_AND_OVERSE5_',
                'cri-fatigue-category': 'CRV_FATIGUE_CATEGORY',
                'cri-fatigue-probability': 'CRV_FATIGUE_PROBABILITY',
                'cri-features-influencing': 'CRV_FEATURES_INFLUENCG2_',
                'cri-financial-consequence': 'CRV_FINANCIAL_CONSEQUENC',
                'cri-flammable-consequence-2': 'CRV_FLAMMABLE_CONSEQUENC2_',
                'cri-flammable-consequence-4': 'CRV_FLAMMABLE_CONSEQUENC4_',
                'cri-flammable-consequence': 'CRV_FLAMMABLE_CONSEQUENC',
                'cri-flammable-consequence-3': 'CRV_FLAMMABLE_CONSEQUENC3_',
                'cri-furnace-tube': 'CRV_FURNACE_TUBE',
                'cri-furnace-tube-tmsf': 'CRV_FURNACE_TUBE_TMSF2_',
                'cri-gas-release-rate': 'CRV_GAS_RELEASE_RATE2_',
                'cri-generic-failure-frequency': 'CRV_GENERIC_FAILURE_FREQ',
                'cri-hcl-corrosion-rate': 'CRV_HCL_CORROSION_RAT2_',
                'cri-health-consequence': 'CRV_HEALTH_CONSEQUENC2_',
                'cri-health-consequence-f': 'CRV_HEALTH_CONSEQUENCE_F',
                'cri-htha-tmsf': 'CRV_HTHA_TMSF2_',
                'cri-ht-h2s-corrosion': 'CRV_HT_H2S_CORROSION_T2_',
                'cri-ht-sulfidic-acid': 'CRV_HT_SULFIDIC_ACID_T2_',
                'cri-htha': 'CRV_HTHA',
                'cri-impact-damage-5': 'CRV_IMPACT_DAMAGE5_',
                'cri-impact-damage-2': 'CRV_IMPACT_DAMAGE2_',
                'cri-impact-damage-3': 'CRV_IMPACT_DAMAGE3_',
                'cri-impact-damage': 'CRV_IMPACT_DAMAGE',
                'cri-impact-damage-4': 'CRV_IMPACT_DAMAGE4_',
                'cri-injection-point-factor': 'CRV_INJECTION_POINT_FACT',
                'cri-insignificant': 'CRV_INSIGNIFICANT',
                'cri-inspection': 'CRV_INSPECTION',
                'cri-inspection-category': 'CRV_INSPECTION_CATEGORY',
                'cri-if': 'CRV_IF',
                'cri-inspection-plan-dnv': 'CRV_INSPECTION_PLAN_DNV',
                'cri-internal-category': 'CRV_INTERNAL_CATEGORY',
                'cri-internal-corrosion': 'CRV_INTERNAL_CORROSION',
                'cri-internal-corrosion-2': 'CRV_INTERNAL_CORROSIO2_',
                'cri-internal-corrosion-3': 'CRV_INTERNAL_CORROSIO3_',
                'cri-internal-corrosion-4': 'CRV_INTERNAL_CORROSIO4_',
                'cri-internal-corrosion-5': 'CRV_INTERNAL_CORROSIO5_',
                'cri-internal-degradation': 'CRV_INTERNAL_DEGRADATION',
                'cri-internal-probability': 'CRV_INTERNAL_PROBABILITY',
                'cri-interval-factor': 'CRV_INTERVAL_FACTOR',
                'cri-large-release': 'CRV_LARGE_RELEASE',
                'cri-launchers-receivers': 'CRV_LAUNCHERS__RECEIVERS',
                'cri-likelihood-analysis': 'CRV_LIKELIHOOD_ANALYSIS',
                'cri-likelihood-category': 'CRV_LIKELIHOOD_CATEGORY',
                'cri-part-b-likelihood': 'CRV_PART_B__LIKELIHOOD_C',
                'cri-likelihood-category-2': 'CRV_LIKELIHOOD_CATEGO2_',
                'cri-likelihood-factor': 'CRV_LIKELIHOOD_FACTOR',
                'cri-likelihood-factor-2': 'CRV_LIKELIHOOD_FACTOR2_',
                'cri-likelihood-of-failure': 'CRV_LIKELIHOOD_OF_FAIR2_',
                'cri-liquid-release-rate': 'CRV_LIQUID_RELEASE_RA2_',
                'cri-location-of-tank-farm': 'CRV_LOCATION_OF_TANK_FAR',
                'cri-major-failure-risk': 'CRV_MAJOR_FAILURE_RISK',
                'cri-marine-growth': 'CRV_MARINE_GROWTH3_',
                'cri-maximum-inspection-interval': 'CRV_MAXIMUM_INSPECTIOI2_',
                'cri-mdf': 'CRV_MDF',
                'cri-mechanical-fatigue': 'CRV_MECHANICAL_FATIGUE',
                'cri-mechanical-fatigue-up': 'CRV_MECHANICAL_FATIGUP2_',
                'cri-medium-release': 'CRV_MEDIUM_RELEASE',
                'cri-minor-failure-risk': 'CRV_MINOR_FAILURE_RISK',
                'cri-on-line-monitoring': 'CRV_ON_LINE_MONITORING_F',
                'cri-onshore-consequence': 'CRV_ONSHORE_CONSEQUEN2_',
                'cri-onshore-likelihood': 'CRV_ONSHORE_LIKELIHOOD',
                'cri-onshore-pipeline': 'CRV_ONSHORE_PIPELINE',
                'cri-overdesign-factor': 'CRV_OVERDESIGN_FACTOR2_',
                'cri-part-a-release-rate': 'CRV_PART_A__RELEASE_RE2_',
                'cri-part-c-flamable-consequence': 'CRV_PART_C__FLAMABLE_CON',
                'cri-part-d-consequence': 'CRV_PART_D__CONSEQUEN_2_',
                'cri-person-loss-life': 'CRV_PERSON_LOSS_LIFE',
                'cri-personnel-injury-cost': 'CRV_PERSONNEL_INJURY_COS',
                'cri-pipeline': 'CRV_PIPELINE3_',
                'cri-plant-qual-rbi': 'CRV_PLANT_QUAL_RBI2_',
                'cri-pof-value': 'CRV_POF_VALUE',
                'cri-ppf2': 'CRV_PPF2_',
                'cri-prf2': 'CRV_PRF2_',
                'cri-probability': 'CRV_PROBABILITY',
                'cri-probability-factor-4': 'CRV_PROBABILITY_FACTOF4_',
                'cri-probability-factor-3': 'CRV_PROBABILITY_FACTOF3_',
                'cri-probability-factor-f': 'CRV_PROBABILITY_FACTOR_F',
                'cri-probability-of-failure': 'CRV_PROBABILITY_OF_FAILU',
                'cri-probability-of-failure-2': 'CRV_PROBABILITY_OF_FAILU2_',
                'cri-probability-of-failure-4': 'CRV_PROBABILITY_OF_FAILU4_',
                'cri-probability-of-failure-3': 'CRV_PROBABILITY_OF_FAILU3_',
                'cri-probability-rating-f4': 'CRV_PROBABILITY_RATINF4_',
                'cri-probability-rating-f2': 'CRV_PROBABILITY_RATINF2_',
                'cri-probability-rating-f': 'CRV_PROBABILITY_RATING_F',
                'cri-pf2': 'CRV_PF2_',
                'cri-production-value': 'CRV_PRODUCTION_VALUE2_',
                'cri-q4-leakage-factor': 'CRV_Q4___LEAKAGE_FACT2_',
                'cri-quantitative-prodt': 'CRV_QUANTITATIVE_PRODT2_',
                'cri-qf2': 'CRV_QF2_',
                'cri-calculation-detail': 'CRV_CALCULATION_DETAI2_',
                'cri-release-category': 'CRV_RELEASE_CATEGORY',
                'cri-release-type-calculation': 'CRV_RELEASE_TYPE_CALCA2_',
                'cri-remnant-life': 'CRV_REMNANT_LIFE2_',
                'cri-hole-sizes': 'CRV_HOLE_SIZES',
                'cri-risk-2': 'CRV_RISK2_',
                'cri-risk': 'CRV_RISK',
                'cri-risk-4': 'CRV_RISK4_',
                'cri-risk-5': 'CRV_RISK5_',
                'cri-risk-3': 'CRV_RISK3_',
                'cri-risk-6': 'CRV_RISK6_',
                'cri-risk-7': 'CRV_RISK7_',
                'cri-risk-9': 'CRV_RISK9_',
                'cri-risk-10': 'CRV_RISK10_',
                'cri-risk-11': 'CRV_RISK11_',
                'cri-risk-12': 'CRV_RISK12_',
                'cri-risk-13': 'CRV_RISK13_',
                'cri-risk-15': 'CRV_RISK15_',
                'cri-roof-plate-risk': 'CRV_ROOF_PLATE_RISK',
                'cri-roof-supporting-structure': 'CRV_ROOF_SUPPORTING_STRU',
                'cri-rupture-release': 'CRV_RUPTURE_RELEASE',
                'cri-safety-and-environmental': 'CRV_SAFETY_AND_ENVIROE2_',
                'cri-safety-aspects-f2': 'CRV_SAFETY_ASPECTS___F2_',
                'cri-safety-aspects-onsite': 'CRV_SAFETY_ASPECTS___ONS',
                'cri-safety-category': 'CRV_SAFETY_CATEGORY',
                'cri-safety-consequence': 'CRV_SAFETY_CONSEQUENCE',
                'cri-safety-consequence-2': 'CRV_SAFETY_CONSEQUENCE2_',
                'cri-safety-consequence-c': 'CRV_SAFETY_CONSEQUENCE_C',
                'cri-scc': 'CRV_SCC',
                'cri-shell-plate-risk': 'CRV_SHELL_PLATE_RISK',
                'cri-shore-zone-consequence': 'CRV_SHORE_ZONE_CONSEQN2_',
                'cri-shore-zone': 'CRV_SHORE_ZONE',
                'cri-shore-zone-likelihood': 'CRV_SHORE_ZONE_LIKELIHOO',
                'cri-small-release': 'CRV_SMALL_RELEASE',
                'cri-sf2': 'CRV_SF2_',
                'cri-release-rate-calculation': 'CRV_RELEASE_RATE_CALCA2_',
                'cri-scc-tmsf': 'CRV_SCC_TMSF2_',
                'cri-subsea-pipeline-consequence': 'CRV_SUBSEA_PIPELINE_CS2_',
                'cri-subsea-pipeline': 'CRV_SUBSEA_PIPELINE',
                'cri-subsea-pipeline-likelihood': 'CRV_SUBSEA_PIPELINE_LIKE',
                'cri-subsea-riser-consequence': 'CRV_SUBSEA_RISER_CONSU2_',
                'cri-subsea-riser': 'CRV_SUBSEA_RISER',
                'cri-subsea-riser-likelihood': 'CRV_SUBSEA_RISER_LIKEH2_',
                'cri-tmsf': 'CRV_TMSF',
                'cri-test': 'CRV_TEST',
                'cri-thinning': 'CRV_THINNING',
                'cri-thinning-tmsf': 'CRV_THINNING_TMSF2_',
                'cri-topsides-consequence': 'CRV_TOPSIDES_CONSEQUEE2_',
                'cri-topsides-likelihood': 'CRV_TOPSIDES_LIKELIHO2_',
                'cri-topsides-riser': 'CRV_TOPSIDES_RISER',
                'cri-toxic-consequence': 'CRV_TOXIC_CONSEQUENCE',
                'cri-toxic-consequence-2': 'CRV_TOXIC_CONSEQUENCE2_',
                'cri-toxic-consequence-category': 'CRV_TOXIC_CONSEQUENCE_CA',
                'cri-toxic-consequence-category-2': 'CRV_TOXIC_CONSEQUENCE_CA2_',
                'cri-tqf': 'CRV_TQF',
                'cri-unknown': 'CRV_UNKNOWN',
                'cri-wall-loss-fraction': 'CRV_WALL_LOSS_FRACTIOA2_',
                'cri-wet-h2s-cracking': 'CRV_WET_H2S_CRACKING',
            };

            const tableName = tableMap[category];
            if (!tableName) {
                return NextResponse.json({ success: false, error: 'Invalid category' }, { status: 400 });
            }

            // Get column metadata from INFORMATION_SCHEMA
            const columnsResult = await pool.request()
                .input('tableName', sql.VarChar, tableName)
                .query(`
                    SELECT 
                        COLUMN_NAME,
                        DATA_TYPE,
                        CHARACTER_MAXIMUM_LENGTH
                    FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_NAME = @tableName
                    ORDER BY ORDINAL_POSITION
                `);

            // Build dynamic SELECT clause with column aliases
            const columns = columnsResult.recordset;
            
            // Filter columns if specific columns requested
            const selectedColumnNames = columnsParam ? columnsParam.split(',').map(c => c.trim()) : null;
            const filteredColumns = selectedColumnNames 
                ? columns.filter((col: any) => selectedColumnNames.includes(col.COLUMN_NAME))
                : columns;
            
            const selectColumns = filteredColumns.map((col: any) => {
                const columnName = col.COLUMN_NAME;
                // Create readable alias by replacing underscores and capitalizing
                const alias = columnName
                    .replace(/_/g, ' ')
                    .split(' ')
                    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                    .join(' ');
                return `${tableName}.${columnName} as '${alias}'`;
            }).join(',\n                ');

            // Query data with Asset ID and Asset Name + selected columns
            const dataQuery = `
                SELECT TOP ${topValue}
                    RBI_ASSET.Asset_ID as 'Asset ID',
                    RBI_ASSET.Asset_Name as 'Asset Name'${selectColumns ? ',\n                    ' + selectColumns : ''}
                FROM ${tableName}
                LEFT OUTER JOIN RBI_ASSET ON RBI_ASSET.Asset_ID = ${tableName}.Asset_ID
                WHERE RBI_ASSET.Asset_ID IS NOT NULL
                ORDER BY RBI_ASSET.Asset_ID
            `;

            const dataResult = await pool.request().query(dataQuery);

            return NextResponse.json({
                success: true,
                columns: filteredColumns.map((col: any) => ({
                    name: col.COLUMN_NAME,
                    type: col.DATA_TYPE,
                    length: col.CHARACTER_MAXIMUM_LENGTH
                })),
                data: dataResult.recordset,
            });
        }

        return NextResponse.json({
            success: false,
            error: 'Missing required parameters',
        }, { status: 400 });

    } catch (error: any) {
        console.error('Data Browser API Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error.message,
            },
            { status: 500 }
        );
    }
}
