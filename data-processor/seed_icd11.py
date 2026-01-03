"""
Enhanced seed data with more ICD-11 codes for better mapping
"""

import psycopg2
from psycopg2.extras import execute_values
import os
from dotenv import load_dotenv

load_dotenv('../backend/.env')

# Comprehensive ICD-11 codes covering common traditional medicine conditions
ICD11_CODES = [
    # Existing codes
    ('MG26', 'Fever', 'biomedicine'),
    ('MD12', 'Cough', 'biomedicine'),
    ('MD11', 'Dyspnoea', 'biomedicine'),
    ('DD70', 'Diarrhoea', 'biomedicine'),
    ('DB35', 'Haemorrhoids', 'biomedicine'),
    ('QA02', 'Traditional medicine conditions, TM2 pattern', 'TM2'),
    
    # Additional common conditions
    ('ME24', 'Headache', 'biomedicine'),
    ('MD80', 'Asthma', 'biomedicine'),
    ('DA90', 'Abdominal pain', 'biomedicine'),
    ('DD91', 'Constipation', 'biomedicine'),
    ('DD92', 'Gastritis', 'biomedicine'),
    ('FA01', 'Skin diseases', 'biomedicine'),
    ('8A80', 'Diabetes mellitus', 'biomedicine'),
    ('BA00', 'Hypertension', 'biomedicine'),
    ('ME84', 'Dizziness', 'biomedicine'),
    ('MG22', 'Fatigue', 'biomedicine'),
    ('MD90', 'Rhinitis', 'biomedicine'),
    ('DA91', 'Nausea', 'biomedicine'),
    ('DA92', 'Vomiting', 'biomedicine'),
    ('ME80', 'Insomnia', 'biomedicine'),
    ('MG30', 'Weakness', 'biomedicine'),
    ('FA10', 'Eczema', 'biomedicine'),
    ('FA20', 'Psoriasis', 'biomedicine'),
    ('ME50', 'Anxiety', 'biomedicine'),
    ('6A70', 'Depression', 'biomedicine'),
    ('DA80', 'Indigestion', 'biomedicine'),
    ('MD82', 'Bronchitis', 'biomedicine'),
    ('ME81', 'Vertigo', 'biomedicine'),
    ('MG24', 'Chills', 'biomedicine'),
    ('DA93', 'Bloating', 'biomedicine'),
    
    # TM2 patterns
    ('QA02.0', 'Vata imbalance pattern', 'TM2'),
    ('QA02.1', 'Pitta imbalance pattern', 'TM2'),
    ('QA02.2', 'Kapha imbalance pattern', 'TM2'),
    ('QA02.3', 'Tridosha imbalance pattern', 'TM2'),
    ('QA02.4', 'Ama accumulation pattern', 'TM2'),
    ('QA02.5', 'Agni dysfunction pattern', 'TM2'),
]

def connect_db():
    """Connect to PostgreSQL database"""
    return psycopg2.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        port=os.getenv('DB_PORT', '5432'),
        database=os.getenv('DB_NAME', 'ayush_fhir'),
        user=os.getenv('DB_USER', 'postgres'),
        password=os.getenv('DB_PASSWORD', 'postgres')
    )

def seed_icd11_codes():
    """Seed ICD-11 codes into database"""
    print("Seeding ICD-11 codes...")
    
    conn = connect_db()
    cursor = conn.cursor()
    
    # Clear existing codes
    cursor.execute("DELETE FROM icd11_codes")
    print("Cleared existing ICD-11 codes")
    
    # Insert new codes
    insert_query = """
        INSERT INTO icd11_codes (icd_code, title, module)
        VALUES %s
    """
    
    execute_values(cursor, insert_query, ICD11_CODES)
    conn.commit()
    
    print(f"Inserted {len(ICD11_CODES)} ICD-11 codes")
    
    cursor.close()
    conn.close()

if __name__ == "__main__":
    seed_icd11_codes()
    print("✅ ICD-11 seed data complete!")
