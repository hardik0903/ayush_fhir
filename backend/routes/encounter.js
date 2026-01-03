import express from 'express';
import db from '../database/db.js';
import fhirService from '../services/fhirService.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /fhir/Condition
 * Create new condition (problem list entry) with dual coding
 */
router.post('/Condition', authenticate, async (req, res) => {
    try {
        const { patientId, namasteCode, icd11Code, clinicalNotes, consentGiven } = req.body;

        if (!patientId || !namasteCode) {
            return res.status(400).json({
                resourceType: 'OperationOutcome',
                issue: [{
                    severity: 'error',
                    code: 'required',
                    diagnostics: 'Patient ID and NAMASTE code are required'
                }]
            });
        }

        // Get NAMASTE code details
        const namasteResult = await db.query(
            'SELECT * FROM namaste_codes WHERE code = $1',
            [namasteCode]
        );

        if (namasteResult.rows.length === 0) {
            return res.status(404).json({
                resourceType: 'OperationOutcome',
                issue: [{
                    severity: 'error',
                    code: 'not-found',
                    diagnostics: `NAMASTE code ${namasteCode} not found`
                }]
            });
        }

        const namaste = namasteResult.rows[0];
        let icd11Id = null;

        // Get ICD-11 code if provided
        if (icd11Code) {
            const icd11Result = await db.query(
                'SELECT * FROM icd11_codes WHERE icd_code = $1',
                [icd11Code]
            );

            if (icd11Result.rows.length > 0) {
                icd11Id = icd11Result.rows[0].id;
            }
        }

        // Create treatment record
        const treatmentResult = await db.query(`
      INSERT INTO patient_treatments 
        (patient_id, doctor_id, hospital_id, namaste_code_id, icd11_code_id, clinical_notes, consent_given, consent_timestamp)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
            patientId,
            req.user.id,
            req.user.hospital_id,
            namaste.id,
            icd11Id,
            clinicalNotes,
            consentGiven || false,
            consentGiven ? new Date() : null
        ]);

        const treatment = treatmentResult.rows[0];

        // Record consent if given
        if (consentGiven) {
            await db.query(`
        INSERT INTO consent_records (patient_id, doctor_id, purpose, scope, granted_at)
        VALUES ($1, $2, $3, $4, $5)
      `, [
                patientId,
                req.user.id,
                'Treatment record creation',
                JSON.stringify({ treatment_id: treatment.id }),
                new Date()
            ]);
        }

        // Get patient details for FHIR resource
        const patientResult = await db.query('SELECT * FROM patients WHERE id = $1', [patientId]);
        const patient = patientResult.rows[0];

        // Generate FHIR Condition resource
        const enrichedTreatment = {
            ...treatment,
            namaste_code: namaste.code,
            namaste_display: namaste.display,
            namaste_system: namaste.system_type
        };

        if (icd11Id) {
            const icd11Result = await db.query('SELECT * FROM icd11_codes WHERE id = $1', [icd11Id]);
            const icd11 = icd11Result.rows[0];
            enrichedTreatment.icd11_code = icd11.icd_code;
            enrichedTreatment.icd11_title = icd11.title;
        }

        const condition = fhirService.generateConditionResource(enrichedTreatment, patient, req.user);

        res.status(201).json(condition);

    } catch (error) {
        console.error('Error creating condition:', error);
        res.status(500).json({
            resourceType: 'OperationOutcome',
            issue: [{
                severity: 'error',
                code: 'exception',
                diagnostics: 'Failed to create condition'
            }]
        });
    }
});

/**
 * GET /fhir/Condition
 * Get patient problem list
 */
router.get('/Condition', authenticate, async (req, res) => {
    try {
        const { patient, status } = req.query;

        if (!patient) {
            return res.status(400).json({
                resourceType: 'OperationOutcome',
                issue: [{
                    severity: 'error',
                    code: 'required',
                    diagnostics: 'Patient parameter is required'
                }]
            });
        }

        let query = `
      SELECT pt.*, 
             nc.code as namaste_code, nc.display as namaste_display, nc.system_type as namaste_system,
             ic.icd_code, ic.title as icd11_title,
             p.name as patient_name, p.abha_id as patient_abha,
             d.name as doctor_name
      FROM patient_treatments pt
      JOIN patients p ON pt.patient_id = p.id
      JOIN doctors d ON pt.doctor_id = d.id
      LEFT JOIN namaste_codes nc ON pt.namaste_code_id = nc.id
      LEFT JOIN icd11_codes ic ON pt.icd11_code_id = ic.id
      WHERE pt.patient_id = $1
    `;

        const params = [patient];

        if (status) {
            query += ' AND pt.status = $2';
            params.push(status);
        }

        query += ' ORDER BY pt.encounter_date DESC';

        const result = await db.query(query, params);

        // Generate FHIR Bundle
        const bundle = {
            resourceType: 'Bundle',
            type: 'searchset',
            total: result.rows.length,
            entry: result.rows.map(row => {
                const patient = {
                    id: row.patient_id,
                    name: row.patient_name,
                    abha_id: row.patient_abha
                };

                const doctor = {
                    id: row.doctor_id,
                    name: row.doctor_name
                };

                return {
                    fullUrl: `http://ayush.gov.in/fhir/Condition/${row.id}`,
                    resource: fhirService.generateConditionResource(row, patient, doctor)
                };
            })
        };

        res.json(bundle);

    } catch (error) {
        console.error('Error fetching conditions:', error);
        res.status(500).json({
            resourceType: 'OperationOutcome',
            issue: [{
                severity: 'error',
                code: 'exception',
                diagnostics: 'Failed to fetch conditions'
            }]
        });
    }
});

