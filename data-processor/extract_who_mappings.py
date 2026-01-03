"""
Extract WHO codes and create mappings from WHO PDFs
Based on proven approach from reference implementation
"""

import re
import unicodedata
import psycopg2
from psycopg2.extras import execute_values
import os
from dotenv import load_dotenv
import requests
import pdfplumber

# Load environment variables
load_dotenv('../backend/.env')

# Google Drive file IDs for WHO PDFs
WHO_PDF_FILES = {
    'ayurveda': '12Ee2I8oZosFgtzanPnAklSB0a3r9kVnS',
    'siddha': '1HedsKD5lSNF88RVjBg6jJjO5vEDlramu',
    'unani': '1-Wp73wy0pjevQ4goVT3E-vO7a2YFwCEm'
}

def super_normalize(text):
    """
    Aggressive normalization to match Sanskrit/regional terms
    1. Lowercase
    2. Decompose Unicode (split accents)
    3. Drop non-ASCII (accents)
    4. Remove ALL non-alphabet characters
    """
    if not text:
        return ""
    text = text.lower()
    # Normalize unicode
    text = unicodedata.normalize('NFKD', text)
    # Encode to ASCII bytes, ignoring errors (strips accents), then decode back
    text = text.encode('ASCII', 'ignore').decode('utf-8')
    # Remove everything except a-z
    text = re.sub(r'[^a-z]', '', text)
    return text

def sanskrit_stem(text):
    """
    Removes common Sanskrit case endings (Visarga 'h', Anusvara 'm')
    to match 'Vatavyadhih' with 'Vatavyadhi'
    """
    text = super_normalize(text)
    if text.endswith('h'):
        return text[:-1]
    if text.endswith('m'):
        return text[:-1]
    return text

def download_pdf_from_drive(file_id):
    """Download PDF from Google Drive"""
    url = f"https://drive.google.com/uc?export=download&id={file_id}"
    
    print(f"Downloading PDF {file_id}...")
    response = requests.get(url)
    
    if response.status_code == 200:
        temp_path = f"temp_{file_id}.pdf"
        with open(temp_path, 'wb') as f:
            f.write(response.content)
        return temp_path
    else:
        raise Exception(f"Failed to download PDF: {response.status_code}")

def extract_who_codes_ayurveda(pdf_path):
    """Extract WHO codes from Ayurveda PDF (ITA-xxx format)"""
    print(f"📖 Parsing Ayurveda PDF for WHO codes...")
    mapping = {}
    
    try:
        with pdfplumber.open(pdf_path) as pdf:
            # Pattern: Term followed by ITA-xxx code
            # Allows spaces/hyphens in the term part
            pattern = re.compile(r'([a-zA-Zāīūṛṝḷḹeaiomanḥśṣṭḍṅñ\s-]+)\s+(ITA-[\d\.]+)')
            
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    matches = pattern.findall(text)
                    for term, code in matches:
                        # Store multiple variations to maximize hits
                        norm = super_normalize(term)
                        stem = sanskrit_stem(term)
                        if norm:
                            mapping[norm] = code
                        if stem and stem != norm:
                            mapping[stem] = code
            
            print(f"   ✅ Extracted {len(mapping)} WHO code mappings from Ayurveda PDF")
    except Exception as e:
        print(f"   ❌ Failed to parse Ayurveda PDF: {e}")
    
    return mapping

def extract_who_codes_siddha(pdf_path):
    """Extract WHO codes from Siddha PDF (x.x.x format)"""
    print(f"📖 Parsing Siddha PDF for WHO codes...")
    mapping = {}
    
    try:
        with pdfplumber.open(pdf_path) as pdf:
            # Pattern: Multi-word terms before x.x.x code
            pattern = re.compile(r'([A-Za-z\s\u00C0-\u024F\u1E00-\u1EFF]+?)\s+(\d+\.\d+\.\d+)')
            
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    matches = pattern.findall(text)
                    for term, code in matches:
                        norm = super_normalize(term)
                        if norm:
                            mapping[norm] = f"WHO-SID-{code}"
            
            print(f"   ✅ Extracted {len(mapping)} WHO code mappings from Siddha PDF")
    except Exception as e:
        print(f"   ❌ Failed to parse Siddha PDF: {e}")
    
    return mapping

def extract_who_terms_unani(pdf_path):
    """Extract WHO terms from Unani PDF"""
    print(f"📖 Parsing Unani PDF for WHO terms...")
    mapping = {}
    
    try:
        with pdfplumber.open(pdf_path) as pdf:
            # Unani PDF format: Capitalized Terms followed by newline and English definition
            pattern = re.compile(r'([A-Z][a-z\u00C0-\u024F\u1E00-\u1EFF\s\-\'\']+)\n\s*([A-Za-z\s]+)')
            
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    matches = pattern.findall(text)
                    for term, english_def in matches:
                        norm = super_normalize(term)
                        clean_def = english_def.strip()
                        if norm and clean_def:
                            mapping[norm] = clean_def
            
            print(f"   ✅ Extracted {len(mapping)} WHO term mappings from Unani PDF")
    except Exception as e:
        print(f"   ❌ Failed to parse Unani PDF: {e}")
    
    return mapping

