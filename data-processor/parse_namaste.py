"""
Parse NAMASTE Excel files and populate database
Downloads files from Google Drive links and extracts codes
"""

import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
import os
from dotenv import load_dotenv
import requests
from io import BytesIO

# Load environment variables
load_dotenv('../backend/.env')

# Google Drive file IDs (extracted from the links)
DRIVE_FILES = {
    'ayurveda': '1vwMnRv3OFDxMXTdsvuWonNPrFEfM5-Fc',
    'siddha': '1CIeLuY0DPiWwnc-cb6dXcv7psfjfqd9t',
    'unani': '1AhQeEp3PlEmb1M26MJmKrxtmnLuKHQwY'
}

def download_from_drive(file_id):
    """Download file from Google Drive"""
    url = f"https://drive.google.com/uc?export=download&id={file_id}"
    
    print(f"Downloading file {file_id}...")
    response = requests.get(url)
    
    if response.status_code == 200:
        return BytesIO(response.content)
    else:
        raise Exception(f"Failed to download file: {response.status_code}")

def parse_excel_file(file_content, system_type):
    """Parse Excel file and extract NAMASTE codes"""
    print(f"Parsing {system_type} Excel file...")
    
    try:
        # Read Excel file
        df = pd.read_excel(file_content)
        
        # Print columns to understand structure
        print(f"Columns found: {df.columns.tolist()}")
        print(f"First few rows:\n{df.head()}")
        
        codes = []
        
        # Try to identify code and description columns
        # Common patterns in NAMASTE files
        code_col = None
        desc_col = None
        
        # Priority order for finding columns
        for col in df.columns:
            col_lower = str(col).lower()
            
            # Look for CODE column (NAMC_CODE, NUMC_CODE, etc.)
            if 'namc_code' in col_lower or 'numc_code' in col_lower:
                code_col = col
            
            # Look for TERM column (NAMC_term, NAMC_TERM, etc.) - PRIORITY
            if 'term' in col_lower and 'diacritical' not in col_lower and 'devanagari' not in col_lower and 'tamil' not in col_lower and 'arabic' not in col_lower:
                desc_col = col
        
        # If we didn't find term column, look for other description columns
        if not desc_col:
            for col in df.columns:
                col_lower = str(col).lower()
                if 'name' in col_lower or 'description' in col_lower or 'disease' in col_lower or 'disorder' in col_lower:
                    desc_col = col
                    break
        
        if not code_col or not desc_col:
            # Fallback: use specific columns based on what we see
            if 'NAMC_CODE' in df.columns and 'NAMC_term' in df.columns:
                code_col = 'NAMC_CODE'
                desc_col = 'NAMC_term'
            elif 'NAMC_CODE' in df.columns and 'NAMC_TERM' in df.columns:
                code_col = 'NAMC_CODE'
                desc_col = 'NAMC_TERM'
            elif 'NUMC_CODE' in df.columns and 'NUMC_TERM' in df.columns:
                code_col = 'NUMC_CODE'
                desc_col = 'NUMC_TERM'
            else:
                # Last resort: use first two columns
                code_col = df.columns[0]
                desc_col = df.columns[1]
            print(f"Using fallback columns: {code_col}, {desc_col}")
        
        print(f"Using columns - Code: {code_col}, Description: {desc_col}")
        
        # Extract codes
        for idx, row in df.iterrows():
            code = str(row[code_col]).strip() if pd.notna(row[code_col]) else None
            display = str(row[desc_col]).strip() if pd.notna(row[desc_col]) else None
            
            # Skip empty rows or header rows
            if not code or code == 'nan' or not display or display == 'nan':
                continue
            
            # Skip if display is just a number (likely wrong column)
            if display.isdigit():
                continue
            
            # Create standardized code format
            prefix = system_type[:2].upper()
            if not code.startswith(prefix):
                code = f"{prefix}-{code}"
            
            codes.append({
                'code': code,
                'display': display,
                'system_type': system_type,
                'definition': display  # Use display as definition for now
            })
        
        print(f"Extracted {len(codes)} codes from {system_type}")
        return codes
        
    except Exception as e:
        print(f"Error parsing {system_type} file: {e}")
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

def insert_namaste_codes(conn, codes):
    """Insert NAMASTE codes into database"""
    if not codes:
        print("No codes to insert")
        return 0
    
    cursor = conn.cursor()
    
    # Clear existing codes for this system
    system_type = codes[0]['system_type']
    cursor.execute("DELETE FROM namaste_codes WHERE system_type = %s", (system_type,))
    print(f"Cleared existing {system_type} codes")
    
    # Prepare data for insertion
    values = [
        (c['code'], c['display'], c['system_type'], c['definition'])
        for c in codes
    ]
    
    # Insert new codes
    insert_query = """
        INSERT INTO namaste_codes (code, display, system_type, definition)
        VALUES %s
        ON CONFLICT (code) DO UPDATE SET
            display = EXCLUDED.display,
            definition = EXCLUDED.definition,
            updated_at = NOW()
    """
    
    execute_values(cursor, insert_query, values)
    conn.commit()
    
    inserted_count = cursor.rowcount
    print(f"Inserted/Updated {inserted_count} {system_type} codes")
    
    cursor.close()
    return inserted_count

def main():
    """Main execution function"""
    print("=" * 60)
    print("NAMASTE Code Parser")
    print("=" * 60)
    
    all_codes = []
    
    # Process each system
    for system_type, file_id in DRIVE_FILES.items():
        try:
            print(f"\nProcessing {system_type.upper()}...")
            
            # Download file
            file_content = download_from_drive(file_id)
            
            # Parse Excel
            codes = parse_excel_file(file_content, system_type)
            
            if codes:
                all_codes.extend(codes)
                
                # Connect to database and insert
                conn = connect_db()
                insert_namaste_codes(conn, codes)
                conn.close()
            
        except Exception as e:
            print(f"Error processing {system_type}: {e}")
            import traceback
            traceback.print_exc()
    
    print("\n" + "=" * 60)
    print(f"TOTAL CODES PROCESSED: {len(all_codes)}")
    print("=" * 60)
    
    # Print summary by system
    from collections import Counter
    system_counts = Counter(c['system_type'] for c in all_codes)
    for system, count in system_counts.items():
        print(f"  {system.capitalize()}: {count} codes")

if __name__ == "__main__":
    main()
