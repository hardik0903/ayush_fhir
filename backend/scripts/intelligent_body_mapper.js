import pg from 'pg';

const { Client } = pg;

/**
 * INTELLIGENT MEDICAL TAXONOMY MAPPER
 * 
 * This mapper uses actual medical relationships from the database:
 * 1. NAMASTE → ICD-11 (via concept_mappings table)
 * 2. ICD-11 → Body Region (via ICD chapter classification)
 */

// ICD-11 Chapter to Body Region Mapping
// Based on WHO ICD-11 structure
const ICD_CHAPTER_TO_BODY_REGION = {
    // Respiratory system
    'CA': 'chest',  // Certain infectious or parasitic diseases (respiratory infections)
    'CB': 'chest',  // Neoplasms (lung cancer, etc.)
    'MD': 'chest',  // Diseases of the respiratory system

    // Digestive system
    'DA': 'abdomen', // Diseases of the digestive system
    'DD': 'abdomen', // Diseases of the liver
    'DB': 'abdomen', // Diseases of the gallbladder

    // Cardiovascular
    'BA': 'chest',  // Diseases of the blood or blood-forming organs
    'BB': 'chest',  // Diseases of the immune system
    'BC': 'chest',  // Diseases of the circulatory system

    // Nervous system
    '8A': 'head',   // Diseases of the nervous system
    '8B': 'head',   // Mental, behavioural disorders
    '9A': 'head',   // Diseases of the visual system
    '9B': 'head',   // Diseases of the ear or mastoid process

    // Musculoskeletal
    'FA': 'arms',   // Diseases of the musculoskeletal system (upper)
    'FB': 'legs',   // Diseases of the musculoskeletal system (lower)
    'FC': 'legs',   // Diseases of the musculoskeletal system

    // Genitourinary
    'GC': 'pelvis', // Diseases of the genitourinary system
    'GA': 'pelvis', // Conditions related to sexual health
    'GB': 'pelvis', // Pregnancy, childbirth

    // Skin (can be anywhere, default to arms for visibility)
    'EA': 'arms',   // Diseases of the skin

    // Endocrine (affects whole body, map to abdomen as central)
    '5A': 'abdomen' // Endocrine, nutritional or metabolic diseases
};

// Additional keyword-based mapping for NAMASTE terms
const AYUSH_ANATOMICAL_KEYWORDS = {
    head: [
        'shira', 'mastaka', 'head', 'brain', 'cerebr',
        'netra', 'akshi', 'eye', 'vision', 'ophthalm',
        'karna', 'ear', 'hearing',
        'nasika', 'nose', 'nasal',
        'kantha', 'throat', 'pharyn',
        'greeva', 'neck', 'cervical',
        'migraine', 'headache', 'shirashoola'
    ],
    chest: [
        'uras', 'hridaya', 'heart', 'cardiac',
        'phupphusa', 'lung', 'pulmon', 'respirat',
        'shwasa', 'breath', 'dyspnea',
        'kasa', 'cough',
        'chest', 'thorax'
    ],
    abdomen: [
        'udara', 'amashaya', 'stomach', 'gastric',
        'yakrit', 'liver', 'hepat',
        'antra', 'intestin', 'bowel',
        'pachan', 'agni', 'digest',
        'vrikka', 'kidney', 'renal',
        'pliha', 'spleen',
        'abdomen', 'abdominal'
    ],
    pelvis: [
        'kati', 'pelvi', 'hip',
        'basti', 'bladder', 'urinary',
        'garbha', 'reproduct', 'uterus',
        'artava', 'menstrual',
        'yoni', 'gynecological'
    ],
    arms: [
        'bahu', 'arm', 'upper limb',
        'skandha', 'shoulder',
        'karpara', 'elbow',
        'manibandha', 'wrist',
        'hasta', 'hand', 'palm',
        'anguli', 'finger'
    ],
    legs: [
        'pada', 'leg', 'lower limb',
        'uru', 'thigh', 'femor',
        'janu', 'knee', 'patel',
        'gulpha', 'ankle',
        'foot',
        'gridhrasi', 'sciatica'
    ]
};

