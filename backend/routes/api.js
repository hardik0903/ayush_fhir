import express from 'express';
import db from '../database/db.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/search/diagnosis
 * Search for NAMASTE codes and return with their WHO/ICD-11 mappings
 */
router.get('/search/diagnosis', optionalAuth, async (req, res) => {
    try {
        const { query, system, limit = 20 } = req.query;

        if (!query || query.length < 2) {
            return res.json({ results: [] });
        }

        // Normalize the search query (remove diacritical marks)
        const normalizedQuery = query
            .toLowerCase()
            .replace(/ā/g, 'a')
            .replace(/ī/g, 'i')
            .replace(/ū/g, 'u')
            .replace(/ṛ/g, 'r')
            .replace(/ḥ/g, 'h');

        // Build the SQL query to search NAMASTE codes and get their mappings
        let sqlQuery = `
            SELECT 
                nc.id as namaste_id,
                nc.code as namaste_code,
                nc.display as namaste_display,
                nc.system_type,
                nc.definition as namaste_definition,
                cm.id as mapping_id,
                cm.confidence_score,
                cm.mapping_type,
                ic.icd_code,
                ic.title as icd_title,
                ic.module as icd_module,
                ic.definition as icd_definition
            FROM namaste_codes nc
            LEFT JOIN concept_mappings cm ON nc.id = cm.namaste_code_id
            LEFT JOIN icd11_codes ic ON cm.icd11_code_id = ic.id
            WHERE (
                LOWER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(nc.display, 'ā', 'a'), 'ī', 'i'), 'ū', 'u'), 'ṛ', 'r'), 'ḥ', 'h')) LIKE $1
                OR LOWER(nc.display) LIKE $1
                OR LOWER(nc.code) LIKE $1
            )
        `;

        const params = [`%${normalizedQuery}%`];

        // Add system filter if provided
        if (system && ['ayurveda', 'siddha', 'unani'].includes(system)) {
            sqlQuery += ` AND nc.system_type = $${params.length + 1}`;
            params.push(system);
        }

        sqlQuery += `
            ORDER BY 
                CASE WHEN LOWER(nc.display) LIKE $${params.length + 1} THEN 0 ELSE 1 END,
                nc.display,
                cm.confidence_score DESC
            LIMIT $${params.length + 2}
        `;

        params.push(`${normalizedQuery}%`);
        params.push(limit);

        const result = await db.query(sqlQuery, params);

        // Group results by NAMASTE code
        const groupedResults = {};

        result.rows.forEach(row => {
            const key = row.namaste_code;

            if (!groupedResults[key]) {
                groupedResults[key] = {
                    namaste_code: row.namaste_code,
                    namaste_display: row.namaste_display,
                    system_type: row.system_type,
                    namaste_definition: row.namaste_definition,
                    mappings: []
                };
            }

            // Add mapping if it exists
            if (row.icd_code) {
                groupedResults[key].mappings.push({
                    icd_code: row.icd_code,
                    icd_title: row.icd_title,
                    icd_module: row.icd_module,
                    icd_definition: row.icd_definition,
                    confidence_score: parseFloat(row.confidence_score),
                    mapping_type: row.mapping_type
                });
            }
        });

        // Convert to array and sort by number of mappings (codes with mappings first)
        const results = Object.values(groupedResults).sort((a, b) => {
            if (a.mappings.length !== b.mappings.length) {
                return b.mappings.length - a.mappings.length;
            }
            return a.namaste_display.localeCompare(b.namaste_display);
        });

        res.json({ results, total: results.length });

    } catch (error) {
        console.error('Diagnosis search error:', error);
        res.status(500).json({
            error: 'Search failed',
            message: error.message
        });
    }
});

/**
 * GET /api/stats
 * Get system statistics
 */
