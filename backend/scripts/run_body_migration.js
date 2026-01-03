import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../database/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Run body regions migration
 */
async function runMigration() {
    try {
        console.log('🔧 Running body regions migration...\n');

        // Read migration file
        const migrationPath = path.join(__dirname, '../database/migrations/add_body_regions.sql');
        const migration = fs.readFileSync(migrationPath, 'utf8');

        // Execute migration
        await db.query(migration);

        console.log('✅ Migration completed successfully!\n');

        // Verify tables were created
        const tablesResult = await db.query(`
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
        const regionsResult = await db.query('SELECT COUNT(*) FROM body_regions');
        const keywordsResult = await db.query('SELECT COUNT(*) FROM body_region_keywords');

        console.log(`\n📈 Seeded data:`);
        console.log(`   ✓ ${regionsResult.rows[0].count} body regions`);
        console.log(`   ✓ ${keywordsResult.rows[0].count} keywords`);

        console.log(`\n💡 Next step: Run "node backend/scripts/auto_map_body_regions.js" to generate mappings`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
