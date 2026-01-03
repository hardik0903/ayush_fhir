"""
Test Data Generator for Analytics Dashboard
Generates realistic treatment records with varied dates, doctors, patients, and mappings
"""

import psycopg2
import random
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

load_dotenv('../backend/.env')

# Database connection
def get_db_connection():
    return psycopg2.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        port=os.getenv('DB_PORT', '5432'),
        database=os.getenv('DB_NAME', 'ayush_fhir'),
        user=os.getenv('DB_USER', 'postgres'),
        password=os.getenv('DB_PASSWORD', 'postgres')
    )

# Sample data
FIRST_NAMES = [
    'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Arnav', 'Ayaan',
    'Krishna', 'Ishaan', 'Shaurya', 'Atharv', 'Advik', 'Pranav', 'Reyansh',
    'Aadhya', 'Ananya', 'Pari', 'Anika', 'Navya', 'Angel', 'Diya', 'Myra',
    'Sara', 'Jiya', 'Aaradhya', 'Anaya', 'Zara', 'Siya', 'Kavya'
]

LAST_NAMES = [
    'Sharma', 'Verma', 'Patel', 'Kumar', 'Singh', 'Reddy', 'Nair', 'Iyer',
    'Gupta', 'Joshi', 'Rao', 'Desai', 'Mehta', 'Shah', 'Pillai', 'Menon',
    'Agarwal', 'Bansal', 'Malhotra', 'Kapoor', 'Chopra', 'Bhatia'
]

DOCTOR_SPECIALIZATIONS = [
    'Ayurveda - General Physician',
    'Ayurveda - Panchakarma Specialist',
    'Siddha - General Physician',
    'Siddha - Varma Specialist',
    'Unani - General Physician',
    'Unani - Regimental Therapy'
]

CLINICAL_NOTES_TEMPLATES = [
    "Patient presents with {symptom}. Examination reveals {finding}. Prescribed {treatment} for {duration}.",
    "Chief complaint: {symptom}. Physical examination shows {finding}. Treatment plan: {treatment} for {duration}.",
    "Patient reports {symptom} since {onset}. Clinical assessment indicates {finding}. Recommended {treatment}.",
    "Consultation for {symptom}. Diagnosis: {finding}. Therapeutic intervention: {treatment} for {duration}.",
    "Follow-up visit. Patient shows improvement in {symptom}. Continue {treatment} for another {duration}."
]

SYMPTOMS = [
    'fever and body ache', 'digestive issues', 'chronic headache', 'joint pain',
    'respiratory problems', 'skin condition', 'anxiety and stress', 'insomnia',
    'fatigue and weakness', 'abdominal pain', 'back pain', 'allergic symptoms'
]

FINDINGS = [
    'elevated Vata dosha', 'Pitta imbalance', 'Kapha aggravation',
    'Tridosha vitiation', 'Ama accumulation', 'Agni mandya',
    'mild inflammation', 'constitutional imbalance', 'stress-related symptoms'
]

TREATMENTS = [
    'Triphala churna', 'Ashwagandha', 'Brahmi tablets', 'Panchakarma therapy',
    'Abhyanga massage', 'Shirodhara', 'Herbal decoction', 'Dietary modifications',
    'Yoga and pranayama', 'Ayurvedic formulation'
]

DURATIONS = ['7 days', '14 days', '21 days', '1 month', '2 months', '3 months']

ONSETS = ['2 days', '1 week', '2 weeks', '1 month', '3 months', '6 months']

def generate_clinical_note():
    """Generate realistic clinical note"""
    template = random.choice(CLINICAL_NOTES_TEMPLATES)
    return template.format(
        symptom=random.choice(SYMPTOMS),
        finding=random.choice(FINDINGS),
        treatment=random.choice(TREATMENTS),
        duration=random.choice(DURATIONS),
        onset=random.choice(ONSETS)
    )

