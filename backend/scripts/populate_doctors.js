/**
 * Script to populate the database with 100+ doctor records
 * Each doctor will have:
 * - Unique ABHA ID (format: ABHA-XXXX-YYYY-ZZZZ)
 * - Name (generated)
 * - Specialization
 * - Password (hashed)
 */

import pkg from 'pg';
const { Pool } = pkg;
import bcrypt from 'bcryptjs';

// Database configuration
const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'ayush_fhir',
    user: 'postgres',
    password: 'hardik999'
});

// Medical specializations for variety
const specializations = [
    'Ayurveda',
    'Yoga & Naturopathy',
    'Unani',
    'Siddha',
    'Homeopathy',
    'General Medicine',
    'Cardiology',
    'Dermatology',
    'Pediatrics',
    'Orthopedics',
    'Gynecology',
    'Psychiatry',
    'Ophthalmology',
    'ENT',
    'Neurology'
];

// Indian first names
const firstNames = [
    'Rajesh', 'Priya', 'Amit', 'Sneha', 'Vikram', 'Anjali', 'Arjun', 'Kavya',
    'Rahul', 'Neha', 'Karan', 'Pooja', 'Sanjay', 'Divya', 'Aditya', 'Riya',
    'Rohan', 'Shreya', 'Nikhil', 'Ananya', 'Varun', 'Ishita', 'Manish', 'Sakshi',
    'Akash', 'Meera', 'Suresh', 'Nisha', 'Deepak', 'Swati', 'Gaurav', 'Preeti',
    'Harsh', 'Tanvi', 'Vishal', 'Simran', 'Ashok', 'Aarti', 'Ramesh', 'Sunita',
    'Manoj', 'Rekha', 'Naveen', 'Geeta', 'Pankaj', 'Shweta', 'Sandeep', 'Madhuri',
    'Ajay', 'Pallavi', 'Ravi', 'Sonal', 'Yogesh', 'Nidhi', 'Prakash', 'Jyoti',
    'Anil', 'Smita', 'Sunil', 'Vandana', 'Mahesh', 'Usha', 'Dinesh', 'Kiran',
    'Vijay', 'Lata', 'Rajiv', 'Manju', 'Ashish', 'Seema', 'Satish', 'Rani',
    'Praveen', 'Sushma', 'Mohan', 'Veena', 'Naresh', 'Sudha', 'Vinod', 'Asha'
];

// Indian last names
const lastNames = [
    'Sharma', 'Verma', 'Kumar', 'Singh', 'Patel', 'Reddy', 'Nair', 'Iyer',
    'Gupta', 'Agarwal', 'Joshi', 'Desai', 'Rao', 'Menon', 'Pillai', 'Mehta',
    'Shah', 'Kapoor', 'Malhotra', 'Chopra', 'Bhatia', 'Sethi', 'Khanna', 'Arora',
    'Bansal', 'Jain', 'Saxena', 'Sinha', 'Mishra', 'Pandey', 'Tiwari', 'Dubey',
    'Kulkarni', 'Deshpande', 'Patil', 'Pawar', 'Jadhav', 'Shinde', 'Bhosale', 'Gaikwad',
    'Naidu', 'Raju', 'Krishna', 'Prasad', 'Murthy', 'Shetty', 'Hegde', 'Kamath',
    'Das', 'Ghosh', 'Chatterjee', 'Mukherjee', 'Banerjee', 'Roy', 'Bose', 'Sen'
];

// Generate ABHA ID in format: ABHA-XXXX-YYYY-ZZZZ
function generateAbhaId(index) {
    const part1 = String(1000 + Math.floor(index / 100)).padStart(4, '0');
    const part2 = String(1000 + (index % 100) * 10).padStart(4, '0');
    const part3 = String(1000 + Math.floor(Math.random() * 9000)).padStart(4, '0');
    return `ABHA-${part1}-${part2}-${part3}`;
}

