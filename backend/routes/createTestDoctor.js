import { Router } from 'express';
import pool from '../database/db.js';
import bcrypt from 'bcryptjs';

const router = Router();

// Create a test doctor account with known credentials
router.post('/create-test-doctor', async (req, res) => {
    try {
        const { secret } = req.body;

        // Simple authentication
        if (secret !== 'create-test-doctor-secret') {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const abhaId = 'TEST-DOC-123';
        const password = 'Test@123';
        const name = 'Dr. Test Account';
        const specialization = 'General Medicine';
        const licenseNumber = 'MED-TEST-00001';

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Check if test doctor already exists
        const existing = await pool.query(
            'SELECT id FROM doctors WHERE abha_id = $1',
            [abhaId]
        );

        if (existing.rows.length > 0) {
            // Update existing test doctor
            await pool.query(
                'UPDATE doctors SET password_hash = $1, name = $2, specialization = $3 WHERE abha_id = $4',
                [hashedPassword, name, specialization, abhaId]
            );

            return res.json({
                message: 'Test doctor updated successfully',
                credentials: {
                    abhaId,
                    password,
                    name,
                    specialization
                }
            });
        }

        // Create new test doctor
        await pool.query(
            `INSERT INTO doctors (abha_id, name, specialization, license_number, password_hash, created_at)
             VALUES ($1, $2, $3, $4, $5, NOW())`,
            [abhaId, name, specialization, licenseNumber, hashedPassword]
        );

        res.json({
            message: 'Test doctor created successfully',
            credentials: {
                abhaId,
                password,
                name,
                specialization
            }
        });

    } catch (error) {
        console.error('Error creating test doctor:', error);
        res.status(500).json({
            error: 'Failed to create test doctor',
            message: error.message
        });
    }
});

export default router;
