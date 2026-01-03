import express from 'express';
import db from '../database/db.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/treatments
 * Create a new treatment record
 */
router.post('/treatments', optionalAuth, async (req, res) => {
    try {
        const {
            patient_id,
            namaste_code,
            icd11_code,
            clinical_notes,
            consent_given
        } = req.body;

        if (!patient_id || !namaste_code) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'patient_id and namaste_code are required'
            });
        }

        // Get doctor ID from auth (if available)
        const doctor_id = req.user?.id || null;

        // Get hospital ID (first hospital for now)
        const hospitalResult = await db.query('SELECT id FROM hospitals LIMIT 1');
        const hospital_id = hospitalResult.rows[0]?.id;

        // Get NAMASTE code ID
        const namasteResult = await db.query(
            'SELECT id FROM namaste_codes WHERE code = $1',
            [namaste_code]
        );
        const namaste_code_id = namasteResult.rows[0]?.id;

        if (!namaste_code_id) {
            return res.status(404).json({
                error: 'NAMASTE code not found',
                message: `Code ${namaste_code} does not exist`
            });
        }

        // Get ICD-11 code ID if provided
        let icd11_code_id = null;
        if (icd11_code) {
            const icd11Result = await db.query(
                'SELECT id FROM icd11_codes WHERE icd_code = $1',
                [icd11_code]
            );
            icd11_code_id = icd11Result.rows[0]?.id;
        }

        // Insert treatment record
        const result = await db.query(`
            INSERT INTO patient_treatments (
                patient_id, doctor_id, hospital_id,
                namaste_code_id, icd11_code_id,
                clinical_notes, consent_given, consent_timestamp
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `, [
            patient_id,
            doctor_id,
            hospital_id,
            namaste_code_id,
            icd11_code_id,
            clinical_notes,
            consent_given,
            consent_given ? new Date() : null
        ]);

        res.status(201).json({
            success: true,
            treatment: result.rows[0]
        });

    } catch (error) {
        console.error('Error creating treatment:', error);
        res.status(500).json({
            error: 'Failed to create treatment record',
            message: error.message
        });
    }
});

/**
 * GET /api/terminology/stats
 * Get terminology statistics
 */
router.get('/terminology/stats', optionalAuth, async (req, res) => {
    try {
        const stats = await db.query(`
            SELECT 
                (SELECT COUNT(*) FROM namaste_codes) as namaste_count,
                (SELECT COUNT(*) FROM icd11_codes) as icd11_count,
                (SELECT COUNT(*) FROM concept_mappings) as mapping_count,
                (SELECT COUNT(*) FROM concept_mappings WHERE verified = true) as verified_count
        `);

        const row = stats.rows[0];

        res.json({
            namaste_count: parseInt(row.namaste_count),
            icd11_count: parseInt(row.icd11_count),
            mapping_count: parseInt(row.mapping_count),
            verified_count: parseInt(row.verified_count || 0)
        });

    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({
            error: 'Failed to fetch statistics',
            message: error.message
        });
    }
});

/**
 * GET /api/terminology/namaste/search
 * Search NAMASTE codes
 */
router.get('/terminology/namaste/search', optionalAuth, async (req, res) => {
    try {
        const { q } = req.query;

        if (!q || q.length < 2) {
            return res.json({ results: [] });
        }

        const result = await db.query(`
            SELECT 
                id, code, display, system_type, definition
            FROM namaste_codes
            WHERE 
                LOWER(display) LIKE $1
                OR LOWER(code) LIKE $1
                OR LOWER(definition) LIKE $1
            ORDER BY display
            LIMIT 20
        `, [`%${q.toLowerCase()}%`]);

        res.json({ results: result.rows });

    } catch (error) {
        console.error('NAMASTE search error:', error);
        res.status(500).json({
            error: 'Search failed',
            message: error.message
        });
    }
});

/**
 * GET /api/terminology/icd11/search
 * Search ICD-11 codes
 */
router.get('/terminology/icd11/search', optionalAuth, async (req, res) => {
    try {
        const { q } = req.query;

        if (!q || q.length < 2) {
            return res.json({ results: [] });
        }

        const result = await db.query(`
            SELECT 
                id, icd_code, title, module, definition
            FROM icd11_codes
            WHERE 
                LOWER(title) LIKE $1
                OR LOWER(icd_code) LIKE $1
                OR LOWER(definition) LIKE $1
            ORDER BY title
            LIMIT 20
        `, [`%${q.toLowerCase()}%`]);

        res.json({ results: result.rows });

    } catch (error) {
        console.error('ICD-11 search error:', error);
        res.status(500).json({
            error: 'Search failed',
            message: error.message
        });
    }
});

/**
 * GET /api/terminology/concept-map/translate
 * Get ICD-11 mappings for a NAMASTE code
 */
router.get('/terminology/concept-map/translate', optionalAuth, async (req, res) => {
    try {
        const { system, code } = req.query;

        if (!code) {
            return res.json({ mappings: [] });
        }

        if (system === 'namaste') {
            const result = await db.query(`
                SELECT 
                    ic.icd_code as target_code,
                    ic.title as target_display,
                    cm.confidence_score as confidence,
                    cm.mapping_type as equivalence
                FROM concept_mappings cm
                JOIN namaste_codes nc ON cm.namaste_code_id = nc.id
                JOIN icd11_codes ic ON cm.icd11_code_id = ic.id
                WHERE nc.code = $1
                ORDER BY cm.confidence_score DESC
            `, [code]);

            res.json({ mappings: result.rows });
        } else {
            res.json({ mappings: [] });
        }

    } catch (error) {
        console.error('Translation error:', error);
        res.status(500).json({
            error: 'Translation failed',
            message: error.message
        });
    }
});

/**
 * GET /api/terminology/concept-map
 * Get all concept mappings with pagination
 */
router.get('/terminology/concept-map', optionalAuth, async (req, res) => {
    try {
        const { page = 1, limit = 20, system, minConfidence = 0 } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT 
                nc.code as source_code,
                nc.display as source_display,
                nc.system_type,
                ic.icd_code as target_code,
                ic.title as target_display,
                cm.confidence_score as confidence,
                cm.mapping_type as equivalence
            FROM concept_mappings cm
            JOIN namaste_codes nc ON cm.namaste_code_id = nc.id
            JOIN icd11_codes ic ON cm.icd11_code_id = ic.id
            WHERE cm.confidence_score >= $1
        `;

        const params = [parseFloat(minConfidence)];

        if (system && system !== 'all') {
            query += ` AND nc.system_type = $${params.length + 1}`;
            params.push(system);
        }

        query += ` ORDER BY nc.display LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(parseInt(limit), parseInt(offset));

        const result = await db.query(query, params);

        // Get total count
        let countQuery = `
            SELECT COUNT(*) 
            FROM concept_mappings cm
            JOIN namaste_codes nc ON cm.namaste_code_id = nc.id
            WHERE cm.confidence_score >= $1
        `;
        const countParams = [parseFloat(minConfidence)];
        if (system && system !== 'all') {
            countQuery += ` AND nc.system_type = $2`;
            countParams.push(system);
        }

        const countResult = await db.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].count);

        res.json({
            mappings: result.rows,
            total,
            page: parseInt(page),
            limit: parseInt(limit)
        });

    } catch (error) {
        console.error('Concept map error:', error);
        res.status(500).json({
            error: 'Failed to fetch mappings',
            message: error.message
        });
    }
});

export default router;
