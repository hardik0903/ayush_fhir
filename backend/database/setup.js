import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Setup database schema
 */
async function setupDatabase() {
    try {
        console.log('🔧 Setting up database schema...');

        // Read schema file
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        // Execute schema
        await db.query(schema);

        console.log('✅ Database schema created successfully');

        // Check if we need to seed data
        const result = await db.query('SELECT COUNT(*) FROM namaste_codes');
        const count = parseInt(result.rows[0].count);

        if (count === 0) {
            console.log('📊 Database is empty. Run "npm run db:seed" to populate with sample data.');
        } else {
            console.log(`📊 Database contains ${count} NAMASTE codes`);
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Database setup failed:', error);
        process.exit(1);
    }
}

setupDatabase();
