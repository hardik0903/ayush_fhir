import db from '../database/db.js';

/**
 * FHIR Service - Generate and validate FHIR resources
 */

/**
 * Generate FHIR CodeSystem for NAMASTE codes
 */
export async function generateNamasteCodeSystem(systemType = null) {
    const query = systemType
        ? 'SELECT * FROM namaste_codes WHERE system_type = $1 ORDER BY code'
        : 'SELECT * FROM namaste_codes ORDER BY code';

    const params = systemType ? [systemType] : [];
    const result = await db.query(query, params);

    const codeSystem = {
        resourceType: 'CodeSystem',
        id: systemType ? `namaste-${systemType}` : 'namaste',
        url: `http://ayush.gov.in/fhir/CodeSystem/namaste${systemType ? '-' + systemType : ''}`,
        version: '1.0.0',
        name: systemType ? `NAMASTE_${systemType.toUpperCase()}` : 'NAMASTE',
        title: systemType
            ? `NAMASTE ${systemType.charAt(0).toUpperCase() + systemType.slice(1)} Codes`
            : 'NAMASTE - National AYUSH Morbidity & Standardized Terminologies Electronic',
        status: 'active',
        experimental: false,
        date: new Date().toISOString(),
        publisher: 'Ministry of AYUSH, Government of India',
        description: systemType
            ? `NAMASTE codes for ${systemType} system`
            : 'Standardized terminology codes for Ayurveda, Siddha, and Unani systems of medicine',
        caseSensitive: true,
        content: 'complete',
        count: result.rows.length,
        concept: result.rows.map(row => ({
            code: row.code,
            display: row.display,
            definition: row.definition
        }))
    };

    return codeSystem;
}

/**
 * Generate FHIR CodeSystem for ICD-11 codes
 */
export async function generateICD11CodeSystem(module = null) {
    const query = module
        ? 'SELECT * FROM icd11_codes WHERE module = $1 ORDER BY icd_code'
        : 'SELECT * FROM icd11_codes ORDER BY icd_code';

    const params = module ? [module] : [];
    const result = await db.query(query, params);

    const codeSystem = {
        resourceType: 'CodeSystem',
        id: module ? `icd11-${module}` : 'icd11',
        url: `http://id.who.int/icd/release/11/2024-01${module ? '/' + module : ''}`,
        version: '2024-01',
        name: module ? `ICD11_${module.toUpperCase()}` : 'ICD11',
        title: module
            ? `ICD-11 ${module === 'TM2' ? 'Traditional Medicine Module 2' : 'Biomedicine'}`
            : 'ICD-11 - International Classification of Diseases 11th Revision',
        status: 'active',
        experimental: false,
        date: new Date().toISOString(),
        publisher: 'World Health Organization (WHO)',
        description: module
            ? `ICD-11 ${module} codes`
            : 'International Classification of Diseases 11th Revision',
        caseSensitive: true,
        content: 'complete',
        count: result.rows.length,
        concept: result.rows.map(row => ({
            code: row.icd_code,
            display: row.title,
            definition: row.definition
        }))
    };

    return codeSystem;
}

/**
 * Generate FHIR ConceptMap for NAMASTE to ICD-11 mappings
 */
export async function generateConceptMap(systemType = null) {
    const query = systemType
        ? `SELECT cm.*, nc.code as namaste_code, nc.display as namaste_display, nc.system_type,
              ic.icd_code, ic.title as icd_title, ic.module
       FROM concept_mappings cm
       JOIN namaste_codes nc ON cm.namaste_code_id = nc.id
       JOIN icd11_codes ic ON cm.icd11_code_id = ic.id
       WHERE nc.system_type = $1
       ORDER BY nc.code`
        : `SELECT cm.*, nc.code as namaste_code, nc.display as namaste_display, nc.system_type,
              ic.icd_code, ic.title as icd_title, ic.module
       FROM concept_mappings cm
       JOIN namaste_codes nc ON cm.namaste_code_id = nc.id
       JOIN icd11_codes ic ON cm.icd11_code_id = ic.id
       ORDER BY nc.code`;

    const params = systemType ? [systemType] : [];
    const result = await db.query(query, params);

    // Group by source code
    const groups = {};
    result.rows.forEach(row => {
        if (!groups[row.namaste_code]) {
            groups[row.namaste_code] = {
                code: row.namaste_code,
                display: row.namaste_display,
                target: []
            };
        }

        groups[row.namaste_code].target.push({
            code: row.icd_code,
            display: row.icd_title,
            equivalence: row.mapping_type || 'equivalent',
            comment: `Confidence: ${(parseFloat(row.confidence_score) * 100).toFixed(0)}%`
        });
    });

    const conceptMap = {
        resourceType: 'ConceptMap',
        id: systemType ? `namaste-icd11-${systemType}` : 'namaste-icd11',
        url: `http://ayush.gov.in/fhir/ConceptMap/namaste-icd11${systemType ? '-' + systemType : ''}`,
        version: '1.0.0',
        name: systemType ? `NAMASTE_ICD11_${systemType.toUpperCase()}` : 'NAMASTE_ICD11',
        title: systemType
            ? `NAMASTE ${systemType} to ICD-11 Concept Map`
            : 'NAMASTE to ICD-11 Concept Map',
        status: 'active',
        experimental: false,
        date: new Date().toISOString(),
        publisher: 'Ministry of AYUSH, Government of India',
        description: 'Mapping between NAMASTE codes and ICD-11 codes for interoperability',
        sourceUri: `http://ayush.gov.in/fhir/CodeSystem/namaste${systemType ? '-' + systemType : ''}`,
        targetUri: 'http://id.who.int/icd/release/11/2024-01',
        group: [{
            source: `http://ayush.gov.in/fhir/CodeSystem/namaste${systemType ? '-' + systemType : ''}`,
            target: 'http://id.who.int/icd/release/11/2024-01',
            element: Object.values(groups)
        }]
    };

    return conceptMap;
}

