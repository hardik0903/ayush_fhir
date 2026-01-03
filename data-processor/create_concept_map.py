"""
Create concept mappings between NAMASTE and ICD-11 codes
Uses manual rules and basic string matching
"""

import psycopg2
from psycopg2.extras import execute_values
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('../backend/.env')

# Manual mapping rules (NAMASTE term -> ICD-11 code)
MANUAL_MAPPINGS = {
    'jwara': 'MG26',  # Fever
    'jvara': 'MG26',
    'suram': 'MG26',
    'humma': 'MG26',
    'fever': 'MG26',
    'kasa': 'MD12',  # Cough
    'irumal': 'MD12',
    'sual': 'MD12',
    'cough': 'MD12',
    'shwasa': 'MD11',  # Dyspnoea
    'swasa': 'MD11',
    'dyspnoea': 'MD11',
    'atisara': 'DD70',  # Diarrhoea
    'diarrhoea': 'DD70',
    'diarrhea': 'DD70',
    'arsha': 'DB35',  # Haemorrhoids
    'arsh': 'DB35',
    'hemorrhoids': 'DB35',
    'haemorrhoids': 'DB35',
}

def connect_db():
    """Connect to PostgreSQL database"""
    return psycopg2.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        port=os.getenv('DB_PORT', '5432'),
        database=os.getenv('DB_NAME', 'ayush_fhir'),
        user=os.getenv('DB_USER', 'postgres'),
        password=os.getenv('DB_PASSWORD', 'hardik999')
    )

def get_namaste_codes(conn):
    """Fetch all NAMASTE codes from database"""
    cursor = conn.cursor()
    cursor.execute("SELECT id, code, display, system_type FROM namaste_codes ORDER BY code")
    codes = cursor.fetchall()
    cursor.close()
    return [{'id': c[0], 'code': c[1], 'display': c[2], 'system_type': c[3]} for c in codes]

def get_icd11_codes(conn):
    """Fetch all ICD-11 codes from database"""
    cursor = conn.cursor()
    cursor.execute("SELECT id, icd_code, title, module FROM icd11_codes ORDER BY icd_code")
    codes = cursor.fetchall()
    cursor.close()
    return [{'id': c[0], 'code': c[1], 'title': c[2], 'module': c[3]} for c in codes]

def find_mapping_by_rule(namaste_display):
    """Find ICD-11 code using manual rules"""
    display_lower = namaste_display.lower().strip()
    
    for term, icd_code in MANUAL_MAPPINGS.items():
        if term in display_lower:
            return icd_code, 0.95  # High confidence for manual mappings
    
    return None, 0.0

def find_mapping_by_keywords(namaste_display, icd11_codes):
    """Find ICD-11 code using keyword matching"""
    display_lower = namaste_display.lower().strip()
    
    # Try to find keywords in ICD-11 titles
    best_match = None
    best_score = 0.0
    
    for icd11 in icd11_codes:
        title_lower = icd11['title'].lower()
        
        # Check for exact word matches
        namaste_words = set(display_lower.split())
        icd11_words = set(title_lower.split())
        
        # Calculate overlap
        common_words = namaste_words & icd11_words
        if common_words:
            # Score based on proportion of matching words
            score = len(common_words) / max(len(namaste_words), len(icd11_words))
            
            if score > best_score:
                best_score = score
                best_match = icd11['code']
    
    if best_score > 0.3:  # Threshold for keyword matching
        return best_match, float(best_score)
    
    return None, 0.0

def create_mappings(conn, namaste_codes, icd11_codes):
    """Create concept mappings"""
    print("Creating concept mappings...")
    
    mappings = []
    
    for namaste in namaste_codes:
        # Try manual rule first
        icd_code, confidence = find_mapping_by_rule(namaste['display'])
        
        # If no manual rule, try keyword matching
        if not icd_code:
            icd_code, confidence = find_mapping_by_keywords(namaste['display'], icd11_codes)
        
        if icd_code:
            # Find ICD-11 ID
            icd11_match = next((c for c in icd11_codes if c['code'] == icd_code), None)
            
            if icd11_match:
                mappings.append({
                    'namaste_id': namaste['id'],
                    'icd11_id': icd11_match['id'],
                    'confidence': confidence,
                    'namaste_display': namaste['display'],
                    'icd11_title': icd11_match['title']
                })
                print(f"  {namaste['display']} -> {icd11_match['title']} ({confidence:.2f})")
    
    return mappings

def insert_mappings(conn, mappings):
    """Insert concept mappings into database"""
    if not mappings:
        print("No mappings to insert")
        return 0
    
    cursor = conn.cursor()
    
    # Clear existing mappings
    cursor.execute("DELETE FROM concept_mappings")
    print("Cleared existing mappings")
    
    # Prepare data for insertion
    values = [
        (m['namaste_id'], m['icd11_id'], 'equivalent', m['confidence'])
        for m in mappings
    ]
    
    # Insert new mappings
    insert_query = """
        INSERT INTO concept_mappings (namaste_code_id, icd11_code_id, mapping_type, confidence_score)
        VALUES %s
        ON CONFLICT (namaste_code_id, icd11_code_id) DO UPDATE SET
            confidence_score = EXCLUDED.confidence_score
    """
    
    execute_values(cursor, insert_query, values)
    conn.commit()
    
    inserted_count = cursor.rowcount
    print(f"\nInserted {inserted_count} concept mappings")
    
    cursor.close()
    return inserted_count

def main():
    """Main execution function"""
    print("=" * 60)
    print("Concept Mapping Generator")
    print("=" * 60)
    
    # Connect to database
    conn = connect_db()
    
    # Fetch codes
    print("\nFetching NAMASTE codes...")
    namaste_codes = get_namaste_codes(conn)
    print(f"Found {len(namaste_codes)} NAMASTE codes")
    
    print("\nFetching ICD-11 codes...")
    icd11_codes = get_icd11_codes(conn)
    print(f"Found {len(icd11_codes)} ICD-11 codes")
    
    # Create mappings
    print("\nGenerating mappings...")
    mappings = create_mappings(conn, namaste_codes, icd11_codes)
    
    # Insert mappings
    insert_mappings(conn, mappings)
    
    conn.close()
    
    print("\n" + "=" * 60)
    print(f"TOTAL MAPPINGS CREATED: {len(mappings)}")
    print("=" * 60)
    
    # Print statistics
    if mappings:
        avg_confidence = sum(m['confidence'] for m in mappings) / len(mappings)
        print(f"Average confidence: {avg_confidence:.2%}")
        
        high_conf = sum(1 for m in mappings if m['confidence'] >= 0.8)
        print(f"High confidence (≥80%): {high_conf} ({high_conf/len(mappings):.1%})")

if __name__ == "__main__":
    main()
