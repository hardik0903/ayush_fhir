/**
 * Analytics API endpoints
 * Provides aggregated data for dashboard visualizations
 */

import express from 'express';
import db from '../database/db.js';

const router = express.Router();

/**
 * GET /api/analytics/heatmap
 * Get mapping heatmap data (NAMASTE x ICD-11 usage frequency)
 */
router.get('/heatmap', async (req, res) => {
    try {
        const { limit = 20 } = req.query;

        const result = await db.query(`
            SELECT 
                nc.code as namaste_code,
                nc.display as namaste_display,
                ic.icd_code,
                ic.title as icd_title,
                COUNT(pt.id) as usage_count,
                AVG(cm.confidence_score) as avg_confidence
            FROM patient_treatments pt
            JOIN namaste_codes nc ON pt.namaste_code_id = nc.id
            JOIN icd11_codes ic ON pt.icd11_code_id = ic.id
            LEFT JOIN concept_mappings cm ON cm.namaste_code_id = nc.id AND cm.icd11_code_id = ic.id
            GROUP BY nc.code, nc.display, ic.icd_code, ic.title
            ORDER BY usage_count DESC
            LIMIT $1
        `, [limit]);

        res.json({
            heatmap: result.rows,
            total: result.rows.length
        });
    } catch (error) {
        console.error('Heatmap error:', error);
        res.status(500).json({ error: 'Failed to generate heatmap data' });
    }
});

/**
 * GET /api/analytics/trends
 * Get mapping usage trends over time
 */
router.get('/trends', async (req, res) => {
    try {
        const { days = 30, groupBy = 'day' } = req.query;

        let dateFormat;
        switch (groupBy) {
            case 'hour':
                dateFormat = 'YYYY-MM-DD HH24:00:00';
                break;
            case 'week':
                dateFormat = 'IYYY-IW';
                break;
            case 'month':
                dateFormat = 'YYYY-MM';
                break;
            default:
                dateFormat = 'YYYY-MM-DD';
        }

        const result = await db.query(`
            SELECT 
                TO_CHAR(encounter_date, $1) as period,
                COUNT(*) as total_treatments,
                COUNT(DISTINCT patient_id) as unique_patients,
                COUNT(DISTINCT doctor_id) as active_doctors,
                AVG(CASE WHEN consent_given THEN 1 ELSE 0 END) * 100 as consent_rate
            FROM patient_treatments
            WHERE encounter_date >= NOW() - INTERVAL '1 day' * $2
            GROUP BY period
            ORDER BY period ASC
        `, [dateFormat, days]);

        res.json({
            trends: result.rows,
            period: groupBy,
            days: parseInt(days)
        });
    } catch (error) {
        console.error('Trends error:', error);
        res.status(500).json({ error: 'Failed to generate trend data' });
    }
});

/**
 * GET /api/analytics/distribution
 * Get system distribution (Ayurveda, Siddha, Unani usage)
 */