/**
 * Generate FHIR Condition resource (Problem List entry)
 */
export function generateConditionResource(treatment, patient, doctor) {
    return {
        resourceType: 'Condition',
        id: treatment.id,
        meta: {
            versionId: treatment.version.toString(),
            lastUpdated: treatment.updated_at
        },
        clinicalStatus: {
            coding: [{
                system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
                code: treatment.status,
                display: treatment.status.charAt(0).toUpperCase() + treatment.status.slice(1)
            }]
        },
        category: [{
            coding: [{
                system: 'http://terminology.hl7.org/CodeSystem/condition-category',
                code: 'problem-list-item',
                display: 'Problem List Item'
            }]
        }],
        code: {
            coding: [
                // NAMASTE code
                treatment.namaste_code && {
                    system: `http://ayush.gov.in/fhir/CodeSystem/namaste-${treatment.namaste_system}`,
                    code: treatment.namaste_code,
                    display: treatment.namaste_display
                },
                // ICD-11 code
                treatment.icd11_code && {
                    system: 'http://id.who.int/icd/release/11/2024-01',
                    code: treatment.icd11_code,
                    display: treatment.icd11_title
                }
            ].filter(Boolean),
            text: treatment.namaste_display || treatment.icd11_title
        },
        subject: {
            reference: `Patient/${patient.id}`,
            display: patient.name
        },
        encounter: {
            reference: `Encounter/${treatment.id}`
        },
        onsetDateTime: treatment.encounter_date,
        recordedDate: treatment.created_at,
        recorder: {
            reference: `Practitioner/${doctor.id}`,
            display: doctor.name
        },
        note: treatment.clinical_notes ? [{
            text: treatment.clinical_notes
        }] : undefined
    };
}

/**
 * Search codes with auto-complete
 * Handles diacritical marks in Sanskrit/regional language terms
 */
export async function searchCodes(filter, system = null, limit = 20) {
    let query;
    let params;

    if (system === 'namaste') {
        // Use unaccent for diacritical mark normalization
        // Also search in both display and code fields
        query = `
      SELECT code, display, system_type, definition
      FROM namaste_codes
      WHERE 
        LOWER(REPLACE(REPLACE(REPLACE(display, 'ā', 'a'), 'ī', 'i'), 'ū', 'u')) LIKE LOWER($1)
        OR LOWER(display) LIKE LOWER($1)
        OR LOWER(code) LIKE LOWER($1)
      ORDER BY 
        CASE WHEN LOWER(display) LIKE LOWER($2) THEN 0 ELSE 1 END,
        display
      LIMIT $3
    `;
        params = [`%${filter}%`, `${filter}%`, limit];
    } else if (system === 'icd11') {
        query = `
      SELECT icd_code as code, title as display, module, definition
      FROM icd11_codes
      WHERE title ILIKE $1 OR icd_code ILIKE $1
      ORDER BY 
        CASE WHEN title ILIKE $2 THEN 0 ELSE 1 END,
        title
      LIMIT $3
    `;
        params = [`%${filter}%`, `${filter}%`, limit];
    } else {
        // Search both systems
        const namasteQuery = `
      SELECT 'namaste' as system, code, display, system_type as type, definition
      FROM namaste_codes
      WHERE 
        LOWER(REPLACE(REPLACE(REPLACE(display, 'ā', 'a'), 'ī', 'i'), 'ū', 'u')) LIKE LOWER($1)
        OR LOWER(display) LIKE LOWER($1)
        OR LOWER(code) LIKE LOWER($1)
      LIMIT $2
    `;

        const icd11Query = `
      SELECT 'icd11' as system, icd_code as code, title as display, module as type, definition
      FROM icd11_codes
      WHERE title ILIKE $1 OR icd_code ILIKE $1
      LIMIT $2
    `;

        const [namasteResult, icd11Result] = await Promise.all([
            db.query(namasteQuery, [`%${filter}%`, Math.ceil(limit / 2)]),
            db.query(icd11Query, [`%${filter}%`, Math.ceil(limit / 2)])
        ]);

        return [...namasteResult.rows, ...icd11Result.rows];
    }

    const result = await db.query(query, params);
    return result.rows;
}

/**
 * Translate code between systems
 */
export async function translateCode(code, sourceSystem, targetSystem) {
    if (sourceSystem === 'namaste' && targetSystem === 'icd11') {
        const result = await db.query(`
      SELECT ic.icd_code, ic.title, ic.module, cm.confidence_score, cm.mapping_type
      FROM concept_mappings cm
      JOIN namaste_codes nc ON cm.namaste_code_id = nc.id
      JOIN icd11_codes ic ON cm.icd11_code_id = ic.id
      WHERE nc.code = $1
      ORDER BY cm.confidence_score DESC
    `, [code]);

        return result.rows;
    } else if (sourceSystem === 'icd11' && targetSystem === 'namaste') {
        const result = await db.query(`
      SELECT nc.code, nc.display, nc.system_type, cm.confidence_score, cm.mapping_type
      FROM concept_mappings cm
      JOIN namaste_codes nc ON cm.namaste_code_id = nc.id
      JOIN icd11_codes ic ON cm.icd11_code_id = ic.id
      WHERE ic.icd_code = $1
      ORDER BY cm.confidence_score DESC
    `, [code]);

        return result.rows;
    }

    return [];
}

export default {
    generateNamasteCodeSystem,
    generateICD11CodeSystem,
    generateConceptMap,
    generateConditionResource,
    searchCodes,
    translateCode
};
