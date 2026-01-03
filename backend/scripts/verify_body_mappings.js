import pg from 'pg';
import fetch from 'node-fetch';

const { Client } = pg;

async function verifySystem() {
    console.log('🔍 VERIFICATION: Body Mapping System\n');
    console.log('='.repeat(70));

    // Test 1: Database verification
    console.log('\n✅ TEST 1: Database Verification');
    const client = new Client({
        host: 'localhost',
        port: 5432,
        database: 'ayush_fhir',
        user: 'postgres',
        password: 'hardik999'
    });

    await client.connect();

    const counts = await client.query(`
        SELECT br.code, COUNT(brm.id) as count
        FROM body_regions br
        LEFT JOIN body_region_mappings brm ON br.id = brm.body_region_id
        GROUP BY br.code
        ORDER BY br.code
    `);

    console.log('   Mapping counts in database:');
    counts.rows.forEach(r => console.log(`      ${r.code}: ${r.count} mappings`));

    // Test 2: Sample data from database
    console.log('\n✅ TEST 2: Sample Chest Mappings (Database)');
    const chestSample = await client.query(`
        SELECT 
            brm.namaste_code,
            nc.display as namaste_display,
            brm.relevance_score,
            brm.mapping_type
        FROM body_region_mappings brm
        JOIN body_regions br ON brm.body_region_id = br.id
        LEFT JOIN namaste_codes nc ON brm.namaste_code = nc.code
        WHERE br.code = 'chest'
        LIMIT 3
    `);

    chestSample.rows.forEach(r => {
        console.log(`   ${r.namaste_code}: ${r.namaste_display || 'N/A'}`);
        console.log(`      Score: ${r.relevance_score}, Type: ${r.mapping_type}\n`);
    });

    await client.end();

    // Test 3: API endpoint verification
    console.log('✅ TEST 3: API Endpoint Test');
    try {
        const response = await fetch('http://localhost:5000/api/body-regions/chest/diagnoses?limit=3');
        const data = await response.json();

        console.log(`   Status: ${response.status}`);
        console.log(`   Region: ${data.region?.display_name || 'N/A'}`);
        console.log(`   Total diagnoses: ${data.total || 0}`);

        if (data.diagnoses && data.diagnoses.length > 0) {
            console.log('\n   Sample diagnoses:');
            data.diagnoses.slice(0, 3).forEach(d => {
                console.log(`      ${d.namaste_code}: ${d.namaste_display || 'N/A'}`);
                console.log(`         Relevance: ${d.relevance_score}, Type: ${d.mapping_type}`);
            });
        } else {
            console.log('   ⚠️  No diagnoses returned!');
        }
    } catch (error) {
        console.log(`   ❌ API Error: ${error.message}`);
    }

    console.log('\n' + '='.repeat(70));
    console.log('\n💡 RECOMMENDATION:');
    console.log('   If API returns empty results, restart the backend server.');
    console.log('   Then test the 3D map in the browser!');
}

verifySystem();