def connect_db():
    """Connect to PostgreSQL database"""
    return psycopg2.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        port=os.getenv('DB_PORT', '5432'),
        database=os.getenv('DB_NAME', 'ayush_fhir'),
        user=os.getenv('DB_USER', 'postgres'),
        password=os.getenv('DB_PASSWORD', 'postgres')
    )

def create_mappings_from_who(conn, who_mappings, system_type):
    """Create concept mappings using WHO codes"""
    print(f"\n🔗 Creating mappings for {system_type.upper()}...")
    
    cursor = conn.cursor()
    
    # Get NAMASTE codes for this system
    cursor.execute(
        "SELECT id, code, display FROM namaste_codes WHERE system_type = %s",
        (system_type,)
    )
    namaste_codes = cursor.fetchall()
    
    mappings_created = 0
    
    for namaste_id, namaste_code, namaste_display in namaste_codes:
        # Try different normalization strategies
        key = super_normalize(namaste_display)
        stem = sanskrit_stem(namaste_display)
        first_word = super_normalize(namaste_display.split()[0]) if ' ' in namaste_display else None
        
        # Try to find WHO code
        who_code = who_mappings.get(key) or who_mappings.get(stem)
        if not who_code and first_word:
            who_code = who_mappings.get(first_word)
        
        if who_code:
            # Check if we have this ICD-11 code in database, if not create it
            cursor.execute(
                "SELECT id FROM icd11_codes WHERE icd_code = %s",
                (who_code,)
            )
            result = cursor.fetchone()
            
            if not result:
                # Create new ICD-11 code entry
                cursor.execute(
                    """
                    INSERT INTO icd11_codes (icd_code, title, module)
                    VALUES (%s, %s, %s)
                    RETURNING id
                    """,
                    (who_code, namaste_display, 'TM2')
                )
                icd11_id = cursor.fetchone()[0]
            else:
                icd11_id = result[0]
            
            # Create mapping
            cursor.execute(
                """
                INSERT INTO concept_mappings (namaste_code_id, icd11_code_id, mapping_type, confidence_score)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (namaste_code_id, icd11_code_id) DO NOTHING
                """,
                (namaste_id, icd11_id, 'equivalent', 0.95)
            )
            
            if cursor.rowcount > 0:
                mappings_created += 1
    
    conn.commit()
    cursor.close()
    
    print(f"   ✅ Created {mappings_created} mappings for {system_type}")
    return mappings_created

def main():
    """Main execution function"""
    print("=" * 60)
    print("WHO PDF Mapping Extractor")
    print("=" * 60)
    
    conn = connect_db()
    total_mappings = 0
    
    # Process Ayurveda
    try:
        print(f"\n📚 Processing AYURVEDA...")
        pdf_path = download_pdf_from_drive(WHO_PDF_FILES['ayurveda'])
        who_map = extract_who_codes_ayurveda(pdf_path)
        
        if who_map:
            total_mappings += create_mappings_from_who(conn, who_map, 'ayurveda')
        
        if os.path.exists(pdf_path):
            os.remove(pdf_path)
    except Exception as e:
        print(f"❌ Error processing Ayurveda: {e}")
    
    # Process Siddha
    try:
        print(f"\n📚 Processing SIDDHA...")
        pdf_path = download_pdf_from_drive(WHO_PDF_FILES['siddha'])
        who_map = extract_who_codes_siddha(pdf_path)
        
        if who_map:
            total_mappings += create_mappings_from_who(conn, who_map, 'siddha')
        
        if os.path.exists(pdf_path):
            os.remove(pdf_path)
    except Exception as e:
        print(f"❌ Error processing Siddha: {e}")
    
    # Process Unani
    try:
        print(f"\n📚 Processing UNANI...")
        pdf_path = download_pdf_from_drive(WHO_PDF_FILES['unani'])
        who_map = extract_who_terms_unani(pdf_path)
        
        if who_map:
            # For Unani, we'll create generic WHO codes
            total_mappings += create_mappings_from_who(conn, who_map, 'unani')
        
        if os.path.exists(pdf_path):
            os.remove(pdf_path)
    except Exception as e:
        print(f"❌ Error processing Unani: {e}")
    
    conn.close()
    
    print("\n" + "=" * 60)
    print(f"🎉 TOTAL MAPPINGS CREATED: {total_mappings}")
    print("=" * 60)

if __name__ == "__main__":
    main()
