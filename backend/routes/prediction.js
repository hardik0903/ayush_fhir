import express from 'express';
import axios from 'axios';
import { optionalAuth } from '../middleware/auth.js';
import db from '../database/db.js';

const router = express.Router();
const ML_SERVICE_URL = 'http://localhost:5001';

/**
 * GET /api/prediction/symptoms
 * Get list of available symptoms from ML service
 */
router.get('/symptoms', optionalAuth, async (req, res) => {
    try {
        const response = await axios.get(`${ML_SERVICE_URL}/symptoms`);
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching symptoms:', error.message);
        res.status(503).json({
            error: 'ML Service Unavailable',
            message: 'Could not fetch symptoms list. Please try again later.'
        });
    }
});

/**
 * GET /api/prediction/models
 * Get available models info
 */
router.get('/models', optionalAuth, async (req, res) => {
    try {
        const response = await axios.get(`${ML_SERVICE_URL}/models`);
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching models:', error.message);
        res.status(503).json({
            error: 'ML Service Unavailable',
            message: 'Could not fetch model information.'
        });
    }
});

/**
 * POST /api/prediction/disease
 * Predict disease from symptoms
 */
router.post('/disease', optionalAuth, async (req, res) => {
    try {
        const { symptoms, model } = req.body;

        if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
            return res.status(400).json({
                error: 'Invalid Input',
                message: 'Please provide a list of symptoms.'
            });
        }

        // Call Python ML Service
        const response = await axios.post(`${ML_SERVICE_URL}/predict`, {
            symptoms,
            model
        });

        // Log prediction if user is authenticated
        if (req.user) {
            try {
                // Check if table exists, if not create it (temporary, should be migration)
                await db.query(`
                    CREATE TABLE IF NOT EXISTS prediction_history (
                        id SERIAL PRIMARY KEY,
                        user_id INTEGER,
                        symptoms TEXT[],
                        model_used VARCHAR(50),
                        predicted_disease VARCHAR(255),
                        confidence FLOAT,
                        created_at TIMESTAMP DEFAULT NOW()
                    )
                `);

                const result = response.data;
                let predictedDisease = result.prediction;
                let confidence = result.confidence;

                // Handle 'all' models case - pick highest confidence or first
                if (model === 'all' && result.predictions) {
                    const firstModel = Object.keys(result.predictions)[0];
                    predictedDisease = result.predictions[firstModel].disease;
                    confidence = result.predictions[firstModel].confidence;
                }

                await db.query(`
                    INSERT INTO prediction_history 
                    (user_id, symptoms, model_used, predicted_disease, confidence)
                    VALUES ($1, $2, $3, $4, $5)
                `, [
                    req.user.id,
                    symptoms,
                    model || 'random_forest',
                    predictedDisease,
                    confidence || 0
                ]);

                // Explicitly log to main Audit Trail for Dashboard "Recent Activity"
                try {
                    await db.query(`
                        INSERT INTO audit_logs (
                            user_id, user_type, action, resource_type, 
                            ip_address, user_agent, request_payload, response_status
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    `, [
                        req.user.id,
                        'doctor',
                        `Predicted: ${predictedDisease}`,
                        'disease_prediction',
                        req.ip || req.connection.remoteAddress,
                        req.headers['user-agent'],
                        JSON.stringify({ symptoms, confidence, model }),
                        200
                    ]);
                } catch (auditErr) {
                    console.error('Error writing to audit_logs:', auditErr);
                }

            } catch (dbError) {
                console.error('Error logging prediction:', dbError);
                // Don't fail the request if logging fails
            }
        }

        res.json(response.data);

    } catch (error) {
        console.error('Prediction error:', error.message);
        if (error.response) {
            res.status(error.response.status).json(error.response.data);
        } else {
            res.status(503).json({
                error: 'ML Service Error',
                message: 'Prediction service is currently unavailable.'
            });
        }
    }
});

/**
 * GET /api/prediction/history
 * Get prediction history for user
 */
router.get('/history', optionalAuth, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Check if table exists first
        const tableCheck = await db.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'prediction_history'
            )
        `);

        if (!tableCheck.rows[0].exists) {
            return res.json({ history: [] });
        }

        const result = await db.query(`
            SELECT * FROM prediction_history 
            WHERE user_id = $1 
            ORDER BY created_at DESC 
            LIMIT 50
        `, [req.user.id]);

        res.json({ history: result.rows });

    } catch (error) {
        console.error('History fetch error:', error);
        res.status(500).json({
            error: 'Database Error',
            message: 'Failed to fetch prediction history'
        });
    }
});

export default router;
