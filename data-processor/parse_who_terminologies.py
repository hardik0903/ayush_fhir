"""
Parse WHO standardized terminology PDFs and extract terms
Downloads PDFs from Google Drive and extracts terminology
"""

import PyPDF2
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
        # Save temporarily
        temp_path = f"temp_{file_id}.pdf"
        with open(temp_path, 'wb') as f:
            f.write(response.content)
        return temp_path
    else:
        raise Exception(f"Failed to download PDF: {response.status_code}")

def extract_terms_from_pdf(pdf_path, system_type):
    """Extract terminology from WHO PDF"""
    print(f"Extracting terms from {system_type} PDF...")
    
    terms = []
    
    try:
        with pdfplumber.open(pdf_path) as pdf:
            print(f"Total pages: {len(pdf.pages)}")
            
            for page_num, page in enumerate(pdf.pages):
                text = page.extract_text()
                
                if not text:
                    continue
                
                # Split into lines
                lines = text.split('\n')
                
                for line in lines:
                    line = line.strip()
                    
                    # Skip empty lines, headers, page numbers
                    if not line or len(line) < 3:
                        continue
                    
                    if re.match(r'^\d+$', line):  # Page numbers
                        continue
                    
                    if 'WHO' in line.upper() or 'WORLD HEALTH' in line.upper():
                        continue
                    
                    # Look for terminology patterns
                    # Pattern 1: Term followed by description
                    if re.search(r'^[A-Z][a-z]+', line):
                        # Extract term (usually first part before dash or colon)
                        term_match = re.match(r'^([^-:]+)', line)
                        if term_match:
                            term = term_match.group(1).strip()
                            description = line[len(term):].strip(' -:')
                            
                            if len(term) > 2 and len(term) < 100:
                                terms.append({
                                    'term': term,
                                    'description': description if description else term,
                                    'system_type': system_type
                                })
        
        # Remove duplicates
        unique_terms = []
        seen = set()
        for term in terms:
            if term['term'].lower() not in seen:
                seen.add(term['term'].lower())
                unique_terms.append(term)
        
        print(f"Extracted {len(unique_terms)} unique terms from {system_type}")
        return unique_terms
        
    except Exception as e:
        print(f"Error extracting from PDF: {e}")
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

def insert_who_terms(conn, terms):
    """Insert WHO terminology into database"""
    if not terms:
        print("No terms to insert")
        return 0
    
    cursor = conn.cursor()
    
    # Clear existing terms for this system
    system_type = terms[0]['system_type']
    cursor.execute("DELETE FROM who_terminologies WHERE system_type = %s", (system_type,))
    print(f"Cleared existing {system_type} WHO terms")
    
    # Prepare data for insertion (without embeddings for now)
    values = [
        (t['term'], t['system_type'], t['description'], None)  # NULL for embedding_vector
        for t in terms
    ]
    
    # Insert new terms
    insert_query = """
        INSERT INTO who_terminologies (term, system_type, description, embedding_vector)
        VALUES %s
    """
    
    execute_values(cursor, insert_query, values)
    conn.commit()
    
    inserted_count = cursor.rowcount
    print(f"Inserted {inserted_count} {system_type} WHO terms")
    
    cursor.close()
    return inserted_count

def main():
    """Main execution function"""
    print("=" * 60)
    print("WHO Terminology Parser")
    print("=" * 60)
    
    all_terms = []
    
    # Process each system
    for system_type, file_id in WHO_PDF_FILES.items():
        try:
            print(f"\nProcessing {system_type.upper()} WHO PDF...")
            
            # Download PDF
            pdf_path = download_pdf_from_drive(file_id)
            
            # Extract terms
            terms = extract_terms_from_pdf(pdf_path, system_type)
            
            if terms:
                all_terms.extend(terms)
                
                # Connect to database and insert
                conn = connect_db()
                insert_who_terms(conn, terms)
                conn.close()
            
            # Clean up temp file
            if os.path.exists(pdf_path):
                os.remove(pdf_path)
            
        except Exception as e:
            print(f"Error processing {system_type}: {e}")
            import traceback
            traceback.print_exc()
    
    print("\n" + "=" * 60)
    print(f"TOTAL WHO TERMS PROCESSED: {len(all_terms)}")
    print("=" * 60)
    
    # Print summary by system
    from collections import Counter
    system_counts = Counter(t['system_type'] for t in all_terms)
    for system, count in system_counts.items():
        print(f"  {system.capitalize()}: {count} terms")

if __name__ == "__main__":
    main()