async function intelligentMapper() {
    const client = new Client({
        host: 'localhost',
        port: 5432,
        database: 'ayush_fhir',
        user: 'postgres',
        password: 'hardik999'
    });

    try {
        await client.connect();
        console.log('🧠 INTELLIGENT MEDICAL TAXONOMY MAPPER\n');
        console.log('='.repeat(70));

        // Get all body regions
        const regionsResult = await client.query('SELECT id, code FROM body_regions');
        const regions = regionsResult.rows;

        // Clear existing mappings
        console.log('\n🗑️  Clearing old mappings...');
        await client.query('DELETE FROM body_region_mappings');

        let totalMappings = 0;
        const stats = {};

        for (const region of regions) {
            console.log(`\n📍 Processing: ${region.code.toUpperCase()}`);
            let regionMappings = 0;

            // STRATEGY 1: Use concept_mappings + ICD chapter classification
            console.log('   Strategy 1: ICD-11 Chapter Analysis...');
            const icdMappings = await client.query(`
                SELECT DISTINCT
                    nc.code as namaste_code,
                    nc.display as namaste_display,
                    ic.icd_code,
                    ic.title as icd_title,
                    cm.confidence_score
                FROM concept_mappings cm
                JOIN namaste_codes nc ON cm.namaste_code_id = nc.id
                JOIN icd11_codes ic ON cm.icd11_code_id = ic.id
                WHERE ic.icd_code IS NOT NULL
            `);

            for (const mapping of icdMappings.rows) {
                // Extract ICD chapter (first 2 characters)
                const chapter = mapping.icd_code.substring(0, 2);
                const mappedRegion = ICD_CHAPTER_TO_BODY_REGION[chapter];

                if (mappedRegion === region.code) {
                    await client.query(`
                        INSERT INTO body_region_mappings 
                        (body_region_id, namaste_code, icd_code, relevance_score, mapping_type, verified, notes)
                        VALUES ($1, $2, $3, $4, $5, $6, $7)
                        ON CONFLICT DO NOTHING
                    `, [
                        region.id,
                        mapping.namaste_code,
                        mapping.icd_code,
                        mapping.confidence_score || 0.9,
                        'primary',
                        false,
                        `ICD Chapter ${chapter} → ${region.code}`
                    ]);
                    regionMappings++;
                    totalMappings++;
                }
            }

            console.log(`      ✓ ${regionMappings} mappings from ICD chapters`);

            // STRATEGY 2: Keyword matching in AYUSH terms
            console.log('   Strategy 2: AYUSH Semantic Analysis...');
            const keywords = AYUSH_ANATOMICAL_KEYWORDS[region.code] || [];
            let keywordMappings = 0;

            for (const keyword of keywords) {
                const namasteMatches = await client.query(`
                    SELECT code, display, system_type
                    FROM namaste_codes
                    WHERE display ILIKE $1
                    LIMIT 20
                `, [`%${keyword}%`]);

                for (const match of namasteMatches.rows) {
                    const result = await client.query(`
                        INSERT INTO body_region_mappings 
                        (body_region_id, namaste_code, relevance_score, mapping_type, verified, notes)
                        VALUES ($1, $2, $3, $4, $5, $6)
                        ON CONFLICT DO NOTHING
                        RETURNING id
                    `, [
                        region.id,
                        match.code,
                        0.7,
                        'secondary',
                        false,
                        `Keyword match: "${keyword}"`
                    ]);

                    if (result.rows.length > 0) {
                        keywordMappings++;
                        totalMappings++;
                    }
                }
            }

            console.log(`      ✓ ${keywordMappings} mappings from AYUSH keywords`);

            stats[region.code] = regionMappings + keywordMappings;
        }

        console.log('\n' + '='.repeat(70));
        console.log('\n✅ INTELLIGENT MAPPING COMPLETE!\n');
        console.log('📊 Results:');
        Object.entries(stats).forEach(([code, count]) => {
            console.log(`   ${code.padEnd(10)} → ${count} mappings`);
        });
        console.log(`\n   TOTAL: ${totalMappings} intelligent mappings created`);

        console.log('\n💡 Next: Restart backend and test the 3D map!');

        await client.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        await client.end();
        process.exit(1);
    }
}

intelligentMapper();
