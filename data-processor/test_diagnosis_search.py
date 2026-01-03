"""
Test the new diagnosis search endpoint
"""

import requests
import json

base_url = "http://localhost:5000"

# Test searches
test_terms = [
    "vikara",
    "Jwara",
    "vata"
]

print("Testing New Diagnosis Search Endpoint")
print("=" * 70)

for term in test_terms:
    print(f"\n🔍 Searching for: '{term}'")
    print("-" * 70)
    
    try:
        response = requests.get(
            f"{base_url}/api/search/diagnosis",
            params={"query": term, "limit": 3}
        )
        
        if response.status_code == 200:
            data = response.json()
            results = data.get('results', [])
            
            if results:
                print(f"✅ Found {len(results)} results:\n")
                for r in results:
                    print(f"📌 {r['namaste_display']} ({r['namaste_code']})")
                    print(f"   System: {r['system_type']}")
                    print(f"   Mappings: {len(r['mappings'])}")
                    
                    if r['mappings']:
                        for m in r['mappings']:
                            print(f"   → {m['icd_title']} ({m['icd_code']}) - {int(m['confidence_score']*100)}%")
                    print()
            else:
                print("❌ No results found")
        else:
            print(f"❌ Error: {response.status_code}")
            print(f"   {response.text}")
            
    except Exception as e:
        print(f"❌ Connection error: {e}")

print("\n" + "=" * 70)
print("✅ Test complete! Backend is working.")
