"""
Simpler Test Data Generator - Creates test data directly via SQL
"""

import psycopg2
import random
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

load_dotenv('../backend/.env')

def get_db_connection():
    return psycopg2.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        port=os.getenv('DB_PORT', '5432'),
        database=os.getenv('DB_NAME', 'ayush_fhir'),
        user=os.getenv('DB_USER', 'postgres'),
        password=os.getenv('DB_PASSWORD', 'postgres')
    )

def generate_test_data(num_records=200):
    conn = get_db_connection()
    cur = conn.cursor()
    
    print(f"\n🚀 Generating {num_records} test treatment records...\n")
    
    # Get IDs
    cur.execute("SELECT id FROM hospitals LIMIT 1")
    hospital_id = cur.fetchone()[0]
    
    cur.execute("SELECT id FROM doctors")
    doctor_ids = [row[0] for row in cur.fetchall()]
    
    cur.execute("SELECT id FROM patients")
    patient_ids = [row[0] for row in cur.fetchall()]
    
    cur.execute("SELECT id, code FROM namaste_codes")
    namaste_codes = cur.fetchall()
    
    cur.execute("SELECT id, icd_code FROM icd11_codes")
    icd11_codes = cur.fetchall()
    
    print(f"✅ Found {len(doctor_ids)} doctors")
    print(f"✅ Found {len(patient_ids)} patients")
    print(f"✅ Found {len(namaste_codes)} NAMASTE codes")
    print(f"✅ Found {len(icd11_codes)} ICD-11 codes\n")
    
    # Generate records
    end_date = datetime.now()
    start_date = end_date - timedelta(days=90)
    
    created = 0
    for i in range(num_records):
        random_days = random.randint(0, 90)
        encounter_date = start_date + timedelta(days=random_days)
        
        patient_id = random.choice(patient_ids)
        doctor_id = random.choice(doctor_ids)
        namaste_id = random.choice(namaste_codes)[0]
        icd11_id = random.choice(icd11_codes)[0]
        
        consent_given = random.random() < 0.8
        consent_doc = f"CONSENT-{random.randint(100000, 999999)}"
        
        clinical_notes = f"Patient consultation on {encounter_date.strftime('%Y-%m-%d')}. Treatment prescribed."
        
        try:
            # Use simple INSERT without specifying all columns
            cur.execute("""
                INSERT INTO patient_treatments 
                (patient_id, doctor_id, hospital_id, namaste_code_id, icd11_code_id, 
                 encounter_date, clinical_notes, consent_given, consent_document_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (patient_id, doctor_id, hospital_id, namaste_id, icd11_id,
                  encounter_date, clinical_notes, consent_given, consent_doc))
            
            created += 1
            if (i + 1) % 50 == 0:
                conn.commit()
                print(f"  ✓ Created {i + 1}/{num_records} records...")
        except Exception as e:
            print(f"  ⚠ Error at record {i + 1}: {str(e)[:100]}")
            conn.rollback()
            break
    
    conn.commit()
    print(f"\n✅ Successfully created {created} treatment records!")
    
    # Stats
    cur.execute("SELECT COUNT(*) FROM patient_treatments")
    print(f"\n📊 Total treatments in database: {cur.fetchone()[0]}")
    
    cur.close()
    conn.close()
    
    print("\n🎉 Done! Visit http://localhost:5173/analytics to see the data!")

if __name__ == '__main__':
    generate_test_data(200)
