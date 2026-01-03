"""
Test diagnosis search functionality
"""

import psycopg2
import os
from dotenv import load_dotenv

load_dotenv('../backend/.env')

conn = psycopg2.connect(
    host=os.getenv('DB_HOST', 'localhost'),
    port=os.getenv('DB_PORT', '5432'),
    database=os.getenv('DB_NAME', 'ayush_fhir'),
    user=os.getenv('DB_USER', 'postgres'),
    password=os.getenv('DB_PASSWORD', 'hardik999')
)

cursor = conn.cursor()

# Test search query
search_term = "Jwara"
query = """
    SELECT code, display, system_type, definition
    FROM namaste_codes
    WHERE display ILIKE %s OR code ILIKE %s
    ORDER BY 
        CASE WHEN display ILIKE %s THEN 0 ELSE 1 END,
        display
    LIMIT 10
"""

params = [f'%{search_term}%', f'%{search_term}%', f'{search_term}%']

print(f"Testing search for: {search_term}")
print("=" * 60)

cursor.execute(query, params)
results = cursor.fetchall()

if results:
    print(f"Found {len(results)} results:\n")
    for code, display, system_type, definition in results:
        print(f"Code: {code}")
        print(f"Display: {display}")
        print(f"System: {system_type}")
        print(f"Definition: {definition[:100] if definition else 'N/A'}...")
        print("-" * 60)
else:
    print("No results found!")
    
    # Check total count
    cursor.execute("SELECT COUNT(*) FROM namaste_codes")
    total = cursor.fetchone()[0]
    print(f"\nTotal NAMASTE codes in database: {total}")
    
    # Show sample
    cursor.execute("SELECT code, display, system_type FROM namaste_codes LIMIT 5")
    samples = cursor.fetchall()
    print("\nSample codes:")
    for code, display, system_type in samples:
        print(f"  {system_type}: {display} ({code})")

cursor.close()
conn.close()
