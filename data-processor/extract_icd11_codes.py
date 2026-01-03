"""
Extract ICD-11 codes from WHO terminology PDFs
Parses WHO PDFs to find ICD-11 code mappings
"""

import pdfplumber
import psycopg2
from psycopg2.extras import execute_values
import os
from dotenv import load_dotenv
import requests
import re

# Load environment variables
load_dotenv('../backend/.env')

# Google Drive file IDs for WHO PDFs
WHO_PDF_FILES = {
    'ayurveda': '12Ee2I8oZosFgtzanPnAklSB0a3r9kVnS',
    'siddha': '1HedsKD5lSNF88RVjBg6jJjO5vEDlramu',
    'unani': '1-Wp73wy0pjevQ4goVT3E-vO7a2YFwCEm'
}

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

def extract_icd11_codes_from_pdf(pdf_path, system_type):
    """Extract ICD-11 codes from WHO PDF"""
    print(f"Extracting ICD-11 codes from {system_type} PDF...")
    
    icd11_codes = []
    
    try:
        with pdfplumber.open(pdf_path) as pdf:
            print(f"Total pages: {len(pdf.pages)}")
            
            for page_num, page in enumerate(pdf.pages):
                text = page.extract_text()
                
                if not text:
                    continue
                
                # Look for ICD-11 code patterns
                # Common patterns: MG26, DD70, DB35, etc. (2 letters + 2-3 digits)
                icd_pattern = r'\b([A-Z]{2}\d{2,3}(?:\.\d+)?)\b'
                
                lines = text.split('\n')
                
                for i, line in enumerate(lines):
                    # Find ICD codes in the line
                    matches = re.findall(icd_pattern, line)
                    
                    for code in matches:
                        # Try to find the title/description nearby
                        # Usually the title is on the same line or nearby lines
                        title = line.replace(code, '').strip()
                        
                        # Clean up the title
                        title = re.sub(r'^\W+|\W+$', '', title)
                        title = re.sub(r'\s+', ' ', title)
                        
                        if title and len(title) > 3 and len(title) < 200:
                            # Determine module based on code prefix or context
                            module = 'TM2' if 'traditional' in line.lower() or 'ayurved' in line.lower() else 'Biomedicine'
                            
                            icd11_codes.append({
                                'code': code,
                                'title': title,
                                'module': module,
                                'system_type': system_type
                            })
        
        # Remove duplicates based on code
        unique_codes = {}
        for item in icd11_codes:
            if item['code'] not in unique_codes:
                unique_codes[item['code']] = item
        
        result = list(unique_codes.values())
        print(f"Extracted {len(result)} unique ICD-11 codes from {system_type}")
        
        return result
        
    except Exception as e:
        print(f"Error extracting ICD-11 codes: {e}")
        import traceback
        traceback.print_exc()
        return []

def connect_db():
    """Connect to PostgreSQL database"""
    return psycopg2.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        port=os.getenv('DB_PORT', '5432'),
        database=os.getenv('DB_NAME', 'ayush_fhir'),
        user=os.getenv('DB_USER', 'postgres'),
        password=os.getenv('DB_PASSWORD', 'postgres')
    )

def insert_icd11_codes(conn, codes):
    """Insert ICD-11 codes into database"""
    if not codes:
        print("No ICD-11 codes to insert")
        return 0
    
    cursor = conn.cursor()
    
    # Prepare data for insertion
    values = [
        (c['code'], c['title'], c['module'])
        for c in codes
    ]
    
    # Insert new codes (avoid duplicates)
    insert_query = """
        INSERT INTO icd11_codes (icd_code, title, module)
        VALUES %s
        ON CONFLICT (icd_code) DO UPDATE SET
            title = EXCLUDED.title,
            module = EXCLUDED.module
    """
    
    execute_values(cursor, insert_query, values)
    conn.commit()
    
    inserted_count = cursor.rowcount
    print(f"Inserted/Updated {inserted_count} ICD-11 codes")
    
    cursor.close()
    return inserted_count

def main():
    """Main execution function"""
    print("=" * 60)
    print("ICD-11 Code Extractor from WHO PDFs")
    print("=" * 60)
    
    all_codes = []
    
    # Process each system
    for system_type, file_id in WHO_PDF_FILES.items():
        try:
            print(f"\nProcessing {system_type.upper()} WHO PDF...")
            
            # Download PDF
            pdf_path = download_pdf_from_drive(file_id)
            
            # Extract ICD-11 codes
            codes = extract_icd11_codes_from_pdf(pdf_path, system_type)
            
            if codes:
                all_codes.extend(codes)
            
            # Clean up temp file
            if os.path.exists(pdf_path):
                os.remove(pdf_path)
            
        except Exception as e:
            print(f"Error processing {system_type}: {e}")
            import traceback
            traceback.print_exc()
    
    # Insert all codes into database
    if all_codes:
        conn = connect_db()
        insert_icd11_codes(conn, all_codes)
        conn.close()
    
    print("\n" + "=" * 60)
    print(f"TOTAL ICD-11 CODES EXTRACTED: {len(all_codes)}")
    print("=" * 60)
    
    # Print summary by system
    from collections import Counter
    system_counts = Counter(c['system_type'] for c in all_codes)
    for system, count in system_counts.items():
        print(f"  {system.capitalize()}: {count} codes")

if __name__ == "__main__":
    main()