router.get('/stats', optionalAuth, async (req, res) => {
    try {
        const stats = await db.query(`
            SELECT 
                (SELECT COUNT(*) FROM namaste_codes) as total_namaste_codes,
                (SELECT COUNT(*) FROM namaste_codes WHERE system_type = 'ayurveda') as ayurveda_codes,
                (SELECT COUNT(*) FROM namaste_codes WHERE system_type = 'siddha') as siddha_codes,
                (SELECT COUNT(*) FROM namaste_codes WHERE system_type = 'unani') as unani_codes,
                (SELECT COUNT(*) FROM icd11_codes) as total_icd11_codes,
                (SELECT COUNT(*) FROM concept_mappings) as total_mappings,
                (SELECT COUNT(DISTINCT namaste_code_id) FROM concept_mappings) as mapped_codes,
                (SELECT AVG(confidence_score) FROM concept_mappings) as avg_confidence
        `);

        const row = stats.rows[0];

        res.json({
            namaste: {
                total: parseInt(row.total_namaste_codes),
                ayurveda: parseInt(row.ayurveda_codes),
                siddha: parseInt(row.siddha_codes),
                unani: parseInt(row.unani_codes)
            },
            icd11: {
                total: parseInt(row.total_icd11_codes)
            },
            mappings: {
                total: parseInt(row.total_mappings),
                unique_codes: parseInt(row.mapped_codes),
                average_confidence: parseFloat(row.avg_confidence || 0).toFixed(2)
            }
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
 * GET /api/mappings
 * Get all concept mappings with pagination
 */
router.get('/mappings', optionalAuth, async (req, res) => {
    try {
        const { system, page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT 
                nc.code as namaste_code,
                nc.display as namaste_display,
                nc.system_type,
                ic.icd_code,
                ic.title as icd_title,
                ic.module,
                cm.confidence_score,
                cm.mapping_type
            FROM concept_mappings cm
            JOIN namaste_codes nc ON cm.namaste_code_id = nc.id
            JOIN icd11_codes ic ON cm.icd11_code_id = ic.id
        `;

        const params = [];

        if (system && ['ayurveda', 'siddha', 'unani'].includes(system)) {
            query += ` WHERE nc.system_type = $1`;
            params.push(system);
        }

        query += ` ORDER BY nc.display LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const result = await db.query(query, params);

        // Get total count
        let countQuery = `SELECT COUNT(*) FROM concept_mappings cm JOIN namaste_codes nc ON cm.namaste_code_id = nc.id`;
        if (system) {
            countQuery += ` WHERE nc.system_type = $1`;
        }
        const countResult = await db.query(countQuery, system ? [system] : []);
        const total = parseInt(countResult.rows[0].count);

        res.json({
            mappings: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Mappings error:', error);
        res.status(500).json({
            error: 'Failed to fetch mappings',
            message: error.message
        });
    }
});

/**
 * GET /api/patients/search
 * Search for patients (mock implementation)
 */
router.get('/patients/search', optionalAuth, async (req, res) => {
    try {
        const { query } = req.query;

        if (!query || query.length < 2) {
            return res.json({ patients: [] });
        }

        const result = await db.query(`
            SELECT 
                id,
                abha_id,
                name,
                date_of_birth,
                gender,
                contact_phone
            FROM patients
            WHERE 
                LOWER(name) LIKE $1
                OR LOWER(abha_id) LIKE $1
            ORDER BY name
            LIMIT 10
        `, [`%${query.toLowerCase()}%`]);

        res.json({ patients: result.rows });

    } catch (error) {
        console.error('Patient search error:', error);
        res.status(500).json({
            error: 'Search failed',
            message: error.message
        });
    }
});

/**
 * GET /api/audit/recent
 * Get recent audit log entries
 */
router.get('/audit/recent', optionalAuth, async (req, res) => {
    try {
        const { limit = 10, userId } = req.query;

        let query = `
            SELECT 
                al.*,
                d.name as user_name
            FROM audit_logs al
            LEFT JOIN doctors d ON al.user_id = d.id
        `;

        const params = [];

        if (userId) {
            query += ` WHERE al.user_id = $1`;
            params.push(userId);
        }

        query += ` ORDER BY al.timestamp DESC LIMIT $${params.length + 1}`;
        params.push(limit);

        const result = await db.query(query, params);

        res.json({
            activities: result.rows.map(row => ({
                id: row.id,
                action: row.action,
                resource_type: row.resource_type,
                resource_id: row.resource_id,
                user_name: row.user_name || 'System',
                timestamp: row.timestamp,
                ip_address: row.ip_address,
                details: row.details
            }))
        });

    } catch (error) {
        console.error('Audit log error:', error);
        res.status(500).json({
            error: 'Failed to fetch audit logs',
            message: error.message
        });
    }
});

/**
 * GET /api/audit/export
 * Export audit logs as JSON (for PDF generation on frontend)
 */
router.get('/audit/export', optionalAuth, async (req, res) => {
    try {
        const { startDate, endDate, userId, action } = req.query;

        let query = `
            SELECT 
                al.*,
                d.name as user_name,
                d.abha_id as user_abha
            FROM audit_logs al
            LEFT JOIN doctors d ON al.user_id = d.id
            WHERE 1=1
        `;

        const params = [];

        if (startDate) {
            params.push(startDate);
            query += ` AND al.timestamp >= $${params.length}`;
        }

        if (endDate) {
            params.push(endDate);
            query += ` AND al.timestamp <= $${params.length}`;
        }

        if (userId) {
            params.push(userId);
            query += ` AND al.user_id = $${params.length}`;
        }

        if (action) {
            params.push(action);
            query += ` AND al.action = $${params.length}`;
        }

        query += ` ORDER BY al.timestamp DESC LIMIT 1000`;

        const result = await db.query(query, params);

        res.json({
            logs: result.rows,
            metadata: {
                generated_at: new Date().toISOString(),
                total_records: result.rows.length,
                filters: { startDate, endDate, userId, action }
            }
        });

    } catch (error) {
        console.error('Audit export error:', error);
        res.status(500).json({
            error: 'Failed to export audit logs',
            message: error.message
        });
    }
});

export default router;
