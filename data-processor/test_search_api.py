"""
Test if search normalization works
"""

import requests

# Test the search endpoint
base_url = "http://localhost:5000"

# Test searches
test_terms = [
    "Vikarah",  # Should match vikāraH
    "vikarah",  # lowercase
    "vikara",   # partial
    "Jwara",    # Should match Jvara or similar
    "vata"      # common term
]

print("Testing Diagnosis Search with Diacritical Normalization")
print("=" * 70)

for term in test_terms:
    print(f"\nSearching for: '{term}'")
    print("-" * 70)
    
    try:
        response = requests.get(
            f"{base_url}/fhir/ValueSet/$expand",
            params={"filter": term, "system": "namaste", "count": 5}
        )
        
        if response.status_code == 200:
            data = response.json()
            results = data.get('expansion', {}).get('contains', [])
            
            if results:
                print(f"✅ Found {len(results)} results:")
                for r in results:
                    print(f"   - {r['display']} ({r['code']})")
            else:
                print("❌ No results found")
        else:
            print(f"❌ Error: {response.status_code}")
            print(f"   {response.text}")
            
    except Exception as e:
        print(f"❌ Connection error: {e}")
        print("   Make sure backend is running on port 5000")

print("\n" + "=" * 70)
print("Test complete!")
