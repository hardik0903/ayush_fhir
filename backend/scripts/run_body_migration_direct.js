import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Client } = pg;

/**
 * Standalone migration script with direct connection
 * Use this if the regular migration fails due to .env issues
 */
async function runMigrationDirect() {
    // Direct connection configuration
    const client = new Client({
        host: 'localhost',
        port: 5432,
        database: 'ayush_fhir',
        user: 'postgres',
        password: 'hardik999' // Your PostgreSQL password
    });

    try {
        console.log('🔧 Connecting to database...\n');
        await client.connect();
        console.log('✅ Connected successfully!\n');

        console.log('📄 Reading migration file...');
        const migrationPath = path.join(__dirname, '../database/migrations/add_body_regions.sql');
        const migration = fs.readFileSync(migrationPath, 'utf8');

        console.log('⚙️  Executing migration...\n');
        await client.query(migration);

        console.log('✅ Migration completed successfully!\n');

        // Verify tables were created
        const tablesResult = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('body_regions', 'body_region_mappings', 'body_region_keywords')
            ORDER BY table_name
        `);

        console.log('📊 Created tables:');
        tablesResult.rows.forEach(row => {
            console.log(`   ✓ ${row.table_name}`);
        });

        // Check seeded data
        const regionsResult = await client.query('SELECT COUNT(*) FROM body_regions');
        const keywordsResult = await client.query('SELECT COUNT(*) FROM body_region_keywords');

        console.log(`\n📈 Seeded data:`);
        console.log(`   ✓ ${regionsResult.rows[0].count} body regions`);
        console.log(`   ✓ ${keywordsResult.rows[0].count} keywords`);

        console.log(`\n💡 Next step: Run "node backend/scripts/auto_map_body_regions.js" to generate mappings`);

        await client.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        await client.end();
        process.exit(1);
    }
}

runMigrationDirect();
