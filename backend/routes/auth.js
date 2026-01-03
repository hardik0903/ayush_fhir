import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import db from '../database/db.js';

const router = express.Router();

/**
 * POST /auth/login
 * Login with ABHA ID and password (mocked ABHA authentication)
 */
router.post('/login', async (req, res) => {
    try {
        const { abhaId, password } = req.body;

        if (!abhaId || !password) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'ABHA ID and password are required'
            });
        }

        // Find doctor by ABHA ID
        const doctorResult = await db.query(
            'SELECT * FROM doctors WHERE abha_id = $1 AND is_active = true',
            [abhaId]
        );

        if (doctorResult.rows.length === 0) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid ABHA ID or password'
            });
        }

        const doctor = doctorResult.rows[0];

        // Verify password
        const validPassword = await bcrypt.compare(password, doctor.password_hash);

        if (!validPassword) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid ABHA ID or password'
            });
        }

        // Generate JWT tokens
        const accessToken = jwt.sign(
            { doctorId: doctor.id, abhaId: doctor.abha_id },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRY || '24h' }
        );

        const refreshToken = jwt.sign(
            { doctorId: doctor.id, type: 'refresh' },
            process.env.JWT_SECRET,
            { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || '7d' }
        );

        // Mock ABHA token (in production, this would come from ABHA system)
        const abhaToken = `ABHA_MOCK_${uuidv4()}`;

        // Calculate expiry
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        // Store session
        await db.query(`
      INSERT INTO oauth_sessions (doctor_id, access_token, refresh_token, abha_token, expires_at)
      VALUES ($1, $2, $3, $4, $5)
    `, [doctor.id, accessToken, refreshToken, abhaToken, expiresAt]);

        // Return tokens and user info
        res.json({
            accessToken,
            refreshToken,
            expiresIn: 86400, // 24 hours in seconds
            tokenType: 'Bearer',
            user: {
                id: doctor.id,
                abhaId: doctor.abha_id,
                name: doctor.name,
                licenseNumber: doctor.license_number,
                specialization: doctor.specialization,
                email: doctor.email,
                hospitalId: doctor.hospital_id
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Login failed'
        });
    }
});

/**
 * POST /auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Refresh token is required'
            });
        }

        // Verify refresh token
        const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

        if (decoded.type !== 'refresh') {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid refresh token'
            });
        }

        // Check if session exists
        const sessionResult = await db.query(
            'SELECT * FROM oauth_sessions WHERE refresh_token = $1',
            [refreshToken]
        );

        if (sessionResult.rows.length === 0) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid refresh token'
            });
        }

        // Generate new access token
        const accessToken = jwt.sign(
            { doctorId: decoded.doctorId },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRY || '24h' }
        );

        // Update session
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        await db.query(
            'UPDATE oauth_sessions SET access_token = $1, expires_at = $2 WHERE refresh_token = $3',
            [accessToken, expiresAt, refreshToken]
        );

        res.json({
            accessToken,
            expiresIn: 86400,
            tokenType: 'Bearer'
        });

    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid or expired refresh token'
            });
        }

        console.error('Token refresh error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Token refresh failed'
        });
    }
});

/**
 * POST /auth/logout
 * Logout and invalidate session
 */
router.post('/logout', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'No token provided'
            });
        }

        const token = authHeader.substring(7);

        // Delete session
        await db.query('DELETE FROM oauth_sessions WHERE access_token = $1', [token]);

        res.json({
            message: 'Logged out successfully'
        });

    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Logout failed'
        });
    }
});

/**
 * GET /auth/verify
 * Verify token validity
 */
router.get('/verify', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                valid: false,
                message: 'No token provided'
            });
        }

        const token = authHeader.substring(7);

        // Verify JWT
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Check session
        const sessionResult = await db.query(
            'SELECT * FROM oauth_sessions WHERE access_token = $1 AND expires_at > NOW()',
            [token]
        );

        if (sessionResult.rows.length === 0) {
            return res.status(401).json({
                valid: false,
                message: 'Invalid or expired token'
            });
        }

        res.json({
            valid: true,
            expiresAt: sessionResult.rows[0].expires_at
        });

    } catch (error) {
        res.status(401).json({
            valid: false,
            message: 'Invalid token'
        });
    }
});

export default router;