def generate_test_data(num_records=200):
    """Generate test data for analytics"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    print(f"\n🚀 Generating {num_records} test treatment records...\n")
    
    # Get existing data
    cur.execute("SELECT id FROM hospitals LIMIT 1")
    hospital = cur.fetchone()
    if not hospital:
        print("❌ No hospital found. Please run seed.js first.")
        return
    hospital_id = hospital[0]
    
    # Get all NAMASTE codes
    cur.execute("SELECT id, code, system_type FROM namaste_codes")
    namaste_codes = cur.fetchall()
    print(f"✅ Found {len(namaste_codes)} NAMASTE codes")
    
    # Get all ICD-11 codes
    cur.execute("SELECT id, icd_code FROM icd11_codes")
    icd11_codes = cur.fetchall()
    print(f"✅ Found {len(icd11_codes)} ICD-11 codes")
    
    # Get or create doctors
    cur.execute("SELECT id, name, specialization FROM doctors")
    existing_doctors = cur.fetchall()
    
    if len(existing_doctors) < 5:
        print(f"\n📋 Creating additional doctors...")
        for i in range(10 - len(existing_doctors)):
            name = f"Dr. {random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"
            spec = random.choice(DOCTOR_SPECIALIZATIONS)
            abha_id = f"ABHA-DR-{random.randint(1000, 9999)}"
            license_num = f"LIC-{random.randint(10000, 99999)}"
            
            cur.execute("""
                INSERT INTO doctors (abha_id, name, specialization, license_number, hospital_id)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id
            """, (abha_id, name, spec, license_num, hospital_id))
            conn.commit()
        
        cur.execute("SELECT id, name, specialization FROM doctors")
        existing_doctors = cur.fetchall()
    
    doctors = existing_doctors
    print(f"✅ Using {len(doctors)} doctors")
    
    # Get or create patients
    cur.execute("SELECT id FROM patients")
    existing_patients = cur.fetchall()
    
    if len(existing_patients) < 50:
        print(f"\n👥 Creating patients...")
        for i in range(100 - len(existing_patients)):
            name = f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"
            age = random.randint(18, 75)
            gender = random.choice(['male', 'female', 'other'])
            abha_id = f"ABHA-PT-{random.randint(100000, 999999)}"
            dob = datetime.now() - timedelta(days=age*365)
            
            cur.execute("""
                INSERT INTO patients (abha_id, name, date_of_birth, gender, contact_phone)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id
            """, (abha_id, name, dob.date(), gender, f"+91{random.randint(7000000000, 9999999999)}"))
            conn.commit()
        
        cur.execute("SELECT id FROM patients")
        existing_patients = cur.fetchall()
    
    patients = existing_patients
    print(f"✅ Using {len(patients)} patients")
    
    # Generate treatment records
    print(f"\n💉 Generating {num_records} treatment records...")
    
    # Date range: last 90 days
    end_date = datetime.now()
    start_date = end_date - timedelta(days=90)
    
    created_count = 0
    
    for i in range(num_records):
        # Random date within range
        random_days = random.randint(0, 90)
        encounter_date = start_date + timedelta(days=random_days)
        
        # Random selections
        patient_id = random.choice(patients)[0]
        doctor_id = random.choice(doctors)[0]
        namaste_code = random.choice(namaste_codes)
        icd11_code = random.choice(icd11_codes)
        
        # Random consent (80% yes)
        consent_given = random.random() < 0.8
        consent_timestamp = encounter_date if consent_given else None
        
        # Clinical note
        clinical_notes = generate_clinical_note()
        
        try:
            cur.execute("""
                INSERT INTO patient_treatments (
                    patient_id, doctor_id, hospital_id,
                    namaste_code_id, icd11_code_id,
                    encounter_date, clinical_notes,
                    consent_given, consent_timestamp,
                    created_at, updated_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                patient_id, doctor_id, hospital_id,
                namaste_code[0], icd11_code[0],
                encounter_date, clinical_notes,
                consent_given, consent_timestamp,
                encounter_date, encounter_date
            ))
            
            created_count += 1
            
            if (i + 1) % 50 == 0:
                conn.commit()
                print(f"  ✓ Created {i + 1}/{num_records} records...")
        
        except Exception as e:
            print(f"  ⚠ Error creating record {i + 1}: {e}")
            conn.rollback()
    
    conn.commit()
    
    print(f"\n✅ Successfully created {created_count} treatment records!")
    
    # Show statistics
    print("\n📊 Database Statistics:")
    
    cur.execute("SELECT COUNT(*) FROM patient_treatments")
    total_treatments = cur.fetchone()[0]
    print(f"  Total Treatments: {total_treatments}")
    
    cur.execute("SELECT COUNT(DISTINCT patient_id) FROM patient_treatments")
    unique_patients = cur.fetchone()[0]
    print(f"  Unique Patients: {unique_patients}")
    
    cur.execute("SELECT COUNT(DISTINCT doctor_id) FROM patient_treatments")
    active_doctors = cur.fetchone()[0]
    print(f"  Active Doctors: {active_doctors}")
    
    cur.execute("""
        SELECT nc.system_type, COUNT(*) 
        FROM patient_treatments pt
        JOIN namaste_codes nc ON pt.namaste_code_id = nc.id
        GROUP BY nc.system_type
    """)
    system_dist = cur.fetchall()
    print("\n  System Distribution:")
    for system, count in system_dist:
        print(f"    {system}: {count} treatments")
    
    cur.execute("""
        SELECT 
            DATE_TRUNC('week', encounter_date) as week,
            COUNT(*) as count
        FROM patient_treatments
        WHERE encounter_date >= NOW() - INTERVAL '30 days'
        GROUP BY week
        ORDER BY week DESC
        LIMIT 5
    """)
    weekly_trends = cur.fetchall()
    print("\n  Recent Weekly Trends:")
    for week, count in weekly_trends:
        print(f"    Week of {week.strftime('%Y-%m-%d')}: {count} treatments")
    
    cur.close()
    conn.close()
    
    print("\n🎉 Test data generation complete!")
    print("\n💡 Now you can:")
    print("  1. Restart your backend server")
    print("  2. Visit http://localhost:5173/analytics")
    print("  3. See beautiful charts with real data!")

if __name__ == '__main__':
    import sys
    
    num_records = 200
    if len(sys.argv) > 1:
        try:
            num_records = int(sys.argv[1])
        except:
            print("Usage: python generate_test_data.py [number_of_records]")
            print("Example: python generate_test_data.py 500")
            sys.exit(1)
    
    generate_test_data(num_records)