/**
 * POST /fhir/Bundle
 * Upload FHIR Bundle with dual-coded diagnoses
 */
router.post('/Bundle', authenticate, async (req, res) => {
    try {
        const bundle = req.body;

        if (!bundle || bundle.resourceType !== 'Bundle') {
            return res.status(400).json({
                resourceType: 'OperationOutcome',
                issue: [{
                    severity: 'error',
                    code: 'invalid',
                    diagnostics: 'Invalid FHIR Bundle'
                }]
            });
        }

        const results = [];

        // Process each entry in the bundle
        for (const entry of bundle.entry || []) {
            const resource = entry.resource;

            if (resource.resourceType === 'Condition') {
                // Extract codes
                const namasteCode = resource.code.coding.find(c => c.system.includes('namaste'));
                const icd11Code = resource.code.coding.find(c => c.system.includes('icd'));

                if (!namasteCode) {
                    results.push({
                        status: 'error',
                        message: 'NAMASTE code is required'
                    });
                    continue;
                }

                // Extract patient ID
                const patientId = resource.subject.reference.split('/')[1];

                // Create condition
                const conditionData = {
                    patientId,
                    namasteCode: namasteCode.code,
                    icd11Code: icd11Code?.code,
                    clinicalNotes: resource.note?.[0]?.text,
                    consentGiven: true
                };

                // Use the POST /Condition logic
                const namasteResult = await db.query('SELECT * FROM namaste_codes WHERE code = $1', [conditionData.namasteCode]);

                if (namasteResult.rows.length === 0) {
                    results.push({
                        status: 'error',
                        message: `NAMASTE code ${conditionData.namasteCode} not found`
                    });
                    continue;
                }

                const namaste = namasteResult.rows[0];
                let icd11Id = null;

                if (conditionData.icd11Code) {
                    const icd11Result = await db.query('SELECT * FROM icd11_codes WHERE icd_code = $1', [conditionData.icd11Code]);
                    if (icd11Result.rows.length > 0) {
                        icd11Id = icd11Result.rows[0].id;
                    }
                }

                const treatmentResult = await db.query(`
          INSERT INTO patient_treatments 
            (patient_id, doctor_id, hospital_id, namaste_code_id, icd11_code_id, clinical_notes, consent_given, consent_timestamp)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *
        `, [
                    patientId,
                    req.user.id,
                    req.user.hospital_id,
                    namaste.id,
                    icd11Id,
                    conditionData.clinicalNotes,
                    true,
                    new Date()
                ]);

                results.push({
                    status: 'success',
                    id: treatmentResult.rows[0].id
                });
            }
        }

        res.json({
            resourceType: 'Bundle',
            type: 'transaction-response',
            entry: results.map(r => ({
                response: {
                    status: r.status === 'success' ? '201 Created' : '400 Bad Request',
                    location: r.id ? `Condition/${r.id}` : undefined,
                    outcome: r.message ? {
                        resourceType: 'OperationOutcome',
                        issue: [{
                            severity: 'error',
                            diagnostics: r.message
                        }]
                    } : undefined
                }
            }))
        });

    } catch (error) {
        console.error('Error processing bundle:', error);
        res.status(500).json({
            resourceType: 'OperationOutcome',
            issue: [{
                severity: 'error',
                code: 'exception',
                diagnostics: 'Failed to process bundle'
            }]
        });
    }
});

export default router;
