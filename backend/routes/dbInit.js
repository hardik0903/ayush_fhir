/**
 * Database Initialization Endpoint
 * This endpoint runs all database setup scripts when called
 * Use this when Render Shell is not available on free tier
 */

import { Router } from 'express';
import pool from '../database/db.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const router = Router();
const execAsync = promisify(exec);

// Simple authentication - use a secret key
const INIT_SECRET = process.env.DB_INIT_SECRET || 'change-this-secret-key';

router.post('/initialize', async (req, res) => {
    try {
        const { secret } = req.body;

        // Verify secret
        if (secret !== INIT_SECRET) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        console.log('🔧 Starting database initialization...');
        const results = [];

        // Run setup.js
        try {
            console.log('Running database/setup.js...');
            const { stdout, stderr } = await execAsync('node database/setup.js');
            results.push({ script: 'setup.js', status: 'success', output: stdout });
            console.log('✅ setup.js completed');
        } catch (error) {
            results.push({ script: 'setup.js', status: 'error', error: error.message });
            console.error('❌ setup.js failed:', error.message);
        }

        // Run seed.js
        try {
            console.log('Running database/seed.js...');
            const { stdout, stderr } = await execAsync('node database/seed.js');
            results.push({ script: 'seed.js', status: 'success', output: stdout });
            console.log('✅ seed.js completed');
        } catch (error) {
            results.push({ script: 'seed.js', status: 'error', error: error.message });
            console.error('❌ seed.js failed:', error.message);
        }

        // Run body migration
        try {
            console.log('Running scripts/run_body_migration_direct.js...');
            const { stdout, stderr } = await execAsync('node scripts/run_body_migration_direct.js');
            results.push({ script: 'run_body_migration_direct.js', status: 'success', output: stdout });
            console.log('✅ run_body_migration_direct.js completed');
        } catch (error) {
            results.push({ script: 'run_body_migration_direct.js', status: 'error', error: error.message });
            console.error('❌ run_body_migration_direct.js failed:', error.message);
        }

        // Run intelligent mapper
        try {
            console.log('Running scripts/intelligent_body_mapper.js...');
            const { stdout, stderr } = await execAsync('node scripts/intelligent_body_mapper.js');
            results.push({ script: 'intelligent_body_mapper.js', status: 'success', output: stdout });
            console.log('✅ intelligent_body_mapper.js completed');
        } catch (error) {
            results.push({ script: 'intelligent_body_mapper.js', status: 'error', error: error.message });
            console.error('❌ intelligent_body_mapper.js failed:', error.message);
        }

        // Run populate doctors
        try {
            console.log('Running scripts/populate_doctors.js...');
            const { stdout, stderr } = await execAsync('node scripts/populate_doctors.js');
            results.push({ script: 'populate_doctors.js', status: 'success', output: stdout });
            console.log('✅ populate_doctors.js completed');
        } catch (error) {
            results.push({ script: 'populate_doctors.js', status: 'error', error: error.message });
            console.error('❌ populate_doctors.js failed:', error.message);
        }

        console.log('🎉 Database initialization completed!');

        res.json({
            message: 'Database initialization completed',
            results
        });

    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        res.status(500).json({
            error: 'Database initialization failed',
            message: error.message
        });
    }
});

// Health check for initialization endpoint
router.get('/status', async (req, res) => {
    try {
        // Check if tables exist
        const result = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);

        res.json({
            status: 'ok',
            tables: result.rows.map(r => r.table_name),
            tableCount: result.rows.length
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            error: error.message
        });
    }
});

export default router;
