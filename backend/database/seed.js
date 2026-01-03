import bcrypt from 'bcrypt';
import db from './db.js';

/**
 * Seed database with sample data
 */
async function seedDatabase() {
    try {
        console.log('🌱 Seeding database with sample data...');

        // Create sample hospital
        const hospitalResult = await db.query(`
      INSERT INTO hospitals (name, registration_number, city, state, contact_email)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (registration_number) DO NOTHING
      RETURNING id
    `, ['AYUSH Medical Center', 'HOSP001', 'Mumbai', 'Maharashtra', 'contact@ayushmed.in']);

        const hospitalId = hospitalResult.rows[0]?.id;
        console.log('✅ Created sample hospital');

        // Create sample doctor (Dr. Shruti)
        const passwordHash = await bcrypt.hash('demo123', 10);
        const doctorResult = await db.query(`
      INSERT INTO doctors (abha_id, name, license_number, specialization, hospital_id, email, password_hash)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (abha_id) DO NOTHING
      RETURNING id
    `, ['ABHA-DR-001', 'Dr. Shruti Sharma', 'LIC-AY-12345', 'Ayurveda', hospitalId, 'shruti@ayushmed.in', passwordHash]);

        const doctorId = doctorResult.rows[0]?.id;
        console.log('✅ Created sample doctor (Dr. Shruti)');
        console.log('   Login: ABHA-DR-001 / demo123');

        // Create sample patient (Kabir)
        const patientResult = await db.query(`
      INSERT INTO patients (abha_id, name, date_of_birth, gender, contact_phone)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (abha_id) DO NOTHING
      RETURNING id
    `, ['ABHA-PT-001', 'Kabir Kumar', '1990-05-15', 'male', '+91-9876543210']);

        const patientId = patientResult.rows[0]?.id;
        console.log('✅ Created sample patient (Kabir)');

        // Create sample NAMASTE codes
        const namasteCodes = [
            { code: 'AY-001', display: 'Jwara', system: 'ayurveda', definition: 'Fever - elevated body temperature' },
            { code: 'AY-002', display: 'Kasa', system: 'ayurveda', definition: 'Cough - respiratory symptom' },
            { code: 'AY-003', display: 'Shwasa', system: 'ayurveda', definition: 'Dyspnea - difficulty breathing' },
            { code: 'AY-004', display: 'Atisara', system: 'ayurveda', definition: 'Diarrhea - loose stools' },
            { code: 'AY-005', display: 'Arsha', system: 'ayurveda', definition: 'Hemorrhoids - piles' },
            { code: 'SI-001', display: 'Suram', system: 'siddha', definition: 'Fever in Siddha medicine' },
            { code: 'SI-002', display: 'Irumal', system: 'siddha', definition: 'Cough in Siddha medicine' },
            { code: 'UN-001', display: 'Humma', system: 'unani', definition: 'Fever in Unani medicine' },
            { code: 'UN-002', display: 'Sual', system: 'unani', definition: 'Cough in Unani medicine' },
        ];

        for (const code of namasteCodes) {
            await db.query(`
        INSERT INTO namaste_codes (code, display, system_type, definition)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (code) DO NOTHING
      `, [code.code, code.display, code.system, code.definition]);
        }
        console.log(`✅ Created ${namasteCodes.length} sample NAMASTE codes`);

        // Create sample ICD-11 codes
        const icd11Codes = [
            { code: 'MG26', title: 'Fever', module: 'biomedicine', definition: 'Elevated body temperature' },
            { code: 'MD12', title: 'Cough', module: 'biomedicine', definition: 'Respiratory symptom' },
            { code: 'MD11', title: 'Dyspnoea', module: 'biomedicine', definition: 'Difficulty breathing' },
            { code: 'DD70', title: 'Diarrhoea', module: 'biomedicine', definition: 'Loose or watery stools' },
            { code: 'DB35', title: 'Haemorrhoids', module: 'biomedicine', definition: 'Swollen veins in rectum' },
            { code: 'TM2-001', title: 'Traditional Medicine Fever Pattern', module: 'TM2', definition: 'TM2 fever classification' },
        ];

        for (const code of icd11Codes) {
            await db.query(`
        INSERT INTO icd11_codes (icd_code, title, module, definition)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (icd_code) DO NOTHING
      `, [code.code, code.title, code.module, code.definition]);
        }
        console.log(`✅ Created ${icd11Codes.length} sample ICD-11 codes`);

        // Create sample mappings
        const mappings = [
            { namaste: 'AY-001', icd11: 'MG26', confidence: 0.95 }, // Jwara -> Fever
            { namaste: 'AY-002', icd11: 'MD12', confidence: 0.92 }, // Kasa -> Cough
            { namaste: 'AY-003', icd11: 'MD11', confidence: 0.90 }, // Shwasa -> Dyspnoea
            { namaste: 'AY-004', icd11: 'DD70', confidence: 0.93 }, // Atisara -> Diarrhoea
            { namaste: 'AY-005', icd11: 'DB35', confidence: 0.94 }, // Arsha -> Haemorrhoids
            { namaste: 'SI-001', icd11: 'MG26', confidence: 0.95 }, // Suram -> Fever
            { namaste: 'SI-002', icd11: 'MD12', confidence: 0.92 }, // Irumal -> Cough
            { namaste: 'UN-001', icd11: 'MG26', confidence: 0.95 }, // Humma -> Fever
            { namaste: 'UN-002', icd11: 'MD12', confidence: 0.92 }, // Sual -> Cough
        ];

        for (const mapping of mappings) {
            await db.query(`
        INSERT INTO concept_mappings (namaste_code_id, icd11_code_id, confidence_score)
        SELECT n.id, i.id, $3
        FROM namaste_codes n, icd11_codes i
        WHERE n.code = $1 AND i.icd_code = $2
        ON CONFLICT (namaste_code_id, icd11_code_id) DO NOTHING
      `, [mapping.namaste, mapping.icd11, mapping.confidence]);
        }
        console.log(`✅ Created ${mappings.length} sample concept mappings`);

        console.log('\n🎉 Database seeding completed successfully!');
        console.log('\n📝 Sample credentials:');
        console.log('   Doctor ABHA ID: ABHA-DR-001');
        console.log('   Password: demo123');
        console.log('   Patient ABHA ID: ABHA-PT-001');

        process.exit(0);
    } catch (error) {
        console.error('❌ Database seeding failed:', error);
        process.exit(1);
    }
}

seedDatabase();