router.get('/distribution', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT 
                nc.system_type,
                COUNT(pt.id) as treatment_count,
                COUNT(DISTINCT pt.patient_id) as patient_count,
                COUNT(DISTINCT nc.id) as unique_codes_used,
                AVG(cm.confidence_score) * 100 as avg_confidence
            FROM patient_treatments pt
            JOIN namaste_codes nc ON pt.namaste_code_id = nc.id
            LEFT JOIN concept_mappings cm ON cm.namaste_code_id = nc.id
            GROUP BY nc.system_type
            ORDER BY treatment_count DESC
        `);

        res.json({
            distribution: result.rows
        });
    } catch (error) {
        console.error('Distribution error:', error);
        res.status(500).json({ error: 'Failed to generate distribution data' });
    }
});

/**
 * GET /api/analytics/top-codes
 * Get most frequently used codes
 */
router.get('/top-codes', async (req, res) => {
    try {
        const { limit = 10, type = 'namaste' } = req.query;

        let query;
        if (type === 'namaste') {
            query = `
                SELECT 
                    nc.code,
                    nc.display,
                    nc.system_type,
                    COUNT(pt.id) as usage_count,
                    COUNT(DISTINCT pt.patient_id) as patient_count
                FROM patient_treatments pt
                JOIN namaste_codes nc ON pt.namaste_code_id = nc.id
                GROUP BY nc.id, nc.code, nc.display, nc.system_type
                ORDER BY usage_count DESC
                LIMIT $1
            `;
        } else {
            query = `
                SELECT 
                    ic.icd_code as code,
                    ic.title as display,
                    ic.module as system_type,
                    COUNT(pt.id) as usage_count,
                    COUNT(DISTINCT pt.patient_id) as patient_count
                FROM patient_treatments pt
                JOIN icd11_codes ic ON pt.icd11_code_id = ic.id
                GROUP BY ic.id, ic.icd_code, ic.title, ic.module
                ORDER BY usage_count DESC
                LIMIT $1
            `;
        }

        const result = await db.query(query, [limit]);

        res.json({
            topCodes: result.rows,
            type,
            limit: parseInt(limit)
        });
    } catch (error) {
        console.error('Top codes error:', error);
        res.status(500).json({ error: 'Failed to get top codes' });
    }
});

/**
 * GET /api/analytics/mapping-quality
 * Get mapping quality metrics
 */
router.get('/mapping-quality', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT 
                COUNT(*) as total_mappings,
                AVG(confidence_score) * 100 as avg_confidence,
                MIN(confidence_score) * 100 as min_confidence,
                MAX(confidence_score) * 100 as max_confidence,
                COUNT(CASE WHEN confidence_score >= 0.9 THEN 1 END) as high_confidence_count,
                COUNT(CASE WHEN confidence_score >= 0.7 AND confidence_score < 0.9 THEN 1 END) as medium_confidence_count,
                COUNT(CASE WHEN confidence_score < 0.7 THEN 1 END) as low_confidence_count
            FROM concept_mappings
        `);

        const qualityData = result.rows[0];
        const total = parseInt(qualityData.total_mappings) || 0;

        res.json({
            quality: {
                total: total,
                verified: total, // All mappings are considered verified for now
                verificationRate: total > 0 ? "100.00" : "0.00",
                avgConfidence: parseFloat(qualityData.avg_confidence || 0).toFixed(2),
                minConfidence: parseFloat(qualityData.min_confidence || 0).toFixed(2),
                maxConfidence: parseFloat(qualityData.max_confidence || 0).toFixed(2),
                distribution: {
                    high: parseInt(qualityData.high_confidence_count) || 0,
                    medium: parseInt(qualityData.medium_confidence_count) || 0,
                    low: parseInt(qualityData.low_confidence_count) || 0
                }
            }
        });
    } catch (error) {
        console.error('Mapping quality error:', error);
        res.status(500).json({ error: 'Failed to get mapping quality metrics' });
    }
});

/**
 * GET /api/analytics/practitioner-performance
 * Get practitioner performance metrics
 */
router.get('/practitioner-performance', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT 
                d.id,
                d.name,
                d.specialization,
                COUNT(pt.id) as total_treatments,
                COUNT(DISTINCT pt.patient_id) as unique_patients,
                AVG(cm.confidence_score) * 100 as avg_mapping_confidence,
                COUNT(CASE WHEN pt.consent_given THEN 1 END)::FLOAT / COUNT(*)::FLOAT * 100 as consent_rate
            FROM doctors d
            LEFT JOIN patient_treatments pt ON d.id = pt.doctor_id
            LEFT JOIN concept_mappings cm ON pt.namaste_code_id = cm.namaste_code_id AND pt.icd11_code_id = cm.icd11_code_id
            GROUP BY d.id, d.name, d.specialization
            HAVING COUNT(pt.id) > 0
            ORDER BY total_treatments DESC
        `);

        res.json({
            practitioners: result.rows.map(row => ({
                ...row,
                avg_mapping_confidence: parseFloat(row.avg_mapping_confidence || 0).toFixed(2),
                consent_rate: parseFloat(row.consent_rate || 0).toFixed(2)
            }))
        });
    } catch (error) {
        console.error('Practitioner performance error:', error);
        res.status(500).json({ error: 'Failed to get practitioner performance' });
    }
});

export default router;
