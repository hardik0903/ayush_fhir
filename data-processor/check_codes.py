"""
Quick check of NAMASTE codes to understand their structure
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

# Get sample NAMASTE codes
cursor.execute("SELECT code, display, system_type FROM namaste_codes LIMIT 30")
codes = cursor.fetchall()

print("Sample NAMASTE Codes:")
print("=" * 80)
for code, display, system in codes:
    print(f"{system:10} | {code:15} | {display}")

# Get ICD-11 codes
cursor.execute("SELECT icd_code, title FROM icd11_codes LIMIT 10")
icd_codes = cursor.fetchall()

print("\n\nSample ICD-11 Codes:")
print("=" * 80)
for code, title in icd_codes:
    print(f"{code:10} | {title}")

cursor.close()
conn.close()
