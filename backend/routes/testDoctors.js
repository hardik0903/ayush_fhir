import { Router } from 'express';
import pool from '../database/db.js';

const router = Router();

// Get list of doctors (for testing/debugging)
router.get('/list', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, abha_id, name, specialization, created_at 
            FROM doctors 
            ORDER BY created_at DESC 
            LIMIT 10
        `);

        res.json({
            count: result.rows.length,
            doctors: result.rows,
            note: 'Default password for all doctors: Doctor@123'
        });
    } catch (error) {
        res.status(500).json({
            error: 'Failed to fetch doctors',
            message: error.message
        });
    }
});

// Get total doctor count
router.get('/count', async (req, res) => {
    try {
        const result = await pool.query('SELECT COUNT(*) FROM doctors');
        res.json({
            total: parseInt(result.rows[0].count),
            defaultPassword: 'Doctor@123'
        });
    } catch (error) {
        res.status(500).json({
            error: 'Failed to count doctors',
            message: error.message
        });
    }
});

export default router;
