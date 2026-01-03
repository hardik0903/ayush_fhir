import express from 'express';
import fhirService from '../services/fhirService.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /fhir/CodeSystem/namaste
 * Get NAMASTE CodeSystem resource
 */
router.get('/CodeSystem/namaste', optionalAuth, async (req, res) => {
    try {
        const { system } = req.query; // ayurveda, siddha, unani
        const codeSystem = await fhirService.generateNamasteCodeSystem(system);
        res.json(codeSystem);
    } catch (error) {
        console.error('Error generating NAMASTE CodeSystem:', error);
        res.status(500).json({
            resourceType: 'OperationOutcome',
            issue: [{
                severity: 'error',
                code: 'exception',
                diagnostics: 'Failed to generate NAMASTE CodeSystem'
            }]
        });
    }
});

/**
 * GET /fhir/CodeSystem/icd11
 * Get ICD-11 CodeSystem resource
 */
router.get('/CodeSystem/icd11', optionalAuth, async (req, res) => {
    try {
        const { module } = req.query; // TM2, biomedicine
        const codeSystem = await fhirService.generateICD11CodeSystem(module);
        res.json(codeSystem);
    } catch (error) {
        console.error('Error generating ICD-11 CodeSystem:', error);
        res.status(500).json({
            resourceType: 'OperationOutcome',
            issue: [{
                severity: 'error',
                code: 'exception',
                diagnostics: 'Failed to generate ICD-11 CodeSystem'
            }]
        });
    }
});

/**
 * GET /fhir/ConceptMap/namaste-icd11
 * Get ConceptMap resource for NAMASTE to ICD-11 mappings
 */
router.get('/ConceptMap/namaste-icd11', optionalAuth, async (req, res) => {
    try {
        const { system } = req.query; // ayurveda, siddha, unani
        const conceptMap = await fhirService.generateConceptMap(system);
        res.json(conceptMap);
    } catch (error) {
        console.error('Error generating ConceptMap:', error);
        res.status(500).json({
            resourceType: 'OperationOutcome',
            issue: [{
                severity: 'error',
                code: 'exception',
                diagnostics: 'Failed to generate ConceptMap'
            }]
        });
    }
});

/**
 * GET /fhir/ValueSet/$expand
 * Auto-complete search for codes (FHIR ValueSet $expand operation)
 */
router.get('/ValueSet/$expand', optionalAuth, async (req, res) => {
    try {
        const { filter, system, count = 20 } = req.query;

        if (!filter) {
            return res.status(400).json({
                resourceType: 'OperationOutcome',
                issue: [{
                    severity: 'error',
                    code: 'required',
                    diagnostics: 'Filter parameter is required'
                }]
            });
        }

        const results = await fhirService.searchCodes(filter, system, parseInt(count));

        // Format as FHIR ValueSet
        const valueSet = {
            resourceType: 'ValueSet',
            id: 'search-results',
            url: 'http://ayush.gov.in/fhir/ValueSet/search-results',
            status: 'active',
            expansion: {
                timestamp: new Date().toISOString(),
                total: results.length,
                contains: results.map(r => ({
                    system: r.system === 'namaste'
                        ? `http://ayush.gov.in/fhir/CodeSystem/namaste-${r.type || r.system_type}`
                        : 'http://id.who.int/icd/release/11/2024-01',
                    code: r.code,
                    display: r.display
                }))
            }
        };

        res.json(valueSet);
    } catch (error) {
        console.error('Error expanding ValueSet:', error);
        res.status(500).json({
            resourceType: 'OperationOutcome',
            issue: [{
                severity: 'error',
                code: 'exception',
                diagnostics: 'Failed to expand ValueSet'
            }]
        });
    }
});

/**
 * POST /fhir/ConceptMap/$translate
 * Translate code between NAMASTE and ICD-11 (FHIR ConceptMap $translate operation)
 */
router.post('/ConceptMap/$translate', optionalAuth, async (req, res) => {
    try {
        const { code, system, target } = req.body;

        if (!code || !system || !target) {
            return res.status(400).json({
                resourceType: 'OperationOutcome',
                issue: [{
                    severity: 'error',
                    code: 'required',
                    diagnostics: 'Code, system, and target parameters are required'
                }]
            });
        }

        const sourceSystem = system.includes('namaste') ? 'namaste' : 'icd11';
        const targetSystem = target.includes('namaste') ? 'namaste' : 'icd11';

        const translations = await fhirService.translateCode(code, sourceSystem, targetSystem);

        // Format as FHIR Parameters resource
        const parameters = {
            resourceType: 'Parameters',
            parameter: [
                {
                    name: 'result',
                    valueBoolean: translations.length > 0
                },
                ...translations.map(t => ({
                    name: 'match',
                    part: [
                        {
                            name: 'equivalence',
                            valueCode: t.mapping_type || 'equivalent'
                        },
                        {
                            name: 'concept',
                            valueCoding: {
                                system: targetSystem === 'namaste'
                                    ? `http://ayush.gov.in/fhir/CodeSystem/namaste-${t.system_type}`
                                    : 'http://id.who.int/icd/release/11/2024-01',
                                code: targetSystem === 'namaste' ? t.code : t.icd_code,
                                display: targetSystem === 'namaste' ? t.display : t.title
                            }
                        },
                        {
                            name: 'confidence',
                            valueDecimal: parseFloat(t.confidence_score)
                        }
                    ]
                }))
            ]
        };

        res.json(parameters);
    } catch (error) {
        console.error('Error translating code:', error);
        res.status(500).json({
            resourceType: 'OperationOutcome',
            issue: [{
                severity: 'error',
                code: 'exception',
                diagnostics: 'Failed to translate code'
            }]
        });
    }
});

/**
 * GET /fhir/CodeSystem/icd11/$lookup
 * ICD-11 code lookup (FHIR CodeSystem $lookup operation)
 */
router.get('/CodeSystem/icd11/$lookup', optionalAuth, async (req, res) => {
    try {
        const { code } = req.query;

        if (!code) {
            return res.status(400).json({
                resourceType: 'OperationOutcome',
                issue: [{
                    severity: 'error',
                    code: 'required',
                    diagnostics: 'Code parameter is required'
                }]
            });
        }

        const results = await fhirService.searchCodes(code, 'icd11', 1);

        if (results.length === 0) {
            return res.status(404).json({
                resourceType: 'OperationOutcome',
                issue: [{
                    severity: 'error',
                    code: 'not-found',
                    diagnostics: `Code ${code} not found in ICD-11`
                }]
            });
        }

        const result = results[0];

        // Format as FHIR Parameters resource
        const parameters = {
            resourceType: 'Parameters',
            parameter: [
                {
                    name: 'name',
                    valueString: 'ICD11'
                },
                {
                    name: 'display',
                    valueString: result.display
                },
                {
                    name: 'designation',
                    part: [
                        {
                            name: 'value',
                            valueString: result.display
                        }
                    ]
                }
            ]
        };

        if (result.definition) {
            parameters.parameter.push({
                name: 'definition',
                valueString: result.definition
            });
        }

        res.json(parameters);
    } catch (error) {
        console.error('Error looking up code:', error);
        res.status(500).json({
            resourceType: 'OperationOutcome',
            issue: [{
                severity: 'error',
                code: 'exception',
                diagnostics: 'Failed to lookup code'
            }]
        });
    }
});

export default router;
