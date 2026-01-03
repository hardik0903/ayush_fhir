"""
AI Semantic Search for Medical Terminology
Uses sentence-transformers with BioBERT for semantic similarity matching
"""

from sentence_transformers import SentenceTransformer
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
import psycopg2
import json
import os
from dotenv import load_dotenv

load_dotenv('../backend/.env')

# Initialize model - using medical domain-specific model
print("Loading BioBERT model...")
model = SentenceTransformer('pritamdeka/S-PubMedBert-MS-MARCO')
print("Model loaded successfully!")

# Database connection
def get_db_connection():
    return psycopg2.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        port=os.getenv('DB_PORT', '5432'),
        database=os.getenv('DB_NAME', 'ayush_fhir'),
        user=os.getenv('DB_USER', 'postgres'),
        password=os.getenv('DB_PASSWORD', 'postgres')
    )

def generate_embeddings_for_codes():
    """Generate embeddings for all NAMASTE and ICD-11 codes"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    print("\n=== Generating NAMASTE Code Embeddings ===")
    
    # Get all NAMASTE codes
    cur.execute("""
        SELECT id, code, display, definition, system_type 
        FROM namaste_codes 
        ORDER BY code
    """)
    namaste_codes = cur.fetchall()
    
    print(f"Found {len(namaste_codes)} NAMASTE codes")
    
    # Create text representations for embedding
    namaste_texts = []
    namaste_ids = []
    
    for code_id, code, display, definition, system_type in namaste_codes:
        # Combine all text fields for better semantic representation
        text = f"{display} {code} {definition or ''} {system_type}"
        namaste_texts.append(text)
        namaste_ids.append(code_id)
    
    # Generate embeddings
    print("Generating embeddings...")
    namaste_embeddings = model.encode(namaste_texts, show_progress_bar=True)
    
    # Save embeddings to file
    embeddings_data = {
        'namaste': {
            'ids': [str(id) for id in namaste_ids],
            'embeddings': namaste_embeddings.tolist()
        }
    }
    
    print("\n=== Generating ICD-11 Code Embeddings ===")
    
    # Get all ICD-11 codes
    cur.execute("""
        SELECT id, icd_code, title, definition, module 
        FROM icd11_codes 
        ORDER BY icd_code
    """)
    icd11_codes = cur.fetchall()
    
    print(f"Found {len(icd11_codes)} ICD-11 codes")
    
    icd11_texts = []
    icd11_ids = []
    
    for code_id, icd_code, title, definition, module in icd11_codes:
        text = f"{title} {icd_code} {definition or ''} {module}"
        icd11_texts.append(text)
        icd11_ids.append(code_id)
    
    # Generate embeddings
    print("Generating embeddings...")
    icd11_embeddings = model.encode(icd11_texts, show_progress_bar=True)
    
    embeddings_data['icd11'] = {
        'ids': [str(id) for id in icd11_ids],
        'embeddings': icd11_embeddings.tolist()
    }
    
    # Save to file
    output_file = 'embeddings.json'
    print(f"\nSaving embeddings to {output_file}...")
    with open(output_file, 'w') as f:
        json.dump(embeddings_data, f)
    
    print(f"✅ Embeddings saved! File size: {os.path.getsize(output_file) / 1024 / 1024:.2f} MB")
    
    cur.close()
    conn.close()
    
    return embeddings_data

def semantic_search(query, embeddings_data, top_k=10, search_type='namaste'):
    """
    Perform semantic search on medical codes
    
    Args:
        query: Search query text
        embeddings_data: Pre-computed embeddings
        top_k: Number of results to return
        search_type: 'namaste' or 'icd11'
    
    Returns:
        List of (id, similarity_score) tuples
    """
    # Generate query embedding
    query_embedding = model.encode([query])[0]
    
    # Get corpus embeddings
    corpus_embeddings = np.array(embeddings_data[search_type]['embeddings'])
    corpus_ids = embeddings_data[search_type]['ids']
    
    # Calculate cosine similarities
    similarities = cosine_similarity([query_embedding], corpus_embeddings)[0]
    
    # Get top-k results
    top_indices = np.argsort(similarities)[-top_k:][::-1]
    
    results = []
    for idx in top_indices:
        results.append({
            'id': corpus_ids[idx],
            'similarity': float(similarities[idx])
        })
    
    return results

def test_semantic_search():
    """Test semantic search with sample queries"""
    print("\n=== Testing Semantic Search ===\n")
    
    # Load embeddings
    with open('embeddings.json', 'r') as f:
        embeddings_data = json.load(f)
    
    # Test queries
    test_queries = [
        "fever and headache",
        "digestive problems",
        "respiratory infection",
        "skin disease",
        "mental health disorder"
    ]
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    for query in test_queries:
        print(f"\n🔍 Query: '{query}'")
        print("-" * 50)
        
        # Search NAMASTE codes
        results = semantic_search(query, embeddings_data, top_k=5, search_type='namaste')
        
        print("\nTop 5 NAMASTE matches:")
        for i, result in enumerate(results, 1):
            cur.execute("""
                SELECT code, display, system_type 
                FROM namaste_codes 
                WHERE id = %s
            """, (result['id'],))
            code, display, system_type = cur.fetchone()
            print(f"{i}. {display} ({code}) - {system_type}")
            print(f"   Similarity: {result['similarity']:.4f}")
    
    cur.close()
    conn.close()

if __name__ == '__main__':
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == 'test':
        # Test mode - load existing embeddings
        test_semantic_search()
    else:
        # Generate embeddings
        embeddings_data = generate_embeddings_for_codes()
        
        # Run test
        print("\n" + "="*60)
        test_semantic_search()
