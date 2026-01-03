import pg from 'pg';

const { Client } = pg;

/**
 * Analyze the medical data structure to understand relationships
 */
async function analyzeDataStructure() {
    const client = new Client({
        host: 'localhost',
        port: 5432,
        database: 'ayush_fhir',
        user: 'postgres',
        password: 'hardik999'
    });

    try {
        await client.connect();
        console.log('🔬 Analyzing Medical Data Structure\n');
        console.log('='.repeat(60));

        // 1. Check concept_mappings table structure
        console.log('\n📊 1. CONCEPT MAPPINGS TABLE');
        const mappingsCount = await client.query(`
            SELECT COUNT(*) as total,
                   COUNT(DISTINCT namaste_code_id) as unique_namaste,
                   COUNT(DISTINCT icd11_code_id) as unique_icd11
            FROM concept_mappings
        `);
        console.log(`   Total mappings: ${mappingsCount.rows[0].total}`);
        console.log(`   Unique NAMASTE codes: ${mappingsCount.rows[0].unique_namaste}`);
        console.log(`   Unique ICD-11 codes: ${mappingsCount.rows[0].unique_icd11}`);

        // 2. Sample NAMASTE → ICD-11 mappings
        console.log('\n📊 2. SAMPLE NAMASTE → ICD-11 MAPPINGS');
        const sampleMappings = await client.query(`
            SELECT 
                nc.code as namaste_code,
                nc.display as namaste_display,
                nc.system_type,
                ic.icd_code,
                ic.title as icd_title,
                ic.module,
                cm.confidence_score
            FROM concept_mappings cm
            JOIN namaste_codes nc ON cm.namaste_code_id = nc.id
            JOIN icd11_codes ic ON cm.icd11_code_id = ic.id
            LIMIT 10
        `);

        sampleMappings.rows.forEach(row => {
            console.log(`   ${row.namaste_code} (${row.system_type})`);
            console.log(`   └─> ${row.icd_code}: ${row.icd_title}`);
            console.log(`       Confidence: ${row.confidence_score}\n`);
        });

        // 3. Analyze ICD-11 code structure
        console.log('\n📊 3. ICD-11 CODE STRUCTURE ANALYSIS');
        const icdStructure = await client.query(`
            SELECT 
                SUBSTRING(icd_code FROM 1 FOR 2) as chapter,
                COUNT(*) as count,
                array_agg(DISTINCT title) FILTER (WHERE title IS NOT NULL) as sample_titles
            FROM icd11_codes
            GROUP BY SUBSTRING(icd_code FROM 1 FOR 2)
            ORDER BY count DESC
            LIMIT 15
        `);

        console.log('   ICD-11 Chapters (by frequency):');
        icdStructure.rows.forEach(row => {
            console.log(`   ${row.chapter}: ${row.count} codes`);
            if (row.sample_titles && row.sample_titles.length > 0) {
                console.log(`      Example: ${row.sample_titles[0].substring(0, 60)}...`);
            }
        });

        // 4. Find ICD-11 codes that indicate body systems
        console.log('\n📊 4. ICD-11 ANATOMICAL INDICATORS');
        const anatomicalCodes = await client.query(`
            SELECT icd_code, title
            FROM icd11_codes
            WHERE title ILIKE '%respiratory%'
               OR title ILIKE '%cardiac%'
               OR title ILIKE '%digestive%'
               OR title ILIKE '%nervous%'
               OR title ILIKE '%musculoskeletal%'
            LIMIT 10
        `);

        anatomicalCodes.rows.forEach(row => {
            console.log(`   ${row.icd_code}: ${row.title}`);
        });

        // 5. Check if there are existing body region hints in data
        console.log('\n📊 5. AYUSH TERMS WITH ANATOMICAL HINTS');
        const anatomicalTerms = await client.query(`
            SELECT code, display, system_type
            FROM namaste_codes
            WHERE display ILIKE '%heart%'
               OR display ILIKE '%lung%'
               OR display ILIKE '%head%'
               OR display ILIKE '%stomach%'
            LIMIT 10
        `);

        anatomicalTerms.rows.forEach(row => {
            console.log(`   ${row.code} (${row.system_type}): ${row.display}`);
        });

        console.log('\n' + '='.repeat(60));
        console.log('\n💡 INSIGHTS FOR INTELLIGENT MAPPING:');
        console.log('   1. Use concept_mappings to link NAMASTE → ICD-11');
        console.log('   2. Parse ICD-11 chapter codes to identify body systems');
        console.log('   3. Combine ICD-11 anatomical classification + AYUSH semantic meaning');
        console.log('   4. Build a two-step mapper:');
        console.log('      Step 1: NAMASTE → ICD-11 (via concept_mappings)');
        console.log('      Step 2: ICD-11 → Body Region (via ICD chapter analysis)');

        await client.end();
    } catch (error) {
        console.error('❌ Error:', error);
        await client.end();
        process.exit(1);
    }
}

analyzeDataStructure();