// Generate random name
function generateName() {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    return `Dr. ${firstName} ${lastName}`;
}

// Generate random specialization
function getSpecialization() {
    return specializations[Math.floor(Math.random() * specializations.length)];
}

// Generate license number in format: MED-STATE-XXXXX
function generateLicenseNumber(index) {
    const states = ['MH', 'DL', 'KA', 'TN', 'UP', 'GJ', 'RJ', 'WB'];
    const state = states[Math.floor(Math.random() * states.length)];
    const number = String(10000 + index).padStart(5, '0');
    return `MED-${state}-${number}`;
}

// Main function to populate doctors
async function populateDoctors() {
    const client = await pool.connect();

    try {
        console.log('🏥 Starting doctor population script...\n');

        // Check current doctor count
        const countResult = await client.query('SELECT COUNT(*) FROM doctors');
        const currentCount = parseInt(countResult.rows[0].count);
        console.log(`📊 Current doctors in database: ${currentCount}\n`);

        // Default password for all doctors (should be changed on first login in production)
        const defaultPassword = 'Doctor@123';
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);

        console.log('🔐 Default password for all doctors: Doctor@123');
        console.log('   (Users should change this on first login)\n');

        // Generate 100 doctors
        const doctorsToCreate = 100;
        let successCount = 0;
        let skipCount = 0;

        console.log(`📝 Generating ${doctorsToCreate} doctor records...\n`);

        for (let i = 0; i < doctorsToCreate; i++) {
            const abhaId = generateAbhaId(i);
            const name = generateName();
            const specialization = getSpecialization();
            const licenseNumber = generateLicenseNumber(i);

            try {
                // Check if ABHA ID already exists
                const existingDoctor = await client.query(
                    'SELECT id FROM doctors WHERE abha_id = $1',
                    [abhaId]
                );

                if (existingDoctor.rows.length > 0) {
                    skipCount++;
                    continue;
                }

                // Insert doctor
                await client.query(
                    `INSERT INTO doctors (abha_id, name, specialization, license_number, password_hash, created_at)
                     VALUES ($1, $2, $3, $4, $5, NOW())`,
                    [abhaId, name, specialization, licenseNumber, hashedPassword]
                );

                successCount++;

                // Progress indicator
                if ((i + 1) % 20 === 0) {
                    console.log(`✅ Progress: ${i + 1}/${doctorsToCreate} doctors processed`);
                }

            } catch (err) {
                console.error(`❌ Error creating doctor ${i + 1}:`, err.message);
            }
        }

        // Final count
        const finalCountResult = await client.query('SELECT COUNT(*) FROM doctors');
        const finalCount = parseInt(finalCountResult.rows[0].count);

        console.log('\n' + '='.repeat(60));
        console.log('📊 POPULATION SUMMARY');
        console.log('='.repeat(60));
        console.log(`✅ Successfully created: ${successCount} doctors`);
        console.log(`⏭️  Skipped (duplicates): ${skipCount} doctors`);
        console.log(`📈 Total doctors in database: ${finalCount}`);
        console.log('='.repeat(60));

        // Show sample doctors
        console.log('\n📋 Sample doctor records:');
        const sampleDoctors = await client.query(
            'SELECT abha_id, name, specialization FROM doctors ORDER BY created_at DESC LIMIT 5'
        );

        sampleDoctors.rows.forEach((doc, idx) => {
            console.log(`\n${idx + 1}. ${doc.name}`);
            console.log(`   ABHA ID: ${doc.abha_id}`);
            console.log(`   Specialization: ${doc.specialization}`);
            console.log(`   Password: Doctor@123`);
        });

        console.log('\n✅ Doctor population completed successfully!\n');

    } catch (error) {
        console.error('❌ Error populating doctors:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run the script
populateDoctors()
    .then(() => {
        console.log('🎉 Script execution completed!');
        process.exit(0);
    })
    .catch((err) => {
        console.error('💥 Script failed:', err);
        process.exit(1);
    });
