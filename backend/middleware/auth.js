import jwt from 'jsonwebtoken';
import db from '../database/db.js';

/**
 * Authentication middleware - verify JWT token
 */
export const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'No token provided'
            });
        }

        const token = authHeader.substring(7);

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Check if session exists and is valid
        const sessionResult = await db.query(
            'SELECT * FROM oauth_sessions WHERE access_token = $1 AND expires_at > NOW()',
            [token]
        );

        if (sessionResult.rows.length === 0) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid or expired token'
            });
        }

        // Get doctor details
        const doctorResult = await db.query(
            'SELECT id, abha_id, name, license_number, specialization, email, hospital_id FROM doctors WHERE id = $1 AND is_active = true',
            [decoded.doctorId]
        );

        if (doctorResult.rows.length === 0) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Doctor not found or inactive'
            });
        }

        // Attach user to request
        req.user = {
            ...doctorResult.rows[0],
            sessionId: sessionResult.rows[0].id
        };

        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid token'
            });
        }

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Token expired'
            });
        }

        console.error('Authentication error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Authentication failed'
        });
    }
};

/**
 * Optional authentication - attach user if token is valid, but don't require it
 */
export const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next();
        }

        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const doctorResult = await db.query(
            'SELECT id, abha_id, name, license_number, specialization, email FROM doctors WHERE id = $1 AND is_active = true',
            [decoded.doctorId]
        );

        if (doctorResult.rows.length > 0) {
            req.user = doctorResult.rows[0];
        }

        next();
    } catch (error) {
        // Ignore authentication errors for optional auth
        next();
    }
};

export default {
    authenticate,
    optionalAuth
};
