import pg from 'pg';

const { Client } = pg;

async function testAPI() {
    const client = new Client({
        host: 'localhost',
        port: 5432,
        database: 'ayush_fhir',
        user: 'postgres',
        password: 'hardik999'
    });

    try {
        await client.connect();
        console.log('✅ Database connected\n');

        // Test 1: Check if body_regions table exists and has data
        console.log('📊 Test 1: Body Regions');
        const regionsResult = await client.query('SELECT * FROM body_regions ORDER BY id');
        console.log(`Found ${regionsResult.rows.length} regions:`);
        regionsResult.rows.forEach(r => console.log(`  - ${r.code}: ${r.display_name}`));

        // Test 2: Check mapping counts
        console.log('\n📊 Test 2: Mapping Counts');
        const countsResult = await client.query(`
            SELECT br.code, COUNT(brm.id) as count 
            FROM body_regions br 
            LEFT JOIN body_region_mappings brm ON br.id = brm.body_region_id 
            GROUP BY br.code 
            ORDER BY br.code
        `);
        countsResult.rows.forEach(r => console.log(`  ${r.code}: ${r.count} mappings`));

        // Test 3: Sample mappings for chest
        console.log('\n📊 Test 3: Sample Chest Mappings');
        const chestResult = await client.query(`
            SELECT 
                brm.namaste_code,
                brm.relevance_score,
                brm.mapping_type
            FROM body_region_mappings brm
            JOIN body_regions br ON brm.body_region_id = br.id
            WHERE br.code = 'chest'
            LIMIT 5
        `);

        if (chestResult.rows.length === 0) {
            console.log('  ❌ NO MAPPINGS FOUND FOR CHEST!');
        } else {
            chestResult.rows.forEach(r => {
                console.log(`  - ${r.namaste_code} (score: ${r.relevance_score}, type: ${r.mapping_type})`);
            });
        }

        // Test 4: Check if namaste_codes table has data
        console.log('\n📊 Test 4: NAMASTE Codes Table');
        const namasteCount = await client.query('SELECT COUNT(*) FROM namaste_codes');
        console.log(`  Total NAMASTE codes: ${namasteCount.rows[0].count}`);

        // Test 5: Try to join and see if we get results
        console.log('\n📊 Test 5: Full Join Test (Chest)');
        const fullJoinResult = await client.query(`
            SELECT 
                brm.id,
                brm.namaste_code,
                nc.display as namaste_display,
                nc.system_type,
                brm.relevance_score
            FROM body_region_mappings brm
            LEFT JOIN namaste_codes nc ON brm.namaste_code = nc.code
            LEFT JOIN body_regions br ON brm.body_region_id = br.id
            WHERE br.code = 'chest'
            LIMIT 5
        `);

        if (fullJoinResult.rows.length === 0) {
            console.log('  ❌ NO RESULTS FROM JOIN!');
        } else {
            fullJoinResult.rows.forEach(r => {
                console.log(`  - ${r.namaste_code}: ${r.namaste_display || 'NULL'} (${r.system_type || 'NULL'})`);
            });
        }

        await client.end();
        console.log('\n✅ Tests complete');
    } catch (error) {
        console.error('❌ Error:', error.message);
        await client.end();
        process.exit(1);
    }
}

testAPI();
