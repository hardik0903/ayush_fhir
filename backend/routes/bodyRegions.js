import express from 'express';
import db from '../database/db.js';
import { optionalAuth, authenticate } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/body-regions
 * Returns all body regions with hierarchy
 */
router.get('/', optionalAuth, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT 
                br.id,
                br.code,
                br.display_name,
                br.display_name_sanskrit,
                br.display_name_hindi,
                br.anatomical_system,
                br.description,
                br.parent_region_id,
                COUNT(DISTINCT brm.id) as mapping_count,
                COUNT(DISTINCT CASE WHEN brm.verified = true THEN brm.id END) as verified_count
            FROM body_regions br
            LEFT JOIN body_region_mappings brm ON br.id = brm.body_region_id
            GROUP BY br.id
            ORDER BY br.id
        `);

        res.json({
            regions: result.rows
        });
    } catch (error) {
        console.error('Error fetching body regions:', error);
        res.status(500).json({ error: 'Failed to fetch body regions' });
    }
});

/**
 * GET /api/body-regions/:code/diagnoses
 * Returns all mapped diagnoses for a specific body region
 */
router.get('/:code/diagnoses', optionalAuth, async (req, res) => {
    try {
        const { code } = req.params;
        const {
            verified_only = 'false',
            min_relevance = '0.5',
            limit = '50'
        } = req.query;

        // Get region info
        const regionResult = await db.query(
            'SELECT * FROM body_regions WHERE code = $1',
            [code]
        );

        if (regionResult.rows.length === 0) {
            return res.status(404).json({ error: 'Body region not found' });
        }

        const region = regionResult.rows[0];

        // Get mappings with full details
        const mappingsResult = await db.query(`
            SELECT 
                brm.id,
                brm.namaste_code,
                nc.display as namaste_display,
                nc.system_type,
                brm.icd_code,
                ic.title as icd_title,
                brm.relevance_score,
                brm.mapping_type,
                brm.verified,
                brm.notes,
                brm.verified_at
            FROM body_region_mappings brm
            LEFT JOIN namaste_codes nc ON brm.namaste_code = nc.code
            LEFT JOIN icd11_codes ic ON brm.icd_code = ic.icd_code
            WHERE brm.body_region_id = $1
                AND brm.relevance_score >= $2
                ${verified_only === 'true' ? 'AND brm.verified = true' : ''}
            ORDER BY brm.relevance_score DESC, brm.verified DESC
            LIMIT $3
        `, [region.id, parseFloat(min_relevance), parseInt(limit)]);

        // Group by NAMASTE code and aggregate ICD mappings
        const diagnosesMap = new Map();

        for (const row of mappingsResult.rows) {
            if (!row.namaste_code) continue;

            if (!diagnosesMap.has(row.namaste_code)) {
                diagnosesMap.set(row.namaste_code, {
                    namaste_code: row.namaste_code,
                    namaste_display: row.namaste_display,
                    system_type: row.system_type,
                    relevance_score: row.relevance_score,
                    mapping_type: row.mapping_type,
                    verified: row.verified,
                    notes: row.notes,
                    mappings: []
                });
            }

            if (row.icd_code) {
                diagnosesMap.get(row.namaste_code).mappings.push({
                    icd_code: row.icd_code,
                    icd_title: row.icd_title
                });
            }
        }

        res.json({
            region: {
                code: region.code,
                display_name: region.display_name,
                display_name_sanskrit: region.display_name_sanskrit,
                anatomical_system: region.anatomical_system,
                description: region.description
            },
            diagnoses: Array.from(diagnosesMap.values()),
            total: diagnosesMap.size
        });

    } catch (error) {
        console.error('Error fetching body region diagnoses:', error);
        res.status(500).json({ error: 'Failed to fetch diagnoses' });
    }
});

/**
 * POST /api/body-regions/:code/mappings
 * Create a new body region mapping (requires authentication)
 */
router.post('/:code/mappings', authenticate, async (req, res) => {
    try {
        const { code } = req.params;
        const { namaste_code, icd_code, relevance_score, mapping_type, notes } = req.body;

        // Validate input
        if (!namaste_code && !icd_code) {
            return res.status(400).json({ error: 'Must provide either namaste_code or icd_code' });
        }

        // Get region
        const regionResult = await db.query(
            'SELECT id FROM body_regions WHERE code = $1',
            [code]
        );

        if (regionResult.rows.length === 0) {
            return res.status(404).json({ error: 'Body region not found' });
        }

        // Insert mapping
        const result = await db.query(`
            INSERT INTO body_region_mappings 
            (body_region_id, namaste_code, icd_code, relevance_score, mapping_type, verified, verified_by, verified_at, notes)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)
            RETURNING *
        `, [
            regionResult.rows[0].id,
            namaste_code || null,
            icd_code || null,
            relevance_score || 1.0,
            mapping_type || 'primary',
            true, // Auto-verify if created by doctor
            req.user.id,
            notes || null
        ]);

        res.status(201).json({
            message: 'Mapping created successfully',
            mapping: result.rows[0]
        });

    } catch (error) {
        console.error('Error creating body region mapping:', error);
        res.status(500).json({ error: 'Failed to create mapping' });
    }
});

/**
 * PATCH /api/body-regions/mappings/:id/verify
 * Verify a mapping (requires authentication)
 */
router.patch('/mappings/:id/verify', authenticate, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.query(`
            UPDATE body_region_mappings
            SET verified = true,
                verified_by = $1,
                verified_at = NOW()
            WHERE id = $2
            RETURNING *
        `, [req.user.id, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Mapping not found' });
        }

        res.json({
            message: 'Mapping verified successfully',
            mapping: result.rows[0]
        });

    } catch (error) {
        console.error('Error verifying mapping:', error);
        res.status(500).json({ error: 'Failed to verify mapping' });
    }
});

/**
 * DELETE /api/body-regions/mappings/:id
 * Delete a mapping (requires authentication)
 */
router.delete('/mappings/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.query(
            'DELETE FROM body_region_mappings WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Mapping not found' });
        }

        res.json({ message: 'Mapping deleted successfully' });

    } catch (error) {
        console.error('Error deleting mapping:', error);
        res.status(500).json({ error: 'Failed to delete mapping' });
    }
});

export default router;
